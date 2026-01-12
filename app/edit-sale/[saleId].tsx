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
import { useAuthStore } from '@/store/authStore';
import { useSaleStore } from '@/store/saleStore';
import { withOpacity } from '@/theme/with-opacity';
import { PaymentStatus } from '@/types';

export default function EditSaleScreen() {
  const { colors, baseFontSize: rawBaseFontSize, colorScheme } = useColorScheme();
  const baseFontSize = rawBaseFontSize || 1.0;
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ saleId?: string }>();
  const currentUser = useAuthStore((state) => state.currentUser);
  const getSaleById = useSaleStore((state) => state.getSaleById);
  const updateSale = useSaleStore((state) => state.updateSale);
  const isLoadingSales = useSaleStore((state) => state.isLoading);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sale, setSale] = useState<any>(null);

  // Load sale data
  useEffect(() => {
    if (params.saleId) {
      const saleData = getSaleById(params.saleId);
      if (saleData) {
        setSale(saleData);
        setQuantity(saleData.quantity.toString());
        setPaymentStatus(saleData.paymentStatus || 'credit');
        setBuyerName(saleData.buyerName || '');
        setBuyerContact(saleData.buyerContact || '');
        setBuyerLocation(saleData.buyerLocation || '');
      } else {
        Alert.alert('Error', 'Sale not found', [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]);
      }
    }
  }, [params.saleId, getSaleById]);

  const [quantity, setQuantity] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('credit');
  const [buyerName, setBuyerName] = useState('');
  const [buyerContact, setBuyerContact] = useState('');
  const [buyerLocation, setBuyerLocation] = useState('');

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
          <ActivityIndicator size="large" />
          <Text variant="body" color="tertiary" style={{ marginTop: 16 }}>
            Loading sale...
          </Text>
        </View>
      </View>
    );
  }

  const qty = quantity ? parseInt(quantity, 10) : sale.quantity;
  const totalPrice = sale.unitPrice * (isNaN(qty) ? sale.quantity : qty);

  const handleUpdateSale = async () => {
    if (!quantity.trim()) {
      Alert.alert('Error', 'Please enter quantity');
      return;
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    setIsProcessing(true);
    try {
      await updateSale(sale.id, {
        quantity: qty,
        totalPrice: totalPrice,
        paymentStatus: paymentStatus,
        buyerName: buyerName.trim() || undefined,
        buyerContact: buyerContact.trim() || undefined,
        buyerLocation: buyerLocation.trim() || undefined,
      });

      Alert.alert('Success', 'Sale updated successfully', [
        {
          text: 'OK',
          onPress: () => {
            router.back();
          },
        },
      ]);
    } catch (error: any) {
      console.error('Error updating sale:', error);
      Alert.alert('Error', error?.message || 'Failed to update sale. Please try again.');
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
                  Edit Sale
                </Text>
                <Text variant="footnote" style={{ color: colors.mutedForeground, marginTop: 2 }}>
                  Update sale information
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
                      {sale.productName}
                    </Text>
                    {sale.productAttributes?.gasSize && sale.productAttributes.gasSize !== 'none' && (
                      <View className="flex-row items-center gap-1.5 mb-3">
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
                          style={{ fontSize: 12, marginBottom: 2 }}>
                          Unit Price
                        </Text>
                        <Text
                          variant="body"
                          style={{
                            fontSize: 13,
                            fontWeight: '500',
                          }}>
                          {formatCurrency(sale.unitPrice, sale.currency)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>

              {/* Quantity Input */}
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

              {/* Total Price Display */}
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
                        {formatCurrency(totalPrice, sale.currency)}
                      </Text>
                      <Text
                        variant="subhead"
                        color="tertiary"
                        style={{ fontSize: 13, marginTop: 4 }}
                        numberOfLines={1}
                        ellipsizeMode="tail">
                        {quantity} × {formatCurrency(sale.unitPrice, sale.currency)}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Payment Status */}
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

              {/* Buyer Information */}
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
                  onPress={handleUpdateSale}
                  disabled={isProcessing || isLoadingSales || !quantity}
                  variant="primary"
                  className="flex-1"
                  loading={isProcessing || isLoadingSales}>
                  <Icon name="checkmark.circle.fill" size={16} color="#FFFFFF" />
                  <Text>Update Sale</Text>
                </Button>
              </View>
            </View>
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
              Updating sale...
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
