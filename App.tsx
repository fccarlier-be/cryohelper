import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { StyleSheet, Text, View } from 'react-native';
import { ThemeProvider, useAppTheme } from './src/context/ThemeContext';
import { ReportContextProvider } from './src/context/ReportContext';
import { KeypadProvider } from './src/context/KeypadContext';
import AppNavigator from './src/navigation/AppNavigator';

// ─── Root error boundary ─────────────────────────────────────────────────────

interface EBState { error: Error | null }

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  EBState
> {
  state: EBState = { error: null };
  static getDerivedStateFromError(e: Error): EBState { return { error: e }; }
  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, backgroundColor: '#060B17', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: '#EF4444', fontFamily: 'Courier New', fontSize: 13, textAlign: 'center' }}>
            {this.state.error.message}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

function RootApp(): React.JSX.Element {
  const { colors, mode } = useAppTheme();

  const navTheme = {
    ...(mode === 'light' ? DefaultTheme : DarkTheme),
    colors: {
      primary: colors.accent,
      background: colors.bg,
      card: colors.bg,
      text: colors.textPrimary,
      border: colors.border,
      notification: colors.accent,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={mode === 'light' ? 'dark' : 'light'} />
      <AppNavigator />
    </NavigationContainer>
  );
}

export default function App(): React.JSX.Element {
  return (
    <RootErrorBoundary>
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
          <ThemeProvider>
            <ReportContextProvider>
              <KeypadProvider>
                <RootApp />
              </KeypadProvider>
            </ReportContextProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </RootErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
