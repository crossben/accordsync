import { defineConfig } from 'vitest/config';

// Workspace packages export `./src/index.ts` under the `source` condition, so tests run
// against sources without building dependencies first.
export default defineConfig({
  resolve: { conditions: ['source'] },
  ssr: { resolve: { conditions: ['source'] } },
  test: { include: ['src/**/*.test.ts', 'test/**/*.test.ts'] },
});
