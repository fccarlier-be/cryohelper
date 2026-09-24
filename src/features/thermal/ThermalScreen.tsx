import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../context/ThemeContext';
import NumericKeypad from '../../components/NumericKeypad';
import { useKeypadContext, KEYPAD_HEIGHT } from '../../context/KeypadContext';
import SegmentedControl from '../../components/SegmentedControl';
import QuickModeForm from './QuickModeForm';
import DetailedModeForm from './DetailedModeForm';
import COSTICModeForm from './COSTICModeForm';
import ThermalResults from './ThermalResults';
import {
  calculateDetailedThermal,
  calculateQuickThermal,
  calculateCOSTIC,
} from '../../services/thermalCalculator';
import {
  THERMAL_DEFAULTS,
  COSTIC_DEFAULTS,
} from '../../constants/thermalConstants';
import type {
  QuickThermalInput,
  DetailedThermalInput,
  ThermalResult,
  COSTICInput,
  COSTICResult,
} from '../../types/thermal';

type Mode = 'quick' | 'detailed' | 'costic';

const MODE_OPTIONS: { value: Mode; label: string }[] = [
  { value: 'quick', label: 'Rapide' },
  { value: 'detailed', label: 'Détaillé' },
  { value: 'costic', label: 'COSTIC' },
];

export default function ThermalScreen(): React.JSX.Element {
  const { colors, spacing, typography } = useAppTheme();
  const { activeField } = useKeypadContext();

  const [mode, setMode] = useState<Mode>('quick');
  const [quickInput, setQuickInput] = useState<QuickThermalInput>(THERMAL_DEFAULTS.quick);
  const [detailedInput, setDetailedInput] = useState<DetailedThermalInput>(THERMAL_DEFAULTS.detailed);
  const [costicInput, setCosticInput] = useState<COSTICInput>(COSTIC_DEFAULTS);
  const [result, setResult] = useState<ThermalResult | COSTICResult | null>(null);

  const handleCalculate = () => {
    if (mode === 'quick') {
      setResult(calculateQuickThermal(quickInput));
    } else if (mode === 'detailed') {
      setResult(calculateDetailedThermal(detailedInput));
    } else {
      setResult(calculateCOSTIC(costicInput));
    }
  };

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    setResult(null);
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safe: { flex: 1, backgroundColor: colors.bg },
        container: { flex: 1 },
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
        modeSelector: {
          marginTop: spacing.md,
        },
        content: {
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.xxl,
        },
      }),
    [colors, spacing, typography],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: activeField ? KEYPAD_HEIGHT : 0 }}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Bilan thermique</Text>
            <Text style={styles.subtitle}>Estimation de la puissance frigorifique</Text>
            <SegmentedControl
              options={MODE_OPTIONS}
              value={mode}
              onChange={handleModeChange}
              style={styles.modeSelector}
            />
          </View>

          <View style={styles.content}>
            {mode === 'quick' ? (
              <QuickModeForm
                input={quickInput}
                onChange={setQuickInput}
                onCalculate={handleCalculate}
              />
            ) : mode === 'detailed' ? (
              <DetailedModeForm
                input={detailedInput}
                onChange={setDetailedInput}
                onCalculate={handleCalculate}
              />
            ) : (
              <COSTICModeForm
                input={costicInput}
                onChange={setCosticInput}
                onCalculate={handleCalculate}
              />
            )}

            {result ? <ThermalResults result={result} /> : null}
          </View>
        </ScrollView>
      <NumericKeypad />
    </SafeAreaView>
  );
}
