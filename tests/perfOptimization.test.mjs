import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';

register(
  'data:text/javascript,' +
    encodeURIComponent(
      "export async function load(url, context, nextLoad) { if (url.includes('peerjs')) return { format: 'module', shortCircuit: true, source: 'export class Peer {}' }; return nextLoad(url, context); }"
    )
);

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
  const listeners = new Map();
  let setAttrCount = 0;

  const el = {
    id,
    tagName: tag.toUpperCase(),
    parentNode: null,
    style: {
      setProperty() {},
      removeProperty() {}
    },
    dataset: {},
    classList: createFakeClassList(),
    children,
    _innerHTML: '',
    get innerHTML() {
      return this._innerHTML;
    },
    set innerHTML(val) {
      this._innerHTML = String(val);
      if (val === '') {
        for (const child of children) {
          child.parentNode = null;
        }
        children.length = 0;
      }
    },
    textContent: '',
    value: '',
    setAttribute(k, v) {
      if (k === 'd') setAttrCount += 1;
      attrs.set(k, String(v));
    },
    getAttribute(k) {
      return attrs.has(k) ? attrs.get(k) : null;
    },
    removeAttribute(k) {
      attrs.delete(k);
    },
    hasAttribute(k) {
      return attrs.has(k);
    },
    getSetDCount() {
      return setAttrCount;
    },
    resetSetDCount() {
      setAttrCount = 0;
    },
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
    remove() {
      this.parentNode = null;
    },
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
    },
    removeEventListener(type, fn) {
      const list = listeners.get(type);
      if (!list) return;
      const idx = list.indexOf(fn);
      if (idx !== -1) list.splice(idx, 1);
    },
    dispatchEvent(ev) {
      const list = listeners.get(ev.type) || [];
      for (const fn of [...list]) fn(ev);
    },
    closest() {
      return null;
    },
    contains() {
      return false;
    },
    querySelectorAll() {
      return [];
    },
    querySelector() {
      return null;
    },
    getBoundingClientRect() {
      return { width: 1200, height: 800, left: 0, top: 0 };
    }
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

globalThis.requestAnimationFrame = () => 0;
globalThis.cancelAnimationFrame = () => {};

const { state, dom } = await import('../src/state/store.js');
const { computeGridTileOffset, updateViewportTransform, drawAlignmentGuides, clearAlignmentGuides } = await import('../src/core/canvas.js');
const { renderConnections, updateCableSelectionVisuals } = await import('../src/core/cables.js');
const { setupNodeDragEvents, snapNodeCoordinates } = await import('../src/core/nodes.js');

function resetPerfEnv() {
  state.nodes = [];
  state.connections = [];
  state.zones = [];
  state.selection = { type: null, id: null, ids: [] };
  state.selectedNodeIds = new Set();
  state.selectedZoneIds = new Set();
  state.viewport = { x: 0, y: 0, zoom: 1 };
  state.gridSize = 24;
  state.snapToGrid = true;
  state.smartGuidesEnabled = true;
  state.isDraggingNode = false;
  state.isPanning = false;
  state.draggingNodeIds = null;
  state.isNudging = false;
  state.isRemoteMoving = false;
  state.cableBridgesEnabled = true;
  state.activeLayer = 'all';
  state.lastPointerType = 'mouse';

  dom.viewport = createFakeElement('main', 'canvas-viewport');
  dom.viewport.clientWidth = 1200;
  dom.viewport.clientHeight = 800;
  dom.gridLayer = createFakeElement('div', 'canvas-grid-layer');
  dom.world = createFakeElement('div', 'canvas-world');
  dom.zoomValue = createFakeElement('span', 'zoom-value');
  dom.cablesGroup = createFakeElement('g', 'cables-group');
  dom.waypointsGroup = createFakeElement('g', 'waypoints-group');
  dom.labelsLayer = createFakeElement('div', 'labels-layer');
  dom.alignmentGuidesOverlay = createFakeElement('svg', 'alignment-guides-overlay');
  dom.inspectorTitle = createFakeElement('h2', 'inspector-title');
  dom.inspectorBody = createFakeElement('div', 'inspector-body');
  dom.statusDot = createFakeElement('span', 'status-dot');
  dom.statusText = createFakeElement('span', 'status-text');
  dom.btnUndo = createFakeElement('button', 'btn-undo');
  dom.btnRedo = createFakeElement('button', 'btn-redo');
  dom.minimapCanvas = null;
  dom.minimapViewport = null;
}

