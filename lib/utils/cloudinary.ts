import Constants from 'expo-constants';

// Get Cloudinary config from environment variables
const getCloudinaryConfig = () => {
  // In Expo, environment variables are accessed via Constants.expoConfig.extra
  // Also check for NEXT_PUBLIC_ prefixed vars (from .env file)
  // Fallback to process.env for development
  
  const cloudName = Constants.expoConfig?.extra?.cloudinaryCloudName || 
                    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
                    process.env.CLOUDINARY_CLOUD_NAME || 
                    '';
  const uploadPreset = Constants.expoConfig?.extra?.cloudinaryUploadPreset || 
                       process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ||
                       process.env.CLOUDINARY_UPLOAD_PRESET || 
                       '';

  return { cloudName, uploadPreset };
};

/**
 * Upload image to Cloudinary using unsigned upload with preset
 * This is the recommended approach for client-side uploads
 * Note: Transformations via 'eager' parameter are not allowed with unsigned uploads.
 * Apply transformations before upload (client-side) or via URL transformations when displaying.
 * @param imageUri - Local URI of the image to upload
 * @param folder - Optional folder path in Cloudinary
 * @param publicId - Optional public ID for the image
 * @returns Cloudinary upload result with secure URL
 */
export async function uploadToCloudinary(
  imageUri: string,
  folder?: string,
  publicId?: string
): Promise<{ secure_url: string; public_id: string; width: number; height: number }> {
  const { cloudName, uploadPreset } = getCloudinaryConfig();

  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary configuration is missing. Please check your .env.dev file.');
  }

  try {
    // Create FormData for upload
    const formData = new FormData();
    
    // For React Native, we need to create a proper file object
    // The imageUri should be a local file path
    const filename = imageUri.split('/').pop() || `image_${Date.now()}.jpg`;
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    
    // Create file object for FormData
    const file = {
      uri: imageUri,
      type: type,
      name: filename,
    } as any;

    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    
    if (folder) {
      formData.append('folder', folder);
    }
    
    if (publicId) {
      formData.append('public_id', publicId);
    }

    // Note: Transformations via 'eager' parameter are not allowed with unsigned uploads
    // If transformations are needed, they should be:
    // 1. Applied before upload (client-side compression/resizing) - which we do
    // 2. Applied via URL transformations when displaying the image using getCloudinaryUrl()
    // 3. Configured in the upload preset settings in Cloudinary dashboard

    // Upload to Cloudinary
    const uploadResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header - let fetch set it with boundary
      }
    );

    if (!uploadResponse.ok) {
      const error = await uploadResponse.text();
      throw new Error(`Cloudinary upload failed: ${error}`);
    }

    const result = await uploadResponse.json();
    
    return {
      secure_url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
    };
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete image from Cloudinary
 * Note: This requires server-side implementation with API secret
 * For client-side, you would need to call your backend API
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  // This should be implemented on the backend for security
  // Client-side deletion requires API secret which should not be exposed
  throw new Error('Image deletion should be handled on the backend');
}

/**
 * Get optimized image URL from Cloudinary
 * @param publicId - Cloudinary public ID
 * @param transformations - Optional transformations
 * @returns Optimized image URL
 */
export function getCloudinaryUrl(
  publicId: string,
  transformations?: {
    width?: number;
    height?: number;
    quality?: number;
    format?: string;
  }
): string {
  const { cloudName } = getCloudinaryConfig();
  
  if (!cloudName) {
    throw new Error('Cloudinary cloud name is missing');
  }

  let url = `https://res.cloudinary.com/${cloudName}/image/upload`;
  
  if (transformations) {
    const { width, height, quality = 'auto', format } = transformations;
    const transforms: string[] = [];
    
    if (width) transforms.push(`w_${width}`);
    if (height) transforms.push(`h_${height}`);
    if (quality) transforms.push(`q_${quality}`);
    if (format) transforms.push(`f_${format}`);
    
    if (transforms.length > 0) {
      url += `/${transforms.join(',')}`;
    }
  }
  
  url += `/${publicId}`;
  
  return url;
}
