/**
 * SVG P-h diagram component.
 *
 * Coordinate system
 * ─────────────────
 *  X axis : specific enthalpy (kJ/kg), linear scale
 *  Y axis : pressure (bar, absolute), logarithmic scale
 *
 * The diagram draws:
 *  1. Saturation dome (liquid branch + vapour branch)
 *  2. Cycle path (4 segments connecting points 1→2→3→4→1)
 *  3. Cycle point markers with labels
 *  4. Axis tick labels
 */
import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  Line,
  Path,
  Rect,
  Text as SvgText,
} from 'react-native-svg';
import { useAppTheme } from '../../context/ThemeContext';
import { satFromTemp, satFromPressure, satFromTempDew } from '../../services/fluidInterpolator';
import type { CycleResult } from '../../types/enthalpy';
import type { FluidTable } from '../../types/fluidTable';
import { SH_COL, SAT_ZEO_COL } from '../../types/fluidTable';

interface Props {
  table: FluidTable | null;
  cycleResult: CycleResult | null;
  width: number;
  height: number;
  isobarLow?: number;
  isobarHigh?: number;
}

// Padding inside SVG for axes
const PAD = { top: 12, right: 18, bottom: 32, left: 38 };

function useCoordinateMapper(
  hMin: number,
  hMax: number,
  pMin: number,
  pMax: number,
  width: number,
  height: number,
) {
  const plotW = width - PAD.left - PAD.right;
  const plotH = height - PAD.top - PAD.bottom;
  const logPMin = Math.log10(pMin);
  const logPMax = Math.log10(pMax);

  return {
    xOf: (h: number): number => PAD.left + ((h - hMin) / (hMax - hMin)) * plotW,
    yOf: (p: number): number =>
      PAD.top + ((logPMax - Math.log10(p)) / (logPMax - logPMin)) * plotH,
    plotW,
    plotH,
  };
}

interface DomePt { hLiq: number; hVap: number; pressureBar: number; }

function denseSatPoints(table: FluidTable): DomePt[] {
  const { sat } = table;
  const rows = sat.rows;

  if (sat.isZeotropic) {
    // P-indexed table: iterate rows directly by pressure (Tbub and Tdew per row)
    const step = Math.max(1, Math.floor(rows.length / 500));
    const points: DomePt[] = [];
    for (let i = 0; i < rows.length; i += step) {
      points.push({
        hLiq: rows[i][SAT_ZEO_COL.HL_KJKG],
        hVap: rows[i][SAT_ZEO_COL.HV_KJKG],
        pressureBar: rows[i][SAT_ZEO_COL.P_BAR],
      });
    }
    const last = rows[rows.length - 1];
    if ((points[points.length - 1]?.pressureBar ?? 0) < last[SAT_ZEO_COL.P_BAR]) {
      points.push({ hLiq: last[SAT_ZEO_COL.HL_KJKG], hVap: last[SAT_ZEO_COL.HV_KJKG], pressureBar: last[SAT_ZEO_COL.P_BAR] });
    }
    return points;
  }

  const tMin = sat.tMinC!;
  const tMax = tMin + (rows.length - 1) * sat.tStepC!;
  const points: DomePt[] = [];
  for (let t = tMin; t <= tMax; t += 1) {
    const pt = satFromTemp(table, t);
    points.push({ hLiq: pt.hLiq_kJkg, hVap: pt.hVap_kJkg, pressureBar: pt.pressureBar });
  }
  return points;
}

function catmullRomPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return '';
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

function buildDomePath(
  table: FluidTable,
  xOf: (h: number) => number,
  yOf: (p: number) => number,
): string {
  const dense = denseSatPoints(table);
  if (dense.length === 0) return '';
  const leftPts  = dense.map((pt) => ({ x: xOf(pt.hLiq), y: yOf(pt.pressureBar) }));
  const rightPts = [...dense].reverse().map((pt) => ({ x: xOf(pt.hVap), y: yOf(pt.pressureBar) }));

  // Build each branch as its own Catmull-Rom curve to avoid overshoot at the apex.
  // For zeotropic blends, hLiq≠hVap at Pcrit, so the two apexes are connected by a
  // straight horizontal line instead of letting the spline bridge them (which creates
  // an upward loop that gets clipped flat by the ClipPath).
  const liqPath = catmullRomPath(leftPts);           // M ... C ... ends at leftPts[last]
  const vapPath = catmullRomPath(rightPts);           // M ... C ... starts at rightPts[0]
  const apexR   = rightPts[0];
  // Strip the leading "M x,y" from vapPath; keep only the curve commands
  const vapCurves = vapPath.slice(vapPath.indexOf(' C'));  // " C cp1 cp2 p1 C ..."
  return `${liqPath} L${apexR.x.toFixed(1)},${apexR.y.toFixed(1)}${vapCurves} Z`;
}

