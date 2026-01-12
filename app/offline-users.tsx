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
import { useUserStore } from '@/store/userStore';
import { User } from '@/types';

export default function OfflineUsersScreen() {
  const { colors, colorScheme } = useColorScheme();
  const [refreshing, setRefreshing] = useState(false);
  const allUsers = useUserStore((state) => state.users);
  const deleteUser = useUserStore((state) => state.deleteUser);
  const fetchUsers = useUserStore((state) => state.fetchUsers);
  const getSalesByUser = useSaleStore((state) => state.getSalesByUser);
  
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Get all users, filter only offline users, and sort by name
  const users = [...allUsers]
    .filter((user) => user.syncStatus === 'offline')
    .sort((a, b) => a.name.localeCompare(b.name));

  const getUserTotalSales = (userId: string) => {
    const sales = getSalesByUser(userId);
    return sales.reduce((sum, sale) => sum + sale.totalPrice, 0);
  };

  const getUserCurrency = (userId: string) => {
    const sales = getSalesByUser(userId);
    return sales.length > 0 ? sales[0].currency : 'UGX';
  };

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

  const handleUserPress = (user: User) => {
    setSelectedUser(user);
    setShowActionSheet(true);
  };

  const handleEdit = () => {
    if (selectedUser) {
      router.push(`/edit-user/${selectedUser.id}`);
      setShowActionSheet(false);
      setSelectedUser(null);
    }
  };

  const handleDelete = () => {
    if (selectedUser) {
      Alert.alert(
        'Delete User',
        `Are you sure you want to delete ${selectedUser.name}?`,
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
                await deleteUser(selectedUser.id);
                setShowActionSheet(false);
                setSelectedUser(null);
              } catch (error: any) {
                Alert.alert('Error', error.message || 'Failed to delete user');
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
                  Stored Users
                </Text>
                <Text variant="footnote" style={{ color: colors.mutedForeground, marginTop: 2 }}>
                  Offline users saved locally
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
                await fetchUsers();
              } catch (error) {
                console.error('Error refreshing users:', error);
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
          {users.length > 0 && (
            <View
              className="mb-6 rounded-2xl px-5 py-5"
              style={{
                backgroundColor: colors.card,
              }}>
              <View className="flex-row items-center justify-between">
                <View>
                  <Text variant="footnote" color="tertiary" style={{ marginBottom: 2 }}>
                    Total Users
                  </Text>
                  <Text variant="callout">
                    {users.length}
                  </Text>
                </View>
                <View
                  className="h-12 w-12 items-center justify-center rounded-xl"
                  style={{ backgroundColor: colors.background }}>
                  <Icon name="person.2.fill" size={22} color={colors.primary} />
                </View>
              </View>
            </View>
          )}

          {/* Users List */}
          {users.length === 0 ? (
            <View
              className="rounded-2xl px-5 py-12 items-center justify-center"
              style={{
                backgroundColor: colors.card,
              }}>
              <Icon name="person.2" size={40} color={colors.primary} style={{ opacity: 0.3, marginBottom: 12 }} />
              <Text variant="body" color="tertiary" style={{ marginBottom: 4 }}>
                No users found
              </Text>
              <Text variant="footnote" color="tertiary">
                No users stored locally
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {users.map((user) => {
                const totalSales = getUserTotalSales(user.id);
                const sales = getSalesByUser(user.id);
                const currency = getUserCurrency(user.id);

                return (
                  <Pressable
                    key={user.id}
                    onPress={() => handleUserPress(user)}
                    onLongPress={() => handleUserPress(user)}
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
                        <Icon name="person.fill" size={13.5 * 1.9} color={colors.primary} />
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
                          {user.name}
                        </Text>
                        {user.branch && (
                          <View className="flex-row items-center gap-1.5 mb-2">
                            <View
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: colors.primary }}
                            />
                            <Text
                              variant="subhead"
                              color="tertiary"
                              style={{ fontSize: 13 }}>
                              {user.branch}
                            </Text>
                          </View>
                        )}
                        <View className="flex-row items-center justify-between mt-2">
                          <View>
                            <Text
                              variant="footnote"
                              color="tertiary"
                              style={{ marginBottom: 2 }}>
                              Sales
                            </Text>
                            <Text variant="body">
                              {sales.length}
                            </Text>
                          </View>
                          <View className="items-end">
                            <Text
                              variant="footnote"
                              color="tertiary"
                              style={{ marginBottom: 2 }}>
                              Revenue
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
                              {formatCurrency(totalSales, currency)}
                            </Text>
                          </View>
                        </View>
                        <View className="mt-2">
                          <Text variant="footnote" color="tertiary">
                            {[
                              user.role === 'super_admin' ? 'Super Admin' : 'User',
                              user.username,
                              formatDate(user.createdAt)
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

      {/* User Action Sheet */}
      <BottomSheet
        visible={showActionSheet}
        onClose={() => {
          setShowActionSheet(false);
          setSelectedUser(null);
        }}
        title={selectedUser?.name}
        showIcons={true}
        options={[
          { label: 'View Details', value: 'view', icon: 'eye' },
          { label: 'Edit User', value: 'edit', icon: 'pencil' },
          { label: 'View Sales', value: 'view_sales', icon: 'chart.bar' },
          { label: 'Delete User', value: 'delete', icon: 'trash', destructive: true },
        ]}
        onSelect={(value) => {
          if (value === 'view' && selectedUser) {
            // Navigate to user details or show in a modal
            router.push({
              pathname: '/(tabs)/users',
              params: { userId: selectedUser.id },
            });
            setShowActionSheet(false);
            setSelectedUser(null);
          } else if (value === 'edit') {
            handleEdit();
          } else if (value === 'view_sales' && selectedUser) {
            router.push({
              pathname: '/(tabs)/user-sales',
              params: { userId: selectedUser.id, userName: selectedUser.name },
            });
            setShowActionSheet(false);
            setSelectedUser(null);
          } else if (value === 'delete') {
            handleDelete();
          }
        }}
      />
    </View>
  );
}
