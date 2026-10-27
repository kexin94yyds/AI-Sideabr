module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    webextensions: true
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'package/',
    'out/',
    '_metadata/',
    'vendor/'
  ],
  rules: {
    'no-empty': 'off',
    'no-unused-vars': 'off',
    'no-useless-escape': 'off'
  },
  overrides: [
    {
      files: ['scripts/**/*.cjs', 'tests/**/*.cjs'],
      env: {
        browser: false,
        node: true
      },
      parserOptions: {
        sourceType: 'script'
      }
    },
    {
      files: ['content-scripts/**/*.js', 'js/popup.js', 'js/plugins/**/*.js'],
      rules: {
        'no-undef': 'off'
      }
    },
    {
      files: ['remotion/**/*.ts', 'remotion/**/*.tsx'],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint', 'react-hooks'],
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:react-hooks/recommended'
      ],
      rules: {
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
      }
    }
  ]
};
