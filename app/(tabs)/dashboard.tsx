import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, View, Pressable, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FAB } from '@/components/nativewindui/FAB';
import { Icon } from '@/components/nativewindui/Icon';
import { Skeleton, SkeletonList, SkeletonSaleCard, SkeletonStatCard } from '@/components/nativewindui/Skeleton';
import { Text } from '@/components/nativewindui/Text';
import { formatCurrency } from '@/lib/currency';
import { formatTime } from '@/lib/dateUtils';
import { useColorScheme } from '@/lib/useColorScheme';
import { useAuthStore } from '@/store/authStore';
import { useProductStore } from '@/store/productStore';
import { useSaleStore } from '@/store/saleStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useUserStore } from '@/store/userStore';

export default function DashboardScreen() {
  const { colors } = useColorScheme();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const currentUser = useAuthStore((state) => state.currentUser);
  const normalizedRole = currentUser?.role?.toLowerCase();
  const isSuperAdmin = normalizedRole === 'super_admin' || normalizedRole === 'superadmin';
  const logout = useAuthStore((state) => state.logout);
  const allSales = useSaleStore((state) => state.getAllSales);
  const getSalesByUser = useSaleStore((state) => state.getSalesByUser);
  const getProductsByCompany = useProductStore((state) => state.getProductsByCompany);
  const allProducts = useProductStore((state) => state.products);
  const allUsers = useUserStore((state) => state.users);
  const fetchUsers = useUserStore((state) => state.fetchUsers);
  const fetchProducts = useProductStore((state) => state.fetchProducts);
  const fetchSales = useSaleStore((state) => state.fetchSales);
  const isLoadingSales = useSaleStore((state) => state.isLoading);
  const isLoadingProducts = useProductStore((state) => state.isLoading);
  const isLoadingUsers = useUserStore((state) => state.isLoading);
  const isLoading = isLoadingSales || isLoadingProducts || isLoadingUsers;

  // For employee users, only show their own sales data
  const userSales = currentUser ? getSalesByUser(currentUser.id) : [];
  const totalSales = isSuperAdmin ? allSales() : userSales;
  const totalRevenue = totalSales.reduce((sum, sale) => sum + sale.totalPrice, 0);
  const settings = useSettingsStore((state) => state.settings);
  const defaultCurrency = totalSales.length > 0 ? totalSales[0].currency : settings.defaultCurrency;

  // Get inventory stats - show company products
  const companyProducts = currentUser?.companyId ? getProductsByCompany(currentUser.companyId) : [];
  const outOfStock = companyProducts.filter((p) => p.quantity === 0).length;
  const lowStock = companyProducts.filter((p) => p.quantity > 0 && p.quantity < 10).length;
  const totalItems = companyProducts.length;
  const totalInventoryValue = companyProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);

  // Date calculations
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() - today.getDay());
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(thisWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(thisWeekStart);
  lastWeekEnd.setDate(thisWeekStart.getDate() - 1);
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  // Sales calculations
  const todaySales = totalSales.filter((sale) => {
    const saleDate = new Date(sale.createdAt);
    saleDate.setHours(0, 0, 0, 0);
    return saleDate.getTime() === today.getTime();
  });
  const todayRevenue = todaySales.reduce((sum, sale) => sum + sale.totalPrice, 0);

  const thisWeekSales = totalSales.filter((sale) => {
    const saleDate = new Date(sale.createdAt);
    return saleDate >= thisWeekStart;
  });
  const thisWeekRevenue = thisWeekSales.reduce((sum, sale) => sum + sale.totalPrice, 0);

  const lastWeekSales = totalSales.filter((sale) => {
    const saleDate = new Date(sale.createdAt);
    return saleDate >= lastWeekStart && saleDate <= lastWeekEnd;
  });
  const lastWeekRevenue = lastWeekSales.reduce((sum, sale) => sum + sale.totalPrice, 0);

  const thisMonthSales = totalSales.filter((sale) => {
    const saleDate = new Date(sale.createdAt);
    return saleDate >= thisMonthStart;
  });
  const thisMonthRevenue = thisMonthSales.reduce((sum, sale) => sum + sale.totalPrice, 0);

  // Calculate average sale value
  const averageSaleValue = totalSales.length > 0 ? totalRevenue / totalSales.length : 0;

  // Top selling products
  const topProducts = useMemo(() => {
    const productSales = new Map<string, { name: string; count: number; revenue: number }>();
    totalSales.forEach((sale) => {
      const key = `${sale.productName}_${sale.gasSize}`;
      const existing = productSales.get(key) || { name: `${sale.productName} ${sale.gasSize !== 'none' ? `(${sale.gasSize})` : ''}`, count: 0, revenue: 0 };
      productSales.set(key, {
        name: existing.name,
        count: existing.count + sale.quantity,
        revenue: existing.revenue + sale.totalPrice,
      });
    });
    return Array.from(productSales.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [totalSales]);

  // Sync status - for employees, only show their own offline items
  const offlineProducts = isSuperAdmin
    ? allProducts.filter((p) => p.syncStatus === 'offline').length
    : companyProducts.filter((p) => p.syncStatus === 'offline').length;
  const offlineSales = totalSales.filter((s) => s.syncStatus === 'offline').length;
  // Employees don't see offline users count (only super_admin does)
  const offlineUsers = isSuperAdmin ? allUsers.filter((u) => u.syncStatus === 'offline').length : 0;
  const totalOfflineItems = offlineProducts + offlineSales + offlineUsers;

  // Calculate week-over-week growth
  const weekGrowth = lastWeekRevenue > 0
    ? ((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100
    : 0;

  const handleLogout = () => {
    logout();
    router.replace('/(auth)/login');
  };

  // Get recent sales (last 5)
  const recentSales = [...totalSales]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  if (isLoading && !refreshing) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}>
          <View className="px-5 pt-6">
            {/* Overview Section Skeleton */}
            <View className="mb-6">
              <Skeleton width={100} height={14} style={{ marginBottom: 16 }} />
              <View className="gap-4">
                <View className="flex-row gap-4">
                  <SkeletonStatCard style={{ flex: 1 }} />
                  <SkeletonStatCard style={{ flex: 1 }} />
                </View>
                <View className="flex-row gap-4">
                  <SkeletonStatCard style={{ flex: 1 }} />
                  <SkeletonStatCard style={{ flex: 1 }} />
                </View>
                {isSuperAdmin && (
                  <View className="flex-row gap-4">
                    <SkeletonStatCard style={{ flex: 1 }} />
                    <SkeletonStatCard style={{ flex: 1 }} />
                  </View>
                )}
              </View>
            </View>

            {/* Inventory Section Skeleton - Only for super admin */}
            {isSuperAdmin && (
              <View className="mb-6">
                <Skeleton width={100} height={14} style={{ marginBottom: 16 }} />
                <View className="gap-4">
                  <View className="flex-row gap-4">
                    <SkeletonStatCard style={{ flex: 1 }} />
                    <SkeletonStatCard style={{ flex: 1 }} />
                  </View>
                  <View className="flex-row gap-4">
                    <SkeletonStatCard style={{ flex: 1 }} />
                    <SkeletonStatCard style={{ flex: 1 }} />
                  </View>
                </View>
              </View>
            )}

            {/* Recent Sales Section Skeleton */}
            <View className="mb-6">
              <View className="mb-5 flex-row items-center justify-between">
                <Skeleton width={120} height={14} />
                <Skeleton width={60} height={14} />
              </View>
              <SkeletonList count={3} renderItem={() => <SkeletonSaleCard />} />
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              try {
                // Fetch all data from backend
                await Promise.all([
                  fetchUsers(),
                  fetchProducts(),
                  fetchSales(),
                ]);
              } catch (error) {
                console.error('Error refreshing data:', error);
              } finally {
                setRefreshing(false);
              }
            }}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.background}
          />
        }>
        <View className="px-5 pt-6">

          {/* Overview Section */}
          <View className="mb-6">
            <Text variant="subhead" className="mb-4" style={{ fontSize: 13, color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {isSuperAdmin ? 'Overview' : 'My Sales'}
            </Text>
            <View className="gap-4">
              {/* First Row - Total Revenue & Total Sales */}
              <View className="flex-row gap-4">
                <View
                  className="flex-1 rounded-2xl px-5 py-5"
                  style={{
                    backgroundColor: colors.card,
                  }}>
                  <View className="flex-row items-start justify-between mb-3">
                    <View className="flex-1 pr-2">
                      <Text
                        variant="heading"
                        style={{ color: colors.primary, fontSize: 17 }}
                        numberOfLines={1}
                        adjustsFontSizeToFit>
                        {formatCurrency(totalRevenue, defaultCurrency)}
                      </Text>
                    </View>
                    <View
                      className="h-11 w-11 items-center justify-center rounded-xl"
                      style={{ backgroundColor: colors.background }}>
                      <Icon name="creditcard.fill" size={22} color={colors.primary} />
                    </View>
                  </View>
                  <Text variant="footnote" color="tertiary" style={{ fontSize: 13 }}>
                    {isSuperAdmin ? 'Total Revenue' : 'My Revenue'}
                  </Text>
                </View>

                <View
                  className="flex-1 rounded-2xl px-5 py-5"
                  style={{
                    backgroundColor: colors.card,
                  }}>
                  <View className="flex-row items-start justify-between mb-3">
                    <View className="flex-1 pr-2">
                      <Text
                        variant="heading"
                        style={{ color: colors.primary, fontSize: 17 }}
                        numberOfLines={1}
                        adjustsFontSizeToFit>
                        {totalSales.length}
                      </Text>
                    </View>
                    <View
                      className="h-11 w-11 items-center justify-center rounded-xl"
                      style={{ backgroundColor: colors.background }}>
                      <Icon name="chart.bar.fill" size={22} color={colors.primary} />
                    </View>
                  </View>
                  <Text variant="footnote" color="tertiary" style={{ fontSize: 13 }}>
                    {isSuperAdmin ? 'Total Sales' : 'My Sales'}
                  </Text>
                </View>
              </View>

              {/* Second Row - Today's Revenue & This Week */}
              <View className="flex-row gap-4">
                <View
                  className="flex-1 rounded-2xl px-5 py-5"
                  style={{
                    backgroundColor: colors.card,
                  }}>
                  <View className="flex-row items-start justify-between mb-3">
                    <View className="flex-1 pr-2">
                      <Text
                        variant="heading"
                        style={{ color: colors.primary, fontSize: 17 }}
                        numberOfLines={1}
                        adjustsFontSizeToFit>
                        {formatCurrency(todayRevenue, defaultCurrency)}
                      </Text>
                    </View>
                    <View
                      className="h-11 w-11 items-center justify-center rounded-xl"
                      style={{ backgroundColor: colors.background }}>
                      <Icon name="sun.max.fill" size={22} color={colors.primary} />
                    </View>
                  </View>
                  <Text variant="footnote" color="tertiary" style={{ fontSize: 13 }}>
                    Today's Revenue
                  </Text>
                  <Text variant="footnote" color="tertiary" style={{ fontSize: 11, marginTop: 2 }}>
                    {todaySales.length} sales
                  </Text>
                </View>

                <View
                  className="flex-1 rounded-2xl px-5 py-5"
                  style={{
                    backgroundColor: colors.card,
                  }}>
                  <View className="flex-row items-start justify-between mb-3">
                    <View className="flex-1 pr-2">
                      <Text
                        variant="heading"
                        style={{ color: colors.primary, fontSize: 17 }}
                        numberOfLines={1}
                        adjustsFontSizeToFit>
                        {formatCurrency(thisWeekRevenue, defaultCurrency)}
                      </Text>
                    </View>
                    <View
                      className="h-11 w-11 items-center justify-center rounded-xl"
                      style={{ backgroundColor: colors.background }}>
                      <Icon name="calendar" size={22} color={colors.primary} />
                    </View>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <Text variant="footnote" color="tertiary" style={{ fontSize: 13 }}>
                      This Week
                    </Text>
                    {weekGrowth !== 0 && isSuperAdmin && (
                      <View className="flex-row items-center gap-1">
                        <Icon
                          name={weekGrowth > 0 ? 'arrow.up' : 'arrow.down'}
                          size={12}
                          color={weekGrowth > 0 ? '#34C759' : '#FF3B30'}
                        />
                        <Text
                          variant="footnote"
                          style={{
                            fontSize: 11,
                            color: weekGrowth > 0 ? '#34C759' : '#FF3B30',
                          }}>
                          {Math.abs(weekGrowth).toFixed(1)}%
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text variant="footnote" color="tertiary" style={{ fontSize: 11, marginTop: 2 }}>
                    {thisWeekSales.length} sales
                  </Text>
                </View>
              </View>

              {/* Third Row - This Month & Average Sale (only for super admin) */}
              {isSuperAdmin && (
                <View className="flex-row gap-4">
                  <View
                    className="flex-1 rounded-2xl px-5 py-5"
                    style={{
                      backgroundColor: colors.card,
                    }}>
                    <View className="flex-row items-start justify-between mb-3">
                      <View className="flex-1 pr-2">
                        <Text
                          variant="heading"
                          style={{ color: colors.primary, fontSize: 17 }}
                          numberOfLines={1}
                          adjustsFontSizeToFit>
                          {formatCurrency(thisMonthRevenue, defaultCurrency)}
                        </Text>
                      </View>
                      <View
                        className="h-11 w-11 items-center justify-center rounded-xl"
                        style={{ backgroundColor: colors.background }}>
                        <Icon name="calendar.badge.clock" size={22} color={colors.primary} />
                      </View>
                    </View>
                    <Text variant="footnote" color="tertiary" style={{ fontSize: 13 }}>
                      This Month
                    </Text>
                    <Text variant="footnote" color="tertiary" style={{ fontSize: 11, marginTop: 2 }}>
                      {thisMonthSales.length} sales
                    </Text>
                  </View>

                  <View
                    className="flex-1 rounded-2xl px-5 py-5"
                    style={{
                      backgroundColor: colors.card,
                    }}>
                    <View className="flex-row items-start justify-between mb-3">
                      <View className="flex-1 pr-2">
                        <Text
                          variant="heading"
                          style={{ color: colors.primary, fontSize: 17 }}
                          numberOfLines={1}
                          adjustsFontSizeToFit>
                          {formatCurrency(averageSaleValue, defaultCurrency)}
                        </Text>
                      </View>
                      <View
                        className="h-11 w-11 items-center justify-center rounded-xl"
                        style={{ backgroundColor: colors.background }}>
                        <Icon name="chart.line.uptrend.xyaxis" size={22} color={colors.primary} />
                      </View>
                    </View>
                    <Text variant="footnote" color="tertiary" style={{ fontSize: 13 }}>
                      Avg Sale Value
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Inventory Section - Only for super admin */}
          {isSuperAdmin && (
            <View className="mb-6">
              <Text variant="subhead" className="mb-4" style={{ fontSize: 13, color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Inventory
              </Text>
              <View className="gap-4">
                <View className="flex-row gap-4">
                  <View
                    className="flex-1 rounded-2xl px-5 py-5"
                    style={{
                      backgroundColor: colors.card,
                    }}>
                    <View className="flex-row items-start justify-between mb-3">
                      <View className="flex-1 pr-2">
                        <Text
                          variant="heading"
                          style={{ color: colors.primary, fontSize: 17 }}
                          numberOfLines={1}
                          adjustsFontSizeToFit>
                          {totalItems}
                        </Text>
                      </View>
                      <View
                        className="h-11 w-11 items-center justify-center rounded-xl"
                        style={{ backgroundColor: colors.background }}>
                        <Icon name="shippingbox.fill" size={22} color={colors.primary} />
                      </View>
                    </View>
                    <Text variant="footnote" color="tertiary" style={{ fontSize: 13 }}>
                      Total Products
                    </Text>
                  </View>

                  <View
                    className="flex-1 rounded-2xl px-5 py-5"
                    style={{
                      backgroundColor: colors.card,
                    }}>
                    <View className="flex-row items-start justify-between mb-3">
                      <View className="flex-1 pr-2">
                        <Text
                          variant="heading"
                          style={{ color: colors.primary, fontSize: 17 }}
                          numberOfLines={1}
                          adjustsFontSizeToFit>
                          {formatCurrency(totalInventoryValue, defaultCurrency)}
                        </Text>
                      </View>
                      <View
                        className="h-11 w-11 items-center justify-center rounded-xl"
                        style={{ backgroundColor: colors.background }}>
                        <Icon name="dollarsign.circle.fill" size={22} color={colors.primary} />
                      </View>
                    </View>
                    <Text variant="footnote" color="tertiary" style={{ fontSize: 13 }}>
                      Inventory Value
                    </Text>
                  </View>
                </View>

                <View className="flex-row gap-4">
                  <View
                    className="flex-1 rounded-2xl px-5 py-5"
                    style={{
                      backgroundColor: colors.card,
                    }}>
                    <View className="flex-row items-start justify-between mb-3">
                      <View className="flex-1 pr-2">
                        <Text
                          variant="heading"
                          style={{ color: colors.primary, fontSize: 17 }}
                          numberOfLines={1}
                          adjustsFontSizeToFit>
                          {lowStock}
                        </Text>
                      </View>
                      <View
                        className="h-11 w-11 items-center justify-center rounded-xl"
                        style={{ backgroundColor: colors.background }}>
                        <Icon name="exclamationmark.triangle.fill" size={22} color={colors.primary} />
                      </View>
                    </View>
                    <Text variant="footnote" color="tertiary" style={{ fontSize: 13 }}>
                      Low Stock
                    </Text>
                  </View>

                  <View
                    className="flex-1 rounded-2xl px-5 py-5"
                    style={{
                      backgroundColor: colors.card,
                    }}>
                    <View className="flex-row items-start justify-between mb-3">
                      <View className="flex-1 pr-2">
                        <Text
                          variant="heading"
                          style={{ color: colors.primary, fontSize: 17 }}
                          numberOfLines={1}
                          adjustsFontSizeToFit>
                          {outOfStock}
                        </Text>
                      </View>
                      <View
                        className="h-11 w-11 items-center justify-center rounded-xl"
                        style={{ backgroundColor: colors.background }}>
                        <Icon name="xmark.circle.fill" size={22} color={colors.primary} />
                      </View>
                    </View>
                    <Text variant="footnote" color="tertiary" style={{ fontSize: 13 }}>
                      Out of Stock
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Top Products Section - Only for super admin */}
          {isSuperAdmin && topProducts.length > 0 && (
            <View className="mb-6">
              <View className="mb-4 flex-row items-center justify-between">
                <Text variant="subhead" style={{ fontSize: 13, color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Top Products
                </Text>
                <Pressable
                  onPress={() => router.push('/(tabs)/inventory')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text variant="footnote" style={{ color: colors.primary, fontSize: 14 }}>
                    View All
                  </Text>
                </Pressable>
              </View>
              <View className="gap-3">
                {topProducts.slice(0, 3).map((product, index) => (
                  <View
                    key={index}
                    className="flex-row items-center gap-4 rounded-2xl px-5 py-4"
                    style={{
                      backgroundColor: colors.card,
                    }}>
                    <View
                      className="h-12 w-12 items-center justify-center rounded-xl"
                      style={{ backgroundColor: colors.background }}>
                      <Text variant="subhead" style={{ color: colors.primary, fontSize: 15 }}>
                        #{index + 1}
                      </Text>
                    </View>
                    <View className="flex-1 min-w-0">
                      <Text
                        variant="subhead"
                        style={{ fontSize: 15, marginBottom: 2 }}
                        numberOfLines={1}>
                        {product.name}
                      </Text>
                      <Text variant="footnote" color="tertiary" style={{ fontSize: 12 }}>
                        {product.count} sold
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text
                        variant="footnote"
                        style={{ color: colors.primary, fontSize: 14 }}
                        numberOfLines={1}>
                        {formatCurrency(product.revenue, defaultCurrency)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Sync Status Section - Only for super admin */}
          {isSuperAdmin && totalOfflineItems > 0 && (
            <View className="mb-6">
              <Pressable
                onPress={() => router.push('/(tabs)/settings')}
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
                <View
                  className="rounded-2xl px-5 py-4 flex-row items-center gap-4"
                  style={{
                    backgroundColor: colors.card,
                  }}>
                  <View
                    className="h-12 w-12 items-center justify-center rounded-xl"
                    style={{ backgroundColor: colors.background }}>
                    <Icon name="externaldrive.fill" size={24} color="#FF6B6B" />
                  </View>
                  <View className="flex-1">
                    <Text variant="subhead" style={{ fontSize: 15, marginBottom: 2 }}>
                      Offline Items
                    </Text>
                    <Text variant="footnote" color="tertiary" style={{ fontSize: 12 }}>
                      {totalOfflineItems} items pending sync
                    </Text>
                  </View>
                  <Icon name="chevron.right" size={20} color={colors.mutedForeground} />
                </View>
              </Pressable>
            </View>
          )}

          {/* Recent Sales Section */}
          <View className="mb-6">
            <View className="mb-5 flex-row items-center justify-between">
              <Text variant="subhead" style={{ fontSize: 13, color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {isSuperAdmin ? 'Recent Sales' : 'My Recent Sales'}
              </Text>
              <Pressable
                onPress={() => router.push('/(tabs)/sales')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text variant="footnote" style={{ color: colors.primary, fontSize: 14 }}>
                  View All
                </Text>
              </Pressable>
            </View>

            <View className="gap-3">
              {recentSales.length > 0 ? (
                recentSales.map((sale, index) => (
                  <Pressable
                    key={sale.id || `sale-${index}`}
                    onPress={() =>
                      router.push(`/sale-details/${sale.id}`)
                    }>
                    <View
                      className="flex-row items-center gap-4 rounded-2xl px-5 py-4"
                      style={{
                        backgroundColor: colors.card,
                      }}>
                      <View
                        className="h-14 w-14 items-center justify-center rounded-xl"
                        style={{ backgroundColor: colors.background }}>
                        <Icon name="doc.fill" size={13.5 * 1.9} color={colors.primary} />
                      </View>
                      <View className="flex-1 min-w-0">
                        <Text
                          variant="subhead"
                          style={{ fontSize: 14, fontWeight: '500', marginBottom: 4 }}
                          numberOfLines={1}>
                          {sale.productName} {sale.gasSize !== 'none' && `(${sale.gasSize})`}
                        </Text>
                        <View className="flex-row items-center gap-2">
                          <View
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: colors.primary }}
                          />
                          <Text variant="footnote" color="tertiary" style={{ fontSize: 12 }}>
                            {sale.seller?.name || 'Unknown'}
                          </Text>
                          <Text variant="footnote" color="tertiary" style={{ fontSize: 12 }}>
                            • {formatTime(sale.createdAt)}
                          </Text>
                        </View>
                      </View>
                      <View className="items-end ml-2">
                        <Text
                          variant="footnote"
                          style={{ color: colors.primary, fontSize: 14, marginBottom: 2 }}
                          numberOfLines={1}
                          adjustsFontSizeToFit>
                          {formatCurrency(sale.totalPrice, sale.currency)}
                        </Text>
                        <Icon
                          name="chevron.right"
                          size={14}
                          color={colors.primary}
                          style={{ opacity: 0.5 }}
                        />
                      </View>
                    </View>
                  </Pressable>
                ))
              ) : (
                <View
                  className="rounded-2xl px-5 py-12 items-center justify-center"
                  style={{
                    backgroundColor: colors.card,
                  }}>
                  <Icon name="doc" size={32} color={colors.primary} style={{ opacity: 0.3, marginBottom: 8 }} />
                  <Text variant="subhead" color="tertiary" style={{ fontSize: 15 }}>
                    No recent sales
                  </Text>
                  <Text variant="footnote" color="tertiary" style={{ fontSize: 13, marginTop: 4 }}>
                    Start recording sales to see them here
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* FAB */}
      <FAB
        options={[
          {
            label: 'Record Sale',
            icon: 'plus.circle.fill',
            onPress: () => router.push('/record-sale'),
          },
          ...(isSuperAdmin
            ? [
                {
                  label: 'Add Product',
                  icon: 'cube.box.fill',
                  onPress: () => router.push('/(tabs)/inventory?openAddModal=true'),
                },
              ]
            : []),
        ].filter(Boolean)}
      />
    </View>
  );
}
