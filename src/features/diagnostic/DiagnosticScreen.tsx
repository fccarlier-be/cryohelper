import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../context/ThemeContext';
import RefrigerantPicker from '../../components/RefrigerantPicker';
import NumericInput from '../../components/NumericInput';
import Card from '../../components/Card';
import DiagramCanvas from '../enthalpy/DiagramCanvas';
import DiagramFullscreenModal from '../enthalpy/DiagramFullscreenModal';
import DiagnosticResults from './DiagnosticResults';
import { runDiagnostic } from '../../services/diagnosticEngine';
import { calculateCycle } from '../../services/enthalpyCalculator';
import { loadFluidTable } from '../../services/fluidTableLoader';
import { satFromPressure } from '../../services/fluidInterpolator';
import { toRefrigerantData } from '../../services/fluidAdapter';
import type { FluidTable } from '../../types/fluidTable';
import NumericKeypad from '../../components/NumericKeypad';
import { useKeypadContext, KEYPAD_HEIGHT } from '../../context/KeypadContext';
import { useReportContext } from '../../context/ReportContext';
import type { DiagnosticInput, DiagnosticResult } from '../../types/diagnostic';
import type { CycleResult, CycleParameters } from '../../types/enthalpy';
import type { RefrigerantId } from '../../types/refrigerant';

// ─── Constants ────────────────────────────────────────────────────────────────

const ATMO_BAR = 1.013;
const STEP_COUNT = 5;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toAbs(gaugeBar: number): number { return gaugeBar + ATMO_BAR; }

