// app.config.js - Expo configuration with environment variables
// This file reads from .env.dev and .env and makes values available to the app via Constants.expoConfig.extra
require('dotenv').config({ path: '.env.dev' });
// Also load from .env file (for NEXT_PUBLIC_ prefixed variables)
require('dotenv').config({ path: '.env' });

// Centralized API Base URL - always read from .env.dev
// This is the single source of truth for the API base URL
const apiBaseUrl = process.env.API_BASE_URL || 'http://192.168.1.11:8080/api/v1';

if (process.env.API_BASE_URL) {
  console.log('📋 app.config.js: API_BASE_URL loaded from .env.dev:', process.env.API_BASE_URL);
} else {
  console.warn('⚠️  app.config.js: API_BASE_URL not found in .env.dev, using fallback:', apiBaseUrl);
}

module.exports = {
  expo: {
    name: 'inventory-mgmt',
    slug: 'inventory-mgmt',
    version: '1.0.0',
    scheme: 'inventory-mgmt',
    platforms: ['ios', 'android'],
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-router',
      '@react-native-community/datetimepicker',
      [
        'expo-image-picker',
        {
          photosPermission: 'The app accesses your photos to let you set profile pictures and product images.',
          cameraPermission: 'The app accesses your camera to let you take photos for profile pictures and product images.',
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      tsconfigPaths: true,
    },
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/logo.png',
      resizeMode: 'contain',
      backgroundColor: '#0062AD', // Primary color: rgb(0, 98, 173)
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
        NSPhotoLibraryUsageDescription: 'The app accesses your photos to let you set profile pictures and product images.',
        NSCameraUsageDescription: 'The app accesses your camera to let you take photos for profile pictures and product images.',
      },
    },
    android: {
      package: 'com.inventorymgmt.app',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
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
    extra: {
      // API Configuration
      apiBaseUrl: apiBaseUrl,
      
      // Cloudinary Configuration
      // Check for NEXT_PUBLIC_ prefix first (from .env), then fallback to non-prefixed (from .env.dev)
      cloudinaryCloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME || '',
      cloudinaryApiKey: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY || '',
      cloudinaryApiSecret: process.env.NEXT_PUBLIC_CLOUDINARY_API_SECRET || process.env.CLOUDINARY_API_SECRET || '',
      cloudinaryUploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || process.env.CLOUDINARY_UPLOAD_PRESET || '',
    },
  },
};
