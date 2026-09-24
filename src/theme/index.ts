/**
 * CryoHelper design system.
 * Three theme modes: dark (default), intermediate, light.
 * Inspired by ElectroTrainer but tuned for outdoor-readable technical data.
 *
 * Key choices:
 *  - Dark default: technicians often work in dim machine rooms
 *  - High contrast accent (cyan instead of gold) → better readability on P-h diagrams
 *  - Spacing/radius/typography are theme-agnostic constants
 */

// ─── Colour palettes ───────────────────────────────────────────────────────

export interface ThemeColors {
  bg: string;
  bgSubtle: string;
  card: string;
  cardDeep: string;
  border: string;
  borderSubtle: string;

  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textOnAccent: string;

  /** Primary action colour */
  accent: string;
  accentSubtle: string;

  /** Semantic colours for values / states */
  blue: string;
  green: string;
  orange: string;
  red: string;
  yellow: string;

  /** P-h diagram cycle point colours */
  cycleEvap: string;
  cycleComp: string;
  cycleCond: string;
  cycleExpand: string;
  cycleDome: string;
}

const darkColors: ThemeColors = {
  bg: '#060B17',
  bgSubtle: '#090F1E',
  card: '#0D1526',
  cardDeep: '#080D1A',
  border: '#192038',
  borderSubtle: '#0F1A2E',

  textPrimary: '#D8ECF8',
  textSecondary: '#7A9AB8',
  textMuted: '#3D5570',
  textOnAccent: '#020810',

  accent: '#00D4FF',
  accentSubtle: '#003A4D',

  blue: '#3B82F6',
  green: '#10B981',
  orange: '#F59E0B',
  red: '#EF4444',
  yellow: '#F5C518',

  cycleEvap: '#10B981',
  cycleComp: '#EF4444',
  cycleCond: '#F59E0B',
  cycleExpand: '#3B82F6',
  cycleDome: '#4A607A',
};

const interColors: ThemeColors = {
  bg: '#111827',
  bgSubtle: '#161F2E',
  card: '#1F2A3D',
  cardDeep: '#131C2E',
  border: '#2D3F58',
  borderSubtle: '#1A2840',

  textPrimary: '#E8F4FF',
  textSecondary: '#94A8BF',
  textMuted: '#5A7290',
  textOnAccent: '#020810',

  accent: '#00BFDF',
  accentSubtle: '#002D3A',

  blue: '#60A5FA',
  green: '#34D399',
  orange: '#FBBF24',
  red: '#F87171',
  yellow: '#FCD34D',

  cycleEvap: '#34D399',
  cycleComp: '#F87171',
  cycleCond: '#FBBF24',
  cycleExpand: '#60A5FA',
  cycleDome: '#5A7290',
};

const lightColors: ThemeColors = {
  bg: '#F0F4FA',
  bgSubtle: '#E4EBF5',
  card: '#FFFFFF',
  cardDeep: '#EAF0FA',
  border: '#C8D5E8',
  borderSubtle: '#DDE6F2',

  textPrimary: '#0A1628',
  textSecondary: '#3A5070',
  textMuted: '#7090B0',
  textOnAccent: '#FFFFFF',

  accent: '#0088AA',
  accentSubtle: '#CCE8F0',

  blue: '#1D4ED8',
  green: '#059669',
  orange: '#D97706',
  red: '#DC2626',
  yellow: '#B45309',

  cycleEvap: '#059669',
  cycleComp: '#DC2626',
  cycleCond: '#D97706',
  cycleExpand: '#1D4ED8',
  cycleDome: '#7090B0',
};

// ─── Spacing ────────────────────────────────────────────────────────────────

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

// ─── Border radius ───────────────────────────────────────────────────────────

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  pill: 99,
} as const;

// ─── Typography ──────────────────────────────────────────────────────────────

export const typography = {
  /** Monospace for all numeric data — avoids layout shifts when values change */
  fontMono: 'Courier New',
  fontSans: 'System',

  size: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 26,
  },

  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
} as const;

// ─── Shadow ──────────────────────────────────────────────────────────────────

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
} as const;

// ─── Theme objects ───────────────────────────────────────────────────────────

export type ThemeMode = 'dark' | 'intermediate' | 'light';

export interface Theme {
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  shadow: typeof shadow;
  mode: ThemeMode;
}

export const THEME_MODES: Array<{ key: ThemeMode; label: string; icon: string }> = [
  { key: 'dark', label: 'Sombre', icon: 'moon' },
  { key: 'intermediate', label: 'Intermédiaire', icon: 'contrast' },
  { key: 'light', label: 'Clair', icon: 'sunny' },
];

export function buildTheme(mode: ThemeMode): Theme {
  const colors =
    mode === 'light' ? lightColors : mode === 'intermediate' ? interColors : darkColors;

  return { colors, spacing, radius, typography, shadow, mode };
}
