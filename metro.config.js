// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Get the default Expo Metro config
const defaultConfig = getDefaultConfig(__dirname);

// Define the path to your mock file
const mockHttpCommonPath = path.resolve(__dirname, 'src', 'mocks', '_http_common.js'); // Place mock inside src/mocks
const emptyModulePath = path.resolve(__dirname, 'src', 'mocks', '_empty.js');

// Customize the resolver
defaultConfig.resolver.extraNodeModules = {
  ...(defaultConfig.resolver.extraNodeModules || {}), // Preserve existing extraNodeModules if any
  _http_common: mockHttpCommonPath,
  // async_hooks: emptyModulePath,
  // http: emptyModulePath,
  // https: emptyModulePath,
  // net: emptyModulePath,
  // stream: emptyModulePath,
  // url: emptyModulePath,
  // events: emptyModulePath, // For EventEmitter
  // util: emptyModulePath,   // Often used for inheritance helpers
  // zlib: emptyModulePath,   // Sometimes used by http/https related streams
  // assert: emptyModulePath, // Sometimes used internally  
  // Add other node built-ins here if they cause issues later
  // e.g., 'url': require.resolve('url/'), // Use browser polyfill if needed
};

// Optional: Add 'mjs' to sourceExts if not already present by default
// This helps Metro understand .mjs files like the one causing the error
defaultConfig.resolver.sourceExts = defaultConfig.resolver.sourceExts
  ? [...defaultConfig.resolver.sourceExts, 'mjs', 'cjs'] // Add mjs and cjs
  : ['jsx', 'js', 'ts', 'tsx', 'json', 'mjs', 'cjs']; // Default + mjs/cjs

module.exports = defaultConfig;
