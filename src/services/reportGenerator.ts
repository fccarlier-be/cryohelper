import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { satPointFromTemp , satPointFromPressure } from './thermoUtils';
import { satFromTemp, satFromPressure, satFromTempDew } from './fluidInterpolator';
import type { ReportData, PassData } from '../types/report';
import type { RefrigerantData, SaturationPoint } from '../types/refrigerant';
import type { CycleResult } from '../types/enthalpy';
import type { DiagnosticResult } from '../types/diagnostic';
import type { FluidTable } from '../types/fluidTable';
import { SH_COL, SAT_ZEO_COL } from '../types/fluidTable';

// ─── SVG diagram generation ───────────────────────────────────────────────────

const SVG_W = 480;
const SVG_H = 300;
const PAD = { top: 16, right: 16, bottom: 36, left: 44 };
const PLOT_W = SVG_W - PAD.left - PAD.right;
const PLOT_H = SVG_H - PAD.top - PAD.bottom;

function xOf(h: number, hMin: number, hMax: number): number {
  return PAD.left + ((h - hMin) / (hMax - hMin)) * PLOT_W;
}
function yOf(p: number, pMin: number, pMax: number): number {
  return PAD.top + ((Math.log10(pMax) - Math.log10(p)) / (Math.log10(pMax) - Math.log10(pMin))) * PLOT_H;
}

type ZeoP = { P1: number; P2: number; satEvap: ReturnType<typeof satFromPressure>; satCond: ReturnType<typeof satFromPressure> };

function computeZeoP(table: FluidTable | null | undefined, cycleResult: CycleResult | null): ZeoP | null {
  if (!table || !table.sat.isZeotropic || !cycleResult) return null;
  try {
    const satEvap = satFromPressure(table, cycleResult.points[0].pressureBar);
    const satCond = satFromPressure(table, cycleResult.points[2].pressureBar);
    return {
      P1: satFromTempDew(table, satEvap.tempC).pressureBar,
      P2: satFromTempDew(table, satCond.tempC).pressureBar,
      satEvap, satCond,
    };
  } catch { return null; }
}

function denseSatPoints(fluid: RefrigerantData, pMin: number, pMax: number): SaturationPoint[] {
  const table = fluid.saturationTable;
  const tCrit = table[table.length - 1].temperatureC;
  const pts: SaturationPoint[] = [];
  for (let t = table[0].temperatureC; t < tCrit; t += 0.5) {
    const pt = satPointFromTemp(fluid, t);
    if (pt.pressureBar >= pMin && pt.pressureBar <= pMax) pts.push(pt);
  }
  const crit = satPointFromTemp(fluid, tCrit);
  if (crit.pressureBar >= pMin && crit.pressureBar <= pMax) pts.push(crit);
  return pts;
}

