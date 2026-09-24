import React, { useRef, useState, useEffect, useMemo } from 'react';
import { PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useAppTheme } from '../context/ThemeContext';

interface Props {
  label: string;
  sublabel?: string;
  width: number;
  height?: number;
  onCapture: (svg: string | null) => void;
}

function buildSvgString(paths: string[], w: number, h: number): string {
  const pathEls = paths
    .map((d) => `<path d="${d}" stroke="#1E293B" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" style="background:white">${pathEls}</svg>`;
}

export default function SignaturePad({ label, sublabel, width, height = 110, onCapture }: Props): React.JSX.Element {
  const { colors, spacing, radius, typography } = useAppTheme();

  const [completedPaths, setCompletedPaths] = useState<string[]>([]);
  const [currentPathStr, setCurrentPathStr] = useState('');
  const currentPathRef = useRef('');

  // Notify parent whenever completed paths change
  useEffect(() => {
    if (completedPaths.length === 0) {
      onCapture(null);
    } else {
      onCapture(buildSvgString(completedPaths, width, height));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedPaths]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        currentPathRef.current = `M${locationX.toFixed(1)},${locationY.toFixed(1)}`;
        setCurrentPathStr(currentPathRef.current);
      },
      onPanResponderMove: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        currentPathRef.current += ` L${locationX.toFixed(1)},${locationY.toFixed(1)}`;
        setCurrentPathStr(currentPathRef.current);
      },
      onPanResponderRelease: () => {
        const p = currentPathRef.current;
        if (p) {
          setCompletedPaths((prev) => [...prev, p]);
        }
        currentPathRef.current = '';
        setCurrentPathStr('');
      },
    }),
  ).current;

  function handleClear() {
    setCompletedPaths([]);
    setCurrentPathStr('');
    currentPathRef.current = '';
  }

  const isEmpty = completedPaths.length === 0 && !currentPathStr;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrapper: { marginBottom: spacing.sm },
        headerRow: {
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 4,
        },
        label: {
          fontFamily: typography.fontSans,
          fontSize: typography.size.xs,
          color: colors.textMuted,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        sublabel: {
          fontFamily: typography.fontSans,
          fontSize: typography.size.xs,
          color: colors.textMuted,
          marginLeft: spacing.xs,
        },
        clearBtn: {
          paddingHorizontal: spacing.sm,
          paddingVertical: 2,
        },
        clearText: {
          fontFamily: typography.fontSans,
          fontSize: typography.size.xs,
          color: colors.accent,
        },
        canvas: {
          width,
          height,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.sm,
          backgroundColor: colors.bgSubtle,
          overflow: 'hidden',
        },
        placeholder: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          alignItems: 'center',
          justifyContent: 'center',
        },
        placeholderText: {
          fontFamily: typography.fontSans,
          fontSize: typography.size.sm,
          color: colors.textMuted,
          fontStyle: 'italic',
        },
      }),
    [colors, spacing, radius, typography, width, height],
  );

  return (
    <View style={styles.wrapper}>
      <View style={styles.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <Text style={styles.label}>{label}</Text>
          {sublabel ? <Text style={styles.sublabel}>{sublabel}</Text> : null}
        </View>
        {!isEmpty && (
          <TouchableOpacity style={styles.clearBtn} onPress={handleClear} activeOpacity={0.7}>
            <Text style={styles.clearText}>Effacer</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.canvas} {...panResponder.panHandlers}>
        {isEmpty && (
          <View style={styles.placeholder} pointerEvents="none">
            <Text style={styles.placeholderText}>Signer ici</Text>
          </View>
        )}
        <Svg width={width} height={height}>
          {completedPaths.map((d, i) => (
            <Path
              key={i}
              d={d}
              stroke={colors.textPrimary}
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {currentPathStr ? (
            <Path
              d={currentPathStr}
              stroke={colors.textPrimary}
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
        </Svg>
      </View>
    </View>
  );
}
