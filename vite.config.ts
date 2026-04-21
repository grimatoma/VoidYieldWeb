import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: process.env.VITE_BASE_URL ?? '/',
  // Serve `assets/` as a static public directory.
  // Files are reachable at root-relative URLs: assets/sprites/foo.png -> /sprites/foo.png
  publicDir: resolve(__dirname, 'assets'),
  resolve: {
    alias: {
      '@services': resolve(__dirname, 'src/services'),
      '@scenes': resolve(__dirname, 'src/scenes'),
      '@entities': resolve(__dirname, 'src/entities'),
      '@data': resolve(__dirname, 'src/data'),
      '@ui': resolve(__dirname, 'src/ui'),
      '@store': resolve(__dirname, 'src/store'),
      '@assets': resolve(__dirname, 'assets'),
    },
  },
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 4000,
  },
  server: {
    port: 3000,
  },
  assetsInclude: ['**/*.ttf', '**/*.png', '**/*.json'],
});
