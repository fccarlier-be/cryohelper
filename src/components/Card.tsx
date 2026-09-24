import React, { useMemo } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
}

export default function Card({ children, style, elevated = false }: CardProps): React.JSX.Element {
  const { colors, spacing, radius, shadow } = useAppTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: colors.card,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.md,
          ...(elevated ? shadow.card : {}),
        },
      }),
    [colors, spacing, radius, shadow, elevated],
  );

  return <View style={[styles.card, style]}>{children}</View>;
}
