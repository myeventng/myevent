import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),

  {
    // This object defines your custom rule overrides
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      // 'no-unused-vars': 'off',
      // 'react-hooks/rules-of-hooks': 'error', // Checks rules of Hooks
      // 'react-hooks/exhaustive-deps': 'warn', // Checks effect dependencies
      // 'import/no-unresolved': 'off', // Disable unresolved import errors
    },
  },
];

export default eslintConfig;
