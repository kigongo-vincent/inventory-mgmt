import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { Icon } from '@/components/nativewindui/Icon';
import { Skeleton, SkeletonList, SkeletonSaleCard, SkeletonStatCard } from '@/components/nativewindui/Skeleton';
import { Text } from '@/components/nativewindui/Text';
import { formatCurrency } from '@/lib/currency';
import { useColorScheme } from '@/lib/useColorScheme';
import { useAuthStore } from '@/store/authStore';
import { useSaleStore } from '@/store/saleStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useUserStore } from '@/store/userStore';

export default function UserSalesScreen() {
  const { colors } = useColorScheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ userId?: string; userName?: string }>();
  const [refreshing, setRefreshing] = useState(false);
  const currentUser = useAuthStore((state) => state.currentUser);
  const getSalesByUser = useSaleStore((state) => state.getSalesByUser);
  const getUserById = useUserStore((state) => state.getUserById);
  const fetchSalesByUser = useSaleStore((state) => state.fetchSalesByUser);
  const isLoadingSales = useSaleStore((state) => state.isLoading);

  // Determine which user's sales to show
  const targetUserId = params.userId || currentUser?.id;
  const targetUser = targetUserId ? getUserById(targetUserId) : null;
  const userName = params.userName || targetUser?.name || currentUser?.name || 'User';

  const sales = targetUserId ? getSalesByUser(targetUserId) : [];
  const sortedSales = [...sales].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalPrice, 0);
  const settings = useSettingsStore((state) => state.settings);
  const defaultCurrency = sales.length > 0 ? sales[0].currency : settings.defaultCurrency;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoadingSales && !refreshing) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}>
          <View className="px-5 pt-6">
            {/* Header Skeleton */}
            <View className="mb-6">
              <Skeleton width={150} height={24} style={{ marginBottom: 8 }} />
              <Skeleton width={200} height={14} />
            </View>

            {/* Summary Card Skeleton */}
            <View className="mb-6">
              <SkeletonStatCard />
            </View>

            {/* Sales List Skeleton */}
            <SkeletonList count={5} renderItem={() => <SkeletonSaleCard />} />
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
                if (targetUserId) {
                  await fetchSalesByUser(targetUserId);
                }
              } catch (error) {
                console.error('Error refreshing sales:', error);
              } finally {
                setRefreshing(false);
              }
            }}
            tintColor={colors.primary}
            progressBackgroundColor={colors.background}
            colors={[colors.primary]}
          />
        }>
        <View className="px-5 pt-6">
          {/* Header */}
          <View className="mb-6" style={{ paddingTop: 2 }}>
            <Text
              variant="heading"
              style={{
                fontWeight: '500',
                fontSize: 20,
                letterSpacing: -0.3,
                marginBottom: 4,
                includeFontPadding: false,
                textAlignVertical: 'top',
                lineHeight: 26
              }}>
              {userName}'s Sales
            </Text>
            <Text variant="footnote" color="tertiary" style={{ fontSize: 14 }}>
              View all sales by this user
            </Text>
          </View>

          {/* Summary Card */}
          <View
            className="mb-6 rounded-2xl px-5 py-5"
            style={{
              backgroundColor: colors.card,
            }}>
            <View className="flex-row items-start justify-between mb-3">
              <View className="flex-1">
                <Text variant="footnote" color="tertiary" style={{ fontSize: 13, fontWeight: '500', marginBottom: 4 }}>
                  Total Sales
                </Text>
                <Text
                  variant="subhead"
                  style={{ color: colors.primary, fontWeight: '500', fontSize: 20, letterSpacing: -0.3 }}>
                  {sales.length}
                </Text>
              </View>
              <View
                className="h-12 w-12 items-center justify-center rounded-xl"
                style={{ backgroundColor: colors.background }}>
                <Icon name="chart.bar.fill" size={24} color={colors.primary} />
              </View>
            </View>
            <Text variant="body" style={{ fontSize: 15, fontWeight: '500' }}>
              Revenue: {formatCurrency(totalRevenue, defaultCurrency)}
            </Text>
          </View>

          {/* Sales List */}
          {sortedSales.length === 0 ? (
            <View
              className="rounded-2xl px-5 py-12 items-center justify-center"
              style={{
                backgroundColor: colors.card,
              }}>
              <Icon name="doc" size={40} color={colors.primary} style={{ opacity: 0.3, marginBottom: 12 }} />
              <Text variant="subhead" color="tertiary" style={{ fontSize: 16, fontWeight: '500', marginBottom: 4 }}>
                No sales recorded
              </Text>
              <Text variant="footnote" color="tertiary" style={{ fontSize: 13 }}>
                This user hasn't made any sales yet
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {sortedSales.map((sale) => (
                <View
                  key={sale.id}
                  className="rounded-2xl px-5 py-4"
                  style={{
                    backgroundColor: colors.card,
                  }}>
                  <View className="flex-row items-start gap-4">
                    <View
                      className="h-12 w-12 items-center justify-center rounded-xl"
                      style={{ backgroundColor: colors.background }}>
                      <Icon name="doc.fill" size={24} color={colors.primary} />
                    </View>
                    <View className="flex-1 min-w-0">
                      <Text variant="heading" style={{ fontWeight: '500', fontSize: 14, marginBottom: 4 }}>
                        {sale.productName}
                      </Text>
                      {sale.gasSize !== 'none' && (
                        <Text variant="subhead" color="tertiary" style={{ fontSize: 13, marginBottom: 6 }}>
                          Size: {sale.gasSize}
                        </Text>
                      )}
                      <View className="gap-1.5">
                        <Text variant="body" style={{ fontSize: 14 }} numberOfLines={1} adjustsFontSizeToFit>
                          Quantity: {sale.quantity} × {formatCurrency(sale.unitPrice, sale.currency)}
                        </Text>
                        <Text variant="body" style={{ fontSize: 14 }}>
                          Branch: {sale.branch}
                        </Text>
                        <Text variant="footnote" color="tertiary" style={{ fontSize: 12, marginTop: 2 }}>
                          {formatDate(sale.createdAt)}
                        </Text>
                        <Text
                          variant="body"
                          style={{ fontWeight: '500', fontSize: 14, color: colors.primary, marginTop: 4 }}
                          numberOfLines={1}
                          adjustsFontSizeToFit>
                          Total: {formatCurrency(sale.totalPrice, sale.currency)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
