import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { ScrollView, View, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { Icon } from '@/components/nativewindui/Icon';
import { Text } from '@/components/nativewindui/Text';
import { Toggle } from '@/components/nativewindui/Toggle';
import { useColorScheme } from '@/lib/useColorScheme';
import { useAuthStore } from '@/store/authStore';
import { userApi, NotificationPreferences } from '@/lib/api/userApi';

interface NotificationSettings {
  salesNotifications: boolean;
  inventoryAlerts: boolean;
  userActivity: boolean;
  systemUpdates: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
}

const defaultSettings: NotificationSettings = {
  salesNotifications: true,
  inventoryAlerts: true,
  userActivity: false,
  systemUpdates: true,
  emailNotifications: false,
  pushNotifications: true,
};

export default function NotificationPreferencesScreen() {
  const { colors, colorScheme } = useColorScheme();
  const currentUser = useAuthStore((state) => state.currentUser);
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (currentUser) {
      loadSettings();
    }
  }, [currentUser]);

  const loadSettings = async () => {
    if (!currentUser) return;

    setIsLoading(true);
    try {
      const prefs = await userApi.getNotificationPreferences(currentUser.id);
      setSettings({
        salesNotifications: prefs.salesNotifications,
        inventoryAlerts: prefs.inventoryAlerts,
        userActivity: prefs.userActivity,
        systemUpdates: prefs.systemUpdates,
        emailNotifications: prefs.emailNotifications,
        pushNotifications: prefs.pushNotifications,
      });
    } catch (error: any) {
      console.error('Error loading notification settings:', error);
      // Use default settings if API call fails
      Alert.alert('Error', 'Failed to load notification preferences. Using default settings.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetting = async (key: keyof NotificationSettings, value: boolean) => {
    if (!currentUser || isSaving) return;

    const previousSettings = { ...settings };
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings); // Optimistic update

    setIsSaving(true);
    try {
      await userApi.updateNotificationPreferences(currentUser.id, {
        [key]: value,
      });
    } catch (error: any) {
      console.error('Error saving notification settings:', error);
      // Revert to previous settings on error
      setSettings(previousSettings);
      Alert.alert('Error', error?.message || 'Failed to save notification preference. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const notificationOptions = [
    {
      key: 'salesNotifications' as keyof NotificationSettings,
      title: 'Sales Notifications',
      description: 'Get notified about new sales and transactions',
      icon: 'chart.bar.fill' as const,
    },
    {
      key: 'inventoryAlerts' as keyof NotificationSettings,
      title: 'Inventory Alerts',
      description: 'Receive alerts when inventory is low',
      icon: 'exclamationmark.triangle.fill' as const,
    },
    {
      key: 'userActivity' as keyof NotificationSettings,
      title: 'User Activity',
      description: 'Notifications about user actions and changes',
      icon: 'person.2.fill' as const,
    },
    {
      key: 'systemUpdates' as keyof NotificationSettings,
      title: 'System Updates',
      description: 'Important system updates and maintenance',
      icon: 'gear.circle.fill' as const,
    },
    {
      key: 'emailNotifications' as keyof NotificationSettings,
      title: 'Email Notifications',
      description: 'Receive notifications via email',
      icon: 'envelope.fill' as const,
    },
    {
      key: 'pushNotifications' as keyof NotificationSettings,
      title: 'Push Notifications',
      description: 'Receive push notifications on your device',
      icon: 'bell.fill' as const,
    },
  ];

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
                  Notification Preferences
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
            <Text variant="heading" className="mb-4" style={{ fontWeight: '500', fontSize: 17 }}>
              Notification Preferences
            </Text>

            {notificationOptions.map((option, index) => (
              <View key={option.key}>
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
                      <Icon name={option.icon} size={20} color={colors.primary} />
                    </View>
                    <View className="flex-1">
                      <Text variant="subhead" style={{ fontWeight: '500' }}>
                        {option.title}
                      </Text>
                      <Text variant="footnote" color="tertiary" className="mt-0.5">
                        {option.description}
                      </Text>
                    </View>
                  </View>
                  <Toggle
                    value={settings[option.key]}
                    onValueChange={(value) => updateSetting(option.key, value)}
                    disabled={isLoading || isSaving}
                  />
                </View>
                {index < notificationOptions.length - 1 && (
                  <View className="h-px my-2" style={{ backgroundColor: colors.border, opacity: 0.2 }} />
                )}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
