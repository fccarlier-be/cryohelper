import {
  calculateQuickThermal,
  calculateDetailedThermal,
  calculateCOSTIC,
} from '../services/thermalCalculator';
import { COSTIC_DEFAULTS, THERMAL_DEFAULTS } from '../constants/thermalConstants';

describe('calculateQuickThermal', () => {
  test('matches the envelope model by hand', () => {
    // A = 16 m², H = 3 m → walls 4·4·3 = 48 m², ceiling 16 m², floor 16 m²
    // U = 0.45 : (48 + 16)·0.45·20 + 16·0.45·0.5·20 = 576 + 72 = 648 W
    // + 15 % infiltrations = 745.2 W
    const r = calculateQuickThermal({ surfaceM2: 16, heightM: 3, deltaT: 20, insulationLevel: 'medium' });
    expect(r.breakdown.envelopeW).toBe(648);
    expect(r.breakdown.infiltrationW).toBe(97);
    expect(r.powerW).toBe(745);
    expect(r.safetyMarginPct).toBe(15);
    expect(r.minRecommendedKW).toBeCloseTo(0.9, 6); // 745.2 × 1.15
    expect(r.maxRecommendedKW).toBeCloseTo(0.9, 6); // 745.2 × 1.25 = 0.93
  });

  test('better insulation means less power', () => {
    const base = { surfaceM2: 20, heightM: 3, deltaT: 30 };
    const low = calculateQuickThermal({ ...base, insulationLevel: 'low' });
    const good = calculateQuickThermal({ ...base, insulationLevel: 'good' });
    expect(good.powerW).toBeLessThan(low.powerW);
  });
});

describe('calculateDetailedThermal', () => {
  test('no cooling demand when exterior is colder than interior', () => {
    const r = calculateDetailedThermal({ ...THERMAL_DEFAULTS.detailed, tempInteriorC: 20, tempExteriorC: 10 });
    expect(r.powerW).toBe(0);
  });

  test('adds internal loads and room-specific margin', () => {
    const r = calculateDetailedThermal({ ...THERMAL_DEFAULTS.detailed, roomType: 'freezer', internalLoads: 'high' });
    expect(r.breakdown.internalLoadsW).toBe(35 * THERMAL_DEFAULTS.detailed.surfaceM2);
    expect(r.safetyMarginPct).toBe(20);
    expect(r.powerW).toBe(r.breakdown.envelopeW + r.breakdown.infiltrationW + r.breakdown.internalLoadsW);
  });
});

describe('calculateCOSTIC', () => {
  test('sums each element with the factor of the chosen T_ext column', () => {
    const r = calculateCOSTIC({
      ...COSTIC_DEFAULTS,
      tExtC: 32,
      fenetresSE_m2: 2, // 2 × 132
      occupants: 3,     // 3 × 80
      appareilsW: 500,  // 500 × 1
    });
    expect(r.totalW).toBe(264 + 240 + 500);
    expect(r.elements.map((e) => e.label)).toEqual(['Fenêtres S/SE', 'Occupants', 'Appareils électriques']);
    expect(r.safetyMarginPct).toBe(10);
  });

  test('rejects an unsupported exterior temperature', () => {
    expect(() => calculateCOSTIC({ ...COSTIC_DEFAULTS, tExtC: 30 as never })).toThrow();
  });
});
