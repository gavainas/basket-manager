import { defineConfig } from 'vitest/config';

// Los tests viven en tests/ (fuera de src/, así `tsc --noEmit` del build no los
// incluye) y recorren el motor por el reducer: sin React, sin navegador.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // Una temporada entera por el reducer tarda unos segundos.
    testTimeout: 60_000,
  },
});
