// Default Expo Metro config. Kept explicit so future customizations
// (svg transformer, monorepo watchFolders) have a home.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = config;
