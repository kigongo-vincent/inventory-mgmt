import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/nativewindui/Button';
import { Icon } from '@/components/nativewindui/Icon';
import { Input } from '@/components/nativewindui/Input';
import { Text } from '@/components/nativewindui/Text';
import { useColorScheme } from '@/lib/useColorScheme';
import { useAuthStore } from '@/store/authStore';
import { useProductStore } from '@/store/productStore';
import { withOpacity } from '@/theme/with-opacity';

export default function AddStockScreen() {
  const { colors, colorScheme } = useColorScheme();
  const params = useLocalSearchParams<{ productId?: string }>();
  const currentUser = useAuthStore((state) => state.currentUser);
  const products = useProductStore((state) => state.products);
  const updateProduct = useProductStore((state) => state.updateProduct);
  const fetchProductsByCompany = useProductStore((state) => state.fetchProductsByCompany);
  const isLoadingProducts = useProductStore((state) => state.isLoading);

  const [quantity, setQuantity] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleQuantityKeyPress = (value: string) => {
    if (value === 'backspace') {
      setQuantity((prev) => prev.slice(0, -1));
      return;
    }

    if (value === 'clear') {
      setQuantity('');
      return;
    }

    if (!/^\d$/.test(value)) {
      return;
    }

    setQuantity((prev) => `${prev}${value}`);
  };

  const selectedProduct = useMemo(
    () => products.find((item) => item.id === params.productId) || null,
    [params.productId, products]
  );

  const handleAddStock = async () => {
    if (!selectedProduct) {
      Alert.alert('Error', 'Product not found.');
      return;
    }

    const qty = parseInt(quantity.trim(), 10);
    if (Number.isNaN(qty) || qty <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity to add.');
      return;
    }

    try {
      setIsSaving(true);
      const newQuantity = selectedProduct.quantity + qty;
      await updateProduct(selectedProduct.id, { quantity: newQuantity });

      if (currentUser?.companyId) {
        await fetchProductsByCompany(currentUser.companyId);
      }

      Alert.alert('Success', `Added ${qty} units. New total: ${newQuantity}`, [
        {
          text: 'Done',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('Error adding stock:', error);
      Alert.alert('Error', 'Failed to add stock. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
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
                <Text variant="heading" style={{ color: colors.foreground, fontWeight: '500', fontSize: 20, letterSpacing: -0.3 }}>
                  Add Stock
                </Text>
                <Text variant="footnote" style={{ color: colors.mutedForeground, marginTop: 2 }}>
                  Increase stock for an inventory item
                </Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 }}>
          <View className="gap-4">
            <View
              className="rounded-2xl px-5 py-5"
              style={{
                backgroundColor: colors.card,
                borderWidth: 0.5,
                borderColor: withOpacity(colors.border, 0.2),
              }}>
              <Text variant="footnote" color="tertiary" style={{ fontSize: 12, marginBottom: 4 }}>
                Inventory item
              </Text>
              <Text variant="heading" style={{ color: colors.foreground, fontWeight: '600', fontSize: 18 }}>
                {selectedProduct?.name || 'Select an item from inventory'}
              </Text>
              <Text variant="subhead" color="tertiary" style={{ marginTop: 6, fontSize: 13 }}>
                Current stock: {selectedProduct?.quantity ?? 0} units
              </Text>
            </View>

            <View
              className="rounded-2xl px-5 py-4"
              style={{
                backgroundColor: colors.card,
                borderWidth: 0.5,
                borderColor: withOpacity(colors.border, 0.2),
              }}>
              <Text variant="subhead" className="mb-2">Quantity to add</Text>
              <View
                className="rounded-2xl border px-4 py-3"
                style={{
                  backgroundColor: colors.input || colors.background,
                  borderColor: colors.border,
                  minHeight: 56,
                }}>
                <Input
                  value={quantity || '0'}
                  onChangeText={() => undefined}
                  placeholder="0"
                  editable={false}
                  showSoftInputOnFocus={false}
                  style={{
                    backgroundColor: 'transparent',
                    color: colors.foreground,
                    paddingHorizontal: 0,
                    paddingVertical: 0,
                    fontSize: 20,
                    fontWeight: '700',
                    letterSpacing: 0.3,
                  }}
                />
              </View>
              <Text variant="footnote" color="tertiary" style={{ fontSize: 12, marginTop: 8 }}>
                Use the on-screen number pad below instead of the phone keyboard.
              </Text>
            </View>

            <View
              className="rounded-3xl p-3"
              style={{
                backgroundColor: colors.card,
                borderWidth: 0.5,
                borderColor: withOpacity(colors.border, 0.2),
              }}>
              {[
                ['1', '2', '3'],
                ['4', '5', '6'],
                ['7', '8', '9'],
                ['0'],
              ].map((row, rowIndex) => (
                <View key={`stock-pad-row-${rowIndex}`} className="flex-row gap-2 mb-2" style={{ gap: 10 }}>
                  {row.map((digit) => (
                    <Pressable
                      key={`stock-pad-${digit}`}
                      onPress={() => handleQuantityKeyPress(digit)}
                      style={({ pressed }) => ({
                        flex: digit === '0' ? 2 : 1,
                        opacity: pressed ? 0.8 : 1,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 16,
                        minHeight: 56,
                        backgroundColor: colors.background,
                        borderWidth: 1,
                        borderColor: colors.border,
                        shadowColor: '#000',
                        shadowOpacity: 0.04,
                        shadowRadius: 6,
                        shadowOffset: { width: 0, height: 2 },
                      })}>
                      <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground }}>{digit}</Text>
                    </Pressable>
                  ))}
                  {rowIndex === 3 && (
                    <>
                      <Pressable
                        onPress={() => handleQuantityKeyPress('backspace')}
                        style={({ pressed }) => ({
                          flex: 1,
                          opacity: pressed ? 0.8 : 1,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 12,
                          minHeight: 50,
                          backgroundColor: colors.background,
                          borderWidth: 1,
                          borderColor: colors.border,
                        })}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground }}>⌫</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleQuantityKeyPress('clear')}
                        style={({ pressed }) => ({
                          flex: 1,
                          opacity: pressed ? 0.8 : 1,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 12,
                          minHeight: 50,
                          backgroundColor: colors.background,
                          borderWidth: 1,
                          borderColor: colors.border,
                        })}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground }}>C</Text>
                      </Pressable>
                    </>
                  )}
                </View>
              ))}
            </View>

            <Button
              onPress={handleAddStock}
              disabled={isSaving || isLoadingProducts || !selectedProduct || !quantity.trim()}
              loading={isSaving || isLoadingProducts}
              className="w-full self-stretch"
              style={{ width: '100%', alignSelf: 'stretch' }}>
              <Text>{isSaving ? 'Saving...' : 'Add Stock'}</Text>
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
