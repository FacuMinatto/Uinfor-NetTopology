import test from 'node:test';
import assert from 'node:assert/strict';

function createFakeClassList() {
  const set = new Set();
  return {
    add: (...cls) => cls.forEach((c) => set.add(c)),
    remove: (...cls) => cls.forEach((c) => set.delete(c)),
    toggle: (c, force) => (
      force === undefined
        ? (set.has(c) ? (set.delete(c), false) : (set.add(c), true))
        : (force ? (set.add(c), true) : (set.delete(c), false))
    ),
    contains: (c) => set.has(c)
  };
}

function createFakeElement(tag = 'div', id = null) {
  const attrs = new Map();
  const children = [];
  const el = {
    id,
    tagName: tag.toUpperCase(),
    parentNode: null,
    style: { setProperty() {}, removeProperty() {} },
    dataset: {},
    classList: createFakeClassList(),
    children,
    innerHTML: '',
    textContent: '',
    value: '',
    setAttribute(k, v) { attrs.set(k, String(v)); },
    getAttribute(k) { return attrs.has(k) ? attrs.get(k) : null; },
    removeAttribute(k) { attrs.delete(k); },
    hasAttribute(k) { return attrs.has(k); },
    appendChild(child) {
      if (child.tagName === 'FRAGMENT') {
        for (const grandChild of [...child.children]) {
          grandChild.parentNode = el;
          children.push(grandChild);
        }
        child.children.length = 0;
        return child;
      }
      child.parentNode = el;
      children.push(child);
      return child;
    },
    remove() { this.parentNode = null; },
    addEventListener() {},
    removeEventListener() {},
    closest() { return null; },
    contains() { return false; },
    querySelectorAll() { return []; },
    querySelector() { return null; },
    getBoundingClientRect() { return { width: 1200, height: 800, left: 0, top: 0 }; }
  };
  return el;
}

const storageMap = new Map();
globalThis.localStorage = {
  getItem: (k) => (storageMap.has(k) ? storageMap.get(k) : null),
  setItem: (k, v) => storageMap.set(k, String(v)),
  removeItem: (k) => storageMap.delete(k),
  clear: () => storageMap.clear()
};

globalThis.document = {
  body: createFakeElement('body'),
  createElement: (tag) => createFakeElement(tag),
  createElementNS: (_ns, tag) => createFakeElement(tag),
  createDocumentFragment: () => createFakeElement('fragment'),
  getElementById: () => null,
  querySelectorAll: () => [],
  querySelector: () => null,
  addEventListener: () => {},
  removeEventListener: () => {}
};

globalThis.window = {
  innerWidth: 1200,
  innerHeight: 800,
  matchMedia: () => ({ matches: false }),
  addEventListener: () => {},
  removeEventListener: () => {}
};

const { state, dom } = await import('../src/state/store.js');
const { renderNodeElement } = await import('../src/core/nodes.js');
const { renderZones, renderZoneElement } = await import('../src/core/zones.js');
const { renderInspector, flushPendingInspectorRender } = await import('../src/ui/inspector.js');
const { toggleInspector } = await import('../src/ui/topbar.js');
const { dbStore, saveAllProjects, getAllProjects } = await import('../src/storage/db.js');
const { sanitizeIncomingPeerPayload } = await import('../src/collab/peer.js');
const { STORAGE_PROJECTS_KEY } = await import('../src/config/constants.js');

test('renderNodeElement(node, frag) appends into a DocumentFragment without touching dom.nodesLayer', () => {
  dom.nodesLayer = createFakeElement('div', 'nodes-layer');
  state.connections = [];
  state.selectedNodeIds = new Set();
  state.activeLayer = 'all';
  state.theme = 'dark';

  const frag = document.createDocumentFragment();
  const node = {
    id: 'node_frag_1',
    type: 'router',
    name: 'Core-R1',
    ip: '10.0.0.1',
    x: 120,
    y: 240,
    scale: 1
  };

  renderNodeElement(node, frag);

  assert.equal(dom.nodesLayer.children.length, 0, 'dom.nodesLayer must remain untouched while building fragment');
  assert.equal(frag.children.length, 1, 'DocumentFragment must receive the rendered node element');
  assert.equal(frag.children[0].id, 'node_frag_1');

  dom.nodesLayer.appendChild(frag);
  assert.equal(dom.nodesLayer.children.length, 1, 'Single appendChild flushes fragment into dom.nodesLayer');
  assert.equal(frag.children.length, 0);
});

