// African-inspired color palette for Afro AI

export const COLORS = {
  // Primary palette - Warm sunset oranges
  primary: '#E85A2B',
  primaryLight: '#FF8A65',
  primaryDark: '#C43E00',

  // Secondary - Deep ocean blue
  secondary: '#1A3A5C',
  secondaryLight: '#4A6D8C',
  secondaryDark: '#0D2440',

  // Accent colors - Inspired by African textiles
  accent: '#FFB347',
  accentGold: '#D4A84B',
  accentTeal: '#20B2AA',
  accentMagenta: '#C73E6E',

  // Earth tones
  earthBrown: '#8B4513',
  earthGreen: '#2D5016',
  earthRed: '#A52A2A',

  // UI Colors
  background: '#0F1419',
  backgroundLight: '#1A2332',
  surface: '#1E2A3A',
  surfaceLight: '#2A3A4D',
  surfaceLighter: '#354759',

  // Text colors
  text: '#F7F9FC',
  textSecondary: '#8899A6',
  textMuted: '#536471',

  // Borders
  border: '#2F3336',
  borderLight: '#3D4449',

  // Status colors
  success: '#17BF63',
  successLight: '#1CE077',
  error: '#E0245E',
  errorLight: '#FF4081',
  warning: '#FFAD1F',
  info: '#1DA1F2',

  // Conversation states
  userSpeaking: '#1DA1F2',
  aiSpeaking: '#17BF63',
  idle: '#536471',

  // Gradient colors
  gradientOrange: ['#E85A2B', '#FF8A65'],
  gradientSunset: ['#E85A2B', '#FFB347', '#D4A84B'],
  gradientOcean: ['#1A3A5C', '#20B2AA'],
  gradientNight: ['#0F1419', '#1A2332', '#2A3A4D'],
  gradientGold: ['#D4A84B', '#FFB347'],

  // Overlay
  overlay: 'rgba(15, 20, 25, 0.85)',
  overlayLight: 'rgba(15, 20, 25, 0.5)',

  // Light theme alternatives (for future dark mode toggle)
  light: {
    background: '#FFFFFF',
    backgroundLight: '#F5F8FA',
    surface: '#FFFFFF',
    surfaceLight: '#E1E8ED',
    text: '#14171A',
    textSecondary: '#657786',
    border: '#E1E8ED',
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const FONT_SIZES = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  display: 40,
};

export const BORDER_RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  round: 9999,
};

export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: (color) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  }),
};
