import fs from 'fs';

const content = fs.readFileSync('app.js', 'utf8');
const lines = content.split(/\r?\n/);

// Find all top-level functions
const funcMap = new Map(); // funcName -> sliceIndex
const functionRegex = /^\s{2}(?:async\s+)?function\s+([a-zA-Z0-9_]+)\s*\(/;

const slices = [
  { name: 'palette', file: 'src/ui/palette.js', start: 332, end: 449 },
  { name: 'nodes', file: 'src/core/nodes.js', start: 450, end: 1022 },
  { name: 'cables', file: 'src/core/cables.js', start: 1023, end: 3243 },
  { name: 'canvas', file: 'src/core/canvas.js', start: 3244, end: 3639 },
  { name: 'nodes_drag', file: 'src/core/nodes.js', start: 3640, end: 3883 },
  { name: 'cable_modal', file: 'src/ui/modals.js', start: 3884, end: 4545 },
  { name: 'inspector', file: 'src/ui/inspector.js', start: 4546, end: 5859 },
  { name: 'zones', file: 'src/core/zones.js', start: 5860, end: 6286 },
  { name: 'underlay', file: 'src/core/underlay.js', start: 6287, end: 6560 },
  { name: 'layers', file: 'src/core/layers.js', start: 6561, end: 6611 },
  { name: 'search', file: 'src/core/search.js', start: 6612, end: 6731 },
  { name: 'ip_inventory', file: 'src/ui/modals.js', start: 6732, end: 7114 },
  { name: 'audit_ping', file: 'src/core/audit.js', start: 7115, end: 7183 },
  { name: 'audit_linter', file: 'src/core/audit.js', start: 7184, end: 7392 },
  { name: 'topbar_dropdowns', file: 'src/ui/topbar.js', start: 7393, end: 7408 },
  { name: 'sheets', file: 'src/core/sheets.js', start: 7409, end: 8003 },
  { name: 'projects_storage', file: 'src/storage/db.js', start: 8004, end: 8126 },
  { name: 'history', file: 'src/state/history.js', start: 8127, end: 8394 },
  { name: 'filesystem', file: 'src/storage/db.js', start: 8395, end: 8794 },
  { name: 'pdf_export', file: 'src/export/exportPdf.js', start: 8795, end: 10512 },
  { name: 'svg_export', file: 'src/export/exportSvg.js', start: 10513, end: 11102 },
  { name: 'default_topology', file: 'src/config/defaultTopology.js', start: 11103, end: 11237 },
  { name: 'canvas_guides', file: 'src/core/canvas.js', start: 11238, end: 11313 },
  { name: 'canvas_minimap', file: 'src/core/canvas.js', start: 11314, end: 11555 },
  { name: 'topbar_view_menu', file: 'src/ui/topbar.js', start: 11556, end: 11613 },
  { name: 'bom', file: 'src/ui/bom.js', start: 11614, end: 11951 },
  { name: 'topbar_events', file: 'src/ui/topbar.js', start: 11952, end: 12631 },
  { name: 'sidebars', file: 'src/ui/topbar.js', start: 12632, end: 12739 },
  { name: 'shortcuts', file: 'src/ui/topbar.js', start: 12740, end: 12919 },
  { name: 'utils', file: 'src/utils/helpers.js', start: 12920, end: 12951 }
];

lines.forEach((line, idx) => {
  const match = line.match(functionRegex);
  if (match) {
    const fnName = match[1];
    const slice = slices.find(s => (idx + 1) >= s.start && (idx + 1) <= s.end);
    if (slice) {
      funcMap.set(fnName, slice.file);
    }
  }
});

console.log('Mapped functions to files:', funcMap.size);

// Now for each target file, check which external functions it calls
const targetFiles = [...new Set(slices.map(s => s.file))];
const fileImports = {};

targetFiles.forEach(targetFile => {
  fileImports[targetFile] = new Set();
  const fileSlices = slices.filter(s => s.file === targetFile);
  
  fileSlices.forEach(s => {
    for (let i = s.start - 1; i < s.end; i++) {
      const line = lines[i];
      for (const [fnName, sourceFile] of funcMap.entries()) {
        if (sourceFile !== targetFile) {
          const callRegex = new RegExp('\\b' + fnName + '\\s*\\(');
          if (callRegex.test(line)) {
            fileImports[targetFile].add(fnName);
          }
        }
      }
    }
  });
});

for (const [file, imports] of Object.entries(fileImports)) {
  console.log(`\n${file} calls external functions (${imports.size}):`, [...imports].join(', '));
}
