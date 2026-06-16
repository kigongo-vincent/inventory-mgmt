import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/nativewindui/Button';
import { Icon } from '@/components/nativewindui/Icon';
import { Input } from '@/components/nativewindui/Input';
import { SegmentedPicker } from '@/components/nativewindui/SegmentedPicker';
import { Text } from '@/components/nativewindui/Text';
import { compressImage } from '@/lib/utils/imageCompression';
import { uploadToCloudinary } from '@/lib/utils/cloudinary';
import { useColorScheme } from '@/lib/useColorScheme';
import { useAuthStore } from '@/store/authStore';
import { useProductStore } from '@/store/productStore';
import { useSettingsStore } from '@/store/settingsStore';
import { withOpacity } from '@/theme/with-opacity';
import { GasSize, ProductType } from '@/types';

export default function EditProductScreen() {
  const { colors, colorScheme } = useColorScheme();
  const params = useLocalSearchParams<{ productId?: string }>();

  const currentUser = useAuthStore((state) => state.currentUser);
  const products = useProductStore((state) => state.products);
  const updateProduct = useProductStore((state) => state.updateProduct);
  const fetchProductsByCompany = useProductStore((state) => state.fetchProductsByCompany);
  const isLoadingProducts = useProductStore((state) => state.isLoading);
  const settings = useSettingsStore((state) => state.settings);

  const [productType, setProductType] = useState<ProductType>('');
  const [gasSize, setGasSize] = useState<GasSize>('');
  const [provider, setProvider] = useState('');
  const [customProvider, setCustomProvider] = useState('');
  const [showCustomProviderInput, setShowCustomProviderInput] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [productImageUri, setProductImageUri] = useState<string | undefined>(undefined);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isLoadingImage, setIsLoadingImage] = useState(false);

  const selectedProduct = useMemo(
    () => products.find((item) => item.id === params.productId) || null,
    [params.productId, products]
  );

  const productProperties = settings.productProperties || [];
  const providerProperty = productProperties.find((p) => p.id === 'prop_provider');
  const typeProperty = productProperties.find((p) => p.id === 'prop_type');
  const productTypes = typeProperty?.options && typeProperty.options.length > 0
    ? typeProperty.options
    : settings.productTypes || [];
  const gasSizes = settings.gasSizes || [];
  const providerOptions = useMemo(() => {
    const providerSet = new Set<string>();

    if (providerProperty?.options) {
      providerProperty.options.filter(Boolean).forEach((option) => providerSet.add(option));
    }

    products.forEach((product) => {
      const productProvider = product.attributes?.provider;
      if (productProvider && productProvider !== 'Other') {
        providerSet.add(productProvider);
      }
    });

    const sortedOptions = Array.from(providerSet)
      .filter((option) => option !== 'Other')
      .sort((a, b) => a.localeCompare(b));

    if (providerSet.has('Other')) sortedOptions.push('Other');
    return sortedOptions;
  }, [providerProperty, products]);
  const filteredProductTypes = useMemo(
    () => productTypes.filter((type) => type !== 'New Kit' && type !== 'Cylinder Refill'),
    [productTypes]
  );

  useEffect(() => {
    if (!selectedProduct) return;

    const initialType = selectedProduct.attributes?.type || selectedProduct.name || filteredProductTypes[0] || '';
    setProductType(initialType as ProductType);

    const initialGasSize = selectedProduct.attributes?.size || selectedProduct.attributes?.gasSize || 'none';
    setGasSize(initialGasSize as GasSize);

    const currentProvider = selectedProduct.attributes?.provider || '';
    if (currentProvider && providerOptions.includes(currentProvider)) {
      setProvider(currentProvider);
      setCustomProvider('');
      setShowCustomProviderInput(false);
    } else if (currentProvider && currentProvider !== 'Other') {
      setProvider('Other');
      setCustomProvider(currentProvider);
      setShowCustomProviderInput(true);
    } else {
      setProvider(currentProvider || '');
      setCustomProvider('');
      setShowCustomProviderInput(currentProvider === 'Other');
    }

    setQuantity(String(selectedProduct.quantity ?? ''));
    setPrice(String(selectedProduct.price ?? ''));
    setProductImageUri(selectedProduct.imageUri);
  }, [selectedProduct, filteredProductTypes]);

  useEffect(() => {
    if (filteredProductTypes.length > 0 && !productType) {
      setProductType(filteredProductTypes[0] as ProductType);
    }
  }, [filteredProductTypes, productType]);

  const shouldShowSize = productType === 'Full Gas Cylinder' || productType === 'Regulator';
  const shouldShowProvider = productType === 'Full Gas Cylinder' || productType === 'Regulator';
  const shouldShowPlateCount = productType === 'Gas Plate';

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow photo access to change the product image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;

      setIsUploadingImage(true);
      const compressed = await compressImage(result.assets[0].uri, 1200, 1200);
      const uploaded = await uploadToCloudinary(
        compressed.uri,
        'products',
        `product_${currentUser?.companyId || 'default'}_${Date.now()}`
      );
      setProductImageUri(uploaded.secure_url || uploaded.url);
    } catch (error) {
      console.error('Image upload failed:', error);
      Alert.alert('Error', 'Failed to upload image. Please try again.');
    } finally {
      setIsUploadingImage(false);
      setIsLoadingImage(false);
    }
  };

  const handleUpdateProduct = async () => {
    if (!selectedProduct?.id) {
      Alert.alert('Error', 'No product selected.');
      return;
    }

    const qty = parseInt(quantity, 10);
    const priceValue = parseFloat(price);

    if (!productType) {
      Alert.alert('Error', 'Please select a product type.');
      return;
    }

    if (Number.isNaN(qty) || qty < 0) {
      Alert.alert('Error', 'Please enter a valid quantity.');
      return;
    }

    if (Number.isNaN(priceValue) || priceValue <= 0) {
      Alert.alert('Error', 'Please enter a valid price.');
      return;
    }

    const validProvider = provider === 'Other' ? customProvider.trim() : provider;

    try {
      const attributes: Record<string, any> = {
        ...(selectedProduct.attributes || {}),
        type: productType,
        category: 'Product',
      };

      if (shouldShowSize || shouldShowPlateCount) {
        attributes.size = gasSize || 'none';
      } else {
        attributes.size = 'none';
      }

      if (shouldShowProvider) {
        if (validProvider) {
          attributes.provider = validProvider;
        } else {
          delete attributes.provider;
        }
      }

      await updateProduct(selectedProduct.id, {
        name: productType,
        price: priceValue,
        quantity: qty,
        imageUri: productImageUri,
        attributes,
      });

      if (currentUser?.companyId) {
        await fetchProductsByCompany(currentUser.companyId);
      }

      Alert.alert('Success', 'Product updated successfully', [
        { text: 'Done', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('Error updating product:', error);
      Alert.alert('Error', error?.message || 'Failed to update product. Please try again.');
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <View style={{ backgroundColor: colors.card }}>
        <SafeAreaView edges={['top']}>
          <View className="px-5 pt-5 pb-6">
            <View className="flex-row items-center gap-3">
              <Pressable onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.input || colors.background, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border || colors.mutedForeground }}>
                  <Icon name="chevron.left" size={20} color={colors.foreground} />
                </View>
              </Pressable>
              <View className="flex-1">
                <Text variant="heading" style={{ color: colors.foreground, fontWeight: '500', fontSize: 20, letterSpacing: -0.3 }}>Edit Product</Text>
                <Text variant="footnote" style={{ color: colors.mutedForeground, marginTop: 2 }}>Update inventory details</Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: Math.max(40, 24 + 20) }}>
          <View className="gap-4">
            <View className="rounded-2xl px-5 py-4" style={{ backgroundColor: colors.card, borderWidth: 0.5, borderColor: withOpacity(colors.border, 0.2) }}>
              <Text variant="subhead" className="mb-2">Product Type</Text>
              <SegmentedPicker
                options={filteredProductTypes.map((type) => ({ label: type, value: type }))}
                selectedValue={productType}
                onValueChange={(value) => setProductType(value as ProductType)}
              />
            </View>

            {shouldShowProvider && (
              <View className="rounded-2xl px-5 py-4" style={{ backgroundColor: colors.card, borderWidth: 0.5, borderColor: withOpacity(colors.border, 0.2) }}>
                <Text variant="subhead" className="mb-2">Provider/Brand</Text>
                <SegmentedPicker
                  options={[
                    { label: 'None', value: '' },
                    ...providerOptions.map((prov) => ({ label: prov, value: prov })),
                  ]}
                  selectedValue={provider}
                  onValueChange={(value) => {
                    setProvider(value);
                    if (value === 'Other') {
                      setShowCustomProviderInput(true);
                      setCustomProvider('');
                    } else {
                      setShowCustomProviderInput(false);
                    }
                  }}
                />
                {showCustomProviderInput && provider === 'Other' && (
                  <View className="mt-3">
                    <Text variant="subhead" className="mb-2">Enter Provider Name</Text>
                    <Input
                      value={customProvider}
                      onChangeText={setCustomProvider}
                      placeholder="e.g., Shell, Hass Petroleum"
                      autoCapitalize="words"
                    />
                  </View>
                )}
              </View>
            )}

            {shouldShowSize && gasSizes.length > 0 && (
              <View className="rounded-2xl px-5 py-4" style={{ backgroundColor: colors.card, borderWidth: 0.5, borderColor: withOpacity(colors.border, 0.2) }}>
                <Text variant="subhead" className="mb-2">Gas Size</Text>
                <SegmentedPicker
                  options={gasSizes.map((size) => ({ label: size, value: size }))}
                  selectedValue={gasSize}
                  onValueChange={(value) => setGasSize(value as GasSize)}
                />
              </View>
            )}

            {shouldShowPlateCount && (
              <View className="rounded-2xl px-5 py-4" style={{ backgroundColor: colors.card, borderWidth: 0.5, borderColor: withOpacity(colors.border, 0.2) }}>
                <Text variant="subhead" className="mb-2">Plate Count</Text>
                <SegmentedPicker
                  options={[
                    { label: '2 Plates', value: '2 plates' },
                    { label: '3 Plates', value: '3 plates' },
                  ]}
                  selectedValue={gasSize || '2 plates'}
                  onValueChange={(value) => setGasSize(value as GasSize)}
                />
              </View>
            )}

            <View className="rounded-2xl px-5 py-4" style={{ backgroundColor: colors.card, borderWidth: 0.5, borderColor: withOpacity(colors.border, 0.2) }}>
              <Text variant="subhead" className="mb-2">Quantity</Text>
              <Input
                value={quantity}
                onChangeText={(text) => setQuantity(text.replace(/\D/g, ''))}
                placeholder="Enter quantity"
                keyboardType="number-pad"
              />
            </View>

            <View className="rounded-2xl px-5 py-4" style={{ backgroundColor: colors.card, borderWidth: 0.5, borderColor: withOpacity(colors.border, 0.2) }}>
              <Text variant="subhead" className="mb-2">Price ({settings.defaultCurrency || 'UGX'})</Text>
              <Input
                value={price}
                onChangeText={setPrice}
                placeholder="Enter price"
                keyboardType="decimal-pad"
              />
            </View>

            <View className="rounded-2xl px-5 py-4" style={{ backgroundColor: colors.card, borderWidth: 0.5, borderColor: withOpacity(colors.border, 0.2) }}>
              <Text variant="subhead" className="mb-2">Product Image</Text>
              <Pressable onPress={pickImage} disabled={isUploadingImage} style={{ opacity: isUploadingImage ? 0.6 : 1 }}>
                <View className="h-32 w-full rounded-xl items-center justify-center overflow-hidden relative" style={{ backgroundColor: colors.background, borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed' }}>
                  {isLoadingImage || isUploadingImage ? (
                    <View className="w-full h-full items-center justify-center" style={{ backgroundColor: colors.input }}>
                      <Icon name="photo.fill" size={32} color={colors.primary} />
                    </View>
                  ) : productImageUri ? (
                    <Image source={{ uri: productImageUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  ) : (
                    <View className="items-center gap-2">
                      <Icon name="photo.fill" size={32} color={colors.mutedForeground} />
                      <Text variant="footnote" color="tertiary">Tap to change the image</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            </View>

            <Button onPress={handleUpdateProduct} loading={isLoadingProducts || isUploadingImage} disabled={isUploadingImage} className="w-full self-stretch" style={{ width: '100%', alignSelf: 'stretch' }}>
              <Text>{isUploadingImage ? 'Uploading...' : 'Save Changes'}</Text>
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
