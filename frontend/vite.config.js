import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the API and uploaded images are proxied to the Express server,
// so the browser sees a single origin and no CORS configuration is needed.
const backend = process.env.VITE_BACKEND_URL || 'http://localhost:5001';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api': { target: backend, changeOrigin: true },
      '/uploads': { target: backend, changeOrigin: true },
    },
  },
  preview: {
    port: 4173,
    proxy: {
      '/api': { target: backend, changeOrigin: true },
      '/uploads': { target: backend, changeOrigin: true },
    },
  },
  build: { chunkSizeWarningLimit: 900 },
});
