/**
 * Pure unit-conversion functions.
 * All functions return numbers rounded to 4 significant figures.
 */

// ─── Pressure ─────────────────────────────────────────────────────────────────

export function barToPsi(bar: number): number   { return r4(bar * 14.5038); }
export function psiToBar(psi: number): number   { return r4(psi / 14.5038); }
export function barToKpa(bar: number): number   { return r4(bar * 100); }
export function kpaToBar(kpa: number): number   { return r4(kpa / 100); }
export function barToMpa(bar: number): number   { return r4(bar / 10); }
export function mpaToBar(mpa: number): number   { return r4(mpa * 10); }
export function barToPa(bar: number): number    { return r4(bar * 100_000); }
export function paToBbar(pa: number): number    { return r4(pa / 100_000); }

// Gauge ↔ Absolute (assuming atmospheric = 1.01325 bar)
export const P_ATM_BAR = 1.01325;
export function absToGauge(absBar: number): number  { return r4(absBar - P_ATM_BAR); }
export function gaugeToAbs(gaugeBar: number): number { return r4(gaugeBar + P_ATM_BAR); }

// ─── Temperature ──────────────────────────────────────────────────────────────

export function celsiusToKelvin(c: number): number  { return r4(c + 273.15); }
export function kelvinToCelsius(k: number): number  { return r4(k - 273.15); }
export function celsiusToFahrenheit(c: number): number { return r4(c * 9/5 + 32); }
export function fahrenheitToCelsius(f: number): number { return r4((f - 32) * 5/9); }
export function kelvinToFahrenheit(k: number): number  { return celsiusToFahrenheit(kelvinToCelsius(k)); }
export function fahrenheitToKelvin(f: number): number  { return celsiusToKelvin(fahrenheitToCelsius(f)); }

// ─── Power / Energy ───────────────────────────────────────────────────────────

export function wToKw(w: number): number    { return r4(w / 1000); }
export function kwToW(kw: number): number   { return r4(kw * 1000); }
export function wToHp(w: number): number    { return r4(w / 745.7); }
export function hpToW(hp: number): number   { return r4(hp * 745.7); }
export function wToBtuH(w: number): number  { return r4(w * 3.41214); }
export function btuHToW(btu: number): number { return r4(btu / 3.41214); }
export function kwToBtuH(kw: number): number { return r4(kw * 3412.14); }
export function btuHToKw(btu: number): number { return r4(btu / 3412.14); }

// ─── Flow rate ────────────────────────────────────────────────────────────────

export function m3hToLs(m3h: number): number  { return r4(m3h / 3.6); }
export function lsToM3h(ls: number): number   { return r4(ls * 3.6); }
export function m3hToCfm(m3h: number): number { return r4(m3h * 0.5886); }
export function cfmToM3h(cfm: number): number { return r4(cfm / 0.5886); }

// ─── Quick calculations ───────────────────────────────────────────────────────

/**
 * Cooling power from airflow.
 * Q (W) = ρ × q_vol × Cp × ΔT
 * For dry air at ~20 °C: ρ = 1.2 kg/m³, Cp = 1006 J/kg·K
 */
export function airCoolingPower(flowM3h: number, deltaTK: number): number {
  const RHO_AIR = 1.2;
  const CP_AIR = 1006;
  const flowM3s = flowM3h / 3600;
  return r2(RHO_AIR * flowM3s * CP_AIR * deltaTK);
}

/**
 * Delta T between two temperatures.
 */
export function deltaT(t1: number, t2: number): number {
  return r2(Math.abs(t1 - t2));
}

/**
 * Superheat = T_gas_outlet - T_saturation_evap
 */
export function computeSuperheat(tGasOutlet: number, tSatEvap: number): number {
  return r2(tGasOutlet - tSatEvap);
}

/**
 * Subcooling = T_saturation_cond - T_liquid_outlet
 */
export function computeSubcooling(tSatCond: number, tLiquidOutlet: number): number {
  return r2(tSatCond - tLiquidOutlet);
}

// ─── Private ──────────────────────────────────────────────────────────────────

function r4(v: number): number {
  if (!isFinite(v)) return v;
  const mag = Math.pow(10, 4 - Math.floor(Math.log10(Math.abs(v || 1))) - 1);
  return Math.round(v * mag) / mag;
}

function r2(v: number): number {
  return Math.round(v * 100) / 100;
}
