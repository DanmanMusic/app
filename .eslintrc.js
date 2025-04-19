// .eslintrc.js
module.exports = {
    root: true,
    extends: [
      '@react-native-community', // Basic RN rules (includes react-native plugin)
      'eslint:recommended', // Standard ESLint recommended rules
      'plugin:react/recommended', // React specific rules
      'plugin:@typescript-eslint/recommended', // TypeScript recommended rules
      'plugin:import/recommended', // Import rules
      'plugin:import/typescript', // TypeScript specific import rules
      'prettier' // Turns off ESLint rules that conflict with Prettier
    ],
    parser: '@typescript-eslint/parser', // Use TS parser
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
      ecmaVersion: 'latest',
      sourceType: 'module',
       // project: './tsconfig.json', // Optional: Needed for rules that require type information
    },
    plugins: [
      'react',
      'react-native', // Keep the plugin listed here
      '@typescript-eslint',
      'import', // Import plugin
      'prettier' // Prettier plugin
    ],
    settings: {
      'import/resolver': {
        typescript: true,
        node: true,
      },
      react: {
        version: 'detect', // Automatically detect the React version
      },
    },
    rules: {
      // Custom rules or overrides
      '@typescript-eslint/explicit-function-return-type': 'off', // Adjust as per your preference
      '@typescript-eslint/no-explicit-any': 'off', // Adjust as per your preference
      'react/prop-types': 'off', // Often turned off in TS projects as types provide this
      'react/react-in-jsx-scope': 'off', // Not needed with new React transforms
      'react-native/no-unused-styles': 'warn', // Warn about unused styles
      'react-native/split-platform-components': 'off', // May need adjustment
      'react-native/no-inline-styles': 'warn', // Warn about inline styles (good practice to avoid)
      'react-native/no-unconditional-style': 'error', // Avoid styles that might break conditionally
      // Rules for unused imports - provided by eslint:recommended and @typescript-eslint/recommended
      // 'no-unused-vars': 'warn', // ESLint's rule (might conflict with TS, disable if using TS rule)
      '@typescript-eslint/no-unused-vars': 'warn', // TS-aware unused vars (includes imports)
      'import/no-unused-modules': 'warn', // Another rule for unused exports/imports
  
      // Optional: Configure import ordering
      'import/order': [
           'warn',
           {
               'newlines-between': 'always',
               'groups': ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
               'pathGroupsExcludedImportTypes': ['react'],
               'pathGroups': [
                    {
                       'pattern': 'react',
                       'group': 'external',
                       'position': 'before'
                    },
                    {
                       'pattern': '@*(react|redux|expo)*/**',
                       'group': 'external',
                       'position': 'before'
                    },
                    {
                       'pattern': './src/**', // Adjust if your internal structure is different
                       'group': 'internal',
                       'position': 'after'
                    }
               ],
               'alphabetize': {
                   'order': 'asc',
                   'caseInsensitive': true
               },
           },
       ],
       'import/newline-after-import': 'warn', // Ensure a blank line after imports
       'import/no-duplicates': 'error', // Prevent duplicate imports
  
    },
    // Optional: Add 'ignorePatterns' if you have directories you don't want linted
    ignorePatterns: [
      '.expo/',
      'node_modules/',
      'dist/',
      'web-build/',
      '*.js', // Ignore JS files in root unless they are configs
      '*.config.js', // Ignore config files like babel.config.js
    ]
  };