test('saveAllProjects coalesces rapid IndexedDB writes and strips heavy Base64 underlay src from localStorage fallback', async () => {
  storageMap.clear();
  const heavySrc = 'data:image/png;base64,' + 'A'.repeat(6000);
  const makeProject = (name) => ([
    {
      id: 'proj_test_1',
      name,
      sheets: [
        {
          id: 'sheet_1',
          name: 'Hoja 1',
          nodes: [],
          connections: [],
          zones: [],
          underlay: {
            name: 'plano.png',
            x: 10,
            y: 20,
            width: 800,
            height: 600,
            src: heavySrc
          }
        }
      ],
      activeSheetId: 'sheet_1',
      underlay: {
        name: 'plano.png',
        x: 10,
        y: 20,
        width: 800,
        height: 600,
        src: heavySrc
      }
    }
  ]);

  const idbCalls = [];
  let releaseFirstWrite;
  const firstWriteGate = new Promise((resolve) => {
    releaseFirstWrite = resolve;
  });

  const originalSetItem = dbStore.setItem;
  dbStore.setItem = async (key, value) => {
    idbCalls.push({ key, name: value[0]?.name, sheetSrcLen: value[0]?.sheets?.[0]?.underlay?.src?.length || 0 });
    if (idbCalls.length === 1) {
      await firstWriteGate;
    }
    return value;
  };

  try {
    const p1 = saveAllProjects(makeProject('Snap-1'));
    saveAllProjects(makeProject('Snap-2-dropped'));
    saveAllProjects(makeProject('Snap-3-dropped'));
    const p4 = saveAllProjects(makeProject('Snap-4-latest'), true);

    releaseFirstWrite();
    await Promise.all([p1, p4]);

    assert.equal(idbCalls.length, 2, 'Intermediate rapid writes must be coalesced into only initial + latest snapshot');
    assert.equal(idbCalls[0].name, 'Snap-1');
    assert.equal(idbCalls[1].name, 'Snap-4-latest');
    assert.equal(idbCalls[1].sheetSrcLen, heavySrc.length, 'IndexedDB must receive intact full Base64 underlay');

    const inMemory = getAllProjects();
    assert.equal(inMemory[0].sheets[0].underlay.src, heavySrc, 'In-memory cache must preserve full Base64 underlay');
    assert.equal(inMemory[0].underlay.src, heavySrc, 'In-memory root underlay must preserve full Base64 underlay');

    const localBackup = JSON.parse(localStorage.getItem(STORAGE_PROJECTS_KEY));
    assert.equal(localBackup[0].name, 'Snap-4-latest');
    assert.equal(localBackup[0].sheets[0].underlay.src, '', 'Heavy Base64 underlay src must be stripped in localStorage fallback');
    assert.equal(localBackup[0].underlay.src, '', 'Heavy root Base64 underlay src must be stripped in localStorage fallback');
    assert.equal(localBackup[0].sheets[0].underlay.name, 'plano.png', 'Underlay metadata must remain intact in localStorage');
  } finally {
    dbStore.setItem = originalSetItem;
  }
});

test('sanitizeIncomingPeerPayload rejects prototype pollution keys, non-finite coordinates, and oversized/invalid payloads', () => {
  // Valid messages pass
  assert.ok(sanitizeIncomingPeerPayload({ type: 'NODE_MOVE', payload: { id: 'n1', x: 100, y: 200, sheetId: 'sheet_1' } }));
  assert.ok(sanitizeIncomingPeerPayload({ type: 'CURSOR_MOVE', payload: { x: 50.5, y: -12.25, sheetId: 'sheet_1' } }));
  assert.ok(sanitizeIncomingPeerPayload({ type: 'PROJECT_DELTA', payload: { sheetDeltas: [] } }));

  // Non-plain / invalid shapes rejected
  assert.equal(sanitizeIncomingPeerPayload(null), null);
  assert.equal(sanitizeIncomingPeerPayload(['NODE_MOVE']), null);
  assert.equal(sanitizeIncomingPeerPayload({ type: '' }), null);
  class CustomMsg { constructor() { this.type = 'PING'; } }
  assert.equal(sanitizeIncomingPeerPayload(new CustomMsg()), null);

  // Prototype pollution keys rejected
  const protoPayload = JSON.parse('{"type":"NODE_MOVE","payload":{"id":"n1","x":10,"y":20,"__proto__":{"polluted":true}}}');
  assert.equal(sanitizeIncomingPeerPayload(protoPayload), null);
  assert.equal(sanitizeIncomingPeerPayload({ type: 'PROJECT_DELTA', payload: { constructor: { polluted: true } } }), null);
  assert.equal(sanitizeIncomingPeerPayload({ type: 'STATE_SYNC', payload: { nested: { prototype: {} } } }), null);

  // Non-finite coordinates rejected
  assert.equal(sanitizeIncomingPeerPayload({ type: 'NODE_MOVE', payload: { id: 'n1', x: NaN, y: 10 } }), null);
  assert.equal(sanitizeIncomingPeerPayload({ type: 'NODE_MOVE', payload: { id: 'n1', x: 10, y: Infinity } }), null);
  assert.equal(sanitizeIncomingPeerPayload({ type: 'CURSOR_MOVE', payload: { x: -Infinity, y: 0 } }), null);
  assert.equal(sanitizeIncomingPeerPayload({ type: 'CURSOR_MOVE', payload: { x: '100', y: 20 } }), null);

  // Oversized control payload rejected
  assert.equal(
    sanitizeIncomingPeerPayload({ type: 'CURSOR_MOVE', payload: { x: 1, y: 2, name: 'X'.repeat(20000) } }),
    null
  );
});

