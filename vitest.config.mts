import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: [
      // Tests run the REAL services against a real Postgres via the driver-adapter client.
      { find: /^@\/lib\/prisma$/, replacement: path.resolve(__dirname, 'tests/helpers/prisma.ts') },
      { find: /^@\//, replacement: path.resolve(__dirname, 'src') + '/' },
    ],
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/helpers/setup.ts'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    fileParallelism: false, // integration tests share one database
  },
});
