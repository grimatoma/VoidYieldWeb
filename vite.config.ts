import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: process.env.VITE_BASE_URL ?? '/',
  resolve: {
    alias: {
      '@services': resolve(__dirname, 'src/services'),
      '@scenes': resolve(__dirname, 'src/scenes'),
      '@entities': resolve(__dirname, 'src/entities'),
      '@data': resolve(__dirname, 'src/data'),
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
