import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  build: {
    rollupOptions: {
      external: ['electron', 'better-sqlite3', 'electron-store', 'sharp'],
      output: {
        entryFileNames: 'main.js',
      },
    },
  },
});
