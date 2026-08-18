// Color-blind safe high-contrast palette
// Primary: Electric Blue (safe for all types of color blindness)
// Accent: Bright Yellow (high contrast against dark backgrounds)
// Status indicators use BOTH color AND shape/icon to be accessible
export const colors = {
  primary: '#0066FF',         // Electric Blue — safe for all color blindness types
  primaryForeground: '#FFFFFF',
  secondary: '#1A1A2E',       // Deep navy
  secondaryForeground: '#FFFFFF',
  accent: '#F5C400',          // Bright Yellow — high contrast, distinct from blue
  accentForeground: '#0A0A0A',
  background: '#0A0A0F',      // Near-black
  backgroundSecondary: '#13131A',
  backgroundCard: '#16161F',
  text: '#FFFFFF',
  textSecondary: '#B0B0C8',
  textTertiary: '#6B6B85',
  border: 'rgba(255,255,255,0.1)',
  borderAccent: 'rgba(0,102,255,0.4)',
  error: '#FF4444',           // Bright red — still readable with contrast
  success: '#0066FF',         // Use blue for success (avoid green)
  warning: '#F5C400',         // Yellow for warning/pending
  info: '#00BFFF',            // Cyan-blue for info
  shadow: '#000000',
  // Semantic status colors — always paired with icons in UI
  statusPending: '#F5C400',   // Yellow
  statusDone: '#0066FF',      // Blue
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const borderRadius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const typography = {
  display: {
    fontSize: 40,
    fontWeight: '700',
    lineHeight: 48,
  },
  h1: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 38,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 30,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 26,
  },
  h4: {
    fontSize: 18,
    fontWeight: '500',
    lineHeight: 24,
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 22,
  },
  bodyBold: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  small: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 18,
  },
};

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
};

export const iconSize = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  xxl: 40,
};