function buildIsocharePath(
  table: FluidTable,
  rhoTarget: number,
  xOf: (h: number) => number,
  yOf: (p: number) => number,
): string {
  const pts: { x: number; y: number }[] = [];
  for (const iso of table.sh) {
    const rows = iso.rows;
    if (rows.length < 2) continue;
    // rho decreases with T on a given isobar → rows[0] has highest rho
    const rhoFirst = rows[0][SH_COL.RHO_KGM3];
    const rhoLast  = rows[rows.length - 1][SH_COL.RHO_KGM3];
    if (rhoTarget > rhoFirst || rhoTarget < rhoLast) continue;
    let lo = 0;
    let hi = rows.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (rows[mid][SH_COL.RHO_KGM3] >= rhoTarget) lo = mid;
      else hi = mid;
    }
    const r0 = rows[lo][SH_COL.RHO_KGM3];
    const r1 = rows[hi][SH_COL.RHO_KGM3];
    const frac = r0 !== r1 ? (rhoTarget - r0) / (r1 - r0) : 0;
    const h = rows[lo][SH_COL.H_KJKG] + frac * (rows[hi][SH_COL.H_KJKG] - rows[lo][SH_COL.H_KJKG]);
    pts.push({ x: xOf(h), y: yOf(iso.pBar) });
  }
  if (pts.length < 2) return '';
  return catmullRomPath(pts);
}

