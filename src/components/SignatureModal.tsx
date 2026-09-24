import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
 PanResponder } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useAppTheme } from '../context/ThemeContext';

interface Props {
  visible: boolean;
  label: string;
  sublabel?: string;
  onConfirm: (svg: string | null) => void;
  onCancel: () => void;
}

function buildSvg(paths: string[], w: number, h: number): string {
  const els = paths
    .map((d) => `<path d="${d}" stroke="#1E293B" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`)
    .join('');
  // viewBox preserves the drawing geometry; width/height 100% lets the PDF container control the size.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" width="100%" height="100%" style="display:block;background:white;">${els}</svg>`;
}

export default function SignatureModal({ visible, label, sublabel, onConfirm, onCancel }: Props): React.JSX.Element {
  const { colors, spacing } = useAppTheme();
  const insets = useSafeAreaInsets();

  const [paths, setPaths] = useState<string[]>([]);
  const [current, setCurrent] = useState('');
  const currentRef = useRef('');
  const [size, setSize] = useState({ w: 0, h: 0 });

  // Reset canvas each time the modal opens
  useEffect(() => {
    if (visible) {
      setPaths([]);
      setCurrent('');
      currentRef.current = '';
    }
  }, [visible]);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: (e) => {
        const { locationX: x, locationY: y } = e.nativeEvent;
        currentRef.current = `M${x.toFixed(1)},${y.toFixed(1)}`;
        setCurrent(currentRef.current);
      },
      onPanResponderMove: (e) => {
        const { locationX: x, locationY: y } = e.nativeEvent;
        currentRef.current += ` L${x.toFixed(1)},${y.toFixed(1)}`;
        setCurrent(currentRef.current);
      },
      onPanResponderRelease: () => {
        const p = currentRef.current;
        if (p) setPaths((prev) => [...prev, p]);
        currentRef.current = '';
        setCurrent('');
      },
    }),
  ).current;

  const isEmpty = paths.length === 0 && !current;

  function handleConfirm() {
    const svg = paths.length > 0 ? buildSvg(paths, size.w, size.h) : null;
    onConfirm(svg);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={{ flex: 1, backgroundColor: '#FFFFFF', paddingTop: insets.top, paddingBottom: insets.bottom }}>

        {/* Header */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: '#E2E8F0',
        }}>
          <TouchableOpacity onPress={onCancel} style={{ minWidth: 70 }}>
            <Text style={{ fontSize: 16, color: '#64748B' }}>Annuler</Text>
          </TouchableOpacity>

          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}>{label}</Text>
            {sublabel ? (
              <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 1 }}>{sublabel}</Text>
            ) : null}
          </View>

          <TouchableOpacity onPress={handleConfirm} style={{ minWidth: 70, alignItems: 'flex-end' }}>
            <Text style={{
              fontSize: 16,
              fontWeight: '700',
              color: isEmpty ? '#CBD5E1' : colors.accent,
            }}>Valider</Text>
          </TouchableOpacity>
        </View>

        {/* Instruction */}
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm }}>
          <Text style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center' }}>
            Signez dans la zone ci-dessous
          </Text>
        </View>

        {/* Canvas — fixed landscape height matches PDF signature box ratio */}
        <View
          style={{
            height: 200,
            margin: spacing.lg,
            borderWidth: 1.5,
            borderColor: '#CBD5E1',
            borderRadius: 10,
            backgroundColor: '#F8FAFC',
            overflow: 'hidden',
          }}
          onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
          {...pan.panHandlers}
        >
          {isEmpty && (
            <View style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              alignItems: 'center', justifyContent: 'center',
            }} pointerEvents="none">
              <Text style={{ color: '#CBD5E1', fontSize: 18, fontStyle: 'italic' }}>Signature</Text>
            </View>
          )}
          {size.w > 0 && (
            <Svg width={size.w} height={size.h}>
              {paths.map((d, i) => (
                <Path key={i} d={d} stroke="#0F172A" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              ))}
              {current ? (
                <Path d={current} stroke="#0F172A" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              ) : null}
            </Svg>
          )}
        </View>

        {/* Footer */}
        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => { setPaths([]); setCurrent(''); currentRef.current = ''; }}
            disabled={isEmpty}
            style={{ opacity: isEmpty ? 0.35 : 1, paddingVertical: spacing.sm }}
          >
            <Text style={{ fontSize: 14, color: colors.accent }}>Effacer la signature</Text>
          </TouchableOpacity>
        </View>

      </View>
    </Modal>
  );
}
