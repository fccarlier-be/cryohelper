import type { RefrigerantId } from './refrigerant';

export interface CycleParameters {
  refrigerantId: RefrigerantId;
  /** Evaporation temperature (°C) */
  evapTempC: number;
  /** Condensation temperature (°C) */
  condTempC: number;
  /** Superheat at compressor inlet (K) */
  superheatK: number;
  /** Subcooling at condenser outlet (K) */
  subcoolingK: number;
  /** Isentropic efficiency of the compressor (0–1) */
  isentropicEfficiency: number;
  /** Measured discharge gas temperature at compressor outlet (°C).
   *  When provided, overrides the isentropic model for point 2. */
  dischargeGasTemp_C?: number;
}

export interface CyclePoint {
  id: 1 | 2 | 3 | 4;
  label: string;
  /** Specific enthalpy (kJ/kg) */
  enthalpyKJkg: number;
  /** Pressure (bar absolute) */
  pressureBar: number;
  /** Temperature (°C) */
  temperatureC: number;
  description: string;
}

export interface CycleResult {
  points: [CyclePoint, CyclePoint, CyclePoint, CyclePoint];
  /** h1 − h4  → specific refrigerating effect (kJ/kg) */
  refrigeratingEffect: number;
  /** h2 − h1  → specific compression work (kJ/kg) */
  compressionWork: number;
  /** h2 − h3  → specific heat rejected at condenser (kJ/kg) */
  condenserHeat: number;
  /** COP = refrigeratingEffect / compressionWork */
  cop: number;
  /** Compression ratio P_cond / P_evap */
  compressionRatio: number;
  /** Mass flow rate (kg/s) for 1 kW of cooling capacity */
  massFlowPerKW: number;
}
