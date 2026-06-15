// When both app.json and app.config.js exist, Expo passes the resolved config.
// We extend it with extra (e.g. cloudinary) and Expo Updates settings.
module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...(config.extra || {}),
    apiBaseUrl: process.env.API_BASE_URL || 'https://inventory-api.bvrdesign.africa/api/v1',
    eas: {
      projectId: '389c6510-1955-41bc-aef0-7e247e12fe94',
    },
    cloudinary: {
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
  // Expo Updates (EAS Update). EAS Build injects updates.url at build time.
  updates: {
    checkAutomatically: 'ON_LOAD',
    fallbackToCacheTimeout: 0,
    ...config.updates,
  },
  // Required for EAS Update: ties OTA updates to app version (or use policy: 'sdkVersion').
  runtimeVersion: config.runtimeVersion ?? { policy: '1.0.0"' },
});