test('computeGridTileOffset returns seamless negative modulo offset in [-tileSize, 0) across pan & zoom', () => {
  for (const zoom of [0.25, 0.5, 1, 1.5, 2.75]) {
    const tileSize = 120 * zoom;
    for (const pos of [0, 15, tileSize - 0.1, tileSize, tileSize * 3 + 42, -1, -45, -tileSize, -tileSize * 2 - 17]) {
      const offset = computeGridTileOffset(pos, tileSize);
      assert.ok(offset >= -tileSize && offset < 0, `offset ${offset} out of [-${tileSize}, 0) for pos=${pos}, zoom=${zoom}`);
      // Shifting by offset must match (pos mod tileSize)
      const expectedPhase = ((pos % tileSize) + tileSize) % tileSize;
      const actualPhase = ((offset % tileSize) + tileSize) % tileSize;
      assert.ok(Math.abs(actualPhase - expectedPhase) < 1e-9, `phase mismatch: ${actualPhase} vs ${expectedPhase}`);
    }
  }
  assert.equal(computeGridTileOffset(100, 0), 0);
  assert.equal(computeGridTileOffset(100, -10), 0);
});

test('updateViewportTransform uses translate3d on dom.world and dom.gridLayer without mutating viewport backgroundPosition', () => {
  resetPerfEnv();
  state.viewport = { x: 145, y: -38, zoom: 1.5 };
  state.gridSize = 24;

  updateViewportTransform();

  assert.equal(dom.world.style.transform, 'translate3d(145px, -38px, 0) scale(1.5)');
  assert.equal(dom.zoomValue.textContent, '150%');

  const majorLineSize = 24 * 5 * 1.5; // 180
  const expectedOx = computeGridTileOffset(145, majorLineSize);
  const expectedOy = computeGridTileOffset(-38, majorLineSize);

  assert.equal(dom.gridLayer.style.transform, `translate3d(${expectedOx}px, ${expectedOy}px, 0)`);
  assert.equal(dom.gridLayer.style.backgroundSize, '36px 36px, 180px 180px, 180px 180px');
  assert.equal(dom.gridLayer.style.backgroundPosition, '-18px -18px, 0 0, 0 0');
  assert.equal(dom.gridLayer.style.width, 'calc(100% + 180px)');
  assert.equal(dom.gridLayer.style.height, 'calc(100% + 180px)');
  assert.equal(dom.viewport.style.backgroundPosition, undefined);
  assert.equal(dom.viewport.style.backgroundSize, undefined);

  // Subsequent pan at same zoom/gridSize only updates transform
  dom.gridLayer.style.backgroundSize = 'SENTINEL';
  state.viewport.x = 200;
  state.viewport.y = 50;
  updateViewportTransform();

  assert.equal(dom.gridLayer.style.backgroundSize, 'SENTINEL');
  assert.equal(
    dom.gridLayer.style.transform,
    `translate3d(${computeGridTileOffset(200, majorLineSize)}px, ${computeGridTileOffset(50, majorLineSize)}px, 0)`
  );
});

