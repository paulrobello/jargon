import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  server: {
    port: 8812,
  },
  preview: {
    port: 8812,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
