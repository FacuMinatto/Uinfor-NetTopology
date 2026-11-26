import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
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
    add: (...cls) => cls.forEach(c => set.add(c)),
    remove: (...cls) => cls.forEach(c => set.delete(c)),
    toggle: (c, force) => (force === undefined ? (set.has(c) ? (set.delete(c), false) : (set.add(c), true)) : (force ? (set.add(c), true) : (set.delete(c), false))),
    contains: (c) => set.has(c)
  };
}

function createFakeElement(tag = 'div') {
  const attrs = new Map();
  return {
    tagName: tag.toUpperCase(),
    style: { setProperty() {}, removeProperty() {} },
    dataset: {},
    classList: createFakeClassList(),
    children: [],
    innerHTML: '',
    textContent: '',
    value: '',
    setAttribute(k, v) { attrs.set(k, String(v)); },
    getAttribute(k) { return attrs.has(k) ? attrs.get(k) : null; },
    removeAttribute(k) { attrs.delete(k); },
    hasAttribute(k) { return attrs.has(k); },
    appendChild(child) { this.children.push(child); return child; },
    remove() {},
    addEventListener() {},
    querySelectorAll() { return []; },
    querySelector(sel) { return sel === '.sheet-tab-menu-btn' ? createFakeElement('button') : null; },
    getBoundingClientRect() { return { width: 1200, height: 800, left: 0, top: 0 }; }
  };
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

let alertMessages = [];
globalThis.alert = (msg) => { alertMessages.push(msg); };
globalThis.requestAnimationFrame = () => 0;
globalThis.window = {
  matchMedia: () => ({ matches: false }),
  addEventListener: () => {},
  removeEventListener: () => {},
  location: { search: '', href: 'http://localhost/' }
};
Object.defineProperty(globalThis, 'navigator', {
  value: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
  configurable: true
});

globalThis.FileReader = class MockFileReader {
  readAsText(file) {
    queueMicrotask(() => {
      if (this.onload) {
        this.onload({ target: { result: file._content } });
      }
    });
  }
};

const { state, dom } = await import('../src/state/store.js');
const { openProjectFilePicker, importProjectFromFile, getAllProjects } = await import('../src/storage/db.js');

function resetTestEnv() {
  storageMap.clear();
  alertMessages = [];
  state.nodes = [];
  state.connections = [];
  state.zones = [];
  state.sheets = [];
  state.activeSheetId = null;
  state.currentProjectId = null;
  state.currentProjectName = 'Initial';
  dom.viewport = createFakeElement('div');
  dom.world = createFakeElement('div');
  dom.nodesLayer = createFakeElement('div');
  dom.connectionsLayer = createFakeElement('svg');
  dom.cablesGroup = createFakeElement('g');
  dom.waypointsGroup = createFakeElement('g');
  dom.labelsLayer = createFakeElement('div');
  dom.zonesLayer = createFakeElement('div');
  dom.underlayLayer = createFakeElement('div');
  dom.paperSheet = createFakeElement('div');
  dom.paperSheetTag = createFakeElement('div');
  dom.sheetsTabsList = createFakeElement('div');
  dom.projectTitleInput = createFakeElement('input');
  dom.statusDot = createFakeElement('span');
  dom.statusText = createFakeElement('span');
  dom.zoomValue = createFakeElement('span');
  dom.inspectorBody = createFakeElement('div');
  dom.inspectorTitle = createFakeElement('div');
  dom.btnUndo = createFakeElement('button');
  dom.btnRedo = createFakeElement('button');
}

test('workspaceShell.html #file-input does not restrict extensions via accept attribute', () => {
  const html = fs.readFileSync(new URL('../src/workspace/workspaceShell.html', import.meta.url), 'utf8');
  const match = html.match(/<input[^>]*id="file-input"[^>]*>/);
  assert.ok(match, '#file-input element must exist in workspaceShell.html');
  assert.equal(/\baccept\s*=/.test(match[0]), false, '#file-input must not have accept attribute');
});

test('tablet / coarse-pointer openProjectFilePicker bypasses showOpenFilePicker, clears value & accept, and clicks fileInput', async () => {
  resetTestEnv();
  let pickerCalled = false;
  let clickCount = 0;

  globalThis.window = {
    matchMedia: (q) => ({ matches: q === '(pointer: coarse)' }),
    addEventListener: () => {},
    removeEventListener: () => {},
    location: { search: '', href: 'http://localhost/' },
    showOpenFilePicker: async () => {
      pickerCalled = true;
      return [];
    }
  };
  Object.defineProperty(globalThis, 'navigator', {
    value: { userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)' },
    configurable: true
  });

  const input = createFakeElement('input');
  input.setAttribute('accept', '.json,.netdiag');
  input.value = 'C:\\fakepath\\old.netdiag';
  input.click = () => {
    clickCount++;
    assert.equal(input.hasAttribute('accept'), false);
    assert.equal(input.value, '');
  };
  dom.fileInput = input;

  await openProjectFilePicker();
  assert.equal(pickerCalled, false, 'showOpenFilePicker must not be called on tablet/coarse pointer');
  assert.equal(clickCount, 1);

  // Re-opening a second time must still clear value and click
  input.value = 'same-diagram.netdiag';
  await openProjectFilePicker();
  assert.equal(clickCount, 2);
});

test('importProjectFromFile loads .netdiag, .netdiag.json, UTF-8 BOM files, and re-opening the exact same file twice', async () => {
  resetTestEnv();

  const diagramPayload = (title) => JSON.stringify({
    nodes: [{ id: 'n1', type: 'router', name: title, x: 100, y: 120, ip: '10.0.0.1' }],
    connections: [],
    zones: []
  });

  const waitTick = () => new Promise(r => setTimeout(r, 15));

  // 1. Standard .netdiag without projectName -> derives name without .netdiag
  importProjectFromFile({ name: 'diagrama.netdiag', _content: diagramPayload('R1') });
  await waitTick();
  assert.equal(alertMessages.length, 0);
  assert.equal(state.currentProjectName, 'diagrama');
  assert.equal(state.nodes.length, 1);
  assert.equal(state.nodes[0].name, 'R1');

  // 2. Compound mobile download extension .netdiag.json -> strips both extensions
  importProjectFromFile({ name: 'diagrama.netdiag.json', _content: diagramPayload('R2') });
  await waitTick();
  assert.equal(alertMessages.length, 0);
  assert.equal(state.currentProjectName, 'diagrama');
  assert.equal(state.nodes[0].name, 'R2');

  // 3. UTF-8 BOM prefixed .netdiag
  importProjectFromFile({ name: 'bom_test.netdiag', _content: '\uFEFF' + diagramPayload('R3') });
  await waitTick();
  assert.equal(alertMessages.length, 0);
  assert.equal(state.currentProjectName, 'bom_test');
  assert.equal(state.nodes[0].name, 'R3');

  // 4. Re-opening the exact same .netdiag file a second time succeeds
  const sameFile = { name: 'bom_test.netdiag', _content: '\uFEFF' + diagramPayload('R3-reopened') };
  importProjectFromFile(sameFile);
  await waitTick();
  assert.equal(alertMessages.length, 0);
  assert.equal(state.nodes[0].name, 'R3-reopened');
  assert.ok(getAllProjects().length >= 4);
});
