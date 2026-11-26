import { defineConfig } from 'vite';
import fs from 'node:fs';

function stripHtmlComments() {
  return {
    name: 'strip-html-comments',
    apply: 'build',
    enforce: 'pre',
    load(id) {
      if (id.replace(/\\/g, '/').endsWith('/src/workspace/workspaceShell.html?raw')) {
        const filePath = id.slice(0, -4);
        const raw = fs.readFileSync(filePath, 'utf8');
        const compact = raw
          .replace(/<!--[\s\S]*?-->/g, '')
          .replace(/^\s+/gm, '')
          .replace(/\r?\n/g, ' ')
          .trim();
        return `export default ${JSON.stringify(compact)}`;
      }
    },
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        return html.replace(/<!--[\s\S]*?-->/g, '');
      }
    }
  };
}

export default defineConfig({
  base: './',
  plugins: [stripHtmlComments()],
  esbuild: {
    drop: ['debugger'],
    pure: ['console.log', 'console.debug']
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalized = id.replace(/\\/g, '/');
          if (normalized.includes('commonjsHelpers') || normalized.includes('node_modules/localforage')) {
            return 'vendor-storage';
          }
          if (normalized.includes('node_modules/firebase') || normalized.includes('node_modules/@firebase')) {
            return 'vendor-firebase';
          }
          if (normalized.includes('node_modules/peerjs')) {
            return 'vendor-peerjs';
          }
        }
      }
    }
  },
  server: {
    host: '127.0.0.1',
    port: 3000,
    open: false,
  },
});
