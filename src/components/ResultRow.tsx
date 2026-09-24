import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';

interface ResultRowProps {
  label: string;
  value: string;
  unit?: string;
  highlighted?: boolean;
  /** Colour key from ThemeColors */
  valueColor?: 'accent' | 'green' | 'orange' | 'red' | 'blue' | 'textPrimary';
}

export default function ResultRow({
  label,
  value,
  unit,
  highlighted = false,
  valueColor = 'textPrimary',
}: ResultRowProps): React.JSX.Element {
  const { colors, spacing, radius, typography } = useAppTheme();

  const resolvedColor = colors[valueColor] ?? colors.textPrimary;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: spacing.sm,
          paddingHorizontal: highlighted ? spacing.md : 0,
          borderRadius: highlighted ? radius.sm : 0,
          backgroundColor: highlighted ? colors.accentSubtle : 'transparent',
          marginBottom: 2,
        },
        label: {
          fontFamily: typography.fontSans,
          fontSize: highlighted ? typography.size.md : typography.size.sm,
          color: highlighted ? colors.textPrimary : colors.textSecondary,
          flex: 1,
          flexWrap: 'wrap',
          paddingRight: spacing.sm,
        },
        valueRow: {
          flexDirection: 'row',
          alignItems: 'baseline',
        },
        value: {
          fontFamily: typography.fontMono,
          fontSize: highlighted ? typography.size.lg : typography.size.md,
          color: highlighted ? colors.accent : resolvedColor,
          fontWeight: highlighted ? typography.weight.bold : typography.weight.medium,
        },
        unit: {
          fontFamily: typography.fontMono,
          fontSize: typography.size.xs,
          color: colors.textMuted,
          marginLeft: 3,
        },
      }),
    [colors, spacing, radius, typography, highlighted, resolvedColor],
  );

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueRow}>
        <Text style={styles.value}>{value}</Text>
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
    </View>
  );
}
