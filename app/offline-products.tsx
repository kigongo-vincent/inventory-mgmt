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
import { useProductStore } from '@/store/productStore';
import { Product } from '@/types';

export default function OfflineProductsScreen() {
  const { colors, colorScheme } = useColorScheme();
  const [refreshing, setRefreshing] = useState(false);
  const allProducts = useProductStore((state) => state.products);
  const deleteProduct = useProductStore((state) => state.deleteProduct);
  const fetchProducts = useProductStore((state) => state.fetchProducts);
  
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Get all products, filter only offline products, and sort by name
  const products = [...allProducts]
    .filter((product) => product.syncStatus === 'offline')
    .sort((a, b) => a.name.localeCompare(b.name));

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

  const handleProductPress = (product: Product) => {
    setSelectedProduct(product);
    setShowActionSheet(true);
  };

  const handleEdit = () => {
    if (selectedProduct) {
      router.push(`/edit-product/${selectedProduct.id}`);
      setShowActionSheet(false);
      setSelectedProduct(null);
    }
  };

  const handleDelete = () => {
    if (selectedProduct) {
      Alert.alert(
        'Delete Product',
        `Are you sure you want to delete ${selectedProduct.name}?`,
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
                await deleteProduct(selectedProduct.id);
                setShowActionSheet(false);
                setSelectedProduct(null);
              } catch (error: any) {
                Alert.alert('Error', error.message || 'Failed to delete product');
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
                  Stored Products
                </Text>
                <Text variant="footnote" style={{ color: colors.mutedForeground, marginTop: 2 }}>
                  Offline products saved locally
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
                await fetchProducts();
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
          {/* Summary Card */}
          {products.length > 0 && (
            <View
              className="mb-6 rounded-2xl px-5 py-5"
              style={{
                backgroundColor: colors.card,
              }}>
              <View className="flex-row items-center justify-between">
                <View>
                  <Text variant="footnote" color="tertiary" style={{ marginBottom: 2 }}>
                    Total Products
                  </Text>
                  <Text variant="callout">
                    {products.length}
                  </Text>
                </View>
                <View
                  className="h-12 w-12 items-center justify-center rounded-xl"
                  style={{ backgroundColor: colors.background }}>
                  <Icon name="shippingbox.fill" size={22} color={colors.primary} />
                </View>
              </View>
            </View>
          )}

          {/* Products List */}
          {products.length === 0 ? (
            <View
              className="rounded-2xl px-5 py-12 items-center justify-center"
              style={{
                backgroundColor: colors.card,
              }}>
              <Icon name="shippingbox" size={40} color={colors.primary} style={{ opacity: 0.3, marginBottom: 12 }} />
              <Text variant="body" color="tertiary" style={{ marginBottom: 4 }}>
                No products found
              </Text>
              <Text variant="footnote" color="tertiary">
                No products stored locally
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {products.map((product) => {
                // Get attributes for display
                const attributes = product.attributes || {};
                const gasSize = attributes.gasSize;
                
                return (
                  <Pressable
                    key={product.id}
                    onPress={() => handleProductPress(product)}
                    onLongPress={() => handleProductPress(product)}
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
                        <Icon name="cube.fill" size={13.5 * 1.9} color={colors.primary} />
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
                          {product.name}
                        </Text>
                        {gasSize && gasSize !== 'none' && (
                          <View className="flex-row items-center gap-1.5 mb-2">
                            <View
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: colors.primary }}
                            />
                            <Text
                              variant="subhead"
                              color="tertiary"
                              style={{ fontSize: 13 }}>
                              {gasSize}
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
                              {product.quantity}
                            </Text>
                          </View>
                          <View className="items-end">
                            <Text
                              variant="footnote"
                              color="tertiary"
                              style={{ marginBottom: 2 }}>
                              Price
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
                              {formatCurrency(product.price, product.currency)}
                            </Text>
                          </View>
                        </View>
                        <View className="mt-2">
                          <Text variant="footnote" color="tertiary">
                            {[
                              product.company,
                              formatDate(product.createdAt)
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
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Product Action Sheet */}
      <BottomSheet
        visible={showActionSheet}
        onClose={() => {
          setShowActionSheet(false);
          setSelectedProduct(null);
        }}
        title={selectedProduct?.name}
        showIcons={true}
        options={[
          { label: 'View Details', value: 'view', icon: 'eye' },
          { label: 'Edit Product', value: 'edit', icon: 'pencil' },
          { label: 'Delete Product', value: 'delete', icon: 'trash', destructive: true },
        ]}
        onSelect={(value) => {
          if (value === 'view' && selectedProduct) {
            // Navigate to product details or show in inventory
            router.push({
              pathname: '/(tabs)/inventory',
              params: { productId: selectedProduct.id },
            });
            setShowActionSheet(false);
            setSelectedProduct(null);
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
