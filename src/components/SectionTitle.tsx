import React, { useMemo } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';

interface SectionTitleProps {
  title: string;
  subtitle?: string;
  style?: ViewStyle;
}

export default function SectionTitle({
  title,
  subtitle,
  style,
}: SectionTitleProps): React.JSX.Element {
  const { colors, spacing, typography } = useAppTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          marginBottom: spacing.md,
        },
        title: {
          fontFamily: typography.fontSans,
          fontSize: typography.size.lg,
          fontWeight: typography.weight.semibold,
          color: colors.textPrimary,
          letterSpacing: 0.2,
        },
        subtitle: {
          fontFamily: typography.fontSans,
          fontSize: typography.size.sm,
          color: colors.textMuted,
          marginTop: 2,
        },
      }),
    [colors, spacing, typography],
  );

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}
