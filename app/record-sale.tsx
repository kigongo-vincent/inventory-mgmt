import { router } from 'expo-router';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Alert, View, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { ActivityIndicator } from '@/components/nativewindui/ActivityIndicator';
import { BottomSheet } from '@/components/nativewindui/BottomSheet';
import { Button } from '@/components/nativewindui/Button';
import { Icon } from '@/components/nativewindui/Icon';
import { Input } from '@/components/nativewindui/Input';
import { Text } from '@/components/nativewindui/Text';
import { formatCurrency } from '@/lib/currency';
import { useColorScheme } from '@/lib/useColorScheme';
import { useAuthStore } from '@/store/authStore';
import { useProductStore } from '@/store/productStore';
import { useSaleStore } from '@/store/saleStore';
import { useSettingsStore } from '@/store/settingsStore';
import { withOpacity } from '@/theme/with-opacity';
import { GasSize, ProductType, Product, PaymentStatus } from '@/types';

export default function RecordSaleScreen() {
  const { colors, baseFontSize: rawBaseFontSize, colorScheme } = useColorScheme();
  const baseFontSize = rawBaseFontSize || 1.0;
  const insets = useSafeAreaInsets();
  const currentUser = useAuthStore((state) => state.currentUser);
  const getProductsByTypeAndSize = useProductStore(
    (state) => state.getProductsByTypeAndSize
  );
  const getProductsByAttributes = useProductStore(
    (state) => state.getProductsByAttributes
  );
  const allProducts = useProductStore((state) => state.products);
  const reduceProductQuantity = useProductStore(
    (state) => state.reduceProductQuantity
  );
  const fetchProducts = useProductStore((state) => state.fetchProducts);
  const addSale = useSaleStore((state) => state.addSale);
  const settings = useSettingsStore((state) => state.settings);
  const isLoadingSales = useSaleStore((state) => state.isLoading);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch products from backend when component mounts
  useEffect(() => {
    const loadProducts = async () => {
      try {
        await fetchProducts();
      } catch (error) {
        console.error('Error loading products:', error);
        // Continue even if fetch fails (offline mode)
      }
    };
    loadProducts();
  }, [fetchProducts]);

  const productTypes = settings.productTypes || [];
  const gasSizes = settings.gasSizes || [];
  const productProperties = settings.productProperties || [];
  const serviceTypes = settings.serviceTypes || ['Cylinder Refill'];
  const serviceBrands = settings.serviceBrands || ['Stand', 'Hass', 'Total', 'Shell', 'Vivo Energy', 'Stabex', 'Oryx', 'Rubis'];
  const serviceSizes = settings.serviceSizes || ['3kg', '6kg', '12kg', '12.5kg', '13kg', '45kg'];

  // Product vs Service mode - first question
  const [saleMode, setSaleMode] = useState<'product' | 'service'>('product');

  // For product: Single product or New Kit (cylinder + accessories)
  const [productSaleMode, setProductSaleMode] = useState<'single' | 'new_kit'>('single');

  // Service-specific state (Cylinder Refill - full gas cylinder with all metrics, no accessories)
  const [serviceType, setServiceType] = useState<string>(serviceTypes[0] || 'Cylinder Refill');
  const [serviceBrand, setServiceBrand] = useState<string>('');
  const [serviceSize, setServiceSize] = useState<string>(serviceSizes[0] || '');
  const [servicePrice, setServicePrice] = useState<string>('');
  const [serviceQuantity, setServiceQuantity] = useState<string>('1');

  // Get provider options from products or settings
  const providerOptions = useMemo(() => {
    const providerProp = productProperties.find(p => p.id === 'prop_provider');
    if (providerProp?.options && providerProp.options.length > 0) {
      return providerProp.options;
    }
    // Extract unique providers from existing products
    const providers = new Set<string>();
    allProducts.forEach(p => {
      if (p.attributes?.provider) {
        providers.add(p.attributes.provider);
      }
    });
    return Array.from(providers).sort();
  }, [productProperties, allProducts]);

  const [productType, setProductType] = useState<ProductType>(() => {
    return productTypes.length > 0 ? productTypes[0] : '';
  });
  const [provider, setProvider] = useState<string>('all');
  const [gasSize, setGasSize] = useState<GasSize>(() => {
    return gasSizes.length > 0 ? (gasSizes.find(s => s !== 'none') || gasSizes[0]) : '';
  });
  // Step-by-step accessory flow: after cylinder sale, ask regulator → then burner
  type AccessoryStep = 'regulator' | 'burner' | null;
  const [accessoryStep, setAccessoryStep] = useState<AccessoryStep>(null);
  // Context from cylinder sale (gas size, buyer info) - used for accessory sales
  const [cylinderSaleContext, setCylinderSaleContext] = useState<{
    gasSize: string;
    provider?: string;
    buyerName: string;
    buyerContact: string;
    buyerLocation: string;
    paymentStatus: PaymentStatus;
    syncStatus: 'online' | 'offline';
  } | null>(null);
  // Bottom sheet for "Add Regulator?" / "Add Burner and Grill?" prompts
  const [showAccessoryPromptSheet, setShowAccessoryPromptSheet] = useState(false);
  const [accessoryPromptType, setAccessoryPromptType] = useState<'regulator' | 'burner'>('regulator');
  const closingDueToSelectRef = useRef(false);

  // Gas sizes that show accessory prompts (Regulator or Burner and Grill)
  const ACCESSORY_GAS_SIZES = ['6kg', '12kg', '12.5kg', '13kg'];

  // Map cylinder gas size to regulator size: 6kg→20mm, 12kg/12.5kg/13kg→27mm
  const getRegulatorSizeForGasSize = (gasSize: string): string => {
    if (gasSize === '6kg') return '20mm';
    if (['12kg', '12.5kg', '13kg'].includes(gasSize)) return '27mm';
    return '27mm'; // default for other kg sizes
  };

  // Check if size should be shown (only for Full Gas Cylinder)
  const isFullGasCylinder = productType === 'Full Gas Cylinder';
  const shouldShowSize = isFullGasCylinder;
  
  // Check if provider should be shown (only for Full Gas Cylinder)
  const shouldShowProvider = isFullGasCylinder;

  // Check if we're in accessory flow (regulator or burner step)
  const isInAccessoryFlow = accessoryStep !== null;

  useEffect(() => {
    if (productTypes.length > 0 && !productType) {
      setProductType(productTypes[0]);
    }
    if (shouldShowSize && gasSizes.length > 0 && !gasSize) {
      // For Full Gas Cylinder, default to kg sizes
      setGasSize(gasSizes.find(s => s !== 'none' && s.includes('kg')) || gasSizes[0]);
    } else if (!shouldShowSize) {
      setGasSize('none');
    }
  }, [productTypes, gasSizes, productType, gasSize, shouldShowSize]);

  useEffect(() => {
    if (saleMode === 'service' && (!serviceBrand || !serviceBrands.includes(serviceBrand)) && serviceBrands.length > 0) {
      setServiceBrand(serviceBrands[0]);
    }
    if (saleMode === 'service' && (!serviceSize || !serviceSizes.includes(serviceSize)) && serviceSizes.length > 0) {
      setServiceSize(serviceSizes[0]);
    }
  }, [saleMode, serviceBrand, serviceBrands, serviceSize, serviceSizes]);

  // Accessory products: Regulator (filtered by gas size) or Burner/Grill
  const regulatorProducts = useMemo(() => {
    if (!currentUser?.companyId || !cylinderSaleContext) return [];
    const regulatorSize = getRegulatorSizeForGasSize(cylinderSaleContext.gasSize);
    return getProductsByAttributes(
      { type: 'Regulator', size: regulatorSize },
      currentUser.companyId
    ) || [];
  }, [currentUser?.companyId, cylinderSaleContext]);

  const burnerGrillProducts = useMemo(() => {
    if (!currentUser?.companyId) return [];
    return allProducts.filter(
      (p) =>
        p.companyId === currentUser.companyId &&
        (p.attributes?.type === 'Cylinder Burner' || p.attributes?.type === 'Gas Grill Stand')
    );
  }, [currentUser?.companyId, allProducts]);

  const [quantity, setQuantity] = useState('1');
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('credit');
  const [buyerName, setBuyerName] = useState('');
  const [buyerContact, setBuyerContact] = useState('');
  const [buyerLocation, setBuyerLocation] = useState('');
  const [overrideTotalPrice, setOverrideTotalPrice] = useState<string>('');
  const [isTotalPriceOverridden, setIsTotalPriceOverridden] = useState(false);
  const [extraCosts, setExtraCosts] = useState<string>('');
  // Accessory sale state
  const [accessoryProductId, setAccessoryProductId] = useState<string | null>(null);
  const [accessoryQuantity, setAccessoryQuantity] = useState('1');

  const validProductType = productType || (productTypes.length > 0 ? productTypes[0] : '');
  const validGasSize = shouldShowSize ? (gasSize || (gasSizes.length > 0 ? (gasSizes.find(s => s !== 'none') || gasSizes[0]) : '')) : 'none';

  // Build filter attributes
  const filterAttributes: Record<string, any> = {
    type: validProductType,
  };
  
  if (shouldShowSize) {
    filterAttributes.size = validGasSize;
  }
  
  if (provider !== 'all') {
    filterAttributes.provider = provider;
  }

  let availableProducts: Product[] = [];
  try {
    if (currentUser && validProductType && productTypes.length > 0) {
      availableProducts = getProductsByAttributes(
        filterAttributes,
        currentUser.companyId || ''
      ) || [];
    }
  } catch (error) {
    console.error('Error getting products:', error);
    availableProducts = [];
  }

  const product = selectedProduct
    ? availableProducts.find((p) => p.id === selectedProduct)
    : availableProducts[0] || null;

  // For service (Cylinder Refill): find a Full Gas Cylinder product to use as FK - we don't reduce qty
  const servicePlaceholderProduct = useMemo(() => {
    if (!currentUser?.companyId) return null;
    const match = allProducts.find(
      (p) =>
        p.companyId === currentUser.companyId &&
        p.attributes?.type === 'Full Gas Cylinder' &&
        p.attributes?.provider === serviceBrand &&
        p.attributes?.size === serviceSize
    );
    if (match) return match;
    return allProducts.find(
      (p) =>
        p.companyId === currentUser.companyId &&
        p.attributes?.type === 'Full Gas Cylinder'
    ) || null;
  }, [currentUser?.companyId, allProducts, serviceBrand, serviceSize]);

  // Calculate unit price (product price or service price)
  const unitPrice = saleMode === 'service'
    ? (parseFloat(servicePrice) || 0)
    : (product?.price || 0);

  // Service quantity (always 1 for services - the "quantity" is the size like 3kg)
  const effectiveQuantity = saleMode === 'service'
    ? parseInt(serviceQuantity, 10) || 1
    : parseInt(quantity, 10) || 0;

  // Calculate total price: (qty × unitPrice) - extraCosts (costs are deducted from total, e.g. delivery discount)
  const extraCostsValue = extraCosts ? parseFloat(extraCosts) || 0 : 0;
  const calculatedTotalPrice = saleMode === 'service'
    ? Math.max(0, (parseFloat(servicePrice) || 0) * (parseInt(serviceQuantity, 10) || 1) - extraCostsValue)
    : product && quantity
      ? Math.max(0, (unitPrice * parseInt(quantity, 10)) - extraCostsValue)
      : 0;

  const totalPrice = isTotalPriceOverridden && overrideTotalPrice && !isNaN(parseFloat(overrideTotalPrice))
    ? parseFloat(overrideTotalPrice)
    : calculatedTotalPrice;

  const askAddRegulator = (ctx: NonNullable<typeof cylinderSaleContext>) => {
    setAccessoryPromptType('regulator');
    setShowAccessoryPromptSheet(true);
  };

  const askAddBurnerAndGrill = (ctx: NonNullable<typeof cylinderSaleContext>) => {
    setAccessoryPromptType('burner');
    setShowAccessoryPromptSheet(true);
  };

  const handleAccessoryPromptSelect = (value: string) => {
    closingDueToSelectRef.current = true;
    if (!cylinderSaleContext) return;
    const ctx = cylinderSaleContext;
    setShowAccessoryPromptSheet(false);
    if (value === 'yes') {
      setAccessoryStep(accessoryPromptType);
    } else {
      if (accessoryPromptType === 'regulator') {
        setTimeout(() => askAddBurnerAndGrill(ctx), 350);
      } else {
        finishAndExit(ctx.syncStatus);
      }
    }
  };

  const handleAccessoryPromptClose = () => {
    setShowAccessoryPromptSheet(false);
    if (closingDueToSelectRef.current) {
      closingDueToSelectRef.current = false;
      return;
    }
    if (!cylinderSaleContext) return;
    const ctx = cylinderSaleContext;
    if (accessoryPromptType === 'regulator') {
      setTimeout(() => askAddBurnerAndGrill(ctx), 350);
    } else {
      finishAndExit(ctx.syncStatus);
    }
  };

  const finishAndExit = (syncStatus: 'online' | 'offline') => {
    setAccessoryStep(null);
    setCylinderSaleContext(null);
    setBuyerName('');
    setBuyerContact('');
    setBuyerLocation('');
    if (syncStatus === 'offline') {
      router.replace('/offline-sales');
    } else {
      router.back();
    }
  };

  const handleRecordServiceSale = async (syncStatus: 'online' | 'offline') => {
    const priceVal = parseFloat(servicePrice);
    if (isNaN(priceVal) || priceVal <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }
    if (!serviceBrand || !serviceSize) {
      Alert.alert('Error', 'Please select brand and size');
      return;
    }
    if (!servicePlaceholderProduct?.id) {
      Alert.alert(
        'Configuration Required',
        'Please add at least one Full Gas Cylinder product to inventory. Service sales use it for record-keeping (no stock reduction).'
      );
      return;
    }
    if (!currentUser) return;

    setIsProcessing(true);
    try {
      const saleData = {
        productId: servicePlaceholderProduct.id,
        productType: 'Cylinder Refill',
        productName: `Cylinder Refill ${serviceBrand} ${serviceSize}`,
        productAttributes: {
          type: 'Cylinder Refill',
          provider: serviceBrand,
          size: serviceSize,
        },
        quantity: 1,
        unitPrice: priceVal,
        extraCosts: extraCosts ? parseFloat(extraCosts) || 0 : 0,
        totalPrice: Math.max(0, priceVal - (extraCosts ? parseFloat(extraCosts) || 0 : 0)),
        currency: settings.defaultCurrency || 'UGX',
        sellerId: currentUser.id,
        branch: currentUser.branch,
        paymentStatus,
        buyerName: buyerName.trim() || undefined,
        buyerContact: buyerContact.trim() || undefined,
        buyerLocation: buyerLocation.trim() || undefined,
      };
      await addSale(saleData, syncStatus);
      Alert.alert('Success', `Service sale recorded ${syncStatus === 'online' ? 'online' : 'offline'}`, [
        {
          text: 'OK',
          onPress: () => {
            setServicePrice('');
            setBuyerName('');
            setBuyerContact('');
            setBuyerLocation('');
            setExtraCosts('');
            if (syncStatus === 'offline') {
              router.replace('/offline-sales');
            } else {
              router.back();
            }
          },
        },
      ]);
    } catch (error: any) {
      console.error('Error recording service sale:', error);
      Alert.alert('Error', error?.message || 'Failed to save sale. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRecordSale = async (syncStatus: 'online' | 'offline') => {
    if (!quantity.trim()) {
      Alert.alert('Error', 'Please enter quantity');
      return;
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    if (!product || !currentUser) {
      Alert.alert('Error', 'Product not available');
      return;
    }

    if (!product.id) {
      Alert.alert('Error', 'Product ID is missing');
      return;
    }

    if (product.quantity < qty) {
      Alert.alert('Error', 'Insufficient stock');
      return;
    }

    setIsProcessing(true);
    try {
      const saleData = {
        productId: product.id,
        productType: product.attributes?.type || product.type,
        productName: product.name,
        productAttributes: {
          ...(product.attributes || {}),
        },
        gasSize: product.attributes?.size || product.attributes?.gasSize,
        quantity: qty,
        unitPrice: unitPrice, // Always use product price
        extraCosts: extraCosts ? parseFloat(extraCosts) || 0 : 0,
        totalPrice: totalPrice, // Use overridden total if set, otherwise calculated
        currency: product.currency,
        sellerId: currentUser.id,
        // sellerName removed - use sellerId FK
        branch: currentUser.branch,
        paymentStatus: paymentStatus,
        buyerName: buyerName.trim() || undefined,
        buyerContact: buyerContact.trim() || undefined,
        buyerLocation: buyerLocation.trim() || undefined,
      };

      // Reduce product quantity first
      const success = await reduceProductQuantity(product.id, qty);
      if (!success) {
        Alert.alert('Error', 'Failed to update inventory');
        return;
      }

      // Create sale
      await addSale(saleData, syncStatus);

      // Refresh products to get updated quantities
      if (syncStatus === 'online') {
        try {
          await fetchProducts();
        } catch (error) {
          console.error('Error refreshing products after sale:', error);
        }
      }

      // For New Kit: Full Gas Cylinder triggers accessory flow (regulator, burner)
      if (
        productSaleMode === 'new_kit' &&
        isFullGasCylinder &&
        ACCESSORY_GAS_SIZES.includes(gasSize) &&
        product.attributes?.type === 'Full Gas Cylinder'
      ) {
        const ctx = {
          gasSize,
          provider: provider !== 'all' ? provider : undefined,
          buyerName,
          buyerContact,
          buyerLocation,
          paymentStatus,
          syncStatus,
        };
        setCylinderSaleContext(ctx);
        setQuantity('');
        setSelectedProduct(null);
        setOverrideTotalPrice('');
        setIsTotalPriceOverridden(false);
        setExtraCosts('');
        askAddRegulator(ctx);
      } else {
        Alert.alert('Success', `Sale saved ${syncStatus === 'online' ? 'online' : 'offline'}`, [
          {
            text: 'OK',
            onPress: () => {
              setQuantity('');
              setSelectedProduct(null);
              setBuyerName('');
              setBuyerContact('');
              setBuyerLocation('');
              setOverrideTotalPrice('');
              setIsTotalPriceOverridden(false);
              setExtraCosts('');
              if (syncStatus === 'offline') {
                router.replace('/offline-sales');
              } else {
                router.back();
              }
            },
          },
        ]);
      }
    } catch (error: any) {
      console.error('Error recording sale:', error);
      Alert.alert(
        'Error',
        error?.message || `Failed to save sale ${syncStatus === 'online' ? 'online' : 'offline'}. Please try again.`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRecordAccessorySale = async () => {
    const products = accessoryStep === 'regulator' ? regulatorProducts : burnerGrillProducts;
    const prod = accessoryProductId
      ? products.find((p) => p.id === accessoryProductId)
      : products[0];
    if (!prod || !cylinderSaleContext || !currentUser) return;
    const qty = parseInt(accessoryQuantity, 10);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }
    if (prod.quantity < qty) {
      Alert.alert('Error', 'Insufficient stock');
      return;
    }
    setIsProcessing(true);
    try {
      const unitPrice = prod.price;
      const total = unitPrice * qty;
      const saleData = {
        productId: prod.id,
        productType: prod.attributes?.type,
        productName: prod.name,
        productAttributes: {
          ...(prod.attributes || {}),
          gasSize: cylinderSaleContext.gasSize,
        },
        gasSize: cylinderSaleContext.gasSize,
        quantity: qty,
        unitPrice,
        extraCosts: 0,
        totalPrice: total,
        currency: prod.currency || 'UGX',
        sellerId: currentUser.id,
        branch: currentUser.branch,
        paymentStatus: cylinderSaleContext.paymentStatus,
        buyerName: cylinderSaleContext.buyerName || undefined,
        buyerContact: cylinderSaleContext.buyerContact || undefined,
        buyerLocation: cylinderSaleContext.buyerLocation || undefined,
      };
      const success = await reduceProductQuantity(prod.id, qty);
      if (!success) {
        Alert.alert('Error', 'Failed to update inventory');
        return;
      }
      await addSale(saleData, cylinderSaleContext.syncStatus);
      if (cylinderSaleContext.syncStatus === 'online') {
        try {
          await fetchProducts();
        } catch (e) {
          console.error('Error refreshing products:', e);
        }
      }
      setAccessoryProductId(null);
      setAccessoryQuantity('1');
      if (accessoryStep === 'regulator') {
        setAccessoryStep(null);
        askAddBurnerAndGrill(cylinderSaleContext);
      } else {
        Alert.alert('Success', 'All sales recorded!', [
          { text: 'OK', onPress: () => finishAndExit(cylinderSaleContext.syncStatus) },
        ]);
      }
    } catch (error: any) {
      console.error('Error recording accessory sale:', error);
      Alert.alert('Error', error?.message || 'Failed to save sale. Please try again.');
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
                  Record Sale
                </Text>
                <Text variant="footnote" style={{ color: colors.mutedForeground, marginTop: 2 }}>
                  Record a new sale transaction
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
            {!currentUser ? (
              <View
                className="rounded-2xl px-5 py-12 items-center justify-center"
                style={{
                  backgroundColor: colors.background,
                  borderWidth: 0.5,
                  borderColor: withOpacity(colors.border, 0.2),
                }}>
                <Text variant="heading" style={{ color: colors.foreground, marginBottom: 8 }}>
                  Loading...
                </Text>
                <Text variant="subhead" color="tertiary" style={{ fontSize: 13.5, textAlign: 'center' }}>
                  Please wait while we load your account information
                </Text>
              </View>
            ) : saleMode === 'service' ? (
              <View className="gap-4">
                {/* Product vs Service - allow switching */}
                <View>
                  <Text variant="subhead" className="mb-2">What type of sale?</Text>
                  <View className="flex-row gap-2">
                    <Pressable onPress={() => setSaleMode('product')} style={({ pressed }) => ({ opacity: pressed ? 0.95 : 1, flex: 1 })}>
                      <View className="rounded-xl px-4 py-3 items-center" style={{ backgroundColor: colors.card, borderWidth: 0.5, borderColor: withOpacity(colors.border, 0.2) }}>
                        <Icon name="cube.fill" size={24} color={colors.primary} />
                        <Text style={{ fontSize: 13.5, color: colors.foreground, fontWeight: '400', marginTop: 4 }}>Product</Text>
                      </View>
                    </Pressable>
                    <Pressable onPress={() => {}} style={({ pressed }) => ({ opacity: pressed ? 0.95 : 1, flex: 1 })}>
                      <View className="rounded-xl px-4 py-3 items-center" style={{ backgroundColor: colors.primary, borderWidth: 0.5, borderColor: colors.primary }}>
                        <Icon name="wrench.and.screwdriver.fill" size={24} color={colors.primaryForeground} />
                        <Text style={{ fontSize: 13.5, color: colors.primaryForeground, fontWeight: '600', marginTop: 4 }}>Service</Text>
                      </View>
                    </Pressable>
                  </View>
                </View>

                <View
                  className="rounded-2xl px-5 py-4"
                  style={{
                    backgroundColor: colors.card,
                    borderWidth: 0.5,
                    borderColor: withOpacity(colors.border, 0.2),
                  }}>
                  <Text variant="subhead" color="tertiary" style={{ fontSize: 12, marginBottom: 4 }}>
                    Cylinder Refill (full gas cylinder with all metrics)
                  </Text>
                  <Text variant="heading" style={{ color: colors.foreground, fontWeight: '600', fontSize: 18 }}>
                    Record Cylinder Refill Service
                  </Text>
                </View>

                <View>
                  <Text variant="subhead" className="mb-2">Brand/Provider</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
                    <View className="flex-row gap-2">
                      {serviceBrands.map((brand) => {
                        const isSelected = serviceBrand === brand;
                        return (
                          <Pressable
                            key={brand}
                            onPress={() => setServiceBrand(brand)}
                            style={({ pressed }) => ({ opacity: pressed ? 0.95 : 1 })}>
                            <View
                              className="px-4 py-2.5 rounded-full"
                              style={{
                                backgroundColor: isSelected ? colors.primary : colors.card,
                                borderWidth: 0.5,
                                borderColor: withOpacity(colors.border, 0.2),
                              }}>
                              <Text
                                style={{
                                  fontSize: 13.5 * baseFontSize,
                                  color: isSelected ? colors.primaryForeground : colors.foreground,
                                  fontWeight: isSelected ? '600' : '400',
                                }}>
                                {brand}
                              </Text>
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>

                <View>
                  <Text variant="subhead" className="mb-2">Size</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
                    <View className="flex-row gap-2">
                      {serviceSizes.map((size) => {
                        const isSelected = serviceSize === size;
                        return (
                          <Pressable
                            key={size}
                            onPress={() => setServiceSize(size)}
                            style={({ pressed }) => ({ opacity: pressed ? 0.95 : 1 })}>
                            <View
                              className="px-4 py-2.5 rounded-full"
                              style={{
                                backgroundColor: isSelected ? colors.primary : colors.card,
                                borderWidth: 0.5,
                                borderColor: withOpacity(colors.border, 0.2),
                              }}>
                              <Text
                                style={{
                                  fontSize: 13.5 * baseFontSize,
                                  color: isSelected ? colors.primaryForeground : colors.foreground,
                                  fontWeight: isSelected ? '600' : '400',
                                }}>
                                {size}
                              </Text>
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>

                <View
                  className="rounded-2xl px-5 py-4"
                  style={{
                    backgroundColor: colors.card,
                    borderWidth: 0.5,
                    borderColor: withOpacity(colors.border, 0.2),
                  }}>
                  <Text variant="subhead" className="mb-2">Price ({settings.defaultCurrency || 'UGX'})</Text>
                  <Input
                    value={servicePrice}
                    onChangeText={setServicePrice}
                    placeholder="Enter price"
                    keyboardType="numeric"
                    style={{
                      backgroundColor: colors.background,
                      color: colors.foreground,
                      paddingHorizontal: 12,
                      paddingVertical: 12,
                      borderRadius: 12,
                    }}
                  />
                </View>

                <View>
                  <Text variant="subhead" className="mb-2">Payment Status</Text>
                  <View className="flex-row gap-2">
                    <Pressable
                      onPress={() => setPaymentStatus('credit')}
                      className="flex-1"
                      style={({ pressed }) => ({ opacity: pressed ? 0.95 : 1 })}>
                      <View
                        className="rounded-xl px-4 py-3 items-center"
                        style={{
                          backgroundColor: paymentStatus === 'credit' ? colors.primary : colors.card,
                          borderWidth: 0.5,
                          borderColor: withOpacity(colors.border, 0.2),
                        }}>
                        <Icon name="creditcard.fill" size={20} color={paymentStatus === 'credit' ? colors.primaryForeground : colors.primary} />
                        <Text style={{ fontSize: 13.5 * baseFontSize, color: paymentStatus === 'credit' ? colors.primaryForeground : colors.foreground, fontWeight: paymentStatus === 'credit' ? '600' : '400', marginTop: 4 }}>
                          Instant Payment
                        </Text>
                      </View>
                    </Pressable>
                    <Pressable
                      onPress={() => setPaymentStatus('promised')}
                      className="flex-1"
                      style={({ pressed }) => ({ opacity: pressed ? 0.95 : 1 })}>
                      <View
                        className="rounded-xl px-4 py-3 items-center"
                        style={{
                          backgroundColor: paymentStatus === 'promised' ? colors.primary : colors.card,
                          borderWidth: 0.5,
                          borderColor: withOpacity(colors.border, 0.2),
                        }}>
                        <Icon name="clock.fill" size={20} color={paymentStatus === 'promised' ? colors.primaryForeground : colors.primary} />
                        <Text style={{ fontSize: 13.5 * baseFontSize, color: paymentStatus === 'promised' ? colors.primaryForeground : colors.foreground, fontWeight: paymentStatus === 'promised' ? '600' : '400', marginTop: 4 }}>
                          Promised Payment
                        </Text>
                      </View>
                    </Pressable>
                  </View>
                </View>

                <View>
                  <Text variant="subhead" className="mb-3">Buyer Information (Optional)</Text>
                  <View className="gap-3">
                    <View className="rounded-2xl px-5 py-4" style={{ backgroundColor: colors.card, borderWidth: 0.5, borderColor: withOpacity(colors.border, 0.2) }}>
                      <Text variant="footnote" color="tertiary" className="mb-2" style={{ fontSize: 12 }}>Buyer Name</Text>
                      <Input value={buyerName} onChangeText={setBuyerName} placeholder="Enter buyer name" style={{ backgroundColor: colors.background, color: colors.foreground, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12 }} />
                    </View>
                    <View className="rounded-2xl px-5 py-4" style={{ backgroundColor: colors.card, borderWidth: 0.5, borderColor: withOpacity(colors.border, 0.2) }}>
                      <Text variant="footnote" color="tertiary" className="mb-2" style={{ fontSize: 12 }}>Buyer Contact</Text>
                      <Input value={buyerContact} onChangeText={setBuyerContact} placeholder="Enter buyer contact" keyboardType="phone-pad" style={{ backgroundColor: colors.background, color: colors.foreground, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12 }} />
                    </View>
                    <View className="rounded-2xl px-5 py-4" style={{ backgroundColor: colors.card, borderWidth: 0.5, borderColor: withOpacity(colors.border, 0.2) }}>
                      <Text variant="footnote" color="tertiary" className="mb-2" style={{ fontSize: 12 }}>Buyer Location</Text>
                      <Input value={buyerLocation} onChangeText={setBuyerLocation} placeholder="Enter buyer location" style={{ backgroundColor: colors.background, color: colors.foreground, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12 }} />
                    </View>
                  </View>
                </View>

                <View className="flex-row gap-3 mt-2">
                  <Button
                    onPress={() => handleRecordServiceSale('online')}
                    disabled={isProcessing || !servicePrice || !serviceBrand || !serviceSize || parseFloat(servicePrice) <= 0 || !servicePlaceholderProduct}
                    variant="primary"
                    className="flex-1"
                    loading={isProcessing}>
                    <Icon name="cloud.fill" size={16} color="#FFFFFF" />
                    <Text>Save</Text>
                  </Button>
                  <Button
                    onPress={() => handleRecordServiceSale('offline')}
                    disabled={isProcessing || !servicePrice || !serviceBrand || !serviceSize || parseFloat(servicePrice) <= 0 || !servicePlaceholderProduct}
                    variant="secondary"
                    className="flex-1"
                    loading={isProcessing}>
                    <Icon name="externaldrive.fill" size={16} color={colors.primary} />
                    <Text style={{ color: colors.primary }}>Save Offline</Text>
                  </Button>
                </View>
              </View>
            ) : isInAccessoryFlow && cylinderSaleContext ? (
              <View className="gap-4">
                <View
                  className="rounded-2xl px-5 py-4"
                  style={{
                    backgroundColor: colors.card,
                    borderWidth: 0.5,
                    borderColor: withOpacity(colors.border, 0.2),
                  }}>
                  <Text variant="subhead" color="tertiary" style={{ fontSize: 12, marginBottom: 4 }}>
                    Gas size from cylinder: {cylinderSaleContext.gasSize}
                  </Text>
                  <Text variant="heading" style={{ color: colors.foreground, fontWeight: '600', fontSize: 18 }}>
                    {accessoryStep === 'regulator' ? 'Add Regulator' : 'Add Burner and Grill'}
                  </Text>
                </View>
                {(() => {
                  const products = accessoryStep === 'regulator' ? regulatorProducts : burnerGrillProducts;
                  const selectedProd = accessoryProductId
                    ? products.find((p) => p.id === accessoryProductId)
                    : products[0];
                  if (products.length === 0) {
                    return (
                      <View
                        className="rounded-2xl px-5 py-12 items-center justify-center"
                        style={{
                          backgroundColor: colors.card,
                          borderWidth: 0.5,
                          borderColor: withOpacity(colors.border, 0.2),
                        }}>
                        <Text variant="subhead" color="tertiary" style={{ fontSize: 13.5, textAlign: 'center', marginBottom: 16 }}>
                          No {accessoryStep === 'regulator' ? 'regulators' : 'burners or grills'} available for {cylinderSaleContext.gasSize}
                        </Text>
                        <Button
                          variant="secondary"
                          onPress={() => (accessoryStep === 'regulator' ? askAddBurnerAndGrill(cylinderSaleContext) : finishAndExit(cylinderSaleContext.syncStatus))}>
                          <Text>Skip</Text>
                        </Button>
                      </View>
                    );
                  }
                  return (
                    <>
                      {products.length > 1 && (
                        <View>
                          <Text variant="subhead" className="mb-2">Select Product</Text>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
                            <View className="flex-row gap-2">
                              {products.map((p) => {
                                const isSelected = (accessoryProductId || products[0]?.id) === p.id;
                                return (
                                  <Pressable
                                    key={p.id}
                                    onPress={() => setAccessoryProductId(p.id)}
                                    style={({ pressed }) => ({ opacity: pressed ? 0.95 : 1 })}>
                                    <View
                                      className="px-4 py-2.5 rounded-full"
                                      style={{
                                        backgroundColor: isSelected ? colors.primary : colors.card,
                                        borderWidth: 0.5,
                                        borderColor: withOpacity(colors.border, 0.2),
                                      }}>
                                      <Text
                                        style={{
                                          fontSize: 13.5 * baseFontSize,
                                          color: isSelected ? colors.primaryForeground : colors.foreground,
                                          fontWeight: isSelected ? '600' : '400',
                                        }}
                                        numberOfLines={1}>
                                        {p.name} - {formatCurrency(p.price, p.currency)}
                                      </Text>
                                    </View>
                                  </Pressable>
                                );
                              })}
                            </View>
                          </ScrollView>
                        </View>
                      )}
                      {selectedProd && (
                        <>
                          <View
                            className="rounded-2xl px-5 py-5"
                            style={{
                              backgroundColor: colors.card,
                              borderWidth: 0.5,
                              borderColor: withOpacity(colors.border, 0.2),
                            }}>
                            <Text variant="heading" style={{ fontWeight: '500', fontSize: 14, marginBottom: 4 }}>
                              {selectedProd.name}
                            </Text>
                            <View className="flex-row items-center justify-between mt-2">
                              <Text variant="footnote" color="tertiary" style={{ fontSize: 12 }}>Available: {selectedProd.quantity}</Text>
                              <Text variant="body" style={{ fontSize: 14, fontWeight: '500', color: colors.primary }}>
                                {formatCurrency(selectedProd.price, selectedProd.currency)}
                              </Text>
                            </View>
                          </View>
                          <View
                            className="rounded-2xl px-5 py-4"
                            style={{
                              backgroundColor: colors.card,
                              borderWidth: 0.5,
                              borderColor: withOpacity(colors.border, 0.2),
                            }}>
                            <Text variant="subhead" className="mb-2">Quantity</Text>
                            <Input
                              value={accessoryQuantity}
                              onChangeText={setAccessoryQuantity}
                              placeholder="Enter quantity"
                              keyboardType="numeric"
                              style={{
                                backgroundColor: colors.background,
                                color: colors.foreground,
                                paddingHorizontal: 12,
                                paddingVertical: 12,
                                borderRadius: 12,
                              }}
                            />
                          </View>
                          <View className="flex-row gap-3">
                            <Button
                              variant="secondary"
                              onPress={() => accessoryStep === 'regulator' ? askAddBurnerAndGrill(cylinderSaleContext) : finishAndExit(cylinderSaleContext.syncStatus)}
                              className="flex-1">
                              <Text>Skip</Text>
                            </Button>
                            <Button
                              variant="primary"
                              onPress={() => handleRecordAccessorySale()}
                              disabled={isProcessing || !accessoryQuantity || !selectedProd || selectedProd.quantity < parseInt(accessoryQuantity || '0', 10)}
                              loading={isProcessing}
                              className="flex-1">
                              <Text>Record Sale</Text>
                            </Button>
                          </View>
                        </>
                      )}
                    </>
                  );
                })()}
              </View>
            ) : (
              <View className="gap-4">
                {/* First question: Product or Service */}
                <View>
                  <Text variant="subhead" className="mb-2">
                    What type of sale?
                  </Text>
                  <View className="flex-row gap-2">
                    <Pressable
                      onPress={() => setSaleMode('product')}
                      style={({ pressed }) => ({ opacity: pressed ? 0.95 : 1, flex: 1 })}>
                      <View
                        className="rounded-xl px-4 py-3 items-center"
                        style={{
                          backgroundColor: saleMode === 'product' ? colors.primary : colors.card,
                          borderWidth: 0.5,
                          borderColor: withOpacity(colors.border, 0.2),
                        }}>
                        <Icon name="cube.fill" size={24} color={saleMode === 'product' ? colors.primaryForeground : colors.primary} />
                        <Text style={{ fontSize: 13.5, color: saleMode === 'product' ? colors.primaryForeground : colors.foreground, fontWeight: saleMode === 'product' ? '600' : '400', marginTop: 4 }}>
                          Product
                        </Text>
                      </View>
                    </Pressable>
                    <Pressable
                      onPress={() => setSaleMode('service')}
                      style={({ pressed }) => ({ opacity: pressed ? 0.95 : 1, flex: 1 })}>
                      <View
                        className="rounded-xl px-4 py-3 items-center"
                        style={{
                          backgroundColor: saleMode === 'service' ? colors.primary : colors.card,
                          borderWidth: 0.5,
                          borderColor: withOpacity(colors.border, 0.2),
                        }}>
                        <Icon name="wrench.and.screwdriver.fill" size={24} color={saleMode === 'service' ? colors.primaryForeground : colors.primary} />
                        <Text style={{ fontSize: 13.5, color: saleMode === 'service' ? colors.primaryForeground : colors.foreground, fontWeight: saleMode === 'service' ? '600' : '400', marginTop: 4 }}>
                          Service
                        </Text>
                      </View>
                    </Pressable>
                  </View>
                </View>

                {saleMode === 'product' && (
                  <>
                    {/* Product sub-question: Single or New Kit */}
                    <View>
                      <Text variant="subhead" className="mb-2">
                        Sale type
                      </Text>
                      <View className="flex-row gap-2">
                        <Pressable
                          onPress={() => {
                            setProductSaleMode('single');
                            setProductType(productTypes[0] || 'Full Gas Cylinder');
                            setSelectedProduct(null);
                          }}
                          style={({ pressed }) => ({ opacity: pressed ? 0.95 : 1, flex: 1 })}>
                          <View
                            className="rounded-xl px-4 py-3 items-center"
                            style={{
                              backgroundColor: productSaleMode === 'single' ? colors.primary : colors.card,
                              borderWidth: 0.5,
                              borderColor: withOpacity(colors.border, 0.2),
                            }}>
                            <Text style={{ fontSize: 13.5, color: productSaleMode === 'single' ? colors.primaryForeground : colors.foreground, fontWeight: productSaleMode === 'single' ? '600' : '400' }}>
                              Single Product
                            </Text>
                          </View>
                        </Pressable>
                        <Pressable
                          onPress={() => {
                            setProductSaleMode('new_kit');
                            setProductType('Full Gas Cylinder');
                            setGasSize(gasSizes.find(s => s !== 'none' && s.includes('kg')) || gasSizes[0]);
                            setSelectedProduct(null);
                          }}
                          style={({ pressed }) => ({ opacity: pressed ? 0.95 : 1, flex: 1 })}>
                          <View
                            className="rounded-xl px-4 py-3 items-center"
                            style={{
                              backgroundColor: productSaleMode === 'new_kit' ? colors.primary : colors.card,
                              borderWidth: 0.5,
                              borderColor: withOpacity(colors.border, 0.2),
                            }}>
                            <Text style={{ fontSize: 13.5, color: productSaleMode === 'new_kit' ? colors.primaryForeground : colors.foreground, fontWeight: productSaleMode === 'new_kit' ? '600' : '400' }}>
                              New Kit
                            </Text>
                          </View>
                        </Pressable>
                      </View>
                      {productSaleMode === 'new_kit' && (
                        <Text variant="footnote" color="tertiary" style={{ marginTop: 4, fontSize: 12 }}>
                          Cylinder + all accessories (regulator, burner)
                        </Text>
                      )}
                    </View>
                  </>
                )}

                {(!productTypes || productTypes.length === 0 || !gasSizes || gasSizes.length === 0) && saleMode === 'product' && (
                  <View
                    className="rounded-2xl px-5 py-12 items-center justify-center"
                    style={{
                      backgroundColor: colors.card,
                      borderWidth: 0.5,
                      borderColor: withOpacity(colors.border, 0.2),
                    }}>
                    <View
                      className="h-16 w-16 items-center justify-center rounded-2xl mb-4"
                      style={{
                        backgroundColor: colors.card,
                      }}>
                      <Icon name="exclamationmark.triangle.fill" size={32} color={colors.primary} style={{ opacity: 0.5 }} />
                    </View>
                    <Text variant="subhead" style={{ fontWeight: '500', fontSize: 16, marginBottom: 4, textAlign: 'center' }}>
                      Configuration Required
                    </Text>
                    <Text variant="subhead" color="tertiary" style={{ fontSize: 13.5, textAlign: 'center' }}>
                      {(!productTypes || productTypes.length === 0) && (!gasSizes || gasSizes.length === 0)
                        ? 'Please configure product types and gas sizes in settings'
                        : !productTypes || productTypes.length === 0
                          ? 'Please configure product types in settings'
                          : 'Please configure gas sizes in settings'}
                    </Text>
                  </View>
                )}

                {productTypes && productTypes.length > 0 && (
                  <View>
                    <Text variant="subhead" className="mb-2">
                      Product Type
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ paddingRight: 20 }}>
                      <View className="flex-row gap-2">
                        {(productSaleMode === 'new_kit' ? ['Full Gas Cylinder'] : productTypes).map((type) => {
                          const isSelected = productType === type;
                          return (
                            <Pressable
                              key={type}
                              onPress={() => {
                                setProductType(type);
                                setSelectedProduct(null);
                                // Reset provider when type changes (only keep if it's Full Gas Cylinder)
                                if (type !== 'Full Gas Cylinder') {
                                  setProvider('all');
                                }
                                // Reset size when type changes (only for Full Gas Cylinder)
                                if (type === 'Full Gas Cylinder') {
                                  setGasSize(gasSizes.find(s => s !== 'none' && s.includes('kg')) || gasSizes[0]);
                                } else {
                                  setGasSize('none');
                                }
                              }}
                              style={({ pressed }) => ({
                                opacity: pressed ? 0.95 : 1,
                              })}>
                              <View
                                className="px-4 py-2.5 rounded-full"
                                style={{
                                  backgroundColor: isSelected ? colors.primary : colors.card,
                                  borderWidth: 0.5,
                                  borderColor: withOpacity(colors.border, 0.2),
                                }}>
                                <Text
                                  style={{
                                    fontSize: 13.5 * baseFontSize,
                                    color: isSelected ? colors.primaryForeground : colors.foreground,
                                    fontWeight: isSelected ? '600' : '400',
                                  }}>
                                  {type}
                                </Text>
                              </View>
                            </Pressable>
                          );
                        })}
                      </View>
                    </ScrollView>
                  </View>
                )}

                {/* Provider/Brand Filter - Only for Full Gas Cylinder */}
                {shouldShowProvider && providerOptions.length > 0 && (
                  <View>
                    <Text variant="subhead" className="mb-2">
                      Provider/Brand
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ paddingRight: 20 }}>
                      <View className="flex-row gap-2">
                        <Pressable
                          onPress={() => {
                            setProvider('all');
                            setSelectedProduct(null);
                          }}
                          style={({ pressed }) => ({
                            opacity: pressed ? 0.95 : 1,
                          })}>
                          <View
                            className="px-4 py-2.5 rounded-full"
                            style={{
                              backgroundColor: provider === 'all' ? colors.primary : colors.card,
                              borderWidth: 0.5,
                              borderColor: withOpacity(colors.border, 0.2),
                            }}>
                            <Text
                              style={{
                                fontSize: 13.5 * baseFontSize,
                                color: provider === 'all' ? colors.primaryForeground : colors.foreground,
                                fontWeight: provider === 'all' ? '600' : '400',
                              }}>
                              All Providers
                            </Text>
                          </View>
                        </Pressable>
                        {providerOptions.map((prov) => {
                          const isSelected = provider === prov;
                          return (
                            <Pressable
                              key={prov}
                              onPress={() => {
                                setProvider(prov);
                                setSelectedProduct(null);
                              }}
                              style={({ pressed }) => ({
                                opacity: pressed ? 0.95 : 1,
                              })}>
                              <View
                                className="px-4 py-2.5 rounded-full"
                                style={{
                                  backgroundColor: isSelected ? colors.primary : colors.card,
                                  borderWidth: 0.5,
                                  borderColor: withOpacity(colors.border, 0.2),
                                }}>
                                <Text
                                  style={{
                                    fontSize: 13.5 * baseFontSize,
                                    color: isSelected ? colors.primaryForeground : colors.foreground,
                                    fontWeight: isSelected ? '600' : '400',
                                  }}>
                                  {prov}
                                </Text>
                              </View>
                            </Pressable>
                          );
                        })}
                      </View>
                    </ScrollView>
                  </View>
                )}

                {/* Size Filter - Only for Full Gas Cylinder */}
                {shouldShowSize && gasSizes && gasSizes.length > 0 && (
                  <View>
                    <Text variant="subhead" className="mb-2">
                      Gas Size
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ paddingRight: 20 }}>
                      <View className="flex-row gap-2">
                        {gasSizes
                          .filter(size => {
                            // For Full Gas Cylinder, only show kg sizes
                            return size.includes('kg') || size === 'none';
                          })
                          .map((size) => {
                            const isSelected = gasSize === size;
                            return (
                              <Pressable
                                key={size}
                                onPress={() => {
                                  setGasSize(size);
                                  setSelectedProduct(null);
                                }}
                                style={({ pressed }) => ({
                                  opacity: pressed ? 0.95 : 1,
                                })}>
                                <View
                                  className="px-4 py-2.5 rounded-full"
                                  style={{
                                    backgroundColor: isSelected ? colors.primary : colors.card,
                                    borderWidth: 0.5,
                                    borderColor: withOpacity(colors.border, 0.2),
                                  }}>
                                  <Text
                                    style={{
                                      fontSize: 13.5 * baseFontSize,
                                      color: isSelected ? colors.primaryForeground : colors.foreground,
                                      fontWeight: isSelected ? '600' : '400',
                                    }}>
                                    {size === 'none' ? 'N/A' : size}
                                  </Text>
                                </View>
                              </Pressable>
                            );
                          })}
                      </View>
                    </ScrollView>
                  </View>
                )}

                {availableProducts.length > 0 && (
                  <>
                    {availableProducts.length > 1 && (
                      <View className="mb-6">
                        <Text variant="subhead" className="mb-2">
                          Select Product
                        </Text>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={{ paddingRight: 20 }}>
                          <View className="flex-row gap-2">
                            {availableProducts.map((p) => {
                              const isSelected = (selectedProduct || availableProducts[0].id) === p.id;
                              return (
                                <Pressable
                                  key={p.id}
                                  onPress={() => setSelectedProduct(p.id)}
                                  style={({ pressed }) => ({
                                    opacity: pressed ? 0.95 : 1,
                                  })}>
                                  <View
                                    className="px-4 py-2.5 rounded-full"
                                    style={{
                                      backgroundColor: isSelected ? colors.primary : colors.card,
                                      borderWidth: 0.5,
                                      borderColor: withOpacity(colors.border, 0.2),
                                    }}>
                                    <Text
                                      style={{
                                        fontSize: 13.5 * baseFontSize,
                                        color: isSelected ? colors.primaryForeground : colors.foreground,
                                        fontWeight: isSelected ? '600' : '400',
                                      }}
                                      numberOfLines={1}>
                                      {p.name} - {formatCurrency(p.price, p.currency)}
                                    </Text>
                                  </View>
                                </Pressable>
                              );
                            })}
                          </View>
                        </ScrollView>
                      </View>
                    )}

                    {product && (
                      <>
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
                              <Icon name="cube.fill" size={13.5 * 2} color={colors.primary} />
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
                                {product.name}
                              </Text>
                              {/* Provider info - Key for Full Gas Cylinder */}
                              {product.attributes?.type === 'Full Gas Cylinder' && product.attributes?.provider && (
                                <View className="flex-row items-center gap-1.5 mb-3">
                                  <View
                                    className="h-1.5 w-1.5 rounded-full"
                                    style={{ backgroundColor: colors.primary }}
                                  />
                                  <Text
                                    variant="subhead"
                                    style={{ fontSize: 13, fontWeight: '600' }}>
                                    {product.attributes.provider}
                                  </Text>
                                </View>
                              )}
                              {/* Size info - Only for Full Gas Cylinder */}
                              {product.attributes?.type === 'Full Gas Cylinder' && product.attributes?.size && product.attributes.size !== 'none' && (
                                <View className="flex-row items-center gap-1.5 mb-3">
                                  <View
                                    className="h-1.5 w-1.5 rounded-full"
                                    style={{ backgroundColor: colors.primary }}
                                  />
                                  <Text
                                    variant="subhead"
                                    color="tertiary"
                                    style={{ fontSize: 13 }}>
                                    {product.attributes.size}
                                  </Text>
                                </View>
                              )}
                              <View className="flex-row items-center justify-between mt-2">
                                <View>
                                  <Text
                                    variant="footnote"
                                    color="tertiary"
                                    style={{ fontSize: 12, marginBottom: 2 }}>
                                    Available Stock
                                  </Text>
                                  <Text
                                    variant="body"
                                    style={{
                                      fontSize: 13,
                                      fontWeight: '500',
                                    }}>
                                    {product.quantity}
                                  </Text>
                                </View>
                                <View className="items-end">
                                  <Text
                                    variant="footnote"
                                    color="tertiary"
                                    style={{ fontSize: 12, marginBottom: 2 }}>
                                    Unit Price
                                  </Text>
                                  <Text
                                    variant="body"
                                    style={{
                                      fontSize: 14,
                                      fontWeight: '500',
                                      color: colors.primary,
                                      letterSpacing: -0.2,
                                    }}
                                    numberOfLines={1}
                                    ellipsizeMode="tail">
                                    {formatCurrency(unitPrice, product.currency)}
                                  </Text>
                                </View>
                              </View>
                            </View>
                          </View>
                        </View>

                        <View>
                          <View
                            className="rounded-2xl px-5 py-4"
                            style={{
                              backgroundColor: colors.card,
                              borderWidth: 0.5,
                              borderColor: withOpacity(colors.border, 0.2),
                            }}>
                            <Text variant="subhead" className="mb-2">
                              Quantity
                            </Text>
                            <Input
                              value={quantity}
                              onChangeText={setQuantity}
                              placeholder="Enter quantity"
                              keyboardType="numeric"
                              style={{
                                backgroundColor: colors.background,
                                color: colors.foreground,
                                paddingHorizontal: 12,
                                paddingVertical: 12,
                                borderRadius: 12,
                              }}
                            />
                          </View>
                        </View>

                        {/* Total Price Override Section */}
                        <View>
                          <View
                            className="rounded-2xl px-5 py-4"
                            style={{
                              backgroundColor: colors.card,
                              borderWidth: 0.5,
                              borderColor: withOpacity(colors.border, 0.2),
                            }}>
                            <View className="flex-row items-center justify-between mb-2">
                              <Text variant="subhead">
                                Total Price
                              </Text>
                              <Pressable
                                onPress={() => {
                                  if (isTotalPriceOverridden) {
                                    setIsTotalPriceOverridden(false);
                                    setOverrideTotalPrice('');
                                  } else {
                                    setIsTotalPriceOverridden(true);
                                    setOverrideTotalPrice(calculatedTotalPrice.toString());
                                  }
                                }}
                                style={({ pressed }) => ({
                                  opacity: pressed ? 0.7 : 1,
                                })}>
                                <Text
                                  variant="footnote"
                                  style={{
                                    color: colors.primary,
                                    fontSize: 12,
                                  }}>
                                  {isTotalPriceOverridden ? 'Use Calculated' : 'Override Total'}
                                </Text>
                              </Pressable>
                            </View>
                            {isTotalPriceOverridden ? (
                              <Input
                                value={overrideTotalPrice}
                                onChangeText={(text) => {
                                  setOverrideTotalPrice(text);
                                }}
                                placeholder={`Calculated: ${formatCurrency(calculatedTotalPrice, product.currency)}`}
                                keyboardType="decimal-pad"
                                style={{
                                  backgroundColor: colors.background,
                                  color: colors.foreground,
                                  paddingHorizontal: 12,
                                  paddingVertical: 12,
                                  borderRadius: 12,
                                }}
                              />
                            ) : (
                              <View
                                style={{
                                  backgroundColor: colors.background,
                                  paddingHorizontal: 12,
                                  paddingVertical: 12,
                                  borderRadius: 12,
                                }}>
                                <Text
                                  style={{
                                    color: colors.foreground,
                                    fontSize: 14,
                                  }}>
                                  {formatCurrency(calculatedTotalPrice, product.currency)}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>

                        {/* Extra Costs Section */}
                        <View>
                          <View
                            className="rounded-2xl px-5 py-4"
                            style={{
                              backgroundColor: colors.card,
                              borderWidth: 0.5,
                              borderColor: withOpacity(colors.border, 0.2),
                            }}>
                            <Text variant="subhead" className="mb-2">
                              Extra Costs (Optional)
                            </Text>
                            <Text variant="footnote" color="tertiary" className="mb-2" style={{ fontSize: 12 }}>
                              Deducted from total (e.g. delivery discount, embedded costs)
                            </Text>
                            <Input
                              value={extraCosts}
                              onChangeText={setExtraCosts}
                              placeholder={`e.g., ${formatCurrency(0, product.currency)}`}
                              keyboardType="decimal-pad"
                              style={{
                                backgroundColor: colors.background,
                                color: colors.foreground,
                                paddingHorizontal: 12,
                                paddingVertical: 12,
                                borderRadius: 12,
                              }}
                            />
                          </View>
                        </View>

                        {quantity && !isNaN(parseInt(quantity, 10)) && (
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
                                <Icon name="dollarsign.circle.fill" size={13.5 * 2} color={colors.primary} />
                              </View>
                              <View style={{ flex: 1, minWidth: 0 }}>
                                <Text
                                  variant="footnote"
                                  color="tertiary"
                                  style={{ fontSize: 12, marginBottom: 4 }}>
                                  Total Price
                                </Text>
                                <Text
                                  variant="heading"
                                  style={{
                                    fontWeight: '500',
                                    fontSize: 24,
                                    color: colors.primary,
                                    letterSpacing: -0.4,
                                    includeFontPadding: false,
                                  }}
                                  allowFontScaling={false}>
                                  {formatCurrency(totalPrice, product.currency)}
                                  {isTotalPriceOverridden && (
                                    <Text variant="footnote" color="tertiary" style={{ fontSize: 12, marginLeft: 6 }}>
                                      (override)
                                    </Text>
                                  )}
                                </Text>
                                <Text
                                  variant="subhead"
                                  color="tertiary"
                                  style={{ fontSize: 13, marginTop: 4 }}
                                  numberOfLines={1}
                                  ellipsizeMode="tail">
                                  {quantity} × {formatCurrency(unitPrice, product.currency)}
                                  {extraCosts && parseFloat(extraCosts) > 0 && (
                                    <Text variant="subhead" color="tertiary" style={{ fontSize: 13 }}>
                                      {' − '}{formatCurrency(parseFloat(extraCosts), product.currency)}
                                    </Text>
                                  )}
                                  {isTotalPriceOverridden && (
                                    <Text variant="subhead" color="tertiary" style={{ fontSize: 13 }}>
                                      {' = '}{formatCurrency(calculatedTotalPrice, product.currency)} (calculated)
                                    </Text>
                                  )}
                                </Text>
                              </View>
                            </View>
                          </View>
                        )}

                        <View>
                          <Text variant="subhead" className="mb-2">
                            Payment Status
                          </Text>
                          <View className="flex-row gap-2">
                            <Pressable
                              onPress={() => setPaymentStatus('credit')}
                              className="flex-1"
                              style={({ pressed }) => ({
                                opacity: pressed ? 0.95 : 1,
                              })}>
                              <View
                                className="rounded-xl px-4 py-3 items-center"
                                style={{
                                  backgroundColor: paymentStatus === 'credit' ? colors.primary : colors.card,
                                  borderWidth: 0.5,
                                  borderColor: withOpacity(colors.border, 0.2),
                                }}>
                                <Icon
                                  name="creditcard.fill"
                                  size={20}
                                  color={paymentStatus === 'credit' ? colors.primaryForeground : colors.primary}
                                />
                                <Text
                                  style={{
                                    fontSize: 13.5 * baseFontSize,
                                    color: paymentStatus === 'credit' ? colors.primaryForeground : colors.foreground,
                                    fontWeight: paymentStatus === 'credit' ? '600' : '400',
                                    marginTop: 4,
                                  }}>
                                  Instant Payment
                                </Text>
                              </View>
                            </Pressable>
                            <Pressable
                              onPress={() => setPaymentStatus('promised')}
                              className="flex-1"
                              style={({ pressed }) => ({
                                opacity: pressed ? 0.95 : 1,
                              })}>
                              <View
                                className="rounded-xl px-4 py-3 items-center"
                                style={{
                                  backgroundColor: paymentStatus === 'promised' ? colors.primary : colors.card,
                                  borderWidth: 0.5,
                                  borderColor: withOpacity(colors.border, 0.2),
                                }}>
                                <Icon
                                  name="clock.fill"
                                  size={20}
                                  color={paymentStatus === 'promised' ? colors.primaryForeground : colors.primary}
                                />
                                <Text
                                  style={{
                                    fontSize: 13.5 * baseFontSize,
                                    color: paymentStatus === 'promised' ? colors.primaryForeground : colors.foreground,
                                    fontWeight: paymentStatus === 'promised' ? '600' : '400',
                                    marginTop: 4,
                                  }}>
                                  Promised Payment
                                </Text>
                              </View>
                            </Pressable>
                          </View>
                        </View>

                        {/* Buyer Information (Optional) */}
                        <View>
                          <Text variant="subhead" className="mb-3">
                            Buyer Information (Optional)
                          </Text>
                          <View className="gap-3">
                            <View
                              className="rounded-2xl px-5 py-4"
                              style={{
                                backgroundColor: colors.card,
                                borderWidth: 0.5,
                                borderColor: withOpacity(colors.border, 0.2),
                              }}>
                              <Text variant="footnote" color="tertiary" className="mb-2" style={{ fontSize: 12 }}>
                                Buyer Name
                              </Text>
                              <Input
                                value={buyerName}
                                onChangeText={setBuyerName}
                                placeholder="Enter buyer name"
                                style={{
                                  backgroundColor: colors.background,
                                  color: colors.foreground,
                                  paddingHorizontal: 12,
                                  paddingVertical: 12,
                                  borderRadius: 12,
                                }}
                              />
                            </View>
                            <View
                              className="rounded-2xl px-5 py-4"
                              style={{
                                backgroundColor: colors.card,
                                borderWidth: 0.5,
                                borderColor: withOpacity(colors.border, 0.2),
                              }}>
                              <Text variant="footnote" color="tertiary" className="mb-2" style={{ fontSize: 12 }}>
                                Buyer Contact
                              </Text>
                              <Input
                                value={buyerContact}
                                onChangeText={setBuyerContact}
                                placeholder="Enter buyer contact"
                                keyboardType="phone-pad"
                                style={{
                                  backgroundColor: colors.background,
                                  color: colors.foreground,
                                  paddingHorizontal: 12,
                                  paddingVertical: 12,
                                  borderRadius: 12,
                                }}
                              />
                            </View>
                            <View
                              className="rounded-2xl px-5 py-4"
                              style={{
                                backgroundColor: colors.card,
                                borderWidth: 0.5,
                                borderColor: withOpacity(colors.border, 0.2),
                              }}>
                              <Text variant="footnote" color="tertiary" className="mb-2" style={{ fontSize: 12 }}>
                                Buyer Location
                              </Text>
                              <Input
                                value={buyerLocation}
                                onChangeText={setBuyerLocation}
                                placeholder="Enter buyer location"
                                style={{
                                  backgroundColor: colors.background,
                                  color: colors.foreground,
                                  paddingHorizontal: 12,
                                  paddingVertical: 12,
                                  borderRadius: 12,
                                }}
                              />
                            </View>
                          </View>
                        </View>

                        <View className="flex-row gap-3 mt-2">
                          <Button
                            onPress={() => handleRecordSale('online')}
                            disabled={
                              isProcessing ||
                              isLoadingSales ||
                              !quantity ||
                              !product ||
                              product.quantity < parseInt(quantity || '0', 10)
                            }
                            variant="primary"
                            className="flex-1"
                            loading={isProcessing || isLoadingSales}>
                            <Icon name="cloud.fill" size={16} color="#FFFFFF" />
                            <Text>Save</Text>
                          </Button>
                          <Button
                            onPress={() => handleRecordSale('offline')}
                            disabled={
                              isProcessing ||
                              isLoadingSales ||
                              !quantity ||
                              !product ||
                              product.quantity < parseInt(quantity || '0', 10)
                            }
                            variant="secondary"
                            className="flex-1"
                            loading={isProcessing || isLoadingSales}>
                            <Icon name="externaldrive.fill" size={16} color={colors.primary} />
                            <Text style={{ color: colors.primary }}>Save Offline</Text>
                          </Button>
                        </View>
                      </>
                    )}
                  </>
                )}

                {availableProducts.length === 0 && (
                  <View
                    className="rounded-2xl px-5 py-12 items-center justify-center"
                    style={{
                      backgroundColor: colors.card,
                      borderWidth: 0.5,
                      borderColor: withOpacity(colors.border, 0.2),
                    }}>
                    <View
                      className="h-16 w-16 items-center justify-center rounded-2xl mb-4"
                      style={{
                        backgroundColor: colors.card,
                      }}>
                      <Icon name="shippingbox" size={32} color={colors.primary} style={{ opacity: 0.5 }} />
                    </View>
                    <Text variant="subhead" color="tertiary" style={{ fontSize: 13.5 }}>
                      No products available for this selection
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      {/* Accessory prompt bottom sheet */}
      <BottomSheet
        visible={showAccessoryPromptSheet}
        onClose={handleAccessoryPromptClose}
        title={
          accessoryPromptType === 'regulator'
            ? 'Would you like to add a regulator for this cylinder?'
            : 'Would you like to add a burner and grill for this cylinder?'
        }
        options={[
          { label: 'Yes', value: 'yes' },
          { label: 'No, skip', value: 'no' },
        ]}
        onSelect={handleAccessoryPromptSelect}
        cancelLabel="Cancel"
      />
      {/* Loading Overlay */}
      {(isProcessing || isLoadingSales) && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}>
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 12,
              padding: 24,
              alignItems: 'center',
              gap: 16,
              minWidth: 120,
            }}>
            <ActivityIndicator size="large" />
            <Text style={{ color: colors.foreground, fontSize: 16 }}>
              Processing sale...
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
