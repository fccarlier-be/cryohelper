/**
 * Simplified thermal balance calculator.
 *
 * Model
 * ─────
 * Q_total = Q_envelope + Q_infiltration + Q_internal
 *
 * Q_envelope  = U × S_env × ΔT
 *   S_env     = 2 × A  (floor + ceiling)
 *             + 4 × √A × H  (four walls, assuming square plan)
 *   U         = overall U-value (W/m²·K)
 *
 * Q_infiltration = Q_envelope × infiltration_factor
 *
 * Q_internal = q_int (W/m²) × A
 *
 * Equipment sizing range
 * ──────────────────────
 * P_base = Q_total
 * P_recommended ∈ [P_base × (1 + margin), P_base × (1 + margin + 0.10)]
 *
 * This is an engineering approximation for field use, not a full RT2020 model.
 */

import {
  U_VALUES,
  FLOOR_U_FACTOR,
  INTERNAL_LOAD_W_PER_M2,
  INFILTRATION_FACTOR,
  SAFETY_MARGIN,
  COSTIC_T_EXT,
  COSTIC_FACTORS,
} from '../constants/thermalConstants';

import type {
  QuickThermalInput,
  DetailedThermalInput,
  ThermalResult,
  COSTICInput,
  COSTICResult,
  COSTICElementResult,
} from '../types/thermal';

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Total external surface area of a box-shaped room (m²), assuming square floor plan */
function envelopeArea(surfaceM2: number, heightM: number): number {
  const sideLength = Math.sqrt(surfaceM2);
  const walls = 4 * sideLength * heightM;
  const ceilingAndFloor = 2 * surfaceM2;
  return walls + ceilingAndFloor;
}

function roundW(value: number): number {
  return Math.round(value);
}

