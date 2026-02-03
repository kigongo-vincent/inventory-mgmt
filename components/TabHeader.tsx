import { router } from 'expo-router';
import React, { useState, useEffect, useRef } from 'react';
import { Pressable, View, Image, Text as RNText, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { Icon } from '@/components/nativewindui/Icon';
import { Input } from '@/components/nativewindui/Input';
import { Text } from '@/components/nativewindui/Text';
import { useColorScheme } from '@/lib/useColorScheme';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';

export function TabHeader() {
  const { colors, colorScheme } = useColorScheme();
  const currentUser = useAuthStore((state) => state.currentUser);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [searchQuery, setSearchQuery] = useState('');
  const getUnreadCount = useNotificationStore((state) => state.getUnreadCount);
  const fetchNotifications = useNotificationStore((state) => state.fetchNotifications);
  const unreadCount = getUnreadCount();
  const appStateRef = useRef(AppState.currentState);

  // Fetch notifications on mount and when app returns to foreground (no polling)
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    fetchNotifications();

    const handleAppStateChange = (nextAppState: string) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        fetchNotifications();
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [isAuthenticated, fetchNotifications]);

  return (
    <>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <View style={{ backgroundColor: colors.card }}>
        <SafeAreaView edges={['top']}>
          <View className="px-5 pt-5 pb-6">
            <View className="flex-row items-center gap-3">
              <View className="flex-1 relative mr-2.5">
                <View
                  className="flex-1 pr-4 justify-center rounded-xl"
                  style={{
                    backgroundColor: colors.input || colors.background,
                    height: 40,
                  }}>
                  <Input
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search sales, products..."
                    placeholderTextColor={colors.mutedForeground}
                    className="flex-1 text-base pl-10"
                    style={{
                      backgroundColor: 'transparent',
                      color: colors.foreground,
                      paddingVertical: 0,
                      height: '100%',
                    }}
                    onSubmitEditing={() => {
                      if (searchQuery.trim()) {
                        router.push({ pathname: '/search-results', params: { query: searchQuery } });
                      }
                    }}
                  />
                  <View className="absolute left-3.5 top-0 bottom-0 justify-center pointer-events-none">
                    <Icon name="magnifyingglass" size={18} color={colors.mutedForeground} />
                  </View>
                </View>
              </View>
              <View className="flex-row items-center gap-2.5">
                <Pressable
                  onPress={() => router.push('/notifications')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  className="p-1.5">
                  <View className="relative" style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="bell" size={22} color={colors.foreground} />
                    {unreadCount > 0 && (
                      <View
                        className="absolute items-center justify-center rounded-full"
                        style={{
                          backgroundColor: colors.destructive,
                          height: 22,
                          minWidth: 22,
                          paddingHorizontal: unreadCount > 9 ? 6 : 3,
                          paddingVertical: 2,
                          right: -4,
                          top: -4,
                        }}>
                        <Text
                          style={{
                            fontSize: 13,
                            fontFamily: 'Poppins-Bold',
                            color: '#FFFFFF',
                            includeFontPadding: false,
                            textAlign: 'center',
                            textAlignVertical: 'center',
                            lineHeight: 15,
                          }}>
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </Text>
                      </View>
                    )}
                  </View>
                </Pressable>
                <Pressable
                  onPress={() => router.push('/account-settings')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  className="p-1.5">
                  <View
                    className="h-10 w-10 rounded-full overflow-hidden"
                    style={{
                      backgroundColor: colors.input || colors.background,
                      borderWidth: 1,
                      borderColor: colors.border || colors.mutedForeground,
                    }}>
                    {currentUser?.profilePictureUri ? (
                      <Image
                        key={`nav-profile-${currentUser.id}-${currentUser.profilePictureUri}`}
                        source={{
                          uri: currentUser.profilePictureUri.startsWith('file://')
                            ? currentUser.profilePictureUri
                            : currentUser.profilePictureUri.startsWith('http')
                              ? currentUser.profilePictureUri
                              : `file://${currentUser.profilePictureUri}`
                        }}
                        style={{ width: 40, height: 40 }}
                        resizeMode="cover"
                        onError={(error) => {
                          console.error('Image load error:', error.nativeEvent?.error || error, 'URI:', currentUser.profilePictureUri);
                        }}
                        onLoad={() => {
                          console.log('Nav image loaded successfully');
                        }}
                      />
                    ) : (
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}>
                        <RNText
                          style={{
                            color: colors.foreground,
                            fontSize: 18,
                            fontFamily: 'Poppins-SemiBold',
                            includeFontPadding: false,
                            textAlign: 'center',
                            textAlignVertical: 'center',
                          }}>
                          {currentUser?.name?.charAt(0).toUpperCase() || 'U'}
                        </RNText>
                      </View>
                    )}
                  </View>
                </Pressable>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </>
  );
}
