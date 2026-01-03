import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@error-explorer/browser': resolve(__dirname, '../../core/browser/src/index.ts'),
      '@error-explorer/vue': resolve(__dirname, '../../frameworks/vue/src/index.ts'),
    },
  },
  server: {
    port: 3002,
  },
});
