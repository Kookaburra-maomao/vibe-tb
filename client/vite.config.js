import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/vibetb/',
  server: {
    port: 5173,
    proxy: {
      '/vibetb/api': { target: 'http://localhost:3002', changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});
