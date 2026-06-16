import { router } from 'expo-router';
import React, { useState, useEffect, useMemo } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, View, Image } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { BottomSheet } from '@/components/nativewindui/BottomSheet';
import { Button } from '@/components/nativewindui/Button';
import { FAB } from '@/components/nativewindui/FAB';
import { Icon } from '@/components/nativewindui/Icon';
import { Skeleton, SkeletonProductCard } from '@/components/nativewindui/Skeleton';
import { Text } from '@/components/nativewindui/Text';
import { formatCurrency } from '@/lib/currency';
import { useColorScheme } from '@/lib/useColorScheme';
import { useAuthStore } from '@/store/authStore';
import { useProductStore } from '@/store/productStore';
import { withOpacity } from '@/theme/with-opacity';
import { Product } from '@/types';

export default function InventoryScreen() {
  const { colors, baseFontSize } = useColorScheme();
  const [refreshing, setRefreshing] = useState(false);
  const currentUser = useAuthStore((state) => state.currentUser);
  // Normalize role check - handle different case variations
  const normalizedRole = currentUser?.role?.toLowerCase();
  const isSuperAdmin = normalizedRole === 'super_admin' || normalizedRole === 'superadmin';

  // Debug: Log role check
  useEffect(() => {
    if (currentUser) {
      console.log('🔍 Inventory Screen - User Role Check:', {
        role: currentUser.role,
        normalizedRole,
        isSuperAdmin,
        user: currentUser.username,
        fullUser: JSON.stringify(currentUser, null, 2),
      });
    }
  }, [currentUser, isSuperAdmin, normalizedRole]);
  const getProductsByCompany = useProductStore((state) => state.getProductsByCompany);
  const deleteProduct = useProductStore((state) => state.deleteProduct);
  const fetchProductsByCompany = useProductStore((state) => state.fetchProductsByCompany);
  const syncProducts = useProductStore((state) => state.syncProducts);
  const isLoadingProducts = useProductStore((state) => state.isLoading);
  const isFetchingProducts = useProductStore((state) => state.isFetching);

  const [showActionSheet, setShowActionSheet] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const allProducts = useProductStore((state) => state.products);

  // Products only - exclude services from inventory display
  const companyProducts = useMemo(() => {
    if (!currentUser?.companyId) return [];
    return getProductsByCompany(currentUser.companyId).filter(
      (p) => p.attributes?.category !== 'Service'
    );
  }, [currentUser?.companyId, getProductsByCompany, allProducts]);

  // Fetch products from backend on mount
  useEffect(() => {
    if (currentUser?.companyId) {
      fetchProductsByCompany(currentUser.companyId);
    }
  }, [currentUser?.companyId, fetchProductsByCompany]);


  if (isFetchingProducts && !refreshing) {
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
              {isSuperAdmin && <Skeleton width={90} height={36} borderRadius={18} />}
            </View>

            {/* Search Bar Skeleton */}
            <View className="mb-6">
              <Skeleton width="100%" height={44} borderRadius={12} />
            </View>

            {/* Products Grid Skeleton */}
            <View className="flex-row flex-wrap gap-4" style={{ justifyContent: 'space-between' }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonProductCard
                  key={i}
                  style={{ width: '47%' }}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  const handleProductPress = (product: Product) => {
    setSelectedProduct(product);
    setShowActionSheet(true);
  };

  const handleEdit = () => {
    if (!selectedProduct?.id) return;
    setShowActionSheet(false);
    router.push({ pathname: '/edit-product', params: { productId: selectedProduct.id } });
  };

  const handleDelete = () => {
    if (!selectedProduct) return;
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${selectedProduct.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => setShowActionSheet(false) },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProduct(selectedProduct.id);
              setShowActionSheet(false);
              setSelectedProduct(null);
              Alert.alert('Success', 'Product deleted successfully');

              // Refresh products after deleting
              if (currentUser?.companyId) {
                fetchProductsByCompany(currentUser.companyId);
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete product. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
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
                if (currentUser?.companyId) {
                  // Fetch fresh data from backend (automatically filtered by company via middleware)
                  await fetchProductsByCompany(currentUser.companyId);
                  // Also sync any offline products
                  await syncProducts();
                }
              } catch (error) {
                console.error('Error refreshing products:', error);
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
                  fontSize: 16,
                  marginBottom: 4,
                }}>
                Inventory
              </Text>
              <Text variant="footnote" color="tertiary" style={{ fontSize: 12 }}>
                Manage your product inventory
              </Text>
            </View>
            {isSuperAdmin && (
              <Button
                variant="primary"
                size="md"
                onPress={() => router.push('/add-product')}>
                <Text>Add Product</Text>
              </Button>
            )}
          </View>

          {/* Products List */}
          {companyProducts.length === 0 ? (
            <View
              className="rounded-2xl px-5 py-12 items-center justify-center"
              style={{
                backgroundColor: colors.card,
              }}>
              <MaterialCommunityIcons name="package-variant" size={40} color={colors.primary} style={{ opacity: 0.3, marginBottom: 12 }} />
              <Text variant="subhead" color="tertiary" style={{ fontSize: 16, fontWeight: '500', marginBottom: 4 }}>
                No products in inventory
              </Text>
              <Text variant="footnote" color="tertiary" style={{ fontSize: 13 }}>
                Add products to get started
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {companyProducts.map((product, index) => (
                <Pressable
                  key={`product-${product.id || `index-${index}`}`}
                  onPress={() => handleProductPress(product)}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                  })}>
                  <View
                    className="rounded-2xl px-5 py-5"
                    style={{
                      backgroundColor: colors.card,
                      borderWidth: 0.5,
                      borderColor: withOpacity(colors.border, 0.2),
                    }}>
                    <View className="flex-row items-start gap-4">
                      <View
                        className="h-14 w-14 items-center justify-center rounded-xl overflow-hidden"
                        style={{
                          backgroundColor: colors.background,
                        }}>
                        {product.imageUri ? (
                          <Image
                            source={{ uri: product.imageUri }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                          />
                        ) : (
                          <MaterialCommunityIcons name="package-variant" size={13.5 * 2} color={colors.primary} />
                        )}
                      </View>
                      <View className="flex-1 min-w-0">
                        <View className="flex-row items-start justify-between mb-2">
                          <View className="flex-1 min-w-0">
                            <View className="flex-row items-start justify-between mb-2">
                              <Text
                                variant="heading"
                                style={{
                                  fontWeight: '500',
                                  fontSize: 14,
                                  letterSpacing: -0.3,
                                  flex: 1,
                                }}
                                numberOfLines={1}>
                                {product.name}
                              </Text>
                              {/* Stock Status Badge - Top Right */}
                              <View
                                className="px-2.5 py-1 rounded-full ml-2"
                                style={{
                                  backgroundColor: product.attributes?.category === 'Service'
                                    ? withOpacity(colors.primary, 0.1)
                                    : product.quantity === 0
                                      ? withOpacity(colors.destructive, 0.15)
                                      : product.quantity < 10
                                        ? withOpacity(colors.primary, 0.15)
                                        : withOpacity(colors.primary, 0.1),
                                }}>
                                <View className="flex-row items-center gap-1.5">
                                  <View
                                    className="h-1.5 w-1.5 rounded-full"
                                    style={{
                                      backgroundColor: product.attributes?.category === 'Service'
                                        ? colors.primary
                                        : product.quantity === 0
                                          ? colors.destructive
                                          : colors.primary,
                                    }}
                                  />
                                  <Text
                                    variant="footnote"
                                    style={{
                                      fontSize: 11,
                                      fontWeight: '500',
                                      color: product.attributes?.category === 'Service'
                                        ? colors.primary
                                        : product.quantity === 0
                                          ? colors.destructive
                                          : colors.primary,
                                    }}>
                                    {product.attributes?.category === 'Service'
                                      ? 'Service'
                                      : product.quantity === 0
                                        ? 'Out of Stock'
                                        : product.quantity < 10
                                          ? 'Low Stock'
                                          : 'In Stock'}
                                  </Text>
                                </View>
                              </View>
                            </View>
                            {/* Category info */}
                            {product.attributes?.category && (
                              <View className="flex-row items-center gap-1.5 mb-2">
                                <View
                                  className="h-1.5 w-1.5 rounded-full"
                                  style={{ backgroundColor: colors.primary }}
                                />
                                <Text
                                  variant="subhead"
                                  color="tertiary"
                                  style={{ fontSize: 12 }}>
                                  {product.attributes.category}
                                </Text>
                              </View>
                            )}
                            {/* Provider info - For Full Gas Cylinder, Regulator, New Kit, and Services */}
                            {((product.attributes?.type === 'Full Gas Cylinder' || product.attributes?.type === 'Regulator' || product.attributes?.type === 'New Kit' || product.attributes?.category === 'Service') && product.attributes?.provider) && (
                              <View className="flex-row items-center gap-1.5 mb-2">
                                <View
                                  className="h-1.5 w-1.5 rounded-full"
                                  style={{ backgroundColor: colors.primary }}
                                />
                                <Text
                                  variant="subhead"
                                  style={{ fontSize: 13, fontWeight: '600' }}>
                                  {product.attributes.provider}
                                </Text>
                              </View>
                            )}
                            {/* Size info - For Full Gas Cylinder, Regulator, New Kit, Gas Plate, and Services */}
                            {((product.attributes?.type === 'Full Gas Cylinder' || product.attributes?.type === 'Regulator' || product.attributes?.type === 'New Kit' || product.attributes?.type === 'Gas Plate' || product.attributes?.category === 'Service') && product.attributes?.size && product.attributes.size !== 'none') && (
                              <View className="flex-row items-center gap-1.5 mb-2">
                                <View
                                  className="h-1.5 w-1.5 rounded-full"
                                  style={{ backgroundColor: colors.primary }}
                                />
                                <Text
                                  variant="subhead"
                                  color="tertiary"
                                  style={{ fontSize: 13 }}>
                                  {product.attributes.type === 'Gas Plate'
                                    ? `Plate Count: ${product.attributes.size}`
                                    : product.attributes.type === 'Regulator'
                                      ? `Size: ${product.attributes.size}`
                                      : `Size: ${product.attributes.size}`}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                        <View className="flex-row items-center justify-between mt-2">
                          <View>
                            <Text
                              variant="footnote"
                              color="tertiary"
                              style={{ fontSize: 12, marginBottom: 2 }}>
                              {product.attributes?.category === 'Service' ? 'Size' : 'Quantity'}
                            </Text>
                            <Text
                              variant="body"
                              style={{
                                fontSize: 13,
                                fontWeight: '500',
                              }}>
                              {product.attributes?.category === 'Service'
                                ? (product.attributes?.size || '—')
                                : product.quantity}
                            </Text>
                          </View>
                          <View className="items-end">
                            <Text
                              variant="footnote"
                              color="tertiary"
                              style={{ fontSize: 12, marginBottom: 2 }}>
                              Price
                            </Text>
                            <Text
                              variant="body"
                              style={{
                                fontSize: 14,
                                fontWeight: '500',
                                color: colors.primary,
                                letterSpacing: -0.2,
                              }}
                              numberOfLines={1}
                              ellipsizeMode="tail">
                              {formatCurrency(product.price, product.currency)}
                            </Text>
                          </View>
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

      {/* Product Action Sheet */}
      <BottomSheet
        visible={showActionSheet}
        onClose={() => {
          setShowActionSheet(false);
        }}
        title="Product Actions"
        showIcons={true}
        options={
          isSuperAdmin
            ? [
              { label: 'Add Stock', value: 'add_stock', icon: 'plus.circle.fill' },
              { label: 'Edit Product', value: 'edit', icon: 'pencil' },
              { label: 'Delete Product', value: 'delete', icon: 'trash', destructive: true },
            ]
            : [
              { label: 'Add Stock', value: 'add_stock', icon: 'plus.circle.fill' },
            ]
        }
        onSelect={(value) => {
          if (value === 'add_stock') {
            if (selectedProduct?.id) {
              router.push({ pathname: '/add-stock', params: { productId: selectedProduct.id } });
            }
          } else if (value === 'edit') {
            handleEdit();
          } else if (value === 'delete') {
            handleDelete();
          }
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
          {
            label: 'Record Expense',
            icon: 'dollarsign.circle.fill',
            onPress: () => router.push('/record-expense'),
          },
          ...(isSuperAdmin
            ? [
              {
                label: 'Add Product',
                icon: 'cube.box.fill',
                onPress: () => router.push('/add-product'),
              },
            ]
            : []),
        ].filter(Boolean)}
      />
    </View>
  );
}
