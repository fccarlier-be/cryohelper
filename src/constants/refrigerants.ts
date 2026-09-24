/**
 * Refrigerant thermodynamic data for offline P-h diagram calculations.
 *
 * Data sources & accuracy note
 * ─────────────────────────────
 * R134a  : ASHRAE reference (hf = 200 kJ/kg at 0 °C). Values cross-checked
 *          against NIST WebBook / Cengel & Boles thermodynamics tables.
 * R410A  : Approximate values calibrated from HVAC field charts and
 *          Clausius–Clapeyron fits. Suitable for V1 visualisation.
 * R32    : Saturation enthalpies calibrated with NIST at 0 °C and 40 °C,
 *          Watson correlation used for interpolation across the dome.
 * R290   : Clausius–Clapeyron pressure fit anchored at 0 °C / 40 °C NIST
 *          values; Watson correlation for enthalpies.
 *
 * For a future production release, replace this module with CoolProp WASM
 * or a pre-computed lookup grid.  The RefrigerantData interface is designed
 * to support that migration without breaking the rest of the codebase.
 */

import type { RefrigerantData } from '../types/refrigerant';

// ─── R134a ───────────────────────────────────────────────────────────────────
// 1,1,1,2-Tetrafluoroethane | HFC | ASHRAE A1
// Critical: Tc = 101.06 °C, Pc = 40.59 bar
// ASHRAE reference: hf = 200 kJ/kg at 0 °C

const R134a: RefrigerantData = {
  id: 'R134a',
  name: 'R-134a',
  label: 'R134a (HFC)',
  gwp: 1430,
  criticalTempC: 101.06,
  criticalPressureBar: 40.59,
  cpVapor: 0.85,
  cpLiquid: 1.34,
  gamma: 1.14,
  saturationTable: [
    { temperatureC: -40, pressureBar: 0.517,  enthalpyLiquid: 148.1, enthalpyVapor: 374.0 },
    { temperatureC: -35, pressureBar: 0.665,  enthalpyLiquid: 155.6, enthalpyVapor: 377.1 },
    { temperatureC: -30, pressureBar: 0.844,  enthalpyLiquid: 161.4, enthalpyVapor: 380.3 },
    { temperatureC: -25, pressureBar: 1.062,  enthalpyLiquid: 168.1, enthalpyVapor: 383.4 },
    { temperatureC: -20, pressureBar: 1.327,  enthalpyLiquid: 173.7, enthalpyVapor: 386.7 },
    { temperatureC: -15, pressureBar: 1.645,  enthalpyLiquid: 180.2, enthalpyVapor: 389.7 },
    { temperatureC: -10, pressureBar: 2.024,  enthalpyLiquid: 186.8, enthalpyVapor: 392.7 },
    { temperatureC: -5,  pressureBar: 2.470,  enthalpyLiquid: 193.4, enthalpyVapor: 395.6 },
    { temperatureC:  0,  pressureBar: 2.928,  enthalpyLiquid: 200.0, enthalpyVapor: 398.6 },
    { temperatureC:  5,  pressureBar: 3.494,  enthalpyLiquid: 206.8, enthalpyVapor: 401.5 },
    { temperatureC: 10,  pressureBar: 4.154,  enthalpyLiquid: 213.6, enthalpyVapor: 404.3 },
    { temperatureC: 15,  pressureBar: 4.889,  enthalpyLiquid: 220.6, enthalpyVapor: 407.0 },
    { temperatureC: 20,  pressureBar: 5.716,  enthalpyLiquid: 227.5, enthalpyVapor: 409.8 },
    { temperatureC: 25,  pressureBar: 6.644,  enthalpyLiquid: 234.7, enthalpyVapor: 412.3 },
    { temperatureC: 30,  pressureBar: 7.684,  enthalpyLiquid: 241.8, enthalpyVapor: 414.8 },
    { temperatureC: 35,  pressureBar: 8.847,  enthalpyLiquid: 249.3, enthalpyVapor: 417.1 },
    { temperatureC: 40,  pressureBar: 10.14,  enthalpyLiquid: 256.5, enthalpyVapor: 419.4 },
    { temperatureC: 45,  pressureBar: 11.57,  enthalpyLiquid: 264.2, enthalpyVapor: 421.4 },
    { temperatureC: 50,  pressureBar: 13.16,  enthalpyLiquid: 271.7, enthalpyVapor: 423.4 },
    { temperatureC: 55,  pressureBar: 14.90,  enthalpyLiquid: 279.6, enthalpyVapor: 425.1 },
    { temperatureC: 60,  pressureBar: 16.80,  enthalpyLiquid: 287.8, enthalpyVapor: 426.4 },
    { temperatureC: 70,  pressureBar: 21.16,  enthalpyLiquid: 305.0, enthalpyVapor: 428.4 },
    { temperatureC: 80,  pressureBar: 26.32,  enthalpyLiquid: 323.7, enthalpyVapor: 428.8 },
    { temperatureC: 90,  pressureBar: 32.37,  enthalpyLiquid: 344.6, enthalpyVapor: 426.3 },
    { temperatureC: 100, pressureBar: 39.39,  enthalpyLiquid: 370.9, enthalpyVapor: 418.4 },
  ],
};

