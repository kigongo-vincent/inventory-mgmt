import { router } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, View, Pressable, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { Button } from '@/components/nativewindui/Button';
import { Icon } from '@/components/nativewindui/Icon';
import { Input } from '@/components/nativewindui/Input';
import { Text } from '@/components/nativewindui/Text';
import { useColorScheme } from '@/lib/useColorScheme';
import { useAuthStore } from '@/store/authStore';
import { userApi } from '@/lib/api/userApi';

export default function ChangePasswordScreen() {
  const { colors, colorScheme } = useColorScheme();
  const insets = useSafeAreaInsets();
  const currentUser = useAuthStore((state) => state.currentUser);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChangePassword = async () => {
    if (!currentUser) return;

    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // Check if new password meets requirements
    if (newPassword.trim().length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters long');
      return;
    }

    // Verify passwords match
    if (newPassword.trim() !== confirmPassword.trim()) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    // Check if new password is same as current
    if (newPassword.trim() === currentPassword.trim()) {
      Alert.alert('Error', 'New password must be different from current password');
      return;
    }

    setIsSubmitting(true);

    try {
      // Call backend API to change password (validates old password on backend)
      await userApi.changePassword(currentUser.id, {
        oldPassword: currentPassword.trim(),
        newPassword: newPassword.trim(),
      });

      Alert.alert('Success', 'Password changed successfully', [
        {
          text: 'OK',
          onPress: () => {
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            router.back();
          },
        },
      ]);
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to change password. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsSubmitting(false);
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
                  Change Password
                </Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 80 : 0}>
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingBottom: Math.max(40, insets.bottom + 20),
            paddingTop: 8,
          }}>
          <View className="px-5 pt-6">
            {/* Password Change Card */}
            <View
              className="mb-6 rounded-2xl px-5 py-6"
              style={{
                backgroundColor: colors.card,
              }}>
              <Text variant="heading" className="mb-4" style={{ fontWeight: '500', fontSize: 17 }}>
                Password Information
              </Text>

              <View className="mb-4">
                <Text className="mb-2" style={{ fontSize: 14, fontWeight: '500', color: colors.foreground }}>
                  Current Password
                </Text>
                <View className="relative">
                  <Input
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder="Enter current password"
                    secureTextEntry={!showCurrentPassword}
                    style={{ backgroundColor: colors.background }}
                  />
                  <Pressable
                    onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-0 bottom-0 justify-center"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Icon
                      name={showCurrentPassword ? 'eye.slash' : 'eye'}
                      size={20}
                      color={colors.mutedForeground}
                    />
                  </Pressable>
                </View>
              </View>

              <View className="mb-4">
                <Text className="mb-2" style={{ fontSize: 14, fontWeight: '500', color: colors.foreground }}>
                  New Password
                </Text>
                <View className="relative">
                  <Input
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Enter new password"
                    secureTextEntry={!showNewPassword}
                    style={{ backgroundColor: colors.background }}
                  />
                  <Pressable
                    onPress={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-0 bottom-0 justify-center"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Icon
                      name={showNewPassword ? 'eye.slash' : 'eye'}
                      size={20}
                      color={colors.mutedForeground}
                    />
                  </Pressable>
                </View>
                <Text variant="footnote" color="tertiary" className="mt-1">
                  Must be at least 6 characters long
                </Text>
              </View>

              <View>
                <Text className="mb-2" style={{ fontSize: 14, fontWeight: '500', color: colors.foreground }}>
                  Confirm New Password
                </Text>
                <View className="relative">
                  <Input
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm new password"
                    secureTextEntry={!showConfirmPassword}
                    style={{ backgroundColor: colors.background }}
                  />
                  <Pressable
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-0 bottom-0 justify-center"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Icon
                      name={showConfirmPassword ? 'eye.slash' : 'eye'}
                      size={20}
                      color={colors.mutedForeground}
                    />
                  </Pressable>
                </View>
              </View>
            </View>

            <Button
              onPress={handleChangePassword}
              disabled={isSubmitting}
              className="w-full"
              loading={isSubmitting}>
              <Text style={{ color: colors.primaryForeground, fontWeight: '500' }}>
                Change Password
              </Text>
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
