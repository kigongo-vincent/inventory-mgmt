// Learn more https://docs.expo.io/guides/customizing-metro
// Use @expo/metro-config so EAS Build recognizes the config (avoids "does not extend" warning)
const { getDefaultConfig } = require('@expo/metro-config');

const { withNativeWind } = require('nativewind/metro');

/** @type {import('@expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css', inlineRem: 16 });
