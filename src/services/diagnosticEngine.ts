import { FAULT_DEFINITIONS } from '../constants/diagnosticConstants';
import {
  scoreLowRefrigerant,
  scoreRefrigerantOvercharge,
  scorePoorEvaporator,
  scorePoorCondenser,
  scoreTxvUnderfeeding,
  scoreTxvOverfeeding,
  scoreCompressorFault,
  scoreNonCondensable,
} from './diagnosticRules';
import type { DiagnosticInput, DiagnosticOutput, DiagnosticResult, FaultId } from '../types/diagnostic';

const ALL_RULES: Array<{ id: FaultId; fn: (i: DiagnosticInput) => { score: number; symptoms: string[] } }> = [
  { id: 'LOW_REFRIGERANT',       fn: scoreLowRefrigerant },
  { id: 'REFRIGERANT_OVERCHARGE', fn: scoreRefrigerantOvercharge },
  { id: 'POOR_EVAPORATOR',       fn: scorePoorEvaporator },
  { id: 'POOR_CONDENSER',        fn: scorePoorCondenser },
  { id: 'TXV_UNDERFEEDING',      fn: scoreTxvUnderfeeding },
  { id: 'TXV_OVERFEEDING',       fn: scoreTxvOverfeeding },
  { id: 'COMPRESSOR_FAULT',      fn: scoreCompressorFault },
  { id: 'NON_CONDENSABLE',       fn: scoreNonCondensable },
];

const MIN_SCORE = 30;

function validateInput(input: DiagnosticInput): string[] {
  const errors: string[] = [];
  if (input.bpBar <= 0) errors.push('La pression BP doit être positive.');
  if (input.hpBar <= 0) errors.push('La pression HP doit être positive.');
  if (input.hpBar <= input.bpBar) errors.push('La HP doit être supérieure à la BP.');
  if (input.superheatK < 0) errors.push('La surchauffe ne peut pas être négative.');
  if (input.subcoolingK < 0) errors.push('Le sous-refroidissement ne peut pas être négatif.');
  return errors;
}

export function runDiagnostic(input: DiagnosticInput): DiagnosticOutput {
  const errors = validateInput(input);
  if (errors.length > 0) return { valid: false, errors };

  const results: DiagnosticResult[] = ALL_RULES.map(({ id, fn }) => {
    const { score, symptoms } = fn(input);
    const def = FAULT_DEFINITIONS[id];
    return {
      faultId: id,
      label: def.label,
      description: def.description,
      score,
      symptoms,
      recommendation: def.recommendation,
    };
  })
    .filter((r) => r.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return { valid: true, results };
}
