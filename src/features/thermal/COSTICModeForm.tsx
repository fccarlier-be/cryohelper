import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';
import NumericInput from '../../components/NumericInput';
import SegmentedControl from '../../components/SegmentedControl';
import Card from '../../components/Card';
import SectionTitle from '../../components/SectionTitle';
import { COSTIC_T_EXT } from '../../constants/thermalConstants';
import type { COSTICInput, TExtCOSTIC } from '../../types/thermal';

interface Props {
  input: COSTICInput;
  onChange: (input: COSTICInput) => void;
  onCalculate: () => void;
}

type TExtString = '28' | '32' | '36' | '40';

const T_EXT_OPTIONS: { value: TExtString; label: string }[] = COSTIC_T_EXT.map((t) => ({
  value: String(t) as TExtString,
  label: `${t} °C`,
}));

export default function COSTICModeForm({ input, onChange, onCalculate }: Props): React.JSX.Element {
  const { colors, spacing, radius, typography } = useAppTheme();

  function upd<K extends keyof COSTICInput>(key: K, raw: string) {
    const num = parseFloat(raw);
    onChange({ ...input, [key]: isNaN(num) ? 0 : Math.max(0, num) });
  }

  function updTExt(s: TExtString) {
    onChange({ ...input, tExtC: parseInt(s, 10) as TExtCOSTIC });
  }

  const styles = useMemo(
    () =>
      StyleSheet.create({
        separator: {
          height: 1,
          backgroundColor: colors.border,
          marginVertical: spacing.sm,
        },
        row: {
          flexDirection: 'row',
          gap: spacing.sm,
        },
        half: { flex: 1 },
        note: {
          fontFamily: typography.fontSans,
          fontSize: typography.size.xs,
          color: colors.textMuted,
          marginBottom: spacing.sm,
          fontStyle: 'italic',
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
        tExtLabel: {
          fontFamily: typography.fontSans,
          fontSize: typography.size.sm,
          color: colors.textSecondary,
          marginBottom: spacing.xs,
        },
      }),
    [colors, spacing, radius, typography],
  );

  const v = (val: number) => (val === 0 ? '' : String(val));

  return (
    <>
      {/* T extérieure */}
      <Card>
        <Text style={styles.tExtLabel}>Température extérieure de base</Text>
        <SegmentedControl
          options={T_EXT_OPTIONS}
          value={String(input.tExtC) as TExtString}
          onChange={updTExt}
        />
        <Text style={[styles.note, { marginTop: spacing.sm, marginBottom: 0 }]}>
          Méthode COSTIC confort — T intérieure de référence : 24 °C
        </Text>
      </Card>

      {/* Fenêtres */}
      <Card style={{ marginTop: spacing.md }}>
        <SectionTitle title="Fenêtres (m²)" />
        <Text style={styles.note}>Surfaces vitrées par orientation</Text>

        <View style={styles.row}>
          <NumericInput label="S / SE" value={v(input.fenetresSE_m2)}
            onChangeText={(r) => upd('fenetresSE_m2', r)} unit="m²" style={styles.half} />
          <NumericInput label="SO" value={v(input.fenetresSO_m2)}
            onChangeText={(r) => upd('fenetresSO_m2', r)} unit="m²" style={styles.half} />
        </View>
        <View style={styles.row}>
          <NumericInput label="O" value={v(input.fenetresO_m2)}
            onChangeText={(r) => upd('fenetresO_m2', r)} unit="m²" style={styles.half} />
          <NumericInput label="N / NE / NO" value={v(input.fenetresN_m2)}
            onChangeText={(r) => upd('fenetresN_m2', r)} unit="m²" style={styles.half} />
        </View>
        <NumericInput label="Non exposées (nord)" value={v(input.fenetresNord_m2)}
          onChangeText={(r) => upd('fenetresNord_m2', r)} unit="m²" />
      </Card>

      {/* Parois opaques */}
      <Card style={{ marginTop: spacing.md }}>
        <SectionTitle title="Parois opaques (m²)" />

        <View style={styles.row}>
          <NumericInput label="Murs exp. légers" value={v(input.mursLeger_m2)}
            onChangeText={(r) => upd('mursLeger_m2', r)} unit="m²" style={styles.half} />
          <NumericInput label="Murs exp. lourds" value={v(input.mursLourd_m2)}
            onChangeText={(r) => upd('mursLourd_m2', r)} unit="m²" style={styles.half} />
        </View>
        <View style={styles.row}>
          <NumericInput label="Murs non exposés" value={v(input.mursNonExposes_m2)}
            onChangeText={(r) => upd('mursNonExposes_m2', r)} unit="m²" style={styles.half} />
          <NumericInput label="Cloisons" value={v(input.cloisons_m2)}
            onChangeText={(r) => upd('cloisons_m2', r)} unit="m²" style={styles.half} />
        </View>
      </Card>

      {/* Plafond / Toiture */}
      <Card style={{ marginTop: spacing.md }}>
        <SectionTitle title="Plafond / Toiture (m²)" />
        <Text style={styles.note}>Saisir uniquement le(s) type(s) présents</Text>

        <View style={styles.row}>
          <NumericInput label="Loc. nc au-dessus" value={v(input.plafondLocalNc_m2)}
            onChangeText={(r) => upd('plafondLocalNc_m2', r)} unit="m²" style={styles.half} />
          <NumericInput label="Mansarde" value={v(input.plafondMansarde_m2)}
            onChangeText={(r) => upd('plafondMansarde_m2', r)} unit="m²" style={styles.half} />
        </View>
        <View style={styles.row}>
          <NumericInput label="Terrasse" value={v(input.plafondTerrasse_m2)}
            onChangeText={(r) => upd('plafondTerrasse_m2', r)} unit="m²" style={styles.half} />
          <NumericInput label="Toiture non isolée" value={v(input.toitureNi_m2)}
            onChangeText={(r) => upd('toitureNi_m2', r)} unit="m²" style={styles.half} />
        </View>
      </Card>

      {/* Plancher */}
      <Card style={{ marginTop: spacing.md }}>
        <SectionTitle title="Plancher (m²)" />
        <NumericInput label="Sur local non climatisé" value={v(input.plancher_m2)}
          onChangeText={(r) => upd('plancher_m2', r)} unit="m²" />
      </Card>

      {/* Apports internes */}
      <Card style={{ marginTop: spacing.md }}>
        <SectionTitle title="Apports internes" />

        <View style={styles.row}>
          <NumericInput label="Occupants" value={v(input.occupants)}
            onChangeText={(r) => upd('occupants', r)} unit="pers" style={styles.half} />
          <NumericInput label="Appareils élec." value={v(input.appareilsW)}
            onChangeText={(r) => upd('appareilsW', r)} unit="W" style={styles.half} />
        </View>
        <NumericInput label="Portes ouvertes" value={v(input.portesM)}
          onChangeText={(r) => upd('portesM', r)} unit="m.lin" />
      </Card>

      <TouchableOpacity style={styles.button} onPress={onCalculate} activeOpacity={0.8}>
        <Text style={styles.buttonText}>CALCULER LE BILAN</Text>
      </TouchableOpacity>
    </>
  );
}
