import { router, Tabs } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/nativewindui/Icon';
import { TabHeader } from '@/components/TabHeader';
import { useAuthStore } from '@/store/authStore';
import { useBranchStore } from '@/store/branchStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useProductStore } from '@/store/productStore';
import { useSaleStore } from '@/store/saleStore';
import { useUserStore } from '@/store/userStore';
import { useColorScheme } from '@/lib/useColorScheme';

export default function TabsLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const currentUser = useAuthStore((state) => state.currentUser);
  const fetchUsers = useUserStore((state) => state.fetchUsers);
  const fetchProducts = useProductStore((state) => state.fetchProducts);
  const fetchSales = useSaleStore((state) => state.fetchSales);
  const fetchBranches = useBranchStore((state) => state.fetchBranches);
  const { colors } = useColorScheme();
  const insets = useSafeAreaInsets();

  const isSuperAdmin = currentUser?.role === 'super_admin';

  useEffect(() => {
    // Fetch data from backend when authenticated
    if (isAuthenticated) {
      const loadData = async () => {
        try {
          // Fetch all data from backend in parallel to ensure everything is synced
          await Promise.all([
            fetchUsers(),
            fetchProducts(),
            fetchSales(),
            fetchBranches(),
          ]);
        } catch (error) {
          console.error('Error loading data from backend:', error);
          // Continue even if fetch fails (offline mode)
        }
      };

      loadData();
    }
  }, [isAuthenticated, fetchUsers, fetchProducts, fetchSales, fetchBranches]);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated]);

  const headerComponent = useMemo(() => () => <TabHeader />, []);

  return (
    // <SafeAreaView edges={["top", "left", "right"]}>
      <Tabs
        screenOptions={{
          header: headerComponent,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.mutedForeground,
          tabBarStyle: {
            backgroundColor: colors.card,
            paddingBottom: Math.max(insets.bottom, 10),
            paddingTop: 10,
            height: 60 + Math.max(insets.bottom, 10),
          },
          tabBarLabelStyle: {
            fontSize: 11,
          },
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}>
        <Tabs.Screen
          name="inventory"
          options={{
            title: 'Inventory',
            tabBarIcon: ({ color, size }) => (
              <Icon name="shippingbox.fill" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="users"
          options={{
            title: 'Users',
            tabBarIcon: ({ color, size }) => (
              <Icon name="person.fill" size={size} color={color} />
            ),
            href: isSuperAdmin ? undefined : null, // Hide from tab bar for employees
          }}
        />
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Home',
            tabBarIcon: ({ focused, color, size }) =>
              isSuperAdmin ? (
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: colors.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: Math.max(insets.bottom, 10),
                  }}>
                  <Icon name="house.fill" size={24} color="#FFFFFF" />
                </View>
              ) : (
                <Icon name="house.fill" size={size} color={color} />
              ),
            tabBarLabel: isSuperAdmin ? '' : 'Home',
          }}
        />
        <Tabs.Screen
          name="sales"
          options={{
            title: 'Sales',
            tabBarIcon: ({ color, size }) => (
              <Icon name="chart.bar.fill" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Offline',
            tabBarIcon: ({ color, size }) => (
              <Icon name="externaldrive.fill" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="user-sales"
          options={{
            href: null, // Hide from tab bar
          }}
        />
      </Tabs>
    // </SafeAreaView>
  );
}
