// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// This is the most important line for Fast Refresh with Expo Router + Tailwind
config.resolver.sourceExts.push('mjs', 'cjs');

module.exports = config;
