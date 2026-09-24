/**
 * Adapts a FluidTable (high-res CoolProp table) to the legacy RefrigerantData interface
 * so that reportGenerator.ts can remain unchanged.
 */

import type { RefrigerantData, SaturationPoint } from '../types/refrigerant';
import type { FluidTable } from '../types/fluidTable';
import { satFromTemp } from './fluidInterpolator';

export function toRefrigerantData(table: FluidTable): RefrigerantData {
  const { sat } = table;
  const rows = sat.rows;
  const tMinRaw = sat.isZeotropic ? rows[0][1] : sat.tMinC!;
  const tMax = sat.isZeotropic
    ? rows[rows.length - 1][1]
    : tMinRaw + (rows.length - 1) * sat.tStepC!;

  const satPoints: SaturationPoint[] = [];
  const STEP = 5;
  const tStart = Math.ceil(tMinRaw / STEP) * STEP;
  for (let t = tStart; t <= tMax - STEP; t += STEP) {
    const pt = satFromTemp(table, t);
    satPoints.push({
      temperatureC:   t,
      pressureBar:    pt.pressureBar,
      enthalpyLiquid: pt.hLiq_kJkg,
      enthalpyVapor:  pt.hVap_kJkg,
    });
  }

  return {
    id:                  table.id as RefrigerantData['id'],
    name:                table.name,
    label:               table.name,
    gwp:                 table.gwp100,
    criticalTempC:       table.criticalTempC,
    criticalPressureBar: table.criticalPressureBar,
    saturationTable:     satPoints,
    cpVapor:  0.85,
    cpLiquid: 1.30,
    gamma:    1.14,
  };
}
