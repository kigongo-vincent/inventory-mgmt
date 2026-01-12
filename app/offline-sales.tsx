import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { BottomSheet } from '@/components/nativewindui/BottomSheet';
import { Icon } from '@/components/nativewindui/Icon';
import { Text } from '@/components/nativewindui/Text';
import { formatCurrency } from '@/lib/currency';
import { useColorScheme } from '@/lib/useColorScheme';
import { useSaleStore } from '@/store/saleStore';
import { Sale } from '@/types';

export default function OfflineSalesScreen() {
  const { colors, colorScheme } = useColorScheme();
  const [refreshing, setRefreshing] = useState(false);
  const allSales = useSaleStore((state) => state.getAllSales);
  const fetchSales = useSaleStore((state) => state.fetchSales);
  const deleteSale = useSaleStore((state) => state.deleteSale);
  
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  // Get all sales, filter only offline sales, and sort by date (newest first)
  const sales = [...allSales()]
    .filter((sale) => sale.syncStatus === 'offline')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalPrice, 0);
  const defaultCurrency = sales.length > 0 ? sales[0].currency : 'UGX';

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

  const handleSalePress = (sale: Sale) => {
    setSelectedSale(sale);
    setShowActionSheet(true);
  };

  const handleEdit = () => {
    if (selectedSale) {
      router.push(`/edit-sale/${selectedSale.id}`);
      setShowActionSheet(false);
      setSelectedSale(null);
    }
  };

  const handleDelete = () => {
    if (selectedSale) {
      Alert.alert(
        'Delete Sale',
        `Are you sure you want to delete this sale for ${selectedSale.productName}?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteSale(selectedSale.id);
                setShowActionSheet(false);
                setSelectedSale(null);
              } catch (error: any) {
                Alert.alert('Error', error.message || 'Failed to delete sale');
              }
            },
          },
        ]
      );
    }
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
              <View className="flex-1">
                <Text
                  variant="heading"
                  style={{
                    color: colors.foreground,
                    fontWeight: '500',
                    fontSize: 20,
                    letterSpacing: -0.3,
                  }}>
                  Stored Sales
                </Text>
                <Text variant="footnote" style={{ color: colors.mutedForeground, marginTop: 2 }}>
                  Offline sales saved locally
                </Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </View>

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
          {/* Summary Card */}
          {sales.length > 0 && (
            <View
              className="mb-6 rounded-2xl px-5 py-5"
              style={{
                backgroundColor: colors.card,
              }}>
              <View className="flex-row items-center justify-between">
                <View>
                  <Text variant="footnote" color="tertiary" style={{ marginBottom: 2 }}>
                    Total Revenue
                  </Text>
                  <Text variant="callout">
                    {formatCurrency(totalRevenue, defaultCurrency)}
                  </Text>
                </View>
                <View
                  className="h-12 w-12 items-center justify-center rounded-xl"
                  style={{ backgroundColor: colors.background }}>
                  <Icon name="creditcard.fill" size={22} color={colors.primary} />
                </View>
              </View>
            </View>
          )}

          {/* Sales List */}
          {sales.length === 0 ? (
            <View
              className="rounded-2xl px-5 py-12 items-center justify-center"
              style={{
                backgroundColor: colors.card,
              }}>
              <Icon name="doc" size={40} color={colors.primary} style={{ opacity: 0.3, marginBottom: 12 }} />
              <Text variant="body" color="tertiary" style={{ marginBottom: 4 }}>
                No sales found
              </Text>
              <Text variant="footnote" color="tertiary">
                No sales stored locally
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {sales.map((sale) => (
                <Pressable
                  key={sale.id}
                  onPress={() => handleSalePress(sale)}
                  onLongPress={() => handleSalePress(sale)}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.95 : 1,
                  })}>
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
                        style={{
                          fontSize: 15,
                          fontWeight: '500',
                          marginBottom: 4,
                        }}
                        numberOfLines={1}>
                        {sale.productName}
                      </Text>
                      {sale.productAttributes?.gasSize && sale.productAttributes.gasSize !== 'none' && (
                        <View className="flex-row items-center gap-1.5 mb-2">
                          <View
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: colors.primary }}
                          />
                          <Text
                            variant="subhead"
                            color="tertiary"
                            style={{ fontSize: 13 }}>
                            {sale.productAttributes.gasSize}
                          </Text>
                        </View>
                      )}
                      <View className="flex-row items-center justify-between mt-2">
                        <View>
                          <Text
                            variant="footnote"
                            color="tertiary"
                            style={{ marginBottom: 2 }}>
                            Quantity
                          </Text>
                          <Text variant="body">
                            {sale.quantity}
                          </Text>
                        </View>
                        <View className="items-end">
                          <Text
                            variant="footnote"
                            color="tertiary"
                            style={{ marginBottom: 2 }}>
                            Total
                          </Text>
                          <Text
                            variant="callout"
                            style={{
                              fontSize: 15,
                              fontWeight: '500',
                              color: colors.primary,
                            }}
                            numberOfLines={1}
                            ellipsizeMode="tail">
                            {formatCurrency(sale.totalPrice, sale.currency)}
                          </Text>
                        </View>
                      </View>
                      <View className="mt-2">
                        <Text variant="footnote" color="tertiary">
                          {[
                            sale.seller?.name,
                            typeof sale.branch === 'string' ? sale.branch : null,
                            formatDate(sale.createdAt)
                          ].filter(Boolean).join(' • ')}
                        </Text>
                      </View>
                    </View>
                    <Icon
                      name="chevron.right"
                      size={18}
                      color={colors.mutedForeground}
                      style={{ opacity: 0.4 }}
                    />
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sale Action Sheet */}
      <BottomSheet
        visible={showActionSheet}
        onClose={() => {
          setShowActionSheet(false);
          setSelectedSale(null);
        }}
        title={selectedSale?.productName}
        showIcons={true}
        options={[
          { label: 'View Details', value: 'view', icon: 'eye' },
          { label: 'Edit Sale', value: 'edit', icon: 'pencil' },
          { label: 'Delete Sale', value: 'delete', icon: 'trash', destructive: true },
        ]}
        onSelect={(value) => {
          if (value === 'view' && selectedSale) {
            router.push(`/sale-details/${selectedSale.id}`);
            setShowActionSheet(false);
            setSelectedSale(null);
          } else if (value === 'edit') {
            handleEdit();
          } else if (value === 'delete') {
            handleDelete();
          }
        }}
      />
    </View>
  );
}
