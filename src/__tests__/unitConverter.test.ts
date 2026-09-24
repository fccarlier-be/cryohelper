import * as UC from '../services/unitConverter';

describe('unitConverter', () => {
  test('pressure conversions', () => {
    expect(UC.barToPsi(1)).toBeCloseTo(14.5038, 3);
    expect(UC.psiToBar(14.5038)).toBeCloseTo(1, 3);
    expect(UC.barToKpa(2.5)).toBeCloseTo(250, 6);
    expect(UC.absToGauge(UC.gaugeToAbs(3.2))).toBeCloseTo(3.2, 6);
  });

  test('temperature conversions', () => {
    expect(UC.celsiusToKelvin(0)).toBeCloseTo(273.15, 6);
    expect(UC.celsiusToFahrenheit(100)).toBeCloseTo(212, 6);
    expect(UC.fahrenheitToCelsius(32)).toBeCloseTo(0, 6);
  });

  test('power conversions', () => {
    expect(UC.wToKw(1500)).toBeCloseTo(1.5, 6);
    expect(UC.kwToBtuH(1)).toBeCloseTo(3412.14, 1);
  });

  test('air cooling power: 1000 m³/h, ΔT 10 K ≈ 3.35 kW', () => {
    // ρ = 1.2 kg/m³, Cp = 1006 J/kg·K → 1000/3600 × 1.2 × 1006 × 10
    expect(UC.airCoolingPower(1000, 10)).toBeCloseTo(3353.33, 1);
  });

  test('superheat and subcooling', () => {
    expect(UC.computeSuperheat(5, -3)).toBe(8);
    expect(UC.computeSubcooling(40, 35)).toBe(5);
    expect(UC.deltaT(12, 4)).toBe(8);
  });
});
