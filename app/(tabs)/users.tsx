import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Share, View } from 'react-native';

import { BottomSheet } from '@/components/nativewindui/BottomSheet';
import { Button } from '@/components/nativewindui/Button';
import { FAB } from '@/components/nativewindui/FAB';
import { Icon } from '@/components/nativewindui/Icon';
import { Input } from '@/components/nativewindui/Input';
import { Modal } from '@/components/nativewindui/Modal';
import { Skeleton, SkeletonList, SkeletonListItem } from '@/components/nativewindui/Skeleton';
import { SegmentedPicker } from '@/components/nativewindui/SegmentedPicker';
import { Text } from '@/components/nativewindui/Text';
import { formatCurrency } from '@/lib/currency';
import { useColorScheme } from '@/lib/useColorScheme';
import { useAuthStore } from '@/store/authStore';
import { useBranchStore } from '@/store/branchStore';
import { useSaleStore } from '@/store/saleStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useUserStore } from '@/store/userStore';
import { withOpacity } from '@/theme/with-opacity';
import { User } from '@/types';

// BRANCHES constant removed - now using branches from store

export default function UsersScreen() {
  const { colors } = useColorScheme();
  const [refreshing, setRefreshing] = useState(false);
  const currentUser = useAuthStore((state) => state.currentUser);
  const users = useUserStore((state) => state.users);
  const addUser = useUserStore((state) => state.addUser);
  const updateUser = useUserStore((state) => state.updateUser);
  const deleteUser = useUserStore((state) => state.deleteUser);
  const getSalesByUser = useSaleStore((state) => state.getSalesByUser);
  const settings = useSettingsStore((state) => state.settings);
  const isLoadingUsers = useUserStore((state) => state.isLoading);
  const isFetchingUsers = useUserStore((state) => state.isFetching);
  // Branch store
  const branches = useBranchStore((state) => state.branches);
  const addBranch = useBranchStore((state) => state.addBranch);
  const updateBranch = useBranchStore((state) => state.updateBranch);
  const deleteBranch = useBranchStore((state) => state.deleteBranch);
  const fetchBranchesByCompany = useBranchStore((state) => state.fetchBranchesByCompany);
  const fetchUsers = useUserStore((state) => state.fetchUsers);
  const getBranchByName = useBranchStore((state) => state.getBranchByName);
  const isLoadingBranches = useBranchStore((state) => state.isLoading);
  const isFetchingBranches = useBranchStore((state) => state.isFetching);

  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showAddBranchForm, setShowAddBranchForm] = useState(false);
  const [showEditBranchForm, setShowEditBranchForm] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showBranchActionSheet, setShowBranchActionSheet] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [selectedBranchForAction, setSelectedBranchForAction] = useState<string | null>(null);
  const [editingBranchName, setEditingBranchName] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [branch, setBranch] = useState('Main Branch');
  const [newBranchName, setNewBranchName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [createdUserCredentials, setCreatedUserCredentials] = useState<{ name: string; phone: string; password: string } | null>(null);

  const regularUsers = users.filter((u) => u.role === 'user');
  
  // Fetch branches on mount
  // Use companyId from currentUser (preloaded on login)
  const currentUserCompanyId = currentUser?.companyId;

  useEffect(() => {
    if (currentUserCompanyId) {
      fetchBranchesByCompany(currentUserCompanyId);
    }
  }, [currentUserCompanyId, fetchBranchesByCompany]);
  
  // Get branches from store (filter by company if needed)
  const companyBranches = currentUserCompanyId
    ? branches.filter((b) => b.companyId === currentUserCompanyId)
    : branches;
  const allBranches = companyBranches.map((b) => b.name).sort();
  
  // Get branch object for selected branch
  const selectedBranchObj = selectedBranch ? getBranchByName(selectedBranch) : null;
  
  // Get users for selected branch using branchId (primary key) or branch name as fallback
  let branchUsers = selectedBranchObj
    ? regularUsers.filter((u) => u.branchId === selectedBranchObj.id || u.branch === selectedBranch)
    : regularUsers.filter((u) => u.branch === selectedBranch);
  
  // Include current user if they match the branch and are a regular user (not super_admin)
  // and not already in the list
  if (selectedBranch && currentUser && currentUser.role === 'user' && 
      (currentUser.branch === selectedBranch || 
       (selectedBranchObj && currentUser.branchId === selectedBranchObj.id))) {
    const isAlreadyIncluded = branchUsers.some(u => u.id === currentUser.id);
    if (!isAlreadyIncluded) {
      branchUsers = [...branchUsers, currentUser];
    }
  }
  
  // Calculate branch stats
  const getBranchStats = (branchName: string) => {
    const branchObj = getBranchByName(branchName);
    let branchUsersList = branchObj 
      ? regularUsers.filter((u) => u.branchId === branchObj.id || u.branch === branchName)
      : regularUsers.filter((u) => u.branch === branchName);
    
    // Include current user if they match the branch and are a regular user (not super_admin)
    // and not already in the list
    if (currentUser && currentUser.role === 'user' && 
        (currentUser.branch === branchName || 
         (branchObj && currentUser.branchId === branchObj.id))) {
      const isAlreadyIncluded = branchUsersList.some(u => u.id === currentUser.id);
      if (!isAlreadyIncluded) {
        branchUsersList = [...branchUsersList, currentUser];
      }
    }
    const totalSales = branchUsersList.reduce((sum, user) => {
      return sum + getSalesByUser(user.id).length;
    }, 0);
    const totalRevenue = branchUsersList.reduce((sum, user) => {
      const sales = getSalesByUser(user.id);
      return sum + sales.reduce((s, sale) => s + sale.totalPrice, 0);
    }, 0);
    const currency = branchUsersList.length > 0 && getSalesByUser(branchUsersList[0].id).length > 0
      ? getSalesByUser(branchUsersList[0].id)[0].currency
      : 'UGX';
    return { userCount: branchUsersList.length, totalSales, totalRevenue, currency };
  };

  // Generate a random password
  const generatePassword = () => {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setPassword(password);
  };

  // Share credentials
  const shareCredentials = async () => {
    if (!createdUserCredentials) return;
    
    const message = `User Account Credentials\n\nName: ${createdUserCredentials.name}\nPhone: ${createdUserCredentials.phone}\nPassword: ${createdUserCredentials.password}\n\nPlease save these credentials securely.`;
    
    try {
      await Share.share({
        message,
        title: 'User Account Credentials',
      });
    } catch (error: any) {
      Alert.alert('Error', 'Failed to share credentials');
    }
  };

  const handleAddUser = async (syncStatus: 'online' | 'offline') => {
    if (!name.trim() || !phone.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    // Generate username from phone number (or use phone as username)
    const generatedUsername = phone.trim().replace(/\D/g, ''); // Remove non-digits
    
    if (users.some((u) => u.username === generatedUsername)) {
      Alert.alert('Error', 'A user with this phone number already exists');
      return;
    }

    // Find branch by name to get branchId
    const selectedBranchObj = getBranchByName(branch);
    
    // Debug logging
    console.log('🔍 Branch Lookup:');
    console.log('  Looking for branch:', branch);
    console.log('  Available branches:', allBranches);
    console.log('  All branch objects:', branches.map(b => ({ id: b.id, name: b.name })));
    console.log('  Found branch object:', selectedBranchObj);
    console.log('  Branch ID:', selectedBranchObj?.id, '(type:', typeof selectedBranchObj?.id, ')');
    
    if (!selectedBranchObj && syncStatus === 'online') {
      console.error('❌ Branch not found:', branch);
      console.error('  Available branches:', allBranches);
      console.error('  All branch objects:', branches);
      Alert.alert(
        'Error', 
        `Branch "${branch}" not found. Please select a valid branch.\n\nAvailable branches: ${allBranches.join(', ') || 'None'}`
      );
      return;
    }

    const userData = {
      name: name.trim(),
      username: generatedUsername,
      password: password.trim(),
      role: 'user' as const,
      branch: branch, // Keep for backward compatibility
      branchId: selectedBranchObj?.id, // Send branchId for backend
      phone: phone.trim(),
    };
    
    console.log('📝 User Data with branchId:', JSON.stringify(userData, null, 2));

    try {
      await addUser(userData, syncStatus);
      
      // Store credentials for display
      setCreatedUserCredentials({
        name: name.trim(),
        phone: phone.trim(),
        password: password.trim(),
      });
      
      // Close add form and show credentials modal
      setShowAddForm(false);
      setShowCredentialsModal(true);
      
      // Reset form
      setName('');
      setPhone('');
      setPassword('');
      if (selectedBranch) {
        setBranch(selectedBranch);
      } else {
        setBranch('Main Branch');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create user');
    }
  };

  const handleAddBranch = async (syncStatus: 'online' | 'offline' = 'online') => {
    if (!newBranchName.trim()) {
      Alert.alert('Error', 'Please enter a branch name');
      return;
    }

    if (!currentUserCompanyId) {
      Alert.alert('Error', 'Company information not found');
      return;
    }

    // Check if branch name already exists
    const existingBranch = getBranchByName(newBranchName.trim());
    if (existingBranch) {
      Alert.alert('Error', 'Branch name already exists');
      return;
    }

    try {
      await addBranch(
        {
          companyId: currentUserCompanyId,
          name: newBranchName.trim(),
        },
        syncStatus
      );

      Alert.alert('Success', `Branch ${syncStatus === 'online' ? 'created' : 'saved offline'} successfully`, [
        {
          text: 'OK',
          onPress: () => {
            setShowAddBranchForm(false);
            setNewBranchName('');
            // Set the branch and open Add User modal
            setBranch(newBranchName.trim());
            setShowAddForm(true);
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create branch');
    }
  };

  const handleUserPress = (user: User) => {
    setSelectedUser(user);
    setShowActionSheet(true);
  };

  const handleBranchPress = (branchName: string) => {
    setSelectedBranchForAction(branchName);
    setShowBranchActionSheet(true);
  };

  const handleEditBranch = () => {
    if (!selectedBranchForAction) return;
    setEditingBranchName(selectedBranchForAction);
    setShowBranchActionSheet(false);
    setShowEditBranchForm(true);
  };

  const handleDeleteBranch = () => {
    if (!selectedBranchForAction) return;
    const branchObj = getBranchByName(selectedBranchForAction);
    const branchUsersList = branchObj 
      ? regularUsers.filter((u) => u.branchId === branchObj.id)
      : [];
    
    // Find the branch in store
    const branchToDelete = getBranchByName(selectedBranchForAction);
    
    Alert.alert(
      'Delete Branch',
      `Are you sure you want to delete "${selectedBranchForAction}"? This will delete all ${branchUsersList.length} user${branchUsersList.length === 1 ? '' : 's'} in this branch. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => setShowBranchActionSheet(false) },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete branch from store (which syncs to DB)
              if (branchToDelete) {
                await deleteBranch(branchToDelete.id);
              }
              
              // Delete all users in this branch
              branchUsersList.forEach((user) => {
                deleteUser(user.id);
              });
              
              setShowBranchActionSheet(false);
              setSelectedBranchForAction(null);
              if (selectedBranch === selectedBranchForAction) {
                setSelectedBranch(null);
              }
              Alert.alert('Success', 'Branch deleted successfully');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete branch');
            }
          },
        },
      ]
    );
  };

  const handleUpdateBranch = async () => {
    if (!selectedBranchForAction || !editingBranchName.trim()) {
      Alert.alert('Error', 'Please enter a branch name');
      return;
    }

    if (editingBranchName.trim() === selectedBranchForAction) {
      setShowEditBranchForm(false);
      setEditingBranchName('');
      setSelectedBranchForAction(null);
      return;
    }

    // Check if new branch name already exists
    const existingBranch = getBranchByName(editingBranchName.trim());
    if (existingBranch && existingBranch.name !== selectedBranchForAction) {
      Alert.alert('Error', 'Branch name already exists');
      return;
    }

    // Find the branch in store
    const branchToUpdate = getBranchByName(selectedBranchForAction);
    if (!branchToUpdate) {
      Alert.alert('Error', 'Branch not found');
      return;
    }

    try {
      // Update branch in store (which syncs to DB)
      await updateBranch(branchToUpdate.id, { name: editingBranchName.trim() });

      // Update all users in the branch to the new branch name
      // Note: branchId doesn't change when branch is renamed, so we use the existing branchId
      const branchObj = getBranchByName(selectedBranchForAction);
      const branchUsersList = branchObj 
        ? regularUsers.filter((u) => u.branchId === branchObj.id)
        : [];
      branchUsersList.forEach((user) => {
        updateUser(user.id, { 
          branch: editingBranchName.trim(),
          branchId: branchObj.id // Include branchId to ensure backend uses actual branch ID
        });
      });

      Alert.alert('Success', 'Branch renamed successfully');
      setShowEditBranchForm(false);
      setEditingBranchName('');
      setSelectedBranchForAction(null);
      if (selectedBranch === selectedBranchForAction) {
        setSelectedBranch(editingBranchName.trim());
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update branch');
    }
  };

  const handleEdit = () => {
    if (!selectedUser) return;
    setName(selectedUser.name);
    setPhone(selectedUser.phone || '');
    setPassword(''); // Don't pre-fill password for security
    setBranch(selectedUser.branch);
    setShowActionSheet(false);
    setShowEditForm(true);
  };

  const handleDelete = () => {
    if (!selectedUser) return;
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete "${selectedUser.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => setShowActionSheet(false) },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteUser(selectedUser.id);
            setShowActionSheet(false);
            setSelectedUser(null);
            Alert.alert('Success', 'User deleted successfully');
          },
        },
      ]
    );
  };

  const handleUpdateUser = async () => {
    if (!selectedUser || !name.trim() || !phone.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    // Generate username from phone number
    const generatedUsername = phone.trim().replace(/\D/g, ''); // Remove non-digits

    // Find branch by name to get branchId
    const selectedBranchObj = getBranchByName(branch);
    if (!selectedBranchObj) {
      Alert.alert('Error', 'Branch not found. Please select a valid branch.');
      return;
    }

    const updates: Partial<User> = {
      name: name.trim(),
      username: generatedUsername,
      branch,
      branchId: selectedBranchObj.id, // Include branchId for backend
      phone: phone.trim(),
    };

    // Only update password if it was provided
    if (password.trim()) {
      updates.password = password.trim();
    }

    try {
      await updateUser(selectedUser.id, updates);
      Alert.alert('Success', 'User updated successfully');
      setShowEditForm(false);
      setSelectedUser(null);
      setName('');
      setPhone('');
      setPassword('');
      setBranch('Main Branch');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update user');
    }
  };


  const getUserTotalSales = (userId: string) => {
    const sales = getSalesByUser(userId);
    return sales.reduce((sum, sale) => sum + sale.totalPrice, 0);
  };

  const getUserCurrency = (userId: string) => {
    const sales = getSalesByUser(userId);
    return sales.length > 0 ? sales[0].currency : settings.defaultCurrency;
  };

  if ((isFetchingUsers || isFetchingBranches) && !refreshing) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24, paddingTop: 8 }}>
          <View className="px-5 pt-6">
            {/* Header Skeleton */}
            <View className="mb-6 flex-row items-start justify-between">
              <View className="flex-1">
                <Skeleton width={100} height={24} style={{ marginBottom: 8 }} />
                <Skeleton width={200} height={14} />
              </View>
              <Skeleton width={90} height={36} borderRadius={18} />
            </View>

            {/* Search Bar Skeleton */}
            <View className="mb-6">
              <Skeleton width="100%" height={44} borderRadius={12} />
            </View>

            {/* Branch Selector Skeleton */}
            <View className="mb-6">
              <Skeleton width={120} height={14} style={{ marginBottom: 12 }} />
              <View className="flex-row gap-2">
                <Skeleton width={100} height={36} borderRadius={18} />
                <Skeleton width={100} height={36} borderRadius={18} />
                <Skeleton width={100} height={36} borderRadius={18} />
              </View>
            </View>

            {/* Users List Skeleton */}
            <SkeletonList count={5} renderItem={() => <SkeletonListItem />} />
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <>
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
              try {
                await Promise.all([
                  fetchUsers(),
                  currentUserCompanyId && fetchBranchesByCompany(currentUserCompanyId),
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
            {/* Header */}
            <View className="mb-6" style={{ paddingTop: 2 }}>
              {selectedBranch ? (
                <View className="mb-4">
                  <Pressable
                    onPress={() => setSelectedBranch(null)}
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.7 : 1,
                      marginBottom: 12,
                    })}>
                    <View className="flex-row items-center gap-2">
                      <Icon name="chevron.left" size={20} color={colors.primary} />
                      <Text variant="body" style={{ color: colors.primary, fontSize: 15 }}>
                        Back to Branches
                      </Text>
                    </View>
                  </Pressable>
                </View>
              ) : null}
              <View className="flex-row items-start justify-between">
                <View className="flex-1">
                  {selectedBranch ? (
                    <>
                      <Text 
                        variant="heading" 
                        style={{ 
                          fontSize: 16, 
                          marginBottom: 4,
                        }}>
                        {selectedBranch}
                      </Text>
                      <Text variant="footnote" color="tertiary" style={{ fontSize: 12 }}>
                        {branchUsers.length} {branchUsers.length === 1 ? 'user' : 'users'}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text 
                        variant="heading" 
                        style={{ 
                          fontSize: 16, 
                          marginBottom: 4,
                        }}>
                        Branches
                      </Text>
                      <Text variant="footnote" color="tertiary" style={{ fontSize: 12 }}>
                        Select a branch to view users
                      </Text>
                    </>
                  )}
                </View>
                {selectedBranch ? (
                  <Button
                    variant="primary"
                    size="md"
                    onPress={() => {
                      setBranch(selectedBranch);
                      setShowAddForm(true);
                    }}>
                    <Text>Add User</Text>
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="md"
                    onPress={() => setShowAddBranchForm(true)}>
                    <Text>Add Branch</Text>
                  </Button>
                )}
              </View>
            </View>


            {/* Branch Cards or Users List */}
            {!selectedBranch ? (
              // Show branch cards
              allBranches.length === 0 ? (
                <View
                  className="rounded-2xl px-5 py-12 items-center justify-center"
                  style={{
                    backgroundColor: colors.background,
                  }}>
                  <Icon name="building.2" size={40} color={colors.primary} style={{ opacity: 0.3, marginBottom: 12 }} />
                  <Text variant="subhead" color="tertiary" style={{ fontSize: 15, marginBottom: 4 }}>
                    No branches found
                  </Text>
                  <Text variant="footnote" color="tertiary" style={{ fontSize: 13 }}>
                    Add users to create branches
                  </Text>
                </View>
              ) : (
                <View className="gap-3">
                  {allBranches.map((branchName) => {
                    const stats = getBranchStats(branchName);
                    return (
                      <Pressable
                        key={branchName}
                        onPress={() => handleBranchPress(branchName)}
                        style={({ pressed }) => ({
                          opacity: pressed ? 0.7 : 1,
                        })}>
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
                              <View className="flex-row items-start justify-between mb-2">
                                <View className="flex-1 min-w-0">
                                  <Text 
                                    variant="heading" 
                                    style={{ 
                                      fontSize: 14,
                                      fontWeight: '500',
                                      marginBottom: 4,
                                    }}
                                    numberOfLines={1}>
                                    {branchName}
                                  </Text>
                                </View>
                                <Icon 
                                  name="chevron.right" 
                                  size={18} 
                                  color={colors.primary} 
                                  style={{ opacity: 0.4, marginTop: 2 }} 
                                />
                              </View>
                              <View className="flex-row items-center justify-between mt-2">
                                <View>
                                  <Text 
                                    variant="footnote" 
                                    color="tertiary" 
                                    style={{ fontSize: 12, marginBottom: 2 }}>
                                    Users
                                  </Text>
                                  <Text 
                                    variant="body" 
                                    style={{ 
                                      fontSize: 13,
                                      fontWeight: '500',
                                    }}>
                                    {stats.userCount}
                                  </Text>
                                </View>
                                <View className="items-end">
                                  <Text 
                                    variant="footnote" 
                                    color="tertiary" 
                                    style={{ fontSize: 12, marginBottom: 2 }}>
                                    Revenue
                                  </Text>
                                  <Text 
                                    variant="body" 
                                    style={{ 
                                      fontSize: 13,
                                      fontWeight: '500',
                                      color: colors.primary,
                                    }} 
                                    numberOfLines={1}
                                    ellipsizeMode="tail">
                                    {formatCurrency(stats.totalRevenue, stats.currency)}
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
              )
            ) : branchUsers.length === 0 ? (
              <View
                className="rounded-2xl px-5 py-12 items-center justify-center"
                style={{
                  backgroundColor: colors.background,
                }}>
                <Icon name="person.2" size={40} color={colors.primary} style={{ opacity: 0.3, marginBottom: 12 }} />
                <Text variant="subhead" color="tertiary" style={{ fontSize: 15, marginBottom: 4 }}>
                  No users in this branch
                </Text>
                <Text variant="footnote" color="tertiary" style={{ fontSize: 13 }}>
                  Add users to this branch
                </Text>
              </View>
            ) : (
              <View className="gap-3">
                {branchUsers.map((user, index) => {
                  const totalSales = getUserTotalSales(user.id);
                  const sales = getSalesByUser(user.id);
                  const currency = getUserCurrency(user.id);

                  return (
                    <Pressable
                      key={user.id || `user-${index}`}
                      onPress={() => handleUserPress(user)}
                      style={({ pressed }) => ({
                        opacity: pressed ? 0.7 : 1,
                      })}>
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
                            <View className="flex-row items-start justify-between mb-2">
                              <View className="flex-1 min-w-0">
                                <Text 
                                  variant="heading" 
                                  style={{ 
                                    fontSize: 14,
                                    fontWeight: '500',
                                    marginBottom: 4,
                                  }}
                                  numberOfLines={1}>
                                  {user.name}
                                </Text>
                                <View className="flex-row items-center gap-1.5 mb-3">
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
                              </View>
                              <Icon 
                                name="chevron.right" 
                                size={18} 
                                color={colors.primary} 
                                style={{ opacity: 0.4, marginTop: 2 }} 
                              />
                            </View>
                            <View className="flex-row items-center justify-between mt-2">
                              <View>
                                <Text 
                                  variant="footnote" 
                                  color="tertiary" 
                                  style={{ fontSize: 12, marginBottom: 2 }}>
                                  Total Sales
                                </Text>
                                <Text 
                                  variant="body" 
                                  style={{ 
                                    fontSize: 13,
                                    fontWeight: '500',
                                  }}>
                                  {sales.length}
                                </Text>
                              </View>
                              <View className="items-end">
                                <Text 
                                  variant="footnote" 
                                  color="tertiary" 
                                  style={{ fontSize: 12, marginBottom: 2 }}>
                                  Revenue
                                </Text>
                                <Text 
                                  variant="body" 
                                  style={{ 
                                    fontSize: 13,
                                    fontWeight: '500',
                                    color: colors.primary,
                                  }} 
                                  numberOfLines={1}
                                  ellipsizeMode="tail">
                                  {formatCurrency(totalSales, currency)}
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
            )}
          </View>
        </ScrollView>
      </View>

      {/* Add User Modal */}
      <Modal
        visible={showAddForm}
        onClose={() => {
          setShowAddForm(false);
          setName('');
          setPhone('');
          setPassword('');
          setShowPassword(false);
          if (selectedBranch) {
            setBranch(selectedBranch);
          } else {
            setBranch('Main Branch');
          }
        }}
        title="Add User"
        subtitle={selectedBranch ? `Add user to ${selectedBranch}` : "Create a new user account"}
        maxHeight={700}>
        <View className="gap-4">
          <View>
            <Text variant="subhead" className="mb-2">
              Name
            </Text>
            <Input
              value={name}
              onChangeText={setName}
              placeholder="Enter full name"
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
            <View className="flex-row items-center justify-between mb-2">
              <Text variant="subhead">
                Password
              </Text>
              <Button
                onPress={generatePassword}
                variant="secondary"
                size="sm"
                className="px-3 py-1.5">
                <Icon name="key.fill" size={14} color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: 13 }}>Generate</Text>
              </Button>
            </View>
            <View className="relative">
              <Input
                value={password}
                onChangeText={setPassword}
                placeholder="Enter password or generate one"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                style={{ paddingRight: 50 }}
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-0 bottom-0 justify-center"
                style={{ paddingHorizontal: 8, zIndex: 10 }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Icon
                  name={showPassword ? 'eye.slash' : 'eye'}
                  size={20}
                  color={colors.mutedForeground}
                />
              </Pressable>
            </View>
            {password && (
              <View
                className="mt-2 px-3 py-2 rounded-lg"
                style={{ backgroundColor: withOpacity(colors.primary, 0.1) }}>
                <View className="flex-row items-start gap-2">
                  <Icon name="exclamationmark.triangle.fill" size={16} color={colors.primary} style={{ marginTop: 2 }} />
                  <Text variant="footnote" style={{ color: colors.primary, flex: 1 }}>
                    <Text>Important:</Text> Please note down this password. It will be shown once after account creation.
                  </Text>
                </View>
              </View>
            )}
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

          <View className="flex-row gap-3 mt-4">
            <Button onPress={() => handleAddUser('online')} variant="primary" className="flex-1" disabled={!name.trim() || !phone.trim() || !password.trim()} loading={isLoadingUsers}>
              <Icon name="cloud.fill" size={16} color="#FFFFFF" />
              <Text>Save</Text>
            </Button>
            <Button onPress={() => handleAddUser('offline')} variant="secondary" className="flex-1" disabled={!name.trim() || !phone.trim() || !password.trim()} loading={isLoadingUsers}>
              <Icon name="externaldrive.fill" size={16} color={colors.primary} />
              <Text style={{ color: colors.primary }}>Save Offline</Text>
            </Button>
          </View>
        </View>
      </Modal>

      {/* Credentials Display Modal */}
      <Modal
        visible={showCredentialsModal}
        onClose={() => {
          setShowCredentialsModal(false);
          setCreatedUserCredentials(null);
        }}
        title="Account Created Successfully"
        subtitle="Please save these credentials securely"
        maxHeight={500}>
        <View className="gap-4">
          {createdUserCredentials && (
            <>
              <View
                className="px-4 py-4 rounded-xl"
                style={{ backgroundColor: withOpacity(colors.primary, 0.1) }}>
                <View className="gap-3">
                  <View>
                    <Text variant="footnote" color="tertiary" className="mb-1">
                      Name
                    </Text>
                    <Text variant="body" style={{ fontSize: 15 }}>
                      {createdUserCredentials.name}
                    </Text>
                  </View>
                  <View>
                    <Text variant="footnote" color="tertiary" className="mb-1">
                      Phone Number
                    </Text>
                    <Text variant="body" style={{ fontSize: 15 }}>
                      {createdUserCredentials.phone}
                    </Text>
                  </View>
                  <View>
                    <Text variant="footnote" color="tertiary" className="mb-1">
                      Password
                    </Text>
                    <Text variant="body" style={{ fontSize: 15, fontFamily: 'monospace' }}>
                      {createdUserCredentials.password}
                    </Text>
                  </View>
                </View>
              </View>

              <View
                className="px-3 py-2 rounded-lg"
                style={{ backgroundColor: withOpacity(colors.primary, 0.1) }}>
                <View className="flex-row items-start gap-2">
                  <Icon name="info.circle.fill" size={16} color={colors.primary} style={{ marginTop: 2 }} />
                  <Text variant="footnote" style={{ color: colors.primary, flex: 1 }}>
                    Use the phone number to login. This password will not be shown again.
                  </Text>
                </View>
              </View>

              <View className="flex-row gap-3 mt-2">
                <View className="flex-1">
                  <Button onPress={shareCredentials} variant="primary" className="w-full">
                    <Icon name="square.and.arrow.up" size={16} color="#FFFFFF" />
                    <Text>Share Credentials</Text>
                  </Button>
                </View>
                <View className="flex-1">
                  <Button
                    onPress={() => {
                      setShowCredentialsModal(false);
                      setCreatedUserCredentials(null);
                    }}
                    variant="secondary"
                    className="w-full">
                    <Text style={{ color: colors.primary }}>Done</Text>
                  </Button>
                </View>
              </View>
            </>
          )}
        </View>
      </Modal>


      {/* Edit User Modal */}
      <Modal
        visible={showEditForm}
        onClose={() => {
          setShowEditForm(false);
          setSelectedUser(null);
          setName('');
          setPhone('');
          setPassword('');
          setBranch('Main Branch');
        }}
        title="Edit User"
        subtitle="Update user information"
        maxHeight={600}>
        <View className="gap-4">
          <View>
            <Text variant="subhead" className="mb-2">
              Name
            </Text>
            <Input
              value={name}
              onChangeText={setName}
              placeholder="Enter full name"
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
              Password
            </Text>
            <Input
              value={password}
              onChangeText={setPassword}
              placeholder="Enter new password (leave blank to keep current)"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
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

          <Button onPress={handleUpdateUser} className="mt-4" loading={isLoadingUsers}>
            <Text>Update User</Text>
          </Button>
        </View>
      </Modal>

      {/* User Action Sheet */}
      <BottomSheet
        visible={showActionSheet}
        onClose={() => {
          setShowActionSheet(false);
          setSelectedUser(null);
        }}
        title="User Actions"
        showIcons={true}
        options={[
          { label: 'View Sales', value: 'view_sales', icon: 'chart.bar' },
          { label: 'View Expenses', value: 'view_expenses', icon: 'dollarsign.circle.fill' },
          { label: 'Edit User', value: 'edit', icon: 'pencil' },
          { label: 'Delete User', value: 'delete', icon: 'trash', destructive: true },
        ]}
        onSelect={(value) => {
          if (value === 'view_sales') {
            if (selectedUser) {
              router.push({
                pathname: '/(tabs)/user-sales',
                params: { userId: selectedUser.id, userName: selectedUser.name },
              });
            }
            setShowActionSheet(false);
            setSelectedUser(null);
          } else if (value === 'view_expenses') {
            if (selectedUser) {
              router.push({
                pathname: '/(tabs)/user-expenses',
                params: { userId: selectedUser.id, userName: selectedUser.name },
              });
            }
            setShowActionSheet(false);
            setSelectedUser(null);
          } else if (value === 'edit') {
            handleEdit();
          } else if (value === 'delete') {
            handleDelete();
          }
        }}
      />

      {/* Branch Action Sheet */}
      <BottomSheet
        visible={showBranchActionSheet}
        onClose={() => {
          setShowBranchActionSheet(false);
          setSelectedBranchForAction(null);
        }}
        title="Branch Actions"
        showIcons={true}
        options={[
          { label: 'View Users', value: 'view_users', icon: 'person.2' },
          { label: 'View Sales', value: 'view_sales', icon: 'chart.bar' },
          { label: 'Edit Branch', value: 'edit', icon: 'pencil' },
          { label: 'Delete Branch', value: 'delete', icon: 'trash', destructive: true },
        ]}
        onSelect={(value) => {
          if (value === 'view_users' && selectedBranchForAction) {
            setSelectedBranch(selectedBranchForAction);
            setShowBranchActionSheet(false);
            setSelectedBranchForAction(null);
          } else if (value === 'view_sales' && selectedBranchForAction) {
            router.push({
              pathname: '/branch-sales',
              params: { branchName: selectedBranchForAction },
            });
            setShowBranchActionSheet(false);
            setSelectedBranchForAction(null);
          } else if (value === 'edit') {
            handleEditBranch();
          } else if (value === 'delete') {
            handleDeleteBranch();
          }
        }}
      />

      {/* Add Branch Modal */}
      <Modal
        visible={showAddBranchForm}
        onClose={() => {
          setShowAddBranchForm(false);
          setNewBranchName('');
        }}
        title="Add Branch"
        subtitle="Create a new branch"
        maxHeight={400}>
        <View className="gap-4">
          <View>
            <Text variant="subhead" className="mb-2">
              Branch Name
            </Text>
            <Input
              value={newBranchName}
              onChangeText={setNewBranchName}
              placeholder="Enter branch name"
            />
          </View>

          <View className="flex-row gap-3 mt-2 mb-2">
            <Button onPress={() => handleAddBranch('online')} variant="primary" className="flex-1" disabled={!newBranchName.trim()} loading={isLoadingBranches}>
              <Icon name="cloud.fill" size={16} color="#FFFFFF" />
              <Text>Save</Text>
            </Button>
            <Button onPress={() => handleAddBranch('offline')} variant="secondary" className="flex-1" disabled={!newBranchName.trim()} loading={isLoadingBranches}>
              <Icon name="externaldrive.fill" size={16} color={colors.primary} />
              <Text style={{ color: colors.primary }}>Save Offline</Text>
            </Button>
          </View>
        </View>
      </Modal>

      {/* Edit Branch Modal */}
      <Modal
        visible={showEditBranchForm}
        onClose={() => {
          setShowEditBranchForm(false);
          setEditingBranchName('');
          setSelectedBranchForAction(null);
        }}
        title="Edit Branch"
        subtitle="Rename the branch"
        maxHeight={400}>
        <View className="gap-4">
          <View>
            <Text variant="subhead" className="mb-2">
              Branch Name
            </Text>
            <Input
              value={editingBranchName}
              onChangeText={setEditingBranchName}
              placeholder="Enter branch name"
            />
          </View>

          <Button onPress={handleUpdateBranch} className="mt-2 mb-2" loading={isLoadingBranches}>
            <Text>Update Branch</Text>
          </Button>
        </View>
      </Modal>

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
          ...(currentUser && (currentUser.role?.toLowerCase() === 'super_admin' || currentUser.role?.toLowerCase() === 'superadmin')
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
    </>
  );
}
