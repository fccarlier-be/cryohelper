/**
 * Rule-based scoring functions for refrigeration diagnostics.
 *
 * Each function returns { score: 0–100, symptoms: string[] }.
 * score = sum of weighted clamp01 signals × 100.
 */

import {
  NOMINAL_SUPERHEAT,
  NOMINAL_SUBCOOLING,
  NOMINAL_COND_APPROACH,
  MIN_COMPRESSION_RATIO,
} from '../constants/diagnosticConstants';
import type { DiagnosticInput } from '../types/diagnostic';

const MAX_COMPRESSION_RATIO = 5.0;

// Pressure levels are judged through saturation temperatures so the rules work
// for every fluid. The thresholds are the R410A saturation temperatures of the
// original absolute-pressure thresholds (8, 16, 22, 25, 28, 35, 40 bar; 3 bar BP).
const COND_T = {
  lowFrom: 0,        // 8 bar
  lowTo: 24,         // 16 bar
  condenserFrom: 36, // 22 bar
  hpHighFrom: 41,    // 25 bar
  veryHighFrom: 46,  // 28 bar
  hpHighTo: 56,      // 35 bar
  veryHighTo: 62,    // 40 bar
};
const MIN_NORMAL_EVAP_C = -27; // 3 bar

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function rampUp(v: number, low: number, high: number): number {
  return clamp01((v - low) / (high - low));
}

function rampDown(v: number, low: number, high: number): number {
  return clamp01((high - v) / (high - low));
}

// ─────────────────────────────────────────────────────────────────────────────

export function scoreLowRefrigerant(
  input: DiagnosticInput,
): { score: number; symptoms: string[] } {
  const symptoms: string[] = [];
  let weighted = 0;

  const shSignal = rampUp(input.superheatK, NOMINAL_SUPERHEAT.max, 20);
  if (shSignal > 0.2)
    symptoms.push(`Surchauffe : ${input.superheatK.toFixed(1)} K  (normal : ${NOMINAL_SUPERHEAT.min}–${NOMINAL_SUPERHEAT.max} K)`);
  weighted += 0.45 * shSignal;

  const scSignal = rampDown(input.subcoolingK, 0, NOMINAL_SUBCOOLING.min);
  if (scSignal > 0.2)
    symptoms.push(`Sous-refroidissement : ${input.subcoolingK.toFixed(1)} K  (normal : ${NOMINAL_SUBCOOLING.min}–${NOMINAL_SUBCOOLING.max} K)`);
  weighted += 0.35 * scSignal;

  const ratio = input.hpBar / input.bpBar;
  const ratioSignal = rampUp(ratio, 5, 9);
  if (ratioSignal > 0.2)
    symptoms.push(`Taux de compression : ${ratio.toFixed(1)}  (normal : ${MIN_COMPRESSION_RATIO}–${MAX_COMPRESSION_RATIO})`);
  weighted += 0.20 * ratioSignal;

  return { score: Math.round(weighted * 100), symptoms };
}

// ─────────────────────────────────────────────────────────────────────────────

export function scoreRefrigerantOvercharge(
  input: DiagnosticInput,
): { score: number; symptoms: string[] } {
  const symptoms: string[] = [];
  let weighted = 0;

  const scSignal = rampUp(input.subcoolingK, NOMINAL_SUBCOOLING.max, 16);
  if (scSignal > 0.2)
    symptoms.push(`Sous-refroidissement : ${input.subcoolingK.toFixed(1)} K  (normal : ${NOMINAL_SUBCOOLING.min}–${NOMINAL_SUBCOOLING.max} K)`);
  weighted += 0.50 * scSignal;

  if (input.ambientTempC !== undefined) {
    const approach = input.condTempC - input.ambientTempC;
    const hpSignal = rampUp(approach, NOMINAL_COND_APPROACH.max, 30);
    if (hpSignal > 0.2)
      symptoms.push(`Écart T cond − T ambiante : ${approach.toFixed(1)} K  (normal : ${NOMINAL_COND_APPROACH.min}–${NOMINAL_COND_APPROACH.max} K)`);
    weighted += 0.35 * hpSignal;
  } else {
    const hpSignal = rampUp(input.condTempC, COND_T.hpHighFrom, COND_T.hpHighTo);
    if (hpSignal > 0.2)
      symptoms.push(`HP élevée : ${input.hpBar.toFixed(1)} bar (T condensation ${input.condTempC.toFixed(1)} °C)`);
    weighted += 0.35 * hpSignal;
  }

  const shSignal = rampDown(input.superheatK, NOMINAL_SUPERHEAT.min, NOMINAL_SUPERHEAT.max + 4);
  if (shSignal > 0.3)
    symptoms.push(`Surchauffe normale : ${input.superheatK.toFixed(1)} K  (normal : ${NOMINAL_SUPERHEAT.min}–${NOMINAL_SUPERHEAT.max} K)`);
  weighted += 0.15 * shSignal;

  return { score: Math.round(weighted * 100), symptoms };
}

