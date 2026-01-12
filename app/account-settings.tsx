import { router } from 'expo-router';
import React from 'react';
import { ScrollView, View, Pressable, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { Button } from '@/components/nativewindui/Button';
import { Icon } from '@/components/nativewindui/Icon';
import { Input } from '@/components/nativewindui/Input';
import { Text } from '@/components/nativewindui/Text';
import { useColorScheme } from '@/lib/useColorScheme';
import { useAuthStore } from '@/store/authStore';

export default function SettingsScreen() {
  const { colors, colorScheme } = useColorScheme();
  const currentUser = useAuthStore((state) => state.currentUser);
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
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
                    fontSize: 18,
                    letterSpacing: -0.2,
                  }}>
                  Settings
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
          {/* Profile Section */}
          <View
            className="mb-6 rounded-2xl px-5 py-6 flex-row items-center gap-4"
            style={{
              backgroundColor: colors.card,
            }}>
            <View
              className="h-16 w-16 rounded-full overflow-hidden"
              style={{ backgroundColor: colors.background }}>
              {currentUser?.profilePictureUri ? (
                <Image
                  key={`profile-${currentUser.id}-${currentUser.profilePictureUri}`}
                  source={{
                    uri: currentUser.profilePictureUri.startsWith('file://')
                      ? currentUser.profilePictureUri
                      : currentUser.profilePictureUri.startsWith('http')
                        ? currentUser.profilePictureUri
                        : `file://${currentUser.profilePictureUri}`
                  }}
                  style={{ width: 64, height: 64 }}
                  resizeMode="cover"
                  onError={(error) => {
                    console.error('Image load error:', error.nativeEvent?.error || error, 'URI:', currentUser.profilePictureUri);
                  }}
                  onLoad={() => {
                    console.log('Image loaded successfully:', currentUser.profilePictureUri);
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 64,
                    height: 64,
                    backgroundColor: colors.background,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                  <Icon name="person.fill" size={32} color={colors.mutedForeground} />
                </View>
              )}
            </View>
            <View className="flex-1">
              <Text variant="subhead" style={{ fontSize: 16, fontWeight: '500', marginBottom: 2 }}>
                {currentUser?.name || 'User'}
              </Text>
              <Text variant="footnote" color="tertiary" style={{ marginBottom: 2 }}>
                {currentUser?.username || ''}
              </Text>
              <Text variant="footnote" color="tertiary">
                {currentUser?.branch || ''} • {currentUser?.role === 'super_admin' ? 'Admin' : 'User'}
              </Text>
            </View>
          </View>

          {/* Settings Options */}
          <View className="gap-4">
            <View
              className="rounded-2xl px-5 py-5"
              style={{
                backgroundColor: colors.card,
              }}>
              <Text variant="callout" className="mb-4" style={{ fontWeight: '500' }}>
                Account
              </Text>
              <Pressable
                className="flex-row items-center justify-between py-3"
                onPress={() => router.push({ pathname: '/edit-profile' })}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.7 : 1,
                })}>
                <View className="flex-row items-center gap-3">
                  <Icon name="person.circle" size={24} color={colors.foreground} />
                  <Text variant="subhead">Edit Profile</Text>
                </View>
                <Icon name="chevron.right" size={20} color={colors.mutedForeground} />
              </Pressable>
              <View className="h-px my-2" style={{ backgroundColor: colors.border, opacity: 0.2 }} />
              <Pressable
                className="flex-row items-center justify-between py-3"
                onPress={() => router.push({ pathname: '/change-password' })}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.7 : 1,
                })}>
                <View className="flex-row items-center gap-3">
                  <Icon 
                    materialCommunityIcon={{ name: 'lock' }}
                    size={24} 
                    color={colors.foreground} 
                  />
                  <Text variant="subhead">Change Password</Text>
                </View>
                <Icon name="chevron.right" size={20} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <View
              className="rounded-2xl px-5 py-5"
              style={{
                backgroundColor: colors.card,
              }}>
              <Text variant="callout" className="mb-4" style={{ fontWeight: '500' }}>
                Preferences
              </Text>
              <View
                className="flex-row items-center justify-between py-3"
                style={{ opacity: 0.5 }}>
                <View className="flex-row items-center gap-3">
                  <Icon name="gearshape.fill" size={24} color={colors.foreground} />
                  <Text variant="subhead">App Settings</Text>
                </View>
                <Icon name="chevron.right" size={20} color={colors.mutedForeground} />
              </View>
              <View className="h-px my-2" style={{ backgroundColor: colors.border, opacity: 0.2 }} />
              <Pressable
                className="flex-row items-center justify-between py-3"
                onPress={() => router.push({ pathname: '/notification-preferences' })}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.7 : 1,
                })}>
                <View className="flex-row items-center gap-3">
                  <Icon name="bell.circle" size={24} color={colors.foreground} />
                  <Text variant="subhead">Notification Preferences</Text>
                </View>
                <Icon name="chevron.right" size={20} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <View
              className="rounded-2xl px-5 py-5"
              style={{
                backgroundColor: colors.card,
              }}>
              <Text variant="callout" className="mb-4" style={{ fontWeight: '500' }}>
                About
              </Text>
              <Pressable
                className="flex-row items-center justify-between py-3"
                onPress={() => Alert.alert('About', 'Inventory Management App\nVersion 1.0.0')}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.7 : 1,
                })}>
                <View className="flex-row items-center gap-3">
                  <Icon name="info.circle" size={24} color={colors.foreground} />
                  <Text variant="subhead">App Version</Text>
                </View>
                <Text variant="footnote" color="tertiary">
                  1.0.0
                </Text>
              </Pressable>
              <View className="h-px my-2" style={{ backgroundColor: colors.border, opacity: 0.2 }} />
              <Pressable
                className="flex-row items-center justify-between py-3"
                onPress={() => router.push({ pathname: '/help-support' })}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.7 : 1,
                })}>
                <View className="flex-row items-center gap-3">
                  <Icon name="questionmark.circle" size={24} color={colors.foreground} />
                  <Text variant="subhead">Help & Support</Text>
                </View>
                <Icon name="chevron.right" size={20} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <Button
              onPress={handleLogout}
              variant="plain"
              className="mt-4 w-full">
              <Text style={{ color: colors.destructive }}>Logout</Text>
            </Button>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
