import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { ScrollView, View, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { Icon } from '@/components/nativewindui/Icon';
import { Text } from '@/components/nativewindui/Text';
import { useColorScheme } from '@/lib/useColorScheme';
import { useLanguageStore } from '@/store/languageStore';

const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
];

export default function LanguageScreen() {
  const { colors, colorScheme } = useColorScheme();
  const currentLanguage = useLanguageStore((state) => state.currentLanguage);
  const setLanguage = useLanguageStore((state) => state.setLanguage);

  const handleLanguageSelect = async (languageCode: string) => {
    if (languageCode !== currentLanguage) {
      await setLanguage(languageCode);
      Alert.alert(
        'Language Changed',
        'The language has been changed. Some parts of the app may require a restart to fully apply the changes.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      {/* Header Section */}
      <View style={{ backgroundColor: colors.card }}>
        <SafeAreaView edges={['top']}>
          <View className="px-5 pt-5 pb-6">
            <View className="flex-row items-center gap-3">
              <Pressable
                onPress={() => router.back()}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: colors.input || colors.background,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: colors.border || colors.mutedForeground,
                  }}>
                  <Icon name="chevron.left" size={20} color={colors.foreground} />
                </View>
              </Pressable>
              <View className="flex-1">
                <Text
                  variant="heading"
                  style={{
                    color: colors.foreground,
                    fontWeight: '500',
                    fontSize: 20,
                    letterSpacing: -0.3,
                  }}>
                  <Text i18nKey="language.title" />
                </Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24, paddingTop: 8 }}>
        <View className="px-5 pt-6">
          <View
            className="rounded-2xl px-5 py-5"
            style={{
              backgroundColor: colors.card,
            }}>
            <Text variant="heading" className="mb-4" style={{ fontWeight: '500', fontSize: 17 }} i18nKey="language.selectLanguage" />

            {LANGUAGES.map((language, index) => {
              const isSelected = currentLanguage === language.code;
              return (
                <View key={language.code}>
                  <Pressable
                    onPress={() => handleLanguageSelect(language.code)}
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.7 : 1,
                    })}>
                    <View className="flex-row items-center justify-between py-3">
                      <View className="flex-row items-center gap-3 flex-1">
                        <View
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: colors.background,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                          <Icon name="globe" size={20} color={colors.primary} />
                        </View>
                        <View className="flex-1">
                          <Text variant="subhead" style={{ fontWeight: '500' }}>
                            {language.nativeName}
                          </Text>
                          <Text variant="footnote" color="tertiary" className="mt-0.5">
                            {language.name}
                          </Text>
                        </View>
                      </View>
                      {isSelected && (
                        <Icon name="checkmark.circle.fill" size={24} color={colors.primary} />
                      )}
                    </View>
                  </Pressable>
                  {index < LANGUAGES.length - 1 && (
                    <View className="h-px my-2" style={{ backgroundColor: colors.border, opacity: 0.2 }} />
                  )}
                </View>
              );
            })}
          </View>

          <View
            className="mt-4 rounded-2xl px-5 py-4"
            style={{
              backgroundColor: colors.card,
            }}>
            <Text variant="footnote" color="tertiary" style={{ lineHeight: 20 }} i18nKey="language.restartRequired" />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
