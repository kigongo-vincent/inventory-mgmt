import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { userApi } from '@/lib/api/userApi';
import { getAuthToken, removeAuthToken, setAuthToken } from '@/lib/api/config';
import { useBranchStore } from '@/store/branchStore';
import { User } from '@/types';

interface LoginResult {
  success: boolean;
  error?: 'network' | 'auth' | 'unknown';
  message?: string;
}

interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  login: (username: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  setCurrentUser: (user: User | null) => void;
  refreshUser: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  setHasHydrated: (hasHydrated: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
        currentUser: null,
        isAuthenticated: false,
        hasHydrated: false,
        login: async (username: string, password: string): Promise<LoginResult> => {
        try {
          // Clear any existing auth state before attempting login
          // This ensures we start fresh and don't have stale tokens interfering
          const existingToken = await getAuthToken();
          if (existingToken) {
            await removeAuthToken();
          }
          set({ currentUser: null, isAuthenticated: false });
          
          const response = await userApi.login({ username, password });
          
          // Verify response structure
          if (!response || typeof response !== 'object') {
            throw new Error('Invalid login response format');
          }
          
          // Check for error in response (backend might return error in response body even with 200)
          if ('error' in response && response.error) {
            throw new Error(response.error as string);
          }
          
          if (!response.user || !response.token) {
            throw new Error('Invalid login response: missing user or token');
          }
          
          await setAuthToken(response.token);
          // Log user object to verify branchId and companyId are present
          console.log('Login response user:', JSON.stringify(response.user, null, 2));
          set({ currentUser: response.user, isAuthenticated: true });
          
          // Preload branches for the user's company so companyId is available
          if (response.user.companyId) {
            try {
              const branchStore = useBranchStore.getState();
              await branchStore.fetchBranchesByCompany(response.user.companyId);
              console.log('Branches preloaded for company:', response.user.companyId);
            } catch (branchError) {
              // Log but don't fail login if branch fetch fails
              console.warn('Failed to preload branches on login:', branchError);
            }
          }
          
          return { success: true };
        } catch (error: any) {
          console.error('Login error:', error);
          
          // Ensure auth state is cleared on login failure
          await removeAuthToken();
          set({ currentUser: null, isAuthenticated: false });
          
          // Check if it's a network error
          if (error?.message?.includes('Network request failed') || 
              error?.message?.includes('Failed to fetch') ||
              error?.name === 'TypeError' && error?.message?.includes('Network')) {
            return {
              success: false,
              error: 'network',
              message: 'Unable to connect to the server. Please check your internet connection and ensure the backend server is running.',
            };
          }
          
          // Check if it's an authentication error (401) or invalid credentials
          if (error?.status === 401 || 
              error?.code === 'UNAUTHORIZED' ||
              error?.message?.toLowerCase().includes('invalid credentials') ||
              error?.message?.toLowerCase().includes('invalid username') ||
              error?.message?.toLowerCase().includes('invalid password')) {
            return {
              success: false,
              error: 'auth',
              message: 'Invalid username or password',
            };
          }
          
          // Other errors
          return {
            success: false,
            error: 'unknown',
            message: error?.message || 'An unexpected error occurred during login',
          };
        }
      },
      logout: async () => {
        await removeAuthToken();
        set({ currentUser: null, isAuthenticated: false });
      },
      setCurrentUser: (user: User | null) => {
        set({ currentUser: user, isAuthenticated: !!user });
      },
      refreshUser: async () => {
        const { currentUser } = get();
        if (!currentUser) return;

        try {
          const updatedUser = await userApi.getUserById(currentUser.id);
          set({ currentUser: updatedUser });
        } catch (error) {
          console.error('Error refreshing user:', error);
        }
      },
      initializeAuth: async () => {
        const { currentUser } = get();
        const token = await getAuthToken();
        
        // If we have a user in state but no token, clear the state
        if (currentUser && !token) {
          set({ currentUser: null, isAuthenticated: false });
          return;
        }
        
        // If we have a token but no user, try to validate token by checking if it's valid
        // (we can't fetch user without knowing the ID, so we'll let the next API call validate it)
        if (token && !currentUser) {
          // Token exists but no user - this will be validated on first API call
          return;
        }
        
        // If we have a token and user, validate the token by fetching user data
        if (token && currentUser) {
          try {
            // Validate token by fetching current user
            const updatedUser = await userApi.getUserById(currentUser.id);
            // Log to verify branchId is present
            console.log('Updated user from API:', JSON.stringify(updatedUser, null, 2));
            set({ currentUser: updatedUser, isAuthenticated: true });
          } catch (error: any) {
            // Token is invalid or user not found, clear auth state
            // Only log network errors in debug mode, don't spam console
            if (error?.status === 401 || error?.status === 404) {
              console.log('Token validation failed: Unauthorized or user not found');
              await removeAuthToken();
              set({ currentUser: null, isAuthenticated: false });
            } else if (error?.message?.includes('Network request failed') || 
                       error?.message?.includes('Failed to fetch')) {
              // Network error - keep user logged in but don't update user data
              console.log('Network error during token validation - keeping cached user data');
            } else {
              console.error('Token validation failed:', error);
            }
          }
        }
      },
      setHasHydrated: (hasHydrated: boolean) => {
        set({ hasHydrated });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => async (state) => {
        // Restore auth token when state is rehydrated
        if (state?.currentUser) {
          const token = await getAuthToken();
          if (!token) {
            // If we have user but no token, clear the state
            state.setCurrentUser(null);
          }
        }
        // Mark as hydrated
        state?.setHasHydrated(true);
        // Initialize auth after hydration
        if (state) {
          await state.initializeAuth();
        }
      },
    }
  )
);
