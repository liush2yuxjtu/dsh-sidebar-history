import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';
const source = resolve(process.env.DSH_SOURCE_ROOT);
const escapedSource = source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export default defineConfig({ root: resolve(import.meta.dirname, '..'),
  test: { include: [resolve(import.meta.dirname, 'browser.test.mjs'), resolve(import.meta.dirname, 'locale-layout.test.mjs')],
    server: { deps: { external: [new RegExp(`^${escapedSource}/(?:packages|vendor)/`)] } },
    testTimeout: 240000, hookTimeout: 120000, fileParallelism: false, maxWorkers: 1,
  },
});
