/**
 * Example usage of image upload utilities
 * 
 * This file demonstrates how to use the image upload functionality
 * in your components. You can import these functions and use them
 * in your forms, profile pages, product pages, etc.
 */

import { pickCompressAndUpload, takePhotoCompressAndUpload, uploadCompressedImage } from './imageUpload';
import { compressImage } from './imageCompression';

/**
 * Example: Upload profile picture
 */
export async function uploadProfilePicture(userId: string) {
  try {
    const result = await pickCompressAndUpload({
      folder: `profiles/${userId}`,
      publicId: `profile_${userId}`,
      maxWidth: 800,
      maxHeight: 800,
    });

    if (result) {
      // Use result.cloudinaryUrl to save to your backend
      console.log('Profile picture uploaded:', result.cloudinaryUrl);
      return result.cloudinaryUrl;
    }
    return null;
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    throw error;
  }
}

/**
 * Example: Upload product image
 */
export async function uploadProductImage(productId: string) {
  try {
    const result = await pickCompressAndUpload({
      folder: `products/${productId}`,
      publicId: `product_${productId}_${Date.now()}`,
      maxWidth: 1200,
      maxHeight: 1200,
    });

    if (result) {
      // Use result.cloudinaryUrl to save to your backend
      console.log('Product image uploaded:', result.cloudinaryUrl);
      return result.cloudinaryUrl;
    }
    return null;
  } catch (error) {
    console.error('Error uploading product image:', error);
    throw error;
  }
}

/**
 * Example: Take photo and upload
 */
export async function takeAndUploadPhoto(folder: string) {
  try {
    const result = await takePhotoCompressAndUpload({
      folder: folder,
      maxWidth: 1200,
      maxHeight: 1200,
    });

    if (result) {
      return result.cloudinaryUrl;
    }
    return null;
  } catch (error) {
    console.error('Error taking and uploading photo:', error);
    throw error;
  }
}

/**
 * Example: Compress existing image and upload
 */
export async function compressAndUploadExistingImage(imageUri: string, folder?: string) {
  try {
    // First compress
    const compressed = await compressImage(imageUri, 1200, 1200);
    
    // Then upload
    const result = await uploadCompressedImage(compressed, { folder });
    
    return result.cloudinaryUrl;
  } catch (error) {
    console.error('Error compressing and uploading image:', error);
    throw error;
  }
}
