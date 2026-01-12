import { router } from 'expo-router';
import React, { useState, useRef } from 'react';
import { Alert, Pressable, View, KeyboardAvoidingView, Platform, TextInput, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { Button } from '@/components/nativewindui/Button';
import { Icon } from '@/components/nativewindui/Icon';
import { Input } from '@/components/nativewindui/Input';
import { Text } from '@/components/nativewindui/Text';
import { useColorScheme } from '@/lib/useColorScheme';
import { useUserStore } from '@/store/userStore';

type Step = 'email' | 'otp' | 'password';

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<Step>('email');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sentOtp, setSentOtp] = useState<string>('');
  const { colors, colorScheme } = useColorScheme();
  const insets = useSafeAreaInsets();
  const { users, updateUser } = useUserStore();
  const otpInputRef = useRef<TextInput>(null);
  const newPasswordInputRef = useRef<TextInput>(null);
  const confirmPasswordInputRef = useRef<TextInput>(null);

  const handleSendOtp = async () => {
    if (!emailOrPhone.trim()) {
      Alert.alert('Error', 'Please enter your email or phone number');
      return;
    }

    // Validate email or phone format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[0-9]{10,}$/;
    
    if (!emailRegex.test(emailOrPhone) && !phoneRegex.test(emailOrPhone.replace(/\s+/g, ''))) {
      Alert.alert('Error', 'Please enter a valid email or phone number');
      return;
    }

    setLoading(true);
    try {
      // Simulate API call to send OTP
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      // Generate a mock OTP (in production, this would come from the server)
      const mockOtp = Math.floor(100000 + Math.random() * 900000).toString();
      setSentOtp(mockOtp);
      
      // For demo purposes, show the OTP in an alert
      Alert.alert(
        'OTP Sent',
        `OTP has been sent to ${emailOrPhone}. For demo: OTP is ${mockOtp}`,
        [{ text: 'OK', onPress: () => setStep('otp') }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      Alert.alert('Error', 'Please enter the OTP');
      return;
    }

    if (otp !== sentOtp) {
      Alert.alert('Error', 'Invalid OTP. Please try again.');
      return;
    }

    setStep('password');
  };

  const handleResetPassword = async () => {
    if (!newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please enter both password fields');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      // Find user by email/phone (in production, this would be a proper lookup)
      // For demo, we'll update the first user found
      const user = users[0];
      
      if (user) {
        updateUser(user.id, { password: newPassword });
      }

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      Alert.alert(
        'Success',
        'Your password has been reset successfully.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(auth)/login'),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderEmailStep = () => (
    <>
      <View className="mb-8 items-center">
        <Text variant="title1" className="mb-2 text-center">
          Forgot Password?
        </Text>
        <Text color="tertiary" className="text-center">
          Enter your email or phone number to receive an OTP
        </Text>
      </View>

      <View className="gap-4">
        <View>
          <Text variant="subhead" className="mb-2">
            Email or Phone Number
          </Text>
          <Input
            value={emailOrPhone}
            onChangeText={setEmailOrPhone}
            placeholder="Enter email or phone number"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleSendOtp}
          />
        </View>

        <Button
          onPress={handleSendOtp}
          disabled={loading}
          className="mt-2 w-full"
          loading={loading}
          variant="primary">
          <Text>Send OTP</Text>
        </Button>

        <Pressable onPress={() => router.back()} className="mt-4 self-center">
          <Text variant="footnote" className="text-primary">
            Back to Login
          </Text>
        </Pressable>
      </View>
    </>
  );

  const renderOtpStep = () => (
    <>
      <View className="mb-8 items-center">
        <Text variant="title1" className="mb-2 text-center">
          Verify OTP
        </Text>
        <Text color="tertiary" className="text-center">
          Enter the 6-digit code sent to
        </Text>
        <Text color="primary" className="text-center mt-1">
          {emailOrPhone}
        </Text>
      </View>

      <View className="gap-4">
        <View>
          <Text variant="subhead" className="mb-2">
            OTP Code
          </Text>
          <Input
            ref={otpInputRef}
            value={otp}
            onChangeText={setOtp}
            placeholder="Enter 6-digit OTP"
            keyboardType="number-pad"
            maxLength={6}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleVerifyOtp}
            style={{ textAlign: 'center', letterSpacing: 4 }}
          />
        </View>

        <Button
          onPress={handleVerifyOtp}
          disabled={loading}
          className="mt-2 w-full"
          loading={loading}
          variant="primary">
          <Text>Verify OTP</Text>
        </Button>

        <Pressable
          onPress={() => {
            setOtp('');
            setStep('email');
          }}
          className="mt-2 self-center">
          <Text variant="footnote" className="text-primary">
            Resend OTP
          </Text>
        </Pressable>

        <Pressable onPress={() => router.back()} className="mt-2 self-center">
          <Text variant="footnote" color="tertiary">
            Back to Login
          </Text>
        </Pressable>
      </View>
    </>
  );

  const renderPasswordStep = () => (
    <>
      <View className="mb-8 items-center">
        <Text variant="title1" className="mb-2 text-center">
          Reset Password
        </Text>
        <Text color="tertiary" className="text-center">
          Enter your new password below
        </Text>
      </View>

      <View className="gap-4">
        <View>
          <Text variant="subhead" className="mb-2">
            New Password
          </Text>
          <View className="relative">
            <Input
              ref={newPasswordInputRef}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Enter new password"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              className="pr-12"
              returnKeyType="next"
              onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
            />
            <Pressable
              onPress={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-0 bottom-0 justify-center"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon
                name={showPassword ? 'eye.slash' : 'eye'}
                size={20}
                color={colors.mutedForeground}
              />
            </Pressable>
          </View>
        </View>

        <View>
          <Text variant="subhead" className="mb-2">
            Confirm Password
          </Text>
          <View className="relative">
            <Input
              ref={confirmPasswordInputRef}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
              className="pr-12"
              returnKeyType="done"
              onSubmitEditing={handleResetPassword}
            />
            <Pressable
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-0 bottom-0 justify-center"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon
                name={showConfirmPassword ? 'eye.slash' : 'eye'}
                size={20}
                color={colors.mutedForeground}
              />
            </Pressable>
          </View>
        </View>

        <Button
          onPress={handleResetPassword}
          disabled={loading}
          className="mt-2 w-full"
          loading={loading}
          variant="primary">
          <Text>Reset Password</Text>
        </Button>

        <Pressable onPress={() => router.back()} className="mt-4 self-center">
          <Text variant="footnote" color="tertiary">
            Back to Login
          </Text>
        </Pressable>
      </View>
    </>
  );

  return (
    <>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <SafeAreaView key={colorScheme} className="flex-1" style={{ backgroundColor: colors.background }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          className="flex-1">
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View className="flex-1 px-6 justify-center" style={{ paddingTop: 20, paddingBottom: Math.max(20, insets.bottom) }}>
              {step === 'email' && renderEmailStep()}
              {step === 'otp' && renderOtpStep()}
              {step === 'password' && renderPasswordStep()}
            </View>

            <View className="pb-6 items-center" style={{ paddingBottom: Math.max(16, insets.bottom) }}>
              <Text variant="footnote" color="tertiary" style={{ fontSize: 11 }}>
                © {new Date().getFullYear()} kigongovincent625@gmail.com
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}
