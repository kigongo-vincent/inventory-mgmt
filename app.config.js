// app.config.js - Expo configuration with environment variables
// On EAS Build, env comes from eas.json "env". Locally we load from .env.dev and .env.
if (!process.env.EAS_BUILD) {
  try {
    require('dotenv').config({ path: '.env.dev' });
    require('dotenv').config({ path: '.env' });
  } catch (_) {
    // .env files optional when not in EAS
  }
}

// Centralized API Base URL - always read from .env.dev
// This is the single source of truth for the API base URL
const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:8080/api/v1';

if (process.env.API_BASE_URL) {
  console.log('📋 app.config.js: API_BASE_URL loaded from .env.dev:', process.env.API_BASE_URL);
} else {
  console.warn(
    '⚠️  app.config.js: API_BASE_URL not found in .env.dev, using fallback:',
    apiBaseUrl
  );
}

module.exports = {
  expo: {
    name: 'Gas Center',
    slug: 'gas-center',
    version: '1.0.0',
    scheme: 'gas-center',
    platforms: ['ios', 'android'],
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/icon.jpg',
    },
    plugins: [
      'expo-router',
      '@react-native-community/datetimepicker',
      [
        'expo-image-picker',
        {
          photosPermission:
            'The app accesses your photos to let you set profile pictures and product images.',
          cameraPermission:
            'The app accesses your camera to let you take photos for profile pictures and product images.',
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      tsconfigPaths: true,
    },
    orientation: 'portrait',
    icon: './assets/icon.jpg',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/icon.jpg',
      resizeMode: 'contain',
      backgroundColor: '#121212', // Dark mode background variant (matches theme foreground context)
    },
    assetBundlePatterns: ['**/*'],
    fonts: [
      './fonts/Poppins-Light.ttf',
      './fonts/Poppins-Regular.ttf',
      './fonts/Poppins-Medium.ttf',
      './fonts/Poppins-SemiBold.ttf',
      './fonts/Poppins-Bold.ttf',
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.inventory-mgmt.app',
      infoPlist: {
        NSPhotoLibraryUsageDescription:
          'The app accesses your photos to let you set profile pictures and product images.',
        NSCameraUsageDescription:
          'The app accesses your camera to let you take photos for profile pictures and product images.',
      },
    },
    android: {
      package: 'com.inventorymgmt.app',
      adaptiveIcon: {
        foregroundImage: './assets/icon.jpg',
        backgroundColor: '#ffffff',
      },
      permissions: [
        'android.permission.CAMERA',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.READ_MEDIA_IMAGES',
      ],
      usesCleartextTraffic: true, // Allow HTTP connections for development
    },
    // EAS Update: push JS/asset changes to existing builds (OTA)
    // Bare workflow requires a literal runtimeVersion (no policy); bump when native code changes
    runtimeVersion: '1.0.0',
    updates: {
      url: 'https://u.expo.dev/389c6510-1955-41bc-aef0-7e247e12fe94',
    },
    extra: {
      // API Configuration
      apiBaseUrl: apiBaseUrl,

      eas: {
        projectId: '389c6510-1955-41bc-aef0-7e247e12fe94',
      },

      // Cloudinary Configuration
      // Check for NEXT_PUBLIC_ prefix first (from .env), then fallback to non-prefixed (from .env.dev)
      cloudinaryCloudName:
        process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME || '',
      cloudinaryApiKey:
        process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY || '',
      cloudinaryApiSecret:
        process.env.NEXT_PUBLIC_CLOUDINARY_API_SECRET || process.env.CLOUDINARY_API_SECRET || '',
      cloudinaryUploadPreset:
        process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ||
        process.env.CLOUDINARY_UPLOAD_PRESET ||
        '',
    },
  },
};
