import { Platform } from 'react-native';

const IOS_SYSTEM_COLORS = {
  white: 'rgb(255, 255, 255)',
  black: 'rgb(0, 0, 0)',
  light: {
    grey6: 'rgb(250, 250, 250)', // Very light gray for subtle variations
    grey5: 'rgb(245, 245, 245)', // Light gray
    grey4: 'rgb(235, 235, 235)', // Light gray for borders
    grey3: 'rgb(200, 200, 200)', // Medium gray
    grey2: 'rgb(120, 120, 120)', // Dark gray
    grey: 'rgb(70, 70, 70)', // Darker gray
    background: 'rgb(255, 255, 255)', // Pure white
    foreground: 'rgb(0, 0, 0)', // Black
    root: 'rgb(255, 255, 255)', // Pure white
    card: 'rgb(255, 255, 255)', // Pure white
    cardForeground: 'rgb(0, 0, 0)', // Black
    popover: 'rgb(255, 255, 255)', // Pure white
    popoverForeground: 'rgb(0, 0, 0)', // Black
    destructive: 'rgb(186, 26, 32)', // Material error
    primary: 'rgb(29, 185, 84)', // Keep same as dark mode (Spotify green)
    primaryForeground: 'rgb(255, 255, 255)',
    secondary: 'rgb(103, 80, 164)', // Material secondary
    secondaryForeground: 'rgb(255, 255, 255)',
    muted: 'rgb(245, 245, 245)', // Very light gray
    mutedForeground: 'rgb(120, 120, 120)', // Medium gray
    accent: 'rgb(103, 80, 164)', // Material tertiary
    accentForeground: 'rgb(255, 255, 255)',
    border: 'rgb(235, 235, 235)', // Light gray for subtle borders
    input: 'rgb(250, 250, 250)', // Very light gray for input fields
    ring: 'rgb(29, 185, 84)', // Keep same as dark mode
  },
  dark: {
    grey6: 'rgb(24, 24, 24)',
    grey5: 'rgb(40, 40, 40)',
    grey4: 'rgb(42, 42, 42)',
    grey3: 'rgb(70, 70, 70)',
    grey2: 'rgb(99, 99, 99)',
    grey: 'rgb(167, 167, 167)',
    background: 'rgb(18, 18, 18)', // Spotify dark background
    foreground: 'rgb(255, 255, 255)',
    root: 'rgb(18, 18, 18)',
    card: 'rgb(24, 24, 24)', // Spotify card color
    cardForeground: 'rgb(255, 255, 255)',
    popover: 'rgb(40, 40, 40)',
    popoverForeground: 'rgb(255, 255, 255)',
    destructive: 'rgb(255, 56, 43)',
    primary: 'rgb(29, 185, 84)', // Spotify green
    primaryForeground: 'rgb(255, 255, 255)',
    secondary: 'rgb(29, 185, 84)',
    secondaryForeground: 'rgb(255, 255, 255)',
    muted: 'rgb(167, 167, 167)',
    mutedForeground: 'rgb(167, 167, 167)',
    accent: 'rgb(29, 185, 84)',
    accentForeground: 'rgb(255, 255, 255)',
    border: 'rgb(40, 40, 40)',
    input: 'rgb(40, 40, 40)',
    ring: 'rgb(29, 185, 84)',
  },
} as const;

const ANDROID_COLORS = {
  white: 'rgb(255, 255, 255)',
  black: 'rgb(0, 0, 0)',
  light: {
    grey6: 'rgb(250, 250, 250)', // Very light gray for subtle variations
    grey5: 'rgb(245, 245, 245)', // Light gray
    grey4: 'rgb(235, 235, 235)', // Light gray for borders
    grey3: 'rgb(200, 200, 200)', // Medium gray
    grey2: 'rgb(120, 120, 120)', // Dark gray
    grey: 'rgb(70, 70, 70)', // Darker gray
    background: 'rgb(255, 255, 255)', // Pure white
    foreground: 'rgb(0, 0, 0)', // Black
    root: 'rgb(255, 255, 255)', // Pure white
    card: 'rgb(255, 255, 255)', // Pure white
    cardForeground: 'rgb(0, 0, 0)', // Black
    popover: 'rgb(255, 255, 255)', // Pure white
    popoverForeground: 'rgb(0, 0, 0)', // Black
    destructive: 'rgb(186, 26, 32)', // Material error
    primary: 'rgb(29, 185, 84)', // Keep same as dark mode (Spotify green)
    primaryForeground: 'rgb(255, 255, 255)',
    secondary: 'rgb(103, 80, 164)', // Material secondary
    secondaryForeground: 'rgb(255, 255, 255)',
    muted: 'rgb(245, 245, 245)', // Very light gray
    mutedForeground: 'rgb(120, 120, 120)', // Medium gray
    accent: 'rgb(103, 80, 164)', // Material tertiary
    accentForeground: 'rgb(255, 255, 255)',
    border: 'rgb(235, 235, 235)', // Light gray for subtle borders
    input: 'rgb(250, 250, 250)', // Very light gray for input fields
    ring: 'rgb(29, 185, 84)', // Keep same as dark mode
  },
  dark: {
    grey6: 'rgb(24, 24, 24)',
    grey5: 'rgb(40, 40, 40)',
    grey4: 'rgb(42, 42, 42)',
    grey3: 'rgb(70, 70, 70)',
    grey2: 'rgb(99, 99, 99)',
    grey: 'rgb(167, 167, 167)',
    background: 'rgb(18, 18, 18)', // Spotify dark background
    foreground: 'rgb(255, 255, 255)',
    root: 'rgb(18, 18, 18)',
    card: 'rgb(24, 24, 24)', // Spotify card color
    cardForeground: 'rgb(255, 255, 255)',
    popover: 'rgb(40, 40, 40)',
    popoverForeground: 'rgb(255, 255, 255)',
    destructive: 'rgb(255, 56, 43)',
    primary: 'rgb(29, 185, 84)', // Spotify green
    primaryForeground: 'rgb(255, 255, 255)',
    secondary: 'rgb(29, 185, 84)',
    secondaryForeground: 'rgb(255, 255, 255)',
    muted: 'rgb(167, 167, 167)',
    mutedForeground: 'rgb(167, 167, 167)',
    accent: 'rgb(29, 185, 84)',
    accentForeground: 'rgb(255, 255, 255)',
    border: 'rgb(40, 40, 40)',
    input: 'rgb(40, 40, 40)',
    ring: 'rgb(29, 185, 84)',
  },
} as const;

const COLORS = Platform.OS === 'ios' ? IOS_SYSTEM_COLORS : ANDROID_COLORS;

export { COLORS };
