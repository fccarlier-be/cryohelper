/**
 * Refrigeration cycle calculator — V2 using high-resolution CoolProp tables.
 *
 * Cycle points
 * ────────────
 *  1 → Compressor inlet  (superheated vapour at P_evap)
 *  2 → Compressor outlet (superheated vapour at P_cond, after compression)
 *  3 → Expansion valve inlet (subcooled liquid at P_cond)
 *  4 → Expansion valve outlet (wet vapour at P_evap, isenthalpic)
 *
 * Compression model
 * ─────────────────
 *  h1, s1  : exact from superheated table at (P_evap, T_asp)
 *  h2s     : isentropic endpoint found by entropy search on P_cond isobars
 *  h2      : h1 + (h2s − h1) / η_is
 *  T2      : binary search on P_cond isobar for h = h2
 *  h3      : saturation liquid at (T_cond − subcooling) — accurate subcooled approx
 */

import { loadFluidTable } from './fluidTableLoader';
import { satFromTemp, shPoint, isentropicDischargeH } from './fluidInterpolator';
import type { CycleParameters, CycleResult, CyclePoint } from '../types/enthalpy';
import type { FluidTable } from '../types/fluidTable';

// ─── Internal helpers ─────────────────────────────────────────────────────────

function findDischargeTemp(
  table: FluidTable,
  pBar: number,
  hTarget: number,
  tSatC: number,
): number {
  let lo = tSatC + 0.5;
  let hi = tSatC + 200;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    try {
      const h = shPoint(table, pBar, mid).h_kJkg;
      if (h < hTarget) lo = mid;
      else hi = mid;
    } catch {
      hi = mid;
    }
  }
  return (lo + hi) / 2;
}

// ─── Cycle calculation ────────────────────────────────────────────────────────

export async function calculateCycle(params: CycleParameters): Promise<CycleResult> {
  const {
    refrigerantId, evapTempC, condTempC, superheatK, subcoolingK,
    isentropicEfficiency, dischargeGasTemp_C,
  } = params;

  const table = await loadFluidTable(refrigerantId);

  const satEvap = satFromTemp(table, evapTempC);
  const satCond = satFromTemp(table, condTempC);
  const P1 = satEvap.pressureBar;
  const P2 = satCond.pressureBar;

  // ── Point 1: compressor inlet ─────────────────────────────────────────────
  // For zeotropic fluids, superheat is measured from Tdew (dew temperature), not Tbub
  const dewRefEvap = table.sat.isZeotropic ? (satEvap.tempDewC ?? evapTempC) : evapTempC;
  const T1_C = dewRefEvap + superheatK;
  let h1 = satEvap.hVap_kJkg;
  let s1 = satEvap.sVap_kJkgK;
  try {
    const pt1 = shPoint(table, P1, T1_C);
    h1 = pt1.h_kJkg;
    s1 = pt1.s_kJkgK;
  } catch { /* below table minimum — use saturation vapour */ }

  // ── Point 2: compressor outlet ────────────────────────────────────────────
  let h2: number;
  let T2_C: number;
  if (dischargeGasTemp_C !== undefined && dischargeGasTemp_C > T1_C) {
    T2_C = dischargeGasTemp_C;
    try {
      h2 = shPoint(table, P2, T2_C).h_kJkg;
    } catch {
      h2 = h1 + (satCond.hVap_kJkg - satEvap.hVap_kJkg);
    }
  } else {
    // For zeotropic fluids, SH isobars reference Tdew as their lower temperature bound
    const tSatCondRef = table.sat.isZeotropic ? (satCond.tempDewC ?? condTempC) : condTempC;
    const h2s = isentropicDischargeH(table, s1, P2, tSatCondRef);
    h2 = h1 + (h2s - h1) / isentropicEfficiency;
    T2_C = findDischargeTemp(table, P2, h2, tSatCondRef);
  }

  // ── Point 3: condenser outlet (subcooled liquid) ──────────────────────────
  const h3 = satFromTemp(table, condTempC - subcoolingK).hLiq_kJkg;
  const T3_C = condTempC - subcoolingK;

  // ── Point 4: expansion valve outlet (isenthalpic) ────────────────────────
  const h4 = h3;
  const T4_C = evapTempC;

  // ── Performance ───────────────────────────────────────────────────────────
  const refrigeratingEffect = h1 - h4;
  const compressionWork = h2 - h1;
  const condenserHeat = h2 - h3;
  const cop = refrigeratingEffect / compressionWork;

  const points: [CyclePoint, CyclePoint, CyclePoint, CyclePoint] = [
    { id: 1, label: '1', enthalpyKJkg: round1(h1), pressureBar: round2(P1), temperatureC: round1(T1_C), description: 'Sortie évaporateur (vapeur surchauffée)' },
    { id: 2, label: '2', enthalpyKJkg: round1(h2), pressureBar: round2(P2), temperatureC: round1(T2_C), description: 'Sortie compresseur (vapeur surchauffée HP)' },
    { id: 3, label: '3', enthalpyKJkg: round1(h3), pressureBar: round2(P2), temperatureC: round1(T3_C), description: 'Sortie condenseur (liquide sous-refroidi)' },
    { id: 4, label: '4', enthalpyKJkg: round1(h4), pressureBar: round2(P1), temperatureC: round1(T4_C), description: 'Sortie détendeur (mélange biphasique)' },
  ];

  return {
    points,
    refrigeratingEffect: round1(refrigeratingEffect),
    compressionWork:     round1(compressionWork),
    condenserHeat:       round1(condenserHeat),
    cop:                 round2(cop),
    compressionRatio:    round2(P2 / P1),
    massFlowPerKW:       round3(compressionWork > 0 ? 1 / refrigeratingEffect : 0),
  };
}

