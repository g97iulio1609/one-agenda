import prettierConfig from 'eslint-config-prettier';
import unusedImports from 'eslint-plugin-unused-imports';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

const config = [
  {
    ignores: ['node_modules/**', 'dist/**', 'build/**'],
  },
  prettierConfig,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    plugins: {
      'unused-imports': unusedImports,
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      'unused-imports/no-unused-imports': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-expect-error': { descriptionFormat: '^.+$' },
          'ts-ignore': true,
          'ts-nocheck': true,
          'ts-check': false,
        },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-unused-vars': 'off',
      // Disable Next.js specific rules as this is not a Next.js package
      '@next/next/no-html-link-for-pages': 'off',
    },
  },
];

export default config;