// ─────────────────────────────────────────────────────────────────────────────

export function scorePoorEvaporator(
  input: DiagnosticInput,
): { score: number; symptoms: string[] } {
  const symptoms: string[] = [];
  let weighted = 0;

  const ratio = input.hpBar / input.bpBar;
  const bpLowSignal = rampUp(ratio, 4, 8);
  if (bpLowSignal > 0.2)
    symptoms.push(`Taux de compression : ${ratio.toFixed(1)}  (normal : ${MIN_COMPRESSION_RATIO}–${MAX_COMPRESSION_RATIO})`);
  weighted += 0.40 * bpLowSignal;

  const shSignal = rampUp(input.superheatK, NOMINAL_SUPERHEAT.max, 18);
  if (shSignal > 0.2)
    symptoms.push(`Surchauffe : ${input.superheatK.toFixed(1)} K  (normal : ${NOMINAL_SUPERHEAT.min}–${NOMINAL_SUPERHEAT.max} K)`);
  weighted += 0.40 * shSignal;

  const scNormal =
    input.subcoolingK >= NOMINAL_SUBCOOLING.min && input.subcoolingK <= NOMINAL_SUBCOOLING.max + 4;
  if (scNormal)
    symptoms.push(`Sous-refroidissement normal : ${input.subcoolingK.toFixed(1)} K`);
  weighted += 0.20 * (scNormal ? 0.8 : 0);

  return { score: Math.round(weighted * 100), symptoms };
}

// ─────────────────────────────────────────────────────────────────────────────

export function scorePoorCondenser(
  input: DiagnosticInput,
): { score: number; symptoms: string[] } {
  const symptoms: string[] = [];
  let weighted = 0;

  if (input.ambientTempC !== undefined) {
    const approach = input.condTempC - input.ambientTempC;
    const hpSignal = rampUp(approach, NOMINAL_COND_APPROACH.max, 28);
    if (hpSignal > 0.2)
      symptoms.push(`Écart T cond − T ambiante : ${approach.toFixed(1)} K  (normal : ${NOMINAL_COND_APPROACH.min}–${NOMINAL_COND_APPROACH.max} K)`);
    weighted += 0.45 * hpSignal;
  } else {
    const hpSignal = rampUp(input.condTempC, COND_T.condenserFrom, COND_T.hpHighTo);
    if (hpSignal > 0.2)
      symptoms.push(`HP élevée : ${input.hpBar.toFixed(1)} bar (T condensation ${input.condTempC.toFixed(1)} °C)`);
    weighted += 0.45 * hpSignal;
  }

  const scSignal = rampDown(input.subcoolingK, 0, NOMINAL_SUBCOOLING.min + 2);
  if (scSignal > 0.2)
    symptoms.push(`Sous-refroidissement : ${input.subcoolingK.toFixed(1)} K  (normal : ${NOMINAL_SUBCOOLING.min}–${NOMINAL_SUBCOOLING.max} K)`);
  weighted += 0.35 * scSignal;

  const bpOk = input.evapTempC >= MIN_NORMAL_EVAP_C && input.hpBar / input.bpBar < 6;
  if (bpOk) symptoms.push(`BP dans les limites normales`);
  weighted += 0.20 * (bpOk ? 0.8 : 0);

  return { score: Math.round(weighted * 100), symptoms };
}

// ─────────────────────────────────────────────────────────────────────────────

export function scoreTxvUnderfeeding(
  input: DiagnosticInput,
): { score: number; symptoms: string[] } {
  const symptoms: string[] = [];
  let weighted = 0;

  const shSignal = rampUp(input.superheatK, 15, 25);
  if (shSignal > 0.2)
    symptoms.push(`Surchauffe : ${input.superheatK.toFixed(1)} K  (normal : ${NOMINAL_SUPERHEAT.min}–${NOMINAL_SUPERHEAT.max} K)`);
  weighted += 0.50 * shSignal;

  const ratio = input.hpBar / input.bpBar;
  const bpLowSignal = rampUp(ratio, 5, 10);
  if (bpLowSignal > 0.2)
    symptoms.push(`Taux de compression : ${ratio.toFixed(1)}  (normal : ${MIN_COMPRESSION_RATIO}–${MAX_COMPRESSION_RATIO})`);
  weighted += 0.35 * bpLowSignal;

  const scOk = input.subcoolingK >= NOMINAL_SUBCOOLING.min;
  if (scOk)
    symptoms.push(`Sous-refroidissement correct : ${input.subcoolingK.toFixed(1)} K`);
  weighted += 0.15 * (scOk ? 1.0 : 0);

  return { score: Math.round(weighted * 100), symptoms };
}