// ─── Default parameters ───────────────────────────────────────────────────────

type DefaultPreset = { evapTempC: number; condTempC: number; superheatK: number; subcoolingK: number };

const CYCLE_DEFAULTS: Record<string, DefaultPreset> = {
  // ── Comfort cooling / climatisation ─────────────────────────────────────────
  R134a:    { evapTempC:   0, condTempC: 45, superheatK:  5, subcoolingK: 5 },
  R32:      { evapTempC:  -5, condTempC: 45, superheatK:  5, subcoolingK: 5 },
  R1234yf:  { evapTempC:   0, condTempC: 45, superheatK:  5, subcoolingK: 5 },
  R1234ze:  { evapTempC:   0, condTempC: 45, superheatK:  5, subcoolingK: 5 },
  R452B:    { evapTempC:  -5, condTempC: 45, superheatK:  5, subcoolingK: 5 },
  R454B:    { evapTempC:  -5, condTempC: 45, superheatK:  5, subcoolingK: 5 },
  // ── Réfrigération commerciale ────────────────────────────────────────────────
  R22:      { evapTempC: -10, condTempC: 40, superheatK:  5, subcoolingK: 5 },
  R410A:    { evapTempC: -10, condTempC: 40, superheatK:  5, subcoolingK: 5 },
  R407C:    { evapTempC: -10, condTempC: 40, superheatK:  5, subcoolingK: 5 },
  R290:     { evapTempC: -10, condTempC: 40, superheatK:  5, subcoolingK: 5 },
  R449A:    { evapTempC: -10, condTempC: 40, superheatK:  5, subcoolingK: 5 },
  R452A:    { evapTempC: -10, condTempC: 40, superheatK:  5, subcoolingK: 5 },
  R454A:    { evapTempC: -10, condTempC: 40, superheatK:  5, subcoolingK: 5 },
  // ── Basse température / surgélation ─────────────────────────────────────────
  R404A:    { evapTempC: -35, condTempC: 40, superheatK: 10, subcoolingK: 5 },
  R507A:    { evapTempC: -35, condTempC: 40, superheatK: 10, subcoolingK: 5 },
  R448A:    { evapTempC: -35, condTempC: 40, superheatK: 10, subcoolingK: 5 },
  R454C:    { evapTempC: -35, condTempC: 40, superheatK: 10, subcoolingK: 5 },
  R455A:    { evapTempC: -35, condTempC: 40, superheatK: 10, subcoolingK: 5 },
  // ── Appareils ménagers ───────────────────────────────────────────────────────
  R600:     { evapTempC: -25, condTempC: 50, superheatK:  5, subcoolingK: 5 },
  R600a:    { evapTempC: -25, condTempC: 50, superheatK:  5, subcoolingK: 5 },
  // ── Ammoniac (froid industriel) ──────────────────────────────────────────────
  R717:     { evapTempC: -10, condTempC: 40, superheatK: 10, subcoolingK: 5 },
  // ── CO₂ subcritique ──────────────────────────────────────────────────────────
  R744:     { evapTempC: -10, condTempC: 20, superheatK: 10, subcoolingK: 3 },
  // ── Eau (cycle à vapeur) ─────────────────────────────────────────────────────
  R718:     { evapTempC:  20, condTempC: 80, superheatK: 10, subcoolingK: 5 },
};

const DEFAULT_PRESET: DefaultPreset = { evapTempC: 0, condTempC: 45, superheatK: 5, subcoolingK: 5 };

export function defaultCycleParams(refrigerantId: string): CycleParameters {
  const preset = CYCLE_DEFAULTS[refrigerantId] ?? DEFAULT_PRESET;
  return {
    refrigerantId: refrigerantId as CycleParameters['refrigerantId'],
    ...preset,
    isentropicEfficiency: 1.0,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function round1(v: number): number { return Math.round(v * 10) / 10; }
function round2(v: number): number { return Math.round(v * 100) / 100; }
function round3(v: number): number { return Math.round(v * 1000) / 1000; }
