import React, { useMemo } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';
import BoreasIcon from '../components/BoreasIcon';

// Screens
import ThermalScreen from '../features/thermal/ThermalScreen';
import EnthalpyScreen from '../features/enthalpy/EnthalpyScreen';
import CalculationsScreen from '../features/calculations/CalculationsScreen';
import DiagnosticScreen from '../features/diagnostic/DiagnosticScreen';
import ReportScreen from '../features/report/ReportScreen';
import SettingsScreen from '../features/settings/SettingsScreen';
import FeedbackScreen from '../features/settings/FeedbackScreen';
import LegalScreen from '../features/settings/LegalScreen';
import HistoryScreen from '../features/history/HistoryScreen';
import CopilotScreen from '../features/copilot/CopilotScreen';

// ─── Stack navigator types ────────────────────────────────────────────────────

export type SettingsStackParamList = {
  SettingsMain: undefined;
  Feedback: undefined;
  Legal: undefined;
  History: undefined;
};

// ─── Shared stack options ─────────────────────────────────────────────────────

const Stack = createNativeStackNavigator<SettingsStackParamList>();

function SettingsStack(): React.JSX.Element {
  const { colors } = useAppTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="SettingsMain" component={SettingsScreen} />
      <Stack.Screen name="Feedback" component={FeedbackScreen} />
      <Stack.Screen name="Legal" component={LegalScreen} />
      <Stack.Screen name="History" component={HistoryScreen} />
    </Stack.Navigator>
  );
}

// ─── Bottom tab navigator ─────────────────────────────────────────────────────

const Tab = createBottomTabNavigator();

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

export default function AppNavigator(): React.JSX.Element {
  const { colors, typography } = useAppTheme();

  const tabBarStyle = useMemo(
    () => ({
      backgroundColor: colors.cardDeep,
      borderTopColor: colors.border,
      paddingTop: 6,
    }),
    [colors],
  );

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontFamily: typography.fontSans,
          fontSize: 10,
          letterSpacing: 0.3,
        },
        tabBarIcon: ({ color, size }) => {
          if (route.name === 'Boreas') {
            return <BoreasIcon size={size} color={color} />;
          }
          const icons: Record<string, IoniconsName> = {
            Bilan: 'thermometer-outline',
            Diagramme: 'analytics-outline',
            Calculs: 'calculator-outline',
            Diagnostic: 'pulse-outline',
            Rapport: 'document-text-outline',
            Réglages: 'settings-outline',
          };
          const name: IoniconsName = icons[route.name] ?? 'ellipse-outline';
          return <Ionicons name={name} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Bilan"
        component={ThermalScreen}
        options={{ tabBarLabel: 'Bilan' }}
      />
      <Tab.Screen
        name="Diagramme"
        component={EnthalpyScreen}
        options={{ tabBarLabel: 'Diagramme P-h' }}
      />
      <Tab.Screen
        name="Calculs"
        component={CalculationsScreen}
        options={{ tabBarLabel: 'Calculs' }}
      />
      <Tab.Screen
        name="Diagnostic"
        component={DiagnosticScreen}
        options={{ tabBarLabel: 'Diagnostic' }}
      />
      <Tab.Screen
        name="Rapport"
        component={ReportScreen}
        options={{ tabBarLabel: 'Rapport' }}
      />
      <Tab.Screen
        name="Boreas"
        component={CopilotScreen}
        options={{ tabBarLabel: 'Boreas' }}
      />
      <Tab.Screen
        name="Réglages"
        component={SettingsStack}
        options={{ tabBarLabel: 'Réglages' }}
      />
    </Tab.Navigator>
  );
}
