import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { Icon } from '@/components/nativewindui/Icon';
import { Text } from '@/components/nativewindui/Text';
import { formatCurrency } from '@/lib/currency';
import { useColorScheme } from '@/lib/useColorScheme';
import { useAuthStore } from '@/store/authStore';
import { useProductStore } from '@/store/productStore';
import { useSaleStore } from '@/store/saleStore';
import { useUserStore } from '@/store/userStore';
import { withOpacity } from '@/theme/with-opacity';
import { Product, Sale, User } from '@/types';

export default function SearchResultsScreen() {
  const { colors, colorScheme } = useColorScheme();
  const [refreshing, setRefreshing] = useState(false);
  const params = useLocalSearchParams<{ query?: string }>();
  const searchQuery = params.query || '';
  const currentUser = useAuthStore((state) => state.currentUser);
  const products = useProductStore((state) => state.products);
  const sales = useSaleStore((state) => state.sales);
  const getSalesByUser = useSaleStore((state) => state.getSalesByUser);
  const users = useUserStore((state) => state.users);
  const fetchUsers = useUserStore((state) => state.fetchUsers);
  const fetchProducts = useProductStore((state) => state.fetchProducts);
  const fetchSales = useSaleStore((state) => state.fetchSales);

  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) return { products: [], sales: [], users: [] };

    const query = searchQuery.toLowerCase().trim();
    const filteredProducts = products.filter(
      (p) =>
        (p.name?.toLowerCase() || '').includes(query) ||
        (p.type?.toLowerCase() || '').includes(query) ||
        (p.branch?.toLowerCase() || '').includes(query)
    );
    const filteredSales = sales.filter(
      (s) =>
        (s.productName?.toLowerCase() || '').includes(query) ||
        (s.sellerName?.toLowerCase() || '').includes(query) ||
        (s.branch?.toLowerCase() || '').includes(query) ||
        (typeof s.branch === 'object' && s.branch?.name?.toLowerCase() || '').includes(query) ||
        (typeof s.branch === 'object' && s.branch?.Name?.toLowerCase() || '').includes(query)
    );
    const filteredUsers = users.filter(
      (u) =>
        (u.name?.toLowerCase() || '').includes(query) ||
        (u.username?.toLowerCase() || '').includes(query) ||
        (u.branch?.toLowerCase() || '').includes(query)
    );

    return {
      products: filteredProducts,
      sales: filteredSales,
      users: filteredUsers,
    };
  }, [searchQuery, products, sales, users]);

  const totalResults =
    filteredResults.products.length + filteredResults.sales.length + filteredResults.users.length;

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
                  Search Results
                </Text>
                <Text variant="footnote" style={{ color: colors.mutedForeground, marginTop: 2 }}>
                  {totalResults} result{totalResults !== 1 ? 's' : ''} for "{searchQuery}"
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
                await Promise.all([
                  fetchUsers(),
                  fetchProducts(),
                  fetchSales(),
                ]);
              } catch (error) {
                console.error('Error refreshing data:', error);
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
          {totalResults === 0 ? (
            <View
              className="rounded-2xl px-5 py-12 items-center"
              style={{
                backgroundColor: colors.card,
              }}>
              <Icon name="magnifyingglass" size={48} color={colors.mutedForeground} />
              <Text variant="heading" className="mt-4" style={{ color: colors.mutedForeground }}>
                No results found
              </Text>
              <Text variant="footnote" color="tertiary" className="mt-2 text-center">
                Try a different search term
              </Text>
            </View>
          ) : (
            <>
              {/* Products Section */}
              {filteredResults.products.length > 0 && (
                <View className="mb-6">
                  <Text
                    variant="heading"
                    className="mb-4"
                    style={{ fontWeight: '500', fontSize: 17, letterSpacing: -0.3 }}>
                    Products ({filteredResults.products.length})
                  </Text>
                  <View className="gap-3">
                    {filteredResults.products.map((product: Product) => (
                      <Pressable
                        key={product.id}
                        onPress={() => {
                          router.push('/(tabs)/inventory');
                        }}
                        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
                        <View
                          className="rounded-2xl px-5 py-5"
                          style={{
                            backgroundColor: colors.card,
                            borderWidth: 0.5,
                            borderColor: withOpacity(colors.border, 0.2),
                          }}>
                          <View className="flex-row items-start gap-4">
                            {product.imageUri ? (
                              <Image
                                source={{ uri: product.imageUri }}
                                className="h-14 w-14 rounded-xl"
                                style={{ backgroundColor: colors.background }}
                              />
                            ) : (
                              <View
                                className="h-14 w-14 items-center justify-center rounded-xl"
                                style={{ backgroundColor: colors.background }}>
                                <Icon name="cube.fill" size={13.5 * 2} color={colors.primary} />
                              </View>
                            )}
                            <View className="flex-1 min-w-0">
                              <View className="flex-row items-start justify-between mb-2">
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
                                      <Text variant="subhead" color="tertiary" style={{ fontSize: 13 }}>
                                        {product.gasSize}
                                      </Text>
                                    </View>
                                  )}
                                </View>
                              </View>
                              <View className="flex-row items-center justify-between mt-2">
                                <View>
                                  <Text variant="footnote" color="tertiary" style={{ fontSize: 12, marginBottom: 2 }}>
                                    Quantity
                                  </Text>
                                  <Text variant="body" style={{ fontSize: 13, fontWeight: '500' }}>
                                    {product.quantity}
                                  </Text>
                                </View>
                                <View className="items-end">
                                  <Text variant="footnote" color="tertiary" style={{ fontSize: 12, marginBottom: 2 }}>
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
                </View>
              )}

              {/* Sales Section */}
              {filteredResults.sales.length > 0 && (
                <View className="mb-6">
                  <Text
                    variant="heading"
                    className="mb-4"
                    style={{ fontWeight: '500', fontSize: 17, letterSpacing: -0.3 }}>
                    Sales ({filteredResults.sales.length})
                  </Text>
                  <View className="gap-3">
                    {filteredResults.sales.map((sale: Sale) => (
                      <Pressable
                        key={sale.id}
                        onPress={() => {
                          router.push({ pathname: '/sale-details/[saleId]', params: { saleId: sale.id } });
                        }}
                        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
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
                              style={{ fontWeight: '500', fontSize: 14, marginBottom: 4 }}
                              numberOfLines={1}>
                              {sale.productName} {sale.gasSize !== 'none' && `(${sale.gasSize})`}
                            </Text>
                            <View className="flex-row items-center gap-2">
                              <View
                                className="h-1.5 w-1.5 rounded-full"
                                style={{ backgroundColor: colors.primary }}
                              />
                              <Text variant="footnote" color="tertiary" style={{ fontSize: 12, color: colors.primary }}>
                                {sale.seller?.name || 'Unknown'}
                              </Text>
                              <Text variant="footnote" color="tertiary" style={{ fontSize: 12 }}>
                                • {new Date(sale.createdAt).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })}
                              </Text>
                            </View>
                          </View>
                          <View className="items-end ml-2">
                            <Text
                              variant="footnote"
                              style={{ fontWeight: '500', color: colors.primary, fontSize: 13, marginBottom: 2 }}
                              numberOfLines={1}
                              adjustsFontSizeToFit>
                              {formatCurrency(sale.totalPrice, sale.currency)}
                            </Text>
                            <Icon name="chevron.right" size={14} color={colors.primary} style={{ opacity: 0.5 }} />
                          </View>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              {/* Users Section */}
              {filteredResults.users.length > 0 && (
                <View className="mb-6">
                  <Text
                    variant="heading"
                    className="mb-4"
                    style={{ fontWeight: '500', fontSize: 17, letterSpacing: -0.3 }}>
                    Users ({filteredResults.users.length})
                  </Text>
                  <View className="gap-3">
                    {filteredResults.users.map((user: User) => {
                      const userSales = getSalesByUser(user.id);
                      const userRevenue = userSales.reduce((sum, s) => sum + s.totalPrice, 0);
                      const userCurrency = userSales.length > 0 ? userSales[0].currency : 'UGX';
                      return (
                        <Pressable
                          key={user.id}
                          onPress={() => {
                            router.push({ pathname: '/(tabs)/user-sales', params: { userId: user.id, userName: user.name } });
                          }}
                          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
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
                                style={{ backgroundColor: colors.background }}>
                                <Text
                                  variant="heading"
                                  style={{
                                    color: colors.primary,
                                    fontSize: 24,
                                    fontWeight: '500',
                                    textAlign: 'center',
                                    includeFontPadding: false,
                                  }}>
                                  {user.name.charAt(0).toUpperCase()}
                                </Text>
                              </View>
                              <View className="flex-1 min-w-0">
                                <View className="flex-row items-start justify-between mb-2">
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
                                      {user.name}
                                    </Text>
                                    <View className="flex-row items-center gap-1.5 mb-3">
                                      <View
                                        className="h-1.5 w-1.5 rounded-full"
                                        style={{ backgroundColor: colors.primary }}
                                      />
                                      <Text variant="subhead" color="tertiary" style={{ fontSize: 13 }}>
                                        @{user.username} • {user.branch}
                                      </Text>
                                    </View>
                                  </View>
                                </View>
                                <View className="flex-row items-center justify-between mt-2">
                                  <View>
                                    <Text variant="footnote" color="tertiary" style={{ fontSize: 12, marginBottom: 2 }}>
                                      Role
                                    </Text>
                                    <Text variant="body" style={{ fontSize: 13, fontWeight: '500' }}>
                                      {user.role === 'super_admin' ? 'Super Admin' : 'User'}
                                    </Text>
                                  </View>
                                  <View className="items-end">
                                    <Text variant="footnote" color="tertiary" style={{ fontSize: 12, marginBottom: 2 }}>
                                      Revenue
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
                                      {formatCurrency(userRevenue, userCurrency)}
                                    </Text>
                                  </View>
                                </View>
                              </View>
                            </View>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
