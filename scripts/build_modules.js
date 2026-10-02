import fs from 'fs';

const content = fs.readFileSync('app.js', 'utf8');
const lines = content.split(/\r?\n/);

// Extract search event lines (4468 to 4499)
const searchEventLines = lines.slice(4467, 4499);

const moduleDefs = [
  {
    file: 'src/ui/palette.js',
    slices: [
      { start: 332, end: 449 }
    ]
  },
  {
    file: 'src/core/nodes.js',
    slices: [
      { start: 450, end: 1022 },
      { start: 3640, end: 3883 }
    ]
  },
  {
    file: 'src/core/cables.js',
    slices: [
      { start: 1023, end: 3243 }
    ]
  },
  {
    file: 'src/core/canvas.js',
    slices: [
      { start: 3244, end: 3639 },
      { start: 11238, end: 11313 },
      { start: 11314, end: 11555 }
    ]
  },
  {
    file: 'src/ui/modals.js',
    slices: [
      { start: 3884, end: 4467 },
      { start: 4501, end: 4534 },
      { start: 6732, end: 7114 }
    ],
    topVars: ['let pendingConnection = null;']
  },
  {
    file: 'src/ui/inspector.js',
    slices: [
      { start: 4546, end: 5859 }
    ]
  },
  {
    file: 'src/core/zones.js',
    slices: [
      { start: 5860, end: 6286 }
    ]
  },
  {
    file: 'src/core/underlay.js',
    slices: [
      { start: 6287, end: 6560 }
    ]
  },
  {
    file: 'src/core/layers.js',
    slices: [
      { start: 6561, end: 6611 }
    ]
  },
  {
    file: 'src/core/search.js',
    slices: [
      { start: 4535, end: 4545 },
      { start: 6612, end: 6731 }
    ],
    customCode: `
export function setupSearchEvents() {
${searchEventLines.join('\n')}
}
`
  },
  {
    file: 'src/core/audit.js',
    slices: [
      { start: 7115, end: 7392 }
    ],
    customCode: `
export function setAuditFilter(val) { currentAuditFilter = val; }
export function getAuditFilter() { return currentAuditFilter; }
`
  },
  {
    file: 'src/core/sheets.js',
    slices: [
      { start: 7409, end: 8003 }
    ]
  },
  {
    file: 'src/state/history.js',
    slices: [
      { start: 8127, end: 8251 }
    ]
  },
  {
    file: 'src/storage/db.js',
    slices: [
      { start: 8004, end: 8126 },
      { start: 8252, end: 8794 }
    ]
  },
  {
    file: 'src/export/exportPdf.js',
    slices: [
      { start: 8795, end: 10512 }
    ]
  },
  {
    file: 'src/export/exportSvg.js',
    slices: [
      { start: 10513, end: 11102 }
    ]
  },
  {
    file: 'src/config/defaultTopology.js',
    slices: [
      { start: 11103, end: 11237 }
    ]
  },
  {
    file: 'src/ui/bom.js',
    slices: [
      { start: 11614, end: 11951 }
    ]
  },
  {
    file: 'src/ui/topbar.js',
    slices: [
      { start: 7393, end: 7408 },
      { start: 11556, end: 11613 },
      { start: 11952, end: 12919 }
    ]
  }
];

