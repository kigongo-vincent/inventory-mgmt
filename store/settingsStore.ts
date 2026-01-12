import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface ProductProperty {
  id: string;
  name: string;
  type: 'text' | 'number' | 'select';
  options?: string[]; // For select type
  required: boolean;
  order: number;
  useForFiltering?: boolean; // Whether this property should be used for filtering products
  displayInList?: boolean; // Whether to display this property in product lists
}

export interface AppSettings {
  // Theme
  colorScheme: 'light' | 'dark' | 'system';
  
  // Typography
  baseFontSize: number; // Base font size multiplier (0.8 to 1.5)
  
  // Product Properties - Fully dynamic system
  productProperties: ProductProperty[]; // All product attributes (replaces productTypes, gasSizes, customProductProperties)
  
  // Legacy fields for backward compatibility during migration
  productTypes?: string[];
  gasSizes?: string[];
  customProductProperties?: ProductProperty[];
  
  // Currency
  defaultCurrency: string;
}

const defaultSettings: AppSettings = {
  colorScheme: 'dark',
  baseFontSize: 0.85, // Small (default)
  productProperties: [
    {
      id: 'prop_type',
      name: 'Product Type',
      type: 'select',
      options: ['Full Gas Cylinder', 'Cylinder Refill', 'Cylinder Burner', 'Gas Plate', 'Gas Grill Stand', 'Pipe', 'Regulator'],
      required: true,
      order: 1,
      useForFiltering: true,
      displayInList: true,
    },
    {
      id: 'prop_size',
      name: 'Size',
      type: 'select',
      options: ['3kg', '6kg', '12.5kg', 'none'],
      required: false,
      order: 2,
      useForFiltering: true,
      displayInList: true,
    },
  ],
  // Legacy fields for backward compatibility
  productTypes: [
    'Full Gas Cylinder',
    'Cylinder Refill',
    'Cylinder Burner',
    'Gas Plate',
    'Gas Grill Stand',
    'Pipe',
    'Regulator',
  ],
  gasSizes: ['3kg', '6kg', '12.5kg', 'none'],
  customProductProperties: [],
  defaultCurrency: 'UGX',
};

interface SettingsState {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  resetSettings: () => void;
  // New dynamic property methods
  addProductProperty: (property: Omit<ProductProperty, 'id'>) => void;
  updateProductProperty: (id: string, updates: Partial<ProductProperty>) => void;
  removeProductProperty: (id: string) => void;
  getFilterableProperties: () => ProductProperty[];
  // Legacy methods for backward compatibility
  addProductType: (type: string) => void;
  removeProductType: (type: string) => void;
  addGasSize: (size: string) => void;
  removeGasSize: (size: string) => void;
  addCustomProperty: (property: Omit<ProductProperty, 'id'>) => void;
  updateCustomProperty: (id: string, updates: Partial<ProductProperty>) => void;
  removeCustomProperty: (id: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,
      updateSettings: (updates) => {
        set((state) => {
          // Prevent theme changes - always keep it as 'dark'
          const filteredUpdates = { ...updates };
          if ('colorScheme' in filteredUpdates) {
            delete filteredUpdates.colorScheme;
          }
          return {
            settings: { ...state.settings, ...filteredUpdates },
          };
        });
      },
      resetSettings: () => {
        set({ settings: defaultSettings });
      },
      addProductType: (type) => {
        const { settings } = get();
        if (!settings.productTypes.includes(type)) {
          set((state) => ({
            settings: {
              ...state.settings,
              productTypes: [...state.settings.productTypes, type],
            },
          }));
        }
      },
      removeProductType: (type) => {
        set((state) => ({
          settings: {
            ...state.settings,
            productTypes: state.settings.productTypes.filter((t) => t !== type),
          },
        }));
      },
      addGasSize: (size) => {
        const { settings } = get();
        if (!settings.gasSizes.includes(size)) {
          set((state) => ({
            settings: {
              ...state.settings,
              gasSizes: [...state.settings.gasSizes, size],
            },
          }));
        }
      },
      removeGasSize: (size) => {
        set((state) => ({
          settings: {
            ...state.settings,
            gasSizes: state.settings.gasSizes.filter((s) => s !== size),
          },
        }));
      },
      addCustomProperty: (property) => {
        const newProperty: ProductProperty = {
          ...property,
          id: `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        };
        set((state) => ({
          settings: {
            ...state.settings,
            customProductProperties: [...state.settings.customProductProperties, newProperty],
          },
        }));
      },
      updateCustomProperty: (id, updates) => {
        set((state) => ({
          settings: {
            ...state.settings,
            customProductProperties: state.settings.customProductProperties.map((prop) =>
              prop.id === id ? { ...prop, ...updates } : prop
            ),
          },
        }));
      },
      removeCustomProperty: (id) => {
        set((state) => ({
          settings: {
            ...state.settings,
            customProductProperties: state.settings.customProductProperties.filter(
              (prop) => prop.id !== id
            ),
          },
        }));
      },
      // New dynamic property methods
      addProductProperty: (property) => {
        const newProperty: ProductProperty = {
          ...property,
          id: `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        };
        set((state) => ({
          settings: {
            ...state.settings,
            productProperties: [...(state.settings.productProperties || []), newProperty].sort(
              (a, b) => a.order - b.order
            ),
          },
        }));
      },
      updateProductProperty: (id, updates) => {
        set((state) => ({
          settings: {
            ...state.settings,
            productProperties: (state.settings.productProperties || []).map((prop) =>
              prop.id === id ? { ...prop, ...updates } : prop
            ).sort((a, b) => a.order - b.order),
          },
        }));
      },
      removeProductProperty: (id) => {
        set((state) => ({
          settings: {
            ...state.settings,
            productProperties: (state.settings.productProperties || []).filter(
              (prop) => prop.id !== id
            ),
          },
        }));
      },
      getFilterableProperties: () => {
        const { settings } = get();
        return (settings.productProperties || []).filter(
          (prop) => prop.useForFiltering !== false
        ).sort((a, b) => a.order - b.order);
      },
    }),
    {
      name: 'app-settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
