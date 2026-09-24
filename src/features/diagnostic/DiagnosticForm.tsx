import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';
import Card from '../../components/Card';
import SectionTitle from '../../components/SectionTitle';
import NumericInput from '../../components/NumericInput';

export type DiagnosticStrings = {
  bpBar: string;
  hpBar: string;
  superheatK: string;
  subcoolingK: string;
  evapTempC: string;
  condTempC: string;
  ambientTempC: string;
  dischargeTempC: string;
};

interface Props {
  strings: DiagnosticStrings;
  onChange: (key: keyof DiagnosticStrings, value: string) => void;
}

export default function DiagnosticForm({ strings, onChange }: Props): React.JSX.Element {
  const { colors, spacing, typography } = useAppTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          gap: spacing.sm,
        },
        half: { flex: 1 },
        separator: {
          height: 1,
          backgroundColor: colors.border,
          marginVertical: spacing.md,
        },
        note: {
          fontFamily: typography.fontSans,
          fontSize: typography.size.xs,
          color: colors.textMuted,
          marginTop: -spacing.xs,
          marginBottom: spacing.sm,
        },
      }),
    [colors, spacing, typography],
  );

  return (
    <Card>
      {/* Pressions */}
      <SectionTitle title="Pressions manifold" />
      <Text style={styles.note}>Entrer la pression relative lue sur le manifold (bar rel.)</Text>
      <View style={styles.row}>
        <NumericInput
          label="BP"
          value={strings.bpBar}
          onChangeText={(v) => onChange('bpBar', v)}
          unit="bar rel."
          style={styles.half}
        />
        <NumericInput
          label="HP"
          value={strings.hpBar}
          onChangeText={(v) => onChange('hpBar', v)}
          unit="bar rel."
          style={styles.half}
        />
      </View>

      <View style={styles.separator} />

      {/* Températures de saturation */}
      <SectionTitle title="Températures de saturation" />
      <Text style={styles.note}>Calculées automatiquement depuis BP/HP — modifiables si besoin</Text>
      <View style={styles.row}>
        <NumericInput
          label="T évaporation"
          value={strings.evapTempC}
          onChangeText={(v) => onChange('evapTempC', v)}
          unit="°C"
          style={styles.half}
          signed
        />
        <NumericInput
          label="T condensation"
          value={strings.condTempC}
          onChangeText={(v) => onChange('condTempC', v)}
          unit="°C"
          style={styles.half}
          signed
        />
      </View>

      <View style={styles.separator} />

      {/* Échangeurs */}
      <SectionTitle title="Échangeurs" />
      <View style={styles.row}>
        <NumericInput
          label="Surchauffe"
          value={strings.superheatK}
          onChangeText={(v) => onChange('superheatK', v)}
          unit="K"
          style={styles.half}
        />
        <NumericInput
          label="Sous-refroidissement"
          value={strings.subcoolingK}
          onChangeText={(v) => onChange('subcoolingK', v)}
          unit="K"
          style={styles.half}
        />
      </View>

      <View style={styles.separator} />

      {/* Optionnel */}
      <SectionTitle title="Optionnel" />
      <View style={styles.row}>
        <NumericInput
          label="T ambiante"
          value={strings.ambientTempC}
          onChangeText={(v) => onChange('ambientTempC', v)}
          unit="°C"
          placeholder="—"
          style={styles.half}
          signed
        />
        <NumericInput
          label="T sortie compresseur"
          value={strings.dischargeTempC}
          onChangeText={(v) => onChange('dischargeTempC', v)}
          unit="°C"
          placeholder="—"
          style={styles.half}
          signed
        />
      </View>
    </Card>
  );
}
