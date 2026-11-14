import { defineConfig } from 'vite';

export default defineConfig({
  // maplibre-gl v6 loads its worker relative to the library file; pre-bundling would move the library away from it.
  optimizeDeps: { exclude: ['maplibre-gl'] },
  build: { outDir: 'dist', chunkSizeWarningLimit: 1500 },
});
