import React, { useEffect, useMemo, useState } from 'react';
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
import SectionTitle from '../../components/SectionTitle';
import DiagramCanvas from './DiagramCanvas';
import DiagramFullscreenModal from './DiagramFullscreenModal';
import CycleResults from './CycleResults';
import NumericKeypad from '../../components/NumericKeypad';
import { useKeypadContext, KEYPAD_HEIGHT } from '../../context/KeypadContext';
import { calculateCycle, defaultCycleParams } from '../../services/enthalpyCalculator';
import { loadFluidTable } from '../../services/fluidTableLoader';
import { satFromTemp } from '../../services/fluidInterpolator';
import { FLUID_CATALOG } from '../../constants/fluidCatalog';
import type { CycleParameters, CycleResult } from '../../types/enthalpy';
import type { RefrigerantId } from '../../types/refrigerant';
import type { FluidTable } from '../../types/fluidTable';

type CycleNumKey =
  | 'evapTempC'
  | 'condTempC'
  | 'superheatK'
  | 'subcoolingK'
  | 'isentropicEfficiency'
  | 'dischargeGasTemp_C';

function initStrings(id: string): Record<CycleNumKey, string> {
  const d = defaultCycleParams(id);
  return {
    evapTempC: String(d.evapTempC),
    condTempC: String(d.condTempC),
    superheatK: String(d.superheatK),
    subcoolingK: String(d.subcoolingK),
    isentropicEfficiency: String(d.isentropicEfficiency),
    dischargeGasTemp_C: '',
  };
}

