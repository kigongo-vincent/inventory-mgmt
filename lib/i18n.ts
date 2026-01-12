import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import translation files
import en from '@/locales/en.json';
import sw from '@/locales/sw.json';
import fr from '@/locales/fr.json';
import ar from '@/locales/ar.json';

const LANGUAGE_STORAGE_KEY = 'app-language';

// Create i18n instance
export const i18n = new I18n({
  en,
  sw,
  fr,
  ar,
  // Enable fallback to English if translation is missing
  enableFallback: true,
  // Default locale
  defaultLocale: 'en',
});

// Set initial locale
const getStoredLanguage = async () => {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored) {
      return stored;
    }
    // Fallback to device locale
    const deviceLocale = Localization.getLocales()[0]?.languageCode || 'en';
    // Map device locale to supported languages
    const supportedLocales = ['en', 'sw', 'fr', 'ar'];
    return supportedLocales.includes(deviceLocale) ? deviceLocale : 'en';
  } catch (error) {
    console.error('Error loading language:', error);
    return 'en';
  }
};

// Initialize locale
getStoredLanguage().then((locale) => {
  i18n.locale = locale;
  i18n.defaultLocale = locale;
});

// Helper function to change language
export const setLanguage = async (locale: string) => {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, locale);
    i18n.locale = locale;
    i18n.defaultLocale = locale;
  } catch (error) {
    console.error('Error saving language:', error);
  }
};

// Helper function to get current language
export const getCurrentLanguage = async (): Promise<string> => {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    return stored || i18n.locale || 'en';
  } catch (error) {
    return 'en';
  }
};

// Translation function (shortcut)
export const t = (key: string, options?: object) => {
  return i18n.t(key, options);
};

export default i18n;
