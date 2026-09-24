/**
 * Interpolation thermodynamique sur les tables haute résolution CoolProp.
 *
 * Gère deux structures de table de saturation :
 *   - Fluides purs / pseudo-purs  → T-indexé  (tMinC + tStepC)
 *   - Mélanges zéotropiques       → P-indexé  (pMinBar + pStepBar, colonnes Tbub/Tdew)
 */

import type { FluidTable, ShIsobar } from '../types/fluidTable';
import { SAT_COL, SAT_ZEO_COL, SH_COL } from '../types/fluidTable';

// ── Primitives d'interpolation ────────────────────────────────────────────────

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function bisect(arr: number[], x: number): number {
  let lo = 0;
  let hi = arr.length - 1;
  if (x < arr[0]) return -1;
  if (x >= arr[hi]) return hi;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] <= x) lo = mid;
    else hi = mid;
  }
  return lo;
}

function bisectCol(rows: number[][], col: number, x: number): number {
  let lo = 0;
  let hi = rows.length - 1;
  if (x < rows[0][col]) return -1;
  if (x >= rows[hi][col]) return hi;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (rows[mid][col] <= x) lo = mid;
    else hi = mid;
  }
  return lo;
}


// ── Type de retour ────────────────────────────────────────────────────────────

export interface SatPoint {
  tempC:       number;   // température bulle (= température sat pour fluides purs)
  tempDewC?:   number;   // température rosée (mélanges zéotropiques uniquement)
  pressureBar: number;
  hLiq_kJkg:   number;
  hVap_kJkg:   number;
  sLiq_kJkgK:  number;
  sVap_kJkgK:  number;
  rhoLiq_kgm3: number;
  rhoVap_kgm3: number;
}

// ── Helpers internes pour construire un SatPoint ──────────────────────────────

function satPointFromPureRows(
  rows: number[][], i: number, t: number, tempC: number,
): SatPoint {
  const i1 = Math.min(i + 1, rows.length - 1);
  return {
    tempC,
    pressureBar: lerp(rows[i][SAT_COL.P_BAR],     rows[i1][SAT_COL.P_BAR],     t),
    hLiq_kJkg:   lerp(rows[i][SAT_COL.HL_KJKG],   rows[i1][SAT_COL.HL_KJKG],   t),
    hVap_kJkg:   lerp(rows[i][SAT_COL.HV_KJKG],   rows[i1][SAT_COL.HV_KJKG],   t),
    sLiq_kJkgK:  lerp(rows[i][SAT_COL.SL_KJKGK],  rows[i1][SAT_COL.SL_KJKGK],  t),
    sVap_kJkgK:  lerp(rows[i][SAT_COL.SV_KJKGK],  rows[i1][SAT_COL.SV_KJKGK],  t),
    rhoLiq_kgm3: lerp(rows[i][SAT_COL.RHOL_KGM3], rows[i1][SAT_COL.RHOL_KGM3], t),
    rhoVap_kgm3: lerp(rows[i][SAT_COL.RHOV_KGM3], rows[i1][SAT_COL.RHOV_KGM3], t),
  };
}

function satPointFromZeoRows(
  rows: number[][], i: number, t: number, pressureBar: number,
): SatPoint {
  const i1 = Math.min(i + 1, rows.length - 1);
  return {
    tempC:       lerp(rows[i][SAT_ZEO_COL.TBUB_C],    rows[i1][SAT_ZEO_COL.TBUB_C],    t),
    tempDewC:    lerp(rows[i][SAT_ZEO_COL.TDEW_C],    rows[i1][SAT_ZEO_COL.TDEW_C],    t),
    pressureBar,
    hLiq_kJkg:   lerp(rows[i][SAT_ZEO_COL.HL_KJKG],   rows[i1][SAT_ZEO_COL.HL_KJKG],   t),
    hVap_kJkg:   lerp(rows[i][SAT_ZEO_COL.HV_KJKG],   rows[i1][SAT_ZEO_COL.HV_KJKG],   t),
    sLiq_kJkgK:  lerp(rows[i][SAT_ZEO_COL.SL_KJKGK],  rows[i1][SAT_ZEO_COL.SL_KJKGK],  t),
    sVap_kJkgK:  lerp(rows[i][SAT_ZEO_COL.SV_KJKGK],  rows[i1][SAT_ZEO_COL.SV_KJKGK],  t),
    rhoLiq_kgm3: lerp(rows[i][SAT_ZEO_COL.RHOL_KGM3], rows[i1][SAT_ZEO_COL.RHOL_KGM3], t),
    rhoVap_kgm3: lerp(rows[i][SAT_ZEO_COL.RHOV_KGM3], rows[i1][SAT_ZEO_COL.RHOV_KGM3], t),
  };
}

