import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { BottomSheet } from '@/components/nativewindui/BottomSheet';
import { Icon } from '@/components/nativewindui/Icon';
import { Text } from '@/components/nativewindui/Text';
import { useColorScheme } from '@/lib/useColorScheme';
import { useBranchStore } from '@/store/branchStore';
import { Branch } from '@/types';

export default function OfflineBranchesScreen() {
  const { colors, colorScheme } = useColorScheme();
  const [refreshing, setRefreshing] = useState(false);
  const allBranches = useBranchStore((state) => state.branches);
  const deleteBranch = useBranchStore((state) => state.deleteBranch);
  const fetchBranches = useBranchStore((state) => state.fetchBranches);
  
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

  // Get all branches, filter only offline branches, and sort by name
  const branches = [...allBranches]
    .filter((branch) => branch.syncStatus === 'offline')
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

  const handleBranchPress = (branch: Branch) => {
    setSelectedBranch(branch);
    setShowActionSheet(true);
  };

  const handleEdit = () => {
    if (selectedBranch) {
      router.push(`/edit-branch/${selectedBranch.id}`);
      setShowActionSheet(false);
      setSelectedBranch(null);
    }
  };

  const handleDelete = () => {
    if (selectedBranch) {
      Alert.alert(
        'Delete Branch',
        `Are you sure you want to delete ${selectedBranch.name}?`,
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
                await deleteBranch(selectedBranch.id);
                setShowActionSheet(false);
                setSelectedBranch(null);
              } catch (error: any) {
                Alert.alert('Error', error.message || 'Failed to delete branch');
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
                  Stored Branches
                </Text>
                <Text variant="footnote" style={{ color: colors.mutedForeground, marginTop: 2 }}>
                  Offline branches saved locally
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
                await fetchBranches();
              } catch (error) {
                console.error('Error refreshing branches:', error);
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
          {branches.length > 0 && (
            <View
              className="mb-6 rounded-2xl px-5 py-5"
              style={{
                backgroundColor: colors.card,
              }}>
              <View className="flex-row items-center justify-between">
                <View>
                  <Text variant="footnote" color="tertiary" style={{ marginBottom: 2 }}>
                    Total Branches
                  </Text>
                  <Text variant="callout">
                    {branches.length}
                  </Text>
                </View>
                <View
                  className="h-12 w-12 items-center justify-center rounded-xl"
                  style={{ backgroundColor: colors.background }}>
                  <Icon name="building.2.fill" size={22} color={colors.primary} />
                </View>
              </View>
            </View>
          )}

          {/* Branches List */}
          {branches.length === 0 ? (
            <View
              className="rounded-2xl px-5 py-12 items-center justify-center"
              style={{
                backgroundColor: colors.card,
              }}>
              <Icon name="building.2" size={40} color={colors.primary} style={{ opacity: 0.3, marginBottom: 12 }} />
              <Text variant="body" color="tertiary" style={{ marginBottom: 4 }}>
                No branches found
              </Text>
              <Text variant="footnote" color="tertiary">
                No branches stored locally
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {branches.map((branch) => (
                <Pressable
                  key={branch.id}
                  onPress={() => handleBranchPress(branch)}
                  onLongPress={() => handleBranchPress(branch)}
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
                      <Icon name="building.2.fill" size={13.5 * 1.9} color={colors.primary} />
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
                        {branch.name}
                      </Text>
                      {branch.address && (
                        <View className="mb-2">
                          <Text
                            variant="subhead"
                            color="tertiary"
                            style={{ fontSize: 13 }}
                            numberOfLines={2}>
                            {branch.address}
                          </Text>
                        </View>
                      )}
                      <View className="mt-2">
                        <Text variant="footnote" color="tertiary">
                          {[
                            branch.phone,
                            formatDate(branch.createdAt)
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
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Branch Action Sheet */}
      <BottomSheet
        visible={showActionSheet}
        onClose={() => {
          setShowActionSheet(false);
          setSelectedBranch(null);
        }}
        title={selectedBranch?.name}
        showIcons={true}
        options={[
          { label: 'View Details', value: 'view', icon: 'eye' },
          { label: 'Edit Branch', value: 'edit', icon: 'pencil' },
          { label: 'Delete Branch', value: 'delete', icon: 'trash', destructive: true },
        ]}
        onSelect={(value) => {
          if (value === 'view' && selectedBranch) {
            router.push(`/branch-details/${selectedBranch.id}`);
            setShowActionSheet(false);
            setSelectedBranch(null);
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
