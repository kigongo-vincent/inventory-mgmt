import { useColorScheme as useNativewindColorScheme } from 'nativewind';
import { useMemo, useEffect, useCallback } from 'react';

import { COLORS } from '@/theme/colors';
import { useSettingsStore } from '@/store/settingsStore';

function useColorScheme() {
  const { setColorScheme: setNativewindScheme } = useNativewindColorScheme();
  // Subscribe to persisted colorScheme from settings store
  const storedColorScheme = useSettingsStore((state) => state.settings.colorScheme);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  // Explicitly subscribe to baseFontSize to ensure reactivity
  const baseFontSize = useSettingsStore((state) => state.settings.baseFontSize);

  // Resolve 'system' → for now default to 'dark' (RN Appearance could be used here)
  const effectiveColorScheme = storedColorScheme === 'system' ? 'dark' : storedColorScheme;

  // Keep nativewind in sync with our effective scheme
  useEffect(() => {
    setNativewindScheme(effectiveColorScheme);
  }, [effectiveColorScheme, setNativewindScheme]);

  const colors = useMemo(() => {
    return COLORS[effectiveColorScheme];
  }, [effectiveColorScheme]);

  const toggleColorScheme = useCallback(() => {
    const next = effectiveColorScheme === 'dark' ? 'light' : 'dark';
    console.log('[Theme] toggling from', effectiveColorScheme, 'to', next);
    updateSettings({ colorScheme: next });
  }, [effectiveColorScheme, updateSettings]);

  const handleSetColorScheme = useCallback(
    (scheme: 'light' | 'dark' | 'system') => {
      console.log('[Theme] setColorScheme →', scheme);
      updateSettings({ colorScheme: scheme });
    },
    [updateSettings]
  );

  return {
    colorScheme: effectiveColorScheme,
    isDarkColorScheme: effectiveColorScheme === 'dark',
    setColorScheme: handleSetColorScheme,
    toggleColorScheme,
    colors,
    baseFontSize,
  };
}

export { useColorScheme };
