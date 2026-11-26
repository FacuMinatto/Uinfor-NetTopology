import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('..', import.meta.url));

test('index.html is a minimal auth shell without private workspace DOM or HTML comments', () => {
  const html = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
  assert.match(html, /id="auth-gate-overlay"/);
  assert.match(html, /id="workspace-root"/);
  assert.equal(html.includes('class="topbar"'), false, 'index.html must not contain topbar');
  assert.equal(html.includes('id="canvas-viewport"'), false, 'index.html must not contain canvas-viewport');
  assert.equal(html.includes('id="sidebar-palette"'), false, 'index.html must not contain sidebar-palette');
  assert.equal(html.includes('<!--'), false, 'index.html must not contain HTML comments');
});

test('public/.htaccess enforces directory listing off, sensitive file denial, security headers, and no-store', () => {
  const htaccess = fs.readFileSync(path.join(rootDir, 'public', '.htaccess'), 'utf8');
  assert.match(htaccess, /Options\s+-Indexes/);
  assert.match(htaccess, /Require\s+all\s+denied/);
  assert.match(htaccess, /X-Frame-Options/);
  assert.match(htaccess, /X-Content-Type-Options/);
  assert.match(htaccess, /Referrer-Policy/);
  assert.match(htaccess, /Permissions-Policy/);
  assert.match(htaccess, /index\\\.html\|sw\\\.js\|manifest\\\.webmanifest/);
  assert.match(htaccess, /no-store/);
});

test('public/sw.js uses v6 cache, skips auth endpoints, and clears caches on CLEAR_CACHE', () => {
  const sw = fs.readFileSync(path.join(rootDir, 'public', 'sw.js'), 'utf8');
  assert.match(sw, /nettopology-shell-v6/);
  assert.match(sw, /CLEAR_CACHE/);
  assert.match(sw, /\/__\/auth\//);
  assert.match(sw, /identitytoolkit/);
  assert.match(sw, /securetoken/);
});

test('production build (dist/) strips comments, emits no source maps, and lazy-loads workspace chunk', () => {
  const distDir = path.join(rootDir, 'dist');
  assert.ok(fs.existsSync(distDir), 'dist/ must exist (run npm run build before verifying build assertions)');

  const distIndex = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');
  assert.equal(distIndex.includes('<!--'), false, 'dist/index.html must have zero HTML comments');
  assert.equal(distIndex.includes('class="topbar"'), false, 'dist/index.html must not contain topbar');
  assert.equal(distIndex.includes('id="canvas-viewport"'), false, 'dist/index.html must not contain canvas-viewport');
  assert.equal(distIndex.includes('id="sidebar-palette"'), false, 'dist/index.html must not contain sidebar-palette');

  const walkFiles = (dir) => {
    const out = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) out.push(...walkFiles(full));
      else out.push(full);
    }
    return out;
  };

  const allDistFiles = walkFiles(distDir);
  const mapFiles = allDistFiles.filter((f) => f.endsWith('.map'));
  assert.equal(mapFiles.length, 0, `dist/ must contain zero .map files, found: ${mapFiles.join(', ')}`);

  const assetFiles = fs.readdirSync(path.join(distDir, 'assets'));
  const entryChunk = assetFiles.find((f) => /^index-.*\.js$/.test(f));
  const bootstrapChunk = assetFiles.find((f) => /^bootstrap-.*\.js$/.test(f));
  assert.ok(entryChunk, 'dist/assets/ must contain entry index-*.js chunk');
  assert.ok(bootstrapChunk, 'dist/assets/ must contain lazy-loaded bootstrap-*.js chunk');
  assert.notEqual(entryChunk, bootstrapChunk);

  const entryCode = fs.readFileSync(path.join(distDir, 'assets', entryChunk), 'utf8');
  const staticImports = entryCode.match(/\bimport\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s*from\s*["'][^"']+["']/g) || [];
  for (const imp of staticImports) {
    assert.equal(/vendor-peerjs/.test(imp), false, `entry chunk must not statically import vendor-peerjs: ${imp}`);
    assert.equal(/vendor-storage/.test(imp), false, `entry chunk must not statically import vendor-storage: ${imp}`);
    assert.equal(/bootstrap-/.test(imp), false, `entry chunk must not statically import bootstrap: ${imp}`);
  }
  assert.equal(/vendor-peerjs/.test(distIndex), false, 'dist/index.html must not preload/load vendor-peerjs');
  assert.equal(/vendor-storage/.test(distIndex), false, 'dist/index.html must not preload/load vendor-storage');
  assert.equal(/bootstrap-/.test(distIndex), false, 'dist/index.html must not preload/load bootstrap chunk');
});
