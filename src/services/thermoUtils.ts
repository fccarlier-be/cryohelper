/**
 * Thermodynamic interpolation utilities.
 *
 * Both directions use linear interpolation between adjacent saturation table
 * entries. Inputs outside the table range are clamped to the boundary values.
 *
 *   satPointFromTemp     — T (°C)   → full SaturationPoint
 *   satPointFromPressure — P (bar abs) → full SaturationPoint
 */

import type { RefrigerantData, SaturationPoint } from '../types/refrigerant';

function lerp(t: number, a: number, b: number): number {
  return a + t * (b - a);
}

/**
 * Interpolate full saturation properties from temperature (°C).
 * Returns pressure, liquid enthalpy and vapour enthalpy at the given T.
 */
export function satPointFromTemp(
  refrigerant: RefrigerantData,
  tempC: number,
): SaturationPoint {
  const table = refrigerant.saturationTable;

  if (tempC <= table[0].temperatureC) return { ...table[0] };
  if (tempC >= table[table.length - 1].temperatureC) return { ...table[table.length - 1] };

  for (let i = 0; i < table.length - 1; i++) {
    const lo = table[i];
    const hi = table[i + 1];
    if (lo.temperatureC <= tempC && tempC <= hi.temperatureC) {
      const t = (tempC - lo.temperatureC) / (hi.temperatureC - lo.temperatureC);
      return {
        temperatureC: tempC,
        pressureBar:    lerp(t, lo.pressureBar,    hi.pressureBar),
        enthalpyLiquid: lerp(t, lo.enthalpyLiquid, hi.enthalpyLiquid),
        enthalpyVapor:  lerp(t, lo.enthalpyVapor,  hi.enthalpyVapor),
      };
    }
  }

  return { ...table[table.length - 1] };
}

/**
 * Interpolate full saturation properties from absolute pressure (bar).
 * Returns temperature, liquid enthalpy and vapour enthalpy at the given P.
 */
export function satPointFromPressure(
  refrigerant: RefrigerantData,
  pressureBar: number,
): SaturationPoint {
  const table = refrigerant.saturationTable;

  if (pressureBar <= table[0].pressureBar) return { ...table[0] };
  if (pressureBar >= table[table.length - 1].pressureBar) return { ...table[table.length - 1] };

  for (let i = 0; i < table.length - 1; i++) {
    const lo = table[i];
    const hi = table[i + 1];
    if (lo.pressureBar <= pressureBar && pressureBar <= hi.pressureBar) {
      const t = (pressureBar - lo.pressureBar) / (hi.pressureBar - lo.pressureBar);
      return {
        temperatureC:   lerp(t, lo.temperatureC,   hi.temperatureC),
        pressureBar,
        enthalpyLiquid: lerp(t, lo.enthalpyLiquid, hi.enthalpyLiquid),
        enthalpyVapor:  lerp(t, lo.enthalpyVapor,  hi.enthalpyVapor),
      };
    }
  }

  return { ...table[table.length - 1] };
}