test('renderConnections drag fast-path only updates incident cables, skips redundant path writes, and runs full render after drag', () => {
  resetPerfEnv();

  const n1 = { id: 'n1', type: 'router', name: 'R1', x: 100, y: 100 };
  const n2 = { id: 'n2', type: 'switch_cisco', name: 'SW1', x: 400, y: 100 };
  const n3 = { id: 'n3', type: 'pc', name: 'PC1', x: 100, y: 400 };
  const n4 = { id: 'n4', type: 'server', name: 'SRV1', x: 400, y: 400 };
  state.nodes = [n1, n2, n3, n4];

  const cIncident = {
    id: 'c1',
    fromNodeId: 'n1',
    toNodeId: 'n2',
    fromPort: 'Eth1',
    toPort: 'Eth1',
    cableType: 'ethernet',
    networkLabel: '10.0.0.0/24',
    routingMode: 'straight'
  };
  const cUnrelated = {
    id: 'c2',
    fromNodeId: 'n3',
    toNodeId: 'n4',
    fromPort: 'Eth2',
    toPort: 'Eth2',
    cableType: 'ethernet',
    networkLabel: '10.0.1.0/24',
    routingMode: 'straight'
  };
  state.connections = [cIncident, cUnrelated];

  // Initial full render populates cableDomCache
  renderConnections();

  const paths = dom.cablesGroup.children.filter((el) => el.getAttribute('class')?.includes('network-cable'));
  assert.equal(paths.length, 2);
  const pathIncident = paths.find((el) => el.getAttribute('data-cable-id') === 'c1');
  const pathUnrelated = paths.find((el) => el.getAttribute('data-cable-id') === 'c2');
  assert.ok(pathIncident && pathUnrelated);

  pathIncident.resetSetDCount();
  pathUnrelated.resetSetDCount();

  // Start dragging n1 only
  state.isDraggingNode = true;
  state.draggingNodeIds = new Set(['n1']);
  n1.x = 148;
  n1.y = 124;

  // Track waypointsGroup.innerHTML writes (should not happen when no cable is selected)
  let waypointsCleared = 0;
  const origDescriptor = Object.getOwnPropertyDescriptor(dom.waypointsGroup, 'innerHTML');
  Object.defineProperty(dom.waypointsGroup, 'innerHTML', {
    get: () => origDescriptor.get.call(dom.waypointsGroup),
    set: (v) => {
      waypointsCleared += 1;
      origDescriptor.set.call(dom.waypointsGroup, v);
    }
  });

  renderConnections();

  assert.equal(pathIncident.getSetDCount(), 1, 'incident cable must be updated during drag');
  assert.equal(pathUnrelated.getSetDCount(), 0, 'non-incident cable must not be touched during drag');
  assert.equal(waypointsCleared, 0, 'waypointsGroup must not be cleared when no cable is selected');

  // Re-running drag render without moving n1 skips redundant setAttribute('d', ...)
  renderConnections();
  assert.equal(pathIncident.getSetDCount(), 1, 'unchanged pathData must skip redundant setAttribute("d")');

  // End drag -> full render rebuilds cablesGroup
  state.isDraggingNode = false;
  state.draggingNodeIds = null;
  renderConnections();

  const rebuiltPaths = dom.cablesGroup.children.filter((el) => el.getAttribute('class')?.includes('network-cable'));
  assert.equal(rebuiltPaths.length, 2);
  assert.notEqual(rebuiltPaths[0], pathIncident, 'full render after drag ends must rebuild SVG paths');
});