// ── Saturation par température ────────────────────────────────────────────────

export function satFromTemp(table: FluidTable, tempC: number): SatPoint {
  const { sat } = table;
  const { rows } = sat;

  if (sat.isZeotropic) {
    // Recherche binaire sur la colonne T_bub (monotone croissante)
    const i = bisectCol(rows, SAT_ZEO_COL.TBUB_C, tempC);
    if (i < 0) {
      const p = rows[0][SAT_ZEO_COL.P_BAR];
      return satPointFromZeoRows(rows, 0, 0, p);
    }
    const i1 = Math.min(i + 1, rows.length - 1);
    const t0 = rows[i][SAT_ZEO_COL.TBUB_C];
    const t1 = rows[i1][SAT_ZEO_COL.TBUB_C];
    const frac = t1 !== t0 ? (tempC - t0) / (t1 - t0) : 0;
    const p = lerp(rows[i][SAT_ZEO_COL.P_BAR], rows[i1][SAT_ZEO_COL.P_BAR], frac);
    return satPointFromZeoRows(rows, i, frac, p);
  }

  // Fluide pur : grille régulière en température
  const { tMinC, tStepC } = sat;
  const fi = (tempC - tMinC!) / tStepC!;
  const i  = Math.floor(fi);
  const t  = fi - i;
  const i0 = Math.max(0, Math.min(i, rows.length - 2));
  const t0 = i0 === i ? t : (i < 0 ? 0 : 1);

  return satPointFromPureRows(rows, i0, t0, tempC);
}

// ── Saturation par pression ───────────────────────────────────────────────────

export function satFromPressure(table: FluidTable, pressureBar: number): SatPoint {
  const { sat } = table;
  const { rows } = sat;

  if (sat.isZeotropic) {
    // Grille régulière en pression
    const { pMinBar, pStepBar } = sat;
    const fi = (pressureBar - pMinBar!) / pStepBar!;
    const i  = Math.floor(fi);
    const t  = fi - i;
    const i0 = Math.max(0, Math.min(i, rows.length - 2));
    const t0 = i0 === i ? t : (i < 0 ? 0 : 1);
    return satPointFromZeoRows(rows, i0, t0, pressureBar);
  }

  // Fluide pur : recherche binaire sur la colonne P
  const i = bisectCol(rows, SAT_COL.P_BAR, pressureBar);
  if (i < 0) {
    const { tMinC } = sat;
    return satPointFromPureRows(rows, 0, 0, tMinC!);
  }
  const i1 = Math.min(i + 1, rows.length - 1);
  const p0 = rows[i][SAT_COL.P_BAR];
  const p1 = rows[i1][SAT_COL.P_BAR];
  const t  = p1 !== p0 ? (pressureBar - p0) / (p1 - p0) : 0;
  const tMinC   = sat.tMinC!;
  const tStepC  = sat.tStepC!;
  const tempC   = tMinC + lerp(i, i1, t) * tStepC;
  return satPointFromPureRows(rows, i, t, tempC);
}

// ── Vapeur surchauffée (interpolation bilinéaire P × T) ───────────────────────

export interface ShPoint {
  tempC:    number;
  pressBar: number;
  h_kJkg:   number;
  s_kJkgK:  number;
  rho_kgm3: number;
}

function findBracketIsobars(
  sh: ShIsobar[],
  pressureBar: number,
): [ShIsobar, ShIsobar] | null {
  if (sh.length < 2) return null;
  const pressures = sh.map((iso) => iso.pBar);
  const i = bisect(pressures, pressureBar);
  if (i < 0 || i >= sh.length - 1) return null;
  return [sh[i], sh[i + 1]];
}

function interpOnIsobar(
  iso: ShIsobar,
  tempC: number,
): { h: number; s: number; rho: number } | null {
  const { tMinC, tStepC, rows } = iso;
  const fi = (tempC - tMinC) / tStepC;
  const i  = Math.floor(fi);
  const t  = fi - i;
  if (i < 0 || i >= rows.length - 1) return null;
  return {
    h:   lerp(rows[i][SH_COL.H_KJKG],   rows[i + 1][SH_COL.H_KJKG],   t),
    s:   lerp(rows[i][SH_COL.S_KJKGK],  rows[i + 1][SH_COL.S_KJKGK],  t),
    rho: lerp(rows[i][SH_COL.RHO_KGM3], rows[i + 1][SH_COL.RHO_KGM3], t),
  };
}

