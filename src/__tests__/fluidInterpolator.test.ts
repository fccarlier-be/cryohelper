import { satFromTemp, satFromPressure, satFromTempDew, shPoint } from '../services/fluidInterpolator';
import { FLUID_CATALOG } from '../constants/fluidCatalog';
import { readTable } from './tableFixtures';

describe('fluid tables', () => {
  test.each(FLUID_CATALOG.map((f) => f.id))('%s loads and is consistent with the catalog', (id) => {
    const table = readTable(id);
    const entry = FLUID_CATALOG.find((f) => f.id === id)!;
    expect(table.id).toBe(id);
    expect(table.criticalTempC).toBeCloseTo(entry.criticalTempC, 0);
    expect(table.sat.rows.length).toBeGreaterThan(100);
    expect(table.sh.length).toBeGreaterThan(10);
  });
});

describe('saturation (pure fluids)', () => {
  // Reference values: CoolProp / NIST REFPROP, IIR reference state (h = 200 kJ/kg at 0 °C liquid)
  test.each([
    ['R134a', 0, 2.928],
    ['R134a', 40, 10.166],
    ['R32', 0, 8.131],
    ['R744', 0, 34.851],
    ['R717', 0, 4.293],
    ['R290', 0, 4.745],
  ])('%s at %d °C → %f bar abs', (id, t, p) => {
    expect(satFromTemp(readTable(id), t).pressureBar).toBeCloseTo(p, 1);
  });

  test('R134a enthalpies at 0 °C follow the IIR reference', () => {
    const pt = satFromTemp(readTable('R134a'), 0);
    expect(pt.hLiq_kJkg).toBeCloseTo(200, 1);
    expect(pt.hVap_kJkg).toBeCloseTo(398.6, 0);
  });

  test.each(['R134a', 'R32', 'R410A', 'R717', 'R744'])('%s: T → P → T round trip', (id) => {
    const table = readTable(id);
    for (const t of [-30, -10, 0, 10, 25]) {
      const p = satFromTemp(table, t).pressureBar;
      expect(satFromPressure(table, p).tempC).toBeCloseTo(t, 1);
    }
  });
});

describe('saturation (zeotropic blends)', () => {
  test.each([
    ['R454B', 0.8, 2],
    ['R449A', 4, 7],
    ['R448A', 4, 7],
  ])('%s has a glide between %d and %d K at 0 °C bubble', (id, min, max) => {
    const pt = satFromTemp(readTable(id), 0);
    const glide = (pt.tempDewC ?? pt.tempC) - pt.tempC;
    expect(glide).toBeGreaterThan(min);
    expect(glide).toBeLessThan(max);
  });

  test('dew-temperature lookup is consistent with bubble lookup', () => {
    const table = readTable('R449A');
    const fromBubble = satFromTemp(table, -10);
    const fromDew = satFromTempDew(table, fromBubble.tempDewC!);
    expect(fromDew.pressureBar).toBeCloseTo(fromBubble.pressureBar, 2);
  });
});

describe('superheated vapour', () => {
  test('enthalpy increases with temperature on an isobar', () => {
    const table = readTable('R134a');
    const p = satFromTemp(table, 0).pressureBar;
    const h5 = shPoint(table, p, 5).h_kJkg;
    const h20 = shPoint(table, p, 20).h_kJkg;
    expect(h5).toBeGreaterThan(satFromTemp(table, 0).hVap_kJkg);
    expect(h20).toBeGreaterThan(h5);
  });

  test('throws outside the table range', () => {
    expect(() => shPoint(readTable('R134a'), 1000, 50)).toThrow();
  });
});
