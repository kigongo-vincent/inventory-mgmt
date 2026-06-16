import { router } from 'expo-router';
import React, { useState, useEffect, useRef } from 'react';
import { Alert, Image, ImageBackground, Pressable, View, KeyboardAvoidingView, Platform, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { Button } from '@/components/nativewindui/Button';
import { Icon } from '@/components/nativewindui/Icon';
import { Input } from '@/components/nativewindui/Input';
import { Text } from '@/components/nativewindui/Text';
import { useColorScheme } from '@/lib/useColorScheme';
import { useAuthStore } from '@/store/authStore';
import { testConnection } from '@/lib/api/testConnection';
import { API_BASE_URL } from '@/lib/api/config';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { colors, colorScheme } = useColorScheme();
  const login = useAuthStore((state) => state.login);
  const passwordInputRef = useRef<TextInput>(null);

  // Test connection on mount (development only)
  useEffect(() => {
    if (__DEV__) {
      console.log('🔗 API Base URL configured as:', API_BASE_URL);
      testConnection().then((result) => {
        if (!result.success) {
          console.warn('⚠️ Connection test failed:', result.message);
        }
      });
    }
  }, []);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both username and password');
      return;
    }

    setLoading(true);
    try {
      const result = await login(username.trim(), password.trim());
      if (result.success) {
        router.replace('/(tabs)/dashboard');
      } else {
        Alert.alert(
          result.error === 'network' ? 'Connection Error' : 'Login Error',
          result.message || 'An error occurred during login'
        );
        console.log(username, password)
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred during login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        className="flex-1">
        <SafeAreaView key={colorScheme} className="flex-1" style={{ backgroundColor: colors.background }}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}>
            <View className="flex-1 px-6 justify-center">
              <View className="mb-8 items-center">
                <View className=' items-center justify-center overflow-hidden rounded-xl ' style={{ height: 100, width: 150 }}>
                  <Image
                    style={{ height: 100, width: 100 }}
                    source={require("@/assets/icon.jpg")}
                  />
                </View>
                <Text variant={"title3"} className=" text-center">
                  Gas Center
                </Text>
                <Text color="tertiary" variant={"caption2"} className="text-center">
                  login to your account
                </Text>
              </View>

              <View className="gap-4">
                <View>
                  <Text variant={"caption2"} className="mb-2">
                    Username or phone number
                  </Text>
                  <Input
                    value={username}
                    onChangeText={setUsername}
                    placeholder="Enter username or phone number"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                    onSubmitEditing={() => passwordInputRef.current?.focus()}
                  />
                </View>

                <View>
                  <Text variant={"caption2"} className="mb-2">
                    Password*
                  </Text>
                  <View className="relative">
                    <Input
                      ref={passwordInputRef}
                      value={password}
                      onChangeText={setPassword}
                      placeholder="Enter password"
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      className="pr-12"
                      returnKeyType="done"
                      onSubmitEditing={handleLogin}
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

                <Button onPress={handleLogin} disabled={loading} className="mt-4 w-full" loading={loading}>
                  <Text>Login</Text>
                </Button>
              </View>

              <View className="pb-6 pt-8 items-center">
                <Text variant="footnote" color="tertiary" style={{ fontSize: 11 }}>
                  © {new Date().getFullYear()} kigongovincent625@gmail.com
                </Text>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </>
  );
}

