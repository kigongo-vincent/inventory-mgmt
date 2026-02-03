import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Alert, Image, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { ActivityIndicator } from '@/components/nativewindui/ActivityIndicator';
import { BottomSheet, BottomSheetOption } from '@/components/nativewindui/BottomSheet';
import { Button } from '@/components/nativewindui/Button';
import { Icon } from '@/components/nativewindui/Icon';
import { Input } from '@/components/nativewindui/Input';
import { Skeleton, SkeletonDetailHeader, SkeletonDetailSection } from '@/components/nativewindui/Skeleton';
import { Text } from '@/components/nativewindui/Text';
import { saleApi } from '@/lib/api/saleApi';
import { formatCurrency } from '@/lib/currency';
import { formatDate as formatDateUtil } from '@/lib/dateUtils';
import { useColorScheme } from '@/lib/useColorScheme';
import { useAuthStore } from '@/store/authStore';
import { useSaleStore } from '@/store/saleStore';
import { useUserStore } from '@/store/userStore';
import { withOpacity } from '@/theme/with-opacity';
import { PaymentStatus, Sale } from '@/types';

export default function SaleDetailsScreen() {
  const { colors, colorScheme } = useColorScheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ saleId?: string }>();
  const currentUser = useAuthStore((state) => state.currentUser);
  const getSaleById = useSaleStore((state) => state.getSaleById);
  const updateSale = useSaleStore((state) => state.updateSale);
  const fetchSales = useSaleStore((state) => state.fetchSales);
  const getUserById = useUserStore((state) => state.getUserById);
  const [showPaymentStatusSheet, setShowPaymentStatusSheet] = useState(false);
  const [sale, setSale] = useState<Sale | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMarkingAsPaid, setIsMarkingAsPaid] = useState(false);

  // Try to get sale from local store first, then fetch from API if not found
  useEffect(() => {
    const loadSale = async () => {
      if (!params.saleId) return;

      // First try local store
      const localSale = getSaleById(params.saleId);
      if (localSale) {
        setSale(localSale);
        return;
      }

      // If not found locally, fetch from API
      setIsLoading(true);
      try {
        const fetchedSale = await saleApi.getSaleById(params.saleId);
        setSale(fetchedSale);
        // Also update the store for future use
        const currentSales = useSaleStore.getState().sales;
        if (!currentSales.find((s) => s.id === fetchedSale.id)) {
          useSaleStore.setState({
            sales: [{ ...fetchedSale, syncStatus: 'synced' as const }, ...currentSales],
          });
        }
      } catch (error: any) {
        console.error('Error fetching sale:', error);
        // Keep sale as null to show "not found" message
      } finally {
        setIsLoading(false);
      }
    };

    loadSale();
  }, [params.saleId, getSaleById]);

  const seller = sale ? getUserById(sale.sellerId) : null;

  const paymentStatusOptions: BottomSheetOption[] = [
    { label: 'Instant Payment', value: 'credit' },
    { label: 'Promised Payment', value: 'promised' },
  ];

  const handlePaymentStatusChange = async (value: string) => {
    if (sale) {
      try {
        await updateSale(sale.id, { paymentStatus: value as PaymentStatus });
        // Refresh sales to get updated data
        await fetchSales();
        // Also refresh the current sale
        const updatedSale = useSaleStore.getState().getSaleById(sale.id);
        if (updatedSale) {
          setSale(updatedSale);
        } else {
          // If not in store, fetch from API
          const fetchedSale = await saleApi.getSaleById(sale.id);
          setSale(fetchedSale);
        }
        setShowPaymentStatusSheet(false);
        Alert.alert('Success', 'Payment status updated successfully');
      } catch (error) {
        console.error('Error updating payment status:', error);
        Alert.alert('Error', 'Failed to update payment status. Please try again.');
      }
    }
  };

  const handleMarkAsPaid = async () => {
    if (!sale) return;

    Alert.alert(
      'Mark as Paid',
      `Are you sure you want to mark this sale as paid? This will update the payment status to "Instant Payment" and sync to the database.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Mark as Paid',
          style: 'default',
          onPress: async () => {
            setIsMarkingAsPaid(true);
            try {
              await updateSale(sale.id, { paymentStatus: 'credit' as PaymentStatus });
              // Refresh sales to get updated data
              await fetchSales();
              // Also refresh the current sale
              const updatedSale = useSaleStore.getState().getSaleById(sale.id);
              if (updatedSale) {
                setSale(updatedSale);
              } else {
                // If not in store, fetch from API
                const fetchedSale = await saleApi.getSaleById(sale.id);
                setSale(fetchedSale);
              }
              Alert.alert('Success', 'Sale marked as paid and synced to database');
            } catch (error: any) {
              console.error('Error marking sale as paid:', error);
              Alert.alert('Error', error?.message || 'Failed to mark sale as paid. Please try again.');
            } finally {
              setIsMarkingAsPaid(false);
            }
          },
        },
      ]
    );
  };

  const getPaymentStatusLabel = (status: PaymentStatus) => {
    return status === 'credit' ? 'Instant Payment' : 'Promised Payment';
  };

  const getPaymentStatusIcon = (status: PaymentStatus) => {
    return status === 'credit' ? 'creditcard.fill' : 'clock.fill';
  };

  if (isLoading) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <View style={{ backgroundColor: colors.card }}>
          <SafeAreaView edges={['top']}>
            <View className="px-5 pt-5 pb-6">
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
            </View>
          </SafeAreaView>
        </View>
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}>
          <View className="px-5 pt-6">
            <SkeletonDetailHeader />
            <View className="mt-6 gap-6">
              <SkeletonDetailSection />
              <SkeletonDetailSection />
              <SkeletonDetailSection />
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (!sale) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <View style={{ backgroundColor: colors.card }}>
          <SafeAreaView edges={['top']}>
            <View className="px-5 pt-5 pb-6">
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
            </View>
          </SafeAreaView>
        </View>
        <View className="flex-1 items-center justify-center px-5">
          <Text variant="heading" style={{ fontWeight: '500', marginBottom: 8 }}>
            Sale not found
          </Text>
          <Text variant="body" color="tertiary">
            The sale you're looking for doesn't exist
          </Text>
        </View>
      </View>
    );
  }

  const formatDate = formatDateUtil;

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      {/* Header Section with Back Button */}
      <View style={{ backgroundColor: colors.card }}>
        <SafeAreaView edges={['top']}>
          <View className="px-5 pt-5 pb-2">
            <View className="flex-row items-center gap-3 mb-4">
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
              <View className="flex-1">
                <Text
                  variant="heading"
                  style={{
                    fontWeight: '500',
                    fontSize: 20,
                    letterSpacing: -0.3,
                  }}>
                  Sale Details
                </Text>
              </View>
            </View>
            {/* TabHeader content without StatusBar and SafeAreaView */}
            {/* <View className="flex-row items-center gap-3">
              <View className="flex-1 relative mr-2.5">
                <View
                  className="flex-1 pr-4 justify-center rounded-xl"
                  style={{
                    backgroundColor: colors.input || colors.background,
                    height: 40,
                  }}>
                  <Input
                    placeholder="Search sales, products..."
                    placeholderTextColor={colors.mutedForeground}
                    className="flex-1 text-base pl-10"
                    style={{
                      backgroundColor: 'transparent',
                      color: colors.foreground,
                      paddingVertical: 0,
                      height: '100%',
                    }}
                    onSubmitEditing={(e) => {
                      if (e.nativeEvent.text.trim()) {
                        router.push({ pathname: '/search-results', params: { query: e.nativeEvent.text } });
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
                        source={{ uri: currentUser.profilePictureUri }}
                        style={{ width: 40, height: 40 }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={{ width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ color: colors.foreground, fontSize: 18, fontFamily: 'Poppins-SemiBold' }}>
                          {currentUser?.name?.charAt(0).toUpperCase() || 'U'}
                        </Text>
                      </View>
                    )}
                  </View>
                </Pressable>
              </View>
            </View> */}
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="px-5 pt-8">
          {/* Header */}
          <View className="mb-6">
            <Text
              variant="heading"
              style={{
                fontWeight: '500',
                fontSize: 20,
                letterSpacing: -0.3,
                marginBottom: 4,
              }}>
              Sale Details
            </Text>
            <Text variant="footnote" color="tertiary" style={{ fontSize: 13 }}>
              Complete information about this sale
            </Text>
          </View>

          {/* Main Sale Card */}
          <View
            className="mb-6 rounded-2xl px-5 py-5"
            style={{
              backgroundColor: colors.card,
              borderWidth: 0.5,
              borderColor: withOpacity(colors.border, 0.2),
            }}>
            <View className="flex-row items-start gap-4 mb-5">
              <View
                className="h-16 w-16 items-center justify-center rounded-xl"
                style={{
                  backgroundColor: colors.background,
                }}>
                <Icon name="doc.fill" size={13.5 * 2.4} color={colors.primary} />
              </View>
              <View className="flex-1">
                <Text
                  variant="subhead"
                  style={{
                    fontWeight: '500',
                    fontSize: 18,
                    marginBottom: 6,
                    letterSpacing: -0.2,
                  }}>
                  {sale.productName}
                </Text>
                {sale.productAttributes?.gasSize && sale.productAttributes.gasSize !== 'none' && (
                  <View className="flex-row items-center gap-1.5 mb-4">
                    <View
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: colors.primary }}
                    />
                    <Text
                      variant="subhead"
                      color="tertiary"
                      style={{ fontSize: 13, fontWeight: '400' }}>
                      {sale.productAttributes.gasSize}
                    </Text>
                  </View>
                )}
                <Text
                  variant="subhead"
                  style={{
                    color: colors.primary,
                    fontWeight: '500',
                    fontSize: 20,
                    letterSpacing: -0.3,
                  }}>
                  {formatCurrency(sale.totalPrice, sale.currency)}
                </Text>
              </View>
            </View>

            <View
              className="border-t pt-5"
              style={{
                borderColor: withOpacity(colors.border, 0.2),
              }}>
              <View className="gap-4">
                <View className="flex-row items-center justify-between py-1">
                  <Text
                    variant="footnote"
                    color="tertiary"
                    style={{ fontSize: 13, fontWeight: '400', letterSpacing: 0.1 }}>
                    Quantity
                  </Text>
                  <Text
                    variant="body"
                    style={{
                      fontSize: 14,
                      fontWeight: '400',
                      color: colors.foreground,
                    }}>
                    {sale.quantity}
                  </Text>
                </View>
                <View className="flex-row items-center justify-between py-1">
                  <Text
                    variant="footnote"
                    color="tertiary"
                    style={{ fontSize: 13, fontWeight: '400', letterSpacing: 0.1 }}>
                    Unit Price
                  </Text>
                  <Text
                    variant="body"
                    style={{
                      fontSize: 14,
                      fontWeight: '400',
                      color: colors.foreground,
                    }}>
                    {formatCurrency(sale.unitPrice, sale.currency)}
                  </Text>
                </View>
                {sale.extraCosts && sale.extraCosts > 0 && (
                  <View className="flex-row items-center justify-between py-1">
                    <Text
                      variant="footnote"
                      color="tertiary"
                      style={{ fontSize: 13, fontWeight: '400', letterSpacing: 0.1 }}>
                      Extra Costs
                    </Text>
                    <Text
                      variant="body"
                      style={{
                        fontSize: 14,
                        fontWeight: '400',
                        color: colors.foreground,
                      }}>
                      {formatCurrency(sale.extraCosts, sale.currency)}
                    </Text>
                  </View>
                )}
                <View className="flex-row items-center justify-between py-1.5">
                  <Text
                    variant="footnote"
                    color="tertiary"
                    style={{ fontSize: 13, fontWeight: '400', letterSpacing: 0.1 }}>
                    Total Price
                  </Text>
                  <Text
                    variant="body"
                    style={{
                      fontSize: 16,
                      fontWeight: '500',
                      color: colors.primary,
                      letterSpacing: -0.2,
                    }}>
                    {formatCurrency(sale.totalPrice, sale.currency)}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setShowPaymentStatusSheet(true)}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                  })}>
                  <View className="flex-row items-center justify-between">
                    <Text
                      variant="footnote"
                      color="tertiary"
                      style={{ fontSize: 13 }}>
                      Payment Status
                    </Text>
                    <View className="flex-row items-center gap-2">
                      <Icon
                        name={getPaymentStatusIcon(sale.paymentStatus || 'credit')}
                        size={16}
                        color={(sale.paymentStatus || 'credit') === 'credit' ? '#34C759' : '#FF9500'}
                      />
                      <Text
                        variant="body"
                        style={{
                          fontSize: 14,
                          fontWeight: '500',
                          color: (sale.paymentStatus || 'credit') === 'credit' ? '#34C759' : '#FF9500',
                        }}>
                        {getPaymentStatusLabel(sale.paymentStatus || 'credit')}
                      </Text>
                      <Icon
                        name="chevron.right"
                        size={14}
                        color={colors.mutedForeground}
                        style={{ opacity: 0.5 }}
                      />
                    </View>
                  </View>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Seller Information */}
          <View
            className="mb-6 rounded-2xl px-5 py-5"
            style={{
              backgroundColor: colors.card,
              borderWidth: 0.5,
              borderColor: withOpacity(colors.border, 0.2),
            }}>
            <View className="flex-row items-center gap-3 mb-4">
              <View
                className="h-12 w-12 items-center justify-center rounded-xl"
                style={{
                  backgroundColor: colors.background,
                }}>
                <Icon name="person.fill" size={13.5 * 1.8} color={colors.primary} />
              </View>
              <Text
                variant="heading"
                style={{
                  fontWeight: '500',
                  fontSize: 16,
                  letterSpacing: -0.2,
                }}>
                Seller Information
              </Text>
            </View>
            <View className="gap-3">
              <Pressable
                onPress={() => {
                  if (seller) {
                    router.push({
                      pathname: '/(tabs)/user-sales',
                      params: { userId: seller.id, userName: seller.name },
                    });
                  }
                }}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.7 : 1,
                })}>
                <View className="flex-row items-center justify-between py-1">
                  <Text
                    variant="footnote"
                    color="tertiary"
                    style={{ fontSize: 13, fontWeight: '400', letterSpacing: 0.1 }}>
                    Seller Name
                  </Text>
                  <View className="flex-row items-center gap-2">
                    <Text
                      variant="body"
                      style={{
                        fontSize: 14,
                        fontWeight: '500',
                        color: colors.primary
                      }}>
                      {sale.seller?.name || 'Unknown'}
                    </Text>
                    <Icon
                      name="chevron.right"
                      size={16}
                      color={colors.primary}
                      style={{ opacity: 0.4 }}
                    />
                  </View>
                </View>
              </Pressable>
              <View className="flex-row items-center justify-between py-1">
                <Text
                  variant="footnote"
                  color="tertiary"
                  style={{ fontSize: 13, fontWeight: '400', letterSpacing: 0.1 }}>
                  Branch
                </Text>
                <Text
                  variant="body"
                  style={{
                    fontSize: 14,
                    fontWeight: '400'
                  }}>
                  {(() => {
                    // Handle branch as string or object
                    const branch = sale.branch as any;
                    if (typeof branch === 'string') {
                      return branch;
                    }
                    if (branch && typeof branch === 'object') {
                      return branch.name || branch.Name || seller?.branch || 'Unknown';
                    }
                    return seller?.branch || 'Unknown';
                  })()}
                </Text>
              </View>
            </View>
          </View>

          {/* Sale Information */}
          <View
            className="mb-6 rounded-2xl px-5 py-5"
            style={{
              backgroundColor: colors.card,
              borderWidth: 0.5,
              borderColor: withOpacity(colors.border, 0.2),
            }}>
            <View className="flex-row items-center gap-3 mb-4">
              <View
                className="h-12 w-12 items-center justify-center rounded-xl"
                style={{
                  backgroundColor: colors.background,
                }}>
                <Icon name="clock.fill" size={13.5 * 1.8} color={colors.primary} />
              </View>
              <Text
                variant="heading"
                style={{
                  fontWeight: '500',
                  fontSize: 16,
                  letterSpacing: -0.2,
                }}>
                Sale Information
              </Text>
            </View>
            <View className="gap-3">
              <View className="flex-row items-center justify-between py-1">
                <Text
                  variant="footnote"
                  color="tertiary"
                  style={{ fontSize: 13, fontWeight: '400', letterSpacing: 0.1 }}>
                  Sale ID
                </Text>
                <Text
                  variant="body"
                  style={{
                    fontSize: 13,
                    fontWeight: '400',
                    fontFamily: 'monospace',
                    color: colors.mutedForeground,
                  }}>
                  {sale.id}
                </Text>
              </View>
              <View className="flex-row items-center justify-between py-1">
                <Text
                  variant="footnote"
                  color="tertiary"
                  style={{ fontSize: 13, fontWeight: '400', letterSpacing: 0.1 }}>
                  Date & Time
                </Text>
                <Text
                  variant="body"
                  style={{
                    fontSize: 14,
                    fontWeight: '400'
                  }}>
                  {formatDate(sale.createdAt)}
                </Text>
              </View>
              <View className="flex-row items-center justify-between py-1">
                <Text
                  variant="footnote"
                  color="tertiary"
                  style={{ fontSize: 13, fontWeight: '400', letterSpacing: 0.1 }}>
                  Product Type
                </Text>
                <Text
                  variant="body"
                  style={{
                    fontSize: 14,
                    fontWeight: '400'
                  }}>
                  {sale.productAttributes?.type
                    ? sale.productAttributes.type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
                    : 'Product'}
                </Text>
              </View>
            </View>
          </View>

          {/* Buyer Information */}
          {(sale.buyerName || sale.buyerContact || sale.buyerLocation) && (
            <View
              className="mb-6 rounded-2xl px-5 py-5"
              style={{
                backgroundColor: colors.card,
                borderWidth: 0.5,
                borderColor: withOpacity(colors.border, 0.2),
              }}>
              <View className="flex-row items-center gap-3 mb-4">
                <View
                  className="h-12 w-12 items-center justify-center rounded-xl"
                  style={{
                    backgroundColor: colors.background,
                  }}>
                  <Icon name="person.circle.fill" size={13.5 * 1.8} color={colors.primary} />
                </View>
                <Text
                  variant="heading"
                  style={{
                    fontWeight: '500',
                    fontSize: 16,
                    letterSpacing: -0.2,
                  }}>
                  Buyer Information
                </Text>
              </View>
              <View className="gap-3">
                {sale.buyerName && (
                  <View className="flex-row items-center justify-between py-1">
                    <Text
                      variant="footnote"
                      color="tertiary"
                      style={{ fontSize: 13, fontWeight: '400', letterSpacing: 0.1 }}>
                      Buyer Name
                    </Text>
                    <Text
                      variant="body"
                      style={{
                        fontSize: 14,
                        fontWeight: '400'
                      }}>
                      {sale.buyerName}
                    </Text>
                  </View>
                )}
                {sale.buyerContact && (
                  <View className="flex-row items-center justify-between py-1">
                    <Text
                      variant="footnote"
                      color="tertiary"
                      style={{ fontSize: 13, fontWeight: '400', letterSpacing: 0.1 }}>
                      Buyer Contact
                    </Text>
                    <Text
                      variant="body"
                      style={{
                        fontSize: 14,
                        fontWeight: '400'
                      }}>
                      {sale.buyerContact}
                    </Text>
                  </View>
                )}
                {sale.buyerLocation && (
                  <View className="flex-row items-center justify-between py-1">
                    <Text
                      variant="footnote"
                      color="tertiary"
                      style={{ fontSize: 13, fontWeight: '400', letterSpacing: 0.1 }}>
                      Buyer Location
                    </Text>
                    <Text
                      variant="body"
                      style={{
                        fontSize: 14,
                        fontWeight: '400'
                      }}>
                      {sale.buyerLocation}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Mark as Paid Action Button - Only show for unpaid sales */}
          {(sale.paymentStatus || 'credit') === 'promised' && (
            <View
              className="mb-6 rounded-2xl px-5 py-5"
              style={{
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: 'rgba(255, 149, 0, 0.3)',
                borderStyle: 'solid',
              }}>
              <View className="flex-row items-start gap-4 mb-5">
                <View
                  className="h-14 w-14 items-center justify-center rounded-xl"
                  style={{
                    backgroundColor: 'rgba(255, 149, 0, 0.15)',
                  }}>
                  <Icon name="clock.fill" size={13.5 * 2} color="#FF9500" />
                </View>
                <View className="flex-1">
                  <Text
                    variant="heading"
                    style={{
                      fontWeight: '500',
                      fontSize: 16,
                      letterSpacing: -0.2,
                      marginBottom: 4,
                    }}>
                    Payment Pending
                  </Text>
                  <Text variant="footnote" color="tertiary" style={{ fontSize: 12, lineHeight: 18 }}>
                    This sale is marked as "Promised Payment". Mark it as paid once payment is received.
                  </Text>
                </View>
              </View>
              <View
                className="border-t pt-4"
                style={{
                  borderColor: withOpacity(colors.border, 0.2),
                }}>
                <Pressable
                  onPress={handleMarkAsPaid}
                  disabled={isMarkingAsPaid}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.8 : 1,
                  })}>
                  <View
                    className="flex-row items-center justify-center gap-2.5 rounded-xl px-5 py-4"
                    style={{
                      backgroundColor: '#34C759',
                      shadowColor: '#34C759',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.2,
                      shadowRadius: 4,
                      elevation: 3,
                    }}>
                    {isMarkingAsPaid ? (
                      <>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                        <Text style={{ color: '#FFFFFF', fontWeight: '500', fontSize: 16 }}>
                          Processing...
                        </Text>
                      </>
                    ) : (
                      <>
                        <Icon name="checkmark.circle.fill" size={20} color="#FFFFFF" />
                        <Text style={{ color: '#FFFFFF', fontWeight: '500', fontSize: 16 }}>
                          Mark as Paid
                        </Text>
                      </>
                    )}
                  </View>
                </Pressable>
                <Text
                  variant="footnote"
                  color="tertiary"
                  style={{
                    fontSize: 11,
                    textAlign: 'center',
                    marginTop: 8,
                    opacity: 0.7,
                  }}>
                  This will update the payment status and sync to the database
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Payment Status Bottom Sheet */}
      <BottomSheet
        visible={showPaymentStatusSheet}
        onClose={() => setShowPaymentStatusSheet(false)}
        title="Payment Status"
        options={paymentStatusOptions}
        selectedValue={(sale?.paymentStatus || 'credit') as string}
        onSelect={handlePaymentStatusChange}
      />
    </View>
  );
}