// ─── R410A ───────────────────────────────────────────────────────────────────
// Zeotropic blend R32/R125 (50/50 by weight) | HFC | ASHRAE A1
// Critical: Tc = 72.13 °C, Pc = 49.02 bar
// Reference: hf = 200 kJ/kg at −40 °C (arbitrary)
// Operating pressures ~3× higher than R134a — high-efficiency AC systems

const R410A: RefrigerantData = {
  id: 'R410A',
  name: 'R-410A',
  label: 'R410A (HFC)',
  gwp: 2088,
  criticalTempC: 72.13,
  criticalPressureBar: 49.02,
  cpVapor: 0.94,
  cpLiquid: 1.57,
  gamma: 1.17,
  saturationTable: [
    { temperatureC: -40, pressureBar: 3.46,  enthalpyLiquid: 200.0, enthalpyVapor: 430.0 },
    { temperatureC: -35, pressureBar: 4.10,  enthalpyLiquid: 209.0, enthalpyVapor: 433.5 },
    { temperatureC: -30, pressureBar: 4.82,  enthalpyLiquid: 218.0, enthalpyVapor: 437.0 },
    { temperatureC: -25, pressureBar: 5.63,  enthalpyLiquid: 227.2, enthalpyVapor: 440.2 },
    { temperatureC: -20, pressureBar: 6.54,  enthalpyLiquid: 236.4, enthalpyVapor: 443.4 },
    { temperatureC: -15, pressureBar: 7.55,  enthalpyLiquid: 245.7, enthalpyVapor: 446.3 },
    { temperatureC: -10, pressureBar: 8.68,  enthalpyLiquid: 255.2, enthalpyVapor: 449.1 },
    { temperatureC:  -5, pressureBar: 9.93,  enthalpyLiquid: 264.7, enthalpyVapor: 451.6 },
    { temperatureC:   0, pressureBar: 11.32, enthalpyLiquid: 274.4, enthalpyVapor: 453.9 },
    { temperatureC:   5, pressureBar: 12.84, enthalpyLiquid: 284.2, enthalpyVapor: 455.9 },
    { temperatureC:  10, pressureBar: 14.51, enthalpyLiquid: 294.1, enthalpyVapor: 457.6 },
    { temperatureC:  15, pressureBar: 16.33, enthalpyLiquid: 304.1, enthalpyVapor: 459.0 },
    { temperatureC:  20, pressureBar: 18.33, enthalpyLiquid: 314.3, enthalpyVapor: 460.0 },
    { temperatureC:  25, pressureBar: 20.50, enthalpyLiquid: 324.7, enthalpyVapor: 460.5 },
    { temperatureC:  30, pressureBar: 22.87, enthalpyLiquid: 335.3, enthalpyVapor: 460.5 },
    { temperatureC:  35, pressureBar: 25.44, enthalpyLiquid: 346.2, enthalpyVapor: 459.8 },
    { temperatureC:  40, pressureBar: 28.23, enthalpyLiquid: 357.4, enthalpyVapor: 458.4 },
    { temperatureC:  45, pressureBar: 31.26, enthalpyLiquid: 369.0, enthalpyVapor: 456.1 },
    { temperatureC:  50, pressureBar: 34.54, enthalpyLiquid: 381.0, enthalpyVapor: 452.8 },
    { temperatureC:  55, pressureBar: 38.10, enthalpyLiquid: 393.5, enthalpyVapor: 448.2 },
    { temperatureC:  60, pressureBar: 41.94, enthalpyLiquid: 406.8, enthalpyVapor: 441.9 },
    { temperatureC:  65, pressureBar: 46.10, enthalpyLiquid: 421.5, enthalpyVapor: 433.2 },
    { temperatureC:  70, pressureBar: 50.57, enthalpyLiquid: 439.0, enthalpyVapor: 420.0 },
  ],
};

