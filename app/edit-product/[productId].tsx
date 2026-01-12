import { useLocalSearchParams, router } from 'expo-router';
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
import { useProductStore } from '@/store/productStore';
import { withOpacity } from '@/theme/with-opacity';

export default function EditProductScreen() {
  const { colors, baseFontSize: rawBaseFontSize, colorScheme } = useColorScheme();
  const baseFontSize = rawBaseFontSize || 1.0;
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ productId?: string }>();
  const getProductById = useProductStore((state) => state.getProductById);
  const updateProduct = useProductStore((state) => state.updateProduct);
  const isLoadingProducts = useProductStore((state) => state.isLoading);
  const [isProcessing, setIsProcessing] = useState(false);
  const [product, setProduct] = useState<any>(null);

  // Load product data
  useEffect(() => {
    if (params.productId) {
      const productData = getProductById(params.productId);
      if (productData) {
        setProduct(productData);
        setName(productData.name || '');
        setPrice(productData.price?.toString() || '');
        setQuantity(productData.quantity?.toString() || '');
      } else {
        Alert.alert('Error', 'Product not found', [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]);
      }
    }
  }, [params.productId, getProductById]);

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');

  if (!product) {
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
          <ActivityIndicator size="large" />
          <Text variant="body" color="tertiary" style={{ marginTop: 16 }}>
            Loading product...
          </Text>
        </View>
      </View>
    );
  }

  const handleUpdateProduct = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter product name');
      return;
    }

    if (!price.trim()) {
      Alert.alert('Error', 'Please enter price');
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    if (!quantity.trim()) {
      Alert.alert('Error', 'Please enter quantity');
      return;
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    setIsProcessing(true);
    try {
      await updateProduct(product.id, {
        name: name.trim(),
        price: priceNum,
        quantity: qty,
      });

      Alert.alert('Success', 'Product updated successfully', [
        {
          text: 'OK',
          onPress: () => {
            router.back();
          },
        },
      ]);
    } catch (error: any) {
      console.error('Error updating product:', error);
      Alert.alert('Error', error?.message || 'Failed to update product. Please try again.');
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
                  Edit Product
                </Text>
                <Text variant="footnote" style={{ color: colors.mutedForeground, marginTop: 2 }}>
                  Update product information
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
            <View className="gap-4">
              {/* Product Info Card */}
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
                          }}>
                          {formatCurrency(product.price, product.currency)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>

              {/* Form Fields */}
              <View className="gap-4">
                <View>
                  <Text variant="subhead" className="mb-2">
                    Product Name
                  </Text>
                  <Input
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter product name"
                    autoCapitalize="words"
                  />
                </View>

                <View>
                  <Text variant="subhead" className="mb-2">
                    Price ({product.currency})
                  </Text>
                  <Input
                    value={price}
                    onChangeText={setPrice}
                    placeholder="Enter price"
                    keyboardType="decimal-pad"
                  />
                </View>

                <View>
                  <Text variant="subhead" className="mb-2">
                    Quantity
                  </Text>
                  <Input
                    value={quantity}
                    onChangeText={setQuantity}
                    placeholder="Enter quantity"
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              {/* Update Button */}
              <Button
                onPress={handleUpdateProduct}
                className="mt-4"
                loading={isProcessing || isLoadingProducts}
                disabled={isProcessing || isLoadingProducts}>
                <Text>Update Product</Text>
              </Button>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
