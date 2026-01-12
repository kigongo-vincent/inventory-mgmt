import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

export interface CompressedImage {
  uri: string;
  width: number;
  height: number;
  size?: number;
}

/**
 * Compress image to 50% quality
 * @param imageUri - URI of the image to compress
 * @param maxWidth - Maximum width (default: 1200)
 * @param maxHeight - Maximum height (default: 1200)
 * @returns Compressed image URI
 */
export async function compressImage(
  imageUri: string,
  maxWidth: number = 1200,
  maxHeight: number = 1200
): Promise<CompressedImage> {
  try {
    // First, get the image dimensions to calculate the resize action
    const manipResult = await ImageManipulator.manipulateAsync(
      imageUri,
      [
        {
          resize: {
            width: maxWidth,
            height: maxHeight,
          },
        },
      ],
      {
        compress: 0.5, // 50% quality (0.0 to 1.0)
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    return {
      uri: manipResult.uri,
      width: manipResult.width,
      height: manipResult.height,
    };
  } catch (error) {
    console.error('Error compressing image:', error);
    throw new Error('Failed to compress image');
  }
}

/**
 * Pick and compress an image
 * @param options - Image picker options
 * @param compressionOptions - Compression options (maxWidth, maxHeight)
 * @returns Compressed image URI or null if cancelled
 */
export async function pickAndCompressImage(
  options: ImagePicker.ImagePickerOptions = {},
  compressionOptions?: { maxWidth?: number; maxHeight?: number }
): Promise<CompressedImage | null> {
  try {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Permission to access media library is required');
    }

    // Pick image
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1, // We'll compress it ourselves
      ...options,
    });

    if (result.canceled || !result.assets[0]) {
      return null;
    }

    const asset = result.assets[0];
    
    // Compress the image
    const compressed = await compressImage(
      asset.uri,
      compressionOptions?.maxWidth,
      compressionOptions?.maxHeight
    );
    
    return compressed;
  } catch (error) {
    console.error('Error picking/compressing image:', error);
    throw error;
  }
}

/**
 * Take photo with camera and compress
 * @param options - Image picker options
 * @param compressionOptions - Compression options (maxWidth, maxHeight)
 * @returns Compressed image URI or null if cancelled
 */
export async function takePhotoAndCompress(
  options: ImagePicker.ImagePickerOptions = {},
  compressionOptions?: { maxWidth?: number; maxHeight?: number }
): Promise<CompressedImage | null> {
  try {
    // Request camera permissions
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Permission to access camera is required');
    }

    // Take photo
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1, // We'll compress it ourselves
      ...options,
    });

    if (result.canceled || !result.assets[0]) {
      return null;
    }

    const asset = result.assets[0];
    
    // Compress the image
    const compressed = await compressImage(
      asset.uri,
      compressionOptions?.maxWidth,
      compressionOptions?.maxHeight
    );
    
    return compressed;
  } catch (error) {
    console.error('Error taking/compressing photo:', error);
    throw error;
  }
}
