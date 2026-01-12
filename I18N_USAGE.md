# i18n Usage Guide

This app uses `i18n-js` with `expo-localization` for internationalization. All text is centralized through the `Text` component.

## Setup

The i18n system is already configured and initialized. Translation files are located in `/locales/`:
- `en.json` - English
- `sw.json` - Swahili
- `fr.json` - French
- `ar.json` - Arabic

## Usage

### Using the Text Component with Translations

Instead of hardcoding text, use the `i18nKey` prop:

```tsx
// Before (hardcoded)
<Text>Welcome</Text>

// After (translated)
<Text i18nKey="auth.welcome">Welcome</Text>
```

### Translation Keys Structure

Translation keys use dot notation to organize by feature:
- `common.*` - Common UI elements (save, cancel, delete, etc.)
- `auth.*` - Authentication related
- `dashboard.*` - Dashboard screen
- `inventory.*` - Inventory screen
- `sales.*` - Sales screen
- `settings.*` - Settings screen
- `profile.*` - Profile screen
- `language.*` - Language screen
- `support.*` - Support screen

### Examples

```tsx
// Simple translation
<Text i18nKey="dashboard.overview">Overview</Text>

// With variant and styling
<Text variant="heading" i18nKey="inventory.title">Inventory</Text>

// With interpolation (if needed)
<Text i18nKey="dashboard.totalSales" i18nOptions={{ count: 10 }}>
  Total Sales: {10}
</Text>
```

### Changing Language

The language is managed through the `useLanguageStore`:

```tsx
import { useLanguageStore } from '@/store/languageStore';

const setLanguage = useLanguageStore((state) => state.setLanguage);
const currentLanguage = useLanguageStore((state) => state.currentLanguage);

// Change language
await setLanguage('sw'); // Swahili
await setLanguage('fr'); // French
await setLanguage('ar'); // Arabic
await setLanguage('en'); // English
```

### Direct Translation Function

You can also use the `t()` function directly for non-Text components:

```tsx
import { t } from '@/lib/i18n';

const title = t('dashboard.overview');
const buttonText = t('common.save');
```

### Adding New Translations

1. Add the key to all language files in `/locales/`
2. Use the key in your component with `i18nKey` prop
3. The system will automatically fallback to English if a translation is missing

### Language Detection

The app automatically:
1. Checks for a stored language preference
2. Falls back to device locale if available
3. Defaults to English if neither is available

## Notes

- All translations are stored in JSON files for easy editing
- The system supports fallback to English for missing translations
- Language changes are persisted using AsyncStorage
- The Text component maintains all its existing props and styling
