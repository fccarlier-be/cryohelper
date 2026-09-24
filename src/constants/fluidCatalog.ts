export interface FluidEntry {
  id: string;
  name: string;
  gwp100: number;
  criticalTempC: number;
  criticalPressureBar: number;
  ashraeClass: string;
}

export const FLUID_CATALOG: FluidEntry[] = [
  { id: 'R134a',   name: 'R134a',             gwp100: 1430, criticalTempC: 101.06, criticalPressureBar: 40.593,  ashraeClass: 'A1'  },
  { id: 'R32',     name: 'R32',               gwp100: 675,  criticalTempC: 78.11,  criticalPressureBar: 57.826,  ashraeClass: 'A2L' },
  { id: 'R22',     name: 'R22 (HCFC)',        gwp100: 1810, criticalTempC: 96.15,  criticalPressureBar: 49.9,    ashraeClass: 'A1'  },
  { id: 'R410A',   name: 'R410A',             gwp100: 2088, criticalTempC: 71.34,  criticalPressureBar: 49.012,  ashraeClass: 'A1'  },
  { id: 'R407C',   name: 'R407C',             gwp100: 1774, criticalTempC: 86.2,   criticalPressureBar: 46.317,  ashraeClass: 'A1'  },
  { id: 'R404A',   name: 'R404A',             gwp100: 3922, criticalTempC: 72.12,  criticalPressureBar: 37.348,  ashraeClass: 'A1'  },
  { id: 'R507A',   name: 'R507A',             gwp100: 3985, criticalTempC: 70.62,  criticalPressureBar: 37.049,  ashraeClass: 'A1'  },
  { id: 'R1234yf', name: 'R1234yf (HFO)',     gwp100: 4,    criticalTempC: 94.7,   criticalPressureBar: 33.822,  ashraeClass: 'A2L' },
  { id: 'R1234ze', name: 'R1234ze(E) (HFO)',  gwp100: 7,    criticalTempC: 109.36, criticalPressureBar: 36.349,  ashraeClass: 'A2L' },
  { id: 'R744',    name: 'R744 (CO₂)',        gwp100: 1,    criticalTempC: 30.98,  criticalPressureBar: 73.773,  ashraeClass: 'A1'  },
  { id: 'R290',    name: 'R290 (Propane)',     gwp100: 3,    criticalTempC: 96.74,  criticalPressureBar: 42.512,  ashraeClass: 'A3'  },
  { id: 'R600',    name: 'R600 (Butane)',      gwp100: 20,   criticalTempC: 151.98, criticalPressureBar: 37.96,   ashraeClass: 'A3'  },
  { id: 'R600a',   name: 'R600a (Isobutane)', gwp100: 20,   criticalTempC: 134.66, criticalPressureBar: 36.29,   ashraeClass: 'A3'  },
  { id: 'R717',    name: 'R717 (NH₃)',        gwp100: 0,    criticalTempC: 132.41, criticalPressureBar: 113.634, ashraeClass: 'B2L' },
  { id: 'R448A',   name: 'R448A (Solstice N40)', gwp100: 1274, criticalTempC: 82.78,  criticalPressureBar: 46.037,   ashraeClass: 'A1'  },
  { id: 'R449A',   name: 'R449A (HFO)',       gwp100: 2376, criticalTempC: 82.43,   criticalPressureBar: 45.176,   ashraeClass: 'A1'  },
  { id: 'R452A',   name: 'R452A (HFO)',       gwp100: 2140, criticalTempC: 74.91,   criticalPressureBar: 39.796,    ashraeClass: 'A1'  },
  { id: 'R452B',   name: 'R452B (HFO)',       gwp100: 698,  criticalTempC: 77.13,   criticalPressureBar: 52.458,   ashraeClass: 'A2L' },
  { id: 'R454A',   name: 'R454A (HFO)',       gwp100: 238,  criticalTempC: 83.56,   criticalPressureBar: 47.269,    ashraeClass: 'A2L' },
  { id: 'R454B',   name: 'R454B (HFO)',       gwp100: 466,  criticalTempC: 78.27,   criticalPressureBar: 53.045,   ashraeClass: 'A2L' },
  { id: 'R454C',   name: 'R454C (HFO)',       gwp100: 148,  criticalTempC: 87.5,   criticalPressureBar: 43.744,   ashraeClass: 'A2L' },
  { id: 'R455A',   name: 'R455A (Solstice L40X)', gwp100: 145, criticalTempC: 85.38,  criticalPressureBar: 46.103,   ashraeClass: 'A2L' },
  { id: 'R718',    name: 'R718 (Eau / Water)', gwp100: 0,   criticalTempC: 373.95, criticalPressureBar: 220.64, ashraeClass: 'A1'  },
];

export function findFluidEntry(id: string): FluidEntry | undefined {
  return FLUID_CATALOG.find((f) => f.id === id);
}