export function shPoint(
  table: FluidTable,
  pressureBar: number,
  tempC: number,
): ShPoint {
  const bracket = findBracketIsobars(table.sh, pressureBar);
  if (!bracket) {
    throw new Error(
      `Pression ${pressureBar.toFixed(2)} bar hors plage des tables surchauffe (${table.id})`,
    );
  }
  const [isoLow, isoHigh] = bracket;
  const ptLow  = interpOnIsobar(isoLow,  tempC);
  const ptHigh = interpOnIsobar(isoHigh, tempC);
  if (!ptLow || !ptHigh) {
    throw new Error(
      `Température ${tempC.toFixed(1)}°C hors plage de l'isobare ${pressureBar.toFixed(2)} bar (${table.id})`,
    );
  }
  const tp = (pressureBar - isoLow.pBar) / (isoHigh.pBar - isoLow.pBar);
  return {
    tempC,
    pressBar: pressureBar,
    h_kJkg:   lerp(ptLow.h,   ptHigh.h,   tp),
    s_kJkgK:  lerp(ptLow.s,   ptHigh.s,   tp),
    rho_kgm3: lerp(ptLow.rho, ptHigh.rho, tp),
  };
}

// ── Saturation par température rosée (mélanges zéotropiques) ─────────────────

export function satFromTempDew(table: FluidTable, tempDewC: number): SatPoint {
  const { sat } = table;
  const { rows } = sat;

  if (sat.isZeotropic) {
    const i = bisectCol(rows, SAT_ZEO_COL.TDEW_C, tempDewC);
    if (i < 0) {
      const p = rows[0][SAT_ZEO_COL.P_BAR];
      return satPointFromZeoRows(rows, 0, 0, p);
    }
    const i1 = Math.min(i + 1, rows.length - 1);
    const t0 = rows[i][SAT_ZEO_COL.TDEW_C];
    const t1 = rows[i1][SAT_ZEO_COL.TDEW_C];
    const frac = t1 !== t0 ? (tempDewC - t0) / (t1 - t0) : 0;
    const p = lerp(rows[i][SAT_ZEO_COL.P_BAR], rows[i1][SAT_ZEO_COL.P_BAR], frac);
    return satPointFromZeoRows(rows, i, frac, p);
  }

  return satFromTemp(table, tempDewC);
}

// ── Helpers dérivés ───────────────────────────────────────────────────────────

export function latentHeat(table: FluidTable, tempC: number): number {
  const pt = satFromTemp(table, tempC);
  return pt.hVap_kJkg - pt.hLiq_kJkg;
}

export function satPressure(table: FluidTable, tempC: number): number {
  return satFromTemp(table, tempC).pressureBar;
}

export function satTemp(table: FluidTable, pressureBar: number): number {
  return satFromPressure(table, pressureBar).tempC;
}

export function isentropicDischargeH(
  table: FluidTable,
  s_target: number,
  pHighBar: number,
  tSatHighC: number,
): number {
  const bracket = findBracketIsobars(table.sh, pHighBar);
  if (!bracket) throw new Error(`Pression ${pHighBar} bar hors tables (${table.id})`);

  const [isoLow, isoHigh] = bracket;
  const tp = (pHighBar - isoLow.pBar) / (isoHigh.pBar - isoLow.pBar);

  const nRows = Math.min(isoLow.rows.length, isoHigh.rows.length);
  if (nRows < 2) throw new Error(`Isobare insuffisante pour ${table.id}`);

  const sAt = (idx: number): number => {
    const sL = isoLow.rows[idx][SH_COL.S_KJKGK];
    const sH = isoHigh.rows[idx][SH_COL.S_KJKGK];
    return lerp(sL, sH, tp);
  };

  let lo = 0;
  let hi = nRows - 1;
  if (s_target <= sAt(0)) { lo = 0; hi = 1; }
  else if (s_target >= sAt(hi)) { lo = hi - 1; }
  else {
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (sAt(mid) <= s_target) lo = mid;
      else hi = mid;
    }
  }

  const s0 = sAt(lo);
  const s1 = sAt(hi);
  const t  = s1 !== s0 ? (s_target - s0) / (s1 - s0) : 0;

  const hL = lerp(isoLow.rows[lo][SH_COL.H_KJKG],  isoLow.rows[hi][SH_COL.H_KJKG],  t);
  const hH = lerp(isoHigh.rows[lo][SH_COL.H_KJKG], isoHigh.rows[hi][SH_COL.H_KJKG], t);
  return lerp(hL, hH, tp);
}
