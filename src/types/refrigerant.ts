/** One point on the saturation curve (bubble/dew line) */
export interface SaturationPoint {
  /** Temperature in °C */
  temperatureC: number;
  /** Saturation pressure in bar (absolute) */
  pressureBar: number;
  /** Specific enthalpy of saturated liquid hf (kJ/kg) */
  enthalpyLiquid: number;
  /** Specific enthalpy of saturated vapour hg (kJ/kg) */
  enthalpyVapor: number;
}

/** Complete thermodynamic dataset for a refrigerant.
 *  The saturation table must cover at least the range -40 °C to 70 °C.
 *  All property approximations are suitable for V1 field calculations.
 */
export interface RefrigerantData {
  id: RefrigerantId;
  /** Commercial name, e.g. "R-134a" */
  name: string;
  /** Display label with family, e.g. "R134a (HFC)" */
  label: string;
  /** GWP-100 relative to CO₂ */
  gwp: number;
  /** Critical temperature in °C */
  criticalTempC: number;
  /** Critical pressure in bar (absolute) */
  criticalPressureBar: number;
  /** Saturation table sorted by ascending temperature */
  saturationTable: SaturationPoint[];
  /** Average Cp of superheated vapour near saturation (kJ/kg·K) */
  cpVapor: number;
  /** Average Cp of subcooled liquid near saturation (kJ/kg·K) */
  cpLiquid: number;
  /** Heat capacity ratio γ = Cp/Cv used for isentropic compression approximation */
  gamma: number;
}

export type RefrigerantId =
  | 'R134a' | 'R32' | 'R22'
  | 'R410A' | 'R407C' | 'R404A' | 'R507A'
  | 'R1234yf' | 'R1234ze'
  | 'R744' | 'R290' | 'R600' | 'R600a' | 'R717'
  | 'R448A' | 'R449A' | 'R452A' | 'R452B' | 'R454A' | 'R454B' | 'R454C'
  | 'R455A' | 'R718';
