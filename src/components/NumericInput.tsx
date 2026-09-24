import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';
import { useKeypadContext } from '../context/KeypadContext';

interface NumericInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  unit?: string;
  placeholder?: string;
  style?: ViewStyle;
  signed?: boolean;
  /** Explicit id for keypad focus tracking; defaults to label */
  id?: string;
}

export default function NumericInput({
  label,
  value,
  onChangeText,
  unit,
  placeholder,
  style,
  signed = false,
  id,
}: NumericInputProps): React.JSX.Element {
  const { colors, spacing, radius, typography } = useAppTheme();
  const { activeField, showKeypad } = useKeypadContext();

  const fieldId = id ?? label;
  const isFocused = activeField?.id === fieldId;

  // Local string buffer — keeps partial values like "0." alive during typing.
  // Only syncs from the prop when this field is NOT focused (avoids parseFloat round-trips).
  const [localValue, setLocalValue] = useState(value);
  useEffect(() => {
    if (!isFocused) setLocalValue(value);
  }, [value, isFocused]);

  // Refs always hold the latest value and handler — no stale closures.
  const valueRef = useRef(localValue);
  const onChangeRef = useRef(onChangeText);
  valueRef.current = localValue; // updated every render
  useEffect(() => { onChangeRef.current = onChangeText; }, [onChangeText]);

  // Stable onChange that updates the local buffer AND notifies parent.
  const stableOnChange = useCallback((v: string) => {
    setLocalValue(v);
    onChangeRef.current(v);
  }, []);

  const handlePress = useCallback(() => {
    showKeypad({ id: fieldId, valueRef, onChangeRef: { current: stableOnChange }, signed });
  }, [showKeypad, fieldId, signed, stableOnChange]);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      marginBottom: spacing.sm,
    },
    label: {
      fontFamily: typography.fontSans,
      fontSize: typography.size.sm,
      color: colors.textSecondary,
      marginBottom: spacing.xs,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    input: {
      flex: 1,
      height: 44,
      backgroundColor: colors.bgSubtle,
      borderWidth: isFocused ? 2 : 1,
      borderColor: isFocused ? colors.accent : colors.border,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      justifyContent: 'center',
    },
    inputText: {
      fontFamily: typography.fontMono,
      fontSize: typography.size.md,
      color: localValue ? colors.textPrimary : colors.textMuted,
    },
    unit: {
      marginLeft: spacing.sm,
      fontFamily: typography.fontMono,
      fontSize: typography.size.sm,
      color: colors.textMuted,
      minWidth: 36,
    },
  }), [colors, spacing, radius, typography, isFocused, localValue]);

  return (
    <View style={[styles.container, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.row}>
        <TouchableOpacity style={styles.input} onPress={handlePress} activeOpacity={0.8}>
          <Text style={styles.inputText}>
            {localValue !== '' ? localValue : (placeholder ?? '0')}
          </Text>
        </TouchableOpacity>
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
    </View>
  );
}
