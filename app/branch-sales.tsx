import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { Icon } from '@/components/nativewindui/Icon';
import { Input } from '@/components/nativewindui/Input';
import { Text } from '@/components/nativewindui/Text';
import { formatCurrency } from '@/lib/currency';
import { useColorScheme } from '@/lib/useColorScheme';
import { useAuthStore } from '@/store/authStore';
import { useSaleStore } from '@/store/saleStore';
import { withOpacity } from '@/theme/with-opacity';

export default function BranchSalesScreen() {
  const { colors, colorScheme } = useColorScheme();
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const params = useLocalSearchParams<{ branchName?: string }>();
  const currentUser = useAuthStore((state) => state.currentUser);
  const getSalesByBranch = useSaleStore((state) => state.getSalesByBranch);
  const fetchSalesByBranch = useSaleStore((state) => state.fetchSalesByBranch);

  const branchName = params.branchName || currentUser?.branch || 'Branch';
  const sales = getSalesByBranch(branchName);
  const sortedSales = [...sales].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalPrice, 0);
  const defaultCurrency = sales.length > 0 ? sales[0].currency : 'UGX';
  const [searchQuery, setSearchQuery] = useState('');

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
              <View className="flex-1 relative">
                <Input
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search sales, products..."
                  placeholderTextColor={colors.mutedForeground}
                  className="flex-1 pl-11 pr-4 h-11"
                  style={{
                    backgroundColor: colors.input || colors.background,
                    color: colors.foreground,
                    borderRadius: 12,
                  }}
                />
                <View className="absolute left-3.5 top-0 bottom-0 justify-center">
                  <Icon name="magnifyingglass" size={18} color={colors.mutedForeground} />
                </View>
              </View>
              <View className="flex-row items-center gap-2.5">
                <Pressable
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  className="p-1.5">
                  <View className="relative">
                    <Icon name="bell" size={22} color={colors.foreground} />
                    <View
                      className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border border-white"
                      style={{ backgroundColor: '#FF3B30' }}
                    />
                  </View>
                </Pressable>
                <Pressable
                  onPress={() => router.push('/record-sale')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  className="p-1.5">
                  <View
                    className="h-10 w-10 items-center justify-center rounded-full"
                    style={{ backgroundColor: colors.input || colors.background }}>
                    <Icon name="plus" size={20} color={colors.foreground} />
                  </View>
                </Pressable>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </View>

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
                await fetchSalesByBranch(branchName);
              } catch (error) {
                console.error('Error refreshing sales:', error);
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
              {branchName} Sales
            </Text>
            <Text variant="footnote" color="tertiary" style={{ fontSize: 14 }}>
              View all sales from this branch
            </Text>
          </View>

          {/* Summary Card */}
          <View
            className="mb-6 rounded-2xl px-5 py-5"
            style={{
              backgroundColor: colors.card,
              borderWidth: 0.5,
              borderColor: withOpacity(colors.border, 0.2),
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
                <Icon name="chart.bar.fill" size={13.5 * 1.8} color={colors.primary} />
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
                This branch hasn't made any sales yet
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {sortedSales.map((sale) => (
                <Pressable
                  key={sale.id}
                  onPress={() => router.push(`/sale-details/${sale.id}`)}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                  })}>
                  <View
                    className="rounded-2xl px-5 py-4"
                    style={{
                      backgroundColor: colors.card,
                      borderWidth: 0.5,
                      borderColor: withOpacity(colors.border, 0.2),
                    }}>
                    <View className="flex-row items-start gap-4">
                      <View
                        className="h-12 w-12 items-center justify-center rounded-xl"
                        style={{ backgroundColor: colors.background }}>
                        <Icon name="doc.fill" size={13.5 * 1.8} color={colors.primary} />
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
                            Seller: {sale.seller?.name || 'Unknown'}
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
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
