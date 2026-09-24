export interface DiagnosticInput {
  /** Pression basse (bar absolus) */
  bpBar: number;
  /** Pression haute (bar absolus) */
  hpBar: number;
  /** Surchauffe aspiration (K) */
  superheatK: number;
  /** Sous-refroidissement condenseur (K) */
  subcoolingK: number;
  /** Température de saturation à l'évaporateur (°C) */
  evapTempC: number;
  /** Température de saturation au condenseur (°C) */
  condTempC: number;
  /** Température ambiante (°C) — optionnel */
  ambientTempC?: number;
  /** Température sortie compresseur (°C) — optionnel */
  dischargeTempC?: number;
}

export type FaultId =
  | 'LOW_REFRIGERANT'
  | 'REFRIGERANT_OVERCHARGE'
  | 'POOR_EVAPORATOR'
  | 'POOR_CONDENSER'
  | 'TXV_UNDERFEEDING'
  | 'TXV_OVERFEEDING'
  | 'COMPRESSOR_FAULT'
  | 'NON_CONDENSABLE';

export interface DiagnosticResult {
  faultId: FaultId;
  label: string;
  description: string;
  score: number;
  symptoms: string[];
  recommendation: string;
}

export type DiagnosticOutput =
  | { valid: false; errors: string[] }
  | { valid: true; results: DiagnosticResult[] };
