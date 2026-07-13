// ============================================================
// RALLY MOBILE - DESIGN TOKENS + useTheme
// One source of truth for color, spacing, radius, and type.
// Honors the system light/dark scheme. Import { useTheme } and
// read t.colors.* / t.space.* / t.radius.* / t.type.* everywhere.
// NEVER hardcode a hex in a screen - add a token here instead.
// ============================================================
import { useColorScheme } from 'react-native';

// Brand constants (identical across schemes).
const ACCENT = '#5b4bf5';
const ACCENT_SOFT = '#7d70f7';
const INK = '#12151c';

// Shared, scheme-independent tokens.
const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };
const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 };

// Type scale. Big and readable - Rally leans confident, not tiny.
const type = {
  display: { fontSize: 34, fontWeight: '800', letterSpacing: -0.5 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.3 },
  h2: { fontSize: 21, fontWeight: '700', letterSpacing: -0.2 },
  h3: { fontSize: 18, fontWeight: '700' },
  body: { fontSize: 17, fontWeight: '400' },
  bodyStrong: { fontSize: 17, fontWeight: '600' },
  label: { fontSize: 15, fontWeight: '600' },
  small: { fontSize: 14, fontWeight: '500' },
  micro: { fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },
  stat: { fontSize: 40, fontWeight: '800', letterSpacing: -1 },
};

const light = {
  scheme: 'light',
  colors: {
    accent: ACCENT,
    accentSoft: ACCENT_SOFT,
    accentInk: '#ffffff',
    accentWash: '#eeecfe',
    bg: '#f5f6f9',
    surface: '#ffffff',
    surfaceAlt: '#f0f1f5',
    card: '#ffffff',
    border: '#e4e6ec',
    borderStrong: '#d3d6df',
    text: INK,
    textMuted: '#5c6270',
    textFaint: '#8b909c',
    onAccent: '#ffffff',
    good: '#16a34a',
    goodWash: '#dcfce7',
    warn: '#d97706',
    warnWash: '#fef3c7',
    bad: '#dc2626',
    badWash: '#fee2e2',
    info: '#2563eb',
    infoWash: '#dbeafe',
    shadow: '#0b0d12',
  },
  space,
  radius,
  type,
};

const dark = {
  scheme: 'dark',
  colors: {
    accent: ACCENT,
    accentSoft: ACCENT_SOFT,
    accentInk: '#ffffff',
    accentWash: '#211d3d',
    bg: '#0c0e13',
    surface: '#12151c',
    surfaceAlt: '#171b24',
    card: '#161a22',
    border: '#242a36',
    borderStrong: '#323a49',
    text: '#f3f4f7',
    textMuted: '#a5abba',
    textFaint: '#6f7686',
    onAccent: '#ffffff',
    good: '#4ade80',
    goodWash: '#0f2e1c',
    warn: '#fbbf24',
    warnWash: '#33270a',
    bad: '#f87171',
    badWash: '#3a1414',
    info: '#60a5fa',
    infoWash: '#122238',
    shadow: '#000000',
  },
  space,
  radius,
  type,
};

export const themes = { light, dark };

// Hook: returns the active theme object based on system color scheme.
export function useTheme() {
  const scheme = useColorScheme();
  return scheme === 'dark' ? dark : light;
}

// Non-hook accessor for modules that cannot use hooks (defaults to light).
export function getTheme(scheme) {
  return scheme === 'dark' ? dark : light;
}

export { ACCENT, INK };
