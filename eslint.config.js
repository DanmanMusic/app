// eslint.config.js
import globals from 'globals';
import tseslint from 'typescript-eslint';
import eslintPluginReact from 'eslint-plugin-react';
import eslintPluginReactNative from 'eslint-plugin-react-native'; // Make sure this is installed
import eslintPluginImport from 'eslint-plugin-import';
import eslintPluginPrettier from 'eslint-plugin-prettier';
import eslintConfigPrettier from 'eslint-config-prettier';
// REMOVED: import eslintCommunity from '@react-native-community/eslint-config'; // Keep this removed

export default tseslint.config(
  // 1. Global Ignores
  {
    ignores: [
      '.expo/',
      'node_modules/',
      'dist/',
      'web-build/',
      '*.config.js',
      'babel.config.js',
      'metro.config.js',
      // Keep '*.js' ignore if your source is only TS/TSX, remove if you have JS source files
      // You might want to be more specific, e.g., '*.config.js', 'babel.config.js' etc.
      '*.js', // If your source is TS/TSX only, this ignores root JS files
    ],
  },

  // 2. Base ESLint Recommended Rules (Optional - Check if needed)
  // If you relied on eslint:recommended from the community config, you might need:
  // { rules: { /* ... require('eslint').configs.recommended.rules */ } }, // Or similar import

  // 3. Language & Parser Options for TypeScript files
  {
    files: ['**/*.{ts,tsx}'], // Apply only to TypeScript files
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json', // Essential for typed rules
      },
      globals: {
        ...globals.browser, // Use browser for React Native usually
        ...globals.node, // Include node if using Node APIs (e.g., in scripts)
        ...globals.es2021,
        __DEV__: 'readonly', // Common React Native global
      },
    },
  },

  // 4. Plugin Configurations and Rules for TypeScript/React Native files
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      // Define plugins with the key being the prefix used in rules
      react: eslintPluginReact,
      'react-native': eslintPluginReactNative, // Include the RN plugin directly
      import: eslintPluginImport,
      '@typescript-eslint': tseslint.plugin,
      prettier: eslintPluginPrettier,
    },
    settings: {
      'import/resolver': {
        typescript: true, // Simplified setting for flat config
        node: true,
      },
      react: {
        version: 'detect',
      },
    },
    rules: {
      // Apply recommended rules explicitly if needed
      // ...eslintPluginReact.configs.recommended.rules, // Check if needed, often included elsewhere
      ...tseslint.configs.recommended.rules,
      // ...eslintPluginReactNative.configs.all.rules, // Or recommended, check plugin docs for flat config export

      // Your custom rules/overrides
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'react/prop-types': 'off', // Not needed with TypeScript
      'react/react-in-jsx-scope': 'off', // Not needed with modern JSX transform
      'react-native/no-unused-styles': 'warn',
      // Add any other specific rules from @react-native-community/eslint-config you want to keep

      // Ensure no-unused-vars is correctly configured (it should be by default from tseslint recommended)
      'no-unused-vars': 'off', // Disable base JS rule
      '@typescript-eslint/no-unused-vars': [
        'warn', // It was correctly reporting warnings
        {
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],

      // Prettier rule
      'prettier/prettier': 'warn', // Runs Prettier as an ESLint rule

      // Import plugin rules
      'import/order': [
        'warn',
        {
          'newlines-between': 'always',
          groups: [
            'builtin',
            'external',
            'internal',
            ['parent', 'sibling'],
            'index',
            'object',
            'type',
          ],
          pathGroupsExcludedImportTypes: ['react'], // Keep if needed
          pathGroups: [
            { pattern: 'react', group: 'external', position: 'before' },
            { pattern: 'react-native', group: 'external', position: 'before' },
            { pattern: '@react-*/**', group: 'external', position: 'before' },
            { pattern: '@expo*/**', group: 'external', position: 'before' },
            { pattern: '@supabase*/**', group: 'external', position: 'before' }, // Example
            { pattern: '@tanstack*/**', group: 'external', position: 'before' }, // Example
            { pattern: '@*', group: 'external', position: 'before' }, // Catch other scoped external packages
            // Adjust internal paths if you use aliases or different structure
            { pattern: '{./src/**,../src/**}', group: 'internal', position: 'after' },
            { pattern: '{./components/**,../components/**}', group: 'internal', position: 'after' }, // Be specific
            { pattern: '{./hooks/**,../hooks/**}', group: 'internal', position: 'after' },
            { pattern: '{./lib/**,../lib/**}', group: 'internal', position: 'after' },
            { pattern: '{./contexts/**,../contexts/**}', group: 'internal', position: 'after' },
            { pattern: '{./styles/**,../styles/**}', group: 'internal', position: 'after' },
            { pattern: '{./types/**,../types/**}', group: 'internal', position: 'after' },
            { pattern: '{./utils/**,../utils/**}', group: 'internal', position: 'after' },
            { pattern: '{./views/**,../views/**}', group: 'internal', position: 'after' },
            { pattern: '{./api/**,../api/**}', group: 'internal', position: 'after' },
            { pattern: './assets/**', group: 'object', position: 'after' }, // Treat assets like objects/data
          ],
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import/newline-after-import': 'warn',
      'import/no-duplicates': 'error',

      // Add any other specific rule overrides here
    },
  },

  // 6. Prettier Config (Disables conflicting ESLint rules) - LAST
  eslintConfigPrettier
);
