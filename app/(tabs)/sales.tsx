import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Alert, Dimensions, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { BottomSheet, BottomSheetOption } from '@/components/nativewindui/BottomSheet';
import { Button } from '@/components/nativewindui/Button';
import { FAB } from '@/components/nativewindui/FAB';
import { Icon } from '@/components/nativewindui/Icon';
import { Modal } from '@/components/nativewindui/Modal';
import { Skeleton, SkeletonList, SkeletonSaleCard, SkeletonStatCard } from '@/components/nativewindui/Skeleton';
import { Text } from '@/components/nativewindui/Text';
import { formatCurrency } from '@/lib/currency';
import { formatTime } from '@/lib/dateUtils';
import { useColorScheme } from '@/lib/useColorScheme';
import { useAuthStore } from '@/store/authStore';
import { useSaleStore } from '@/store/saleStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useUserStore } from '@/store/userStore';
import { withOpacity } from '@/theme/with-opacity';

const SALES_FILTERS_STORAGE_KEY = 'sales-filters';

export default function SalesScreen() {
  const { colors } = useColorScheme();
  const [refreshing, setRefreshing] = useState(false);
  const settings = useSettingsStore((state) => state.settings);
  const currentUser = useAuthStore((state) => state.currentUser);
  const normalizedRole = currentUser?.role?.toLowerCase();
  const isSuperAdmin = normalizedRole === 'super_admin' || normalizedRole === 'superadmin';
  const allSales = useSaleStore((state) => state.getAllSales);
  const fetchSales = useSaleStore((state) => state.fetchSales);
  const isLoadingSales = useSaleStore((state) => state.isLoading);
  const users = useUserStore((state) => state.users);

  const [filterUser, setFilterUser] = useState<string>('all');
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<string>('all');
  const [filterProductType, setFilterProductType] = useState<string>('all');
  const [filterSize, setFilterSize] = useState<string>('all');
  const [filterDateRange, setFilterDateRange] = useState<'all' | 'today' | 'week' | 'month'>('today');
  const [showFiltersSheet, setShowFiltersSheet] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState<'user' | 'branch' | 'payment' | 'productType' | 'size'>('user');
  const [showUserSheet, setShowUserSheet] = useState(false);
  const [showBranchSheet, setShowBranchSheet] = useState(false);
  const [showPaymentStatusSheet, setShowPaymentStatusSheet] = useState(false);
  const [showProductTypeSheet, setShowProductTypeSheet] = useState(false);
  const [showSizeSheet, setShowSizeSheet] = useState(false);

  let sales = allSales();

  // For non-admin users, only show their own sales
  if (!isSuperAdmin && currentUser) {
    sales = sales.filter((sale) => sale.sellerId === currentUser.id);
  }

  // Apply filters
  if (filterUser !== 'all') {
    sales = sales.filter((sale) => sale.sellerId === filterUser);
  }

  if (filterBranch !== 'all') {
    sales = sales.filter((sale) => sale.branch === filterBranch);
  }

  if (filterPaymentStatus !== 'all') {
    sales = sales.filter((sale) => (sale.paymentStatus || 'credit') === filterPaymentStatus);
  }

  if (filterProductType !== 'all') {
    sales = sales.filter((sale) => {
      // Check both productAttributes.type and legacy productType field
      const productType = sale.productAttributes?.type || (sale as any).productType;
      return productType === filterProductType;
    });
  }

  if (filterSize !== 'all') {
    sales = sales.filter((sale) => {
      // Check both productAttributes.gasSize and legacy gasSize field
      const size = sale.productAttributes?.gasSize || (sale as any).gasSize;
      return size === filterSize;
    });
  }

  // Apply date filter
  if (filterDateRange !== 'all') {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let startDate: Date;

    switch (filterDateRange) {
      case 'today':
        startDate = today;
        break;
      case 'week':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 1);
        break;
      default:
        startDate = new Date(0);
    }

    sales = sales.filter((sale) => {
      const saleDate = new Date(sale.createdAt);
      return saleDate >= startDate;
    });
  }

  // Sort by date (newest first)
  sales = [...sales].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalPrice, 0);
  const defaultCurrency = sales.length > 0 ? sales[0].currency : settings.defaultCurrency;
  const branches = Array.from(new Set(sales.map((s) => s.branch)));
  const regularUsers = users.filter((u) => u.role === 'user');
  const productTypes = settings.productTypes || [];
  const gasSizes = settings.gasSizes || [];

  // Get unique product types from all sales
  const allProductTypes = Array.from(
    new Set(
      allSales()
        .map((sale) => sale.productAttributes?.type || (sale as any).productType)
        .filter((type): type is string => !!type)
    )
  ).filter((type) => productTypes.includes(type));

  // Get unique sizes from all sales
  const allSizes = Array.from(
    new Set(
      allSales()
        .map((sale) => sale.productAttributes?.gasSize || (sale as any).gasSize)
        .filter((size): size is string => !!size && size !== 'none')
    )
  ).filter((size) => gasSizes.includes(size));

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

  const getSelectedSizeLabel = () => {
    if (filterSize === 'all') return 'All Sizes';
    return filterSize === 'none' ? 'N/A' : filterSize;
  };

  // Count active filters (exclude user filter for non-admin users)
  const activeFiltersCount = [
    isSuperAdmin && filterUser !== 'all',
    filterBranch !== 'all',
    filterPaymentStatus !== 'all',
    filterProductType !== 'all',
    filterSize !== 'all',
  ].filter(Boolean).length;


  const getSelectedUserLabel = () => {
    if (filterUser === 'all') return 'All Users';
    const user = regularUsers.find((u) => u.id === filterUser);
    return user?.name || 'All Users';
  };

  const getSelectedBranchLabel = () => {
    if (filterBranch === 'all') return 'All Branches';
    return filterBranch;
  };

  const getSelectedPaymentStatusLabel = () => {
    switch (filterPaymentStatus) {
      case 'credit':
        return 'Instant Payment';
      case 'promised':
        return 'Promised Payment';
      default:
        return 'All Payment Status';
    }
  };

  const getSelectedProductTypeLabel = () => {
    if (filterProductType === 'all') return 'All Product Types';
    return filterProductType;
  };

  const getSelectedDateLabel = () => {
    switch (filterDateRange) {
      case 'today':
        return 'Today';
      case 'week':
        return 'Last 7 Days';
      case 'month':
        return 'Last Month';
      default:
        return 'All Time';
    }
  };

  // Load filters from storage on mount
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const stored = await AsyncStorage.getItem(SALES_FILTERS_STORAGE_KEY);
        if (stored) {
          const filters = JSON.parse(stored);
          if (filters.filterDateRange) setFilterDateRange(filters.filterDateRange);
          if (filters.filterUser && isSuperAdmin) setFilterUser(filters.filterUser);
          if (filters.filterBranch) setFilterBranch(filters.filterBranch);
          if (filters.filterPaymentStatus) setFilterPaymentStatus(filters.filterPaymentStatus);
          if (filters.filterProductType) setFilterProductType(filters.filterProductType);
          if (filters.filterSize) setFilterSize(filters.filterSize);
        }
      } catch (error) {
        console.error('Error loading filters:', error);
      }
    };
    loadFilters();
  }, [isSuperAdmin]);

  // Reset active filter tab and user filter if user is not admin
  useEffect(() => {
    if (!isSuperAdmin) {
      if (activeFilterTab === 'user') {
        setActiveFilterTab('branch');
      }
      if (filterUser !== 'all') {
        setFilterUser('all');
      }
    }
  }, [isSuperAdmin]);

  // Save filters to storage whenever they change
  useEffect(() => {
    const saveFilters = async () => {
      try {
        const filters = {
          filterDateRange,
          filterUser,
          filterBranch,
          filterPaymentStatus,
          filterProductType,
          filterSize,
        };
        await AsyncStorage.setItem(SALES_FILTERS_STORAGE_KEY, JSON.stringify(filters));
      } catch (error) {
        console.error('Error saving filters:', error);
      }
    };
    saveFilters();
  }, [filterDateRange, filterUser, filterBranch, filterPaymentStatus, filterProductType, filterSize]);

  if (isLoadingSales && !refreshing) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24, paddingTop: 8 }}>
          <View className="px-5 pt-6">
            {/* Header Skeleton */}
            <View className="mb-6 flex-row items-start justify-between">
              <View className="flex-1">
                <Skeleton width={120} height={24} style={{ marginBottom: 8 }} />
                <Skeleton width={180} height={14} />
              </View>
              <Skeleton width={90} height={36} borderRadius={18} />
            </View>

            {/* Filters Skeleton */}
            <View className="mb-6 flex-row items-center gap-3">
              <View className="flex-row gap-2 flex-1">
                <Skeleton width={70} height={36} borderRadius={18} />
                <Skeleton width={60} height={36} borderRadius={18} />
                <Skeleton width={60} height={36} borderRadius={18} />
                <Skeleton width={70} height={36} borderRadius={18} />
              </View>
              <Skeleton width={40} height={40} borderRadius={20} />
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
    <>
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24, paddingTop: 8 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                try {
                  await fetchSales();
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
            <View className="mb-6 flex-row items-start justify-between" style={{ paddingTop: 2 }}>
              <View className="flex-1">
                <Text
                  variant="heading"
                  style={{
                    fontWeight: '500',
                    fontSize: 20,
                    letterSpacing: -0.3,
                    marginBottom: 4,
                  }}>
                  All Sales
                </Text>
                <Text variant="footnote" color="tertiary" style={{ fontSize: 13 }}>
                  View and filter all sales records
                </Text>
              </View>
              <Button
                variant="primary"
                size="md"
                onPress={() => router.push('/record-sale')}>
                <Text>Add Sale</Text>
              </Button>
            </View>

            {/* Filters */}
            <View className="mb-6 flex-row items-center gap-3">
              {/* Date Filters - Horizontally Scrollable */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ 
                  flex: 1, 
                  flexShrink: 1,
                  maxWidth: Dimensions.get('window').width - 92 // Screen width minus padding (40px) - button (40px) - gap (12px)
                }}
                contentContainerStyle={{ gap: 8, paddingRight: 4 }}>
                {(['all', 'today', 'week', 'month'] as const).map((range) => (
                  <Pressable
                    key={range}
                    onPress={() => setFilterDateRange(range)}
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.95 : 1,
                    })}>
                    <View
                      className="px-4 py-2.5 rounded-full"
                      style={{
                        backgroundColor: filterDateRange === range ? colors.primary : colors.card,
                        borderWidth: 0.5,
                        borderColor: withOpacity(colors.border, 0.2),
                      }}>
                      <Text
                        style={{
                          fontSize: 13,
                          color: filterDateRange === range ? colors.primaryForeground : colors.foreground,
                        }}>
                        {range === 'all' ? 'All Time' : range === 'today' ? 'Today' : range === 'week' ? 'Week' : 'Month'}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
              
              {/* Filter Button */}
              <Pressable
                onPress={() => setShowFiltersSheet(true)}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.7 : 1,
                })}>
                <View
                  className="h-10 w-10 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: colors.card,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}>
                  <View className="relative">
                    <Icon name="slider.horizontal.3" size={20} color={colors.primary} />
                    {activeFiltersCount > 0 && (
                      <View
                        className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full"
                        style={{ backgroundColor: colors.primary }}
                      />
                    )}
                  </View>
                </View>
              </Pressable>
            </View>

            {/* Summary Card */}
            <View
              className="mb-6 rounded-2xl px-5 py-5"
              style={{
                backgroundColor: colors.card,
              }}>
              <View className="flex-row items-start justify-between mb-3">
                <View className="flex-1">
                  <Text variant="footnote" color="tertiary" style={{ fontSize: 13, marginBottom: 4 }}>
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
              <Text variant="body" style={{ fontSize: 14, fontWeight: '500' }}>
                Revenue: {formatCurrency(totalRevenue, defaultCurrency)}
              </Text>
            </View>

            {/* Sales List */}
            {sales.length === 0 ? (
              <View
                className="rounded-2xl px-5 py-12 items-center justify-center"
                style={{
                  backgroundColor: colors.card,
                }}>
                <Icon name="doc" size={40} color={colors.primary} style={{ opacity: 0.3, marginBottom: 12 }} />
                <Text variant="subhead" color="tertiary" style={{ fontSize: 14, marginBottom: 4 }}>
                  No sales found
                </Text>
                <Text variant="footnote" color="tertiary" style={{ fontSize: 12 }}>
                  Try adjusting your filters
                </Text>
              </View>
            ) : (
              <View className="gap-3">
                {sales.map((sale) => {
                  const isUnpaid = (sale.paymentStatus || 'credit') === 'promised';
                  
                  return (
                    <Pressable
                      key={sale.id}
                      onPress={() => {
                        router.push(`/sale-details/${sale.id}`);
                      }}>
                      <View
                        className="flex-row items-center gap-4 rounded-2xl px-5 py-4"
                        style={{
                          backgroundColor: colors.card,
                          borderWidth: isUnpaid ? 0.5 : 0,
                          borderColor: isUnpaid ? '#FF9500' : 'transparent',
                        }}>
                        <View
                          className="h-14 w-14 items-center justify-center rounded-xl relative"
                          style={{ backgroundColor: colors.background }}>
                          <Icon name="doc.fill" size={13.5 * 1.9} color={colors.primary} />
                          {isUnpaid && (
                            <View
                              className="absolute -top-1 -right-1 h-4 w-4 rounded-full items-center justify-center"
                              style={{
                                backgroundColor: '#FF9500',
                                borderWidth: 2,
                                borderColor: colors.card,
                              }}>
                              <Icon name="exclamationmark" size={8} color="#FFFFFF" />
                            </View>
                          )}
                        </View>
                        <View className="flex-1 min-w-0">
                          <View className="flex-row items-center gap-2 mb-2">
                            <Text
                              variant="subhead"
                              style={{ fontSize: 14, fontWeight: '500' }}
                              numberOfLines={1}
                              className="flex-1">
                              {sale.productName} {sale.productAttributes?.gasSize && sale.productAttributes.gasSize !== 'none' && `(${sale.productAttributes.gasSize})`}
                            </Text>
                            {isUnpaid && (
                              <View
                                className="px-2.5 py-1 rounded-full flex-row items-center gap-1.5"
                                style={{
                                  backgroundColor: 'rgba(255, 149, 0, 0.2)',
                                  borderWidth: 1,
                                  borderColor: 'rgba(255, 149, 0, 0.4)',
                                }}>
                                <Icon
                                  name="clock.fill"
                                  size={12}
                                  color="#FF9500"
                                />
                                <Text
                                  style={{
                                    fontSize: 11,
                                    fontWeight: '500',
                                    color: '#FF9500',
                                  }}>
                                  Unpaid
                                </Text>
                              </View>
                            )}
                          </View>
                          <View className="flex-row items-center gap-2">
                            <View
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: colors.primary }}
                            />
                            <Pressable
                              onPress={(e) => {
                                e.stopPropagation();
                                const user = users.find((u) => u.id === sale.sellerId);
                                if (user) {
                                  router.push({
                                    pathname: '/(tabs)/user-sales',
                                    params: { userId: user.id, userName: user.name },
                                  });
                                }
                              }}>
                              <Text variant="footnote" color="tertiary" style={{ fontSize: 12, color: colors.primary }}>
                                {sale.seller?.name || 'Unknown'}
                              </Text>
                            </Pressable>
                            <Text variant="footnote" color="tertiary" style={{ fontSize: 12 }}>
                              • {formatTime(sale.createdAt)}
                            </Text>
                          </View>
                        </View>
                        <View className="items-end ml-2">
                          <Text
                            variant="footnote"
                            style={{ 
                              color: isUnpaid ? '#FF9500' : colors.primary, 
                              fontSize: 13, 
                              marginBottom: 2,
                              fontWeight: isUnpaid ? '600' : '500',
                            }}
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
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      </View>

      {/* Filters Bottom Sheet */}
      <Modal
        visible={showFiltersSheet}
        onClose={() => setShowFiltersSheet(false)}
        title="Filters"
        subtitle="Filter sales by different criteria"
        maxHeight={600}>
        <View className="flex-row" style={{ height: 450 }}>
          {/* Vertical Tabs */}
          <View
            style={{
              width: 120,
              borderRightWidth: 1,
              borderRightColor: colors.border,
              backgroundColor: colors.background,
            }}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}>
              {[
                ...(isSuperAdmin ? [{ key: 'user', label: 'User', icon: 'person.fill' }] : []),
                { key: 'branch', label: 'Branch', icon: 'building.2.fill' },
                { key: 'payment', label: 'Payment', icon: 'creditcard.fill' },
                { key: 'productType', label: 'Product', icon: 'shippingbox.fill' },
                { key: 'size', label: 'Size', icon: 'square.grid.2x2' },
              ].map((tab) => {
                const isActive = activeFilterTab === tab.key;
                const hasActiveFilter =
                  (tab.key === 'user' && filterUser !== 'all') ||
                  (tab.key === 'branch' && filterBranch !== 'all') ||
                  (tab.key === 'payment' && filterPaymentStatus !== 'all') ||
                  (tab.key === 'productType' && filterProductType !== 'all') ||
                  (tab.key === 'size' && filterSize !== 'all');

                return (
                  <Pressable
                    key={tab.key}
                    onPress={() => setActiveFilterTab(tab.key as any)}
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.7 : 1,
                    })}>
                    <View
                      style={{
                        paddingVertical: 16,
                        paddingHorizontal: 12,
                        borderLeftWidth: 3,
                        borderLeftColor: isActive ? colors.primary : 'transparent',
                        backgroundColor: isActive ? withOpacity(colors.primary, 0.1) : 'transparent',
                      }}>
                      <View className="items-center gap-2">
                        <View className="relative">
                          <Icon
                            name={tab.icon as any}
                            size={20}
                            color={isActive ? colors.primary : colors.mutedForeground}
                          />
                          {hasActiveFilter && !isActive && (
                            <View
                              className="absolute -right-1 -top-1 h-2 w-2 rounded-full"
                              style={{ backgroundColor: colors.primary }}
                            />
                          )}
                        </View>
                        <Text
                          style={{
                            fontSize: 11,
                            color: isActive ? colors.primary : colors.mutedForeground,
                            textAlign: 'center',
                          }}
                          numberOfLines={2}>
                          {tab.label}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Filter Content */}
          <View className="flex-1">
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ padding: 16 }}>
              {activeFilterTab === 'user' && isSuperAdmin && (
                <View className="gap-3">
                  <Text variant="subhead" style={{ marginBottom: 8 }}>
                    Filter by User
                  </Text>
                  {[
                    { label: 'All Users', value: 'all' },
                    ...regularUsers.map((u) => ({ label: u.name, value: u.id })),
                  ].map((option, index) => {
                    const isSelected = filterUser === option.value;
                    return (
                      <Pressable
                        key={`user-${option.value}-${index}`}
                        onPress={() => setFilterUser(option.value)}
                        style={({ pressed }) => ({
                          opacity: pressed ? 0.7 : 1,
                        })}>
                        <View
                          className="rounded-xl px-4 py-3 flex-row items-center justify-between"
                          style={{
                            backgroundColor: isSelected ? withOpacity(colors.primary, 0.1) : colors.card,
                            borderWidth: 1,
                            borderColor: isSelected ? colors.primary : colors.border,
                          }}>
                          <Text
                            variant="body"
                            style={{
                              fontSize: 14,
                              color: isSelected ? colors.primary : colors.foreground,
                            }}>
                            {option.label}
                          </Text>
                          {isSelected && (
                            <Icon name="checkmark.circle.fill" size={20} color={colors.primary} />
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {activeFilterTab === 'branch' && (
                <View className="gap-3">
                  <Text variant="subhead" style={{ marginBottom: 8 }}>
                    Filter by Branch
                  </Text>
                  {[
                    { label: 'All Branches', value: 'all' },
                    ...branches.map((b) => ({ label: b, value: b })),
                  ].map((option, index) => {
                    const isSelected = filterBranch === option.value;
                    return (
                      <Pressable
                        key={`branch-${option.value}-${index}`}
                        onPress={() => setFilterBranch(option.value)}
                        style={({ pressed }) => ({
                          opacity: pressed ? 0.7 : 1,
                        })}>
                        <View
                          className="rounded-xl px-4 py-3 flex-row items-center justify-between"
                          style={{
                            backgroundColor: isSelected ? withOpacity(colors.primary, 0.1) : colors.card,
                            borderWidth: 1,
                            borderColor: isSelected ? colors.primary : colors.border,
                          }}>
                          <Text
                            variant="body"
                            style={{
                              fontSize: 14,
                              color: isSelected ? colors.primary : colors.foreground,
                            }}>
                            {option.label}
                          </Text>
                          {isSelected && (
                            <Icon name="checkmark.circle.fill" size={20} color={colors.primary} />
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {activeFilterTab === 'payment' && (
                <View className="gap-3">
                  <Text variant="subhead" style={{ marginBottom: 8 }}>
                    Filter by Payment Status
                  </Text>
                  {[
                    { label: 'All Payment Status', value: 'all' },
                    { label: 'Instant Payment', value: 'credit' },
                    { label: 'Promised Payment', value: 'promised' },
                  ].map((option, index) => {
                    const isSelected = filterPaymentStatus === option.value;
                    return (
                      <Pressable
                        key={`payment-${option.value}-${index}`}
                        onPress={() => setFilterPaymentStatus(option.value)}
                        style={({ pressed }) => ({
                          opacity: pressed ? 0.7 : 1,
                        })}>
                        <View
                          className="rounded-xl px-4 py-3 flex-row items-center justify-between"
                          style={{
                            backgroundColor: isSelected ? withOpacity(colors.primary, 0.1) : colors.card,
                            borderWidth: 1,
                            borderColor: isSelected ? colors.primary : colors.border,
                          }}>
                          <Text
                            variant="body"
                            style={{
                              fontSize: 14,
                              color: isSelected ? colors.primary : colors.foreground,
                            }}>
                            {option.label}
                          </Text>
                          {isSelected && (
                            <Icon name="checkmark.circle.fill" size={20} color={colors.primary} />
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {activeFilterTab === 'productType' && (
                <View className="gap-3">
                  <Text variant="subhead" style={{ marginBottom: 8 }}>
                    Filter by Product Type
                  </Text>
                  {[
                    { label: 'All Product Types', value: 'all' },
                    ...allProductTypes.map((type) => ({ label: type, value: type })),
                  ].map((option, index) => {
                    const isSelected = filterProductType === option.value;
                    return (
                      <Pressable
                        key={`productType-${option.value}-${index}`}
                        onPress={() => setFilterProductType(option.value)}
                        style={({ pressed }) => ({
                          opacity: pressed ? 0.7 : 1,
                        })}>
                        <View
                          className="rounded-xl px-4 py-3 flex-row items-center justify-between"
                          style={{
                            backgroundColor: isSelected ? withOpacity(colors.primary, 0.1) : colors.card,
                            borderWidth: 1,
                            borderColor: isSelected ? colors.primary : colors.border,
                          }}>
                          <Text
                            variant="body"
                            style={{
                              fontSize: 14,
                              color: isSelected ? colors.primary : colors.foreground,
                            }}>
                            {option.label}
                          </Text>
                          {isSelected && (
                            <Icon name="checkmark.circle.fill" size={20} color={colors.primary} />
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {activeFilterTab === 'size' && (
                <View className="gap-3">
                  <Text variant="subhead" style={{ marginBottom: 8 }}>
                    Filter by Size
                  </Text>
                  {[
                    { label: 'All Sizes', value: 'all' },
                    ...allSizes.map((size) => ({ label: size, value: size })),
                  ].map((option, index) => {
                    const isSelected = filterSize === option.value;
                    return (
                      <Pressable
                        key={`size-${option.value}-${index}`}
                        onPress={() => setFilterSize(option.value)}
                        style={({ pressed }) => ({
                          opacity: pressed ? 0.7 : 1,
                        })}>
                        <View
                          className="rounded-xl px-4 py-3 flex-row items-center justify-between"
                          style={{
                            backgroundColor: isSelected ? withOpacity(colors.primary, 0.1) : colors.card,
                            borderWidth: 1,
                            borderColor: isSelected ? colors.primary : colors.border,
                          }}>
                          <Text
                            variant="body"
                            style={{
                              fontSize: 14,
                              color: isSelected ? colors.primary : colors.foreground,
                            }}>
                            {option.label}
                          </Text>
                          {isSelected && (
                            <Icon name="checkmark.circle.fill" size={20} color={colors.primary} />
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {/* Clear Filters Button */}
              {activeFiltersCount > 0 && (
                <Button
                  onPress={() => {
                    setFilterUser('all');
                    setFilterBranch('all');
                    setFilterPaymentStatus('all');
                    setFilterProductType('all');
                    setFilterSize('all');
                  }}
                  variant="secondary"
                  className="mt-4">
                  <Text style={{ color: colors.primary }}>Clear All Filters</Text>
                </Button>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Individual Filter Bottom Sheets */}
      {isSuperAdmin && (
        <BottomSheet
          visible={showUserSheet}
          onClose={() => setShowUserSheet(false)}
          title="Filter by User"
          options={[
            { label: 'All Users', value: 'all' },
            ...regularUsers.map((u) => ({ label: u.name, value: u.id })),
          ]}
          selectedValue={filterUser}
          onSelect={(value) => {
            setFilterUser(value);
            setShowUserSheet(false);
          }}
        />
      )}

      <BottomSheet
        visible={showBranchSheet}
        onClose={() => setShowBranchSheet(false)}
        title="Filter by Branch"
        options={[
          { label: 'All Branches', value: 'all' },
          ...branches.map((b) => ({ label: b, value: b })),
        ]}
        selectedValue={filterBranch}
        onSelect={(value) => {
          setFilterBranch(value);
          setShowBranchSheet(false);
        }}
      />

      <BottomSheet
        visible={showPaymentStatusSheet}
        onClose={() => setShowPaymentStatusSheet(false)}
        title="Filter by Payment Status"
        options={[
          { label: 'All Payment Status', value: 'all' },
          { label: 'Instant Payment', value: 'credit' },
          { label: 'Promised Payment', value: 'promised' },
        ]}
        selectedValue={filterPaymentStatus}
        onSelect={(value) => {
          setFilterPaymentStatus(value);
          setShowPaymentStatusSheet(false);
        }}
      />

      <BottomSheet
        visible={showProductTypeSheet}
        onClose={() => setShowProductTypeSheet(false)}
        title="Filter by Product Type"
        options={[
          { label: 'All Product Types', value: 'all' },
          ...allProductTypes.map((type) => ({ label: type, value: type })),
        ]}
        selectedValue={filterProductType}
        onSelect={(value) => {
          setFilterProductType(value);
          setShowProductTypeSheet(false);
        }}
      />

      <BottomSheet
        visible={showSizeSheet}
        onClose={() => setShowSizeSheet(false)}
        title="Filter by Size"
        options={[
          { label: 'All Sizes', value: 'all' },
          ...allSizes.map((size) => ({ label: size, value: size })),
        ]}
        selectedValue={filterSize}
        onSelect={(value) => {
          setFilterSize(value);
          setShowSizeSheet(false);
        }}
      />

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
    </>
  );
}
