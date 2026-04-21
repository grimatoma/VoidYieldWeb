import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
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
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
