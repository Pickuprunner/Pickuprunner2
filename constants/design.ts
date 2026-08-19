/**
 * ==============================================================================
 *  MIDNIGHT TECH NOIR DESIGN SYSTEM
 * ==============================================================================
 *
 *  BRAND & STYLE:
 *  - Engineered for high-velocity on-demand logistics under varying light conditions.
 *  - Modern Minimalism + Glassmorphism for sophisticated dark-depth aesthetics.
 *  - Authoritative, precise, high-tech "cockpit" experience.
 *
 *  COLOR ARCHITECTURE:
 *  - Primary (Electric Cobalt / #0066FF & #B3C5FF): High-priority actions ("Accept Delivery", "Start Route").
 *  - Secondary (Amber Gold / #F4C300 & #FFE399): Financial indicators, earnings, tips.
 *  - Tertiary (Emerald Mint / #00E297 & #008255): "Online" status, successful verifications, milestones.
 *  - Base Surface (Deep Obsidian / #0F131C): Solid base layer.
 *
 *  ELEVATION & DEPTH (Glassmorphism & Tonal Layering):
 *  - Level 1 (Base): Solid Deep Obsidian (#0F131C / #090D16).
 *  - Level 2 (Cards): 4% White with 1px border (8% White).
 *  - Level 3 (Modals/Popovers): 8% White with 1px border (12% White).
 *  - Interactive Depth: 12% glass layer on press.
 *
 *  SHAPES & RADIUS:
 *  - Buttons: Fully rounded (pill / 9999px).
 *  - Cards: 16px-32px (rounded-lg to rounded-xl) soft encapsulated modules.
 *  - Inputs: 12px corner radius.
 * ==============================================================================
 */

export const colors = {
  // Surfaces & Base
  background: '#0F131C',
  surface: '#0F131C',
  surfaceDim: '#0F131C',
  surfaceBright: '#353943',
  surfaceContainerLowest: '#0A0E17',
  surfaceContainerLow: '#181B25',
  surfaceContainer: '#1C1F29',
  surfaceContainerHigh: '#262A34',
  surfaceContainerHighest: '#31353F',
  surfaceVariant: '#31353F',
  surfaceTint: '#B3C5FF',

  // Text & Content Contrast
  onSurface: '#DFE2EF',
  onSurfaceVariant: '#C2C6D8',
  onBackground: '#DFE2EF',
  inverseSurface: '#DFE2EF',
  inverseOnSurface: '#2C303A',
  outline: '#8C90A1',
  outlineVariant: '#424656',

  // Primary — Electric Cobalt
  primary: '#B3C5FF',
  onPrimary: '#002B75',
  primaryContainer: '#0066FF',
  onPrimaryContainer: '#F8F7FF',
  inversePrimary: '#0054D6',
  primaryFixed: '#DAE1FF',
  primaryFixedDim: '#B3C5FF',
  onPrimaryFixed: '#001849',
  onPrimaryFixedVariant: '#003FA4',

  // Secondary — Amber Gold
  secondary: '#FFE399',
  onSecondary: '#3D2F00',
  secondaryContainer: '#F4C300',
  onSecondaryContainer: '#685200',
  secondaryFixed: '#FFE08B',
  secondaryFixedDim: '#F1C100',
  onSecondaryFixed: '#241A00',
  onSecondaryFixedVariant: '#584400',

  // Tertiary — Emerald Mint
  tertiary: '#00E297',
  onTertiary: '#003822',
  tertiaryContainer: '#008255',
  onTertiaryContainer: '#E0FFEA',
  tertiaryFixed: '#4DFFB2',
  tertiaryFixedDim: '#00E297',
  onTertiaryFixed: '#002112',
  onTertiaryFixedVariant: '#005234',

  // Error & Critical States
  error: '#FFB4AB',
  onError: '#690005',
  errorContainer: '#93000A',
  onErrorContainer: '#FFDAD6',

  // Glassmorphic Layering
  glassLevel2Bg: 'rgba(255, 255, 255, 0.04)',
  glassLevel2Border: 'rgba(255, 255, 255, 0.08)',
  glassLevel3Bg: 'rgba(255, 255, 255, 0.08)',
  glassLevel3Border: 'rgba(255, 255, 255, 0.12)',
  glassInteractive: 'rgba(255, 255, 255, 0.12)',

  // Backward compatibility mappings
  accent: '#F4C300',
  accentForeground: '#0A0A0A',
  primaryForeground: '#FFFFFF',
  secondaryForeground: '#FFFFFF',
  success: '#00E297',
  warning: '#F4C300',
  orange: '#F97316',
  info: '#B3C5FF',
  shadow: '#000000',
  card: '#161922',
  cardCustomer: '#14161F',
  cardDriver: '#101524',
  cardAccepted: '#0E1A2E',
  cardPickedUp: '#1F150A',
  text: '#DFE2EF',
  textSecondary: '#C2C6D8',
  textTertiary: '#8C90A1',
  textMuted: 'rgba(223, 226, 239, 0.65)',
  textDim: 'rgba(223, 226, 239, 0.40)',
  border: 'rgba(255, 255, 255, 0.08)',
  borderSubtle: 'rgba(255, 255, 255, 0.10)',
  borderStrong: 'rgba(255, 255, 255, 0.15)',
  borderAccent: 'rgba(0, 102, 255, 0.4)',

  // Alpha Tints
  primaryAlpha08: 'rgba(0, 102, 255, 0.08)',
  primaryAlpha12: 'rgba(0, 102, 255, 0.12)',
  primaryAlpha15: 'rgba(0, 102, 255, 0.15)',
  primaryAlpha20: 'rgba(0, 102, 255, 0.20)',
  primaryAlpha25: 'rgba(0, 102, 255, 0.25)',
  primaryAlpha30: 'rgba(0, 102, 255, 0.30)',
  primaryAlpha35: 'rgba(0, 102, 255, 0.35)',
  primaryAlpha40: 'rgba(0, 102, 255, 0.40)',
  primaryAlpha45: 'rgba(0, 102, 255, 0.45)',

  accentAlpha12: 'rgba(244, 195, 0, 0.12)',
  accentAlpha15: 'rgba(244, 195, 0, 0.15)',
  accentAlpha20: 'rgba(244, 195, 0, 0.20)',
  accentAlpha25: 'rgba(244, 195, 0, 0.25)',
  accentAlpha30: 'rgba(244, 195, 0, 0.30)',
  accentAlpha35: 'rgba(244, 195, 0, 0.35)',
  accentAlpha40: 'rgba(244, 195, 0, 0.40)',

  greenAlpha10: 'rgba(0, 226, 151, 0.10)',
  greenAlpha15: 'rgba(0, 226, 151, 0.15)',
  greenAlpha30: 'rgba(0, 226, 151, 0.30)',
  greenAlpha40: 'rgba(0, 226, 151, 0.40)',

  orangeAlpha18: 'rgba(249, 115, 22, 0.18)',
  orangeAlpha50: 'rgba(249, 115, 22, 0.50)',

  statusPending: '#F4C300',
  statusDone: '#0066FF',
};

