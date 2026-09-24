/**
 * Types pour les tables thermodynamiques haute résolution.
 *
 * Fluides purs / pseudo-purs (ex. R134a, R410A…) — table T-indexée :
 *   sat.tMinC, sat.tStepC, sat.rows[][7]
 *   colonnes : [P_bar, hL, hV, sL, sV, rhoL, rhoV]
 *
 * Mélanges zéotropiques (ex. R449A, R452B…) — table P-indexée :
 *   sat.isZeotropic = true, sat.pMinBar, sat.pStepBar, sat.rows[][9]
 *   colonnes : [P_bar, Tbub_C, Tdew_C, hL, hV, sL, sV, rhoL, rhoV]
 *
 * Vapeur surchauffée (commun) :
 *   tableau d'isobares, chacune avec rows[][4] = [T_C, h, s, rho]
 */

export interface SatTable {
  // ── Fluides purs (T-indexé) ──
  tMinC?:  number;
  tStepC?: number;
  // ── Mélanges zéotropiques (P-indexé) ──
  pMinBar?:    number;
  pStepBar?:   number;
  isZeotropic?: boolean;
  // ── Commun ──
  cols: string[];
  rows: number[][];
}

export interface ShIsobar {
  pBar:   number;
  tSatC:  number;
  tMinC:  number;
  tStepC: number;
  cols:   string[];
  rows:   number[][];  // [T_C, h_kJkg, s_kJkgK, rho_kgm3]
}

export interface FluidTable {
  id:                  string;
  name:                string;
  coolpropName:        string;
  molarMass:           number;
  criticalTempC:       number;
  criticalPressureBar: number;
  gwp100:              number;
  ashraeClass:         string;
  sat:                 SatTable;
  sh:                  ShIsobar[];
}

export interface FluidIndexEntry {
  id:                  string;
  name:                string;
  coolpropName:        string;
  molarMass:           number;
  criticalTempC:       number;
  criticalPressureBar: number;
  gwp100:              number;
  ashraeClass:         string;
  satPoints:           number;
  shIsobars:           number;
}

// ── Colonnes saturation fluide pur (T-indexé) ────────────────────────────────
export const SAT_COL = {
  P_BAR:     0,
  HL_KJKG:   1,
  HV_KJKG:   2,
  SL_KJKGK:  3,
  SV_KJKGK:  4,
  RHOL_KGM3: 5,
  RHOV_KGM3: 6,
} as const;

// ── Colonnes saturation mélange zéotropique (P-indexé) ───────────────────────
export const SAT_ZEO_COL = {
  P_BAR:     0,
  TBUB_C:    1,
  TDEW_C:    2,
  HL_KJKG:   3,
  HV_KJKG:   4,
  SL_KJKGK:  5,
  SV_KJKGK:  6,
  RHOL_KGM3: 7,
  RHOV_KGM3: 8,
} as const;

// ── Colonnes surchauffe ───────────────────────────────────────────────────────
export const SH_COL = {
  T_C:      0,
  H_KJKG:   1,
  S_KJKGK:  2,
  RHO_KGM3: 3,
} as const;
