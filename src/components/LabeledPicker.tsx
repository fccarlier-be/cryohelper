/**
 * A simple labelled select control backed by a row of small buttons.
 * Used for enum-type inputs (InsulationLevel, RoomType, etc.).
 */
import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface LabeledPickerProps<T extends string> {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  style?: ViewStyle;
}

export default function LabeledPicker<T extends string>({
  label,
  options,
  value,
  onChange,
  style,
}: LabeledPickerProps<T>): React.JSX.Element {
  const { colors, spacing, radius, typography } = useAppTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { marginBottom: spacing.sm },
        label: {
          fontFamily: typography.fontSans,
          fontSize: typography.size.sm,
          color: colors.textSecondary,
          marginBottom: spacing.xs,
        },
        optionsRow: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: spacing.xs,
        },
        option: {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs + 2,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.bgSubtle,
        },
        activeOption: {
          backgroundColor: colors.accentSubtle,
          borderColor: colors.accent,
        },
        optionLabel: {
          fontFamily: typography.fontSans,
          fontSize: typography.size.sm,
          color: colors.textSecondary,
        },
        activeLabel: {
          color: colors.accent,
          fontWeight: typography.weight.medium,
        },
      }),
    [colors, spacing, radius, typography],
  );

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.optionsRow}>
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[styles.option, active && styles.activeOption]}
              onPress={() => onChange(opt.value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.optionLabel, active && styles.activeLabel]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
