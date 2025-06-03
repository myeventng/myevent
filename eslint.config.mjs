import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  // Extend Next.js rules
  ...compat.extends('next/core-web-vitals', 'next/typescript'),

  // Ignore Prisma generated files
  {
    ignores: ['src/generated/prisma/**'],
  },

  // Override rules for Prisma generated files
  {
    files: ['src/generated/prisma/**/*'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  // Your custom global rule overrides
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
];
