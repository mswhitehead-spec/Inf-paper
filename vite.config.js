import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/Inf-paper/',
  server: { host: true },
  optimizeDeps: {
    exclude: ['pdfjs-dist'],
  },
});