export default function EnthalpyScreen(): React.JSX.Element {
  const { colors, spacing, radius, typography } = useAppTheme();
  const { width: screenWidth } = useWindowDimensions();

  const [params, setParams] = useState<CycleParameters>(defaultCycleParams('R134a'));
  const [cycleResult, setCycleResult] = useState<CycleResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [diagramFullscreen, setDiagramFullscreen] = useState(false);
  const [fluidTable, setFluidTable] = useState<FluidTable | null>(null);
  const { activeField } = useKeypadContext();

  const [numStrings, setNumStrings] = useState<Record<CycleNumKey, string>>(
    () => initStrings('R134a'),
  );

  // Load table whenever the selected fluid changes, then auto-calculate with default params
  useEffect(() => {
    let cancelled = false;
    setFluidTable(null);
    loadFluidTable(params.refrigerantId)
      .then(async (t) => {
        if (cancelled) return;
        setFluidTable(t);
        try {
          const result = await calculateCycle(params);
          if (!cancelled) setCycleResult(result);
        } catch { /* leave diagram empty if defaults fail */ }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.refrigerantId]);

  const selectedEntry = FLUID_CATALOG.find((f) => f.id === params.refrigerantId)!;

  const diagramWidth = screenWidth - spacing.lg * 2;
  const diagramHeight = Math.round(diagramWidth * (210 / 297));

  const isobarLow  = fluidTable ? satFromTemp(fluidTable, params.evapTempC).pressureBar : undefined;
  const isobarHigh = fluidTable ? satFromTemp(fluidTable, params.condTempC).pressureBar : undefined;

  function update<K extends keyof CycleParameters>(key: K, value: CycleParameters[K]) {
    setParams((p) => ({ ...p, [key]: value }));
    setError(null);
  }

  function updateNumeric(key: CycleNumKey, raw: string) {
    setNumStrings((s) => ({ ...s, [key]: raw }));
    if (raw !== '' && raw !== '-' && !raw.endsWith('.')) {
      const num = parseFloat(raw);
      if (!isNaN(num)) update(key as keyof CycleParameters, num as never);
    }
  }

  function updateDischarge(raw: string) {
    setNumStrings((s) => ({ ...s, dischargeGasTemp_C: raw }));
    if (raw === '') {
      setParams((p) => { const { dischargeGasTemp_C: _, ...rest } = p; return rest as CycleParameters; });
    } else if (raw !== '-' && !raw.endsWith('.')) {
      const num = parseFloat(raw);
      if (!isNaN(num)) update('dischargeGasTemp_C', num);
    }
  }

  async function handleCalculate() {
    try {
      const result = await calculateCycle(params);
      setCycleResult(result);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de calcul');
      setCycleResult(null);
    }
  }

  function handleFluidChange(id: RefrigerantId) {
    setParams(defaultCycleParams(id));
    setNumStrings(initStrings(id));
    setCycleResult(null);
    setError(null);
  }

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safe: { flex: 1, backgroundColor: colors.bg },
        header: {
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.lg,
          paddingBottom: spacing.md,
        },
        title: {
          fontFamily: typography.fontSans,
          fontSize: typography.size.xl,
          fontWeight: typography.weight.bold,
          color: colors.textPrimary,
          marginBottom: 2,
        },
        subtitle: {
          fontFamily: typography.fontSans,
          fontSize: typography.size.sm,
          color: colors.textMuted,
        },
        content: {
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.xxl,
        },
        diagramContainer: {
          marginBottom: spacing.lg,
          position: 'relative',
        },
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
        gwpBadge: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          marginTop: spacing.xs,
        },
        gwpText: {
          fontFamily: typography.fontMono,
          fontSize: typography.size.xs,
          color: colors.textMuted,
        },
        fluidSection: {
          marginBottom: spacing.md,
        },
        row: {
          flexDirection: 'row',
          gap: spacing.sm,
        },
        halfInput: { flex: 1 },
        separator: {
          height: 1,
          backgroundColor: colors.border,
          marginVertical: spacing.md,
        },
        calcButton: {
          backgroundColor: colors.accent,
          borderRadius: radius.md,
          paddingVertical: spacing.md,
          alignItems: 'center',
          marginTop: spacing.sm,
        },
        calcButtonText: {
          fontFamily: typography.fontSans,
          fontSize: typography.size.md,
          fontWeight: typography.weight.bold,
          color: colors.textOnAccent,
          letterSpacing: 0.5,
        },
        errorBox: {
          backgroundColor: colors.red + '22',
          borderRadius: radius.sm,
          borderWidth: 1,
          borderColor: colors.red,
          padding: spacing.md,
          marginTop: spacing.sm,
        },
        errorText: {
          fontFamily: typography.fontSans,
          fontSize: typography.size.sm,
          color: colors.red,
        },
      }),
    [colors, spacing, radius, typography],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: activeField ? KEYPAD_HEIGHT : 0 }}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Diagramme P-h</Text>
          <Text style={styles.subtitle}>Cycle frigorifique & calculs thermodynamiques</Text>
        </View>

        <View style={styles.content}>
          {/* Sélecteur de fluide */}
          <View style={styles.fluidSection}>
            <RefrigerantPicker
              value={params.refrigerantId}
              onChange={(id) => handleFluidChange(id as RefrigerantId)}
            />
            <View style={styles.gwpBadge}>
              <Text style={styles.gwpText}>
                GWP = {selectedEntry.gwp100} · Tc = {selectedEntry.criticalTempC} °C
                · Pc = {selectedEntry.criticalPressureBar} bar · {selectedEntry.ashraeClass}
              </Text>
            </View>
          </View>

          {/* Diagramme */}
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

          {/* Formulaire */}
          <Card>
            <SectionTitle title="Températures de saturation" />

            <View style={styles.row}>
              <NumericInput
                label="T évaporation"
                value={numStrings.evapTempC}
                onChangeText={(v) => updateNumeric('evapTempC', v)}
                unit="°C"
                style={styles.halfInput}
                signed
              />
              <NumericInput
                label="T condensation"
                value={numStrings.condTempC}
                onChangeText={(v) => updateNumeric('condTempC', v)}
                unit="°C"
                style={styles.halfInput}
                signed
              />
            </View>

            <View style={styles.separator} />
            <SectionTitle title="Compresseur" />

            <View style={styles.row}>
              <NumericInput
                label="Surchauffe aspiration"
                value={numStrings.superheatK}
                onChangeText={(v) => updateNumeric('superheatK', v)}
                unit="K"
                style={styles.halfInput}
              />
              <NumericInput
                label="T sortie (désurchauffe)"
                value={numStrings.dischargeGasTemp_C}
                onChangeText={updateDischarge}
                unit="°C"
                style={styles.halfInput}
                placeholder="calc."
                signed
              />
            </View>

            <View style={styles.row}>
              <NumericInput
                label="Sous-refroidissement"
                value={numStrings.subcoolingK}
                onChangeText={(v) => updateNumeric('subcoolingK', v)}
                unit="K"
                style={styles.halfInput}
              />
              <NumericInput
                label="Rdt isentropique"
                value={numStrings.isentropicEfficiency}
                onChangeText={(v) => updateNumeric('isentropicEfficiency', v)}
                unit="(0–1)"
                style={styles.halfInput}
                placeholder="1.0"
              />
            </View>

            <TouchableOpacity
              style={styles.calcButton}
              onPress={handleCalculate}
              activeOpacity={0.8}
            >
              <Text style={styles.calcButtonText}>CALCULER LE CYCLE</Text>
            </TouchableOpacity>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </Card>

          {/* Résultats */}
          {cycleResult ? (
            <View style={{ marginTop: spacing.lg }}>
              <CycleResults result={cycleResult} />
            </View>
          ) : null}
        </View>
      </ScrollView>
      <NumericKeypad />
    </SafeAreaView>
  );
}
