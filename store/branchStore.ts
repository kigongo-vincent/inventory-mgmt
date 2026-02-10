import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { branchApi } from '@/lib/api/branchApi';
import { Branch, SyncStatus } from '@/types';

// Helper function to normalize branch objects from backend
// Backend returns ID (capital) but frontend expects id (lowercase)
function normalizeBranch(branch: any): Branch {
  return {
    ...branch,
    id: branch.id || branch.ID?.toString() || String(branch.ID || ''),
    companyId: branch.companyId || branch.companyId?.toString() || String(branch.companyId || branch.company_id || ''),
  } as Branch;
}

interface BranchState {
  branches: Branch[];
  isLoading: boolean;
  isFetching: boolean;
  error: string | null;
  addBranch: (
    branch: Omit<Branch, 'id' | 'createdAt' | 'syncStatus'>,
    syncStatus?: 'online' | 'offline'
  ) => Promise<void>;
  updateBranch: (id: string, updates: Partial<Branch>) => Promise<void>;
  deleteBranch: (id: string) => Promise<void>;
  getBranchById: (id: string) => Branch | undefined;
  getBranchByName: (name: string) => Branch | undefined;
  getBranchesByCompany: (companyId: string) => Branch[];
  fetchBranches: () => Promise<void>;
  fetchBranchesByCompany: (companyId: string) => Promise<void>;
  syncBranches: () => Promise<void>;
}

