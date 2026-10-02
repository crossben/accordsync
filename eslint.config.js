import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/coverage/**'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    files: ['packages/core/src/**/*.ts'],
    ignores: ['**/*.test.ts'],
    rules: {
      // The merge core is pure: no clock reads, no randomness, no I/O (plan.md §4).
      'no-restricted-globals': [
        'error',
        { name: 'Date', message: 'Inject time; the core never reads the clock.' },
        { name: 'fetch', message: 'The core does no I/O.' },
        { name: 'setTimeout', message: 'The core does no scheduling.' },
        { name: 'crypto', message: 'Inject randomness.' },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Inject randomness.' },
      ],
    },
  },
);