function catmullRomSVG(
  pts: { x: number; y: number }[],
): string {
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

function buildDomeSVG(fluid: RefrigerantData, hMin: number, hMax: number, pMin: number, pMax: number, table?: FluidTable | null): string {
  const x = (h: number) => xOf(h, hMin, hMax);
  const y = (p: number) => yOf(p, pMin, pMax);

  if (table?.sat.isZeotropic) {
    const rows = table.sat.rows;
    const step = Math.max(1, Math.floor(rows.length / 500));
    const filtered: { hLiq: number; hVap: number; p: number }[] = [];
    for (let i = 0; i < rows.length; i += step) {
      const p = rows[i][SAT_ZEO_COL.P_BAR];
      if (p >= pMin && p <= pMax)
        filtered.push({ hLiq: rows[i][SAT_ZEO_COL.HL_KJKG], hVap: rows[i][SAT_ZEO_COL.HV_KJKG], p });
    }
    const last = rows[rows.length - 1];
    const lp = last[SAT_ZEO_COL.P_BAR];
    if (filtered.length === 0 || filtered[filtered.length - 1].p !== lp)
      if (lp >= pMin && lp <= pMax)
        filtered.push({ hLiq: last[SAT_ZEO_COL.HL_KJKG], hVap: last[SAT_ZEO_COL.HV_KJKG], p: lp });
    if (filtered.length === 0) return '';
    const left  = filtered.map(pt => ({ x: x(pt.hLiq), y: y(pt.p) }));
    const right = [...filtered].reverse().map(pt => ({ x: x(pt.hVap), y: y(pt.p) }));
    return catmullRomSVG([...left, ...right.slice(1)]) + ' Z';
  }

  const dense = denseSatPoints(fluid, pMin, pMax);
  if (dense.length === 0) return '';
  const left = dense.map(pt => ({ x: x(pt.enthalpyLiquid), y: y(pt.pressureBar) }));
  const right = [...dense].reverse().map(pt => ({ x: x(pt.enthalpyVapor), y: y(pt.pressureBar) }));
  return catmullRomSVG([...left, ...right.slice(1)]) + ' Z';
}

function axisRanges(fluid: RefrigerantData, cycleResult: CycleResult | null, zeoP?: ZeoP | null) {
  const table = fluid.saturationTable;
  const disp = table.filter(pt => pt.temperatureC >= -25 && pt.temperatureC <= 70);
  const base = disp.length >= 4 ? disp : table;

  const hVals = base.flatMap(pt => [pt.enthalpyLiquid, pt.enthalpyVapor]);
  const pVals = base.map(pt => pt.pressureBar);
  const cycleH = cycleResult ? cycleResult.points.map(p => p.enthalpyKJkg) : [];
  const cycleP = cycleResult ? cycleResult.points.map(p => p.pressureBar) : [];
  if (zeoP) { cycleP.push(zeoP.P1, zeoP.P2); }

  const allH = [...hVals, ...cycleH];
  const allP = [...pVals, ...cycleP];
  const hPad = (Math.max(...allH) - Math.min(...allH)) * 0.08;

  return {
    hMin: Math.min(...allH) - hPad,
    hMax: Math.max(...allH) + hPad,
    pMin: Math.min(...allP) * 0.88,
    pMax: Math.max(Math.max(...allP) * 1.12, 40),
  };
}

const CYCLE_COLORS = ['#6366F1', '#EF4444', '#F59E0B', '#10B981'] as const; // comp, cond, expand, evap

// ── Isotherms, isochores, dome ticks, SH/SC using FluidTable ─────────────────

function buildIsothermsSVG(table: FluidTable, x: (h:number)=>number, y: (p:number)=>number): string {
  const temps: number[] = [];
  for (let t = -20; t <= 140; t += 10) temps.push(t);
  const lines: string[] = [];
  for (const t of temps) {
    let satPt: { hLiq: number; hVap: number; pressureBar: number } | null = null;
    try {
      const sp = satFromTemp(table, t);
      if (t <= table.criticalTempC) satPt = { hLiq: sp.hLiq_kJkg, hVap: sp.hVap_kJkg, pressureBar: sp.pressureBar };
    } catch { continue; }
    // Vapor side
    const vapPts: {x:number;y:number}[] = [];
    for (const iso of table.sh) {
      const fi = (t - iso.tMinC) / iso.tStepC;
      if (fi < 0 || fi > iso.rows.length - 1) continue;
      const i = Math.floor(fi); const i1 = Math.min(i+1, iso.rows.length-1);
      const h = iso.rows[i][SH_COL.H_KJKG] + (fi-i)*(iso.rows[i1][SH_COL.H_KJKG]-iso.rows[i][SH_COL.H_KJKG]);
      vapPts.push({ x: x(h), y: y(iso.pBar) });
    }
    if (satPt) vapPts.push({ x: x(satPt.hVap), y: y(satPt.pressureBar) });
    if (vapPts.length >= 2) lines.push(`<path d="${catmullRomSVG(vapPts)}" fill="none" stroke="#3B82F6" stroke-width="0.6" opacity="0.45"/>`);
    // Liquid side
    if (satPt) lines.push(`<line x1="${x(satPt.hLiq).toFixed(1)}" y1="${y(satPt.pressureBar).toFixed(1)}" x2="${x(satPt.hLiq).toFixed(1)}" y2="${PAD.top}" stroke="#3B82F6" stroke-width="0.6" opacity="0.45"/>`);
    // Tick + label at dew line
    if (satPt) {
      const dx = x(satPt.hVap); const dy = y(satPt.pressureBar);
      lines.push(`<line x1="${dx.toFixed(1)}" y1="${dy.toFixed(1)}" x2="${(dx-5).toFixed(1)}" y2="${dy.toFixed(1)}" stroke="#3B82F6" stroke-width="0.9" opacity="0.8"/>`);
      lines.push(`<text x="${(dx-7).toFixed(1)}" y="${(dy+3).toFixed(1)}" font-size="6" fill="#3B82F6" text-anchor="end" font-family="monospace" opacity="0.85">${t}°</text>`);
    }
  }
  return lines.join('\n');
}

function buildDomeTicksSVG(table: FluidTable, x: (h:number)=>number, y: (p:number)=>number): string {
  const satRows = table.sat.rows;
  const tMin = table.sat.isZeotropic ? satRows[0][1] : table.sat.tMinC!;
  const tMax = Math.min(
    table.sat.isZeotropic ? satRows[satRows.length-1][1] : table.sat.tMinC! + (satRows.length-1)*table.sat.tStepC!,
    table.criticalTempC,
  );
  const lines: string[] = [];
  const add = (t: number, size: number) => {
    if (t % 10 === 0 || t <= tMin || t >= tMax) return;
    try {
      const sp = satFromTemp(table, t);
      const tx = x(sp.hVap_kJkg); const ty = y(sp.pressureBar);
      lines.push(`<line x1="${tx.toFixed(1)}" y1="${ty.toFixed(1)}" x2="${(tx-size).toFixed(1)}" y2="${ty.toFixed(1)}" stroke="#3B82F6" stroke-width="0.6" opacity="0.6"/>`);
    } catch { /* skip */ }
  };
  for (let t = Math.ceil(tMin); t <= Math.min(50, tMax); t++) add(t, t%5===0 ? 3.5 : 2);
  for (let t = 52; t <= Math.min(70, tMax); t += 2)          add(t, t%5===0 ? 3.5 : 2.5);
  for (let t = 75; t <= tMax; t += 5)                        add(t, 3.5);
  return lines.join('\n');
}

function buildIsochoresSVG(table: FluidTable, x: (h:number)=>number, y: (p:number)=>number): string {
  if (!table.sh.length) return '';
  let rhoMin = Infinity, rhoMax = -Infinity;
  for (const iso of table.sh)
    for (const row of iso.rows) {
      const r = row[SH_COL.RHO_KGM3];
      if (r < rhoMin) rhoMin = r;
      if (r > rhoMax) rhoMax = r;
    }
  const logMin = Math.log10(rhoMin); const logMax = Math.log10(rhoMax);
  const targets = [1,2,3,4].map(i => Math.pow(10, logMin + (i/5)*(logMax-logMin)));
  const lines: string[] = [];
  for (const rho of targets) {
    const pts: {x:number;y:number}[] = [];
    for (const iso of table.sh) {
      const rows = iso.rows; if (rows.length < 2) continue;
      const rFirst = rows[0][SH_COL.RHO_KGM3], rLast = rows[rows.length-1][SH_COL.RHO_KGM3];
      if (rho > rFirst || rho < rLast) continue;
      let lo=0, hi=rows.length-1;
      while (hi-lo>1) { const mid=(lo+hi)>>1; if (rows[mid][SH_COL.RHO_KGM3]>=rho) lo=mid; else hi=mid; }
      const frac = rows[lo][SH_COL.RHO_KGM3]!==rows[hi][SH_COL.RHO_KGM3] ? (rho-rows[lo][SH_COL.RHO_KGM3])/(rows[hi][SH_COL.RHO_KGM3]-rows[lo][SH_COL.RHO_KGM3]) : 0;
      const h = rows[lo][SH_COL.H_KJKG] + frac*(rows[hi][SH_COL.H_KJKG]-rows[lo][SH_COL.H_KJKG]);
      pts.push({ x: x(h), y: y(iso.pBar) });
    }
    if (pts.length >= 2) lines.push(`<path d="${catmullRomSVG(pts)}" fill="none" stroke="#10B981" stroke-width="0.6" stroke-dasharray="3,2" opacity="0.45"/>`);
  }
  return lines.join('\n');
}

function buildShScSVG(table: FluidTable, cycleResult: CycleResult, x: (h:number)=>number, y: (p:number)=>number, zeoP?: ZeoP | null): string {
  try {
    const pt1 = cycleResult.points[0]; const pt3 = cycleResult.points[2];
    const satEvap = satFromPressure(table, pt1.pressureBar);
    const satCond = satFromPressure(table, pt3.pressureBar);

    let shVapH: number; let shP: number; let shK: number;
    if (zeoP && table.sat.isZeotropic) {
      const satAtP1 = satFromPressure(table, zeoP.P1);
      shVapH = satAtP1.hVap_kJkg;
      shP = zeoP.P1;
      shK = Math.round((pt1.temperatureC - (satEvap.tempDewC ?? satEvap.tempC)) * 10) / 10;
    } else {
      shVapH = satEvap.hVap_kJkg;
      shP = pt1.pressureBar;
      shK = Math.round((pt1.temperatureC - satEvap.tempC) * 10) / 10;
    }
    const scK  = Math.round((satCond.tempC - pt3.temperatureC)*10)/10;
    const sh = { x1: x(shVapH), x2: x(pt1.enthalpyKJkg), y: y(shP) };
    const sc = { x1: x(pt3.enthalpyKJkg),  x2: x(satCond.hLiq_kJkg), y: y(pt3.pressureBar) };
    const lines: string[] = [];
    const bracket = (b: typeof sh, label: string, color: string, lx: number) => {
      if (b.x2 - b.x1 < 4) return;
      lines.push(`<line x1="${b.x1.toFixed(1)}" y1="${(b.y-3).toFixed(1)}" x2="${b.x1.toFixed(1)}" y2="${(b.y+3).toFixed(1)}" stroke="${color}" stroke-width="0.8"/>`);
      lines.push(`<line x1="${b.x2.toFixed(1)}" y1="${(b.y-3).toFixed(1)}" x2="${b.x2.toFixed(1)}" y2="${(b.y+3).toFixed(1)}" stroke="${color}" stroke-width="0.8"/>`);
      lines.push(`<line x1="${b.x1.toFixed(1)}" y1="${b.y.toFixed(1)}" x2="${b.x2.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="${color}" stroke-width="0.8"/>`);
      lines.push(`<text x="${lx.toFixed(1)}" y="${(b.y+11).toFixed(1)}" font-size="7" fill="${color}" text-anchor="middle" font-family="monospace">${label}</text>`);
    };
    bracket(sh, `SH ${shK}K`, '#10B981', sh.x2);
    bracket(sc, `SC ${scK}K`, '#F59E0B', sc.x1);
    return lines.join('\n');
  } catch { return ''; }
}

function generateDiagramSVG(fluid: RefrigerantData, cycleResult: CycleResult | null, table?: FluidTable | null): string {
  const zeoP = computeZeoP(table, cycleResult);
  const { hMin, hMax, pMin, pMax } = axisRanges(fluid, cycleResult, zeoP);
  const x = (h: number) => xOf(h, hMin, hMax);
  const y = (p: number) => yOf(p, pMin, pMax);

  // H ticks
  const hStep = Math.ceil((hMax - hMin) / 5 / 10) * 10;
  const hStart = Math.ceil(hMin / hStep) * hStep;
  const hTicks: number[] = [];
  for (let h = hStart; h <= hMax; h += hStep) hTicks.push(h);

  // P ticks
  const pTicks: number[] = [];
  for (let exp = Math.floor(Math.log10(pMin)); exp <= Math.ceil(Math.log10(pMax)); exp++) {
    for (const mult of [1, 2, 5]) {
      const val = mult * Math.pow(10, exp);
      if (val >= pMin && val <= pMax) pTicks.push(val);
    }
  }

  const dome = buildDomeSVG(fluid, hMin, hMax, pMin, pMax, table);

  // Cycle segments: 1→2 comp, 2→3 cond, 3→4 expand, 4→1 evap
  const p1d = zeoP ? zeoP.P1 : cycleResult?.points[0].pressureBar ?? 0;
  const p2d = zeoP ? zeoP.P2 : cycleResult?.points[1].pressureBar ?? 0;
  const cycleLines = cycleResult ? (() => {
    const pts = cycleResult.points;
    return [
      { h1: pts[0].enthalpyKJkg, p1: p1d,                 h2: pts[1].enthalpyKJkg, p2: p2d,                 color: CYCLE_COLORS[0] },
      { h1: pts[1].enthalpyKJkg, p1: p2d,                 h2: pts[2].enthalpyKJkg, p2: pts[2].pressureBar,   color: CYCLE_COLORS[1] },
      { h1: pts[2].enthalpyKJkg, p1: pts[2].pressureBar,  h2: pts[3].enthalpyKJkg, p2: pts[3].pressureBar,   color: CYCLE_COLORS[2] },
      { h1: pts[3].enthalpyKJkg, p1: pts[3].pressureBar,  h2: pts[0].enthalpyKJkg, p2: p1d,                 color: CYCLE_COLORS[3] },
    ].map(s => `<line x1="${x(s.h1).toFixed(1)}" y1="${y(s.p1).toFixed(1)}" x2="${x(s.h2).toFixed(1)}" y2="${y(s.p2).toFixed(1)}" stroke="${s.color}" stroke-width="2" stroke-linecap="round"/>`)
    .join('\n');
  })() : '';

  const cyclePoints = cycleResult ? cycleResult.points.map((pt, i) => {
    const pDisplay = i === 0 ? p1d : i === 1 ? p2d : pt.pressureBar;
    const cx = x(pt.enthalpyKJkg).toFixed(1);
    const cy = y(pDisplay).toFixed(1);
    const col = CYCLE_COLORS[i === 0 ? 3 : i === 1 ? 0 : i === 2 ? 1 : 2];
    return `<circle cx="${cx}" cy="${cy}" r="5" fill="${col}" opacity="0.9"/>
            <text x="${(parseFloat(cx) + 7).toFixed(1)}" y="${(parseFloat(cy) - 5).toFixed(1)}" font-size="9" fill="${col}" font-weight="bold" font-family="monospace">${pt.label}</text>`;
  }).join('\n') : '';

  const glideMarkers = (zeoP && cycleResult && table) ? (() => {
    try {
      const P_evap = cycleResult.points[0].pressureBar;
      const P_cond = cycleResult.points[2].pressureBar;
      const satAtEvap = satFromPressure(table, P_evap);
      const satAtP1   = satFromPressure(table, zeoP.P1);
      const satAtCond = satFromPressure(table, P_cond);
      const satAtP2   = satFromPressure(table, zeoP.P2);
      const glideEvap = ((satAtEvap.tempDewC ?? satAtEvap.tempC) - satAtEvap.tempC).toFixed(1);
      const glideCond = ((satAtCond.tempDewC ?? satAtCond.tempC) - satAtCond.tempC).toFixed(1);
      const lines: string[] = [];
      const addGlide = (
        x1: number, y1: number, x2: number, y2: number,
        glide: string, color: string,
      ) => {
        const mx = ((x1 + x2) / 2).toFixed(1);
        const my = ((y1 + y2) / 2 - 5).toFixed(1);
        lines.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-width="1.2" stroke-dasharray="4,2" opacity="0.7"/>`);
        lines.push(`<text x="${mx}" y="${my}" font-size="6" fill="${color}" text-anchor="middle" font-family="monospace" opacity="0.85">glide ${glide}K</text>`);
      };
      addGlide(x(satAtEvap.hLiq_kJkg), y(P_evap), x(satAtP1.hVap_kJkg), y(zeoP.P1), glideEvap, '#10B981');
      addGlide(x(satAtCond.hLiq_kJkg), y(P_cond), x(satAtP2.hVap_kJkg), y(zeoP.P2), glideCond, '#F59E0B');
      return lines.join('\n');
    } catch { return ''; }
  })() : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_W} ${SVG_H}" style="width:100%;display:block;">
  <!-- Background -->
  <rect width="${SVG_W}" height="${SVG_H}" fill="white"/>
  <rect x="${PAD.left}" y="${PAD.top}" width="${PLOT_W}" height="${PLOT_H}" fill="#F8FAFC"/>

  <!-- H grid -->
  ${hTicks.map(h => `
  <line x1="${x(h).toFixed(1)}" y1="${PAD.top}" x2="${x(h).toFixed(1)}" y2="${PAD.top + PLOT_H}" stroke="#E2E8F0" stroke-width="0.5" stroke-dasharray="3,3"/>
  <text x="${x(h).toFixed(1)}" y="${PAD.top + PLOT_H + 14}" font-size="8" fill="#94A3B8" text-anchor="middle" font-family="monospace">${Math.round(h)}</text>`).join('')}

  <!-- P grid -->
  ${pTicks.map(p => `
  <line x1="${PAD.left}" y1="${y(p).toFixed(1)}" x2="${PAD.left + PLOT_W}" y2="${y(p).toFixed(1)}" stroke="#E2E8F0" stroke-width="0.5" stroke-dasharray="3,3"/>
  <text x="${PAD.left - 4}" y="${(y(p) + 3).toFixed(1)}" font-size="8" fill="#94A3B8" text-anchor="end" font-family="monospace">${p < 10 ? p.toFixed(1) : Math.round(p)}</text>`).join('')}

  <!-- Axis labels -->
  <text x="${(PAD.left + PLOT_W / 2).toFixed(1)}" y="${SVG_H - 4}" font-size="9" fill="#64748B" text-anchor="middle" font-family="monospace">h (kJ/kg)</text>
  <text x="9" y="${(PAD.top + PLOT_H / 2).toFixed(1)}" font-size="9" fill="#64748B" text-anchor="middle" font-family="monospace" transform="rotate(-90,9,${(PAD.top + PLOT_H / 2).toFixed(1)})">P (bar)</text>

  <!-- Isobars BP (blue) and HP (red) -->
  ${cycleResult ? (() => {
    const pBP = p1d;
    const pHP = p2d;
    const isobars = [
      { p: pBP, label: 'BP', color: '#3B82F6' },
      { p: pHP, label: 'HP', color: '#EF4444' },
    ];
    return isobars.map(({ p, label, color }) => {
      if (p < pMin || p > pMax) return '';
      const yy = y(p).toFixed(1);
      const pStr = p < 10 ? p.toFixed(2) : p.toFixed(1);
      return `<line x1="${PAD.left}" y1="${yy}" x2="${PAD.left + PLOT_W}" y2="${yy}" stroke="${color}" stroke-width="1.2" stroke-dasharray="6,3" opacity="0.85"/>
      <text x="${PAD.left + 4}" y="${(y(p) - 3).toFixed(1)}" font-size="8" fill="${color}" text-anchor="start" font-family="monospace">${label} ${pStr} bar abs</text>`;
    }).join('\n');
  })() : ''}

  <!-- Isotherms -->
  ${table ? buildIsothermsSVG(table, x, y) : ''}

  <!-- Isochores -->
  ${table ? buildIsochoresSVG(table, x, y) : ''}

  <!-- Saturation dome -->
  <path d="${dome}" fill="#3B82F620" stroke="#3B82F6" stroke-width="1.5" fill-rule="nonzero"/>

  <!-- Intermediate dome ticks -->
  ${table ? buildDomeTicksSVG(table, x, y) : ''}

  <!-- Glide markers -->
  ${glideMarkers}

  <!-- Cycle -->
  ${cycleLines}
  ${cyclePoints}

  <!-- SH / SC annotations -->
  ${table && cycleResult ? buildShScSVG(table, cycleResult, x, y, zeoP) : ''}
</svg>`;
}

// ─── HTML report template ─────────────────────────────────────────────────────

function pad2(n: number): string { return String(n).padStart(2, '0'); }

function formatDate(d: Date): string {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}
function formatTime(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function copRating(cop: number): string {
  if (cop >= 4) return 'Excellent — installation très performante';
  if (cop >= 3) return 'Bon — fonctionnement normal';
  if (cop >= 2) return 'Correct — des améliorations sont possibles';
  return 'Faible — vérification approfondie recommandée';
}

function copExplain(cop: number): string {
  return `Produit ${cop.toFixed(1)} kW de froid pour 1 kW d'électricité consommé`;
}

const BADGE_BEFORE = 'display:inline-block;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;padding:3px 10px;border-radius:4px;color:white;background-color:#6366F1;margin-bottom:5px;';
const BADGE_AFTER  = 'display:inline-block;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;padding:3px 10px;border-radius:4px;color:white;background-color:#10B981;margin-bottom:5px;';

function diagramCell(pass: PassData | null, isAfter: boolean): string {
  const badgeStyle = isAfter ? BADGE_AFTER : BADGE_BEFORE;
  const badgeLabel = isAfter ? 'Après intervention' : 'Avant intervention';
  const inner = pass?.refrigerant
    ? generateDiagramSVG(pass.refrigerant, pass.cycleResult, pass.fluidTable)
    : '<p style="color:#94A3B8;font-style:italic;padding:16px;text-align:center;">Aucun diagramme</p>';
  return `<div><span style="${badgeStyle}">${badgeLabel}</span><div style="border:1px solid #E2E8F0;border-radius:6px;overflow:hidden;">${inner}</div></div>`;
}

function delta(a: number, b: number, higherIsBetter = true): string {
  const d = b - a;
  if (Math.abs(d) < 0.005) return '<span style="color:#64748B;">—</span>';
  const sign = d > 0 ? '+' : '';
  const color = (d > 0) === higherIsBetter ? '#16A34A' : '#DC2626';
  return `<span style="color:${color};font-weight:700;">${sign}${d.toFixed(2)}</span>`;
}

function deltaTowardsRange(a: number, b: number, min: number, max: number): string {
  const d = b - a;
  if (Math.abs(d) < 0.005) return '<span style="color:#64748B;">—</span>';
  const sign = d > 0 ? '+' : '';
  const distA = a < min ? min - a : a > max ? a - max : 0;
  const distB = b < min ? min - b : b > max ? b - max : 0;
  const color = distB < distA ? '#16A34A' : distB > distA ? '#DC2626' : '#64748B';
  return `<span style="color:${color};font-weight:700;">${sign}${d.toFixed(2)}</span>`;
}

function cycleMetrics(c: CycleResult, r: RefrigerantData) {
  const bp = c.points[0].pressureBar;
  const hp = c.points[2].pressureBar;
  const tSatEvap = satPointFromPressure(r, bp).temperatureC;
  const tSatCond = satPointFromPressure(r, hp).temperatureC;
  const superheat  = c.points[0].temperatureC - tSatEvap;
  const subcooling = tSatCond - c.points[2].temperatureC;
  return { bp, hp, tSatEvap, tSatCond, superheat, subcooling };
}

function comparisonTable(before: PassData, after: PassData): string {
  const b = before.cycleResult;
  const a = after.cycleResult;
  if (!b || !a || !before.refrigerant || !after.refrigerant) return '';
  const mb = cycleMetrics(b, before.refrigerant);
  const ma = cycleMetrics(a, after.refrigerant);
  return `
  <table>
    <thead><tr><th>Paramètre</th><th style="background:#6366F1;">Avant</th><th style="background:#10B981;">Après</th><th style="background:#1D4ED8;">Évolution</th></tr></thead>
    <tbody>
      <tr><td>COP</td><td>${b.cop.toFixed(2)}</td><td>${a.cop.toFixed(2)}</td><td>${delta(b.cop, a.cop, true)}</td></tr>
      <tr><td>BP (bar abs)</td><td>${mb.bp.toFixed(2)} bar abs</td><td>${ma.bp.toFixed(2)} bar abs</td><td>${delta(mb.bp, ma.bp, true)}</td></tr>
      <tr><td>HP (bar abs)</td><td>${mb.hp.toFixed(2)} bar abs</td><td>${ma.hp.toFixed(2)} bar abs</td><td>${delta(mb.hp, ma.hp, false)}</td></tr>
      <tr><td>T saturation évaporation</td><td>${mb.tSatEvap.toFixed(1)} °C</td><td>${ma.tSatEvap.toFixed(1)} °C</td><td>${delta(mb.tSatEvap, ma.tSatEvap, true)}</td></tr>
      <tr><td>Surchauffe</td><td>${mb.superheat.toFixed(1)} K</td><td>${ma.superheat.toFixed(1)} K</td><td>${deltaTowardsRange(mb.superheat, ma.superheat, 4, 10)}</td></tr>
      <tr><td>T saturation condensation</td><td>${mb.tSatCond.toFixed(1)} °C</td><td>${ma.tSatCond.toFixed(1)} °C</td><td>${delta(mb.tSatCond, ma.tSatCond, false)}</td></tr>
      <tr><td>Sous-refroidissement</td><td>${mb.subcooling.toFixed(1)} K</td><td>${ma.subcooling.toFixed(1)} K</td><td>${deltaTowardsRange(mb.subcooling, ma.subcooling, 4, 8)}</td></tr>
      <tr><td>Effet frigorifique</td><td>${b.refrigeratingEffect.toFixed(1)} kJ/kg</td><td>${a.refrigeratingEffect.toFixed(1)} kJ/kg</td><td>${delta(b.refrigeratingEffect, a.refrigeratingEffect, true)}</td></tr>
      <tr><td>Taux de compression</td><td>${b.compressionRatio.toFixed(2)}</td><td>${a.compressionRatio.toFixed(2)}</td><td>${delta(b.compressionRatio, a.compressionRatio, false)}</td></tr>
    </tbody>
  </table>`;
}

function singleTechnicalRows(pass: PassData): string {
  const c = pass.cycleResult;
  const r = pass.refrigerant;
  if (!c || !r) return '<tr><td colspan="3" style="color:#94A3B8;font-style:italic;">Aucun calcul disponible</td></tr>';
  const { bp, hp, tSatEvap, tSatCond, superheat, subcooling } = cycleMetrics(c, r);
  return `
    <tr><td>Fluide frigorigène</td><td><strong>${r.name}</strong></td><td>GWP = ${r.gwp}</td></tr>
    <tr><td>Basse pression (BP)</td><td><strong>${bp.toFixed(2)} bar abs</strong></td><td></td></tr>
    <tr><td>Haute pression (HP)</td><td><strong>${hp.toFixed(2)} bar abs</strong></td><td></td></tr>
    <tr><td>T saturation évaporation</td><td><strong>${tSatEvap.toFixed(1)} °C</strong></td><td>Température de production de froid</td></tr>
    <tr><td>Surchauffe aspiration</td><td><strong>${superheat.toFixed(1)} K</strong></td><td>Normal : 4–10 K</td></tr>
    <tr><td>T saturation condensation</td><td><strong>${tSatCond.toFixed(1)} °C</strong></td><td>Température d'évacuation de chaleur</td></tr>
    <tr><td>Sous-refroidissement</td><td><strong>${subcooling.toFixed(1)} K</strong></td><td>Normal : 4–8 K</td></tr>
    <tr><td>COP</td><td><strong>${c.cop.toFixed(2)}</strong></td><td>${copRating(c.cop)}<br/><span style="font-size:9px;color:#64748B;font-style:italic;">${copExplain(c.cop)}</span></td></tr>
    <tr><td>Effet frigorifique</td><td><strong>${c.refrigeratingEffect.toFixed(1)} kJ/kg</strong></td><td></td></tr>
    <tr><td>Taux de compression</td><td><strong>${c.compressionRatio.toFixed(2)}</strong></td><td>Normal : 2.5–5</td></tr>`;
}

function clientSummaryBox(before: PassData, after: PassData | null): string {
  const cb = before.cycleResult;
  const rb = before.refrigerant;
  if (!cb || !rb) return '';
  const ca = after?.cycleResult ?? null;

  if (ca) {
    const improvement = ca.cop - cb.cop;
    const improvementText = Math.abs(improvement) < 0.005
      ? 'Le COP est resté stable après intervention.'
      : improvement > 0
        ? `Le COP a progressé de ${improvement.toFixed(2)} — l'installation est plus performante.`
        : `Le COP a baissé de ${Math.abs(improvement).toFixed(2)} — un suivi est conseillé.`;
    const statusColor = improvement >= 0 ? '#15803D' : '#DC2626';
    return `<div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:10px 12px;margin-bottom:10px;">
      <div style="font-weight:700;color:#15803D;font-size:11px;margin-bottom:6px;">Bilan client — avant/après intervention</div>
      <table style="border:none;font-size:10px;">
        <tr>
          <td style="border:none;color:#64748B;padding:2px 8px 2px 0;">Avant</td>
          <td style="border:none;font-weight:700;padding:2px 4px 2px 0;">COP ${cb.cop.toFixed(2)}</td>
          <td style="border:none;color:#475569;font-style:italic;">${copExplain(cb.cop)}</td>
        </tr>
        <tr>
          <td style="border:none;color:#64748B;padding:2px 8px 2px 0;">Après</td>
          <td style="border:none;font-weight:700;padding:2px 4px 2px 0;">COP ${ca.cop.toFixed(2)}</td>
          <td style="border:none;color:#475569;font-style:italic;">${copExplain(ca.cop)}</td>
        </tr>
      </table>
      <p style="margin-top:6px;font-size:10px;color:${statusColor};font-weight:600;">${improvementText}</p>
    </div>`;
  }

  const bgColor = cb.cop >= 3 ? '#F0FDF4' : cb.cop >= 2 ? '#FFFBEB' : '#FFF1F2';
  const borderColor = cb.cop >= 3 ? '#BBF7D0' : cb.cop >= 2 ? '#FDE68A' : '#FECDD3';
  const titleColor = cb.cop >= 3 ? '#15803D' : cb.cop >= 2 ? '#B45309' : '#DC2626';
  return `<div style="background:${bgColor};border:1px solid ${borderColor};border-radius:8px;padding:10px 12px;margin-bottom:10px;">
    <div style="font-weight:700;color:${titleColor};font-size:11px;margin-bottom:4px;">Bilan de l'installation — ${rb.name}</div>
    <p style="font-size:11px;color:#1E293B;">COP : <strong>${cb.cop.toFixed(2)}</strong> — ${copRating(cb.cop)}</p>
    <p style="font-size:10px;color:#475569;font-style:italic;margin-top:3px;">${copExplain(cb.cop)}.</p>
  </div>`;
}

function faultCards(results: DiagnosticResult[]): string {
  return results.map((r: DiagnosticResult) => `
    <div class="fault-card">
      <div class="fault-header">
        <span class="fault-label">${r.label}</span>
        <span class="fault-score" style="background:${r.score >= 70 ? '#FEE2E2' : r.score >= 45 ? '#FEF3C7' : '#F1F5F9'};color:${r.score >= 70 ? '#DC2626' : r.score >= 45 ? '#D97706' : '#64748B'};">${r.score}%</span>
      </div>
      <p class="fault-desc">${r.description}</p>
      ${r.symptoms.length > 0 ? `<ul class="symptom-list">${r.symptoms.map((s: string) => `<li>${s.split('\n')[0]}</li>`).join('')}</ul>` : ''}
      <p class="fault-reco"><em>→ ${r.recommendation}</em></p>
    </div>`).join('');
}

function buildHTML(data: ReportData): string {
  const { clientName, installationRef, companyName, technicianName, interventionDate, before, after, actions, observations, techSignature, clientSignature } = data;
  const hasAfter = !!after?.cycleResult;

  const diagramSection = hasAfter ? `
    <div class="section">
      <h2 class="section-title">📉 Diagrammes enthalpiques P-h</h2>
      <table style="width:100%;border-collapse:collapse;border:none;">
        <tr>
          <td style="width:50%;padding-right:5px;vertical-align:top;border:none;">${diagramCell(before, false)}</td>
          <td style="width:50%;padding-left:5px;vertical-align:top;border:none;">${diagramCell(after, true)}</td>
        </tr>
      </table>
    </div>` : `
    <div class="section">
      <h2 class="section-title">📉 Diagramme enthalpique P-h</h2>
      ${diagramCell(before, false)}
    </div>`;

  const technicalSection = hasAfter && after ? `
    <div class="section">
      <h2 class="section-title">⚙️ Comparatif avant / après intervention</h2>
      ${clientSummaryBox(before, after)}
      ${comparisonTable(before, after)}
    </div>` : `
    <div class="section">
      <h2 class="section-title">⚙️ Synthèse technique</h2>
      ${clientSummaryBox(before, null)}
      <table>
        <thead><tr><th>Paramètre</th><th>Valeur</th><th>Interprétation</th></tr></thead>
        <tbody>${singleTechnicalRows(before)}</tbody>
      </table>
    </div>`;

  const diagSection = before.diagnosticResults.length > 0 ? `
    <div class="section">
      <h2 class="section-title">🔍 Diagnostic initial — Pistes identifiées</h2>
      ${faultCards(before.diagnosticResults)}
    </div>` : '';

  const checkedActions = actions.filter(a => a.checked);
  const actionsSection = `
    <div class="section">
      <h2 class="section-title">✅ Actions réalisées</h2>
      <div class="actions-grid">
        ${actions.map(a => `
          <div class="action-item">
            <span class="checkbox ${a.checked ? 'checked' : ''}">${a.checked ? '✓' : ''}</span>
            <span style="color:${a.checked ? '#1E293B' : '#94A3B8'}">${a.label}</span>
          </div>`).join('')}
      </div>
      ${checkedActions.length === 0 ? '<p style="color:#94A3B8;font-style:italic;font-size:11px;">Aucune action cochée</p>' : ''}
    </div>`;

  const obsSection = `
    <div class="section">
      <h2 class="section-title">📝 Observations & Préconisations</h2>
      <div class="obs-box">${observations.trim() || '<span style="color:#94A3B8;font-style:italic;">Aucune observation</span>'}</div>
    </div>`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<style>
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 210mm; }
  body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #1E293B; background: white; }

  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1D4ED8; padding-bottom: 10px; margin-bottom: 14px; page-break-inside: avoid; }
  .brand-name { font-size: 24px; font-weight: 800; color: #1D4ED8; letter-spacing: -0.5px; }
  .brand-sub { font-size: 10px; color: #64748B; margin-top: 2px; }
  .header-meta { text-align: right; font-size: 10px; color: #475569; line-height: 1.6; }
  .header-meta strong { color: #1E293B; }

  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px; page-break-inside: avoid; }
  .info-box { border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 10px; background: #F8FAFC; }
  .info-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #94A3B8; margin-bottom: 3px; }
  .info-value { font-size: 13px; font-weight: 600; color: #1E293B; }

  .section { margin-bottom: 14px; page-break-inside: avoid; }
  .section-title { font-size: 12px; font-weight: 700; color: #1D4ED8; text-transform: uppercase; letter-spacing: 0.4px; border-left: 3px solid #1D4ED8; padding-left: 8px; margin-bottom: 8px; }

  .diagram-wrap { border: 1px solid #E2E8F0; border-radius: 6px; overflow: hidden; background: white; width: 100%; }

  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th { background: #1D4ED8; color: white; padding: 6px 8px; text-align: left; font-weight: 600; font-size: 10px; }
  td { padding: 5px 8px; border-bottom: 1px solid #F1F5F9; }
  tr:nth-child(even) td { background: #F8FAFC; }
  td:first-child { color: #64748B; }

  .fault-card { border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 10px; margin-bottom: 6px; background: #FAFAFA; page-break-inside: avoid; }
  .fault-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
  .fault-label { font-weight: 700; font-size: 11px; color: #1E293B; }
  .fault-score { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 12px; }
  .fault-desc { font-size: 10px; color: #475569; margin-bottom: 4px; }
  .symptom-list { margin: 3px 0 4px 14px; }
  .symptom-list li { font-size: 9px; color: #64748B; margin-bottom: 1px; }
  .fault-reco { font-size: 10px; color: #1D4ED8; }

  .actions-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
  .action-item { display: flex; align-items: center; gap: 6px; font-size: 10px; padding: 3px 0; }
  .checkbox { width: 14px; height: 14px; border: 1.5px solid #CBD5E1; border-radius: 3px; display: inline-flex; align-items: center; justify-content: center; font-size: 9px; flex-shrink: 0; }
  .checkbox.checked { background: #1D4ED8; border-color: #1D4ED8; color: white; }

  .obs-box { border: 1px solid #E2E8F0; border-radius: 6px; padding: 10px; min-height: 40px; font-size: 10px; color: #1E293B; line-height: 1.6; white-space: pre-wrap; }

  .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; page-break-inside: avoid; }
  .sig-box { border: 1px solid #CBD5E1; border-radius: 6px; padding: 8px 10px; }
  .sig-label { font-size: 9px; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 4px; }
  .sig-name { font-size: 11px; font-weight: 600; color: #1E293B; margin-bottom: 6px; }
  .sig-drawing { width: 100%; height: 130px; border: 1px dashed #CBD5E1; border-radius: 4px; overflow: hidden; display: block; }
  .sig-line { border-bottom: 1px dashed #CBD5E1; margin: 24px 0 4px; }
  .sig-note { font-size: 8px; color: #94A3B8; margin-top: 4px; text-align: center; }

  .footer { margin-top: 10px; padding-top: 8px; border-top: 1px solid #E2E8F0; display: flex; justify-content: space-between; font-size: 8px; color: #94A3B8; page-break-inside: avoid; }
</style>
</head>
<body>

<div class="header">
  <div>
    <div class="brand-name">CryoHelper</div>
    <div class="brand-sub">Rapport d'intervention frigorifique${companyName ? ` · ${companyName}` : ''}</div>
  </div>
  <div class="header-meta">
    <div><strong>Date :</strong> ${formatDate(interventionDate)}</div>
    <div><strong>Heure :</strong> ${formatTime(interventionDate)}</div>
    ${companyName ? `<div><strong>Société :</strong> ${companyName}</div>` : ''}
    <div><strong>Technicien :</strong> ${technicianName || '—'}</div>
  </div>
</div>

<div class="info-grid">
  <div class="info-box"><div class="info-label">Client</div><div class="info-value">${clientName || '—'}</div></div>
  <div class="info-box"><div class="info-label">Référence installation</div><div class="info-value">${installationRef || '—'}</div></div>
</div>

${diagramSection}
${technicalSection}
${diagSection}
${actionsSection}
${obsSection}

<div class="section">
  <h2 class="section-title">✍️ Validation</h2>
  <div class="sig-grid">
    <div class="sig-box">
      <div class="sig-label">Technicien</div>
      <div class="sig-name">${technicianName || '&nbsp;'}</div>
      ${techSignature
        ? `<div class="sig-drawing">${techSignature}</div>`
        : `<div class="sig-line"></div>`}
      <div class="sig-note">Signature</div>
    </div>
    <div class="sig-box">
      <div class="sig-label">Client</div>
      <div class="sig-name">${clientName || '&nbsp;'}</div>
      ${clientSignature
        ? `<div class="sig-drawing">${clientSignature}</div>`
        : `<div class="sig-line"></div>`}
      <div class="sig-note">Signature / Bon pour accord</div>
    </div>
  </div>
</div>

<div class="footer">
  <span>CryoHelper — Application frigoriste · © 2026 François Carlier — Tous droits réservés</span>
  <span>Rapport généré le ${formatDate(interventionDate)} à ${formatTime(interventionDate)}</span>
</div>

</body>
</html>`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

function buildFileName(clientName: string, date: Date): string {
  const slug = (clientName.trim() || 'client')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // remove accents
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
  const d = date;
  const datePart = `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`;
  return `intervention-${slug}-${datePart}`;
}

export async function generateAndShareReport(data: ReportData): Promise<void> {
  const html = buildHTML(data);
  const fileName = buildFileName(data.clientName, data.interventionDate);
  // margins in points (1mm ≈ 2.835pt): 20mm top/bottom, 18mm left/right
  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
    margins: { top: 57, bottom: 57, left: 51, right: 51 },
  });

  // Rename the temp file to the desired name
  const FS = await import('expo-file-system/legacy');
  const dir = uri.substring(0, uri.lastIndexOf('/') + 1);
  const namedUri = `${dir}${fileName}.pdf`;
  await FS.moveAsync({ from: uri, to: namedUri });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(namedUri, {
      mimeType: 'application/pdf',
      dialogTitle: "Rapport d'intervention",
      UTI: 'com.adobe.pdf',
    });
  } else {
    await Print.printAsync({ uri: namedUri });
  }
}
