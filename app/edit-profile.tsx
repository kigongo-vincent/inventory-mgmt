import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { ScrollView, View, Pressable, Alert, KeyboardAvoidingView, Platform, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';

import { Button } from '@/components/nativewindui/Button';
import { Icon } from '@/components/nativewindui/Icon';
import { Input } from '@/components/nativewindui/Input';
import { Text } from '@/components/nativewindui/Text';
import { BottomSheet, BottomSheetOption } from '@/components/nativewindui/BottomSheet';
import { useColorScheme } from '@/lib/useColorScheme';
import { useAuthStore } from '@/store/authStore';
import { useUserStore } from '@/store/userStore';
import { compressImage } from '@/lib/utils/imageCompression';
import { uploadToCloudinary } from '@/lib/utils/cloudinary';

export default function EditProfileScreen() {
  const { colors, colorScheme } = useColorScheme();
  const currentUser = useAuthStore((state) => state.currentUser);
  const setCurrentUser = useAuthStore((state) => state.setCurrentUser);
  const updateUser = useUserStore((state) => state.updateUser);

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [profilePictureUri, setProfilePictureUri] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [showImagePickerSheet, setShowImagePickerSheet] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setUsername(currentUser.username || '');
      setEmail(currentUser.email || '');
      setPhone(currentUser.phone || '');
      setProfilePictureUri(currentUser.profilePictureUri);
      // Set loading state if profile picture exists (to show loading indicator)
      if (currentUser.profilePictureUri) {
        setIsLoadingImage(true);
        // Simulate image load check
        Image.prefetch(currentUser.profilePictureUri)
          .then(() => setIsLoadingImage(false))
          .catch(() => setIsLoadingImage(false));
      } else {
        setIsLoadingImage(false);
      }
    }
  }, [currentUser]);

  // Watch for profilePictureUri changes and ensure image loads properly
  useEffect(() => {
    if (profilePictureUri && !isUploadingImage) {
      // When URI changes (after upload), verify image can be loaded
      setIsLoadingImage(true);
      
      // Use Image.getSize to verify the image exists and is loadable
      // This helps ensure the loading state is properly managed
      Image.getSize(
        profilePictureUri,
        (width, height) => {
          // Image is valid and loadable
          console.log('Image verified, dimensions:', width, height);
          // Don't set isLoadingImage to false here - let the Image component's onLoadEnd handle it
          // This ensures the Image component has a chance to render and load
        },
        (error) => {
          console.error('Image verification failed:', error);
          setIsLoadingImage(false);
        }
      );
      
      // Fallback: Clear loading state after 5 seconds if image doesn't load
      // This prevents infinite loading if onLoadEnd doesn't fire
      const timeout = setTimeout(() => {
        console.log('Image load timeout, clearing loading state');
        setIsLoadingImage(false);
      }, 5000);
      
      return () => clearTimeout(timeout);
    }
  }, [profilePictureUri, isUploadingImage]);

  const pickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'We need access to your photos to set a profile picture.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1, // Use full quality, we'll compress ourselves
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await uploadImageToCloudinary(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
      setIsUploadingImage(false);
    }
  };

  const takePhoto = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'We need access to your camera to take a photo.');
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1, // Use full quality, we'll compress ourselves
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await uploadImageToCloudinary(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
      setIsUploadingImage(false);
    }
  };

  const uploadImageToCloudinary = async (imageUri: string) => {
    setIsUploadingImage(true);
    try {
      // Compress and resize image to profile size (400x400) before upload
      // This ensures the image is already optimized before uploading to Cloudinary
      const compressed = await compressImage(imageUri, 400, 400);
      
      // Upload to Cloudinary with profile folder
      // Note: We don't use transformations parameter since eager is not allowed with unsigned uploads
      // The image is already compressed/resized to 400x400 before upload
      const uploadResult = await uploadToCloudinary(
        compressed.uri,
        'profiles',
        `profile_${currentUser?.id || Date.now()}_${Date.now()}`
      );

      // Set the Cloudinary URL as the profile picture
      // The useEffect watching profilePictureUri will set isLoadingImage to true
      // The Image component's onLoadEnd will set it to false when loaded
      setProfilePictureUri(uploadResult.secure_url);
    } catch (error) {
      console.error('Error uploading image to Cloudinary:', error);
      setIsLoadingImage(false); // Reset loading state on error
      Alert.alert('Upload Error', 'Failed to upload image. Please try again.');
    } finally {
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
    ...(profilePictureUri ? [{
      label: 'Remove Photo',
      value: 'remove',
      icon: 'trash.fill',
      destructive: true,
    } as BottomSheetOption] : []),
  ];

  const handleImagePickerSelect = (value: string) => {
    if (value === 'camera') {
      takePhoto();
    } else if (value === 'library') {
      pickImage();
    } else if (value === 'remove') {
      setProfilePictureUri(undefined);
    }
  };

  const handleSave = async () => {
    if (!currentUser) {
      Alert.alert('Error', 'User not found. Please log in again.');
      return;
    }

    // Ensure we have a valid user ID
    const userId = currentUser.id || (currentUser as any).ID?.toString();
    if (!userId) {
      Alert.alert('Error', 'Invalid user ID. Please log in again.');
      return;
    }

    if (!name.trim() || !username.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    // Check if username is already taken by another user
    const users = useUserStore.getState().users;
    const usernameExists = users.some(
      (u) => u.username === username.trim() && u.id !== userId
    );

    if (usernameExists) {
      Alert.alert('Error', 'Username already exists');
      return;
    }

    setIsSubmitting(true);

    try {
      // Validate email format if provided (optional field)
      if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        Alert.alert('Error', 'Please enter a valid email address');
        setIsSubmitting(false);
        return;
      }

      // Update user in store (this will sync to DB via API)
      // The updateUser function will throw an error if the API call fails
      await updateUser(userId, {
        name: name.trim(),
        username: username.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        profilePictureUri: profilePictureUri || undefined,
      });

      // Only update local state if API call succeeded
      const updatedUser = {
        ...currentUser,
        name: name.trim(),
        username: username.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        profilePictureUri: profilePictureUri || undefined,
      };
      setCurrentUser(updatedUser);

      Alert.alert('Success', 'Profile updated successfully', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      const errorMessage = error?.message || error?.errorMessage || 'Failed to update profile. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsSubmitting(false);
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
                    backgroundColor: (colors as any).input || colors.background,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: colors.border || (colors as any).mutedForeground,
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
                  Edit Profile
                </Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1">
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24, paddingTop: 8 }}>
          <View className="px-5 pt-6">
            {/* Profile Picture Section - Instagram Style */}
            <View
              className="mb-6 rounded-2xl px-5 py-6 items-center"
              style={{
                backgroundColor: colors.card,
              }}>
              <Pressable 
                onPress={() => setShowImagePickerSheet(true)} 
                disabled={isUploadingImage}
                style={{ opacity: isUploadingImage ? 0.6 : 1 }}>
                <View className="relative">
                  <View
                    className="h-32 w-32 rounded-full items-center justify-center overflow-hidden"
                    style={{
                      backgroundColor: colors.background,
                      borderWidth: 2,
                      borderColor: colors.border,
                    }}>
                    {isLoadingImage || isUploadingImage ? (
                      <View className="w-full h-full items-center justify-center" style={{ backgroundColor: colors.input }}>
                        <ActivityIndicator size="small" color={colors.primary} />
                      </View>
                    ) : profilePictureUri ? (
                      <Image
                        key={profilePictureUri} // Force re-render when URI changes
                        source={{ uri: profilePictureUri }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                        onLoadStart={() => {
                          console.log('Image load started:', profilePictureUri);
                          setIsLoadingImage(true);
                        }}
                        onLoad={() => {
                          // onLoad fires when image is successfully loaded
                          console.log('Image loaded successfully:', profilePictureUri);
                          setIsLoadingImage(false);
                        }}
                        onLoadEnd={() => {
                          // onLoadEnd fires after load completes (success or failure)
                          console.log('Image load ended:', profilePictureUri);
                          setIsLoadingImage(false);
                        }}
                        onError={(error) => {
                          console.error('Edit profile image load error:', error, 'URI:', profilePictureUri);
                          setIsLoadingImage(false);
                        }}
                      />
                    ) : (
                      <View
                        style={{
                          width: '100%',
                          height: '100%',
                          justifyContent: 'center',
                          alignItems: 'center',
                          backgroundColor: colors.input,
                        }}>
                        <Icon name="person.fill" size={48} color={colors.mutedForeground} />
                      </View>
                    )}
                  </View>
                  {/* Camera Badge - Bottom Right (Instagram Style) */}
                  <View
                    className="absolute bottom-0 right-0 h-10 w-10 rounded-full items-center justify-center"
                    style={{
                      backgroundColor: colors.primary,
                      borderWidth: 3,
                      borderColor: colors.card,
                    }}>
                    {isUploadingImage ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Icon name="camera.fill" size={18} color="#FFFFFF" />
                    )}
                  </View>
                </View>
              </Pressable>
            </View>

            {/* Profile Info Card */}
            <View
              className="mb-6 rounded-2xl px-5 py-6"
              style={{
                backgroundColor: colors.card,
              }}>
              <Text variant="heading" className="mb-4" style={{ fontWeight: '500', fontSize: 17 }}>
                Personal Information
              </Text>

              <View className="mb-4">
                <Text className="mb-2" style={{ fontSize: 14, fontWeight: '500', color: colors.foreground }}>
                  Full Name
                </Text>
                <Input
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your full name"
                  style={{ backgroundColor: colors.background }}
                />
              </View>

              <View className="mb-4">
                <Text className="mb-2" style={{ fontSize: 14, fontWeight: '500', color: colors.foreground }}>
                  Username
                </Text>
                <Input
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Enter username"
                  autoCapitalize="none"
                  style={{ backgroundColor: colors.background }}
                />
              </View>
            </View>

            {/* Contact Information Card (Optional) */}
            <View
              className="mb-6 rounded-2xl px-5 py-6"
              style={{
                backgroundColor: colors.card,
              }}>
              <Text variant="heading" className="mb-4" style={{ fontWeight: '500', fontSize: 17 }}>
                Contact Information <Text style={{ fontSize: 14, fontWeight: '400', color: colors.mutedForeground }}>(Optional)</Text>
              </Text>

              <View className="mb-4">
                <Text className="mb-2" style={{ fontSize: 14, fontWeight: '500', color: colors.foreground }}>
                  Email
                </Text>
                <Input
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email (optional)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={{ backgroundColor: colors.background }}
                />
              </View>

              <View>
                <Text className="mb-2" style={{ fontSize: 14, fontWeight: '500', color: colors.foreground }}>
                  Phone Number
                </Text>
                <Input
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Enter your phone number (optional)"
                  keyboardType="phone-pad"
                  style={{ backgroundColor: colors.background }}
                />
              </View>
            </View>

            <Button
              onPress={handleSave}
              disabled={isSubmitting || isUploadingImage}
              className="w-full"
              loading={isSubmitting || isUploadingImage}>
              <Text style={{ color: colors.primaryForeground, fontWeight: '500' }}>
                {isUploadingImage ? 'Uploading Image...' : 'Save Changes'}
              </Text>
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Image Picker Bottom Sheet */}
      <BottomSheet
        visible={showImagePickerSheet}
        onClose={() => setShowImagePickerSheet(false)}
        title="Profile Picture"
        options={imagePickerOptions}
        onSelect={handleImagePickerSelect}
        showIcons={true}
      />
    </View>
  );
}
