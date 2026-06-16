import { Platform } from 'react-native';

const IOS_SYSTEM_COLORS = {
  white: 'rgb(255, 255, 255)',
  black: 'rgb(0, 0, 0)',
  light: {
    grey6: 'rgb(250, 250, 250)',
    grey5: 'rgb(245, 245, 245)',
    grey4: 'rgb(228, 228, 233)',
    grey3: 'rgba(230, 230, 230, 1)',
    grey2: 'rgb(120, 120, 120)',
    grey: 'rgb(70, 70, 70)',
    background: 'rgb(242, 242, 247)', // iOS-style grouped background — light gray
    foreground: 'rgb(28, 28, 30)',     // Near-black for readability
    root: 'rgb(242, 242, 247)',
    card: 'rgb(255, 255, 255)',         // Pure white — cards pop against gray bg
    cardForeground: 'rgb(28, 28, 30)',
    popover: 'rgb(255, 255, 255)',
    popoverForeground: 'rgb(28, 28, 30)',
    destructive: 'rgb(215, 0, 21)',
    primary: 'rgb(29, 185, 84)',        // Spotify green
    primaryForeground: 'rgb(255, 255, 255)',
    secondary: 'rgb(103, 80, 164)',
    secondaryForeground: 'rgb(255, 255, 255)',
    muted: 'rgb(229, 229, 234)',        // Slightly darker than bg for muted areas
    mutedForeground: 'rgb(142, 142, 147)', // iOS secondaryLabel
    accent: 'rgb(103, 80, 164)',
    accentForeground: 'rgb(255, 255, 255)',
    border: 'rgba(229, 229, 229, 1)',       // Visible but not harsh
    input: 'rgb(232, 232, 237)',        // Tinted input fields — distinct from card
    ring: 'rgb(29, 185, 84)',
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
    mutedForeground: 'rgba(210, 210, 210, 1)',
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
    grey6: 'rgb(250, 250, 250)',
    grey5: 'rgb(245, 245, 245)',
    grey4: 'rgb(228, 228, 233)',
    grey3: 'rgb(200, 200, 200)',
    grey2: 'rgb(120, 120, 120)',
    grey: 'rgb(70, 70, 70)',
    background: 'rgb(242, 242, 247)', // iOS-style grouped background — light gray
    foreground: 'rgb(28, 28, 30)',     // Near-black for readability
    root: 'rgb(242, 242, 247)',
    card: 'rgb(255, 255, 255)',         // Pure white — cards pop against gray bg
    cardForeground: 'rgb(28, 28, 30)',
    popover: 'rgb(255, 255, 255)',
    popoverForeground: 'rgb(28, 28, 30)',
    destructive: 'rgb(215, 0, 21)',
    primary: 'rgb(29, 185, 84)',        // Spotify green
    primaryForeground: 'rgb(255, 255, 255)',
    secondary: 'rgb(103, 80, 164)',
    secondaryForeground: 'rgb(255, 255, 255)',
    muted: 'rgb(229, 229, 234)',        // Slightly darker than bg for muted areas
    mutedForeground: 'rgb(142, 142, 147)', // iOS secondaryLabel
    accent: 'rgb(103, 80, 164)',
    accentForeground: 'rgb(255, 255, 255)',
    border: 'rgb(210, 210, 215)',       // Visible but not harsh
    input: 'rgb(232, 232, 237)',        // Tinted input fields — distinct from card
    ring: 'rgb(29, 185, 84)',
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
