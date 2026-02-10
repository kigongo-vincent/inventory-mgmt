import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { userApi } from '@/lib/api/userApi';
import { User } from '@/types';

interface UserState {
  users: User[];
  isLoading: boolean;
  isFetching: boolean;
  error: string | null;
  addUser: (
    user: Omit<User, 'id' | 'createdAt' | 'syncStatus'>,
    syncStatus?: 'online' | 'offline'
  ) => Promise<void>;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  getUserById: (id: string) => User | undefined;
  getUsersByBranch: (branchId: string) => User[];
  fetchUsers: () => Promise<void>;
  fetchUsersByBranch: (branchId: string) => Promise<void>;
  syncUsers: (branchIdMap?: Map<string, string>) => Promise<void>;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      users: [],
      isLoading: false,
      isFetching: false,
      error: null,
      addUser: async (userData, syncStatus: 'online' | 'offline' = 'online') => {
        try {
          set({ isLoading: true, error: null });

          if (syncStatus === 'online') {
            // Sync with backend
            // Convert branchId to number if it's a string
            let branchId: number | undefined = undefined;
            if ((userData as any).branchId !== undefined && (userData as any).branchId !== null) {
              const branchIdValue = typeof (userData as any).branchId === 'string' 
                ? parseInt((userData as any).branchId, 10) 
                : Number((userData as any).branchId);
              branchId = isNaN(branchIdValue) ? undefined : branchIdValue;
            }
            
            // Build payload - branchId is required
            const createUserPayload: any = {
              name: userData.name,
              username: userData.username,
              password: userData.password,
              role: userData.role,
              branch: userData.branch, // Keep for backward compatibility
              email: userData.email,
              phone: userData.phone,
              profilePictureUri: userData.profilePictureUri,
            };
            
            // Only add branchId if it's a valid number (required)
            if (branchId !== undefined && branchId !== null && !isNaN(branchId)) {
              createUserPayload.branchId = branchId;
            }
            
            console.log('═══════════════════════════════════════');
            console.log('👤 Creating User - Payload:');
            console.log(JSON.stringify(createUserPayload, null, 2));
            console.log('  branchId:', branchId, '(type:', typeof branchId, ')');
            console.log('═══════════════════════════════════════');
            
            const newUser = await userApi.createUser(createUserPayload);
            // Mark as synced after successful creation
            const syncedUser = { ...newUser, syncStatus: 'synced' as const };
            set((state) => ({ users: [...state.users, syncedUser] }));
          } else {
            // Offline mode - store locally
            const newUser: User = {
              ...userData,
              syncStatus: 'offline',
              id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              createdAt: new Date().toISOString(),
            };
            set((state) => ({ users: [...state.users, newUser] }));
          }
        } catch (error: any) {
          console.error('❌ Error adding user:');
          console.error('Error object:', error);
          console.error('Error message:', error?.message);
          console.error('Error status:', error?.status);
          console.error('Error code:', error?.code);
          if (error?.response) {
            console.error('Error response:', error.response);
          }
          set({ error: error.message || 'Failed to add user' });
          // Only fallback to offline mode if user explicitly chose offline mode
          // If online mode fails, re-throw the error so UI can handle it
          if (syncStatus === 'online') {
            throw error; // Re-throw so UI can show error message
          } else {
            // Offline mode - store locally even if there's an error
            const newUser: User = {
              ...userData,
              syncStatus: 'offline',
              id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              createdAt: new Date().toISOString(),
            };
            set((state) => ({ users: [...state.users, newUser] }));
          }
        } finally {
          set({ isLoading: false });
        }
      },
      updateUser: async (id, updates) => {
        try {
          set({ isLoading: true, error: null });
          const user = get().getUserById(id);

          if (user?.syncStatus === 'online' || user?.syncStatus === 'synced' || !user?.syncStatus) {
            // Sync with backend (default to online if syncStatus is undefined)
            // IMPORTANT: Never send password in normal profile updates - password should only be updated via password reset flow
            const updatePayload: any = {
              name: updates.name,
              username: updates.username,
              role: updates.role,
              branch: updates.branch, // Keep for backward compatibility
              branchId: (updates as any).branchId, // Send branchId if available
              email: updates.email,
              phone: updates.phone,
              profilePictureUri: updates.profilePictureUri,
            };
            // Only include password if explicitly provided (for password reset flows)
            if (updates.password !== undefined && updates.password !== null && updates.password !== '') {
              updatePayload.password = updates.password;
            }
            const updatedUser = await userApi.updateUser(id, updatePayload);
            // Mark as synced after successful update
            const syncedUser = { ...updatedUser, syncStatus: 'synced' as const };
            set((state) => ({
              users: state.users.map((u) => (u.id === id ? syncedUser : u)),
            }));
          } else {
            // Offline update - exclude password unless explicitly provided
            const offlineUpdates = { ...updates };
            // Remove password from offline updates unless it's explicitly provided (for password reset)
            if (offlineUpdates.password === undefined || offlineUpdates.password === null || offlineUpdates.password === '') {
              delete offlineUpdates.password;
            }
            set((state) => ({
              users: state.users.map((u) =>
                u.id === id ? { ...u, ...offlineUpdates, syncStatus: 'offline' } : u
              ),
            }));
          }
        } catch (error: any) {
          set({ error: error.message || 'Failed to update user' });
          // Re-throw the error so the caller can handle it
          // Don't fallback to offline update for profile edits - user should see the error
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },
      deleteUser: async (id) => {
        try {
          set({ isLoading: true, error: null });
          const user = get().getUserById(id);

          if (user?.syncStatus === 'online' || user?.syncStatus === 'synced' || !user?.syncStatus) {
            // Sync with backend (default to online if syncStatus is undefined)
            await userApi.deleteUser(id);
          }
          // Remove from local state after successful deletion
          set((state) => ({
            users: state.users.filter((user) => user.id !== id),
          }));
        } catch (error: any) {
          set({ error: error.message || 'Failed to delete user' });
          // Still remove from local state
          set((state) => ({
            users: state.users.filter((user) => user.id !== id),
          }));
        } finally {
          set({ isLoading: false });
        }
      },
      getUserById: (id) => {
        return get().users.find((user) => user.id === id);
      },
      getUsersByBranch: (branchId: string) => {
        return get().users.filter((user) => user.branchId === branchId);
      },
      fetchUsers: async () => {
        try {
          set({ isFetching: true, error: null });
          const users = await userApi.getAllUsers();
          // Mark all fetched users as synced
          const syncedUsers = users.map((u) => ({ ...u, syncStatus: 'synced' as const }));
          set({ users: syncedUsers });
        } catch (error: any) {
          set({ error: error.message || 'Failed to fetch users' });
        } finally {
          set({ isFetching: false });
        }
      },
      fetchUsersByBranch: async (branchId: string) => {
        try {
          set({ isFetching: true, error: null });
          const users = await userApi.getUsersByBranch(branchId);
          // Mark all fetched users as synced
          const syncedUsers = users.map((u) => ({ ...u, syncStatus: 'synced' as const }));
          // Merge with existing users, prioritizing fetched ones
          set((state) => {
            const existingIds = new Set(syncedUsers.map((u) => u.id));
            const localUsers = state.users.filter((u) => !existingIds.has(u.id));
            return { users: [...syncedUsers, ...localUsers] };
          });
        } catch (error: any) {
          set({ error: error.message || 'Failed to fetch users by branch' });
        } finally {
          set({ isFetching: false });
        }
      },
      syncUsers: async (branchIdMap?: Map<string, string>) => {
        try {
          set({ isFetching: true, error: null });
          const { users } = get();
          const offlineUsers = users.filter((u) => u.syncStatus === 'offline');

          for (const user of offlineUsers) {
            try {
              // Build payload with branchId if available
              const createUserPayload: any = {
                name: user.name,
                username: user.username,
                password: user.password,
                role: user.role,
                branch: user.branch, // Keep for backward compatibility
                email: user.email,
                phone: user.phone,
                profilePictureUri: user.profilePictureUri,
              };

              // Map branch name to branchId if mapping is provided
              if (branchIdMap && user.branch) {
                const mappedBranchId = branchIdMap.get(user.branch);
                if (mappedBranchId) {
                  const branchIdValue = typeof mappedBranchId === 'string' 
                    ? parseInt(mappedBranchId, 10) 
                    : Number(mappedBranchId);
                  if (!isNaN(branchIdValue)) {
                    createUserPayload.branchId = branchIdValue;
                  }
                }
              } else if (user.branchId) {
                // Use existing branchId if available
                const branchIdValue = typeof user.branchId === 'string' 
                  ? parseInt(user.branchId, 10) 
                  : Number(user.branchId);
                if (!isNaN(branchIdValue)) {
                  createUserPayload.branchId = branchIdValue;
                }
              }

              const syncedUser = await userApi.createUser(createUserPayload);
              // Update local user with synced data
              set((state) => ({
                users: state.users.map((u) =>
                  u.id === user.id ? { ...syncedUser, syncStatus: 'synced' } : u
                ),
              }));
            } catch (error) {
              console.error(`Failed to sync user ${user.id}:`, error);
              throw error; // Re-throw to allow caller to handle
            }
          }
        } catch (error: any) {
          set({ error: error.message || 'Failed to sync users' });
          throw error; // Re-throw to allow caller to handle
        } finally {
          set({ isFetching: false });
        }
      },
    }),
    {
      name: 'user-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
