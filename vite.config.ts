import { fileURLToPath } from 'url';
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  base: '/unlocked-todo/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    react(),
    VitePWA({
      devOptions: { enabled: true },
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        importScripts: ['sw-custom.js'],
      },
      manifest: {
        name: 'Unlocked Todo',
        short_name: 'Unlocked Todo',
        start_url: '.',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#0ea5e9',
        description: 'A powerful and modern todo application.',
        icons: [
          {
            src: 'https://placehold.co/192x192/0ea5e9/ffffff?text=Todo',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'https://placehold.co/512x512/0ea5e9/ffffff?text=Todo',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
    env: {
      TZ: 'UTC',
    },
  },
});
