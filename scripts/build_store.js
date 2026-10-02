import fs from 'fs';

const content = fs.readFileSync('app.js', 'utf8');
const lines = content.split(/\r?\n/);
const domLines = lines.slice(63, 285);

const storeJs = `/**
 * NetTopology - Estado Global y Referencias DOM
 */

export const state = {
  nodes: [],
  connections: [],
  selection: { type: null, id: null, ids: [] }, // type: 'node' | 'cable' | 'multi-node'
  selectedNodeIds: new Set(),
  selectedZoneIds: new Set(),
  canvasMode: 'select', // 'select' | 'pan'
  viewport: { x: 80, y: 80, zoom: 1 },
  snapToGrid: true,
  isDraggingNode: false,
  cableBridgesEnabled: true,
  gridSize: 24,
  history: [],
  historyIndex: -1,
  isConnecting: false,
  connectingSourceNodeId: null,
  tempCablePos: { x: 0, y: 0 },
  currentProjectId: null,
  currentProjectName: 'Red Corporativa Principal',
  defaultRoutingMode: 'orthogonal', // 'orthogonal' | 'curved' | 'straight'
  sheets: [],
  activeSheetId: null,
  zones: [], // { id, name, color, x, y, width, height }
  theme: 'dark', // 'dark' | 'light'
  minimapVisible: true,
  gridVisible: true,
  smartGuidesEnabled: true,
  defaultEncapsulatedLabels: false,
  underlay: null, // { src, name, x, y, width, height, scale, opacity, visible, locked }
  activeLayer: 'logical', // 'logical' (por defecto) | 'physical' | 'power' | 'all'
  
  // Estado para colaboración P2P en tiempo real
  collab: {
    active: false,
    isHost: false,
    roomId: null,
    peerId: null,
    peers: {},
    status: 'disconnected'
  }
};

export const dom = {};

export function initDom() {
  const elements = {
${domLines.join('\n')}
  Object.assign(dom, elements);
  return dom;
}
`;

fs.writeFileSync('src/state/store.js', storeJs, 'utf8');
console.log('src/state/store.js re-generated successfully.');
