import { Redirect, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { ActivityIndicator } from '@/components/nativewindui/ActivityIndicator';
import { getAuthToken } from '@/lib/api/config';
import { useColorScheme } from '@/lib/useColorScheme';
import { useAuthStore } from '@/store/authStore';
import { useBranchStore } from '@/store/branchStore';
import { useExpenseStore } from '@/store/expenseStore';
import { useProductStore } from '@/store/productStore';
import { useSaleStore } from '@/store/saleStore';
import { useUserStore } from '@/store/userStore';

export default function Index() {
  const segments = useSegments();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const fetchUsers = useUserStore((state) => state.fetchUsers);
  const fetchProducts = useProductStore((state) => state.fetchProducts);
  const fetchSales = useSaleStore((state) => state.fetchSales);
  const fetchBranches = useBranchStore((state) => state.fetchBranches);
  const fetchExpenses = useExpenseStore((state) => state.fetchExpenses);
  const { colors } = useColorScheme();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Wait for auth store to hydrate before proceeding
    if (!hasHydrated) {
      return;
    }

    // Fetch data from backend when authenticated (only if we have a token to avoid 401/logout)
    const loadData = async () => {
      if (isAuthenticated) {
        const token = await getAuthToken();
        if (!token) {
          // Auth state out of sync (e.g. token cleared); skip fetches to avoid 401s
          setIsReady(true);
          return;
        }
        try {
          await Promise.all([
            fetchUsers(),
            fetchProducts(),
            fetchSales(),
            fetchBranches(),
            fetchExpenses(),
          ]);
        } catch (error) {
          console.error('Error loading data from backend:', error);
          // Continue even if fetch fails (offline mode)
        }
      }
      setIsReady(true);
    };

    loadData();
  }, [hasHydrated, isAuthenticated, fetchUsers, fetchProducts, fetchSales, fetchBranches, fetchExpenses]);

  // Show loading while waiting for hydration or data loading
  if (!hasHydrated || !isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const inAuthGroup = segments[0] === '(auth)';
  const inTabsGroup = segments[0] === '(tabs)';

  // Redirect to login if not authenticated
  if (!isAuthenticated && !inAuthGroup) {
    return <Redirect href="/(auth)/login" />;
  }

  // Redirect to dashboard if authenticated and in auth group
  if (isAuthenticated && inAuthGroup) {
    return <Redirect href="/(tabs)/dashboard" />;
  }

  // Redirect to dashboard if authenticated and no specific route
  if (isAuthenticated && segments.length === 0) {
    return <Redirect href="/(tabs)/dashboard" />;
  }

  // Default: show nothing (let router handle it)
  return null;
}
