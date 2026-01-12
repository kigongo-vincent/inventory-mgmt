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
import { useColorScheme } from '@/lib/useColorScheme';
import { useBranchStore } from '@/store/branchStore';
import { withOpacity } from '@/theme/with-opacity';

export default function EditBranchScreen() {
  const { colors, baseFontSize: rawBaseFontSize, colorScheme } = useColorScheme();
  const baseFontSize = rawBaseFontSize || 1.0;
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ branchId?: string }>();
  const getBranchById = useBranchStore((state) => state.getBranchById);
  const updateBranch = useBranchStore((state) => state.updateBranch);
  const isLoadingBranches = useBranchStore((state) => state.isLoading);
  const [isProcessing, setIsProcessing] = useState(false);
  const [branch, setBranch] = useState<any>(null);

  // Load branch data
  useEffect(() => {
    if (params.branchId) {
      const branchData = getBranchById(params.branchId);
      if (branchData) {
        setBranch(branchData);
        setName(branchData.name || '');
        setAddress(branchData.address || '');
        setPhone(branchData.phone || '');
      } else {
        Alert.alert('Error', 'Branch not found', [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]);
      }
    }
  }, [params.branchId, getBranchById]);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');

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
          <ActivityIndicator size="large" />
          <Text variant="body" color="tertiary" style={{ marginTop: 16 }}>
            Loading branch...
          </Text>
        </View>
      </View>
    );
  }

  const handleUpdateBranch = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter branch name');
      return;
    }

    setIsProcessing(true);
    try {
      await updateBranch(branch.id, {
        name: name.trim(),
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
      });

      Alert.alert('Success', 'Branch updated successfully', [
        {
          text: 'OK',
          onPress: () => {
            router.back();
          },
        },
      ]);
    } catch (error: any) {
      console.error('Error updating branch:', error);
      Alert.alert('Error', error?.message || 'Failed to update branch. Please try again.');
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
                  Edit Branch
                </Text>
                <Text variant="footnote" style={{ color: colors.mutedForeground, marginTop: 2 }}>
                  Update branch information
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
              {/* Branch Info Card */}
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
                    <Icon name="building.2.fill" size={13.5 * 2} color={colors.primary} />
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
                      {branch.name}
                    </Text>
                    {branch.address && (
                      <Text variant="footnote" color="tertiary" numberOfLines={2}>
                        {branch.address}
                      </Text>
                    )}
                  </View>
                </View>
              </View>

              {/* Form Fields */}
              <View className="gap-4">
                <View>
                  <Text variant="subhead" className="mb-2">
                    Branch Name
                  </Text>
                  <Input
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter branch name"
                    autoCapitalize="words"
                  />
                </View>

                <View>
                  <Text variant="subhead" className="mb-2">
                    Address
                  </Text>
                  <Input
                    value={address}
                    onChangeText={setAddress}
                    placeholder="Enter branch address"
                    autoCapitalize="words"
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View>
                  <Text variant="subhead" className="mb-2">
                    Phone Number
                  </Text>
                  <Input
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="Enter phone number"
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              {/* Update Button */}
              <Button
                onPress={handleUpdateBranch}
                className="mt-4"
                loading={isProcessing || isLoadingBranches}
                disabled={isProcessing || isLoadingBranches}>
                <Text>Update Branch</Text>
              </Button>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