test('setupNodeDragEvents moves smoothly at 1px live precision, defers renderInspector, reuses dragFastContext, and snaps on drop', () => {
  resetPerfEnv();
  state.smartGuidesEnabled = false;
  state.snapToGrid = true;
  state.gridSize = 24;

  // Start node on-grid: center at (96, 96) => x = 44, y = 56
  const startSnapped = snapNodeCoordinates(44, 56, 'router');
  const n1 = { id: 'n1', type: 'router', name: 'R1', x: startSnapped.x, y: startSnapped.y, ports: ['Eth1'] };
  const n2 = { id: 'n2', type: 'switch_cisco', name: 'SW1', x: 400, y: 100, ports: ['Eth1'] };
  state.nodes = [n1, n2];
  state.connections = [
    { id: 'c1', fromNodeId: 'n1', toNodeId: 'n2', fromPort: 'Eth1', toPort: 'Eth1', cableType: 'ethernet', routingMode: 'straight' }
  ];

  renderConnections();
  const pathC1 = dom.cablesGroup.children.find((el) => el.getAttribute('data-cable-id') === 'c1');
  assert.ok(pathC1);
  pathC1.resetSetDCount();

  const elN1 = createFakeElement('div', 'n1');
  const elementsById = new Map([['n1', elN1]]);
  const winListeners = new Map();
  const rafQueue = [];

  const origGetById = globalThis.document.getElementById;
  const origWinAdd = globalThis.window.addEventListener;
  const origWinRemove = globalThis.window.removeEventListener;
  const origRaf = globalThis.requestAnimationFrame;
  const origCancelRaf = globalThis.cancelAnimationFrame;

  let inspectorRenderCount = 0;
  const origInspDesc = Object.getOwnPropertyDescriptor(dom.inspectorBody, 'innerHTML');
  Object.defineProperty(dom.inspectorBody, 'innerHTML', {
    get: () => origInspDesc.get.call(dom.inspectorBody),
    set: (v) => {
      inspectorRenderCount += 1;
      origInspDesc.set.call(dom.inspectorBody, v);
    }
  });

  let nodeFilterCalls = 0;
  const origNodesForEach = state.nodes.forEach.bind(state.nodes);
  state.nodes.forEach = (fn) => {
    nodeFilterCalls += 1;
    return origNodesForEach(fn);
  };

  try {
    globalThis.document.getElementById = (id) => elementsById.get(id) || createFakeElement('div', id);
    globalThis.window.addEventListener = (type, fn) => {
      if (!winListeners.has(type)) winListeners.set(type, []);
      winListeners.get(type).push(fn);
    };
    globalThis.window.removeEventListener = (type, fn) => {
      const arr = winListeners.get(type);
      if (!arr) return;
      const idx = arr.indexOf(fn);
      if (idx !== -1) arr.splice(idx, 1);
    };
    globalThis.requestAnimationFrame = (fn) => {
      rafQueue.push(fn);
      return rafQueue.length;
    };
    globalThis.cancelAnimationFrame = () => {
      rafQueue.length = 0;
    };

    setupNodeDragEvents(elN1, n1);

    // 1. pointerdown on unselected node: no synchronous renderInspector, no .is-dragging / .is-dragging-item yet
    elN1.dispatchEvent({
      type: 'pointerdown',
      isPrimary: true,
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      clientX: 100,
      clientY: 100,
      target: elN1,
      stopPropagation() {},
      preventDefault() {}
    });

    assert.equal(inspectorRenderCount, 0, 'pointerdown must defer renderInspector');
    assert.equal(elN1.classList.contains('is-dragging'), false, 'is-dragging must not be added on pointerdown');
    assert.equal(dom.viewport.classList.contains('is-dragging-item'), false, 'is-dragging-item must not be added on pointerdown');

    // 2. First small move (5px, 3px): moves smoothly at 1px precision (NOT snapped to 24px grid!), builds dragFastContext
    const moveHandlers = [...(winListeners.get('pointermove') || [])];
    moveHandlers.forEach((fn) => fn({ pointerId: 1, clientX: 105, clientY: 103 }));
    assert.equal(elN1.classList.contains('is-dragging'), true, 'is-dragging added lazily on move');
    assert.equal(dom.viewport.classList.contains('is-dragging-item'), true, 'is-dragging-item added lazily on move');
    assert.equal(rafQueue.length, 1);
    rafQueue.shift()();

    assert.equal(n1.x, startSnapped.x + 5, 'live drag must move at 1px precision without 24px step jolt');
    assert.equal(n1.y, startSnapped.y + 3, 'live drag must move at 1px precision without 24px step jolt');
    assert.equal(elN1.style.transform, 'translate3d(5px, 3px, 0) scale(var(--node-scale, 1))');
    assert.equal(pathC1.getSetDCount(), 1, 'incident cable updated on drag frame 1');

    // 3. Second drag move (14px, 10px): reuses dragFastContext without iterating state.nodes.forEach
    const forEachCountAfterFrame1 = nodeFilterCalls;
    moveHandlers.forEach((fn) => fn({ pointerId: 1, clientX: 114, clientY: 110 }));
    assert.equal(rafQueue.length, 1);
    rafQueue.shift()();

    assert.equal(n1.x, startSnapped.x + 14);
    assert.equal(n1.y, startSnapped.y + 10);
    assert.equal(nodeFilterCalls, forEachCountAfterFrame1, 'drag frame 2 must reuse dragFastContext without state.nodes.forEach');
    assert.equal(pathC1.getSetDCount(), 2, 'incident cable updated on drag frame 2');

    // 4. pointerup: snaps to grid on drop, cleans up classes, runs deferred renderInspector and full render
    const upHandlers = [...(winListeners.get('pointerup') || [])];
    upHandlers.forEach((fn) => fn({ type: 'pointerup', pointerId: 1, pointerType: 'mouse', clientX: 114, clientY: 110 }));

    const expectedDrop = snapNodeCoordinates(startSnapped.x + 14, startSnapped.y + 10, 'router');
    assert.equal(n1.x, expectedDrop.x, 'final X must snap to grid on drop');
    assert.equal(n1.y, expectedDrop.y, 'final Y must snap to grid on drop');
    assert.equal(elN1.classList.contains('is-dragging'), false);
    assert.equal(dom.viewport.classList.contains('is-dragging-item'), false);
    assert.equal(elN1.style.transform, '');
    assert.equal(elN1.style.left, `${expectedDrop.x}px`);
    assert.equal(elN1.style.top, `${expectedDrop.y}px`);
    assert.equal(inspectorRenderCount, 1, 'deferred renderInspector must run on pointerup');
  } finally {
    globalThis.document.getElementById = origGetById;
    globalThis.window.addEventListener = origWinAdd;
    globalThis.window.removeEventListener = origWinRemove;
    globalThis.requestAnimationFrame = origRaf;
    globalThis.cancelAnimationFrame = origCancelRaf;
    delete state.nodes.forEach;
  }
});