// ─────────────────────────────────────────────────────────────────────────────

export function scoreTxvOverfeeding(
  input: DiagnosticInput,
): { score: number; symptoms: string[] } {
  const symptoms: string[] = [];
  let weighted = 0;

  const shSignal = rampDown(input.superheatK, 0, NOMINAL_SUPERHEAT.min);
  if (shSignal > 0.2)
    symptoms.push(`Surchauffe : ${input.superheatK.toFixed(1)} K  (normal : ${NOMINAL_SUPERHEAT.min}–${NOMINAL_SUPERHEAT.max} K)`);
  weighted += 0.55 * shSignal;

  const ratio = input.hpBar / input.bpBar;
  const bpHighSignal = rampDown(ratio, MIN_COMPRESSION_RATIO, 4.5);
  if (bpHighSignal > 0.2)
    symptoms.push(`Taux de compression : ${ratio.toFixed(1)}  (normal : ${MIN_COMPRESSION_RATIO}–${MAX_COMPRESSION_RATIO})`);
  weighted += 0.30 * bpHighSignal;

  const hpNormal = input.condTempC < COND_T.veryHighFrom;
  if (hpNormal) symptoms.push(`HP dans les limites normales`);
  weighted += 0.15 * (hpNormal ? 0.8 : 0);

  return { score: Math.round(weighted * 100), symptoms };
}

// ─────────────────────────────────────────────────────────────────────────────

export function scoreCompressorFault(
  input: DiagnosticInput,
): { score: number; symptoms: string[] } {
  const symptoms: string[] = [];
  let weighted = 0;

  const compressionRatio = input.hpBar / input.bpBar;

  const ratioSignal = rampDown(compressionRatio, MIN_COMPRESSION_RATIO, 4.0);
  if (ratioSignal > 0.2)
    symptoms.push(`Taux de compression : ${compressionRatio.toFixed(1)}  (normal : ${MIN_COMPRESSION_RATIO}–${MAX_COMPRESSION_RATIO})`);
  weighted += 0.50 * ratioSignal;

  if (input.dischargeTempC !== undefined) {
    const expectedDischarge = input.evapTempC + input.superheatK + 40;
    const tempSignal = rampDown(input.dischargeTempC, expectedDischarge - 30, expectedDischarge);
    if (tempSignal > 0.2)
      symptoms.push(`T décharge : ${input.dischargeTempC.toFixed(1)} °C  (attendu ≥ ${Math.round(expectedDischarge)} °C)`);
    weighted += 0.30 * tempSignal;
  }

  const condApproachSignal = rampDown(input.condTempC, COND_T.lowFrom, COND_T.lowTo);
  if (condApproachSignal > 0.2)
    symptoms.push(`HP insuffisante pour la T de condensation visée`);
  weighted += 0.20 * condApproachSignal;

  return { score: Math.round(weighted * 100), symptoms };
}

// ─────────────────────────────────────────────────────────────────────────────

export function scoreNonCondensable(
  input: DiagnosticInput,
): { score: number; symptoms: string[] } {
  const symptoms: string[] = [];
  let weighted = 0;

  if (input.ambientTempC !== undefined) {
    const approach = input.condTempC - input.ambientTempC;
    const hpHighSignal = rampUp(approach, 22, 35);
    if (hpHighSignal > 0.2)
      symptoms.push(`Écart T cond − T ambiante : ${approach.toFixed(1)} K  (normal : ${NOMINAL_COND_APPROACH.min}–${NOMINAL_COND_APPROACH.max} K)`);
    weighted += 0.50 * hpHighSignal;
  } else {
    const hpHighSignal = rampUp(input.condTempC, COND_T.veryHighFrom, COND_T.veryHighTo);
    if (hpHighSignal > 0.2)
      symptoms.push(`HP très élevée : ${input.hpBar.toFixed(1)} bar (T condensation ${input.condTempC.toFixed(1)} °C)`);
    weighted += 0.50 * hpHighSignal;
  }

  const scSignal = rampDown(input.subcoolingK, 0, NOMINAL_SUBCOOLING.min + 1);
  if (scSignal > 0.2)
    symptoms.push(`Sous-refroidissement : ${input.subcoolingK.toFixed(1)} K  (normal : ${NOMINAL_SUBCOOLING.min}–${NOMINAL_SUBCOOLING.max} K)`);
  weighted += 0.35 * scSignal;

  const bpOk = input.evapTempC >= MIN_NORMAL_EVAP_C && input.hpBar / input.bpBar > 4;
  if (bpOk) symptoms.push(`BP dans les limites normales`);
  weighted += 0.15 * (bpOk ? 1.0 : 0);

  return { score: Math.round(weighted * 100), symptoms };
}
