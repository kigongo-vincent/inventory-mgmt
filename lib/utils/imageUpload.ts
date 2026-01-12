import { compressImage, CompressedImage, pickAndCompressImage, takePhotoAndCompress } from './imageCompression';
import { uploadToCloudinary } from './cloudinary';

export interface ImageUploadOptions {
  folder?: string;
  publicId?: string;
  maxWidth?: number;
  maxHeight?: number;
}

export interface UploadedImage {
  uri: string;
  cloudinaryUrl: string;
  publicId: string;
  width: number;
  height: number;
}

/**
 * Complete workflow: Pick, compress, and upload image to Cloudinary
 * @param options - Upload options
 * @returns Uploaded image information
 */
export async function pickCompressAndUpload(
  options: ImageUploadOptions = {}
): Promise<UploadedImage | null> {
  try {
    // Step 1: Pick and compress image
    const compressed = await pickAndCompressImage(
      {},
      {
        maxWidth: options.maxWidth,
        maxHeight: options.maxHeight,
      }
    );

    if (!compressed) {
      return null; // User cancelled
    }

    // Step 2: Upload to Cloudinary
    const uploadResult = await uploadToCloudinary(
      compressed.uri,
      options.folder,
      options.publicId
    );

    return {
      uri: compressed.uri,
      cloudinaryUrl: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      width: uploadResult.width,
      height: uploadResult.height,
    };
  } catch (error) {
    console.error('Error in pickCompressAndUpload:', error);
    throw error;
  }
}

/**
 * Complete workflow: Take photo, compress, and upload to Cloudinary
 * @param options - Upload options
 * @returns Uploaded image information
 */
export async function takePhotoCompressAndUpload(
  options: ImageUploadOptions = {}
): Promise<UploadedImage | null> {
  try {
    // Step 1: Take photo and compress
    const compressed = await takePhotoAndCompress(
      {},
      {
        maxWidth: options.maxWidth,
        maxHeight: options.maxHeight,
      }
    );

    if (!compressed) {
      return null; // User cancelled
    }

    // Step 2: Upload to Cloudinary
    const uploadResult = await uploadToCloudinary(
      compressed.uri,
      options.folder,
      options.publicId
    );

    return {
      uri: compressed.uri,
      cloudinaryUrl: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      width: uploadResult.width,
      height: uploadResult.height,
    };
  } catch (error) {
    console.error('Error in takePhotoCompressAndUpload:', error);
    throw error;
  }
}

/**
 * Upload already compressed image to Cloudinary
 * @param compressedImage - Already compressed image
 * @param options - Upload options
 * @returns Uploaded image information
 */
export async function uploadCompressedImage(
  compressedImage: CompressedImage,
  options: ImageUploadOptions = {}
): Promise<UploadedImage> {
  try {
    const uploadResult = await uploadToCloudinary(
      compressedImage.uri,
      options.folder,
      options.publicId
    );

    return {
      uri: compressedImage.uri,
      cloudinaryUrl: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      width: uploadResult.width,
      height: uploadResult.height,
    };
  } catch (error) {
    console.error('Error uploading compressed image:', error);
    throw error;
  }
}
