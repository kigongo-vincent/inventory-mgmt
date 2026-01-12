import '@/global.css';
import '@/lib/i18n'; // Initialize i18n

import { ActionSheetProvider } from '@expo/react-native-action-sheet';

import { ThemeProvider as NavThemeProvider, Theme } from '@react-navigation/native';
import * as Device from 'expo-device';
import { Link, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, Pressable, Animated } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useMemo, useState } from 'react';
import { useFonts } from 'expo-font';

import { Icon } from '@/components/nativewindui/Icon';
import { ThemeToggle } from '@/components/nativewindui/ThemeToggle';
import { cn } from '@/lib/cn';
import { useColorScheme } from '@/lib/useColorScheme';
import { NAV_THEME } from '@/theme';
import { useSettingsStore } from '@/store/settingsStore';
import { COLORS } from '@/theme/colors';
import { setAuthErrorHandler, API_BASE_URL } from '@/lib/api/config';
import { useAuthStore } from '@/store/authStore';
import { router } from 'expo-router';
import { requestNotificationPermissions } from '@/lib/services/notificationService';
import { sseClient } from '@/lib/services/sseClient';
import * as Notifications from 'expo-notifications';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

const isIos26 = Platform.select({ default: false, ios: Device.osVersion?.startsWith('26.') });

export default function RootLayout() {
  const { colorScheme, isDarkColorScheme, colors } = useColorScheme();
  const settings = useSettingsStore((state) => state.settings);
  const logout = useAuthStore((state) => state.logout);
  const currentUser = useAuthStore((state) => state.currentUser);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Load Poppins fonts
  const [fontsLoaded, fontError] = useFonts({
    'Poppins-Light': require('../fonts/Poppins-Light.ttf'),
    'Poppins-Regular': require('../fonts/Poppins-Regular.ttf'),
    'Poppins-Medium': require('../fonts/Poppins-Medium.ttf'),
    'Poppins-SemiBold': require('../fonts/Poppins-SemiBold.ttf'),
    'Poppins-Bold': require('../fonts/Poppins-Bold.ttf'),
  });

  // Log API base URL on app startup
  useEffect(() => {
    console.log('═══════════════════════════════════════');
    console.log('🚀 APP STARTED');
    console.log('📡 API Base URL:', API_BASE_URL);
    console.log('═══════════════════════════════════════');
  }, []);

  // Hide splash screen when fonts are loaded
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Set up auto-logout handler for API 401 errors
  useEffect(() => {
    setAuthErrorHandler(async () => {
      await logout();
      router.replace('/(auth)/login');
    });
  }, [logout]);

  // Initialize notifications and SSE
  useEffect(() => {
    let notificationListener: Notifications.Subscription | null = null;
    let responseListener: Notifications.Subscription | null = null;

    const initializeNotifications = async () => {
      // Request notification permissions
      await requestNotificationPermissions();

      // Set up notification listeners
      notificationListener = Notifications.addNotificationReceivedListener((notification) => {
        console.log('Notification received:', notification);
      });

      responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        console.log('Notification tapped:', data);

        // Navigate to sale details if it's a sale notification
        if (data?.type === 'sale' && data?.saleId) {
          router.push(`/sale-details/${data.saleId}`);
        }
      });
    };

    initializeNotifications();

    return () => {
      if (notificationListener) {
        Notifications.removeNotificationSubscription(notificationListener);
      }
      if (responseListener) {
        Notifications.removeNotificationSubscription(responseListener);
      }
    };
  }, []);

  // Connect/disconnect SSE based on authentication and role
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      const normalizedRole = currentUser.role?.toLowerCase();
      const isSuperAdmin = normalizedRole === 'super_admin' || normalizedRole === 'superadmin';

      if (isSuperAdmin) {
        // Connect to SSE for sale events
        console.log('Connecting to SSE for sale events...');
        sseClient.connect();
      } else {
        // Disconnect if not super admin
        sseClient.disconnect();
      }
    } else {
      // Disconnect when logged out
      sseClient.disconnect();
    }

    return () => {
      // Cleanup on unmount
      sseClient.disconnect();
    };
  }, [isAuthenticated, currentUser]);
  
  // Create dynamic nav theme with Spotify colors
  const dynamicNavTheme = useMemo(() => {
    return NAV_THEME[colorScheme] as Theme;
  }, [colorScheme]);

  // Don't render until fonts are loaded
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <>
      <StatusBar
        key={`root-status-bar-${isDarkColorScheme ? 'light' : 'dark'}`}
        style={isDarkColorScheme ? 'light' : 'dark'}
      />
      {/* WRAP YOUR APP WITH ANY ADDITIONAL PROVIDERS HERE */}
      {/* <ExampleProvider> */}
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
        <BottomSheetModalProvider>
          <ActionSheetProvider>
            <NavThemeProvider value={dynamicNavTheme}>
              <Stack 
                screenOptions={{ 
                  headerShown: false,
                  contentStyle: {
                    backgroundColor: colors.background,
                  },
                  animation: 'default',
                  animationDuration: 200,
                }}>
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="modal" options={MODAL_OPTIONS} />
                <Stack.Screen name="account-settings" options={{ headerShown: false }} />
                <Stack.Screen name="app-settings" options={{ headerShown: false }} />
                <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
                <Stack.Screen name="change-password" options={{ headerShown: false }} />
                <Stack.Screen name="notifications" options={{ headerShown: false }} />
                <Stack.Screen name="notification-preferences" options={{ headerShown: false }} />
                <Stack.Screen name="language" options={{ headerShown: false }} />
                <Stack.Screen name="help-support" options={{ headerShown: false }} />
                <Stack.Screen name="offline-products" options={{ headerShown: false }} />
                <Stack.Screen name="offline-sales" options={{ headerShown: false }} />
                <Stack.Screen name="offline-users" options={{ headerShown: false }} />
                <Stack.Screen name="offline-branches" options={{ headerShown: false }} />
                <Stack.Screen name="branch-sales" options={{ headerShown: false }} />
                <Stack.Screen name="branch-details" options={{ headerShown: false }} />
                <Stack.Screen name="sale-details" options={{ headerShown: false }} />
                <Stack.Screen name="search-results" options={{ headerShown: false }} />
                <Stack.Screen 
                  name="record-sale" 
                  options={{ 
                    headerShown: false 
                  }} 
                />
                <Stack.Screen name="edit-sale" options={{ headerShown: false }} />
                <Stack.Screen name="edit-user" options={{ headerShown: false }} />
                <Stack.Screen name="edit-product" options={{ headerShown: false }} />
                <Stack.Screen name="edit-branch" options={{ headerShown: false }} />
              </Stack>
            </NavThemeProvider>
          </ActionSheetProvider>
        </BottomSheetModalProvider>
      </GestureHandlerRootView>
      {/* </ExampleProvider> */}
    </>
  );
}

const INDEX_OPTIONS = {
  headerLargeTitle: true,
  headerTransparent: isIos26,
  title: 'NativewindUI',
  headerRight: () => <SettingsIcon />,
} as const;

function SettingsIcon() {
  return (
    <Link href="/modal" asChild>
      <Pressable className={cn('opacity-80 active:opacity-50', isIos26 && 'px-1.5')}>
        <Icon name="gearshape" className="text-foreground" />
      </Pressable>
    </Link>
  );
}

const MODAL_OPTIONS = {
  presentation: 'modal',
  animation: 'fade_from_bottom', // for android
  title: 'Settings',
  headerRight: () => <ThemeToggle />,
} as const;
