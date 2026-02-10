import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { saleApi } from '@/lib/api/saleApi';
import { Sale } from '@/types';
import { useProductStore } from '@/store/productStore';

interface SaleState {
  sales: Sale[];
  isLoading: boolean;
  isFetching: boolean; // true only during fetch* / sync; use for full-page skeleton
  error: string | null;
  addSale: (sale: Omit<Sale, 'id' | 'createdAt' | 'syncStatus'>, syncStatus?: 'online' | 'offline') => Promise<void>;
  updateSale: (id: string, updates: Partial<Sale>) => Promise<void>;
  deleteSale: (id: string, options?: { revertStock?: boolean }) => Promise<void>;
  getSaleById: (id: string) => Sale | undefined;
  getSalesByUser: (userId: string) => Sale[];
  getSalesByBranch: (branch: string) => Sale[];
  getAllSales: () => Sale[];
  getSalesByDateRange: (startDate: string, endDate: string) => Sale[];
  fetchSales: () => Promise<void>;
  fetchSalesByUser: (userId: string) => Promise<void>;
  fetchSalesByBranch: (branch: string) => Promise<void>;
  fetchSalesByDateRange: (startDate: string, endDate: string) => Promise<void>;
  syncSales: (productIdMap?: Map<string, string>) => Promise<void>;
}

