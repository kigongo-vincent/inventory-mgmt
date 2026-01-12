import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { productApi } from '@/lib/api/productApi';
import { GasSize, Product, ProductType } from '@/types';
import { useSettingsStore } from '@/store/settingsStore';

interface ProductState {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'syncStatus'>, syncStatus?: 'online' | 'offline') => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  getProductById: (id: string) => Product | undefined;
      getProductsByCompany: (companyId: string) => Product[];
  // New dynamic filtering method
  getProductsByAttributes: (attributes: Record<string, any>, companyId: string) => Product[];
  // Legacy method for backward compatibility
  getProductsByTypeAndSize: (
    type: ProductType,
    gasSize: GasSize,
    companyId: string
  ) => Product[];
  reduceProductQuantity: (id: string, quantity: number) => Promise<boolean>;
  fetchProducts: () => Promise<void>;
  fetchProductsByCompany: (companyId: string) => Promise<void>;
  syncProducts: () => Promise<void>;
}

// Product names are now dynamic from settings, no longer hardcoded

export const useProductStore = create<ProductState>()(
  persist(
    (set, get) => ({
      products: [],
      isLoading: false,
      error: null,
      addProduct: async (productData, syncStatus: 'online' | 'offline' = 'online') => {
        try {
          set({ isLoading: true, error: null });
          
          if (syncStatus === 'online') {
            // Sync with backend
            const newProduct = await productApi.createProduct({
              name: productData.name,
              price: productData.price,
              currency: productData.currency || 'UGX',
              companyId: productData.companyId || '',
              quantity: productData.quantity,
              imageUri: productData.imageUri,
              attributes: productData.attributes || {},
            });
            // Mark as synced after successful creation
            const syncedProduct = { ...newProduct, syncStatus: 'synced' as const };
            set((state) => ({ products: [...state.products, syncedProduct] }));
          } else {
            // Offline mode - store locally
            const newProduct: Product = {
              ...productData,
              currency: productData.currency || 'UGX',
              syncStatus: 'offline',
              id: `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              createdAt: new Date().toISOString(),
              attributes: productData.attributes || {},
            };
            set((state) => ({ products: [...state.products, newProduct] }));
          }
        } catch (error: any) {
          console.error('Error adding product:', error);
          set({ error: error.message || 'Failed to add product' });
          // Re-throw the error so the caller can handle it and show appropriate message
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },
      updateProduct: async (id, updates) => {
        try {
          set({ isLoading: true, error: null });
          const product = get().getProductById(id);
          
          if (product?.syncStatus === 'online' || product?.syncStatus === 'synced' || !product?.syncStatus) {
            // Sync with backend (default to online if syncStatus is undefined)
            const updatedProduct = await productApi.updateProduct(id, updates);
            // Mark as synced after successful update
            const syncedProduct = { ...updatedProduct, syncStatus: 'synced' as const };
            set((state) => ({
              products: state.products.map((p) => (p.id === id ? syncedProduct : p)),
            }));
          } else {
            // Offline update
            set((state) => ({
              products: state.products.map((p) =>
                p.id === id ? { ...p, ...updates, syncStatus: 'offline' } : p
              ),
            }));
          }
        } catch (error: any) {
          set({ error: error.message || 'Failed to update product' });
          // Fallback to offline update
        set((state) => ({
            products: state.products.map((p) =>
              p.id === id ? { ...p, ...updates, syncStatus: 'offline' } : p
          ),
        }));
        } finally {
          set({ isLoading: false });
        }
      },
      deleteProduct: async (id) => {
        try {
          set({ isLoading: true, error: null });
          const product = get().getProductById(id);
          
          if (product?.syncStatus === 'online' || product?.syncStatus === 'synced' || !product?.syncStatus) {
            // Sync with backend (default to online if syncStatus is undefined)
            await productApi.deleteProduct(id);
          }
          // Remove from local state after successful deletion
          set((state) => ({
            products: state.products.filter((product) => product.id !== id),
          }));
        } catch (error: any) {
          set({ error: error.message || 'Failed to delete product' });
          // Still remove from local state
        set((state) => ({
          products: state.products.filter((product) => product.id !== id),
        }));
        } finally {
          set({ isLoading: false });
        }
      },
      getProductById: (id) => {
        return get().products.find((product) => product.id === id);
      },
      getProductsByCompany: (companyId) => {
        return get().products.filter((product) => product.companyId === companyId);
      },
      // New dynamic filtering method
      getProductsByAttributes: (attributes, companyId) => {
        return get().products.filter((product) => {
          if (product.companyId !== companyId) return false;
          // Check if all provided attributes match
          return Object.keys(attributes).every(
            (key) => product.attributes[key] === attributes[key]
          );
        });
      },
      // Legacy method for backward compatibility
      getProductsByTypeAndSize: (type, gasSize, companyId) => {
        return get().products.filter(
          (product) =>
            product.attributes?.type === type &&
            product.attributes?.gasSize === gasSize &&
            product.companyId === companyId
        );
      },
      reduceProductQuantity: async (id, quantity) => {
        try {
          set({ isLoading: true, error: null });
        const product = get().getProductById(id);
        if (!product || product.quantity < quantity) {
          return false;
        }

          if (product.syncStatus === 'online' || product.syncStatus === 'synced' || !product.syncStatus) {
            // Sync with backend (default to online if syncStatus is undefined)
            const updatedProduct = await productApi.reduceProductQuantity(id, quantity);
            // Mark as synced after successful update
            const syncedProduct = { ...updatedProduct, syncStatus: 'synced' as const };
            set((state) => ({
              products: state.products.map((p) => (p.id === id ? syncedProduct : p)),
            }));
          } else {
            // Offline update
            set((state) => ({
              products: state.products.map((p) =>
                p.id === id ? { ...p, quantity: p.quantity - quantity, syncStatus: 'offline' } : p
              ),
            }));
          }
          return true;
        } catch (error: any) {
          set({ error: error.message || 'Failed to reduce product quantity' });
          // Fallback to offline update
          const product = get().getProductById(id);
          if (product && product.quantity >= quantity) {
        set((state) => ({
          products: state.products.map((p) =>
                p.id === id ? { ...p, quantity: p.quantity - quantity, syncStatus: 'offline' } : p
          ),
        }));
        return true;
          }
          return false;
        } finally {
          set({ isLoading: false });
        }
      },
      fetchProducts: async () => {
        try {
          set({ isLoading: true, error: null });
          const products = await productApi.getAllProducts();
          // Mark all fetched products as synced
          const syncedProducts = products.map((p) => ({
            ...p,
            syncStatus: 'synced' as const,
          }));
          set({ products: syncedProducts });
        } catch (error: any) {
          console.error('Error fetching products:', error);
          set({ error: error.message || 'Failed to fetch products' });
        } finally {
          set({ isLoading: false });
        }
      },
      fetchProductsByCompany: async (companyId: string) => {
        try {
          set({ isLoading: true, error: null });
          // Backend automatically filters by company via middleware
          const products = await productApi.getAllProducts();
          // Replace products for this company with fetched ones, keep other companies' products
          set((state) => {
            const otherCompanyProducts = state.products.filter((p) => p.companyId !== companyId);
            // Mark all fetched products as synced
            const syncedProducts = products.map((p) => ({
              ...p,
              syncStatus: 'synced' as const,
            }));
            return { products: [...otherCompanyProducts, ...syncedProducts] };
          });
        } catch (error: any) {
          console.error('Error fetching products by company:', error);
          set({ error: error.message || 'Failed to fetch products by company' });
        } finally {
          set({ isLoading: false });
        }
      },
      syncProducts: async () => {
        try {
          set({ isLoading: true, error: null });
          const { products } = get();
          const offlineProducts = products.filter((p) => p.syncStatus === 'offline');

          for (const product of offlineProducts) {
            try {
              const syncedProduct = await productApi.createProduct({
                name: product.name,
                price: product.price,
                currency: product.currency,
                companyId: product.companyId || '', // Company ID required
                quantity: product.quantity,
                imageUri: product.imageUri,
                attributes: product.attributes || {},
              });
              // Update local product with synced data
              set((state) => ({
                products: state.products.map((p) =>
                  p.id === product.id ? { ...syncedProduct, syncStatus: 'synced' } : p
                ),
              }));
            } catch (error) {
              console.error(`Failed to sync product ${product.id}:`, error);
            }
          }
        } catch (error: any) {
          set({ error: error.message || 'Failed to sync products' });
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'product-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);




