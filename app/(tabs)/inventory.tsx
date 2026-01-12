import { router, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Alert, Dimensions, Pressable, RefreshControl, ScrollView, View, Image, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { BottomSheet, BottomSheetOption } from '@/components/nativewindui/BottomSheet';
import { compressImage } from '@/lib/utils/imageCompression';
import { uploadToCloudinary } from '@/lib/utils/cloudinary';
import { Button } from '@/components/nativewindui/Button';
import { FAB } from '@/components/nativewindui/FAB';
import { Icon } from '@/components/nativewindui/Icon';
import { Input } from '@/components/nativewindui/Input';
import { Modal } from '@/components/nativewindui/Modal';
import { Skeleton, SkeletonList, SkeletonProductCard } from '@/components/nativewindui/Skeleton';
import { SegmentedPicker } from '@/components/nativewindui/SegmentedPicker';
import { Text } from '@/components/nativewindui/Text';
import { formatCurrency } from '@/lib/currency';
import { useColorScheme } from '@/lib/useColorScheme';
import { useAuthStore } from '@/store/authStore';
import { useProductStore } from '@/store/productStore';
import { useSettingsStore } from '@/store/settingsStore';
import { withOpacity } from '@/theme/with-opacity';
import { GasSize, Product, ProductType } from '@/types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function InventoryScreen() {
  const { colors, baseFontSize } = useColorScheme();
  const [refreshing, setRefreshing] = useState(false);
  const params = useLocalSearchParams<{ openAddModal?: string }>();
  const currentUser = useAuthStore((state) => state.currentUser);
  // Normalize role check - handle different case variations
  const normalizedRole = currentUser?.role?.toLowerCase();
  const isSuperAdmin = normalizedRole === 'super_admin' || normalizedRole === 'superadmin';
  
  // Debug: Log role check
  useEffect(() => {
    if (currentUser) {
      console.log('🔍 Inventory Screen - User Role Check:', {
        role: currentUser.role,
        normalizedRole,
        isSuperAdmin,
        user: currentUser.username,
        fullUser: JSON.stringify(currentUser, null, 2),
      });
    }
  }, [currentUser, isSuperAdmin, normalizedRole]);
  const getProductsByCompany = useProductStore((state) => state.getProductsByCompany);
  const getProductById = useProductStore((state) => state.getProductById);
  const addProduct = useProductStore((state) => state.addProduct);
  const updateProduct = useProductStore((state) => state.updateProduct);
  const deleteProduct = useProductStore((state) => state.deleteProduct);
  const fetchProductsByCompany = useProductStore((state) => state.fetchProductsByCompany);
  const syncProducts = useProductStore((state) => state.syncProducts);
  const settings = useSettingsStore((state) => state.settings);
  const isLoadingProducts = useProductStore((state) => state.isLoading);

  // Get dynamic product types and gas sizes from settings
  const productTypes = settings.productTypes || [];
  const gasSizes = settings.gasSizes || [];

  const [showAddForm, setShowAddForm] = useState(false);

  // Auto-open modal if param is set (only for super admin)
  useEffect(() => {
    if (params.openAddModal === 'true' && isSuperAdmin) {
      setShowAddForm(true);
      // Clear the param to avoid reopening on re-render
      router.setParams({ openAddModal: undefined });
    }
  }, [params.openAddModal, isSuperAdmin]);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productType, setProductType] = useState<ProductType>('');
  const [gasSize, setGasSize] = useState<GasSize>('');

  // Initialize product type and gas size from settings
  useEffect(() => {
    if (productTypes.length > 0 && !productType) {
      setProductType(productTypes[0]);
    }
    if (gasSizes.length > 0 && !gasSize) {
      setGasSize(gasSizes.find(s => s !== 'none') || gasSizes[0]);
    }
  }, [productTypes, gasSizes]);
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [productImageUri, setProductImageUri] = useState<string | undefined>(undefined);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [showImagePickerSheet, setShowImagePickerSheet] = useState(false);

  const companyProducts = currentUser?.companyId
    ? getProductsByCompany(currentUser.companyId)
    : [];

  // Fetch products from backend on mount
  useEffect(() => {
    if (currentUser?.companyId) {
      fetchProductsByCompany(currentUser.companyId);
    }
  }, [currentUser?.companyId, fetchProductsByCompany]);

  const uploadProductImageToCloudinary = async (imageUri: string) => {
    setIsUploadingImage(true);
    try {
      // Compress and resize image to product size (1200x1200) before upload
      const compressed = await compressImage(imageUri, 1200, 1200);
      
      // Upload to Cloudinary with products folder
      const uploadResult = await uploadToCloudinary(
        compressed.uri,
        'products',
        `product_${currentUser?.companyId || 'default'}_${Date.now()}`
      );

      // Set the Cloudinary URL as the product image
      setProductImageUri(uploadResult.secure_url);
    } catch (error) {
      console.error('Error uploading product image to Cloudinary:', error);
      Alert.alert('Upload Error', 'Failed to upload image. Please try again.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const pickProductImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'We need access to your photos to set a product image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1, // Use full quality, we'll compress ourselves
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await uploadProductImageToCloudinary(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking product image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
      setIsUploadingImage(false);
    }
  };

  const takeProductPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'We need access to your camera to take a photo.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1, // Use full quality, we'll compress ourselves
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await uploadProductImageToCloudinary(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking product photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
      setIsUploadingImage(false);
    }
  };

  const imagePickerOptions: BottomSheetOption[] = [
    {
      label: 'Take Photo',
      value: 'camera',
      icon: 'camera.fill',
    },
    {
      label: 'Choose from Library',
      value: 'library',
      icon: 'photo.fill',
    },
    ...(productImageUri ? [{
      label: 'Remove Photo',
      value: 'remove',
      icon: 'trash.fill',
      destructive: true,
    } as BottomSheetOption] : []),
  ];

  const handleImagePickerSelect = (value: string) => {
    if (value === 'camera') {
      takeProductPhoto();
    } else if (value === 'library') {
      pickProductImage();
    } else if (value === 'remove') {
      setProductImageUri(undefined);
    }
  };

  // Watch for productImageUri changes and ensure image loads properly
  useEffect(() => {
    if (productImageUri && !isUploadingImage) {
      setIsLoadingImage(true);
      
      // Use Image.getSize to verify the image exists and is loadable
      Image.getSize(
        productImageUri,
        (width, height) => {
          console.log('Product image verified, dimensions:', width, height);
        },
        (error) => {
          console.error('Product image verification failed:', error);
          setIsLoadingImage(false);
        }
      );
      
      // Fallback: Clear loading state after 5 seconds if image doesn't load
      const timeout = setTimeout(() => {
        console.log('Product image load timeout, clearing loading state');
        setIsLoadingImage(false);
      }, 5000);
      
      return () => clearTimeout(timeout);
    }
  }, [productImageUri, isUploadingImage]);

  if (isLoadingProducts && !refreshing) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24, paddingTop: 8 }}>
          <View className="px-5 pt-6">
            {/* Header Skeleton */}
            <View className="mb-6 flex-row items-start justify-between">
              <View className="flex-1">
                <Skeleton width={120} height={24} style={{ marginBottom: 8 }} />
                <Skeleton width={180} height={14} />
              </View>
              {isSuperAdmin && <Skeleton width={90} height={36} borderRadius={18} />}
            </View>

            {/* Search Bar Skeleton */}
            <View className="mb-6">
              <Skeleton width="100%" height={44} borderRadius={12} />
            </View>

            {/* Products Grid Skeleton */}
            <View className="flex-row flex-wrap gap-4" style={{ justifyContent: 'space-between' }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonProductCard
                  key={i}
                  style={{ width: '47%' }}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  const handleAddProduct = async (syncStatus: 'online' | 'offline') => {
    if (!quantity.trim() || !price.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!productType) {
      Alert.alert('Error', 'Please select a product type');
      return;
    }

    if (!gasSize) {
      Alert.alert('Error', 'Please select a gas size');
      return;
    }

    const qty = parseInt(quantity, 10);
    const prc = parseFloat(price);

    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    if (isNaN(prc) || prc <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    if (!currentUser) {
      Alert.alert('Error', 'User not found');
      return;
    }

    // Use companyId from user (required for products)
    const companyId = currentUser.companyId;
    if (!companyId) {
      Alert.alert('Error', 'User company information is missing. Please log out and log back in.');
      return;
    }

    // Debug log to see what we're using
    console.log('Creating product with companyId:', companyId, 'User companyId:', currentUser.companyId);

    const productData = {
      name: productType, // Use the product type name directly
      price: prc,
      currency: settings.defaultCurrency,
      companyId: companyId, // Company ID (will be verified by backend middleware)
      quantity: qty,
      imageUri: productImageUri,
      attributes: {
        type: productType,
        gasSize: gasSize,
      },
    };

    try {
      await addProduct(productData, syncStatus);
      Alert.alert('Success', `Product saved ${syncStatus === 'online' ? 'online' : 'offline'}`, [
        {
          text: 'OK',
          onPress: () => {
            setShowAddForm(false);
            setQuantity('');
            setPrice('');
            setProductImageUri(undefined);
            if (syncStatus === 'offline') {
              router.push('/offline-products');
            } else {
              // Refresh products after adding
              if (currentUser?.companyId) {
                fetchProductsByCompany(currentUser.companyId);
              }
            }
          },
        },
      ]);
    } catch (error: any) {
      console.error('Error adding product:', error);
      // Extract error message from various possible formats
      let errorMessage = 'Failed to save product. Please try again.';
      if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.error) {
        errorMessage = error.error;
      } else if (error?.toString) {
        errorMessage = error.toString();
      }
      Alert.alert('Error', errorMessage);
    }
  };

  const handleProductPress = (product: Product) => {
    // Employees can only view, not edit/delete
    if (!isSuperAdmin) return;
    setSelectedProduct(product);
    setShowActionSheet(true);
  };

  const handleEdit = () => {
    if (!selectedProduct) return;
    // Store the product ID for later use
    setEditingProductId(selectedProduct.id);
    // Set product type with fallback to first available type or product name
    const defaultProductType = productTypes.length > 0 ? productTypes[0] : selectedProduct.name;
    setProductType(selectedProduct.attributes?.type || selectedProduct.name || defaultProductType);
    
    // Set gas size with fallback to first available size (excluding 'none')
    const defaultGasSize = gasSizes.find(s => s !== 'none') || gasSizes[0] || '';
    setGasSize(selectedProduct.attributes?.gasSize || defaultGasSize);
    
    setQuantity(selectedProduct.quantity.toString());
    setPrice(selectedProduct.price.toString());
    setProductImageUri(selectedProduct.imageUri);
    setShowActionSheet(false);
    setShowEditForm(true);
  };

  const handleDelete = () => {
    if (!selectedProduct) return;
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${selectedProduct.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => setShowActionSheet(false) },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProduct(selectedProduct.id);
              setShowActionSheet(false);
              setSelectedProduct(null);
              Alert.alert('Success', 'Product deleted successfully');

              // Refresh products after deleting
              if (currentUser?.companyId) {
                fetchProductsByCompany(currentUser.companyId);
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete product. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleUpdateProduct = async () => {
    // Use editingProductId if available, otherwise fall back to selectedProduct
    const productId = editingProductId || selectedProduct?.id;
    
    if (!productId) {
      Alert.alert('Error', 'No product selected');
      return;
    }

    // Get the product from store to access its attributes
    const product = getProductById(productId) || selectedProduct;

    // Validate quantity
    if (!quantity || quantity.trim() === '') {
      Alert.alert('Error', 'Please enter a quantity');
      return;
    }

    const qty = parseInt(quantity.trim(), 10);
    if (isNaN(qty) || qty < 0) {
      Alert.alert('Error', 'Please enter a valid quantity (0 or greater)');
      return;
    }

    // Validate price
    if (!price || price.trim() === '') {
      Alert.alert('Error', 'Please enter a price');
      return;
    }

    const prc = parseFloat(price.trim());
    if (isNaN(prc) || prc <= 0) {
      Alert.alert('Error', 'Please enter a valid price (greater than 0)');
      return;
    }

    try {
      await updateProduct(productId, {
        name: productType, // Use product type name directly
        price: prc,
        quantity: qty,
        imageUri: productImageUri,
        attributes: {
          ...(product?.attributes || {}),
          type: productType,
          gasSize: gasSize,
        },
      });

      Alert.alert('Success', 'Product updated successfully');
      setShowEditForm(false);
      setSelectedProduct(null);
      setEditingProductId(null);
      setQuantity('');
      setPrice('');
      setProductImageUri(undefined);

      // Refresh products after updating
      if (currentUser?.companyId) {
        fetchProductsByCompany(currentUser.companyId);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update product. Please try again.');
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24, paddingTop: 8 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              try {
                if (currentUser?.companyId) {
                  // Fetch fresh data from backend (automatically filtered by company via middleware)
                  await fetchProductsByCompany(currentUser.companyId);
                  // Also sync any offline products
                  await syncProducts();
                }
              } catch (error) {
                console.error('Error refreshing products:', error);
              } finally {
                setRefreshing(false);
              }
            }}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.background}
          />
        }>
        <View className="px-5 pt-6">
          {/* Header */}
          <View className="mb-6 flex-row items-start justify-between" style={{ paddingTop: 2 }}>
            <View className="flex-1">
              <Text
                variant="heading"
                style={{
                  fontSize: 16,
                  marginBottom: 4,
                }}>
                Inventory
              </Text>
              <Text variant="footnote" color="tertiary" style={{ fontSize: 12 }}>
                Manage your product inventory
              </Text>
            </View>
            {isSuperAdmin && (
              <Button
                variant="primary"
                size="md"
                onPress={() => setShowAddForm(true)}>
                <Text>Add Product</Text>
              </Button>
            )}
          </View>

          {/* Products List */}
          {companyProducts.length === 0 ? (
            <View
              className="rounded-2xl px-5 py-12 items-center justify-center"
              style={{
                backgroundColor: colors.card,
              }}>
              <Icon name="shippingbox.fill" size={40} color={colors.primary} style={{ opacity: 0.3, marginBottom: 12 }} />
              <Text variant="subhead" color="tertiary" style={{ fontSize: 16, fontWeight: '500', marginBottom: 4 }}>
                No products in inventory
              </Text>
              <Text variant="footnote" color="tertiary" style={{ fontSize: 13 }}>
                Add products to get started
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {companyProducts.map((product, index) => (
                <Pressable
                  key={`product-${product.id || `index-${index}`}`}
                  onPress={() => handleProductPress(product)}
                  disabled={!isSuperAdmin}
                  style={({ pressed }) => ({
                    opacity: pressed && isSuperAdmin ? 0.7 : 1,
                  })}>
                  <View
                    className="rounded-2xl px-5 py-5"
                    style={{
                      backgroundColor: colors.card,
                      borderWidth: 0.5,
                      borderColor: withOpacity(colors.border, 0.2),
                    }}>
                    <View className="flex-row items-start gap-4">
                      <View
                        className="h-14 w-14 items-center justify-center rounded-xl overflow-hidden"
                        style={{
                          backgroundColor: colors.background,
                        }}>
                        {product.imageUri ? (
                          <Image
                            source={{ uri: product.imageUri }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                          />
                        ) : (
                          <Icon name="shippingbox.fill" size={13.5 * 2} color={colors.primary} />
                        )}
                      </View>
                      <View className="flex-1 min-w-0">
                        <View className="flex-row items-start justify-between mb-2">
                          <View className="flex-1 min-w-0">
                            <View className="flex-row items-start justify-between mb-2">
                              <Text
                                variant="heading"
                                style={{
                                  fontWeight: '500',
                                  fontSize: 14,
                                  letterSpacing: -0.3,
                                  flex: 1,
                                }}
                                numberOfLines={1}>
                                {product.name}
                              </Text>
                              {/* Stock Status Badge - Top Right */}
                              <View
                                className="px-2.5 py-1 rounded-full ml-2"
                                style={{
                                  backgroundColor: product.quantity === 0
                                    ? withOpacity(colors.destructive, 0.15)
                                    : product.quantity < 10
                                      ? withOpacity(colors.primary, 0.15)
                                      : withOpacity(colors.primary, 0.1),
                                }}>
                                <View className="flex-row items-center gap-1.5">
                                  <View
                                    className="h-1.5 w-1.5 rounded-full"
                                    style={{
                                      backgroundColor: product.quantity === 0
                                        ? colors.destructive
                                        : product.quantity < 10
                                          ? colors.primary
                                          : colors.primary,
                                    }}
                                  />
                                  <Text
                                    variant="footnote"
                                    style={{
                                      fontSize: 11,
                                      fontWeight: '500',
                                      color: product.quantity === 0
                                        ? colors.destructive
                                        : colors.primary,
                                    }}>
                                    {product.quantity === 0
                                      ? 'Out of Stock'
                                      : product.quantity < 10
                                        ? 'Low Stock'
                                        : 'In Stock'}
                                  </Text>
                                </View>
                              </View>
                            </View>
                            {product.attributes?.gasSize && product.attributes.gasSize !== 'none' && (
                              <View className="flex-row items-center gap-1.5 mb-2">
                                <View
                                  className="h-1.5 w-1.5 rounded-full"
                                  style={{ backgroundColor: colors.primary }}
                                />
                                <Text
                                  variant="subhead"
                                  color="tertiary"
                                  style={{ fontSize: 13 }}>
                                  {product.attributes.gasSize}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                        <View className="flex-row items-center justify-between mt-2">
                          <View>
                            <Text
                              variant="footnote"
                              color="tertiary"
                              style={{ fontSize: 12, marginBottom: 2 }}>
                              Quantity
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
                              Price
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
                              {formatCurrency(product.price, product.currency)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Product Modal */}
      <Modal
        visible={showAddForm}
        onClose={() => {
          setShowAddForm(false);
          setQuantity('');
          setPrice('');
          setProductImageUri(undefined);
        }}
        title="Add Product"
        subtitle="Add a new product to inventory"
        maxHeight={SCREEN_HEIGHT * 0.85}>
        <View className="gap-4">
          {/* Product Image Section */}
          <View>
            <Text variant="subhead" className="mb-2">
              Product Image
            </Text>
            <Pressable 
              onPress={() => setShowImagePickerSheet(true)} 
              disabled={isUploadingImage}
              style={{ opacity: isUploadingImage ? 0.6 : 1 }}>
              <View
                className="h-32 w-full rounded-xl items-center justify-center overflow-hidden relative"
                style={{
                  backgroundColor: colors.background,
                  borderWidth: 2,
                  borderColor: colors.border,
                  borderStyle: 'dashed',
                }}>
                {isLoadingImage || isUploadingImage ? (
                  <View className="w-full h-full items-center justify-center" style={{ backgroundColor: colors.input }}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text variant="footnote" color="tertiary" className="mt-2">
                      {isUploadingImage ? 'Uploading...' : 'Loading...'}
                    </Text>
                  </View>
                ) : productImageUri ? (
                  <Image
                    key={productImageUri}
                    source={{ uri: productImageUri }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                    onLoadStart={() => {
                      setIsLoadingImage(true);
                    }}
                    onLoad={() => {
                      console.log('Product image loaded successfully:', productImageUri);
                      setIsLoadingImage(false);
                    }}
                    onLoadEnd={() => {
                      console.log('Product image load ended:', productImageUri);
                      setIsLoadingImage(false);
                    }}
                    onError={(error) => {
                      console.error('Product image load error:', error, 'URI:', productImageUri);
                      setIsLoadingImage(false);
                    }}
                  />
                ) : (
                  <View className="items-center gap-2">
                    <Icon name="photo.fill" size={32} color={colors.mutedForeground} />
                    <Text variant="footnote" color="tertiary">
                      Tap to add product image
                    </Text>
                  </View>
                )}
              </View>
            </Pressable>
          </View>

          {productTypes.length > 0 && (
            <View>
              <Text variant="subhead" className="mb-2">
                Product Type
              </Text>
              <SegmentedPicker
                options={productTypes.map((type) => ({
                  label: type,
                  value: type,
                }))}
                selectedValue={productType || productTypes[0]}
                onValueChange={(value) => setProductType(value as ProductType)}
              />
            </View>
          )}

          {gasSizes.length > 0 && (
            <View>
              <Text variant="subhead" className="mb-2">
                Gas Size
              </Text>
              <SegmentedPicker
                options={gasSizes.map((size) => ({
                  label: size === 'none' ? 'N/A' : size,
                  value: size,
                }))}
                selectedValue={gasSize || gasSizes[0]}
                onValueChange={(value) => setGasSize(value as GasSize)}
              />
            </View>
          )}

          <View>
            <Text variant="subhead" className="mb-2">
              Quantity
            </Text>
            <Input
              value={quantity}
              onChangeText={setQuantity}
              placeholder="Enter quantity"
              keyboardType="numeric"
            />
          </View>

          <View>
            <Text variant="subhead" className="mb-2">
              Price (UGX)
            </Text>
            <Input
              value={price}
              onChangeText={setPrice}
              placeholder="Enter price"
              keyboardType="numeric"
            />
          </View>

          <View className="flex-row gap-3 mt-2 mb-2">
            <Button 
              onPress={() => handleAddProduct('online')} 
              variant="primary" 
              className="flex-1" 
              loading={isLoadingProducts || isUploadingImage}
              disabled={isUploadingImage}>
              <Icon name="cloud.fill" size={16} color="#FFFFFF" />
              <Text>{isUploadingImage ? 'Uploading...' : 'Save'}</Text>
            </Button>
            <Button 
              onPress={() => handleAddProduct('offline')} 
              variant="secondary" 
              className="flex-1" 
              loading={isLoadingProducts || isUploadingImage}
              disabled={isUploadingImage}>
              <Icon name="externaldrive.fill" size={16} color={colors.primary} />
              <Text style={{ color: colors.primary }}>{isUploadingImage ? 'Uploading...' : 'Save Offline'}</Text>
            </Button>
          </View>
        </View>
      </Modal>

      {/* Edit Product Modal */}
      <Modal
        visible={showEditForm}
        onClose={() => {
          setShowEditForm(false);
          setSelectedProduct(null);
          setEditingProductId(null);
          setQuantity('');
          setPrice('');
          setProductImageUri(undefined);
        }}
        title="Edit Product"
        subtitle="Update product information"
        maxHeight={SCREEN_HEIGHT * 0.85}>
        <View className="gap-4">
          {/* Product Image Section */}
          <View>
            <Text variant="subhead" className="mb-2">
              Product Image
            </Text>
            <Pressable 
              onPress={() => setShowImagePickerSheet(true)} 
              disabled={isUploadingImage}
              style={{ opacity: isUploadingImage ? 0.6 : 1 }}>
              <View
                className="h-32 w-full rounded-xl items-center justify-center overflow-hidden relative"
                style={{
                  backgroundColor: colors.background,
                  borderWidth: 2,
                  borderColor: colors.border,
                  borderStyle: 'dashed',
                }}>
                {isLoadingImage || isUploadingImage ? (
                  <View className="w-full h-full items-center justify-center" style={{ backgroundColor: colors.input }}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text variant="footnote" color="tertiary" className="mt-2">
                      {isUploadingImage ? 'Uploading...' : 'Loading...'}
                    </Text>
                  </View>
                ) : productImageUri ? (
                  <Image
                    key={productImageUri}
                    source={{ uri: productImageUri }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                    onLoadStart={() => {
                      setIsLoadingImage(true);
                    }}
                    onLoad={() => {
                      console.log('Product image loaded successfully:', productImageUri);
                      setIsLoadingImage(false);
                    }}
                    onLoadEnd={() => {
                      console.log('Product image load ended:', productImageUri);
                      setIsLoadingImage(false);
                    }}
                    onError={(error) => {
                      console.error('Product image load error:', error, 'URI:', productImageUri);
                      setIsLoadingImage(false);
                    }}
                  />
                ) : (
                  <View className="items-center gap-2">
                    <Icon name="photo.fill" size={32} color={colors.mutedForeground} />
                    <Text variant="footnote" color="tertiary">
                      Tap to add product image
                    </Text>
                  </View>
                )}
              </View>
            </Pressable>
          </View>

          <View>
            <Text variant="subhead" className="mb-2">
              Product Type
            </Text>
            <SegmentedPicker
              options={productTypes.map((type) => ({
                label: type,
                value: type,
              }))}
              selectedValue={productType}
              onValueChange={(value) => setProductType(value as ProductType)}
            />
          </View>

          <View>
            <Text variant="subhead" className="mb-2">
              Gas Size
            </Text>
            <SegmentedPicker
              options={gasSizes.map((size) => ({
                label: size === 'none' ? 'N/A' : size,
                value: size,
              }))}
              selectedValue={gasSize}
              onValueChange={(value) => setGasSize(value as GasSize)}
            />
          </View>

          <View>
            <Text variant="subhead" className="mb-2">
              Quantity
            </Text>
            <Input
              value={quantity}
              onChangeText={setQuantity}
              placeholder="Enter quantity"
              keyboardType="numeric"
            />
          </View>

          <View>
            <Text variant="subhead" className="mb-2">
              Price (UGX)
            </Text>
            <Input
              value={price}
              onChangeText={setPrice}
              placeholder="Enter price"
              keyboardType="numeric"
            />
          </View>

          <Button 
            onPress={handleUpdateProduct} 
            className="mt-2 mb-2" 
            loading={isLoadingProducts || isUploadingImage}
            disabled={isUploadingImage}>
            <Text>{isUploadingImage ? 'Uploading Image...' : 'Update Product'}</Text>
          </Button>
        </View>
      </Modal>

      {/* Product Action Sheet */}
      <BottomSheet
        visible={showActionSheet}
        onClose={() => {
          setShowActionSheet(false);
          setSelectedProduct(null);
        }}
        title="Product Actions"
        showIcons={true}
        options={[
          { label: 'Edit Product', value: 'edit', icon: 'pencil' },
          { label: 'Delete Product', value: 'delete', icon: 'trash', destructive: true },
        ]}
        onSelect={(value) => {
          if (value === 'edit') {
            handleEdit();
          } else if (value === 'delete') {
            handleDelete();
          }
        }}
      />

      {/* Image Picker Bottom Sheet */}
      <BottomSheet
        visible={showImagePickerSheet}
        onClose={() => setShowImagePickerSheet(false)}
        title="Product Image"
        options={imagePickerOptions}
        onSelect={handleImagePickerSelect}
        showIcons={true}
      />

      {/* FAB */}
      <FAB
        options={[
          {
            label: 'Record Sale',
            icon: 'plus.circle.fill',
            onPress: () => router.push('/record-sale'),
          },
          ...(isSuperAdmin
            ? [
                {
                  label: 'Add Product',
                  icon: 'cube.box.fill',
                  onPress: () => {
                    console.log('➕ Add Product pressed, opening form');
                    setShowAddForm(true);
                  },
                },
              ]
            : []),
        ].filter(Boolean)}
      />
    </View>
  );
}
