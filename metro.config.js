// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Get the default Expo Metro config
const defaultConfig = getDefaultConfig(__dirname);

// Define the path to your mock file
const mockHttpCommonPath = path.resolve(__dirname, 'src', 'mocks', '_http_common.js'); // Place mock inside src/mocks

// Customize the resolver
defaultConfig.resolver.extraNodeModules = {
  ...(defaultConfig.resolver.extraNodeModules || {}), // Preserve existing extraNodeModules if any
  '_http_common': mockHttpCommonPath,
  // Add other node built-ins here if they cause issues later
  // e.g., 'url': require.resolve('url/'), // Use browser polyfill if needed
};

// Optional: Add 'mjs' to sourceExts if not already present by default
// This helps Metro understand .mjs files like the one causing the error
defaultConfig.resolver.sourceExts = defaultConfig.resolver.sourceExts
  ? [...defaultConfig.resolver.sourceExts, 'mjs', 'cjs'] // Add mjs and cjs
  : ['jsx', 'js', 'ts', 'tsx', 'json', 'mjs', 'cjs']; // Default + mjs/cjs


module.exports = defaultConfig;