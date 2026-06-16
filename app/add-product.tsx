import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
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

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function AddProductScreen() {
  const { colors, colorScheme } = useColorScheme();

  const currentUser = useAuthStore((state) => state.currentUser);
  const addProduct = useProductStore((state) => state.addProduct);
  const fetchProductsByCompany = useProductStore((state) => state.fetchProductsByCompany);
  const isLoadingProducts = useProductStore((state) => state.isLoading);
  const settings = useSettingsStore((state) => state.settings);

  const productProperties = settings.productProperties || [];
  const typeProperty = productProperties.find((p) => p.id === 'prop_type');
  const providerProperty = productProperties.find((p) => p.id === 'prop_provider');
  const productTypes = typeProperty?.options && typeProperty.options.length > 0 ? typeProperty.options : settings.productTypes || [];
  const gasSizes = settings.gasSizes || [];

  const providerOptions = useMemo(() => {
    const baseOptions = providerProperty?.options && providerProperty.options.length > 0
      ? [...providerProperty.options]
      : settings.serviceBrands && settings.serviceBrands.length > 0
        ? [...settings.serviceBrands, 'Other']
        : [
          'Vivo Energy (Shell)',
          'TotalEnergies',
          'Stabex International',
          'Oryx Energies',
          'Rubis Energy',
          'Hass Petroleum',
          'Lake Gas Uganda',
          'Gaz Uganda',
          'Petro Uganda',
          'Ven Petroleum',
          'Afrigaz',
          'Kampala Gas',
          'K-Gas',
          'Jibu Gas',
          'Other',
        ];

    const uniqueOptions = Array.from(new Set(baseOptions.filter(Boolean)));
    if (!uniqueOptions.includes('Other')) uniqueOptions.push('Other');
    return uniqueOptions;
  }, [providerProperty, settings.serviceBrands]);

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

  const filteredProductTypes = useMemo(
    () => productTypes.filter((type) => type !== 'New Kit' && type !== 'Cylinder Refill'),
    [productTypes]
  );

  useEffect(() => {
    if (filteredProductTypes.length > 0 && !productType) {
      setProductType(filteredProductTypes[0]);
    }
  }, [filteredProductTypes, productType]);

  const shouldShowSize = productType === 'Full Gas Cylinder' || productType === 'Regulator';
  const shouldShowProvider = productType === 'Full Gas Cylinder' || productType === 'Regulator';

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission needed', 'Please allow access to your photo library to upload an image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (result.canceled || !result.assets?.[0]?.uri) return;

    try {
      setIsUploadingImage(true);
      const compressed = await compressImage(result.assets[0].uri, 800, 800);
      const uploaded = await uploadToCloudinary(compressed);
      setProductImageUri(uploaded.secure_url || uploaded.url);
    } catch (error) {
      console.error('Image upload failed:', error);
      Alert.alert('Error', 'Failed to upload image.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleAddProduct = async () => {
    if (!currentUser?.companyId) {
      Alert.alert('Error', 'Please sign in again to continue.');
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

    if (Number.isNaN(priceValue) || priceValue < 0) {
      Alert.alert('Error', 'Please enter a valid price.');
      return;
    }

    const validProvider = provider === 'Other' ? customProvider.trim() : provider;

    try {
      await addProduct({
        name: productType,
        price: priceValue,
        currency: settings.defaultCurrency || 'UGX',
        company: currentUser.company || '',
        companyId: currentUser.companyId,
        quantity: qty,
        imageUri: productImageUri,
        attributes: {
          type: productType,
          size: shouldShowSize ? (gasSize || 'none') : 'none',
          provider: shouldShowProvider ? validProvider : '',
          category: 'Product',
        },
      }, 'online');

      Alert.alert('Success', 'Product added successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);

      if (currentUser.companyId) {
        await fetchProductsByCompany(currentUser.companyId);
      }
    } catch (error: any) {
      console.error('Error adding product:', error);
      Alert.alert('Error', error?.message || 'Failed to add product. Please try again.');
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
                <Text variant="heading" style={{ color: colors.foreground, fontWeight: '500', fontSize: 20, letterSpacing: -0.3 }}>Add Product</Text>
                <Text variant="footnote" style={{ color: colors.mutedForeground, marginTop: 2 }}>Create a product in inventory</Text>
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
                {/* Horizontally scrollable chip list — scales with the full Uganda provider list */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 8, gap: 8, flexDirection: 'row' }}>
                  {/* None chip */}
                  {[{ label: 'None', value: '' }, ...providerOptions.map((prov) => ({ label: prov, value: prov }))].map((opt) => {
                    const isSelected = provider === opt.value;
                    return (
                      <Pressable
                        key={opt.value || '__none__'}
                        onPress={() => {
                          setProvider(opt.value);
                          if (opt.value === 'Other') {
                            setShowCustomProviderInput(true);
                            setCustomProvider('');
                          } else {
                            setShowCustomProviderInput(false);
                          }
                        }}
                        style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
                        <View
                          className="px-4 py-2.5 rounded-full"
                          style={{
                            backgroundColor: isSelected ? colors.primary : colors.background,
                            borderWidth: 0.5,
                            borderColor: isSelected ? colors.primary : withOpacity(colors.border, 0.3),
                          }}>
                          <Text
                            style={{
                              fontSize: 13.5,
                              color: isSelected ? colors.primaryForeground : colors.foreground,
                              fontWeight: isSelected ? '600' : '400',
                              whiteSpace: 'nowrap',
                            }}>
                            {opt.label}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                {showCustomProviderInput && provider === 'Other' && (
                  <View className="mt-3">
                    <Text variant="subhead" className="mb-2">Enter Provider Name</Text>
                    <Input
                      value={customProvider}
                      onChangeText={setCustomProvider}
                      placeholder="e.g., My Local Gas Co."
                      autoCapitalize="words"
                      style={{ backgroundColor: colors.background, color: colors.foreground, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12 }}
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

            <View className="rounded-2xl px-5 py-4" style={{ backgroundColor: colors.card, borderWidth: 0.5, borderColor: withOpacity(colors.border, 0.2) }}>
              <Text variant="subhead" className="mb-2">Quantity</Text>
              <Input
                value={quantity}
                onChangeText={(text) => setQuantity(text.replace(/\D/g, ''))}
                placeholder="Enter quantity"
                keyboardType="number-pad"
                style={{ backgroundColor: colors.background, color: colors.foreground, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12 }}
              />
            </View>

            <View className="rounded-2xl px-5 py-4" style={{ backgroundColor: colors.card, borderWidth: 0.5, borderColor: withOpacity(colors.border, 0.2) }}>
              <Text variant="subhead" className="mb-2">Price ({settings.defaultCurrency || 'UGX'})</Text>
              <Input
                value={price}
                onChangeText={setPrice}
                placeholder="Enter price"
                keyboardType="decimal-pad"
                style={{ backgroundColor: colors.background, color: colors.foreground, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12 }}
              />
            </View>

            {/* <View className="rounded-2xl px-5 py-4" style={{ backgroundColor: colors.card, borderWidth: 0.5, borderColor: withOpacity(colors.border, 0.2) }}>
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
                      <Text variant="footnote" color="tertiary">Tap to add product image</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            </View> */}

            <Button onPress={handleAddProduct} loading={isLoadingProducts || isUploadingImage} disabled={isUploadingImage} className="w-full self-stretch" style={{ width: '100%', alignSelf: 'stretch' }}>
              <Text>{isUploadingImage ? 'Uploading...' : 'Save Product'}</Text>
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
