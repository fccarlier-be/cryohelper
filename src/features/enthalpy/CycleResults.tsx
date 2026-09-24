import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';
import Card from '../../components/Card';
import ResultRow from '../../components/ResultRow';
import SectionTitle from '../../components/SectionTitle';
import type { CycleResult } from '../../types/enthalpy';

interface Props {
  result: CycleResult;
}

const POINT_DESCRIPTIONS: Record<1 | 2 | 3 | 4, string> = {
  1: 'Sortie évap.',
  2: 'Sortie comp.',
  3: 'Sortie cond.',
  4: 'Sortie détendeur',
};

export default function CycleResults({ result }: Props): React.JSX.Element {
  const { colors, spacing, radius, typography } = useAppTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        separator: {
          height: 1,
          backgroundColor: colors.border,
          marginVertical: spacing.sm,
        },
        pointsTable: {
          gap: 2,
        },
        pointRow: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 4,
        },
        pointDot: {
          width: 8,
          height: 8,
          borderRadius: 4,
          marginRight: spacing.sm,
        },
        pointLabel: {
          fontFamily: typography.fontMono,
          fontSize: typography.size.sm,
          color: colors.textSecondary,
          width: 90,
        },
        pointH: {
          fontFamily: typography.fontMono,
          fontSize: typography.size.sm,
          color: colors.textPrimary,
          flex: 1,
        },
        pointP: {
          fontFamily: typography.fontMono,
          fontSize: typography.size.sm,
          color: colors.textMuted,
          width: 60,
          textAlign: 'right',
        },
        pointT: {
          fontFamily: typography.fontMono,
          fontSize: typography.size.sm,
          color: colors.textMuted,
          width: 52,
          textAlign: 'right',
        },
        tableHeader: {
          flexDirection: 'row',
          paddingVertical: 4,
          marginBottom: 2,
        },
        headerText: {
          fontFamily: typography.fontSans,
          fontSize: typography.size.xs,
          color: colors.textMuted,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        copBox: {
          backgroundColor: colors.accentSubtle,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.accent,
          padding: spacing.md,
          flexDirection: 'row',
          justifyContent: 'space-around',
          marginBottom: spacing.md,
        },
        copItem: { alignItems: 'center' },
        copValue: {
          fontFamily: typography.fontMono,
          fontSize: typography.size.xl,
          fontWeight: typography.weight.bold,
          color: colors.accent,
        },
        copLabel: {
          fontFamily: typography.fontSans,
          fontSize: typography.size.xs,
          color: colors.textSecondary,
          marginTop: 2,
        },
      }),
    [colors, spacing, radius, typography],
  );

  const POINT_COLORS: Record<1 | 2 | 3 | 4, string> = {
    1: colors.cycleEvap,
    2: colors.cycleComp,
    3: colors.cycleCond,
    4: colors.cycleExpand,
  };

  return (
    <Card>
      {/* COP + Compression ratio summary */}
      <View style={styles.copBox}>
        <View style={styles.copItem}>
          <Text style={styles.copValue}>{result.cop.toFixed(2)}</Text>
          <Text style={styles.copLabel}>COP</Text>
        </View>
        <View style={styles.copItem}>
          <Text style={styles.copValue}>{result.compressionRatio.toFixed(1)}</Text>
          <Text style={styles.copLabel}>Taux de compression</Text>
        </View>
        <View style={styles.copItem}>
          <Text style={styles.copValue}>{result.massFlowPerKW.toFixed(3)}</Text>
          <Text style={styles.copLabel}>kg/s par kW</Text>
        </View>
      </View>

      {/* Points table */}
      <SectionTitle title="Points du cycle" />

      <View style={styles.tableHeader}>
        <View style={{ width: 8 + 12 }} />
        <Text style={[styles.headerText, { width: 90 }]}>Point</Text>
        <Text style={[styles.headerText, { flex: 1 }]}>h (kJ/kg)</Text>
        <Text style={[styles.headerText, { width: 60, textAlign: 'right' }]}>P (bar)</Text>
        <Text style={[styles.headerText, { width: 52, textAlign: 'right' }]}>T (°C)</Text>
      </View>

      <View style={styles.pointsTable}>
        {result.points.map((pt) => (
          <View key={pt.id} style={styles.pointRow}>
            <View style={[styles.pointDot, { backgroundColor: POINT_COLORS[pt.id] }]} />
            <Text style={styles.pointLabel}>{POINT_DESCRIPTIONS[pt.id]}</Text>
            <Text style={styles.pointH}>{pt.enthalpyKJkg.toFixed(1)}</Text>
            <Text style={styles.pointP}>{pt.pressureBar.toFixed(2)}</Text>
            <Text style={styles.pointT}>{pt.temperatureC.toFixed(1)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.separator} />
      <SectionTitle title="Effets spécifiques" />

      <ResultRow
        label="Effet frigorifique  h₁ − h₄"
        value={result.refrigeratingEffect.toFixed(1)}
        unit="kJ/kg"
        valueColor="green"
      />
      <ResultRow
        label="Travail de compression  h₂ − h₁"
        value={result.compressionWork.toFixed(1)}
        unit="kJ/kg"
        valueColor="red"
      />
      <ResultRow
        label="Chaleur condenseur  h₂ − h₃"
        value={result.condenserHeat.toFixed(1)}
        unit="kJ/kg"
        valueColor="orange"
      />
    </Card>
  );
}
