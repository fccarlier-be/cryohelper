import { calculateCycle, defaultCycleParams } from '../services/enthalpyCalculator';

jest.mock('../services/fluidTableLoader', () => ({
  loadFluidTable: async (id: string) => require('./tableFixtures').readTable(id),
}));

describe('calculateCycle', () => {
  test('R134a −10/40 °C, SH 5 K, SC 5 K: consistent 4-point cycle', async () => {
    const r = await calculateCycle({
      refrigerantId: 'R134a',
      evapTempC: -10,
      condTempC: 40,
      superheatK: 5,
      subcoolingK: 5,
      isentropicEfficiency: 1,
    });
    const [p1, p2, p3, p4] = r.points;

    // Pressures: evaporator side 2.006 bar, condenser side 10.17 bar
    expect(p1.pressureBar).toBeCloseTo(2.01, 1);
    expect(p2.pressureBar).toBeCloseTo(10.17, 1);
    expect(p4.pressureBar).toBe(p1.pressureBar);
    expect(p3.pressureBar).toBe(p2.pressureBar);

    // Isenthalpic expansion, suction temperature = T_evap + SH
    expect(p4.enthalpyKJkg).toBe(p3.enthalpyKJkg);
    expect(p1.temperatureC).toBeCloseTo(-5, 6);
    expect(p3.temperatureC).toBeCloseTo(35, 6);

    // Ideal-cycle COP for these conditions is ≈ 4.4
    expect(r.cop).toBeGreaterThan(4.1);
    expect(r.cop).toBeLessThan(4.7);
    expect(r.compressionRatio).toBeCloseTo(p2.pressureBar / p1.pressureBar, 1);
    expect(r.refrigeratingEffect).toBeCloseTo(p1.enthalpyKJkg - p4.enthalpyKJkg, 0);
    expect(r.condenserHeat).toBeCloseTo(r.refrigeratingEffect + r.compressionWork, 0);
    // Discharge is hotter than condensing temperature
    expect(p2.temperatureC).toBeGreaterThan(40);
  });

  test('a lower isentropic efficiency lowers the COP and raises discharge temperature', async () => {
    const base = defaultCycleParams('R32');
    const ideal = await calculateCycle({ ...base, isentropicEfficiency: 1 });
    const real = await calculateCycle({ ...base, isentropicEfficiency: 0.7 });
    expect(real.cop).toBeLessThan(ideal.cop);
    expect(real.points[1].temperatureC).toBeGreaterThan(ideal.points[1].temperatureC);
  });

  test('a measured discharge temperature overrides the compression model', async () => {
    const r = await calculateCycle({ ...defaultCycleParams('R410A'), dischargeGasTemp_C: 85 });
    expect(r.points[1].temperatureC).toBe(85);
  });

  test('zeotropic blend: superheat is counted from the dew temperature', async () => {
    const r = await calculateCycle({ ...defaultCycleParams('R449A'), superheatK: 5 });
    // Dew temperature is several K above the −10 °C bubble temperature
    expect(r.points[0].temperatureC).toBeGreaterThan(-10 + 5 + 2);
    expect(r.cop).toBeGreaterThan(2);
  });

  test.each(['R134a', 'R32', 'R290', 'R404A', 'R717', 'R744', 'R454C', 'R600a'])(
    '%s default preset gives a plausible cycle',
    async (id) => {
      const r = await calculateCycle(defaultCycleParams(id));
      expect(r.cop).toBeGreaterThan(1);
      expect(r.cop).toBeLessThan(10);
      expect(r.compressionRatio).toBeGreaterThan(1);
    },
  );
});
