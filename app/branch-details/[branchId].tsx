import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { Icon } from '@/components/nativewindui/Icon';
import { Skeleton, SkeletonDetailHeader, SkeletonDetailSection, SkeletonList, SkeletonListItem } from '@/components/nativewindui/Skeleton';
import { Text } from '@/components/nativewindui/Text';
import { useColorScheme } from '@/lib/useColorScheme';
import { useBranchStore } from '@/store/branchStore';
import { useUserStore } from '@/store/userStore';
import { withOpacity } from '@/theme/with-opacity';
import { Branch } from '@/types';

export default function BranchDetailsScreen() {
  const { colors, colorScheme } = useColorScheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ branchId?: string }>();
  const getBranchById = useBranchStore((state) => state.getBranchById);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const users = useUserStore((state) => state.users);

  // Load branch data
  useEffect(() => {
    if (params.branchId) {
      const branchData = getBranchById(params.branchId);
      if (branchData) {
        setBranch(branchData);
      } else {
        setIsLoading(false);
      }
    }
  }, [params.branchId, getBranchById]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get users in this branch
  const branchUsers = branch
    ? users.filter((user) => {
        const userBranchId = user.branchId || (user as any).branchID;
        return userBranchId === branch.id || user.branch === branch.name;
      })
    : [];

  if (isLoading) {
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
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}>
          <View className="px-5 pt-6">
            <SkeletonDetailHeader />
            <View className="mt-6 gap-6">
              <SkeletonDetailSection />
              <SkeletonDetailSection />
              <View>
                <Skeleton width={120} height={16} style={{ marginBottom: 12 }} />
                <SkeletonList count={3} renderItem={() => <SkeletonListItem />} />
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (!branch) {
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
          <Icon name="building.2" size={48} color={colors.mutedForeground} style={{ opacity: 0.3, marginBottom: 16 }} />
          <Text variant="heading" style={{ marginBottom: 8 }}>
            Branch Not Found
          </Text>
          <Text variant="body" color="tertiary" style={{ textAlign: 'center', marginBottom: 24 }}>
            The branch you're looking for doesn't exist or has been deleted.
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={{
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 12,
              backgroundColor: colors.primary,
            }}>
            <Text style={{ color: '#FFFFFF', fontWeight: '500' }}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

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
                  Branch Details
                </Text>
                <Text variant="footnote" style={{ color: colors.mutedForeground, marginTop: 2 }}>
                  {branch.name}
                </Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="px-5 pt-6">
          {/* Branch Header Card */}
          <View
            className="mb-6 rounded-2xl px-5 py-5"
            style={{
              backgroundColor: colors.card,
              borderWidth: 0.5,
              borderColor: withOpacity(colors.border, 0.2),
            }}>
            <View className="flex-row items-start gap-4">
              <View
                className="h-16 w-16 items-center justify-center rounded-xl"
                style={{
                  backgroundColor: colors.background,
                }}>
                <Icon name="building.2.fill" size={13.5 * 2.5} color={colors.primary} />
              </View>
              <View className="flex-1 min-w-0">
                <Text
                  variant="heading"
                  style={{
                    fontWeight: '500',
                    fontSize: 18,
                    marginBottom: 8,
                    letterSpacing: -0.3,
                  }}
                  numberOfLines={2}>
                  {branch.name}
                </Text>
                {branch.syncStatus === 'offline' && (
                  <View className="flex-row items-center gap-2 mb-2">
                    <View
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: colors.primary }}
                    />
                    <Text variant="footnote" color="tertiary">
                      Stored Offline
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Branch Information */}
          <View
            className="mb-6 rounded-2xl px-5 py-5"
            style={{
              backgroundColor: colors.card,
              borderWidth: 0.5,
              borderColor: withOpacity(colors.border, 0.2),
            }}>
            <Text
              variant="subhead"
              style={{
                fontWeight: '500',
                marginBottom: 16,
                fontSize: 16,
              }}>
              Branch Information
            </Text>
            <View className="gap-4">
              {branch.address && (
                <View className="flex-row items-start justify-between">
                  <View className="flex-1">
                    <Text
                      variant="footnote"
                      color="tertiary"
                      style={{ fontSize: 13, fontWeight: '400', marginBottom: 4 }}>
                      Address
                    </Text>
                    <Text
                      variant="body"
                      style={{
                        fontSize: 15,
                        fontWeight: '400',
                      }}
                      numberOfLines={3}>
                      {branch.address}
                    </Text>
                  </View>
                </View>
              )}

              {branch.phone && (
                <View className="flex-row items-center justify-between py-1">
                  <Text
                    variant="footnote"
                    color="tertiary"
                    style={{ fontSize: 13, fontWeight: '400', letterSpacing: 0.1 }}>
                    Phone
                  </Text>
                  <Text
                    variant="body"
                    style={{
                      fontSize: 15,
                      fontWeight: '400'
                    }}>
                    {branch.phone}
                  </Text>
                </View>
              )}

              <View className="flex-row items-center justify-between py-1">
                <Text
                  variant="footnote"
                  color="tertiary"
                  style={{ fontSize: 13, fontWeight: '400', letterSpacing: 0.1 }}>
                  Created
                </Text>
                <Text
                  variant="body"
                  style={{
                    fontSize: 15,
                    fontWeight: '400'
                  }}>
                  {formatDate(branch.createdAt)}
                </Text>
              </View>

              <View className="flex-row items-center justify-between py-1">
                <Text
                  variant="footnote"
                  color="tertiary"
                  style={{ fontSize: 13, fontWeight: '400', letterSpacing: 0.1 }}>
                  Status
                </Text>
                <View className="flex-row items-center gap-2">
                  <View
                    className="h-2 w-2 rounded-full"
                    style={{
                      backgroundColor:
                        branch.syncStatus === 'offline'
                          ? '#FF9500'
                          : branch.syncStatus === 'synced'
                          ? '#34C759'
                          : colors.primary,
                    }}
                  />
                  <Text
                    variant="body"
                    style={{
                      fontSize: 15,
                      fontWeight: '400',
                      textTransform: 'capitalize',
                    }}>
                    {branch.syncStatus || 'online'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Users in Branch */}
          {branchUsers.length > 0 && (
            <View
              className="mb-6 rounded-2xl px-5 py-5"
              style={{
                backgroundColor: colors.card,
                borderWidth: 0.5,
                borderColor: withOpacity(colors.border, 0.2),
              }}>
              <View className="flex-row items-center justify-between mb-4">
                <Text
                  variant="subhead"
                  style={{
                    fontWeight: '500',
                    fontSize: 16,
                  }}>
                  Users in Branch
                </Text>
                <Text variant="footnote" color="tertiary">
                  {branchUsers.length} {branchUsers.length === 1 ? 'user' : 'users'}
                </Text>
              </View>
              <View className="gap-2">
                {branchUsers.slice(0, 5).map((user) => (
                  <View
                    key={user.id}
                    className="flex-row items-center gap-3 py-2">
                    <View
                      className="h-8 w-8 items-center justify-center rounded-full"
                      style={{ backgroundColor: colors.background }}>
                      <Icon name="person.fill" size={16} color={colors.primary} />
                    </View>
                    <View className="flex-1">
                      <Text variant="body" style={{ fontSize: 14, fontWeight: '500' }}>
                        {user.name}
                      </Text>
                      <Text variant="footnote" color="tertiary" style={{ fontSize: 12 }}>
                        {user.username} • {user.role === 'super_admin' ? 'Super Admin' : 'User'}
                      </Text>
                    </View>
                  </View>
                ))}
                {branchUsers.length > 5 && (
                  <Text variant="footnote" color="tertiary" style={{ marginTop: 4 }}>
                    +{branchUsers.length - 5} more users
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Actions */}
          {branch.syncStatus === 'offline' && (
            <View className="gap-3">
              <Pressable
                onPress={() => router.push(`/edit-branch/${branch.id}`)}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.7 : 1,
                })}>
                <View
                  className="flex-row items-center justify-center gap-2 rounded-xl px-5 py-4"
                  style={{ backgroundColor: colors.primary }}>
                  <Icon name="pencil" size={18} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontWeight: '500', fontSize: 16 }}>
                    Edit Branch
                  </Text>
                </View>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
