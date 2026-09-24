import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';
import { useKeypadContext } from '../context/KeypadContext';

function applyKey(current: string, key: string, signed: boolean): string {
  if (key === '⌫') return current.slice(0, -1);
  if (key === '±') {
    if (!signed) return current;
    return current.startsWith('-') ? current.slice(1) : '-' + current;
  }
  if (key === '.') {
    if (current.includes('.')) return current;
    if (current === '' || current === '-') return current + '0.';
    return current + '.';
  }
  // digit
  if (current === '0') return key;
  if (current === '-0') return '-' + key;
  return current + key;
}

const KEY_HEIGHT = 52;

export default function NumericKeypad(): React.JSX.Element | null {
  const { activeField, hideKeypad } = useKeypadContext();
  const { colors, spacing, radius, typography } = useAppTheme();

  const styles = useMemo(() => StyleSheet.create({
    container: {
      backgroundColor: colors.bgSubtle,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingHorizontal: spacing.xs,
      paddingTop: spacing.xs,
      paddingBottom: spacing.xs,
    },
    body: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    leftGrid: {
      flex: 3,
      gap: spacing.xs,
    },
    row: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    rightCol: {
      flex: 1,
      gap: spacing.xs,
    },
    key: {
      flex: 1,
      height: KEY_HEIGHT,
      backgroundColor: colors.card,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    keySpecial: {
      backgroundColor: colors.bg,
      borderColor: colors.borderSubtle,
    },
    keyTallDelete: {
      flex: 1,
      backgroundColor: colors.bg,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    keyTallConfirm: {
      flex: 1,
      backgroundColor: colors.accent,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    keyText: {
      fontFamily: typography.fontSans,
      fontSize: 22,
      fontWeight: '400',
      color: colors.textPrimary,
    },
    keyTextSpecial: {
      fontSize: 18,
      color: colors.textSecondary,
    },
    keyDisabled: {
      opacity: 0.25,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingHorizontal: spacing.xs,
      paddingBottom: spacing.xs,
    },
    closeBtn: {
      padding: spacing.xs,
    },
  }), [colors, spacing, radius, typography]);

  if (!activeField) return null;

  const { signed, valueRef, onChangeRef } = activeField;

  function press(key: string) {
    const newVal = applyKey(valueRef.current, key, signed);
    onChangeRef.current(newVal);
  }

  function Key({ k, special, disabled }: { k: string; special?: boolean; disabled?: boolean }) {
    return (
      <TouchableOpacity
        style={[styles.key, special && styles.keySpecial, disabled && styles.keyDisabled]}
        onPress={() => !disabled && press(k)}
        activeOpacity={0.6}
      >
        <Text style={[styles.keyText, special && styles.keyTextSpecial]}>{k}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.closeBtn} onPress={hideKeypad} activeOpacity={0.6}>
          <Ionicons name="close" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
      <View style={styles.body}>
        <View style={styles.leftGrid}>
          <View style={styles.row}>
            <Key k="1" /><Key k="2" /><Key k="3" />
          </View>
          <View style={styles.row}>
            <Key k="4" /><Key k="5" /><Key k="6" />
          </View>
          <View style={styles.row}>
            <Key k="7" /><Key k="8" /><Key k="9" />
          </View>
          <View style={styles.row}>
            <Key k="±" special disabled={!signed} />
            <Key k="0" />
            <Key k="." special />
          </View>
        </View>

        <View style={styles.rightCol}>
          <TouchableOpacity
            style={styles.keyTallDelete}
            onPress={() => press('⌫')}
            activeOpacity={0.6}
          >
            <Ionicons name="backspace-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.keyTallConfirm}
            onPress={() => {
              const fn = activeField.onConfirmRef?.current;
              fn ? fn() : hideKeypad();
            }}
            activeOpacity={0.6}
          >
            <Ionicons name="return-down-back-outline" size={22} color={colors.textOnAccent} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
