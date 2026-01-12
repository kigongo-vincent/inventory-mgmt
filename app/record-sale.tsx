import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Alert, View, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { ActivityIndicator } from '@/components/nativewindui/ActivityIndicator';
import { Button } from '@/components/nativewindui/Button';
import { Icon } from '@/components/nativewindui/Icon';
import { Input } from '@/components/nativewindui/Input';
import { Text } from '@/components/nativewindui/Text';
import { formatCurrency } from '@/lib/currency';
import { useColorScheme } from '@/lib/useColorScheme';
import { useAuthStore } from '@/store/authStore';
import { useProductStore } from '@/store/productStore';
import { useSaleStore } from '@/store/saleStore';
import { useSettingsStore } from '@/store/settingsStore';
import { withOpacity } from '@/theme/with-opacity';
import { GasSize, ProductType, Product, PaymentStatus } from '@/types';

export default function RecordSaleScreen() {
  const { colors, baseFontSize: rawBaseFontSize, colorScheme } = useColorScheme();
  const baseFontSize = rawBaseFontSize || 1.0;
  const insets = useSafeAreaInsets();
  const currentUser = useAuthStore((state) => state.currentUser);
  const getProductsByTypeAndSize = useProductStore(
    (state) => state.getProductsByTypeAndSize
  );
  const reduceProductQuantity = useProductStore(
    (state) => state.reduceProductQuantity
  );
  const fetchProducts = useProductStore((state) => state.fetchProducts);
  const addSale = useSaleStore((state) => state.addSale);
  const settings = useSettingsStore((state) => state.settings);
  const isLoadingSales = useSaleStore((state) => state.isLoading);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch products from backend when component mounts
  useEffect(() => {
    const loadProducts = async () => {
      try {
        await fetchProducts();
      } catch (error) {
        console.error('Error loading products:', error);
        // Continue even if fetch fails (offline mode)
      }
    };
    loadProducts();
  }, [fetchProducts]);

  const productTypes = settings.productTypes || [];
  const gasSizes = settings.gasSizes || [];

  const [productType, setProductType] = useState<ProductType>(() => {
    return productTypes.length > 0 ? productTypes[0] : '';
  });
  const [gasSize, setGasSize] = useState<GasSize>(() => {
    return gasSizes.length > 0 ? (gasSizes.find(s => s !== 'none') || gasSizes[0]) : '';
  });

  useEffect(() => {
    if (productTypes.length > 0 && !productType) {
      setProductType(productTypes[0]);
    }
    if (gasSizes.length > 0 && !gasSize) {
      setGasSize(gasSizes.find(s => s !== 'none') || gasSizes[0]);
    }
  }, [productTypes, gasSizes, productType, gasSize]);

  const [quantity, setQuantity] = useState('1');
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('credit');
  const [buyerName, setBuyerName] = useState('');
  const [buyerContact, setBuyerContact] = useState('');
  const [buyerLocation, setBuyerLocation] = useState('');

  const validProductType = productType || (productTypes.length > 0 ? productTypes[0] : '');
  const validGasSize = gasSize || (gasSizes.length > 0 ? (gasSizes.find(s => s !== 'none') || gasSizes[0]) : '');

  let availableProducts: Product[] = [];
  try {
    if (currentUser && validProductType && validGasSize && productTypes.length > 0 && gasSizes.length > 0) {
      availableProducts = getProductsByTypeAndSize(
        validProductType,
        validGasSize,
        currentUser.companyId || ''
      ) || [];
    }
  } catch (error) {
    console.error('Error getting products:', error);
    availableProducts = [];
  }

  const product = selectedProduct
    ? availableProducts.find((p) => p.id === selectedProduct)
    : availableProducts[0] || null;

  const totalPrice =
    product && quantity
      ? product.price * parseInt(quantity, 10)
      : 0;

  const handleRecordSale = async (syncStatus: 'online' | 'offline') => {
    if (!quantity.trim()) {
      Alert.alert('Error', 'Please enter quantity');
      return;
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    if (!product || !currentUser) {
      Alert.alert('Error', 'Product not available');
      return;
    }

    if (!product.id) {
      Alert.alert('Error', 'Product ID is missing');
      return;
    }

    if (product.quantity < qty) {
      Alert.alert('Error', 'Insufficient stock');
      return;
    }

    setIsProcessing(true);
    try {
      const saleData = {
        productId: product.id,
        productType: product.type,
        productName: product.name,
        productAttributes: product.attributes || {},
        gasSize: product.gasSize,
        quantity: qty,
        unitPrice: product.price,
        totalPrice: totalPrice,
        currency: product.currency,
        sellerId: currentUser.id,
        // sellerName removed - use sellerId FK
        branch: currentUser.branch,
        paymentStatus: paymentStatus,
        buyerName: buyerName.trim() || undefined,
        buyerContact: buyerContact.trim() || undefined,
        buyerLocation: buyerLocation.trim() || undefined,
      };

      // Reduce product quantity first
      const success = await reduceProductQuantity(product.id, qty);
      if (!success) {
        Alert.alert('Error', 'Failed to update inventory');
        return;
      }

      // Create sale
      await addSale(saleData, syncStatus);

      // Refresh products to get updated quantities
      if (syncStatus === 'online') {
        try {
          await fetchProducts();
        } catch (error) {
          console.error('Error refreshing products after sale:', error);
        }
      }

      Alert.alert('Success', `Sale saved ${syncStatus === 'online' ? 'online' : 'offline'}`, [
        {
          text: 'OK',
          onPress: () => {
            setQuantity('');
            setSelectedProduct(null);
            setBuyerName('');
            setBuyerContact('');
            setBuyerLocation('');
            if (syncStatus === 'offline') {
              router.replace('/offline-sales');
            } else {
              router.back();
            }
          },
        },
      ]);
    } catch (error: any) {
      console.error('Error recording sale:', error);
      Alert.alert(
        'Error',
        error?.message || `Failed to save sale ${syncStatus === 'online' ? 'online' : 'offline'}. Please try again.`
      );
    } finally {
      setIsProcessing(false);
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
                  Record Sale
                </Text>
                <Text variant="footnote" style={{ color: colors.mutedForeground, marginTop: 2 }}>
                  Record a new sale transaction
                </Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 80 : 0}>
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: Math.max(40, insets.bottom + 20)
          }}>
          <View style={{ paddingBottom: 8 }}>
            {!currentUser ? (
              <View
                className="rounded-2xl px-5 py-12 items-center justify-center"
                style={{
                  backgroundColor: colors.background,
                  borderWidth: 0.5,
                  borderColor: withOpacity(colors.border, 0.2),
                }}>
                <Text variant="heading" style={{ color: colors.foreground, marginBottom: 8 }}>
                  Loading...
                </Text>
                <Text variant="subhead" color="tertiary" style={{ fontSize: 13.5, textAlign: 'center' }}>
                  Please wait while we load your account information
                </Text>
              </View>
            ) : (
              <View className="gap-4">
                {(!productTypes || productTypes.length === 0 || !gasSizes || gasSizes.length === 0) && (
                  <View
                    className="rounded-2xl px-5 py-12 items-center justify-center"
                    style={{
                      backgroundColor: colors.card,
                      borderWidth: 0.5,
                      borderColor: withOpacity(colors.border, 0.2),
                    }}>
                    <View
                      className="h-16 w-16 items-center justify-center rounded-2xl mb-4"
                      style={{
                        backgroundColor: colors.card,
                      }}>
                      <Icon name="exclamationmark.triangle.fill" size={32} color={colors.primary} style={{ opacity: 0.5 }} />
                    </View>
                    <Text variant="subhead" style={{ fontWeight: '500', fontSize: 16, marginBottom: 4, textAlign: 'center' }}>
                      Configuration Required
                    </Text>
                    <Text variant="subhead" color="tertiary" style={{ fontSize: 13.5, textAlign: 'center' }}>
                      {(!productTypes || productTypes.length === 0) && (!gasSizes || gasSizes.length === 0)
                        ? 'Please configure product types and gas sizes in settings'
                        : !productTypes || productTypes.length === 0
                          ? 'Please configure product types in settings'
                          : 'Please configure gas sizes in settings'}
                    </Text>
                  </View>
                )}

                {productTypes && productTypes.length > 0 && (
                  <View>
                    <Text variant="subhead" className="mb-2">
                      Product Type
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ paddingRight: 20 }}>
                      <View className="flex-row gap-2">
                        {productTypes.map((type) => {
                          const isSelected = productType === type;
                          return (
                            <Pressable
                              key={type}
                              onPress={() => {
                                setProductType(type);
                                setSelectedProduct(null);
                              }}
                              style={({ pressed }) => ({
                                opacity: pressed ? 0.95 : 1,
                              })}>
                              <View
                                className="px-4 py-2.5 rounded-full"
                                style={{
                                  backgroundColor: isSelected ? colors.primary : colors.card,
                                  borderWidth: 0.5,
                                  borderColor: withOpacity(colors.border, 0.2),
                                }}>
                                <Text
                                  style={{
                                    fontSize: 13.5 * baseFontSize,
                                    color: isSelected ? colors.primaryForeground : colors.foreground,
                                    fontWeight: isSelected ? '600' : '400',
                                  }}>
                                  {type}
                                </Text>
                              </View>
                            </Pressable>
                          );
                        })}
                      </View>
                    </ScrollView>
                  </View>
                )}

                {gasSizes && gasSizes.length > 0 && (
                  <View>
                    <Text variant="subhead" className="mb-2">
                      Gas Size
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ paddingRight: 20 }}>
                      <View className="flex-row gap-2">
                        {gasSizes.map((size) => {
                          const isSelected = gasSize === size;
                          return (
                            <Pressable
                              key={size}
                              onPress={() => {
                                setGasSize(size);
                                setSelectedProduct(null);
                              }}
                              style={({ pressed }) => ({
                                opacity: pressed ? 0.95 : 1,
                              })}>
                              <View
                                className="px-4 py-2.5 rounded-full"
                                style={{
                                  backgroundColor: isSelected ? colors.primary : colors.card,
                                  borderWidth: 0.5,
                                  borderColor: withOpacity(colors.border, 0.2),
                                }}>
                                <Text
                                  style={{
                                    fontSize: 13.5 * baseFontSize,
                                    color: isSelected ? colors.primaryForeground : colors.foreground,
                                    fontWeight: isSelected ? '600' : '400',
                                  }}>
                                  {size === 'none' ? 'N/A' : size}
                                </Text>
                              </View>
                            </Pressable>
                          );
                        })}
                      </View>
                    </ScrollView>
                  </View>
                )}

                {availableProducts.length > 0 && (
                  <>
                    {availableProducts.length > 1 && (
                      <View className="mb-6">
                        <Text variant="subhead" className="mb-2">
                          Select Product
                        </Text>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={{ paddingRight: 20 }}>
                          <View className="flex-row gap-2">
                            {availableProducts.map((p) => {
                              const isSelected = (selectedProduct || availableProducts[0].id) === p.id;
                              return (
                                <Pressable
                                  key={p.id}
                                  onPress={() => setSelectedProduct(p.id)}
                                  style={({ pressed }) => ({
                                    opacity: pressed ? 0.95 : 1,
                                  })}>
                                  <View
                                    className="px-4 py-2.5 rounded-full"
                                    style={{
                                      backgroundColor: isSelected ? colors.primary : colors.card,
                                      borderWidth: 0.5,
                                      borderColor: withOpacity(colors.border, 0.2),
                                    }}>
                                    <Text
                                      style={{
                                        fontSize: 13.5 * baseFontSize,
                                        color: isSelected ? colors.primaryForeground : colors.foreground,
                                        fontWeight: isSelected ? '600' : '400',
                                      }}
                                      numberOfLines={1}>
                                      {p.name} - {formatCurrency(p.price, p.currency)}
                                    </Text>
                                  </View>
                                </Pressable>
                              );
                            })}
                          </View>
                        </ScrollView>
                      </View>
                    )}

                    {product && (
                      <>
                        <View
                          className="rounded-2xl px-5 py-5"
                          style={{
                            backgroundColor: colors.card,
                            borderWidth: 0.5,
                            borderColor: withOpacity(colors.border, 0.2),
                          }}>
                          <View className="flex-row items-start gap-4">
                            <View
                              className="h-14 w-14 items-center justify-center rounded-xl"
                              style={{
                                backgroundColor: colors.background,
                              }}>
                              <Icon name="cube.fill" size={13.5 * 2} color={colors.primary} />
                            </View>
                            <View className="flex-1 min-w-0">
                              <Text
                                variant="heading"
                                style={{
                                  fontWeight: '500',
                                  fontSize: 14,
                                  marginBottom: 4,
                                  letterSpacing: -0.3,
                                }}
                                numberOfLines={1}>
                                {product.name}
                              </Text>
                              {product.gasSize !== 'none' && (
                                <View className="flex-row items-center gap-1.5 mb-3">
                                  <View
                                    className="h-1.5 w-1.5 rounded-full"
                                    style={{ backgroundColor: colors.primary }}
                                  />
                                  <Text
                                    variant="subhead"
                                    color="tertiary"
                                    style={{ fontSize: 13 }}>
                                    {product.gasSize}
                                  </Text>
                                </View>
                              )}
                              <View className="flex-row items-center justify-between mt-2">
                                <View>
                                  <Text
                                    variant="footnote"
                                    color="tertiary"
                                    style={{ fontSize: 12, marginBottom: 2 }}>
                                    Available Stock
                                  </Text>
                                  <Text
                                    variant="body"
                                    style={{
                                      fontSize: 13,
                                      fontWeight: '500',
                                    }}>
                                    {product.quantity}
                                  </Text>
                                </View>
                                <View className="items-end">
                                  <Text
                                    variant="footnote"
                                    color="tertiary"
                                    style={{ fontSize: 12, marginBottom: 2 }}>
                                    Unit Price
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

                        <View>
                          <View
                            className="rounded-2xl px-5 py-4"
                            style={{
                              backgroundColor: colors.card,
                              borderWidth: 0.5,
                              borderColor: withOpacity(colors.border, 0.2),
                            }}>
                            <Text variant="subhead" className="mb-2">
                              Quantity
                            </Text>
                            <Input
                              value={quantity}
                              onChangeText={setQuantity}
                              placeholder="Enter quantity"
                              keyboardType="numeric"
                              style={{
                                backgroundColor: colors.background,
                                color: colors.foreground,
                                paddingHorizontal: 12,
                                paddingVertical: 12,
                                borderRadius: 12,
                              }}
                            />
                          </View>
                        </View>

                        {quantity && !isNaN(parseInt(quantity, 10)) && (
                          <View
                            className="rounded-2xl px-5 py-5"
                            style={{
                              backgroundColor: colors.card,
                              borderWidth: 0.5,
                              borderColor: withOpacity(colors.border, 0.2),
                            }}>
                            <View className="flex-row items-start gap-4">
                              <View
                                className="h-14 w-14 items-center justify-center rounded-xl"
                                style={{
                                  backgroundColor: colors.background,
                                }}>
                                <Icon name="dollarsign.circle.fill" size={13.5 * 2} color={colors.primary} />
                              </View>
                              <View style={{ flex: 1, minWidth: 0 }}>
                                <Text
                                  variant="footnote"
                                  color="tertiary"
                                  style={{ fontSize: 12, marginBottom: 4 }}>
                                  Total Price
                                </Text>
                                <Text
                                  variant="heading"
                                  style={{
                                    fontWeight: '500',
                                    fontSize: 24,
                                    color: colors.primary,
                                    letterSpacing: -0.4,
                                    includeFontPadding: false,
                                  }}
                                  allowFontScaling={false}>
                                  {formatCurrency(totalPrice, product.currency)}
                                </Text>
                                <Text
                                  variant="subhead"
                                  color="tertiary"
                                  style={{ fontSize: 13, marginTop: 4 }}
                                  numberOfLines={1}
                                  ellipsizeMode="tail">
                                  {quantity} × {formatCurrency(product.price, product.currency)}
                                </Text>
                              </View>
                            </View>
                          </View>
                        )}

                        <View>
                          <Text variant="subhead" className="mb-2">
                            Payment Status
                          </Text>
                          <View className="flex-row gap-2">
                            <Pressable
                              onPress={() => setPaymentStatus('credit')}
                              className="flex-1"
                              style={({ pressed }) => ({
                                opacity: pressed ? 0.95 : 1,
                              })}>
                              <View
                                className="rounded-xl px-4 py-3 items-center"
                                style={{
                                  backgroundColor: paymentStatus === 'credit' ? colors.primary : colors.card,
                                  borderWidth: 0.5,
                                  borderColor: withOpacity(colors.border, 0.2),
                                }}>
                                <Icon
                                  name="creditcard.fill"
                                  size={20}
                                  color={paymentStatus === 'credit' ? colors.primaryForeground : colors.primary}
                                />
                                <Text
                                  style={{
                                    fontSize: 13.5 * baseFontSize,
                                    color: paymentStatus === 'credit' ? colors.primaryForeground : colors.foreground,
                                    fontWeight: paymentStatus === 'credit' ? '600' : '400',
                                    marginTop: 4,
                                  }}>
                                  Instant Payment
                                </Text>
                              </View>
                            </Pressable>
                            <Pressable
                              onPress={() => setPaymentStatus('promised')}
                              className="flex-1"
                              style={({ pressed }) => ({
                                opacity: pressed ? 0.95 : 1,
                              })}>
                              <View
                                className="rounded-xl px-4 py-3 items-center"
                                style={{
                                  backgroundColor: paymentStatus === 'promised' ? colors.primary : colors.card,
                                  borderWidth: 0.5,
                                  borderColor: withOpacity(colors.border, 0.2),
                                }}>
                                <Icon
                                  name="clock.fill"
                                  size={20}
                                  color={paymentStatus === 'promised' ? colors.primaryForeground : colors.primary}
                                />
                                <Text
                                  style={{
                                    fontSize: 13.5 * baseFontSize,
                                    color: paymentStatus === 'promised' ? colors.primaryForeground : colors.foreground,
                                    fontWeight: paymentStatus === 'promised' ? '600' : '400',
                                    marginTop: 4,
                                  }}>
                                  Promised Payment
                                </Text>
                              </View>
                            </Pressable>
                          </View>
                        </View>

                        {/* Buyer Information (Optional) */}
                        <View>
                          <Text variant="subhead" className="mb-3">
                            Buyer Information (Optional)
                          </Text>
                          <View className="gap-3">
                            <View
                              className="rounded-2xl px-5 py-4"
                              style={{
                                backgroundColor: colors.card,
                                borderWidth: 0.5,
                                borderColor: withOpacity(colors.border, 0.2),
                              }}>
                              <Text variant="footnote" color="tertiary" className="mb-2" style={{ fontSize: 12 }}>
                                Buyer Name
                              </Text>
                              <Input
                                value={buyerName}
                                onChangeText={setBuyerName}
                                placeholder="Enter buyer name"
                                style={{
                                  backgroundColor: colors.background,
                                  color: colors.foreground,
                                  paddingHorizontal: 12,
                                  paddingVertical: 12,
                                  borderRadius: 12,
                                }}
                              />
                            </View>
                            <View
                              className="rounded-2xl px-5 py-4"
                              style={{
                                backgroundColor: colors.card,
                                borderWidth: 0.5,
                                borderColor: withOpacity(colors.border, 0.2),
                              }}>
                              <Text variant="footnote" color="tertiary" className="mb-2" style={{ fontSize: 12 }}>
                                Buyer Contact
                              </Text>
                              <Input
                                value={buyerContact}
                                onChangeText={setBuyerContact}
                                placeholder="Enter buyer contact"
                                keyboardType="phone-pad"
                                style={{
                                  backgroundColor: colors.background,
                                  color: colors.foreground,
                                  paddingHorizontal: 12,
                                  paddingVertical: 12,
                                  borderRadius: 12,
                                }}
                              />
                            </View>
                            <View
                              className="rounded-2xl px-5 py-4"
                              style={{
                                backgroundColor: colors.card,
                                borderWidth: 0.5,
                                borderColor: withOpacity(colors.border, 0.2),
                              }}>
                              <Text variant="footnote" color="tertiary" className="mb-2" style={{ fontSize: 12 }}>
                                Buyer Location
                              </Text>
                              <Input
                                value={buyerLocation}
                                onChangeText={setBuyerLocation}
                                placeholder="Enter buyer location"
                                style={{
                                  backgroundColor: colors.background,
                                  color: colors.foreground,
                                  paddingHorizontal: 12,
                                  paddingVertical: 12,
                                  borderRadius: 12,
                                }}
                              />
                            </View>
                          </View>
                        </View>

                        <View className="flex-row gap-3 mt-2">
                          <Button
                            onPress={() => handleRecordSale('online')}
                            disabled={
                              isProcessing ||
                              isLoadingSales ||
                              !quantity ||
                              !product ||
                              product.quantity < parseInt(quantity || '0', 10)
                            }
                            variant="primary"
                            className="flex-1"
                            loading={isProcessing || isLoadingSales}>
                            <Icon name="cloud.fill" size={16} color="#FFFFFF" />
                            <Text>Save</Text>
                          </Button>
                          <Button
                            onPress={() => handleRecordSale('offline')}
                            disabled={
                              isProcessing ||
                              isLoadingSales ||
                              !quantity ||
                              !product ||
                              product.quantity < parseInt(quantity || '0', 10)
                            }
                            variant="secondary"
                            className="flex-1"
                            loading={isProcessing || isLoadingSales}>
                            <Icon name="externaldrive.fill" size={16} color={colors.primary} />
                            <Text style={{ color: colors.primary }}>Save Offline</Text>
                          </Button>
                        </View>
                      </>
                    )}
                  </>
                )}

                {availableProducts.length === 0 && (
                  <View
                    className="rounded-2xl px-5 py-12 items-center justify-center"
                    style={{
                      backgroundColor: colors.card,
                      borderWidth: 0.5,
                      borderColor: withOpacity(colors.border, 0.2),
                    }}>
                    <View
                      className="h-16 w-16 items-center justify-center rounded-2xl mb-4"
                      style={{
                        backgroundColor: colors.card,
                      }}>
                      <Icon name="shippingbox" size={32} color={colors.primary} style={{ opacity: 0.5 }} />
                    </View>
                    <Text variant="subhead" color="tertiary" style={{ fontSize: 13.5 }}>
                      No products available for this selection
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      {/* Loading Overlay */}
      {(isProcessing || isLoadingSales) && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}>
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 12,
              padding: 24,
              alignItems: 'center',
              gap: 16,
              minWidth: 120,
            }}>
            <ActivityIndicator size="large" />
            <Text style={{ color: colors.foreground, fontSize: 16 }}>
              Processing sale...
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
