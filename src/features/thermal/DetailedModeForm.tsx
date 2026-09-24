import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';
import NumericInput from '../../components/NumericInput';
import LabeledPicker from '../../components/LabeledPicker';
import Card from '../../components/Card';
import SectionTitle from '../../components/SectionTitle';
import {
  ROOM_TYPE_LABELS,
} from '../../constants/thermalConstants';
import type {
  DetailedThermalInput,
  InsulationLevel,
  InternalLoads,
  RoomType,
} from '../../types/thermal';

const INSULATION_OPTIONS: { value: InsulationLevel; label: string }[] = [
  { value: 'low', label: 'Faible' },
  { value: 'medium', label: 'Moyen' },
  { value: 'good', label: 'Bon' },
];

const INTERNAL_LOAD_OPTIONS: { value: InternalLoads; label: string }[] = [
  { value: 'low', label: 'Faibles' },
  { value: 'medium', label: 'Moyens' },
  { value: 'high', label: 'Élevés' },
];

const ROOM_TYPE_OPTIONS: { value: RoomType; label: string }[] = (
  Object.entries(ROOM_TYPE_LABELS) as [RoomType, string][]
).map(([value, label]) => ({ value, label }));

interface Props {
  input: DetailedThermalInput;
  onChange: (input: DetailedThermalInput) => void;
  onCalculate: () => void;
}

export default function DetailedModeForm({ input, onChange, onCalculate }: Props): React.JSX.Element {
  const { colors, spacing, radius, typography } = useAppTheme();

  function update<K extends keyof DetailedThermalInput>(key: K, value: DetailedThermalInput[K]) {
    onChange({ ...input, [key]: value });
  }

  const styles = useMemo(
    () =>
      StyleSheet.create({
        separator: {
          height: 1,
          backgroundColor: colors.border,
          marginVertical: spacing.md,
        },
        row: {
          flexDirection: 'row',
          gap: spacing.sm,
        },
        halfInput: { flex: 1 },
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
      <SectionTitle title="Géométrie du local" />

      <View style={styles.row}>
        <NumericInput
          label="Surface"
          value={String(input.surfaceM2)}
          onChangeText={(v) => update('surfaceM2', parseFloat(v) || 0)}
          unit="m²"
          style={styles.halfInput}
        />
        <NumericInput
          label="Hauteur"
          value={String(input.heightM)}
          onChangeText={(v) => update('heightM', parseFloat(v) || 0)}
          unit="m"
          style={styles.halfInput}
        />
      </View>

      <View style={styles.separator} />
      <SectionTitle title="Températures" />

      <View style={styles.row}>
        <NumericInput
          label="T. intérieure"
          value={String(input.tempInteriorC)}
          onChangeText={(v) => update('tempInteriorC', parseFloat(v) || 0)}
          unit="°C"
          style={styles.halfInput}
        />
        <NumericInput
          label="T. extérieure"
          value={String(input.tempExteriorC)}
          onChangeText={(v) => update('tempExteriorC', parseFloat(v) || 0)}
          unit="°C"
          style={styles.halfInput}
        />
      </View>

      <View style={styles.separator} />
      <SectionTitle title="Caractéristiques" />

      <LabeledPicker
        label="Type de local"
        options={ROOM_TYPE_OPTIONS}
        value={input.roomType}
        onChange={(v) => update('roomType', v)}
      />

      <LabeledPicker
        label="Niveau d'isolation"
        options={INSULATION_OPTIONS}
        value={input.insulationLevel}
        onChange={(v) => update('insulationLevel', v)}
      />

      <LabeledPicker
        label="Apports internes"
        options={INTERNAL_LOAD_OPTIONS}
        value={input.internalLoads}
        onChange={(v) => update('internalLoads', v)}
      />

      <TouchableOpacity style={styles.button} onPress={onCalculate} activeOpacity={0.8}>
        <Text style={styles.buttonText}>CALCULER</Text>
      </TouchableOpacity>
    </Card>
  );
}