export default function DiagramCanvas({
  table,
  cycleResult,
  width,
  height,
  isobarLow,
  isobarHigh,
}: Props): React.JSX.Element {
  const { colors } = useAppTheme();

  // For zeotropic: compute "dew-side" display pressures so evap/cond segments are slanted.
  // P1 = pressure where Tdew = Tbub_evap (< P_evap); P2 = pressure where Tdew = Tbub_cond (< P_cond).
  const zeoP = useMemo(() => {
    if (!table || !table.sat.isZeotropic || !cycleResult) return null;
    try {
      const satEvap = satFromPressure(table, cycleResult.points[0].pressureBar);
      const satCond = satFromPressure(table, cycleResult.points[2].pressureBar);
      return {
        P1: satFromTempDew(table, satEvap.tempC).pressureBar,
        P2: satFromTempDew(table, satCond.tempC).pressureBar,
        satEvap,
        satCond,
      };
    } catch { return null; }
  }, [table, cycleResult]);

  const { hMin, hMax, pMin, pMax } = useMemo(() => {
    const cycleH = cycleResult ? cycleResult.points.map((p) => p.enthalpyKJkg) : [];
    const cycleP = [
      ...(cycleResult ? cycleResult.points.map((p) => p.pressureBar) : []),
      ...(zeoP ? [zeoP.P1, zeoP.P2] : []),
    ];

    if (!table) {
      if (cycleResult) {
        const hPad = (Math.max(...cycleH) - Math.min(...cycleH)) * 0.15;
        return {
          hMin: Math.min(...cycleH) - hPad,
          hMax: Math.max(...cycleH) + hPad,
          pMin: Math.min(...cycleP) * 0.88,
          pMax: Math.max(Math.max(...cycleP) * 1.12, 40),
        };
      }
      return { hMin: 100, hMax: 600, pMin: 0.5, pMax: 50 };
    }

    // Sample saturation curve up to near critical point for correct axis viewport
    const DISP_T_MIN = -25;
    const satRows = table.sat.rows;
    const tMaxTable = table.sat.isZeotropic
      ? satRows[satRows.length - 1][1]          // last Tbub_C
      : table.sat.tMinC! + (satRows.length - 1) * table.sat.tStepC!;
    const DISP_T_MAX = Math.min(tMaxTable, table.criticalTempC);
    const dispPts: { hLiq: number; hVap: number; p: number }[] = [];
    for (let t = DISP_T_MIN; t <= DISP_T_MAX; t += 5) {
      const pt = satFromTemp(table, t);
      dispPts.push({ hLiq: pt.hLiq_kJkg, hVap: pt.hVap_kJkg, p: pt.pressureBar });
    }
    // Always include the last table point to capture the dome apex
    const apexPt = satFromTemp(table, DISP_T_MAX);
    dispPts.push({ hLiq: apexPt.hLiq_kJkg, hVap: apexPt.hVap_kJkg, p: apexPt.pressureBar });

    const hVals = dispPts.flatMap((p) => [p.hLiq, p.hVap]);
    const pVals = dispPts.map((p) => p.p);
    const allH = [...hVals, ...cycleH];
    const allP = [...pVals, ...cycleP];

    const rawHMin = Math.min(...allH);
    const rawHMax = Math.max(...allH);
    const rawPMin = Math.min(...allP);
    const rawPMax = Math.max(...allP);
    const hPad = (rawHMax - rawHMin) * 0.08;

    // pMax: always show at least 15% above critical pressure so dome apex is visible near top
    const pCrit = table.criticalPressureBar;
    return {
      hMin: rawHMin - hPad,
      hMax: rawHMax + hPad,
      pMin: rawPMin * 0.88,
      pMax: Math.max(rawPMax * 1.12, pCrit * 1.15),
    };
  }, [table, cycleResult, zeoP]);

  const { xOf, yOf, plotW, plotH } = useCoordinateMapper(
    hMin, hMax, pMin, pMax, width, height,
  );

  const domePath = useMemo(
    () => (table ? buildDomePath(table, xOf, yOf) : ''),
    [table, xOf, yOf],
  );

  // Isotherms — 10°C steps, drawn on both sides of the dome
  const isothermLines = useMemo(() => {
    if (!table) return [];
    const temps: number[] = [];
    for (let t = -20; t <= 140; t += 10) temps.push(t);

    return temps.flatMap((t) => {
      // Saturation reference (to anchor both sides of the dome)
      let satPt: { hLiq: number; hVap: number; pressureBar: number } | null = null;
      try {
        const sp = satFromTemp(table, t);
        if (t <= table.criticalTempC) satPt = { hLiq: sp.hLiq_kJkg, hVap: sp.hVap_kJkg, pressureBar: sp.pressureBar };
      } catch { /* T out of sat range */ }

      // Vapor side: isobars in ascending P order → append saturation point last
      // (monotone ascending P ensures the Catmull-Rom path doesn't loop back)
      const vapPts: { x: number; y: number }[] = [];
      for (const iso of table.sh) {
        const fi = (t - iso.tMinC) / iso.tStepC;
        if (fi < 0 || fi > iso.rows.length - 1) continue;
        const i  = Math.floor(fi);
        const i1 = Math.min(i + 1, iso.rows.length - 1);
        const h  = iso.rows[i][SH_COL.H_KJKG] + (fi - i) * (iso.rows[i1][SH_COL.H_KJKG] - iso.rows[i][SH_COL.H_KJKG]);
        vapPts.push({ x: xOf(h), y: yOf(iso.pBar) });
      }
      // Append saturation vapor point to close the gap to the dome
      if (satPt) vapPts.push({ x: xOf(satPt.hVap), y: yOf(satPt.pressureBar) });
      const vapPath = vapPts.length >= 2 ? catmullRomPath(vapPts) : '';

      // Liquid side: nearly vertical line from saturation dome up to pMax (liquid is ~incompressible)
      const liqPath = satPt
        ? `M${xOf(satPt.hLiq).toFixed(1)},${yOf(satPt.pressureBar).toFixed(1)} L${xOf(satPt.hLiq).toFixed(1)},${yOf(pMax).toFixed(1)}`
        : '';

      if (!vapPath && !liqPath) return [];

      // Tick + label at the dome intersection (saturation vapor point)
      const domeX = satPt ? xOf(satPt.hVap) : -1;
      const domeY = satPt ? yOf(satPt.pressureBar) : -1;

      return [{ t, vapPath, liqPath, domeX, domeY }];
    });
  }, [table, xOf, yOf, pMax]);

  // Isochores — 5 log-spaced density values across the sh-table range
  const isochoreLines = useMemo(() => {
    if (!table || table.sh.length === 0) return [];
    let rhoMin = Infinity;
    let rhoMax = -Infinity;
    for (const iso of table.sh) {
      for (const row of iso.rows) {
        const r = row[SH_COL.RHO_KGM3];
        if (r < rhoMin) rhoMin = r;
        if (r > rhoMax) rhoMax = r;
      }
    }
    const logMin = Math.log10(rhoMin);
    const logMax = Math.log10(rhoMax);
    const targets: number[] = [];
    for (let i = 1; i <= 4; i++) {
      targets.push(Math.pow(10, logMin + (i / 5) * (logMax - logMin)));
    }
    return targets
      .map((rho) => ({ rho, path: buildIsocharePath(table, rho, xOf, yOf) }))
      .filter((r) => r.path.length > 0);
  }, [table, xOf, yOf]);

  // Intermediate ticks on dome branches: 1°C (<50°C), 2°C (50–70°C), 5°C (>70°C)
  // side='dew' → right branch (hVap), tick points left; side='bubble' → left branch (hLiq), tick points right
  const domeTicks = useMemo(() => {
    if (!table) return [];
    const satRows = table.sat.rows;
    const isZeo = table.sat.isZeotropic;
    const tMinBub = isZeo ? satRows[0][1] : table.sat.tMinC!;
    const tMaxBub = Math.min(
      isZeo ? satRows[satRows.length - 1][1] : table.sat.tMinC! + (satRows.length - 1) * table.sat.tStepC!,
      table.criticalTempC,
    );
    const tMinDew = isZeo ? satRows[0][2] : tMinBub;
    const tMaxDew = isZeo ? Math.min(satRows[satRows.length - 1][2], table.criticalTempC) : tMaxBub;
    const result: { x: number; y: number; size: number; side: 'dew' | 'bubble' }[] = [];

    const addDew = (t: number, size: number) => {
      if (t % 10 === 0 || t <= tMinDew || t >= tMaxDew) return;
      try {
        const sp = isZeo ? satFromTempDew(table, t) : satFromTemp(table, t);
        result.push({ x: xOf(sp.hVap_kJkg), y: yOf(sp.pressureBar), size, side: 'dew' });
      } catch { /* skip */ }
    };
    const addBub = (t: number, size: number) => {
      if (!isZeo || t % 10 === 0 || t <= tMinBub || t >= tMaxBub) return;
      try {
        const sp = satFromTemp(table, t);
        result.push({ x: xOf(sp.hLiq_kJkg), y: yOf(sp.pressureBar), size, side: 'bubble' });
      } catch { /* skip */ }
    };

    const tMin = Math.min(tMinBub, tMinDew);
    const tMax = Math.max(tMaxBub, tMaxDew);
    for (let t = Math.ceil(tMin); t <= Math.min(50, tMax); t++) {
      addDew(t, t % 5 === 0 ? 4 : 2.5);
      addBub(t, t % 5 === 0 ? 4 : 2.5);
    }
    for (let t = 52; t <= Math.min(70, tMax); t += 2) {
      addDew(t, t % 5 === 0 ? 4 : 3);
      addBub(t, t % 5 === 0 ? 4 : 3);
    }
    for (let t = 75; t <= tMax; t += 5) { addDew(t, 4); addBub(t, 4); }
    return result;
  }, [table, xOf, yOf]);

  // Superheat / subcooling annotations
  const shScAnnotations = useMemo(() => {
    if (!table || !cycleResult) return null;
    const pt1 = cycleResult.points[0];
    const pt3 = cycleResult.points[2];
    // For zeotropic: SH bracket is drawn at the dew-side display pressure (P1 display)
    const p1Display = zeoP ? zeoP.P1 : pt1.pressureBar;
    try {
      const satEvap = satFromPressure(table, pt1.pressureBar);
      const satCond = satFromPressure(table, pt3.pressureBar);
      const satAtP1Display = zeoP ? satFromPressure(table, p1Display) : satEvap;
      const shRef = table.sat.isZeotropic ? (satEvap.tempDewC ?? satEvap.tempC) : satEvap.tempC;
      const shK  = Math.round((pt1.temperatureC - shRef) * 10) / 10;
      const scK  = Math.round((satCond.tempC    - pt3.temperatureC) * 10) / 10;
      return {
        sh: { x1: xOf(satAtP1Display.hVap_kJkg), x2: xOf(pt1.enthalpyKJkg), y: yOf(p1Display), label: `SH ${shK}K` },
        sc: { x1: xOf(pt3.enthalpyKJkg), x2: xOf(satCond.hLiq_kJkg), y: yOf(pt3.pressureBar), label: `SC ${scK}K` },
      };
    } catch { return null; }
  }, [table, cycleResult, zeoP, xOf, yOf]);

  // Zeotropic glide: slanted tie-lines connecting bubble curve to dew curve at same temperature.
  // Evap tie-line: (hLiq at P_bub, P_bub) → (hVap at P1_display, P1_display)
  // Cond tie-line: (hVap at P2_display, P2_display) → (hLiq at P_cond, P_cond)
  const glideMarkers = useMemo(() => {
    if (!table || !table.sat.isZeotropic || !cycleResult || !zeoP) return null;
    const { satEvap, satCond, P1, P2 } = zeoP;
    const P_evap = cycleResult.points[0].pressureBar;
    const P_cond = cycleResult.points[2].pressureBar;
    try {
      const satAtP1 = satFromPressure(table, P1);
      const satAtP2 = satFromPressure(table, P2);
      const glideEvap = Math.round(((satEvap.tempDewC ?? satEvap.tempC) - satEvap.tempC) * 10) / 10;
      const glideCond = Math.round(((satCond.tempDewC ?? satCond.tempC) - satCond.tempC) * 10) / 10;
      return {
        evap: {
          x1: xOf(satEvap.hLiq_kJkg), y1: yOf(P_evap),   // bubble end
          x2: xOf(satAtP1.hVap_kJkg), y2: yOf(P1),        // dew end
          tbub: Math.round(satEvap.tempC * 10) / 10,
          tdew: Math.round((satEvap.tempDewC ?? satEvap.tempC) * 10) / 10,
          glide: glideEvap,
        },
        cond: {
          x1: xOf(satAtP2.hVap_kJkg), y1: yOf(P2),        // dew end
          x2: xOf(satCond.hLiq_kJkg), y2: yOf(P_cond),    // bubble end
          tbub: Math.round(satCond.tempC * 10) / 10,
          tdew: Math.round((satCond.tempDewC ?? satCond.tempC) * 10) / 10,
          glide: glideCond,
        },
      };
    } catch { return null; }
  }, [table, cycleResult, zeoP, xOf, yOf]);

  // H-axis ticks (5 evenly spaced)
  const hTicks = useMemo(() => {
    const step = Math.ceil((hMax - hMin) / 5 / 10) * 10;
    const start = Math.ceil(hMin / step) * step;
    const ticks: number[] = [];
    for (let h = start; h <= hMax; h += step) ticks.push(h);
    return ticks;
  }, [hMin, hMax]);

  // P-axis ticks (log-spaced)
  const pTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let exp = Math.floor(Math.log10(pMin)); exp <= Math.ceil(Math.log10(pMax)); exp++) {
      for (const mult of [1, 2, 5]) {
        const val = mult * Math.pow(10, exp);
        if (val >= pMin && val <= pMax) ticks.push(val);
      }
    }
    return ticks;
  }, [pMin, pMax]);

  // Cycle segments — for zeotropic, evap (4→1) and cond (2→3) use dew-side pressure
  // so those segments are slanted (tie-line representation of temperature glide).
  const cycleSegments = useMemo(() => {
    if (!cycleResult) return [];
    const pts = cycleResult.points;
    const p1 = zeoP ? zeoP.P1 : pts[0].pressureBar;
    const p2 = zeoP ? zeoP.P2 : pts[1].pressureBar;
    return [
      { x1: xOf(pts[0].enthalpyKJkg), y1: yOf(p1),                  x2: xOf(pts[1].enthalpyKJkg), y2: yOf(p2),                  color: colors.cycleComp   },
      { x1: xOf(pts[1].enthalpyKJkg), y1: yOf(p2),                  x2: xOf(pts[2].enthalpyKJkg), y2: yOf(pts[2].pressureBar),   color: colors.cycleCond   },
      { x1: xOf(pts[2].enthalpyKJkg), y1: yOf(pts[2].pressureBar),  x2: xOf(pts[3].enthalpyKJkg), y2: yOf(pts[3].pressureBar),   color: colors.cycleExpand },
      { x1: xOf(pts[3].enthalpyKJkg), y1: yOf(pts[3].pressureBar),  x2: xOf(pts[0].enthalpyKJkg), y2: yOf(p1),                   color: colors.cycleEvap   },
    ];
  }, [cycleResult, zeoP, xOf, yOf, colors]);

  const POINT_COLORS: Record<1 | 2 | 3 | 4, string> = {
    1: colors.cycleEvap,
    2: colors.cycleComp,
    3: colors.cycleCond,
    4: colors.cycleExpand,
  };

  const styles = StyleSheet.create({
    wrapper: {
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
  });

  return (
    <View style={styles.wrapper}>
      <Svg width={width} height={height}>
        <Defs>
          <ClipPath id="plot">
            <Rect x={PAD.left} y={PAD.top} width={plotW} height={plotH} />
          </ClipPath>
        </Defs>

        {/* Background */}
        <Rect x={0} y={0} width={width} height={height} fill={colors.card} />

        {/* Plot area background */}
        <Rect
          x={PAD.left}
          y={PAD.top}
          width={plotW}
          height={plotH}
          fill={colors.bgSubtle}
        />

        {/* H-axis grid lines */}
        {hTicks.map((h) => (
          <G key={`hg-${h}`}>
            <Line
              x1={xOf(h)} y1={PAD.top}
              x2={xOf(h)} y2={PAD.top + plotH}
              stroke={colors.border} strokeWidth={0.5} strokeDasharray="3,3"
            />
            <SvgText
              x={xOf(h)} y={PAD.top + plotH + 14}
              fontSize={8} fill={colors.textMuted}
              textAnchor="middle" fontFamily="Courier New"
            >
              {Math.round(h)}
            </SvgText>
          </G>
        ))}

        {/* P-axis grid lines */}
        {pTicks.map((p) => (
          <G key={`pg-${p}`}>
            <Line
              x1={PAD.left} y1={yOf(p)}
              x2={PAD.left + plotW} y2={yOf(p)}
              stroke={colors.border} strokeWidth={0.5} strokeDasharray="3,3"
            />
            <SvgText
              x={PAD.left - 4} y={yOf(p) + 3}
              fontSize={8} fill={colors.textMuted}
              textAnchor="end" fontFamily="Courier New"
            >
              {p < 1 ? p.toFixed(1) : p < 10 ? p.toFixed(1) : Math.round(p)}
            </SvgText>
          </G>
        ))}

        {/* Axis labels */}
        <SvgText
          x={PAD.left + plotW / 2} y={height - 4}
          fontSize={9} fill={colors.textSecondary}
          textAnchor="middle" fontFamily="Courier New"
        >
          h (kJ/kg)
        </SvgText>
        <SvgText
          x={9} y={PAD.top + plotH / 2}
          fontSize={9} fill={colors.textSecondary}
          textAnchor="middle" rotation="-90"
          originX={9} originY={PAD.top + plotH / 2}
          fontFamily="Courier New"
        >
          P (bar)
        </SvgText>

        {/* Isobares BP (bleu) et HP (rouge) */}
        {([
          { p: isobarLow,  label: 'BP', color: '#3B82F6' },
          { p: isobarHigh, label: 'HP', color: '#EF4444' },
        ] as const).map(({ p, label, color }) => {
          if (!p || p < pMin || p > pMax) return null;
          const y = yOf(p);
          const pStr = p < 10 ? p.toFixed(2) : p.toFixed(1);
          return (
            <G key={label}>
              <Line
                x1={PAD.left} y1={y}
                x2={PAD.left + plotW} y2={y}
                stroke={color} strokeWidth={1.2}
                strokeDasharray="6,3" opacity={0.85}
              />
              <SvgText
                x={PAD.left + 4} y={y - 3}
                fontSize={8} fill={color}
                textAnchor="start" fontFamily="monospace"
              >
                {label} {pStr} bar abs
              </SvgText>
            </G>
          );
        })}

        {/* Lignes verticales des effets spécifiques */}
        {cycleResult && (() => {
          const pts = cycleResult.points;
          const lines = [
            { h: pts[3].enthalpyKJkg, color: colors.cycleExpand },
            { h: pts[0].enthalpyKJkg, color: colors.cycleEvap },
            { h: pts[1].enthalpyKJkg, color: colors.cycleComp },
          ];
          return lines.map(({ h, color }) => {
            const x = xOf(h);
            if (x < PAD.left || x > PAD.left + plotW) return null;
            return (
              <Line
                key={`vh-${h}`}
                x1={x} y1={PAD.top}
                x2={x} y2={PAD.top + plotH}
                stroke={color} strokeWidth={1}
                strokeDasharray="4,3" opacity={0.6}
              />
            );
          });
        })()}

        {/* Saturation dome + cycle — clippés à la zone de tracé */}
        <G clipPath="url(#plot)">
          {domePath ? (
            <Path
              d={domePath}
              fill={colors.cycleDome + '22'}
              stroke={colors.cycleDome}
              strokeWidth={1.5}
            />
          ) : null}

          {/* Isotherms — vapor side + liquid side + tick+label at dome intersection */}
          {isothermLines.map(({ t, vapPath, liqPath, domeX, domeY }) => (
            <G key={`iso-t-${t}`}>
              {!!vapPath && <Path d={vapPath} fill="none" stroke="#60A5FA" strokeWidth={0.7} opacity={0.5} />}
              {!!liqPath && <Path d={liqPath} fill="none" stroke="#60A5FA" strokeWidth={0.7} opacity={0.5} />}
              {domeX >= 0 && domeY >= 0 && (
                <G>
                  {/* Small tick inside the dome (toward lower h) */}
                  <Line
                    x1={domeX} y1={domeY} x2={domeX - 5} y2={domeY}
                    stroke="#60A5FA" strokeWidth={1} opacity={0.85}
                  />
                  {/* Temperature label to the left of the tick */}
                  <SvgText
                    x={domeX - 7} y={domeY + 3}
                    fontSize={6.5} fill="#60A5FA" opacity={0.85}
                    textAnchor="end" fontFamily="Courier New"
                  >
                    {t}°
                  </SvgText>
                </G>
              )}
            </G>
          ))}

          {/* Isochores */}
          {isochoreLines.map(({ rho, path }) => (
            <Path key={`iso-v-${rho.toFixed(1)}`}
              d={path} fill="none" stroke="#34D399" strokeWidth={0.7}
              strokeDasharray="4,2" opacity={0.55}
            />
          ))}

          {/* Intermediate ticks on dome branches */}
          {domeTicks.map(({ x, y, size, side }, i) => (
            <Line key={`dtick-${i}`}
              x1={x} y1={y}
              x2={side === 'dew' ? x - size : x + size} y2={y}
              stroke="#60A5FA" strokeWidth={0.7} opacity={0.65}
            />
          ))}

          {/* Superheat / subcooling brackets */}
          {shScAnnotations && (() => {
            const { sh, sc } = shScAnnotations;
            const tickH = 3;
            return (
              <G>
                {/* Superheat bracket */}
                {sh.x2 - sh.x1 > 4 && (
                  <G>
                    <Line x1={sh.x1} y1={sh.y - tickH} x2={sh.x1} y2={sh.y + tickH} stroke={colors.cycleEvap} strokeWidth={0.8} />
                    <Line x1={sh.x2} y1={sh.y - tickH} x2={sh.x2} y2={sh.y + tickH} stroke={colors.cycleEvap} strokeWidth={0.8} />
                    <Line x1={sh.x1} y1={sh.y} x2={sh.x2} y2={sh.y} stroke={colors.cycleEvap} strokeWidth={0.8} />
                    <SvgText x={sh.x2} y={sh.y + 12} fontSize={7} fill={colors.cycleEvap} textAnchor="middle" fontFamily="Courier New">{sh.label}</SvgText>
                  </G>
                )}
                {/* Subcooling bracket */}
                {sc.x2 - sc.x1 > 4 && (
                  <G>
                    <Line x1={sc.x1} y1={sc.y - tickH} x2={sc.x1} y2={sc.y + tickH} stroke={colors.cycleCond} strokeWidth={0.8} />
                    <Line x1={sc.x2} y1={sc.y - tickH} x2={sc.x2} y2={sc.y + tickH} stroke={colors.cycleCond} strokeWidth={0.8} />
                    <Line x1={sc.x1} y1={sc.y} x2={sc.x2} y2={sc.y} stroke={colors.cycleCond} strokeWidth={0.8} />
                    <SvgText x={sc.x1} y={sc.y + 12} fontSize={7} fill={colors.cycleCond} textAnchor="middle" fontFamily="Courier New">{sc.label}</SvgText>
                  </G>
                )}
              </G>
            );
          })()}

          {/* Zeotropic glide: slanted tie-lines inside the dome at cycle temperatures */}
          {glideMarkers && (() => {
            const { evap, cond } = glideMarkers;
            const mx_e = (evap.x1 + evap.x2) / 2;
            const my_e = (evap.y1 + evap.y2) / 2;
            const mx_c = (cond.x1 + cond.x2) / 2;
            const my_c = (cond.y1 + cond.y2) / 2;
            return (
              <G>
                {/* Evap tie-line (bubble→dew at evap temperature) */}
                <Line x1={evap.x1} y1={evap.y1} x2={evap.x2} y2={evap.y2} stroke={colors.cycleEvap} strokeWidth={1.2} strokeDasharray="4,2" opacity={0.85} />
                <SvgText x={mx_e - 4} y={my_e - 4} fontSize={6.5} fill={colors.cycleEvap} textAnchor="end" fontFamily="Courier New">{`gl ${evap.glide}K`}</SvgText>
                <SvgText x={evap.x1 - 3} y={evap.y1 + 3} fontSize={6} fill={colors.cycleEvap} textAnchor="end" fontFamily="Courier New">{evap.tbub}°</SvgText>
                <SvgText x={evap.x2 + 3} y={evap.y2 + 3} fontSize={6} fill={colors.cycleEvap} textAnchor="start" fontFamily="Courier New">{evap.tdew}°</SvgText>
                {/* Cond tie-line (dew→bubble at cond temperature) */}
                <Line x1={cond.x1} y1={cond.y1} x2={cond.x2} y2={cond.y2} stroke={colors.cycleCond} strokeWidth={1.2} strokeDasharray="4,2" opacity={0.85} />
                <SvgText x={mx_c - 4} y={my_c - 4} fontSize={6.5} fill={colors.cycleCond} textAnchor="end" fontFamily="Courier New">{`gl ${cond.glide}K`}</SvgText>
                <SvgText x={cond.x1 - 3} y={cond.y1 + 3} fontSize={6} fill={colors.cycleCond} textAnchor="end" fontFamily="Courier New">{cond.tdew}°</SvgText>
                <SvgText x={cond.x2 + 3} y={cond.y2 + 3} fontSize={6} fill={colors.cycleCond} textAnchor="start" fontFamily="Courier New">{cond.tbub}°</SvgText>
              </G>
            );
          })()}

          {/* Cycle path */}
          {cycleSegments.map((seg, i) => (
            <Line
              key={i}
              x1={seg.x1} y1={seg.y1}
              x2={seg.x2} y2={seg.y2}
              stroke={seg.color} strokeWidth={2} strokeLinecap="round"
            />
          ))}
        </G>

        {/* Cycle points */}
        {cycleResult?.points.map((pt) => {
          const pDisplay =
            (zeoP && pt.id === 1) ? zeoP.P1 :
            (zeoP && pt.id === 2) ? zeoP.P2 :
            pt.pressureBar;
          const cx = xOf(pt.enthalpyKJkg);
          const cy = yOf(pDisplay);
          const fill = POINT_COLORS[pt.id];
          return (
            <G key={pt.id}>
              <Circle cx={cx} cy={cy} r={5} fill={fill} opacity={0.9} />
              <SvgText
                x={cx + 7} y={cy - 6}
                fontSize={9} fill={fill}
                fontFamily="Courier New" fontWeight="bold"
              >
                {pt.label}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}
