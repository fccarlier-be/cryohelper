import React, { useEffect, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';
import DiagramCanvas from './DiagramCanvas';
import type { CycleResult } from '../../types/enthalpy';
import type { FluidTable } from '../../types/fluidTable';

interface Props {
  visible: boolean;
  onClose: () => void;
  table: FluidTable | null;
  cycleResult: CycleResult | null;
  isobarLow?: number;
  isobarHigh?: number;
}

export default function DiagramFullscreenModal({
  visible,
  onClose,
  table,
  cycleResult,
  isobarLow,
  isobarHigh,
}: Props): React.JSX.Element {
  const { width, height } = useWindowDimensions();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (visible) {
      setReady(false);
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).then(() => {
        // Small delay so dimensions have time to update after rotation
        setTimeout(() => setReady(true), 150);
      });
    } else {
      setReady(false);
      ScreenOrientation.unlockAsync();
    }
    return () => { ScreenOrientation.unlockAsync(); };
  }, [visible]);

  // After landscape lock, the larger dimension becomes the width
  const diagW = Math.max(width, height);
  const diagH = Math.min(width, height);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
      supportedOrientations={['landscape', 'landscape-left', 'landscape-right']}
    >
      <View style={styles.container}>
        {ready && (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            maximumZoomScale={4}
            minimumZoomScale={1}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            centerContent
            bouncesZoom
          >
            <DiagramCanvas
              table={table}
              cycleResult={cycleResult}
              width={diagW}
              height={diagH}
              isobarLow={isobarLow}
              isobarHigh={isobarHigh}
            />
          </ScrollView>
        )}

        <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
          <Ionicons name="close" size={22} color="white" />
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
