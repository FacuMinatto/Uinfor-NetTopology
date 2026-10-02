import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
  },
  server: {
    host: '127.0.0.1',
    port: 3000,
    open: false,
  },
});
