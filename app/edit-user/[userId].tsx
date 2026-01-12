import { useLocalSearchParams, router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Alert, View, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { ActivityIndicator } from '@/components/nativewindui/ActivityIndicator';
import { Button } from '@/components/nativewindui/Button';
import { Icon } from '@/components/nativewindui/Icon';
import { Input } from '@/components/nativewindui/Input';
import { SegmentedPicker } from '@/components/nativewindui/SegmentedPicker';
import { Text } from '@/components/nativewindui/Text';
import { useColorScheme } from '@/lib/useColorScheme';
import { useAuthStore } from '@/store/authStore';
import { useBranchStore } from '@/store/branchStore';
import { useUserStore } from '@/store/userStore';
import { withOpacity } from '@/theme/with-opacity';

export default function EditUserScreen() {
  const { colors, baseFontSize: rawBaseFontSize, colorScheme } = useColorScheme();
  const baseFontSize = rawBaseFontSize || 1.0;
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ userId?: string }>();
  const currentUser = useAuthStore((state) => state.currentUser);
  const getUserById = useUserStore((state) => state.getUserById);
  const updateUser = useUserStore((state) => state.updateUser);
  const isLoadingUsers = useUserStore((state) => state.isLoading);
  const branches = useBranchStore((state) => state.branches);
  const [isProcessing, setIsProcessing] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Load user data
  useEffect(() => {
    if (params.userId) {
      const userData = getUserById(params.userId);
      if (userData) {
        setUser(userData);
        setName(userData.name || '');
        setUsername(userData.username || '');
        setPhone(userData.phone || '');
        setEmail(userData.email || '');
        setRole(userData.role || 'user');
        setBranch(userData.branch || '');
      } else {
        Alert.alert('Error', 'User not found', [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]);
      }
    }
  }, [params.userId, getUserById]);

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'super_admin' | 'user'>('user');
  const [branch, setBranch] = useState('');

  // Get branch names for picker
  const allBranches = branches.map((b) => b.name).filter(Boolean);

  if (!user) {
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
            Loading user...
          </Text>
        </View>
      </View>
    );
  }

  const handleUpdateUser = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter name');
      return;
    }

    if (!username.trim()) {
      Alert.alert('Error', 'Please enter username');
      return;
    }

    setIsProcessing(true);
    try {
      // Find branch ID from branch name
      const selectedBranchObj = branches.find((b) => b.name === branch);
      const branchId = selectedBranchObj?.id;

      await updateUser(user.id, {
        name: name.trim(),
        username: username.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        role: role,
        branch: branch || undefined,
        branchId: branchId ? (typeof branchId === 'string' ? parseInt(branchId, 10) : branchId) : undefined,
      });

      Alert.alert('Success', 'User updated successfully', [
        {
          text: 'OK',
          onPress: () => {
            router.back();
          },
        },
      ]);
    } catch (error: any) {
      console.error('Error updating user:', error);
      Alert.alert('Error', error?.message || 'Failed to update user. Please try again.');
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
                  Edit User
                </Text>
                <Text variant="footnote" style={{ color: colors.mutedForeground, marginTop: 2 }}>
                  Update user information
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
              {/* User Info Card */}
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
                    <Icon name="person.fill" size={13.5 * 2} color={colors.primary} />
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
                      {user.name}
                    </Text>
                    <Text variant="footnote" color="tertiary">
                      {user.username} • {user.role === 'super_admin' ? 'Super Admin' : 'User'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Form Fields */}
              <View className="gap-4">
                <View>
                  <Text variant="subhead" className="mb-2">
                    Name
                  </Text>
                  <Input
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter full name"
                    autoCapitalize="words"
                  />
                </View>

                <View>
                  <Text variant="subhead" className="mb-2">
                    Username
                  </Text>
                  <Input
                    value={username}
                    onChangeText={setUsername}
                    placeholder="Enter username"
                    autoCapitalize="none"
                    autoCorrect={false}
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

                <View>
                  <Text variant="subhead" className="mb-2">
                    Email
                  </Text>
                  <Input
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Enter email address"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View>
                  <Text variant="subhead" className="mb-2">
                    Role
                  </Text>
                  <SegmentedPicker
                    options={[
                      { label: 'User', value: 'user' },
                      { label: 'Super Admin', value: 'super_admin' },
                    ]}
                    selectedValue={role}
                    onValueChange={(value) => setRole(value as 'super_admin' | 'user')}
                  />
                </View>

                <View>
                  <Text variant="subhead" className="mb-2">
                    Branch
                  </Text>
                  <SegmentedPicker
                    options={allBranches.length > 0 ? allBranches.map((b) => ({
                      label: b,
                      value: b,
                    })) : [{ label: branch || 'Main Branch', value: branch || 'Main Branch' }]}
                    selectedValue={branch}
                    onValueChange={(value) => setBranch(value)}
                  />
                </View>
              </View>

              {/* Update Button */}
              <Button
                onPress={handleUpdateUser}
                className="mt-4"
                loading={isProcessing || isLoadingUsers}
                disabled={isProcessing || isLoadingUsers}>
                <Text>Update User</Text>
              </Button>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
