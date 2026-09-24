import { runDiagnostic } from '../services/diagnosticEngine';
import type { DiagnosticInput } from '../types/diagnostic';

// Healthy R134a positive cold room (−10 °C / 40 °C), pressures in bar absolute
const NORMAL: DiagnosticInput = {
  bpBar: 2.01, hpBar: 10.17, superheatK: 6, subcoolingK: 6, evapTempC: -10, condTempC: 40,
};

function topFault(input: DiagnosticInput) {
  const out = runDiagnostic(input);
  if (!out.valid) throw new Error(out.errors.join(', '));
  return out.results[0]?.faultId;
}

describe('runDiagnostic', () => {
  test('rejects inconsistent inputs', () => {
    const out = runDiagnostic({ ...NORMAL, hpBar: 2 });
    expect(out.valid).toBe(false);
    if (!out.valid) expect(out.errors).toContain('La HP doit être supérieure à la BP.');
  });

  test('a healthy low-pressure installation is not flagged as a compressor fault', () => {
    // Regression: HP thresholds used to be absolute (R410A) pressures, so any
    // R134a system (HP ≈ 10 bar) looked like a weak compressor.
    const out = runDiagnostic({ ...NORMAL, bpBar: 2.93, evapTempC: 0 });
    expect(out.valid).toBe(true);
    if (out.valid) expect(out.results.map((r) => r.faultId)).not.toContain('COMPRESSOR_FAULT');
  });

  test('a healthy installation raises no fault', () => {
    const out = runDiagnostic(NORMAL);
    expect(out.valid).toBe(true);
    if (out.valid) expect(out.results).toHaveLength(0);
  });

  test('high superheat + no subcooling + high ratio → lack of refrigerant', () => {
    expect(topFault({ ...NORMAL, bpBar: 1.07, superheatK: 20, subcoolingK: 0, evapTempC: -25 })).toBe('LOW_REFRIGERANT');
  });

  test('high subcooling + high HP → overcharge', () => {
    expect(topFault({ ...NORMAL, hpBar: 16.8, condTempC: 60, subcoolingK: 16, superheatK: 5 })).toBe('REFRIGERANT_OVERCHARGE');
  });

  test('zero superheat + high BP → TXV overfeeding', () => {
    expect(topFault({ ...NORMAL, bpBar: 3.5, evapTempC: 5, superheatK: 0 })).toBe('TXV_OVERFEEDING');
  });

  test('returns at most 3 results, sorted by score', () => {
    const out = runDiagnostic({ ...NORMAL, bpBar: 1, hpBar: 12, superheatK: 25, subcoolingK: 0 });
    expect(out.valid).toBe(true);
    if (out.valid) {
      expect(out.results.length).toBeLessThanOrEqual(3);
      const scores = out.results.map((r) => r.score);
      expect(scores).toEqual([...scores].sort((a, b) => b - a));
    }
  });
});
