// eslint.config.js
import globals from 'globals';
import tseslint from 'typescript-eslint';
import eslint from '@eslint/js';
import eslintPluginReact from 'eslint-plugin-react';
import eslintPluginReactHooks from 'eslint-plugin-react-hooks'; // <-- ADDED: For React Hooks rules
import eslintPluginReactNative from 'eslint-plugin-react-native';
import eslintPluginImport from 'eslint-plugin-import';
import eslintConfigPrettier from 'eslint-config-prettier'; // <-- This should be the LAST element

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      'node_modules/',
      '.expo/',
      'dist/',
      'web-build/',
      '*.config.js', // Ignores babel.config.js, metro.config.js, etc.
    ],
  },

  // Base ESLint recommended rules
  eslint.configs.recommended,

  // --- Main TypeScript, React, and React Native Configuration ---
  {
    files: ['src/**/*.{ts,tsx}'], // Be more specific to your source code
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json', // Essential for type-aware rules
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        __DEV__: 'readonly', // Common React Native global
      },
    },
    plugins: {
      // NOTE: Many plugins are already added by the configs below,
      // but explicitly defining them can help with clarity.
      '@typescript-eslint': tseslint.plugin,
      react: eslintPluginReact,
      'react-hooks': eslintPluginReactHooks,
      'react-native': eslintPluginReactNative,
      import: eslintPluginImport,
    },
    settings: {
      'import/resolver': {
        typescript: true,
        node: true,
      },
      react: {
        version: 'detect',
      },
    },
    // FIX: Apply recommended configs as whole objects, not spreading rules
    ...tseslint.configs.recommendedTypeChecked, // Use type-checked for more power
    ...[
      eslintPluginReact.configs.recommended,
      eslintPluginReactHooks.configs.recommended,
      eslintPluginReactNative.configs.all,
    ],

    // --- Your Custom Rules and Overrides ---
    rules: {
      // Your custom preference overrides
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'react/prop-types': 'off', // Not needed with TypeScript
      'react/react-in-jsx-scope': 'off', // Not needed with modern JSX transform

      // Override the base rule and use the TypeScript-aware version
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // Import Plugin Rules (your config was good!)
      'import/order': [
        'warn',
        {
          'newlines-between': 'always',
          groups: [
            'builtin',
            'external',
            'internal',
            ['parent', 'sibling', 'index'],
            'object',
            'type',
          ],
          pathGroups: [
            { pattern: 'react', group: 'external', position: 'before' },
            { pattern: 'react-native', group: 'external', position: 'before' },
            {
              pattern: '@{react,expo,supabase,tanstack}*/**',
              group: 'external',
              position: 'before',
            },
            { pattern: '@/**', group: 'internal', position: 'after' },
            { pattern: 'src/**', group: 'internal', position: 'after' },
          ],
          pathGroupsExcludedImportTypes: ['react'],
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import/newline-after-import': 'warn',
      'import/no-duplicates': 'error',
    },
  },

  // Prettier config must be last to override other formatting rules
  eslintConfigPrettier
);
