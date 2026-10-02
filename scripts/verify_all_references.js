import fs from 'fs';
import path from 'path';

// Read all JS files in src/
function getJsFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getJsFiles(fullPath));
    } else if (file.endsWith('.js')) {
      results.push(fullPath);
    }
  });
  return results;
}

const jsFiles = getJsFiles('src');
console.log('Total files in src:', jsFiles.length);

// Collect all exported identifiers
const allExports = new Set();
jsFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const exportMatches = content.matchAll(/export\s+(?:function|const|let|var)\s+([a-zA-Z0-9_]+)/g);
  for (const m of exportMatches) {
    allExports.add(m[1]);
  }
});
console.log('Total exported identifiers:', allExports.size);

// Standard JS / DOM globals to ignore
const standardGlobals = new Set([
  'console', 'document', 'window', 'localStorage', 'sessionStorage', 'setTimeout', 'clearTimeout',
  'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame',
  'Math', 'JSON', 'Date', 'Array', 'Object', 'String', 'Number', 'Boolean', 'RegExp',
  'Set', 'Map', 'WeakMap', 'WeakSet', 'Promise', 'fetch', 'URL', 'URLSearchParams',
  'Blob', 'FileReader', 'Image', 'WebSocket', 'Error', 'TypeError', 'RangeError',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURIComponent', 'decodeURIComponent',
  'confirm', 'alert', 'prompt', 'escape', 'unescape', 'navigator', 'screen', 'location',
  'history', 'performance', 'atob', 'btoa', 'crypto'
]);

// Check each file for unresolved calls
jsFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const localDefs = new Set();
  
  // Local functions, vars, consts, params
  const localMatches = content.matchAll(/(?:function|const|let|var|import\s*\{[^}]*\})\s+([a-zA-Z0-9_]+)/g);
  for (const m of localMatches) {
    localDefs.add(m[1]);
  }
  // Imports { a, b, c }
  const importBlocks = content.matchAll(/import\s*\{([^}]+)\}/g);
  for (const b of importBlocks) {
    b[1].split(',').forEach(item => {
      const parts = item.trim().split(/\s+as\s+/);
      localDefs.add(parts[parts.length - 1].trim());
    });
  }

  // Find all function calls: foo(...)
  const callMatches = content.matchAll(/\b([a-zA-Z0-9_$]+)\s*\(/g);
  for (const c of callMatches) {
    const fn = c[1];
    if (standardGlobals.has(fn)) continue;
    if (localDefs.has(fn)) continue;
    if (fn === 'if' || fn === 'for' || fn === 'while' || fn === 'switch' || fn === 'catch' || fn === 'return') continue;
    if (fn.startsWith('_')) continue;
    
    // Check if it's exported somewhere else but not imported here
    if (allExports.has(fn)) {
      console.warn(`[MISSING IMPORT in ${file}]: Function "${fn}()" exists in project but is NOT imported!`);
    } else {
      console.error(`[UNDEFINED CALL in ${file}]: Function "${fn}()" is NOT defined anywhere in project!`);
    }
  }
});

console.log('Verification finished.');
