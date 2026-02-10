import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, View, Pressable, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Button } from '@/components/nativewindui/Button';
import { BottomSheet } from '@/components/nativewindui/BottomSheet';
import { FAB } from '@/components/nativewindui/FAB';
import { Icon } from '@/components/nativewindui/Icon';
import { Text } from '@/components/nativewindui/Text';
import { useColorScheme } from '@/lib/useColorScheme';
import { getAuthToken } from '@/lib/api/config';
import { useAuthStore } from '@/store/authStore';
import { useBranchStore } from '@/store/branchStore';
import { useProductStore } from '@/store/productStore';
import { useSaleStore } from '@/store/saleStore';
import { useUserStore } from '@/store/userStore';

export default function SettingsScreen() {
  const { colors } = useColorScheme();
  const currentUser = useAuthStore((state) => state.currentUser);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const normalizedRole = currentUser?.role?.toLowerCase();
  const isSuperAdmin = normalizedRole === 'super_admin' || normalizedRole === 'superadmin';
  const [refreshing, setRefreshing] = useState(false);
  const logout = useAuthStore((state) => state.logout);
  const products = useProductStore((state) => state.products);
  const sales = useSaleStore((state) => state.sales);
  const users = useUserStore((state) => state.users);
  const branches = useBranchStore((state) => state.branches);
  
  const syncBranches = useBranchStore((state) => state.syncBranches);
  const syncUsers = useUserStore((state) => state.syncUsers);
  const syncProducts = useProductStore((state) => state.syncProducts);
  const syncSales = useSaleStore((state) => state.syncSales);
  
  const [storageSize, setStorageSize] = useState<string>('0 KB');
  const [isOffline, setIsOffline] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [showClearDataSheet, setShowClearDataSheet] = useState(false);
  const [showSyncSheet, setShowSyncSheet] = useState(false);
  const [syncDetails, setSyncDetails] = useState<{
    branches: number;
    users: number;
    products: number;
    sales: number;
  } | null>(null);

  useEffect(() => {
    calculateStorageSize();
    checkNetworkStatus();
  }, [products, sales, users]);

  const calculateStorageSize = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      let totalSize = 0;
      
      for (const key of keys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += value.length;
        }
      }
      
      // Convert to readable format
      if (totalSize < 1024) {
        setStorageSize(`${totalSize} B`);
      } else if (totalSize < 1024 * 1024) {
        setStorageSize(`${(totalSize / 1024).toFixed(2)} KB`);
      } else {
        setStorageSize(`${(totalSize / (1024 * 1024)).toFixed(2)} MB`);
      }
    } catch (error) {
      console.error('Error calculating storage size:', error);
    }
  };

  const checkNetworkStatus = () => {
    // For now, assume always offline since we're using local storage
    // In a real app, you'd check actual network connectivity
    setIsOffline(true);
  };

  const handleSyncToCloud = () => {
    // Count offline items
    const offlineBranches = branches.filter((b) => b.syncStatus === 'offline');
    const offlineUsers = users.filter((u) => u.syncStatus === 'offline');
    const offlineProducts = products.filter((p) => p.syncStatus === 'offline');
    const offlineSales = sales.filter((s) => s.syncStatus === 'offline');
    
    const totalOffline = offlineBranches.length + offlineUsers.length + offlineProducts.length + offlineSales.length;
    
    if (totalOffline === 0) {
      Alert.alert('No Data to Sync', 'All data is already synced to the cloud.');
      return;
    }

    // Set sync details and show bottom sheet
    setSyncDetails({
      branches: offlineBranches.length,
      users: offlineUsers.length,
      products: offlineProducts.length,
      sales: offlineSales.length,
    });
    setShowSyncSheet(true);
  };

  const handleConfirmSync = async () => {
    if (!syncDetails) return;
    
    // Check if user is authenticated
    if (!currentUser || !isAuthenticated) {
      Alert.alert('Authentication Required', 'Please log in to sync data to the cloud.');
      setShowSyncSheet(false);
      return;
    }
    
    // Verify token is still available before syncing
    const token = await getAuthToken();
    if (!token) {
      Alert.alert('Authentication Required', 'Your session has expired. Please log in again to sync data.');
      setShowSyncSheet(false);
      return;
    }
    
    setShowSyncSheet(false);
    setIsSyncing(true);
    const errors: string[] = [];
    
    try {
      // Step 1: Sync branches first (no dependencies)
      const offlineBranches = branches.filter((b) => b.syncStatus === 'offline');
      if (offlineBranches.length > 0) {
        try {
          await syncBranches();
          console.log('✅ Branches synced successfully');
        } catch (error: any) {
          const errorMsg = `Failed to sync branches: ${error.message || 'Unknown error'}`;
          errors.push(errorMsg);
          console.error('❌', errorMsg);
        }
      }

      // Step 2: Create branch name to ID mapping for users
      // Refresh branches from store to get newly synced ones
      const { branches: allBranches } = useBranchStore.getState();
      const branchIdMap = new Map<string, string>();
      allBranches.forEach((branch) => {
        if (branch.syncStatus === 'synced' && branch.name && branch.id) {
          branchIdMap.set(branch.name, branch.id);
        }
      });

      // Step 3: Sync users (depends on branches)
      const offlineUsers = users.filter((u) => u.syncStatus === 'offline');
      if (offlineUsers.length > 0) {
        try {
          await syncUsers(branchIdMap);
          console.log('✅ Users synced successfully');
        } catch (error: any) {
          const errorMsg = `Failed to sync users: ${error.message || 'Unknown error'}`;
          errors.push(errorMsg);
          console.error('❌', errorMsg);
        }
      }

      // Step 4: Sync products (depends on company, which is derived from branch)
      const offlineProducts = products.filter((p) => p.syncStatus === 'offline');
      if (offlineProducts.length > 0) {
        try {
          await syncProducts();
          console.log('✅ Products synced successfully');
        } catch (error: any) {
          const errorMsg = `Failed to sync products: ${error.message || 'Unknown error'}`;
          errors.push(errorMsg);
          console.error('❌', errorMsg);
        }
      }

      // Step 5: Create product ID mapping for sales
      // Refresh products from store to get newly synced ones
      const { products: allProducts } = useProductStore.getState();
      const productIdMap = new Map<string, string>();
      // Map old offline product IDs to new synced IDs
      // This handles the case where a sale references a product that was just synced
      allProducts.forEach((product) => {
        if (product.syncStatus === 'synced' && product.id) {
          // Store both string and number versions for lookup
          productIdMap.set(String(product.id), String(product.id));
        }
      });

      // Step 6: Sync sales last (depends on products and users)
      const offlineSales = sales.filter((s) => s.syncStatus === 'offline');
      if (offlineSales.length > 0) {
        try {
          await syncSales(productIdMap);
          console.log('✅ Sales synced successfully');
        } catch (error: any) {
          const errorMsg = `Failed to sync sales: ${error.message || 'Unknown error'}`;
          errors.push(errorMsg);
          console.error('❌', errorMsg);
        }
      }

      // Show results and create notification
      if (errors.length === 0) {
        Alert.alert('Success', 'All data has been synced to the cloud successfully.');
        
        // Create system notification for successful sync
        if (currentUser?.id) {
          try {
            const { notificationApi } = await import('@/lib/api/notificationApi');
            const totalSynced = 
              (offlineBranches.length > 0 ? 1 : 0) +
              (offlineUsers.length > 0 ? 1 : 0) +
              (offlineProducts.length > 0 ? 1 : 0) +
              (offlineSales.length > 0 ? 1 : 0);
            
            await notificationApi.createNotification({
              userId: typeof currentUser.id === 'string' ? parseInt(currentUser.id, 10) : currentUser.id,
              type: 'system',
              title: 'Cloud Sync Completed',
              message: `Successfully synced ${totalSynced} item(s) to the cloud. All data is now up to date.`,
            });
            
            // Refresh notifications
            const { useNotificationStore } = await import('@/store/notificationStore');
            useNotificationStore.getState().fetchNotifications();
          } catch (error) {
            console.error('Error creating sync notification:', error);
          }
        }
      } else {
        Alert.alert(
          'Partial Success',
          `Sync completed with ${errors.length} error(s):\n\n${errors.slice(0, 3).join('\n')}${errors.length > 3 ? `\n\n...and ${errors.length - 3} more` : ''}`,
          [{ text: 'OK' }]
        );
        
        // Create system notification for partial sync
        if (currentUser?.id) {
          try {
            const { notificationApi } = await import('@/lib/api/notificationApi');
            await notificationApi.createNotification({
              userId: typeof currentUser.id === 'string' ? parseInt(currentUser.id, 10) : currentUser.id,
              type: 'system',
              title: 'Cloud Sync Completed with Errors',
              message: `Sync completed with ${errors.length} error(s). Some data may not have been synced.`,
            });
            
            // Refresh notifications
            const { useNotificationStore } = await import('@/store/notificationStore');
            useNotificationStore.getState().fetchNotifications();
          } catch (error) {
            console.error('Error creating sync notification:', error);
          }
        }
      }
    } catch (error: any) {
      Alert.alert('Error', `Failed to sync: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearCache = () => {
    setShowClearDataSheet(true);
  };

  const handleConfirmClearCache = async () => {
    try {
      await AsyncStorage.clear();
      Alert.alert('Success', 'Local storage cleared. Please restart the app.');
    } catch (error) {
      Alert.alert('Error', 'Failed to clear storage');
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
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
              await new Promise((resolve) => setTimeout(resolve, 1000));
              setRefreshing(false);
            }}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.background}
          />
        }>
        <View className="px-5 pt-6">
          {/* Page Title */}
          <View className="mb-6">
            <Text
              variant="heading"
              style={{
                fontSize: 16,
                marginBottom: 4,
              }}>
              Offline Storage
            </Text>
            <Text variant="footnote" color="tertiary" style={{ fontSize: 12 }}>
              Manage locally stored data and sync options
            </Text>
          </View>

          {/* Offline Status */}
          <View
            className="mb-6 rounded-2xl px-5 py-5"
            style={{
              backgroundColor: colors.card,
            }}>
            <View className="flex-row items-center gap-4">
              <View
                className="h-14 w-14 items-center justify-center rounded-xl"
                style={{ backgroundColor: colors.background }}>
                <Icon 
                  name={isOffline ? "externaldrive.fill" : "wifi"} 
                  size={13.5 * 2} 
                  color={colors.primary} 
                />
              </View>
              <View className="flex-1">
                <Text variant="subhead" style={{ fontSize: 15, fontWeight: '500', marginBottom: 4 }}>
                  {isOffline ? 'Offline Mode' : 'Online Mode'}
                </Text>
                <Text variant="footnote" color="tertiary">
                  {isOffline 
                    ? 'All data is stored locally' 
                    : 'Connected to server'}
                </Text>
              </View>
              <View
                className="h-3 w-3 rounded-full"
                style={{ 
                  backgroundColor: isOffline ? '#FF6B6B' : '#4CAF50',
                }}
              />
            </View>
          </View>

          {/* Sync to Cloud */}
          <View
            className="mb-6 rounded-2xl px-5 py-5"
            style={{
              backgroundColor: colors.card,
            }}>
            <Text variant="callout" className="mb-4" style={{ fontWeight: '500' }}>
              Sync to Cloud
            </Text>
            
            <View className="gap-3">
              <Button
                onPress={handleSyncToCloud}
                variant="primary"
                className="w-full"
                loading={isSyncing}
                disabled={isSyncing}>
                <Icon name="cloud.fill" size={20} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontWeight: '500' }}>
                  {isSyncing ? 'Syncing...' : 'Sync All to Cloud'}
                </Text>
              </Button>
              
              <Text variant="footnote" color="tertiary" style={{ fontSize: 12, textAlign: 'center', marginTop: 4 }}>
                Syncs all offline data in the correct order: Branches → Users → Products → Sales
              </Text>
            </View>
          </View>

          {/* Local Storage Information */}
          <View
            className="mb-6 rounded-2xl px-5 py-5"
            style={{
              backgroundColor: colors.card,
            }}>
            <Text variant="callout" className="mb-4" style={{ fontWeight: '500' }}>
              Offline Data
            </Text>
            
            <View className="gap-3">
              <Pressable
                onPress={() => router.push('/offline-products')}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.7 : 1,
                })}>
                <View className="flex-row items-center justify-between py-2">
                  <View className="flex-row items-center gap-3">
                    <Icon name="shippingbox.fill" size={20} color={colors.primary} />
                    <Text variant="subhead">Products</Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <Text variant="body" style={{ fontWeight: '500' }}>
                      {products.filter((p) => p.syncStatus === 'offline').length}
                    </Text>
                    <Icon name="chevron.right" size={18} color={colors.mutedForeground} style={{ opacity: 0.5 }} />
                  </View>
                </View>
              </Pressable>
              
              <View className="h-px" style={{ backgroundColor: colors.border, opacity: 0.2 }} />
              
              <Pressable
                onPress={() => router.push('/offline-sales')}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.7 : 1,
                })}>
                <View className="flex-row items-center justify-between py-2">
                  <View className="flex-row items-center gap-3">
                    <Icon name="chart.bar.fill" size={20} color={colors.primary} />
                    <Text variant="subhead">Sales</Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <Text variant="body" style={{ fontWeight: '500' }}>
                      {sales.filter((s) => s.syncStatus === 'offline').length}
                    </Text>
                    <Icon name="chevron.right" size={18} color={colors.mutedForeground} style={{ opacity: 0.5 }} />
                  </View>
                </View>
              </Pressable>
              
              <View className="h-px" style={{ backgroundColor: colors.border, opacity: 0.2 }} />
              
              <Pressable
                onPress={() => router.push('/offline-users')}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.7 : 1,
                })}>
                <View className="flex-row items-center justify-between py-2">
                  <View className="flex-row items-center gap-3">
                    <Icon name="person.2.fill" size={20} color={colors.primary} />
                    <Text variant="subhead">Users</Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <Text variant="body" style={{ fontWeight: '500' }}>
                      {users.filter((u) => u.syncStatus === 'offline').length}
                    </Text>
                    <Icon name="chevron.right" size={18} color={colors.mutedForeground} style={{ opacity: 0.5 }} />
                  </View>
                </View>
              </Pressable>
              
              <View className="h-px" style={{ backgroundColor: colors.border, opacity: 0.2 }} />
              
              <Pressable
                onPress={() => router.push('/offline-branches')}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.7 : 1,
                })}>
                <View className="flex-row items-center justify-between py-2">
                  <View className="flex-row items-center gap-3">
                    <Icon name="building.2.fill" size={20} color={colors.primary} />
                    <Text variant="subhead">Branches</Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <Text variant="body" style={{ fontWeight: '500' }}>
                      {branches.filter((b) => b.syncStatus === 'offline').length}
                    </Text>
                    <Icon name="chevron.right" size={18} color={colors.mutedForeground} style={{ opacity: 0.5 }} />
                  </View>
                </View>
              </Pressable>
              
              <View className="h-px" style={{ backgroundColor: colors.border, opacity: 0.2 }} />
              
              <View className="flex-row items-center justify-between py-2">
                <View className="flex-row items-center gap-3">
                  <Icon name="externaldrive.fill" size={20} color={colors.primary} />
                  <Text variant="subhead">Storage Used</Text>
                </View>
                <Text variant="body" style={{ fontWeight: '500' }}>
                  {storageSize}
                </Text>
              </View>
            </View>
          </View>

          {/* Storage Actions */}
          <View
            className="mb-6 rounded-2xl px-5 py-5"
            style={{
              backgroundColor: colors.card,
            }}>
            <Text variant="callout" className="mb-4" style={{ fontWeight: '500' }}>
              Storage Actions
            </Text>
            
            <Pressable
              className="flex-row items-center justify-between py-3"
              onPress={handleClearCache}
              style={({ pressed }) => ({
                opacity: pressed ? 0.7 : 1,
              })}>
              <View className="flex-row items-center gap-3">
                <Icon name="trash.fill" size={24} color={colors.destructive} />
                <Text variant="subhead" style={{ color: colors.destructive }}>
                  Clear Local Storage
                </Text>
              </View>
              <Icon name="chevron.right" size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>

        </View>
      </ScrollView>

      {/* Sync to Cloud Confirmation Bottom Sheet */}
      <BottomSheet
        visible={showSyncSheet}
        onClose={() => {
          setShowSyncSheet(false);
          setSyncDetails(null);
        }}
        title={syncDetails 
          ? `Sync ${syncDetails.branches + syncDetails.users + syncDetails.products + syncDetails.sales} items to cloud?\n\n• ${syncDetails.branches} Branches\n• ${syncDetails.users} Users\n• ${syncDetails.products} Products\n• ${syncDetails.sales} Sales`
          : 'Sync to Cloud'}
        showIcons={true}
        options={[
          {
            label: 'Sync All to Cloud',
            value: 'sync',
            icon: 'cloud.fill',
          },
        ]}
        onSelect={(value) => {
          if (value === 'sync') {
            handleConfirmSync();
          }
        }}
      />

      {/* Clear Data Confirmation Bottom Sheet */}
      <BottomSheet
        visible={showClearDataSheet}
        onClose={() => setShowClearDataSheet(false)}
        title="Clear All Local Data?"
        showIcons={true}
        options={[
          {
            label: 'Yes, Clear All Data',
            value: 'clear',
            icon: 'trash.fill',
            destructive: true,
          },
        ]}
        onSelect={(value) => {
          if (value === 'clear') {
            handleConfirmClearCache();
            setShowClearDataSheet(false);
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
                  onPress: () => router.push('/(tabs)/inventory?openAddModal=true'),
                },
              ]
            : []),
        ].filter(Boolean)}
      />
    </View>
  );
}