export const gradients = {
  heroGlow: ['rgba(0, 102, 255, 0.38)', 'rgba(0, 60, 160, 0.12)', 'rgba(15, 19, 28, 0)'] as const,
  heroGlowLocations: [0, 0.55, 1] as const,
  hero: ['#000A1A', '#003380', '#0066FF', '#0F131C'] as const,
  heroLocations: [0, 0.3, 0.65, 1] as const,
  header: ['#000A1A', '#003380', '#0066FF'] as const,
};

export const spacing = {
  unit: 4,
  xs: 4,
  sm: 8,
  md: 16,
  gutter: 16,
  marginMobile: 20,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const borderRadius = {
  none: 0,
  xs: 4,
  sm: 8,
  DEFAULT: 16,
  md: 24,
  lg: 32,
  xl: 48,
  full: 9999,
};

export const typography = {
  headlineLg: {
    fontFamily: 'Inter',
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
    letterSpacing: -0.64,
  },
  headlineLgMobile: {
    fontFamily: 'Inter',
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  headlineMd: {
    fontFamily: 'Inter',
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
    letterSpacing: -0.24,
  },
  headlineSm: {
    fontFamily: 'Inter',
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  bodyLg: {
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: '400' as const,
    lineHeight: 26,
  },
  bodyMd: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodySm: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  labelLg: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
    letterSpacing: 0.28,
  },
  labelMd: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
    letterSpacing: 1.5,
  },
  // Aliases for Tamagui / mobile UI
  display: { fontSize: 40, fontWeight: '700' as const, lineHeight: 48 },
  h1: { fontSize: 32, fontWeight: '700' as const, lineHeight: 38 },
  h2: { fontSize: 24, fontWeight: '600' as const, lineHeight: 30 },
  h3: { fontSize: 20, fontWeight: '600' as const, lineHeight: 26 },
  h4: { fontSize: 18, fontWeight: '500' as const, lineHeight: 24 },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 22 },
  bodyBold: { fontSize: 16, fontWeight: '600' as const, lineHeight: 22 },
  caption: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  small: { fontSize: 12, fontWeight: '400' as const, lineHeight: 18 },
};

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  goldGlow: {
    shadowColor: '#F4C300',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  cobaltGlow: {
    shadowColor: '#0066FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
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
  xxl: 44,
};
