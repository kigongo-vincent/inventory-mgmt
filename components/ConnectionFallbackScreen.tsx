import React from 'react';
import { View, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { Button } from '@/components/nativewindui/Button';
import { Icon } from '@/components/nativewindui/Icon';
import { Text } from '@/components/nativewindui/Text';
import { useColorScheme } from '@/lib/useColorScheme';
import { API_BASE_URL } from '@/lib/api/config';

interface ConnectionFallbackScreenProps {
  errorMessage?: string;
  onRetry: () => void;
  isRetrying?: boolean;
}

export function ConnectionFallbackScreen({
  errorMessage,
  onRetry,
  isRetrying = false,
}: ConnectionFallbackScreenProps) {
  const { colors, colorScheme } = useColorScheme();

  return (
    <>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <SafeAreaView
        key={colorScheme}
        className="flex-1"
        style={{ backgroundColor: colors.background }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          className="flex-1">
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}>
            <View className="flex-1 px-6 justify-center">
              <View className="mb-8 items-center">
                <Text variant="title1" className="mb-2 text-center">
                  Gas Center
                </Text>
                <Text color="tertiary" className="text-center mb-6">
                  Gas Selling & Distribution
                </Text>

                <View
                  className="mb-6 items-center justify-center rounded-full"
                  style={{
                    width: 80,
                    height: 80,
                    // backgroundColor: colors.destructive + '20',
                  }}>
                  <Icon
                    name="exclamationmark.triangle.fill"
                    size={40}
                    color={colors.destructive}
                  />
                </View>

                <Text variant="title2" className="mb-3 text-center">
                  Connection Failed
                </Text>

                <Text variant="body" color="tertiary" className="text-center mb-4">
                  Unable to connect to the server
                </Text>

                {errorMessage && (
                  <Text variant="caption1" color="tertiary" className="text-center mb-4">
                    {errorMessage}
                  </Text>
                )}

                <View className="mt-4 p-4 rounded-lg w-full ">
                  <Text variant="footnote" color="tertiary" className="text-center mb-2">
                    Server URL:
                  </Text>
                  <Text variant="caption1" color="secondary" className="text-center font-poppins-medium">
                    {API_BASE_URL}
                  </Text>
                </View>
              </View>

              <View className="gap-4">
                <Button
                  onPress={onRetry}
                  disabled={isRetrying}
                  loading={isRetrying}
                  className="mt-4 w-full"
                  variant="primary">
                  {!isRetrying && <Text>Retry Connection</Text>}
                  {isRetrying && <Text>Retrying...</Text>}
                </Button>

                <Text variant="footnote" color="tertiary" className="text-center mt-2">
                  Please check your internet connection and ensure the server is running
                </Text>
              </View>

              <View className="pb-6 pt-8 items-center">
                <Text variant="footnote" color="tertiary" style={{ fontSize: 11 }}>
                  © {new Date().getFullYear()} kigongovincent625@gmail.com
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}