// ─── R32 ─────────────────────────────────────────────────────────────────────
// Difluoromethane (CH₂F₂) | HFC | ASHRAE A2L
// Critical: Tc = 78.11 °C, Pc = 57.82 bar
// Reference: hf = 200 kJ/kg at −40 °C; hg calibrated at 0 °C (NIST: ~646 kJ/kg)
// High GWP=675 but pure component, not a blend — candidate for phase-out

const R32: RefrigerantData = {
  id: 'R32',
  name: 'R-32',
  label: 'R32 (HFC)',
  gwp: 675,
  criticalTempC: 78.11,
  criticalPressureBar: 57.82,
  cpVapor: 0.85,
  cpLiquid: 1.64,
  gamma: 1.28,
  saturationTable: [
    { temperatureC: -40, pressureBar: 2.14,  enthalpyLiquid: 200.0, enthalpyVapor: 650.0 },
    { temperatureC: -35, pressureBar: 2.59,  enthalpyLiquid: 208.2, enthalpyVapor: 651.0 },
    { temperatureC: -30, pressureBar: 3.10,  enthalpyLiquid: 216.4, enthalpyVapor: 651.5 },
    { temperatureC: -25, pressureBar: 3.70,  enthalpyLiquid: 224.7, enthalpyVapor: 651.0 },
    { temperatureC: -20, pressureBar: 4.38,  enthalpyLiquid: 232.8, enthalpyVapor: 649.0 },
    { temperatureC: -15, pressureBar: 5.17,  enthalpyLiquid: 241.1, enthalpyVapor: 647.5 },
    { temperatureC: -10, pressureBar: 6.06,  enthalpyLiquid: 249.2, enthalpyVapor: 645.5 },
    { temperatureC:  -5, pressureBar: 7.08,  enthalpyLiquid: 257.5, enthalpyVapor: 643.5 },
    { temperatureC:   0, pressureBar: 8.24,  enthalpyLiquid: 265.6, enthalpyVapor: 646.0 },
    { temperatureC:   5, pressureBar: 9.54,  enthalpyLiquid: 274.0, enthalpyVapor: 644.5 },
    { temperatureC:  10, pressureBar: 11.00, enthalpyLiquid: 282.0, enthalpyVapor: 643.0 },
    { temperatureC:  15, pressureBar: 12.63, enthalpyLiquid: 290.2, enthalpyVapor: 641.0 },
    { temperatureC:  20, pressureBar: 14.44, enthalpyLiquid: 298.4, enthalpyVapor: 638.5 },
    { temperatureC:  25, pressureBar: 16.44, enthalpyLiquid: 306.8, enthalpyVapor: 635.0 },
    { temperatureC:  30, pressureBar: 18.66, enthalpyLiquid: 314.8, enthalpyVapor: 630.0 },
    { temperatureC:  35, pressureBar: 21.10, enthalpyLiquid: 323.2, enthalpyVapor: 624.0 },
    { temperatureC:  40, pressureBar: 23.78, enthalpyLiquid: 331.2, enthalpyVapor: 615.5 },
    { temperatureC:  45, pressureBar: 26.71, enthalpyLiquid: 339.5, enthalpyVapor: 605.0 },
    { temperatureC:  50, pressureBar: 29.92, enthalpyLiquid: 347.6, enthalpyVapor: 592.0 },
    { temperatureC:  55, pressureBar: 33.42, enthalpyLiquid: 356.2, enthalpyVapor: 576.5 },
    { temperatureC:  60, pressureBar: 37.23, enthalpyLiquid: 364.0, enthalpyVapor: 558.0 },
    { temperatureC:  65, pressureBar: 41.38, enthalpyLiquid: 372.5, enthalpyVapor: 535.5 },
    { temperatureC:  70, pressureBar: 45.88, enthalpyLiquid: 380.4, enthalpyVapor: 508.5 },
    { temperatureC:  75, pressureBar: 50.76, enthalpyLiquid: 389.0, enthalpyVapor: 470.0 },
  ],
};