function roundKW(value: number): number {
  return Math.round(value * 10) / 10;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function calculateQuickThermal(input: QuickThermalInput): ThermalResult {
  const { surfaceM2, heightM, deltaT, insulationLevel } = input;

  const U = U_VALUES[insulationLevel];
  const S_env = envelopeArea(surfaceM2, heightM);

  // Separate wall/ceiling heat gain from floor (less exposed)
  const S_walls_and_ceiling = S_env - surfaceM2; // remove one floor face
  const envelopeW =
    U * S_walls_and_ceiling * deltaT + U * FLOOR_U_FACTOR * surfaceM2 * deltaT;

  // Quick mode uses a fixed infiltration factor and zero internal loads
  const infiltrationW = envelopeW * 0.15;
  const internalLoadsW = 0;

  const totalW = envelopeW + infiltrationW + internalLoadsW;

  // Default safety margin 15 % for quick mode
  const margin = 0.15;

  return buildResult(totalW, margin, { envelopeW, infiltrationW, internalLoadsW });
}

export function calculateDetailedThermal(input: DetailedThermalInput): ThermalResult {
  const {
    surfaceM2,
    heightM,
    tempInteriorC,
    tempExteriorC,
    insulationLevel,
    internalLoads,
    roomType,
  } = input;

  const deltaT = tempExteriorC - tempInteriorC;
  if (deltaT <= 0) {
    // No cooling demand — return zero result
    return buildResult(0, SAFETY_MARGIN[roomType], {
      envelopeW: 0,
      infiltrationW: 0,
      internalLoadsW: 0,
    });
  }

  const U = U_VALUES[insulationLevel];
  const S_env = envelopeArea(surfaceM2, heightM);
  const S_walls_and_ceiling = S_env - surfaceM2;

  const envelopeW =
    U * S_walls_and_ceiling * deltaT + U * FLOOR_U_FACTOR * surfaceM2 * deltaT;

  const infiltrationFactor = INFILTRATION_FACTOR[roomType];
  const infiltrationW = envelopeW * infiltrationFactor;

  const qInt = INTERNAL_LOAD_W_PER_M2[internalLoads];
  const internalLoadsW = qInt * surfaceM2;

  const totalW = envelopeW + infiltrationW + internalLoadsW;
  const margin = SAFETY_MARGIN[roomType];

  return buildResult(totalW, margin, { envelopeW, infiltrationW, internalLoadsW });
}

function buildResult(
  totalW: number,
  margin: number,
  breakdown: { envelopeW: number; infiltrationW: number; internalLoadsW: number },
): ThermalResult {
  const powerW = roundW(totalW);
  const powerKW = roundKW(totalW / 1000);
  const minKW = roundKW((totalW * (1 + margin)) / 1000);
  const maxKW = roundKW((totalW * (1 + margin + 0.1)) / 1000);

  return {
    powerW,
    powerKW,
    safetyMarginPct: Math.round(margin * 100),
    minRecommendedKW: minKW,
    maxRecommendedKW: maxKW,
    breakdown: {
      envelopeW: roundW(breakdown.envelopeW),
      infiltrationW: roundW(breakdown.infiltrationW),
      internalLoadsW: roundW(breakdown.internalLoadsW),
    },
  };
}

/** Returns a human-readable summary of recommended sizing */
export function formatRecommendation(result: ThermalResult): string {
  return `${result.minRecommendedKW} – ${result.maxRecommendedKW} kW`;
}

/** Handy conversion for display */
export function wToKw(w: number): number {
  return Math.round((w / 1000) * 10) / 10;
}

// ─── COSTIC simplified method ─────────────────────────────────────────────────

/**
 * Calcul du bilan thermique selon la méthode simplifiée COSTIC/COFRETH.
 * Applicable uniquement au confort (T_int = 24 °C).
 * Les facteurs sont lus dans la table COSTIC_FACTORS pour la T_ext choisie.
 */
export function calculateCOSTIC(input: COSTICInput): COSTICResult {
  const idx = COSTIC_T_EXT.indexOf(input.tExtC as (typeof COSTIC_T_EXT)[number]);
  if (idx === -1) throw new Error(`T_ext ${input.tExtC} °C non supporté`);

  const F = (key: keyof typeof COSTIC_FACTORS): number =>
    COSTIC_FACTORS[key][idx] as number;

  const elements: COSTICElementResult[] = [];

  function add(label: string, quantity: number, factor: number): number {
    const w = quantity * factor;
    if (w > 0) elements.push({ label, watts: Math.round(w) });
    return w;
  }

  let total = 0;
  // Fenêtres
  total += add('Fenêtres S/SE', input.fenetresSE_m2, F('fenetresSE'));
  total += add('Fenêtres SO', input.fenetresSO_m2, F('fenetresSO'));
  total += add('Fenêtres O', input.fenetresO_m2, F('fenetresO'));
  total += add('Fenêtres N/NE/NO', input.fenetresN_m2, F('fenetresN'));
  total += add('Fenêtres non exposées', input.fenetresNord_m2, F('fenetresNord'));
  // Parois opaques
  total += add('Murs exposés légers', input.mursLeger_m2, F('mursLeger'));
  total += add('Murs exposés lourds', input.mursLourd_m2, F('mursLourd'));
  total += add('Murs non exposés', input.mursNonExposes_m2, F('mursNonExposes'));
  total += add('Cloisons', input.cloisons_m2, F('cloisons'));
  // Plafond / toiture
  total += add('Plafond (local nc au-dessus)', input.plafondLocalNc_m2, F('plafondLocalNc'));
  total += add('Plafond mansarde', input.plafondMansarde_m2, F('plafondMansarde'));
  total += add('Plafond terrasse', input.plafondTerrasse_m2, F('plafondTerrasse'));
  total += add('Toiture non isolée', input.toitureNi_m2, F('toitureNi'));
  // Plancher
  total += add('Plancher', input.plancher_m2, F('plancher'));
  // Apports internes
  total += add('Occupants', input.occupants, F('occupants'));
  total += add('Appareils électriques', input.appareilsW, F('appareils'));
  total += add('Portes ouvertes', input.portesM, F('portes'));

  const margin = 0.10; // 10 % de marge (recommandation COSTIC pour confort)

  return {
    totalW: Math.round(total),
    totalKW: roundKW(total / 1000),
    minRecommendedKW: roundKW((total * (1 + margin)) / 1000),
    maxRecommendedKW: roundKW((total * (1 + margin + 0.10)) / 1000),
    safetyMarginPct: Math.round(margin * 100),
    tExtC: input.tExtC,
    elements,
  };
}
