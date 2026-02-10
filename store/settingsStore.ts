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

  // Service settings (for Cylinder Refill, etc.)
  serviceTypes?: string[];
  serviceBrands?: string[];
  serviceSizes?: string[];
}

// Full Gas Cylinder dimensions that must be present (merge into existing persisted settings)
const FULL_GAS_CYLINDER_SIZES = ['12kg', '13kg', '45kg'];
const SIZE_ORDER = ['3kg', '6kg', '12kg', '12.5kg', '13kg', '45kg', '20mm', '27mm', '2 plates', '3 plates', 'none'];

function ensureFullGasCylinderSizes(settings: AppSettings): AppSettings {
  let gasSizes = settings.gasSizes ? [...settings.gasSizes] : [...SIZE_ORDER];
  let changed = false;
  for (const size of FULL_GAS_CYLINDER_SIZES) {
    if (!gasSizes.includes(size)) {
      gasSizes.push(size);
      changed = true;
    }
  }
  if (changed) {
    gasSizes = gasSizes.sort((a, b) => {
      const i = SIZE_ORDER.indexOf(a);
      const j = SIZE_ORDER.indexOf(b);
      return (i === -1 ? SIZE_ORDER.length : i) - (j === -1 ? SIZE_ORDER.length : j);
    });
  }

  let productProperties = settings.productProperties;
  const sizeProp = productProperties?.find((p) => p.id === 'prop_size');
  if (sizeProp?.options) {
    let opts = [...sizeProp.options];
    let optsChanged = false;
    for (const size of FULL_GAS_CYLINDER_SIZES) {
      if (!opts.includes(size)) {
        opts.push(size);
        optsChanged = true;
      }
    }
    if (optsChanged) {
      opts = opts.sort((a, b) => {
        const i = SIZE_ORDER.indexOf(a);
        const j = SIZE_ORDER.indexOf(b);
        return (i === -1 ? SIZE_ORDER.length : i) - (j === -1 ? SIZE_ORDER.length : j);
      });
      productProperties = productProperties.map((p) =>
        p.id === 'prop_size' ? { ...p, options: opts } : p
      );
    }
  }

  return changed || productProperties !== settings.productProperties
    ? { ...settings, gasSizes, productProperties }
    : settings;
}

const defaultSettings: AppSettings = {
  colorScheme: 'dark',
  baseFontSize: 0.85, // Small (default)
  productProperties: [
    {
      id: 'prop_category',
      name: 'Category',
      type: 'select',
      options: ['Product'],
      required: true,
      order: 1,
      useForFiltering: true,
      displayInList: true,
    },
    {
      id: 'prop_type',
      name: 'Product Type',
      type: 'select',
      options: [
        'Full Gas Cylinder',
        'Cylinder Burner',
        'Gas Plate',
        'Gas Grill Stand',
        'Pipe',
        'Regulator',
      ],
      required: true,
      order: 2,
      useForFiltering: true,
      displayInList: true,
    },
    {
      id: 'prop_provider',
      name: 'Provider/Brand',
      type: 'select',
      options: [
        'Shell',
        'Vivo Energy',
        'Stabex International',
        'Total Energies',
        'Oryx Energies',
        'Rubis Energy',
        'HAS Petroleum',
        'Other',
      ], // Major LPG gas providers in Uganda (2025)
      required: false,
      order: 3,
      useForFiltering: true,
      displayInList: true,
    },
    {
      id: 'prop_size',
      name: 'Size',
      type: 'select',
      options: ['3kg', '6kg', '12kg', '12.5kg', '13kg', '45kg', '20mm', '27mm', '2 plates', '3 plates', 'none'],
      required: false,
      order: 4,
      useForFiltering: true,
      displayInList: true,
    },
  ],
  // Legacy fields for backward compatibility
  productTypes: [
    'Full Gas Cylinder',
    'Cylinder Burner',
    'Gas Plate',
    'Gas Grill Stand',
    'Pipe',
    'Regulator',
  ],
  gasSizes: ['3kg', '6kg', '12kg', '12.5kg', '13kg', '45kg', '20mm', '27mm', '2 plates', '3 plates', 'none'],
  customProductProperties: [],
  defaultCurrency: 'UGX',
  // Service settings
  serviceTypes: ['Cylinder Refill'],
  serviceBrands: ['Stand', 'Hass', 'Total', 'Shell', 'Vivo Energy', 'Stabex', 'Oryx', 'Rubis'],
  serviceSizes: ['3kg', '6kg', '12kg', '12.5kg', '13kg', '45kg'],
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
            productProperties: (state.settings.productProperties || [])
              .map((prop) => (prop.id === id ? { ...prop, ...updates } : prop))
              .sort((a, b) => a.order - b.order),
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
        return (settings.productProperties || [])
          .filter((prop) => prop.useForFiltering !== false)
          .sort((a, b) => a.order - b.order);
      },
    }),
    {
      name: 'app-settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state?.settings) {
          const migrated = ensureFullGasCylinderSizes(state.settings);
          if (migrated !== state.settings) {
            useSettingsStore.setState({ settings: migrated });
          }
        }
      },
    }
  )
);
