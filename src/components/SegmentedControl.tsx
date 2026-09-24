import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: ViewStyle;
}

export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  style,
}: SegmentedControlProps<T>): React.JSX.Element {
  const { colors, spacing, radius, typography } = useAppTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flexDirection: 'row',
          backgroundColor: colors.bgSubtle,
          borderRadius: radius.sm,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 2,
        },
        option: {
          flex: 1,
          paddingVertical: spacing.sm,
          alignItems: 'center',
          borderRadius: radius.sm - 1,
        },
        activeOption: {
          backgroundColor: colors.accent,
        },
        label: {
          fontFamily: typography.fontSans,
          fontSize: typography.size.sm,
          color: colors.textMuted,
          fontWeight: typography.weight.medium,
        },
        activeLabel: {
          color: colors.textOnAccent,
        },
      }),
    [colors, spacing, radius, typography],
  );

  return (
    <View style={[styles.container, style]}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[styles.option, active && styles.activeOption]}
            onPress={() => onChange(opt.value)}
            activeOpacity={0.7}
          >
            <Text style={[styles.label, active && styles.activeLabel]}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
