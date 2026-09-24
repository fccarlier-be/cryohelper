export type InsulationLevel = 'low' | 'medium' | 'good';
export type InternalLoads = 'low' | 'medium' | 'high';

export type RoomType =
  | 'cold_storage'
  | 'freezer'
  | 'air_conditioning'
  | 'server_room'
  | 'food_processing';

export interface QuickThermalInput {
  /** Floor area (m²) */
  surfaceM2: number;
  /** Ceiling height (m) */
  heightM: number;
  /** Temperature difference T_ext − T_int (positive = cooling demand) in K */
  deltaT: number;
  insulationLevel: InsulationLevel;
}

export interface DetailedThermalInput {
  /** Floor area (m²) */
  surfaceM2: number;
  /** Ceiling height (m) */
  heightM: number;
  /** Desired interior temperature (°C) */
  tempInteriorC: number;
  /** Peak exterior temperature (°C) */
  tempExteriorC: number;
  insulationLevel: InsulationLevel;
  internalLoads: InternalLoads;
  roomType: RoomType;
}

export interface ThermalBreakdown {
  /** Heat gain through envelope: walls + roof + floor (W) */
  envelopeW: number;
  /** Infiltration / air renewal heat gain (W) */
  infiltrationW: number;
  /** Internal heat sources (occupancy, equipment, lighting) (W) */
  internalLoadsW: number;
}

export interface ThermalResult {
  /** Base estimated cooling power (W) */
  powerW: number;
  /** Base estimated cooling power (kW) */
  powerKW: number;
  /** Recommended safety margin applied (%) */
  safetyMarginPct: number;
  /** Lower bound of recommended equipment size (kW) */
  minRecommendedKW: number;
  /** Upper bound of recommended equipment size (kW) */
  maxRecommendedKW: number;
  /** Detailed breakdown of heat gains */
  breakdown: ThermalBreakdown;
}

// ─── COSTIC simplified method (comfort AC, T_int = 24 °C) ────────────────────

/** Design exterior temperature used for COSTIC factor table lookup */
export type TExtCOSTIC = 28 | 32 | 36 | 40;

export interface COSTICInput {
  tExtC: TExtCOSTIC;
  // Fenêtres (m²) by orientation
  fenetresSE_m2: number;    // S / SE
  fenetresSO_m2: number;    // SO
  fenetresO_m2: number;     // O
  fenetresN_m2: number;     // N / NE / NO
  fenetresNord_m2: number;  // Non exposées (façade nord)
  // Parois opaques (m²)
  mursLeger_m2: number;     // Murs exposés — construction légère
  mursLourd_m2: number;     // Murs exposés — construction lourde
  mursNonExposes_m2: number;
  cloisons_m2: number;
  // Plafond / toiture (m²) — enter only the relevant type(s)
  plafondLocalNc_m2: number;   // Local non climatisé au-dessus
  plafondMansarde_m2: number;  // Mansarde / toiture exposée inclinée
  plafondTerrasse_m2: number;  // Terrasse
  toitureNi_m2: number;        // Toiture non isolée
  // Plancher (m²)
  plancher_m2: number;
  // Apports internes
  occupants: number;     // nombre de personnes
  appareilsW: number;    // puissance totale des appareils électriques (W)
  portesM: number;       // longueur de portes ouvertes (m linéaires)
}

export interface COSTICElementResult {
  label: string;
  watts: number;
}

export interface COSTICResult {
  totalW: number;
  totalKW: number;
  minRecommendedKW: number;
  maxRecommendedKW: number;
  safetyMarginPct: number;
  tExtC: number;
  elements: COSTICElementResult[];
}
