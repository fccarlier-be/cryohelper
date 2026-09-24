import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';
import NumericInput from '../../components/NumericInput';
import LabeledPicker from '../../components/LabeledPicker';
import Card from '../../components/Card';
import type { InsulationLevel, QuickThermalInput } from '../../types/thermal';

const INSULATION_OPTIONS: { value: InsulationLevel; label: string }[] = [
  { value: 'low', label: 'Faible' },
  { value: 'medium', label: 'Moyen' },
  { value: 'good', label: 'Bon' },
];

interface Props {
  input: QuickThermalInput;
  onChange: (input: QuickThermalInput) => void;
  onCalculate: () => void;
}

export default function QuickModeForm({ input, onChange, onCalculate }: Props): React.JSX.Element {
  const { colors, spacing, radius, typography } = useAppTheme();

  function update<K extends keyof QuickThermalInput>(key: K, value: QuickThermalInput[K]) {
    onChange({ ...input, [key]: value });
  }

  const styles = useMemo(
    () =>
      StyleSheet.create({
        hint: {
          fontFamily: typography.fontSans,
          fontSize: typography.size.xs,
          color: colors.textMuted,
          marginBottom: spacing.md,
          lineHeight: 16,
        },
        separator: {
          height: 1,
          backgroundColor: colors.border,
          marginVertical: spacing.md,
        },
        button: {
          marginTop: spacing.md,
          backgroundColor: colors.accent,
          borderRadius: radius.md,
          paddingVertical: spacing.md,
          alignItems: 'center',
        },
        buttonText: {
          fontFamily: typography.fontSans,
          fontSize: typography.size.md,
          fontWeight: typography.weight.bold,
          color: colors.textOnAccent,
          letterSpacing: 0.5,
        },
      }),
    [colors, spacing, radius, typography],
  );

  return (
    <Card>
      <Text style={styles.hint}>
        Mode rapide : 3 données suffisent pour une estimation de chantier.
      </Text>

      <NumericInput
        label="Surface du local"
        value={String(input.surfaceM2)}
        onChangeText={(v) => update('surfaceM2', parseFloat(v) || 0)}
        unit="m²"
        placeholder="ex: 20"
      />

      <NumericInput
        label="Hauteur sous plafond"
        value={String(input.heightM)}
        onChangeText={(v) => update('heightM', parseFloat(v) || 0)}
        unit="m"
        placeholder="ex: 3"
      />

      <NumericInput
        label="ΔT (T_ext − T_int souhaitée)"
        value={String(input.deltaT)}
        onChangeText={(v) => update('deltaT', parseFloat(v) || 0)}
        unit="K"
        placeholder="ex: 30"
      />

      <View style={styles.separator} />

      <LabeledPicker
        label="Niveau d'isolation"
        options={INSULATION_OPTIONS}
        value={input.insulationLevel}
        onChange={(v) => update('insulationLevel', v)}
      />

      <TouchableOpacity style={styles.button} onPress={onCalculate} activeOpacity={0.8}>
        <Text style={styles.buttonText}>CALCULER</Text>
      </TouchableOpacity>
    </Card>
  );
}