test('drawAlignmentGuides uses getNodeGeometry centers (y + 40), picks closest match, and reuses persistent <line> elements', () => {
  resetPerfEnv();
  state.smartGuidesEnabled = true;

  // Standard node center is (x + 52, y + 40)
  const primary = { id: 'p1', type: 'router', x: 202, y: 104 };
  const farOther = { id: 'o1', type: 'router', x: 504, y: 104 }; // diff = 4 on X/Y? No, x=504,y=104 -> cy=144 vs 144 (diff 0)
  const closerOther = { id: 'o2', type: 'router', x: 201, y: 300 }; // diffX = 1 (< 4), diffY > 5
  farOther.x = 500;
  farOther.y = 100; // cy = 140 (diffY = 4 from 144)
  const exactYOther = { id: 'o3', type: 'router', x: 600, y: 103 }; // cy = 143 (diffY = 1 < 4)

  state.nodes = [primary, farOther, closerOther, exactYOther];
  state.selectedNodeIds = new Set(['p1']);

  let overlayInnerHtmlWrites = 0;
  const origOverlayDesc = Object.getOwnPropertyDescriptor(dom.alignmentGuidesOverlay, 'innerHTML');
  Object.defineProperty(dom.alignmentGuidesOverlay, 'innerHTML', {
    get: () => origOverlayDesc.get.call(dom.alignmentGuidesOverlay),
    set: (v) => {
      overlayInnerHtmlWrites += 1;
      origOverlayDesc.set.call(dom.alignmentGuidesOverlay, v);
    }
  });

  const res1 = drawAlignmentGuides(primary);
  assert.equal(res1.guideX, 201 + 52, 'closest X center (o2 at 253) must win');
  assert.equal(res1.guideY, 103 + 40, 'closest Y center (o3 at 143, using y + 40) must win');
  assert.equal(primary.x, 201);
  assert.equal(primary.y, 103);
  assert.equal(dom.alignmentGuidesOverlay.children.length, 2, 'must append exactly 2 persistent guide <line> elements');
  assert.equal(overlayInnerHtmlWrites, 0, 'must never wipe overlay innerHTML');

  const [line1, line2] = dom.alignmentGuidesOverlay.children;
  assert.equal(line1.style.display, 'block');
  assert.equal(line2.style.display, 'block');

  // Second call reuses exact same <line> DOM nodes
  primary.x = 202;
  primary.y = 104;
  drawAlignmentGuides(primary);
  assert.equal(dom.alignmentGuidesOverlay.children.length, 2);
  assert.equal(dom.alignmentGuidesOverlay.children[0], line1);
  assert.equal(dom.alignmentGuidesOverlay.children[1], line2);
  assert.equal(overlayInnerHtmlWrites, 0);

  clearAlignmentGuides();
  assert.equal(line1.style.display, 'none');
  assert.equal(line2.style.display, 'none');
  assert.equal(overlayInnerHtmlWrites, 0);
});

test('updateCableSelectionVisuals is O(1) when no cable is selected', () => {
  resetPerfEnv();
  state.selection = { type: 'node', id: 'n1', ids: ['n1'] };

  let cablesQueryCount = 0;
  dom.cablesGroup.querySelectorAll = () => {
    cablesQueryCount += 1;
    return [];
  };
  let waypointsClears = 0;
  const origWpDesc = Object.getOwnPropertyDescriptor(dom.waypointsGroup, 'innerHTML');
  Object.defineProperty(dom.waypointsGroup, 'innerHTML', {
    get: () => origWpDesc.get.call(dom.waypointsGroup),
    set: (v) => {
      waypointsClears += 1;
      origWpDesc.set.call(dom.waypointsGroup, v);
    }
  });

  updateCableSelectionVisuals();
  assert.equal(cablesQueryCount, 0, 'must not query .network-cable when no cable is selected');
  assert.equal(waypointsClears, 0, 'must not touch waypointsGroup.innerHTML when empty and no cable selected');
});