function parseNum(s: string): number | undefined {
  if (s === '' || s === '-' || s.endsWith('.') || s.endsWith(',')) return undefined;
  const n = parseFloat(s.replace(',', '.'));
  return isNaN(n) ? undefined : n;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface WizardValues {
  refrigerantId: RefrigerantId;
  bpStr: string;       // bar relatif (manifold)
  hpStr: string;       // bar relatif (manifold)
  tCondStr: string;    // °C sortie condenseur (mesure sonde)
  tEvapStr: string;    // °C sortie évaporateur (mesure sonde)
}

const EMPTY_WIZARD: WizardValues = {
  refrigerantId: 'R134a',
  bpStr: '',
  hpStr: '',
  tCondStr: '',
  tEvapStr: '',
};

const STEPS = [
  { label: 'Fluide' },
  { label: 'Basse pression' },
  { label: 'Haute pression' },
  { label: 'Sortie condenseur' },
  { label: 'Sortie évaporateur' },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export default function DiagnosticScreen(): React.JSX.Element {
  const { colors, spacing, radius, typography } = useAppTheme();
  const { width: screenWidth } = useWindowDimensions();

  const [showResults, setShowResults] = useState(false);
  const [diagramFullscreen, setDiagramFullscreen] = useState(false);
  const [step, setStep] = useState(1);
  const [values, setValues] = useState<WizardValues>(EMPTY_WIZARD);
  const [results, setResults] = useState<DiagnosticResult[] | null>(null);
  const [cycleResult, setCycleResult] = useState<CycleResult | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);

  const [fluidTable, setFluidTable] = useState<FluidTable | null>(null);
  const { setCycleData, setDiagnosticData, startAfterPass, currentPass } = useReportContext();

  useEffect(() => {
    let cancelled = false;
    setFluidTable(null);
    loadFluidTable(values.refrigerantId)
      .then((t) => { if (!cancelled) setFluidTable(t); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [values.refrigerantId]);
  const diagramWidth = screenWidth - spacing.lg * 2;
  const diagramHeight = Math.round(diagramWidth * (210 / 297));

  // ── Derived values ──────────────────────────────────────────────────────────
  const bp = parseNum(values.bpStr);
  const hp = parseNum(values.hpStr);
  const tCond = parseNum(values.tCondStr);
  const tEvap = parseNum(values.tEvapStr);

  const evapSatPoint = bp !== undefined && fluidTable ? satFromPressure(fluidTable, toAbs(bp)) : undefined;
  const condSatPoint = hp !== undefined && fluidTable ? satFromPressure(fluidTable, toAbs(hp)) : undefined;

  const evapTempSat = evapSatPoint?.tempC;
  const condTempSat = condSatPoint?.tempC;

  const superheatK = evapTempSat !== undefined && tEvap !== undefined
    ? tEvap - evapTempSat : undefined;
  const subcoolingK = condTempSat !== undefined && tCond !== undefined
    ? condTempSat - tCond : undefined;

  // Isobares : on utilise directement la pression absolue manifold (pas de roundtrip P→T→P)
  const isobarLow  = bp !== undefined ? toAbs(bp) : undefined;
  const isobarHigh = hp !== undefined ? toAbs(hp) : undefined;

  // ── Validation ──────────────────────────────────────────────────────────────
  function validateCurrentStep(): string | null {
    switch (step) {
      case 2:
        if (bp === undefined) return 'Entrez la basse pression.';
        if (bp < 0) return 'La pression doit être positive ou nulle.';
        return null;
      case 3:
        if (hp === undefined) return 'Entrez la haute pression.';
        if (hp <= (bp ?? 0)) return 'La HP doit être supérieure à la BP.';
        return null;
      case 4:
        if (tCond === undefined) return 'Entrez la température de sortie condenseur.';
        return null;
      case 5:
        if (tEvap === undefined) return 'Entrez la température de sortie évaporateur.';
        return null;
      default:
        return null;
    }
  }

  // ── Actions ─────────────────────────────────────────────────────────────────
  function handleNext() {
    const err = validateCurrentStep();
    if (err) { setStepError(err); return; }
    setStepError(null);
    if (step < STEP_COUNT) {
      setStep(step + 1);
    } else {
      computeAndShowResults();
    }
  }

  function handleBack() {
    setStepError(null);
    if (step > 1) setStep(step - 1);
  }

  async function computeAndShowResults() {
    if (bp === undefined || hp === undefined || tEvap === undefined || tCond === undefined ||
        evapTempSat === undefined || condTempSat === undefined) return;

    const sh = Math.max(0, tEvap - evapTempSat);
    const sc = Math.max(0, condTempSat - tCond);

    const input: DiagnosticInput = {
      bpBar: toAbs(bp),
      hpBar: toAbs(hp),
      superheatK: sh,
      subcoolingK: sc,
      evapTempC: evapTempSat,
      condTempC: condTempSat,
    };

    const output = runDiagnostic(input);
    const diagResults = output.valid ? output.results : [];
    setResults(diagResults);
    setDiagnosticData(diagResults);

    try {
      const cycleParams: CycleParameters = {
        refrigerantId: values.refrigerantId,
        evapTempC: evapTempSat,
        condTempC: condTempSat,
        superheatK: sh,
        subcoolingK: sc,
        isentropicEfficiency: 1.0,
      };
      const cycle = await calculateCycle(cycleParams);
      setCycleResult(cycle);
      if (fluidTable) setCycleData(toRefrigerantData(fluidTable), cycle, fluidTable);
    } catch { setCycleResult(null); }

    hideKeypad();
    setShowResults(true);
  }

  function handleReset() {
    setValues(EMPTY_WIZARD);
    setShowResults(false);
    setStep(1);
    setResults(null);
    setCycleResult(null);
    setStepError(null);
  }

  function handleRerun() {
    computeAndShowResults();
  }

  // ── Styles ──────────────────────────────────────────────────────────────────
  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },

    // Wizard
    wizardContainer: {
      flex: 1,
      paddingHorizontal: spacing.lg,
    },
    progressRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacing.xs,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xl,
    },
    dot: {
      width: 8, height: 8, borderRadius: 4,
    },
    stepLabel: {
      fontFamily: typography.fontSans,
      fontSize: typography.size.xs,
      color: colors.textMuted,
      textAlign: 'center',
      marginBottom: spacing.xs,
    },
    question: {
      fontFamily: typography.fontSans,
      fontSize: typography.size.lg,
      fontWeight: typography.weight.bold,
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: spacing.xl,
      lineHeight: 28,
    },
    hint: {
      fontFamily: typography.fontMono,
      fontSize: typography.size.sm,
      color: colors.accent,
      textAlign: 'center',
      marginTop: spacing.xs,
      marginBottom: spacing.sm,
    },
    hintSub: {
      fontFamily: typography.fontSans,
      fontSize: typography.size.xs,
      color: colors.textMuted,
      textAlign: 'center',
      marginBottom: spacing.md,
    },
    errorText: {
      fontFamily: typography.fontSans,
      fontSize: typography.size.sm,
      color: colors.red,
      textAlign: 'center',
      marginTop: spacing.sm,
    },
    valueDisplay: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'center',
      gap: spacing.sm,
      backgroundColor: colors.bgSubtle,
      borderWidth: 2,
      borderColor: colors.accent,
      borderRadius: radius.md,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      marginVertical: spacing.lg,
    },
    valueText: {
      fontFamily: typography.fontMono,
      fontSize: 36,
      fontWeight: typography.weight.bold,
      color: colors.textPrimary,
      minWidth: 80,
      textAlign: 'right',
    },
    valueUnit: {
      fontFamily: typography.fontMono,
      fontSize: typography.size.md,
      color: colors.textMuted,
    },
    navRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    backButton: {
      flex: 1,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    backButtonText: {
      fontFamily: typography.fontSans,
      fontSize: typography.size.md,
      color: colors.textSecondary,
    },
    nextButton: {
      flex: 2,
      backgroundColor: colors.accent,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
    },
    nextButtonText: {
      fontFamily: typography.fontSans,
      fontSize: typography.size.md,
      fontWeight: typography.weight.bold,
      color: colors.textOnAccent,
      letterSpacing: 0.5,
    },

    // Results
    content: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    resultsHeader: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.md,
    },
    resultsTitle: {
      fontFamily: typography.fontSans,
      fontSize: typography.size.xl,
      fontWeight: typography.weight.bold,
      color: colors.textPrimary,
    },
    diagramContainer: { marginBottom: spacing.lg, position: 'relative' },
    fullscreenBtn: {
      position: 'absolute',
      bottom: 8,
      right: 8,
      width: 30,
      height: 30,
      borderRadius: 6,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingVertical: spacing.xs,
    },
    summaryLabel: {
      fontFamily: typography.fontSans,
      fontSize: typography.size.sm,
      color: colors.textSecondary,
      flex: 1,
    },
    summaryValue: {
      fontFamily: typography.fontMono,
      fontSize: typography.size.sm,
      color: colors.textPrimary,
      textAlign: 'right',
    },
    summaryDerived: {
      fontFamily: typography.fontMono,
      fontSize: typography.size.xs,
      color: colors.textMuted,
      textAlign: 'right',
    },
    separator: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: spacing.xs,
    },
    modifyButton: {
      borderRadius: radius.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.accent,
      marginTop: spacing.md,
    },
    modifyButtonText: {
      fontFamily: typography.fontSans,
      fontSize: typography.size.sm,
      color: colors.accent,
    },
    resetButton: {
      borderRadius: radius.md,
      paddingVertical: spacing.sm,
      alignItems: 'center',
      marginTop: spacing.sm,
    },
    resetButtonText: {
      fontFamily: typography.fontSans,
      fontSize: typography.size.sm,
      color: colors.textMuted,
    },
    afterButton: {
      backgroundColor: '#10B981',
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
      marginTop: spacing.md,
    },
    afterButtonText: {
      fontFamily: typography.fontSans,
      fontSize: typography.size.md,
      fontWeight: typography.weight.bold,
      color: '#fff',
      letterSpacing: 0.5,
    },
    passBanner: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.sm,
      alignSelf: 'flex-start',
      marginBottom: spacing.xs,
    },
    passBannerText: {
      fontFamily: typography.fontSans,
      fontSize: typography.size.xs,
      fontWeight: typography.weight.bold,
      letterSpacing: 0.8,
      color: '#fff',
    },
    row: { flexDirection: 'row', gap: spacing.sm },
    half: { flex: 1 },
    updateButton: {
      backgroundColor: colors.accent,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
      marginTop: spacing.md,
    },
    updateButtonText: {
      fontFamily: typography.fontSans,
      fontSize: typography.size.md,
      fontWeight: typography.weight.bold,
      color: colors.textOnAccent,
      letterSpacing: 0.5,
    },
    shBadge: {
      borderRadius: radius.sm,
      paddingHorizontal: 6,
      paddingVertical: 1,
    },
    shBadgeText: {
      fontFamily: typography.fontMono,
      fontSize: typography.size.xs,
      color: '#fff',
    },
  }), [colors, spacing, radius, typography]);

  const { showKeypad, hideKeypad, activeField } = useKeypadContext();


  // Stable refs for the wizard keypad — never stale, never cause remounts
  const wizardValueRef = useRef('');
  const wizardOnChangeRef = useRef<(v: string) => void>(() => {});
  const wizardNextRef = useRef<() => void>(() => {});
  // Keep wizardNextRef current on every render so ↵ always triggers the latest handleNext
  wizardNextRef.current = handleNext;

  // Keep wizardValueRef current on every render
  const wizardValue = step === 2 ? values.bpStr : step === 3 ? values.hpStr :
                      step === 4 ? values.tCondStr : step === 5 ? values.tEvapStr : '';
  wizardValueRef.current = wizardValue;

  // Register/unregister wizard field when step changes
  useEffect(() => {
    if (step < 2 || step > 5) { hideKeypad(); return; }
    const signed = step >= 4;
    wizardOnChangeRef.current = (s: string) => {
      if (step === 2) setValues(v => ({ ...v, bpStr: s }));
      else if (step === 3) setValues(v => ({ ...v, hpStr: s }));
      else if (step === 4) setValues(v => ({ ...v, tCondStr: s }));
      else if (step === 5) setValues(v => ({ ...v, tEvapStr: s }));
    };
    showKeypad({ id: 'wizard-step', valueRef: wizardValueRef, onChangeRef: wizardOnChangeRef, signed, onConfirmRef: wizardNextRef });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ─────────────────────────────────────────────────────────────────────────────
  // WIZARD
  // ─────────────────────────────────────────────────────────────────────────────
  if (!showResults) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Scrollable step content */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <View style={styles.wizardContainer}>
            {/* Progress dots */}
            <View style={styles.progressRow}>
              {STEPS.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    {
                      backgroundColor: i + 1 <= step ? colors.accent : colors.border,
                      opacity: i + 1 <= step ? 1 : 0.4,
                      width: i + 1 === step ? 20 : 8,
                    },
                  ]}
                />
              ))}
            </View>

            <Text style={styles.stepLabel}>
              Étape {step} / {STEP_COUNT} — {STEPS[step - 1].label}
            </Text>

            {/* Step content */}
            {step === 1 && (
              <>
                <Text style={styles.question}>Quel réfrigérant utilises-tu ?</Text>
                <RefrigerantPicker
                  value={values.refrigerantId}
                  onChange={(id) => setValues((v) => ({ ...v, refrigerantId: id as RefrigerantId }))}
                />
              </>
            )}

            {step === 2 && (
              <>
                <Text style={styles.question}>Basse pression (BP) au manifold ?</Text>
                <View style={styles.valueDisplay}><Text style={styles.valueText}>{values.bpStr || '—'}</Text><Text style={styles.valueUnit}>bar rel.</Text></View>
                {evapTempSat !== undefined && (
                  <>
                    <Text style={styles.hint}>→ T° sat. évap. : {evapTempSat.toFixed(1)} °C</Text>
                    <Text style={styles.hintSub}>T° à laquelle le frigorigène bout à cette pression</Text>
                  </>
                )}
              </>
            )}

            {step === 3 && (
              <>
                <Text style={styles.question}>Haute pression (HP) au manifold ?</Text>
                <View style={styles.valueDisplay}><Text style={styles.valueText}>{values.hpStr || '—'}</Text><Text style={styles.valueUnit}>bar rel.</Text></View>
                {condTempSat !== undefined && (
                  <>
                    <Text style={styles.hint}>→ T° sat. cond. : {condTempSat.toFixed(1)} °C</Text>
                    <Text style={styles.hintSub}>T° à laquelle le frigorigène se liquéfie à cette pression</Text>
                  </>
                )}
              </>
            )}

            {step === 4 && (
              <>
                <Text style={styles.question}>Température sortie condenseur ?</Text>
                {condTempSat !== undefined && (
                  <Text style={styles.hintSub}>T° sat. cond. : {condTempSat.toFixed(1)} °C — mesure &lt; T° sat.</Text>
                )}
                <View style={styles.valueDisplay}><Text style={styles.valueText}>{values.tCondStr || '—'}</Text><Text style={styles.valueUnit}>°C</Text></View>
                {subcoolingK !== undefined && (
                  <Text style={styles.hint}>
                    → SC : {subcoolingK.toFixed(1)} K{' '}
                    {subcoolingK >= 4 && subcoolingK <= 8 ? '✓ normal' : subcoolingK < 0 ? '⚠ négatif' : ''}
                  </Text>
                )}
              </>
            )}

            {step === 5 && (
              <>
                <Text style={styles.question}>Température sortie évaporateur ?</Text>
                {evapTempSat !== undefined && (
                  <Text style={styles.hintSub}>T° sat. évap. : {evapTempSat.toFixed(1)} °C — mesure &gt; T° sat.</Text>
                )}
                <View style={styles.valueDisplay}><Text style={styles.valueText}>{values.tEvapStr || '—'}</Text><Text style={styles.valueUnit}>°C</Text></View>
                {superheatK !== undefined && (
                  <Text style={styles.hint}>
                    → SH : {superheatK.toFixed(1)} K{' '}
                    {superheatK >= 4 && superheatK <= 10 ? '✓ normal' : superheatK < 0 ? '⚠ négative' : ''}
                  </Text>
                )}
              </>
            )}

            {stepError && <Text style={styles.errorText}>{stepError}</Text>}
          </View>
        </ScrollView>

        {/* Persistent numeric keypad — driven by KeypadContext */}
        <NumericKeypad />

        {/* Navigation */}
        <View style={[styles.navRow, { paddingHorizontal: spacing.lg, paddingBottom: spacing.md }]}>
          {step > 1 && (
            <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
              <Text style={styles.backButtonText}>← Retour</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.nextButton} onPress={handleNext} activeOpacity={0.8}>
            <Text style={styles.nextButtonText}>
              {step < STEP_COUNT ? 'Suivant →' : 'DIAGNOSTIQUER'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RESULTS
  // ─────────────────────────────────────────────────────────────────────────────
  const shColor = superheatK === undefined ? colors.textMuted :
    (superheatK >= 4 && superheatK <= 10) ? '#22C55E' :
    (superheatK < 0) ? colors.red : '#F59E0B';

  const scColor = subcoolingK === undefined ? colors.textMuted :
    (subcoolingK >= 4 && subcoolingK <= 8) ? '#22C55E' :
    (subcoolingK < 0) ? colors.red : '#F59E0B';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: activeField ? KEYPAD_HEIGHT : 0 }}
      >
        <View style={styles.resultsHeader}>
          <View style={[styles.passBanner, { backgroundColor: currentPass === 'before' ? '#6366F1' : '#10B981' }]}>
            <Text style={styles.passBannerText}>{currentPass === 'before' ? 'MESURE INITIALE' : 'MESURE APRÈS INTERVENTION'}</Text>
          </View>
          <Text style={styles.resultsTitle}>Résultats du diagnostic</Text>
        </View>

        <View style={styles.content}>
          {/* Diagramme P-h */}
          <View style={styles.diagramContainer}>
            <DiagramCanvas
              table={fluidTable}
              cycleResult={cycleResult}
              width={diagramWidth}
              height={diagramHeight}
              isobarLow={isobarLow}
              isobarHigh={isobarHigh}
            />
            <TouchableOpacity
              style={[styles.fullscreenBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setDiagramFullscreen(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="expand-outline" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <DiagramFullscreenModal
            visible={diagramFullscreen}
            onClose={() => setDiagramFullscreen(false)}
            table={fluidTable}
            cycleResult={cycleResult}
            isobarLow={isobarLow}
            isobarHigh={isobarHigh}
          />

          {/* Diagnostic */}
          {results !== null && <DiagnosticResults results={results} />}

          {/* Formulaire de modification inline */}
          <Card style={{ marginTop: spacing.lg }}>
            <Text style={[styles.summaryLabel, { fontWeight: typography.weight.bold, color: colors.textPrimary, marginBottom: spacing.sm }]}>
              Modifier les valeurs
            </Text>

            <RefrigerantPicker
              value={values.refrigerantId}
              label="Fluide"
              onChange={(id) => setValues((v) => ({ ...v, refrigerantId: id as RefrigerantId }))}
            />

            <View style={styles.separator} />

            <View style={styles.row}>
              <View style={styles.half}>
                <NumericInput
                  label="BP"
                  value={values.bpStr}
                  onChangeText={(s) => setValues((v) => ({ ...v, bpStr: s }))}
                  unit="bar rel."
                />
                {evapTempSat !== undefined &&
                  <Text style={styles.summaryDerived}>T sat : {evapTempSat.toFixed(1)} °C</Text>}
              </View>
              <View style={styles.half}>
                <NumericInput
                  label="HP"
                  value={values.hpStr}
                  onChangeText={(s) => setValues((v) => ({ ...v, hpStr: s }))}
                  unit="bar rel."
                />
                {condTempSat !== undefined &&
                  <Text style={styles.summaryDerived}>T sat : {condTempSat.toFixed(1)} °C</Text>}
              </View>
            </View>

            <View style={styles.separator} />

            <View style={styles.row}>
              <View style={styles.half}>
                <NumericInput
                  label="T sortie évaporateur"
                  value={values.tEvapStr}
                  onChangeText={(s) => setValues((v) => ({ ...v, tEvapStr: s }))}
                  unit="°C"
                  signed
                />
                {superheatK !== undefined && (
                  <View style={[styles.shBadge, { backgroundColor: shColor, alignSelf: 'flex-start' }]}>
                    <Text style={styles.shBadgeText}>SH {superheatK.toFixed(1)} K</Text>
                  </View>
                )}
              </View>
              <View style={styles.half}>
                <NumericInput
                  label="T sortie condenseur"
                  value={values.tCondStr}
                  onChangeText={(s) => setValues((v) => ({ ...v, tCondStr: s }))}
                  unit="°C"
                  signed
                />
                {subcoolingK !== undefined && (
                  <View style={[styles.shBadge, { backgroundColor: scColor, alignSelf: 'flex-start' }]}>
                    <Text style={styles.shBadgeText}>SC {subcoolingK.toFixed(1)} K</Text>
                  </View>
                )}
              </View>
            </View>

            <TouchableOpacity style={styles.updateButton} onPress={handleRerun} activeOpacity={0.8}>
              <Text style={styles.updateButtonText}>METTRE À JOUR</Text>
            </TouchableOpacity>
            {currentPass === 'before' && (
              <TouchableOpacity
                style={styles.afterButton}
                onPress={() => { startAfterPass(); handleReset(); }}
                activeOpacity={0.8}
              >
                <Text style={styles.afterButtonText}>MESURE APRÈS INTERVENTION →</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.resetButton} onPress={handleReset} activeOpacity={0.7}>
              <Text style={styles.resetButtonText}>Recommencer</Text>
            </TouchableOpacity>
          </Card>
        </View>
      </ScrollView>
      <NumericKeypad />
    </SafeAreaView>
  );
}
