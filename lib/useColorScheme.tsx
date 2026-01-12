import { useColorScheme as useNativewindColorScheme } from 'nativewind';
import { useMemo, useEffect } from 'react';

import { COLORS } from '@/theme/colors';
import { useSettingsStore } from '@/store/settingsStore';

function useColorScheme() {
  const { setColorScheme } = useNativewindColorScheme();
  // Explicitly subscribe to baseFontSize to ensure reactivity
  const baseFontSize = useSettingsStore((state) => state.settings.baseFontSize);
  
  // Always use dark theme - theme is now fixed
  const effectiveColorScheme = 'dark';
  
  // Ensure nativewind is set to dark
  useEffect(() => {
    setColorScheme('dark');
  }, [setColorScheme]);

  // Use Spotify colors directly - always dark
  const colors = useMemo(() => {
    return COLORS.dark;
  }, []);

  // No-op functions since theme is fixed
  function toggleColorScheme() {
    // Theme is fixed to dark, do nothing
  }

  const handleSetColorScheme = (scheme: 'light' | 'dark' | 'system') => {
    // Theme is fixed to dark, do nothing
  };

  return {
    colorScheme: effectiveColorScheme,
    isDarkColorScheme: true,
    setColorScheme: handleSetColorScheme,
    toggleColorScheme,
    colors,
    baseFontSize,
  };
}

export { useColorScheme };