export const useSaleStore = create<SaleState>()(
  persist(
    (set, get) => ({
      sales: [],
      isLoading: false,
      isFetching: false,
      error: null,
      addSale: async (saleData, syncStatus: 'online' | 'offline' = 'online') => {
        try {
          set({ isLoading: true, error: null });
          
          if (syncStatus === 'online') {
            // Validate productId (sellerId will be extracted from token on backend)
            if (!saleData.productId) {
              throw new Error('Product ID is required');
            }

            // Convert to number (backend expects uint)
            const productId = typeof saleData.productId === 'string' 
              ? parseInt(saleData.productId, 10) 
              : Number(saleData.productId);

            // Validate it's a valid number
            if (isNaN(productId) || productId <= 0) {
              throw new Error('Invalid product ID');
            }

            // Sync with backend (sellerId is optional - backend extracts from token)
            const newSale = await saleApi.createSale({
              productId: productId, // Send as number (uint)
              productName: saleData.productName,
              productAttributes: saleData.productAttributes || {},
              quantity: saleData.quantity,
              unitPrice: saleData.unitPrice,
              extraCosts: saleData.extraCosts || 0,
              totalPrice: saleData.totalPrice,
              currency: saleData.currency || 'UGX',
              // sellerId is optional - backend will extract from token context
              paymentStatus: saleData.paymentStatus || 'credit',
              buyerName: saleData.buyerName,
              buyerContact: saleData.buyerContact,
              buyerLocation: saleData.buyerLocation,
            });
            // Mark as synced after successful creation
            const syncedSale = { ...newSale, syncStatus: 'synced' as const };
            set((state) => ({ sales: [syncedSale, ...state.sales] }));
          } else {
            // Offline mode - store locally
            const newSale: Sale = {
              ...saleData,
              currency: saleData.currency || 'UGX',
              paymentStatus: saleData.paymentStatus || 'credit',
              syncStatus: 'offline',
              id: `sale_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              createdAt: new Date().toISOString(),
            };
            set((state) => ({ sales: [newSale, ...state.sales] }));
          }
        } catch (error: any) {
          console.error('Error adding sale:', error);
          set({ error: error.message || 'Failed to add sale' });
          // Re-throw the error so the caller can handle it and show appropriate message
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },
      updateSale: async (id, updates) => {
        try {
          set({ isLoading: true, error: null });
          const sale = get().getSaleById(id);
          
          if (sale?.syncStatus === 'online' || sale?.syncStatus === 'synced' || !sale?.syncStatus) {
            // Sync with backend (default to online if syncStatus is undefined)
            const updatedSale = await saleApi.updateSale(id, {
              productId: updates.productId,
              productName: updates.productName,
              productAttributes: updates.productAttributes,
              quantity: updates.quantity,
              unitPrice: updates.unitPrice,
              extraCosts: updates.extraCosts,
              totalPrice: updates.totalPrice,
              currency: updates.currency,
              sellerId: updates.sellerId,
              paymentStatus: updates.paymentStatus,
              buyerName: updates.buyerName,
              buyerContact: updates.buyerContact,
              buyerLocation: updates.buyerLocation,
            });
            // Mark as synced after successful update
            const syncedSale = { ...updatedSale, syncStatus: 'synced' as const };
            set((state) => ({
              sales: state.sales.map((s) => (s.id === id ? syncedSale : s)),
            }));
          } else {
            // Offline update
            set((state) => ({
              sales: state.sales.map((s) =>
                s.id === id ? { ...s, ...updates, syncStatus: 'offline' } : s
              ),
            }));
          }
        } catch (error: any) {
          set({ error: error.message || 'Failed to update sale' });
          // Fallback to offline update
          set((state) => ({
            sales: state.sales.map((s) =>
              s.id === id ? { ...s, ...updates, syncStatus: 'offline' } : s
            ),
          }));
        } finally {
          set({ isLoading: false });
        }
      },
      deleteSale: async (id, options?: { revertStock?: boolean }) => {
        const idStr = String(id);
        try {
          set({ isLoading: true, error: null });
          const sale = get().getSaleById(idStr);
          
          if (!sale) {
            throw new Error('Sale not found');
          }

          // If revertStock is true, add the sale quantity back to the product
          if (options?.revertStock && sale.productId && sale.quantity > 0) {
            const increased = await useProductStore.getState().increaseProductQuantity(
              String(sale.productId),
              sale.quantity
            );
            if (!increased) {
              throw new Error('Failed to revert product stock. The product may no longer exist.');
            }
          }

          // Only allow deletion of offline sales (local sales)
          if (sale.syncStatus === 'offline') {
            // Remove from local storage (compare as string so number/string id both match)
            set((state) => ({
              sales: state.sales.filter((s) => String(s.id) !== idStr),
            }));
          } else {
            // For synced/online sales, try to delete from backend if ID is numeric
            const isNumericId = /^\d+$/.test(idStr);
            if (isNumericId) {
              try {
                await saleApi.deleteSale(idStr);
                // Remove from local storage after successful backend deletion
                set((state) => ({
                  sales: state.sales.filter((s) => String(s.id) !== idStr),
                }));
              } catch (error: any) {
                throw new Error('Failed to delete sale from server. Please try again when online.');
              }
            } else {
              throw new Error('Cannot delete this sale. Only offline sales can be deleted.');
            }
          }
        } catch (error: any) {
          set({ error: error.message || 'Failed to delete sale' });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },
      getSaleById: (id) => {
        const idStr = String(id);
        return get().sales.find((sale) => String(sale.id) === idStr);
      },
      getSalesByUser: (userId) => {
        return get().sales.filter((sale) => sale.sellerId === userId);
      },
      getSalesByBranch: (branch) => {
        return get().sales.filter((sale) => sale.branch === branch);
      },
      getAllSales: () => {
        return get().sales;
      },
      getSalesByDateRange: (startDate, endDate) => {
        return get().sales.filter(
          (sale) => sale.createdAt >= startDate && sale.createdAt <= endDate
        );
      },
      fetchSales: async () => {
        try {
          set({ isFetching: true, error: null });
          const sales = await saleApi.getAllSales();
          // Mark all fetched sales as synced
          const syncedSales = sales.map((s) => ({ ...s, syncStatus: 'synced' as const }));
          set({ sales: syncedSales });
        } catch (error: any) {
          set({ error: error.message || 'Failed to fetch sales' });
        } finally {
          set({ isFetching: false });
        }
      },
      fetchSalesByUser: async (userId: string) => {
        try {
          set({ isFetching: true, error: null });
          const sales = await saleApi.getSalesByUser(userId);
          // Mark all fetched sales as synced
          const syncedSales = sales.map((s) => ({ ...s, syncStatus: 'synced' as const }));
          // Merge with existing sales, prioritizing fetched ones
          set((state) => {
            const existingIds = new Set(syncedSales.map((s) => s.id));
            const localSales = state.sales.filter((s) => !existingIds.has(s.id));
            return { sales: [...syncedSales, ...localSales] };
          });
        } catch (error: any) {
          set({ error: error.message || 'Failed to fetch sales by user' });
        } finally {
          set({ isFetching: false });
        }
      },
      fetchSalesByBranch: async (branch: string) => {
        try {
          set({ isFetching: true, error: null });
          const sales = await saleApi.getSalesByBranch(branch);
          // Mark all fetched sales as synced
          const syncedSales = sales.map((s) => ({ ...s, syncStatus: 'synced' as const }));
          // Merge with existing sales, prioritizing fetched ones
          set((state) => {
            const existingIds = new Set(syncedSales.map((s) => s.id));
            const localSales = state.sales.filter((s) => !existingIds.has(s.id));
            return { sales: [...syncedSales, ...localSales] };
          });
        } catch (error: any) {
          set({ error: error.message || 'Failed to fetch sales by branch' });
        } finally {
          set({ isFetching: false });
        }
      },
      fetchSalesByDateRange: async (startDate: string, endDate: string) => {
        try {
          set({ isFetching: true, error: null });
          const sales = await saleApi.getSalesByDateRange(startDate, endDate);
          // Mark all fetched sales as synced
          const syncedSales = sales.map((s) => ({ ...s, syncStatus: 'synced' as const }));
          // Merge with existing sales, prioritizing fetched ones
          set((state) => {
            const existingIds = new Set(syncedSales.map((s) => s.id));
            const localSales = state.sales.filter((s) => !existingIds.has(s.id));
            return { sales: [...syncedSales, ...localSales] };
          });
        } catch (error: any) {
          set({ error: error.message || 'Failed to fetch sales by date range' });
        } finally {
          set({ isFetching: false });
        }
      },
      syncSales: async (productIdMap?: Map<string, string>) => {
        try {
          set({ isFetching: true, error: null });
          const { sales } = get();
          const offlineSales = sales.filter((s) => s.syncStatus === 'offline');

          for (const sale of offlineSales) {
            try {
              // Map productId if mapping is provided
              let productId = sale.productId;
              if (productIdMap && sale.productId) {
                const mappedProductId = productIdMap.get(String(sale.productId));
                if (mappedProductId) {
                  productId = mappedProductId;
                }
              }

              // Convert to number (backend expects uint)
              const productIdNum = typeof productId === 'string' 
                ? parseInt(productId, 10) 
                : Number(productId);

              // Validate it's a valid number
              if (isNaN(productIdNum) || productIdNum <= 0) {
                throw new Error(`Invalid product ID: ${productId}`);
              }

              // Convert sellerId to number if provided (backend expects uint)
              let sellerIdNum: number | undefined = undefined;
              if (sale.sellerId) {
                sellerIdNum = typeof sale.sellerId === 'string' 
                  ? parseInt(sale.sellerId, 10) 
                  : Number(sale.sellerId);
                
                // Validate it's a valid number
                if (isNaN(sellerIdNum) || sellerIdNum <= 0) {
                  // If invalid, don't include sellerId (backend will extract from token)
                  sellerIdNum = undefined;
                }
              }

              const syncedSale = await saleApi.createSale({
                productId: productIdNum,
                productName: sale.productName,
                productAttributes: sale.productAttributes || {},
                quantity: sale.quantity,
                unitPrice: sale.unitPrice,
                totalPrice: sale.totalPrice,
                currency: sale.currency,
                sellerId: sellerIdNum,
                paymentStatus: sale.paymentStatus,
                buyerName: sale.buyerName,
                buyerContact: sale.buyerContact,
                buyerLocation: sale.buyerLocation,
              });
              // Update local sale with synced data
              set((state) => ({
                sales: state.sales.map((s) =>
                  s.id === sale.id ? { ...syncedSale, syncStatus: 'synced' } : s
                ),
              }));
            } catch (error: any) {
              console.error(`Failed to sync sale ${sale.id}:`, error);
              throw error; // Re-throw to allow caller to handle
            }
          }
        } catch (error: any) {
          set({ error: error.message || 'Failed to sync sales' });
          throw error; // Re-throw to allow caller to handle
        } finally {
          set({ isFetching: false });
        }
      },
    }),
    {
      name: 'sale-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);