const functionRegex = /^\s{2}(?:async\s+)?function\s+([a-zA-Z0-9_]+)\s*\(/;
const funcToFile = new Map();

moduleDefs.forEach(mod => {
  mod.slices.forEach(s => {
    for (let i = s.start - 1; i < s.end; i++) {
      const match = lines[i].match(functionRegex);
      if (match) {
        funcToFile.set(match[1], mod.file);
      }
    }
  });
  if (mod.file === 'src/core/search.js') {
    funcToFile.set('setupSearchEvents', 'src/core/search.js');
  }
  if (mod.file === 'src/core/audit.js') {
    funcToFile.set('setAuditFilter', 'src/core/audit.js');
    funcToFile.set('getAuditFilter', 'src/core/audit.js');
  }
});

console.log('Total functions mapped:', funcToFile.size);

// For each module, construct the code
moduleDefs.forEach(mod => {
  const codeChunks = [];
  const exportedFuncs = [];

  mod.slices.forEach(s => {
    for (let i = s.start - 1; i < s.end; i++) {
      let line = lines[i];
      const match = line.match(functionRegex);
      if (match) {
        exportedFuncs.push(match[1]);
        line = line.replace(/^\s{2}(async\s+)?function\s+/, 'export $1function ');
      }
      codeChunks.push(line);
    }
  });

  if (mod.customCode) {
    codeChunks.push(mod.customCode);
  }

  // If mod is modals.js, inside setupModalEvents we must call setupSearchEvents()
  if (mod.file === 'src/ui/modals.js') {
    // Add call to setupSearchEvents() in setupModalEvents
    for (let i = 0; i < codeChunks.length; i++) {
      if (codeChunks[i].includes('export function setupModalEvents() {')) {
        codeChunks[i] += '\n    setupSearchEvents();';
        break;
      }
    }
  }

  const fullText = codeChunks.join('\n');

  // Determine which external functions are referenced in this module using word boundary!
  const calledFuncsByFile = new Map();
  for (const [fnName, sourceFile] of funcToFile.entries()) {
    if (sourceFile !== mod.file) {
      const wordRegex = new RegExp('\\b' + fnName + '\\b');
      if (wordRegex.test(fullText)) {
        if (!calledFuncsByFile.has(sourceFile)) {
          calledFuncsByFile.set(sourceFile, []);
        }
        calledFuncsByFile.get(sourceFile).push(fnName);
      }
    }
  }

  function getRelPath(fromFile, toFile) {
    const fromParts = fromFile.split('/');
    const toParts = toFile.split('/');
    if (fromParts[1] === toParts[1]) {
      return './' + toParts[2];
    } else {
      return '../' + toParts[1] + '/' + toParts[2];
    }
  }

  function getRootRel(fromFile, toRootRel) {
    return '../' + toRootRel;
  }

  // Filter constants that are already declared inside this module
  const allConstants = ['STORAGE_PROJECTS_KEY', 'STORAGE_ACTIVE_ID_KEY', 'STORAGE_LEGACY_KEY', 'SHEET_PRESETS', 'ZONE_COLOR_PALETTES', 'MAX_HISTORY_STEPS', 'DEFAULT_GRID_SIZE'];
  const neededConstants = allConstants.filter(c => {
    const declRegex = new RegExp('(const|let|var)\\s+' + c + '\\s*=');
    return !declRegex.test(fullText);
  });

  const importStatements = [
    `import { state, dom } from '${getRootRel(mod.file, 'state/store.js')}';`,
    `import { app } from '${getRootRel(mod.file, 'core/appContext.js')}';`,
    `import { DEVICE_ICONS, DEVICE_ICONS_LIGHT, DEVICE_METADATA, CABLE_TYPES, getDeviceIcon, generateSwitchPorts, generateRouterPorts } from '${getRootRel(mod.file, 'config/icons.js')}';`,
    `import { ${neededConstants.join(', ')} } from '${getRootRel(mod.file, 'config/constants.js')}';`,
    `import { escapeHtml, incrementIp, formatDateForFile, clamp, generateId } from '${getRootRel(mod.file, 'utils/helpers.js')}';`
  ];

  for (const [sourceFile, fns] of calledFuncsByFile.entries()) {
    const rel = getRelPath(mod.file, sourceFile);
    importStatements.push(`import { ${fns.join(', ')} } from '${rel}';`);
  }

  const topVarsCode = (mod.topVars || []).join('\n');

  const appRegistrations = exportedFuncs.map(fn => `app.${fn} = ${fn};`).join('\n');

  let fileContent = `/**
 * NetTopology - Módulo ${mod.file}
 */

${importStatements.join('\n')}

${topVarsCode}

${codeChunks.join('\n')}

// Registrar métodos en el contexto global de aplicación
${appRegistrations}
`;

  // Fix currentAuditFilter assignment in topbar if present
  if (mod.file === 'src/ui/topbar.js') {
    fileContent = fileContent.replace(/currentAuditFilter\s*=\s*e\.target\.dataset\.filter;/, 'setAuditFilter(e.target.dataset.filter);');
  }

  fs.writeFileSync(mod.file, fileContent, 'utf8');
  console.log(`Generated ${mod.file} (${codeChunks.length} lines, ${exportedFuncs.length} exports, ${calledFuncsByFile.size} imports)`);
});
