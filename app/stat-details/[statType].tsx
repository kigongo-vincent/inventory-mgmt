import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState, useEffect } from 'react';
import { RefreshControl, ScrollView, View, Pressable, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabHeader } from '@/components/TabHeader';
import { Icon } from '@/components/nativewindui/Icon';
import { Text } from '@/components/nativewindui/Text';
import { formatCurrency } from '@/lib/currency';
import { formatTime } from '@/lib/dateUtils';
import { useColorScheme } from '@/lib/useColorScheme';
import { useAuthStore } from '@/store/authStore';
import { useProductStore } from '@/store/productStore';
import { useSaleStore } from '@/store/saleStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useUserStore } from '@/store/userStore';
import { Sale } from '@/types';
import { withOpacity } from '@/theme/with-opacity';

type StatType = 'total-revenue' | 'total-sales' | 'today-revenue' | 'this-week' | 'this-month' | 'avg-sale' | 'total-products' | 'inventory-value' | 'low-stock' | 'out-of-stock';

export default function StatDetailsScreen() {
  const { colors } = useColorScheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ statType: StatType }>();
  const statType = params.statType as StatType;
  const [refreshing, setRefreshing] = useState(false);
  
  const currentUser = useAuthStore((state) => state.currentUser);
  const normalizedRole = currentUser?.role?.toLowerCase();
  const isSuperAdmin = normalizedRole === 'super_admin' || normalizedRole === 'superadmin';
  
  const allSales = useSaleStore((state) => state.getAllSales);
  const getSalesByUser = useSaleStore((state) => state.getSalesByUser);
  const getProductsByCompany = useProductStore((state) => state.getProductsByCompany);
  const allProducts = useProductStore((state) => state.products);
  const allUsers = useUserStore((state) => state.users);
  const fetchSales = useSaleStore((state) => state.fetchSales);
  const fetchProducts = useProductStore((state) => state.fetchProducts);
  const settings = useSettingsStore((state) => state.settings);
  
  // Filters
  const [filterProductType, setFilterProductType] = useState<string>('all');
  const [filterProvider, setFilterProvider] = useState<string>('all');
  const [filterSize, setFilterSize] = useState<string>('all');
  const [filterUser, setFilterUser] = useState<string>('all');
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [breakdownBy, setBreakdownBy] = useState<'productType' | 'provider' | 'size' | 'user' | 'branch'>('productType');
  
  // Get base data
  const userSales = currentUser ? getSalesByUser(currentUser.id) : [];
  const totalSales = isSuperAdmin ? allSales() : userSales;
  const companyProducts = currentUser?.companyId ? getProductsByCompany(currentUser.companyId) : [];
  const defaultCurrency = totalSales.length > 0 ? totalSales[0].currency : settings.defaultCurrency;
  
  // Date calculations
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() - today.getDay());
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(thisWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(thisWeekStart);
  lastWeekEnd.setDate(thisWeekStart.getDate() - 1);
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  
  // Filter sales based on stat type
  const filteredSales = useMemo(() => {
    let sales: Sale[] = [];
    
    switch (statType) {
      case 'total-revenue':
      case 'total-sales':
        sales = totalSales;
        break;
      case 'today-revenue':
        sales = totalSales.filter((sale) => {
          const saleDate = new Date(sale.createdAt);
          saleDate.setHours(0, 0, 0, 0);
          return saleDate.getTime() === today.getTime();
        });
        break;
      case 'this-week':
        sales = totalSales.filter((sale) => {
          const saleDate = new Date(sale.createdAt);
          return saleDate >= thisWeekStart;
        });
        break;
      case 'this-month':
        sales = totalSales.filter((sale) => {
          const saleDate = new Date(sale.createdAt);
          return saleDate >= thisMonthStart;
        });
        break;
      default:
        sales = totalSales;
    }
    
    // Apply filters
    if (filterProductType !== 'all') {
      sales = sales.filter((sale) => {
        const productType = sale.productAttributes?.type || sale.productName;
        return productType === filterProductType;
      });
    }
    
    if (filterProvider !== 'all') {
      sales = sales.filter((sale) => {
        const provider = sale.productAttributes?.provider;
        return provider === filterProvider;
      });
    }
    
    if (filterSize !== 'all') {
      sales = sales.filter((sale) => {
        const size = sale.productAttributes?.size || sale.productAttributes?.gasSize;
        return size === filterSize;
      });
    }
    
    if (filterUser !== 'all' && isSuperAdmin) {
      sales = sales.filter((sale) => sale.sellerId === filterUser);
    }
    
    if (filterBranch !== 'all' && isSuperAdmin) {
      sales = sales.filter((sale) => sale.branch === filterBranch);
    }
    
    return sales;
  }, [statType, totalSales, filterProductType, filterProvider, filterSize, filterUser, filterBranch, isSuperAdmin, today, thisWeekStart, thisMonthStart]);
  
  // Filter products based on stat type
  const filteredProducts = useMemo(() => {
    let products = companyProducts;
    
    switch (statType) {
      case 'low-stock':
        products = companyProducts.filter((p) => p.quantity > 0 && p.quantity < 10);
        break;
      case 'out-of-stock':
        products = companyProducts.filter((p) => p.quantity === 0);
        break;
      default:
        products = companyProducts;
    }
    
    // Apply filters
    if (filterProductType !== 'all') {
      products = products.filter((p) => {
        const productType = p.attributes?.type || p.name;
        return productType === filterProductType;
      });
    }
    
    if (filterProvider !== 'all') {
      products = products.filter((p) => {
        const provider = p.attributes?.provider;
        return provider === filterProvider;
      });
    }
    
    if (filterSize !== 'all') {
      products = products.filter((p) => {
        const size = p.attributes?.size;
        return size === filterSize;
      });
    }
    
    return products;
  }, [statType, companyProducts, filterProductType, filterProvider, filterSize]);
  
  // Calculate stats
  const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.totalPrice, 0);
  const totalSalesCount = filteredSales.length;
  const avgSaleValue = filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0;
  const totalInventoryValue = filteredProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
  
  // Get unique values for filters
  const productTypes = useMemo(() => {
    const types = new Set<string>();
    if (statType.includes('revenue') || statType.includes('sales') || statType === 'avg-sale') {
      filteredSales.forEach((sale) => {
        const type = sale.productAttributes?.type || sale.productName;
        if (type) types.add(type);
      });
    } else {
      filteredProducts.forEach((p) => {
        const type = p.attributes?.type || p.name;
        if (type) types.add(type);
      });
    }
    return Array.from(types).sort();
  }, [statType, filteredSales, filteredProducts]);
  
  const providers = useMemo(() => {
    const provs = new Set<string>();
    if (statType.includes('revenue') || statType.includes('sales') || statType === 'avg-sale') {
      filteredSales.forEach((sale) => {
        const provider = sale.productAttributes?.provider;
        if (provider) provs.add(provider);
      });
    } else {
      filteredProducts.forEach((p) => {
        const provider = p.attributes?.provider;
        if (provider) provs.add(provider);
      });
    }
    return Array.from(provs).sort();
  }, [statType, filteredSales, filteredProducts]);
  
  const sizes = useMemo(() => {
    const sizeSet = new Set<string>();
    if (statType.includes('revenue') || statType.includes('sales') || statType === 'avg-sale') {
      filteredSales.forEach((sale) => {
        const size = sale.productAttributes?.size || sale.productAttributes?.gasSize;
        if (size && size !== 'none') sizeSet.add(size);
      });
    } else {
      filteredProducts.forEach((p) => {
        const size = p.attributes?.size;
        if (size && size !== 'none') sizeSet.add(size);
      });
    }
    return Array.from(sizeSet).sort();
  }, [statType, filteredSales, filteredProducts]);
  
  const users = useMemo(() => {
    if (!isSuperAdmin) return [];
    return allUsers.filter((u) => u.role?.toLowerCase() !== 'super_admin' && u.role?.toLowerCase() !== 'superadmin');
  }, [isSuperAdmin, allUsers]);
  
  const branches = useMemo(() => {
    if (!isSuperAdmin) return [];
    const branchSet = new Set<string>();
    filteredSales.forEach((sale) => {
      if (sale.branch) branchSet.add(sale.branch);
    });
    return Array.from(branchSet).sort();
  }, [isSuperAdmin, filteredSales]);
  
  // Breakdown calculations
  const breakdownData = useMemo(() => {
    const data: Array<{ label: string; value: number; count: number; items?: any[] }> = [];
    
    if (statType.includes('revenue') || statType.includes('sales') || statType === 'avg-sale') {
      const grouped = new Map<string, { revenue: number; count: number; items: Sale[] }>();
      
      filteredSales.forEach((sale) => {
        let key = '';
        let label = '';
        
        switch (breakdownBy) {
          case 'productType':
            key = sale.productAttributes?.type || sale.productName || 'Unknown';
            label = key;
            break;
          case 'provider':
            key = sale.productAttributes?.provider || 'No Provider';
            label = key;
            break;
          case 'size':
            key = sale.productAttributes?.size || sale.productAttributes?.gasSize || 'No Size';
            label = key === 'No Size' ? 'No Size' : key;
            break;
          case 'user':
            if (!isSuperAdmin) return;
            const user = users.find((u) => u.id === sale.sellerId);
            key = user?.name || 'Unknown';
            label = key;
            break;
          case 'branch':
            if (!isSuperAdmin) return;
            key = sale.branch || 'Unknown';
            label = key;
            break;
        }
        
        const existing = grouped.get(key) || { revenue: 0, count: 0, items: [] };
        grouped.set(key, {
          revenue: existing.revenue + sale.totalPrice,
          count: existing.count + sale.quantity,
          items: [...existing.items, sale],
        });
      });
      
      grouped.forEach((value, key) => {
        data.push({
          label: key,
          value: value.revenue,
          count: value.count,
          items: value.items,
        });
      });
    } else {
      // For product stats
      const grouped = new Map<string, { value: number; count: number; items: any[] }>();
      
      filteredProducts.forEach((product) => {
        let key = '';
        let label = '';
        
        switch (breakdownBy) {
          case 'productType':
            key = product.attributes?.type || product.name || 'Unknown';
            label = key;
            break;
          case 'provider':
            key = product.attributes?.provider || 'No Provider';
            label = key;
            break;
          case 'size':
            key = product.attributes?.size || 'No Size';
            label = key === 'No Size' ? 'No Size' : key;
            break;
          default:
            return;
        }
        
        const existing = grouped.get(key) || { value: 0, count: 0, items: [] };
        const productValue = statType === 'inventory-value' ? product.price * product.quantity : 1;
        grouped.set(key, {
          value: existing.value + productValue,
          count: existing.count + 1,
          items: [...existing.items, product],
        });
      });
      
      grouped.forEach((value, key) => {
        data.push({
          label: key,
          value: value.value,
          count: value.count,
          items: value.items,
        });
      });
    }
    
    return data.sort((a, b) => b.value - a.value);
  }, [statType, filteredSales, filteredProducts, breakdownBy, isSuperAdmin, users]);
  
  const getStatTitle = () => {
    switch (statType) {
      case 'total-revenue':
        return 'Total Revenue';
      case 'total-sales':
        return 'Total Sales';
      case 'today-revenue':
        return "Today's Revenue";
      case 'this-week':
        return 'This Week';
      case 'this-month':
        return 'This Month';
      case 'avg-sale':
        return 'Average Sale Value';
      case 'total-products':
        return 'Total Products';
      case 'inventory-value':
        return 'Inventory Value';
      case 'low-stock':
        return 'Low Stock';
      case 'out-of-stock':
        return 'Out of Stock';
      default:
        return 'Stat Details';
    }
  };
  
  const getStatValue = () => {
    switch (statType) {
      case 'total-revenue':
      case 'today-revenue':
      case 'this-week':
      case 'this-month':
        return formatCurrency(totalRevenue, defaultCurrency);
      case 'total-sales':
        return totalSalesCount.toString();
      case 'avg-sale':
        return formatCurrency(avgSaleValue, defaultCurrency);
      case 'total-products':
      case 'low-stock':
      case 'out-of-stock':
        return filteredProducts.length.toString();
      case 'inventory-value':
        return formatCurrency(totalInventoryValue, defaultCurrency);
      default:
        return '0';
    }
  };
  
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchSales(),
        fetchProducts(),
      ]);
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  };
  
  const isSalesStat = statType.includes('revenue') || statType.includes('sales') || statType === 'avg-sale';
  const isProductStat = statType.includes('product') || statType === 'inventory-value' || statType === 'low-stock' || statType === 'out-of-stock';
  
  // Ensure breakdownBy is valid for current stat type
  useEffect(() => {
    if (isProductStat && (breakdownBy === 'user' || breakdownBy === 'branch')) {
      setBreakdownBy('productType');
    }
  }, [statType, breakdownBy, isProductStat]);
  
  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <TabHeader />
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24, paddingTop: 8 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.background}
          />
        }>
        <View className="px-5 pt-6">
          {/* Header */}
          <View className="mb-6 flex-row items-center justify-between">
            <View className="flex-1">
              <Pressable
                onPress={() => router.back()}
                className="mb-2">
                <View className="flex-row items-center gap-2">
                  <Icon name="chevron.left" size={20} color={colors.foreground} />
                  <Text variant="subhead" style={{ fontSize: 14 }}>
                    Back
                  </Text>
                </View>
              </Pressable>
              <Text variant="heading" style={{ fontSize: 20, marginBottom: 4 }}>
                {getStatTitle()}
              </Text>
              <Text variant="heading" style={{ color: colors.primary, fontSize: 24 }}>
                {getStatValue()}
              </Text>
            </View>
          </View>
          
          {/* Filters */}
          <View className="mb-6 gap-4">
            {/* Breakdown By */}
            <View>
              <Text variant="subhead" className="mb-2">
                Breakdown By
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 20 }}>
                <View className="flex-row gap-2">
                  {(() => {
                    const options = [{ label: 'Product Type', value: 'productType' }];
                    if (isSalesStat) {
                      options.push(
                        { label: 'Provider', value: 'provider' },
                        { label: 'Size', value: 'size' }
                      );
                      if (isSuperAdmin) {
                        options.push(
                          { label: 'User', value: 'user' },
                          { label: 'Branch', value: 'branch' }
                        );
                      }
                    } else {
                      options.push(
                        { label: 'Provider', value: 'provider' },
                        { label: 'Size', value: 'size' }
                      );
                    }
                    return options.map((option) => {
                      const isSelected = breakdownBy === option.value;
                      const isValid = !(isProductStat && (option.value === 'user' || option.value === 'branch'));
                      return (
                        <Pressable
                          key={option.value}
                          onPress={() => {
                            if (isValid) {
                              setBreakdownBy(option.value as any);
                            }
                          }}
                          disabled={!isValid}
                          style={({ pressed }) => ({
                            opacity: pressed ? 0.7 : isValid ? 1 : 0.5,
                          })}>
                          <View
                            className="px-4 py-2.5 rounded-full"
                            style={{
                              backgroundColor: isSelected ? colors.primary : colors.card,
                            }}>
                            <Text
                              style={{
                                fontSize: 14,
                                color: isSelected ? '#FFFFFF' : colors.foreground,
                                fontWeight: isSelected ? '600' : '400',
                              }}>
                              {option.label}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    });
                  })()}
                </View>
              </ScrollView>
            </View>
            
            {/* Product Type Filter */}
            {productTypes.length > 0 && (
              <View>
                <Text variant="subhead" className="mb-2">
                  Product Type
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingRight: 20 }}>
                  <View className="flex-row gap-2">
                    {[
                      { label: 'All Types', value: 'all' },
                      ...productTypes.map((type) => ({ label: type, value: type })),
                    ].map((option) => {
                      const isSelected = filterProductType === option.value;
                      return (
                        <Pressable
                          key={option.value}
                          onPress={() => setFilterProductType(option.value)}
                          style={({ pressed }) => ({
                            opacity: pressed ? 0.7 : 1,
                          })}>
                          <View
                            className="px-4 py-2.5 rounded-full"
                            style={{
                              backgroundColor: isSelected ? colors.primary : colors.card,
                            }}>
                            <Text
                              style={{
                                fontSize: 14,
                                color: isSelected ? '#FFFFFF' : colors.foreground,
                                fontWeight: isSelected ? '600' : '400',
                              }}>
                              {option.label}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            )}
            
            {/* Provider Filter */}
            {providers.length > 0 && (
              <View>
                <Text variant="subhead" className="mb-2">
                  Provider
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingRight: 20 }}>
                  <View className="flex-row gap-2">
                    {[
                      { label: 'All Providers', value: 'all' },
                      ...providers.map((prov) => ({ label: prov, value: prov })),
                    ].map((option) => {
                      const isSelected = filterProvider === option.value;
                      return (
                        <Pressable
                          key={option.value}
                          onPress={() => setFilterProvider(option.value)}
                          style={({ pressed }) => ({
                            opacity: pressed ? 0.7 : 1,
                          })}>
                          <View
                            className="px-4 py-2.5 rounded-full"
                            style={{
                              backgroundColor: isSelected ? colors.primary : colors.card,
                            }}>
                            <Text
                              style={{
                                fontSize: 14,
                                color: isSelected ? '#FFFFFF' : colors.foreground,
                                fontWeight: isSelected ? '600' : '400',
                              }}>
                              {option.label}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            )}
            
            {/* Size Filter */}
            {sizes.length > 0 && (
              <View>
                <Text variant="subhead" className="mb-2">
                  Size
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingRight: 20 }}>
                  <View className="flex-row gap-2">
                    {[
                      { label: 'All Sizes', value: 'all' },
                      ...sizes.map((size) => ({ 
                        label: size === '2 plates' ? '2 Plates' : size === '3 plates' ? '3 Plates' : size, 
                        value: size 
                      })),
                    ].map((option) => {
                      const isSelected = filterSize === option.value;
                      return (
                        <Pressable
                          key={option.value}
                          onPress={() => setFilterSize(option.value)}
                          style={({ pressed }) => ({
                            opacity: pressed ? 0.7 : 1,
                          })}>
                          <View
                            className="px-4 py-2.5 rounded-full"
                            style={{
                              backgroundColor: isSelected ? colors.primary : colors.card,
                            }}>
                            <Text
                              style={{
                                fontSize: 14,
                                color: isSelected ? '#FFFFFF' : colors.foreground,
                                fontWeight: isSelected ? '600' : '400',
                              }}>
                              {option.label}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            )}
            
            {/* User Filter (Super Admin only) */}
            {isSalesStat && isSuperAdmin && users.length > 0 && (
              <View>
                <Text variant="subhead" className="mb-2">
                  User
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingRight: 20 }}>
                  <View className="flex-row gap-2">
                    {[
                      { label: 'All Users', value: 'all' },
                      ...users.map((user) => ({ label: user.name, value: user.id })),
                    ].map((option) => {
                      const isSelected = filterUser === option.value;
                      return (
                        <Pressable
                          key={option.value}
                          onPress={() => setFilterUser(option.value)}
                          style={({ pressed }) => ({
                            opacity: pressed ? 0.7 : 1,
                          })}>
                          <View
                            className="px-4 py-2.5 rounded-full"
                            style={{
                              backgroundColor: isSelected ? colors.primary : colors.card,
                            }}>
                            <Text
                              style={{
                                fontSize: 14,
                                color: isSelected ? '#FFFFFF' : colors.foreground,
                                fontWeight: isSelected ? '600' : '400',
                              }}>
                              {option.label}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            )}
            
            {/* Branch Filter (Super Admin only) */}
            {isSalesStat && isSuperAdmin && branches.length > 0 && (
              <View>
                <Text variant="subhead" className="mb-2">
                  Branch
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingRight: 20 }}>
                  <View className="flex-row gap-2">
                    {[
                      { label: 'All Branches', value: 'all' },
                      ...branches.map((branch) => ({ label: branch, value: branch })),
                    ].map((option) => {
                      const isSelected = filterBranch === option.value;
                      return (
                        <Pressable
                          key={option.value}
                          onPress={() => setFilterBranch(option.value)}
                          style={({ pressed }) => ({
                            opacity: pressed ? 0.7 : 1,
                          })}>
                          <View
                            className="px-4 py-2.5 rounded-full"
                            style={{
                              backgroundColor: isSelected ? colors.primary : colors.card,
                            }}>
                            <Text
                              style={{
                                fontSize: 14,
                                color: isSelected ? '#FFFFFF' : colors.foreground,
                                fontWeight: isSelected ? '600' : '400',
                              }}>
                              {option.label}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            )}
          </View>
          
          {/* Breakdown Summary */}
          <View className="mb-6">
            <Text variant="subhead" className="mb-4" style={{ fontSize: 13, color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Breakdown Summary
            </Text>
            {breakdownData.length === 0 ? (
              <View
                className="rounded-2xl px-5 py-12 items-center justify-center"
                style={{ backgroundColor: colors.card }}>
                <Icon name="chart.bar.fill" size={40} color={colors.primary} style={{ opacity: 0.3, marginBottom: 12 }} />
                <Text variant="subhead" color="tertiary" style={{ fontSize: 16 }}>
                  No breakdown data available
                </Text>
              </View>
            ) : (
              <View className="gap-4">
                {Array.from({ length: Math.ceil(breakdownData.length / 2) }).map((_, rowIndex) => (
                  <View key={rowIndex} className="flex-row gap-4">
                    {breakdownData.slice(rowIndex * 2, rowIndex * 2 + 2).map((item, cardIndex) => (
                      <TouchableOpacity
                        key={`${item.label}-${rowIndex}-${cardIndex}`}
                        onPress={() => {
                          // Could navigate to filtered view or show details
                        }}
                        className="flex-1 rounded-2xl px-5 py-5"
                        style={{
                          backgroundColor: colors.card,
                        }}>
                        <View className="flex-row items-start justify-between mb-3">
                          <View className="flex-1 pr-2">
                            <Text
                              variant="heading"
                              style={{ color: colors.primary, fontSize: 17 }}
                              numberOfLines={1}
                              adjustsFontSizeToFit>
                              {isSalesStat || statType === 'inventory-value'
                                ? formatCurrency(item.value, defaultCurrency)
                                : item.value}
                            </Text>
                          </View>
                          <View
                            className="h-11 w-11 items-center justify-center rounded-xl"
                            style={{ backgroundColor: colors.background }}>
                            <Icon name="chart.bar.fill" size={22} color={colors.primary} />
                          </View>
                        </View>
                        <Text variant="footnote" color="tertiary" style={{ fontSize: 13 }}>
                          {item.label}
                        </Text>
                        {isSalesStat && (
                          <Text variant="footnote" color="tertiary" style={{ fontSize: 11, marginTop: 2 }}>
                            {item.count} items • {item.items?.length || 0} sales
                          </Text>
                        )}
                        {!isSalesStat && (
                          <Text variant="footnote" color="tertiary" style={{ fontSize: 11, marginTop: 2 }}>
                            {item.count} products
                          </Text>
                        )}
                      </TouchableOpacity>
                    ))}
                    {/* Fill empty space if odd number of items */}
                    {breakdownData.slice(rowIndex * 2, rowIndex * 2 + 2).length === 1 && (
                      <View className="flex-1" />
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
          
          {/* Detailed List */}
          <View className="mb-6">
            <Text variant="subhead" className="mb-4" style={{ fontSize: 13, color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {isSalesStat ? 'Sales Details' : 'Product Details'}
            </Text>
            <View className="gap-3">
              {isSalesStat ? (
                filteredSales.length === 0 ? (
                  <View
                    className="rounded-2xl px-5 py-12 items-center justify-center"
                    style={{ backgroundColor: colors.card }}>
                    <Icon name="doc.text.fill" size={40} color={colors.primary} style={{ opacity: 0.3, marginBottom: 12 }} />
                    <Text variant="subhead" color="tertiary" style={{ fontSize: 16 }}>
                      No sales found
                    </Text>
                  </View>
                ) : (
                  filteredSales.slice(0, 20).map((sale) => (
                    <Pressable
                      key={sale.id}
                      onPress={() => router.push(`/sale-details/${sale.id}`)}>
                      <View
                        className="rounded-2xl px-5 py-4"
                        style={{
                          backgroundColor: colors.card,
                          borderWidth: 0.5,
                          borderColor: withOpacity(colors.border, 0.2),
                        }}>
                        <View className="flex-row items-start justify-between mb-2">
                          <View className="flex-1 pr-2">
                            <Text
                              variant="subhead"
                              style={{ fontSize: 14, fontWeight: '500', marginBottom: 2 }}
                              numberOfLines={1}>
                              {sale.productName}
                              {sale.productAttributes?.size && sale.productAttributes.size !== 'none' && (
                                ` (${sale.productAttributes.size})`
                              )}
                              {sale.productAttributes?.provider && (
                                sale.productAttributes.type === 'Full Gas Cylinder' || 
                                sale.productAttributes.type === 'Regulator' || 
                                sale.productAttributes.type === 'New Kit'
                                  ? ` [${sale.productAttributes.provider}]`
                                  : ''
                              )}
                            </Text>
                            <Text variant="footnote" color="tertiary" style={{ fontSize: 12 }}>
                              {formatTime(sale.createdAt)}
                            </Text>
                          </View>
                          <Text
                            variant="subhead"
                            style={{ color: colors.primary, fontSize: 14, fontWeight: '600' }}>
                            {formatCurrency(sale.totalPrice, sale.currency)}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  ))
                )
              ) : (
                filteredProducts.length === 0 ? (
                  <View
                    className="rounded-2xl px-5 py-12 items-center justify-center"
                    style={{ backgroundColor: colors.card }}>
                    <Icon name="shippingbox.fill" size={40} color={colors.primary} style={{ opacity: 0.3, marginBottom: 12 }} />
                    <Text variant="subhead" color="tertiary" style={{ fontSize: 16 }}>
                      No products found
                    </Text>
                  </View>
                ) : (
                  filteredProducts.slice(0, 20).map((product) => (
                    <Pressable
                      key={product.id}
                      onPress={() => {
                        if (isSuperAdmin) {
                          router.push(`/edit-product/${product.id}`);
                        }
                      }}>
                      <View
                        className="rounded-2xl px-5 py-4"
                        style={{
                          backgroundColor: colors.card,
                          borderWidth: 0.5,
                          borderColor: withOpacity(colors.border, 0.2),
                        }}>
                        <View className="flex-row items-start justify-between mb-2">
                          <View className="flex-1 pr-2">
                            <Text
                              variant="subhead"
                              style={{ fontSize: 14, fontWeight: '500', marginBottom: 2 }}
                              numberOfLines={1}>
                              {product.name}
                            </Text>
                            <View className="flex-row items-center gap-2 flex-wrap">
                              {product.attributes?.category && (
                                <Text variant="footnote" color="tertiary" style={{ fontSize: 11 }}>
                                  {product.attributes.category}
                                </Text>
                              )}
                              {product.attributes?.provider && (
                                <Text variant="footnote" color="tertiary" style={{ fontSize: 11 }}>
                                  {product.attributes.provider}
                                </Text>
                              )}
                              {product.attributes?.size && product.attributes.size !== 'none' && (
                                <Text variant="footnote" color="tertiary" style={{ fontSize: 11 }}>
                                  {product.attributes.size}
                                </Text>
                              )}
                            </View>
                          </View>
                          <View className="items-end">
                            <Text
                              variant="subhead"
                              style={{ color: colors.primary, fontSize: 14, fontWeight: '600' }}>
                              {statType === 'inventory-value'
                                ? formatCurrency(product.price * product.quantity, product.currency)
                                : `Qty: ${product.quantity}`}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </Pressable>
                  ))
                )
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
