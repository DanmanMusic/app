// eslint.config.js
import globals from 'globals';
import tseslint from 'typescript-eslint';
import eslintPluginReact from 'eslint-plugin-react';
import eslintPluginReactNative from 'eslint-plugin-react-native';
import eslintPluginImport from 'eslint-plugin-import';
import eslintPluginPrettier from 'eslint-plugin-prettier';
import eslintConfigPrettier from 'eslint-config-prettier';
import eslintCommunity from '@react-native-community/eslint-config';

export default tseslint.config(
  // 1. Global Ignores (equivalent to ignorePatterns)
  {
    ignores: [
      '.expo/',
      'node_modules/',
      'dist/',
      'web-build/',
      '*.config.js', // Keeps ignoring build/config JS files
      '*.js',        // Explicitly ignore root JS files if needed, adjust if you have JS source files
      'babel.config.js', // Example specific JS files to ignore
      'metro.config.js', // Example
    ],
  },

  // 2. Base ESLint Recommended Rules (applies broadly)
  {
     rules: {
        // If eslint:recommended is needed and not covered by community config
        // You might spread recommended rules here, but often community configs include it.
     }
  },

  // 3. React Native Community Config (Apply early)
  // Warning: This might need adjustments if it's not fully flat config compatible.
  // It might export an array or object that needs processing. Check its documentation.
  // Assuming it exports a compatible config object for now:
  eslintCommunity,

  // 4. Language & Parser Options for TypeScript files
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
        ...globals.node, // Or browser, depending on your target environment needs
        ...globals.es2021,
        // React Native specific globals (often handled by the plugin/community config)
        __DEV__: 'readonly',
      },
    },
  },

  // 5. Plugin Configurations and Rules for TypeScript files
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      // Define plugins with the key being the prefix used in rules
      react: eslintPluginReact,
      'react-native': eslintPluginReactNative,
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
      // Spread recommended rules from plugins
      // ...eslintPluginReact.configs.recommended.rules, // Often in community config
      ...tseslint.configs.recommended.rules, // Apply TS recommended rules
      ...eslintPluginImport.configs.recommended.rules, // Apply Import recommended rules

      // Your custom rules/overrides
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'react/prop-types': 'off', // Not needed with TypeScript
      'react/react-in-jsx-scope': 'off', // Not needed with modern JSX transform
      'react-native/no-unused-styles': 'warn',

      // Prettier rule (make sure eslint-plugin-prettier is installed)
      'prettier/prettier': 'warn', // Runs Prettier as an ESLint rule

      // Import plugin rules (adjust pathGroups if needed)
      'import/order': [
        'warn',
        {
          'newlines-between': 'always',
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling'], 'index', 'object', 'type'], // Refined groups
          pathGroupsExcludedImportTypes: ['react'], // Keep if needed
          pathGroups: [
            { pattern: 'react', group: 'external', position: 'before' },
            { pattern: 'react-native', group: 'external', position: 'before' },
             { pattern: '@react-*/**', group: 'external', position: 'before' },
            { pattern: '@expo*/**', group: 'external', position: 'before' },
             { pattern: '@*', group: 'external', position: 'before' }, // Catch other scoped external packages
            { pattern: '@src/**', group: 'internal', position: 'after' }, // Example: If you use @src alias
            { pattern: './src/**', group: 'internal', position: 'after' }, // Your source files
          ],
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import/newline-after-import': 'warn',
      'import/no-duplicates': 'error',

      // Add any other specific rule overrides here
    },
  },

  // 6. Prettier Config (Disables conflicting ESLint rules)
  // IMPORTANT: This must come LAST in the array
  eslintConfigPrettier,
);