export const useBranchStore = create<BranchState>()(
  persist(
    (set, get) => ({
      branches: [],
      isLoading: false,
      isFetching: false,
      error: null,
      addBranch: async (branchData, syncStatus: 'online' | 'offline' = 'online') => {
        try {
          set({ isLoading: true, error: null });

          if (syncStatus === 'online') {
            // Sync with backend
            const newBranch = await branchApi.createBranch({
              companyId: branchData.companyId,
              name: branchData.name,
              address: branchData.address,
              phone: branchData.phone,
            });
            // Normalize branch object: convert ID (capital) to id (lowercase)
            const normalizedBranch = normalizeBranch(newBranch);
            // Mark as synced after successful creation
            const syncedBranch = { ...normalizedBranch, syncStatus: 'synced' as const };
            set((state) => ({ branches: [...state.branches, syncedBranch] }));
          } else {
            // Offline mode - store locally
            const newBranch: Branch = {
              ...branchData,
              syncStatus: 'offline',
              id: `branch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              createdAt: new Date().toISOString(),
            };
            set((state) => ({ branches: [...state.branches, newBranch] }));
          }
        } catch (error: any) {
          set({ error: error.message || 'Failed to add branch' });
          // Fallback to offline mode
          const newBranch: Branch = {
            ...branchData,
            syncStatus: 'offline',
            id: `branch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date().toISOString(),
          };
          set((state) => ({ branches: [...state.branches, newBranch] }));
        } finally {
          set({ isLoading: false });
        }
      },
      updateBranch: async (id, updates) => {
        try {
          set({ isLoading: true, error: null });
          const branch = get().getBranchById(id);

          if (branch?.syncStatus === 'online' || branch?.syncStatus === 'synced' || !branch?.syncStatus) {
            // Sync with backend (default to online if syncStatus is undefined)
            const updatedBranch = await branchApi.updateBranch(id, {
              name: updates.name,
              address: updates.address,
              phone: updates.phone,
            });
            // Normalize branch object: convert ID (capital) to id (lowercase)
            const normalizedBranch = normalizeBranch(updatedBranch);
            // Mark as synced after successful update
            const syncedBranch = { ...normalizedBranch, syncStatus: 'synced' as const };
            set((state) => ({
              branches: state.branches.map((b) =>
                b.id === id ? syncedBranch : b
              ),
            }));
          } else {
            // Offline update
            set((state) => ({
              branches: state.branches.map((b) =>
                b.id === id ? { ...b, ...updates, syncStatus: 'offline' } : b
              ),
            }));
          }
        } catch (error: any) {
          set({ error: error.message || 'Failed to update branch' });
          // Still update local state
          set((state) => ({
            branches: state.branches.map((b) =>
              b.id === id ? { ...b, ...updates } : b
            ),
          }));
        } finally {
          set({ isLoading: false });
        }
      },
      deleteBranch: async (id) => {
        try {
          set({ isLoading: true, error: null });
          const branch = get().getBranchById(id);

          if (branch?.syncStatus === 'online' || branch?.syncStatus === 'synced' || !branch?.syncStatus) {
            // Sync with backend (default to online if syncStatus is undefined)
            await branchApi.deleteBranch(id);
          }
          // Remove from local state after successful deletion
          set((state) => ({
            branches: state.branches.filter((branch) => branch.id !== id),
          }));
        } catch (error: any) {
          set({ error: error.message || 'Failed to delete branch' });
          // Still remove from local state
          set((state) => ({
            branches: state.branches.filter((branch) => branch.id !== id),
          }));
        } finally {
          set({ isLoading: false });
        }
      },
      getBranchById: (id) => {
        const branch = get().branches.find((branch) => branch.id === id || (branch as any).ID?.toString() === id);
        // Normalize the branch if it exists (in case it has ID instead of id from persisted state)
        return branch ? normalizeBranch(branch) : undefined;
      },
      getBranchByName: (name) => {
        const trimmedName = name?.trim();
        if (!trimmedName) return undefined;
        // Try exact match first
        let branch = get().branches.find((branch) => branch.name === trimmedName);
        // If not found, try case-insensitive match
        if (!branch) {
          branch = get().branches.find((branch) => branch.name.toLowerCase() === trimmedName.toLowerCase());
        }
        // Normalize the branch if it exists (in case it has ID instead of id from persisted state)
        return branch ? normalizeBranch(branch) : undefined;
      },
      getBranchesByCompany: (companyId) => {
        return get().branches.filter((branch) => branch.companyId === companyId);
      },
      fetchBranches: async () => {
        try {
          set({ isFetching: true, error: null });
          const branches = await branchApi.getAllBranches();
          // Normalize branch objects: convert ID (capital) to id (lowercase) and companyId
          const syncedBranches = branches.map((b: any) => ({
            ...normalizeBranch(b),
            syncStatus: 'synced' as const,
          }));
          set({ branches: syncedBranches });
        } catch (error: any) {
          set({ error: error.message || 'Failed to fetch branches' });
        } finally {
          set({ isFetching: false });
        }
      },
      fetchBranchesByCompany: async (companyId: string) => {
        try {
          set({ isFetching: true, error: null });
          const branches = await branchApi.getBranchesByCompany(companyId);
          // Normalize branch objects: convert ID (capital) to id (lowercase) and companyId
          const syncedBranches = branches.map((b: any) => ({
            ...normalizeBranch(b),
            syncStatus: 'synced' as const,
          }));
          // Merge with existing branches, prioritizing fetched ones
          set((state) => {
            const existingIds = new Set(syncedBranches.map((b) => b.id));
            const localBranches = state.branches.filter((b) => !existingIds.has(b.id));
            return { branches: [...syncedBranches, ...localBranches] };
          });
        } catch (error: any) {
          set({ error: error.message || 'Failed to fetch branches by company' });
        } finally {
          set({ isFetching: false });
        }
      },
      syncBranches: async () => {
        try {
          set({ isFetching: true, error: null });
          const offlineBranches = get().branches.filter(
            (b) => b.syncStatus === 'offline'
          );

          for (const branch of offlineBranches) {
            try {
              const syncedBranch = await branchApi.createBranch({
                companyId: branch.companyId,
                name: branch.name,
                address: branch.address,
                phone: branch.phone,
              });
              // Normalize branch object: convert ID (capital) to id (lowercase)
              const normalizedBranch = normalizeBranch(syncedBranch);
              // Replace offline branch with synced one
              set((state) => ({
                branches: state.branches.map((b) =>
                  b.id === branch.id ? { ...normalizedBranch, syncStatus: 'synced' as SyncStatus } : b
                ),
              }));
            } catch (error: any) {
              console.error(`Failed to sync branch ${branch.id}:`, error);
            }
          }
        } catch (error: any) {
          set({ error: error.message || 'Failed to sync branches' });
        } finally {
          set({ isFetching: false });
        }
      },
    }),
    {
      name: 'branch-storage',
      storage: createJSONStorage(() => require('@react-native-async-storage/async-storage').default),
    }
  )
);
