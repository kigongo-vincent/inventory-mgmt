import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { setLanguage as setI18nLanguage } from '@/lib/i18n';

interface LanguageState {
  currentLanguage: string;
  setLanguage: (language: string) => Promise<void>;
}

const LANGUAGE_STORAGE_KEY = 'app-language';

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      currentLanguage: 'en',
      setLanguage: async (language: string) => {
        await setI18nLanguage(language);
        set({ currentLanguage: language });
      },
    }),
    {
      name: 'language-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        // Set i18n locale when store rehydrates
        if (state?.currentLanguage) {
          setI18nLanguage(state.currentLanguage);
        }
      },
    }
  )
);