test('renderZones batches all zone insertions via a single DocumentFragment', () => {
  const zonesLayer = createFakeElement('div', 'zones-layer');
  let appendCalls = 0;
  let lastAppendedTag = null;
  const origAppend = zonesLayer.appendChild.bind(zonesLayer);
  zonesLayer.appendChild = (child) => {
    appendCalls += 1;
    lastAppendedTag = child.tagName;
    return origAppend(child);
  };
  dom.zonesLayer = zonesLayer;
  state.selection = { type: null, id: null };
  state.selectedZoneIds = new Set();
  state.zones = [
    { id: 'zone_batch_1', name: 'VLAN 10', color: 'cyan', x: 0, y: 0, width: 200, height: 150 },
    { id: 'zone_batch_2', name: 'VLAN 20', color: 'purple', x: 250, y: 0, width: 200, height: 150 }
  ];

  renderZones();

  assert.equal(appendCalls, 1, 'renderZones must append to dom.zonesLayer exactly once');
  assert.equal(lastAppendedTag, 'FRAGMENT', 'renderZones must flush a DocumentFragment');
  assert.equal(zonesLayer.children.length, 2);
  assert.equal(zonesLayer.children[0].id, 'zone_batch_1');
  assert.equal(zonesLayer.children[1].id, 'zone_batch_2');

  const frag = document.createDocumentFragment();
  renderZoneElement({ id: 'zone_batch_3', name: 'VLAN 30', color: 'cyan', x: 10, y: 10, width: 150, height: 100 }, frag);
  assert.equal(zonesLayer.children.length, 2, 'renderZoneElement(zone, frag) must not touch dom.zonesLayer');
  assert.equal(frag.children.length, 1);
});

test('renderInspector defers DOM rebuild when collapsed and flushes on expand', () => {
  dom.sidebarInspector = createFakeElement('aside', 'sidebar-inspector');
  dom.sidebarInspector.classList.add('collapsed');
  dom.inspectorTitle = createFakeElement('span', 'inspector-title');
  dom.inspectorBody = createFakeElement('div', 'inspector-body');
  dom.inspectorTitle.textContent = 'Stale Title';
  dom.inspectorBody.innerHTML = 'stale';
  state.isApplyingRemoteSync = false;
  state.selection = { type: null, id: null };

  renderInspector();
  assert.equal(dom.inspectorTitle.textContent, 'Stale Title', 'Collapsed inspector must defer DOM rebuild');
  assert.equal(dom.inspectorBody.innerHTML, 'stale');

  // Calling flush while still collapsed must remain deferred
  flushPendingInspectorRender();
  assert.equal(dom.inspectorBody.innerHTML, 'stale');

  // Expanding via toggleInspector(false) flushes pending render
  toggleInspector(false);
  assert.equal(dom.sidebarInspector.classList.contains('collapsed'), false);
  assert.equal(dom.inspectorTitle.textContent, 'Propiedades');
  assert.ok(dom.inspectorBody.innerHTML.includes('inspector-empty'));
});

test('firebase auth module uses modular tree-shaken imports and guards against duplicate listener binding', async () => {
  const { readFileSync } = await import('node:fs');
  const firebaseSrc = readFileSync(new URL('../src/auth/firebase.js', import.meta.url), 'utf8');
  assert.match(firebaseSrc, /from ['"]firebase\/app['"]/);
  assert.match(firebaseSrc, /from ['"]firebase\/auth['"]/);
  assert.match(firebaseSrc, /authUiEventsBound/);
  assert.match(firebaseSrc, /if\s*\(\s*authUnsubscribe\s*\)\s*\{\s*authUnsubscribe\(\)/);
});