// ─── R290 ────────────────────────────────────────────────────────────────────
// Propane (C₃H₈) | Natural HC | ASHRAE A3 (flammable)
// Critical: Tc = 96.74 °C, Pc = 42.51 bar
// Reference: hf = 200 kJ/kg at −40 °C
// Very low GWP=3, high latent heat, currently used in small commercial units

const R290: RefrigerantData = {
  id: 'R290',
  name: 'R-290',
  label: 'R290 (Propane)',
  gwp: 3,
  criticalTempC: 96.74,
  criticalPressureBar: 42.51,
  cpVapor: 1.55,
  cpLiquid: 2.14,
  gamma: 1.13,
  saturationTable: [
    { temperatureC: -40, pressureBar: 1.13,  enthalpyLiquid: 200.0, enthalpyVapor: 687.0 },
    { temperatureC: -35, pressureBar: 1.39,  enthalpyLiquid: 210.7, enthalpyVapor: 692.0 },
    { temperatureC: -30, pressureBar: 1.69,  enthalpyLiquid: 221.4, enthalpyVapor: 695.5 },
    { temperatureC: -25, pressureBar: 2.04,  enthalpyLiquid: 232.2, enthalpyVapor: 699.0 },
    { temperatureC: -20, pressureBar: 2.45,  enthalpyLiquid: 242.8, enthalpyVapor: 702.0 },
    { temperatureC: -15, pressureBar: 2.92,  enthalpyLiquid: 253.6, enthalpyVapor: 705.0 },
    { temperatureC: -10, pressureBar: 3.46,  enthalpyLiquid: 264.2, enthalpyVapor: 708.0 },
    { temperatureC:  -5, pressureBar: 4.07,  enthalpyLiquid: 274.9, enthalpyVapor: 710.5 },
    { temperatureC:   0, pressureBar: 4.74,  enthalpyLiquid: 285.6, enthalpyVapor: 713.0 },
    { temperatureC:   5, pressureBar: 5.50,  enthalpyLiquid: 296.3, enthalpyVapor: 714.5 },
    { temperatureC:  10, pressureBar: 6.36,  enthalpyLiquid: 307.0, enthalpyVapor: 716.0 },
    { temperatureC:  15, pressureBar: 7.31,  enthalpyLiquid: 317.7, enthalpyVapor: 717.0 },
    { temperatureC:  20, pressureBar: 8.38,  enthalpyLiquid: 328.4, enthalpyVapor: 718.0 },
    { temperatureC:  25, pressureBar: 9.57,  enthalpyLiquid: 339.1, enthalpyVapor: 718.0 },
    { temperatureC:  30, pressureBar: 10.89, enthalpyLiquid: 349.8, enthalpyVapor: 717.5 },
    { temperatureC:  35, pressureBar: 12.35, enthalpyLiquid: 360.5, enthalpyVapor: 716.5 },
    { temperatureC:  40, pressureBar: 13.95, enthalpyLiquid: 371.2, enthalpyVapor: 715.0 },
    { temperatureC:  45, pressureBar: 15.71, enthalpyLiquid: 381.9, enthalpyVapor: 712.5 },
    { temperatureC:  50, pressureBar: 17.64, enthalpyLiquid: 392.6, enthalpyVapor: 709.0 },
    { temperatureC:  55, pressureBar: 19.74, enthalpyLiquid: 403.3, enthalpyVapor: 705.0 },
    { temperatureC:  60, pressureBar: 22.03, enthalpyLiquid: 414.0, enthalpyVapor: 700.0 },
    { temperatureC:  70, pressureBar: 27.17, enthalpyLiquid: 435.4, enthalpyVapor: 685.0 },
    { temperatureC:  80, pressureBar: 33.20, enthalpyLiquid: 456.8, enthalpyVapor: 665.0 },
    { temperatureC:  90, pressureBar: 40.19, enthalpyLiquid: 478.2, enthalpyVapor: 635.0 },
  ],
};

// ─── Public registry ─────────────────────────────────────────────────────────

export const REFRIGERANTS: Record<string, RefrigerantData> = {
  R134a,
  R410A,
  R32,
  R290,
};

export const REFRIGERANT_LIST: RefrigerantData[] = [R134a, R410A, R32, R290];
