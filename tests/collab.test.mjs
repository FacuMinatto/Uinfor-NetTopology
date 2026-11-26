import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeRoomCode,
  isValidRoomCode,
  computeUnderlayHash,
  chunkString,
  assembleChunks,
  syncObjectInPlace,
  createSyncSnapshot,
  patchSnapshotEntity,
  diffProjectSheets,
  applySheetDelta,
  buildPeersDirectory,
  filterCursorsForSheet
} from '../src/collab/syncHelpers.js';

function makeSheet(id, name = 'Hoja 1', overrides = {}) {
  return {
    id,
    name,
    pageSize: 'infinite',
    pageWidth: 1123,
    pageHeight: 794,
    bgTheme: 'white',
    nodes: [],
    connections: [],
    zones: [],
    underlay: null,
    viewport: { x: 80, y: 80, zoom: 1 },
    ...overrides
  };
}

test('normalizeRoomCode and isValidRoomCode handle user inputs and Base32 constraints', () => {
  assert.equal(normalizeRoomCode('abc234'), 'NET-ABC-234');
  assert.equal(normalizeRoomCode(' net-ab2-cd3 '), 'NET-AB2-CD3');
  assert.equal(normalizeRoomCode('netab2cd3'), 'NET-AB2-CD3');
  assert.equal(normalizeRoomCode(''), '');

  assert.equal(isValidRoomCode('NET-AB2-CD3'), true);
  assert.equal(isValidRoomCode('ab2cd3'), true);
  assert.equal(isValidRoomCode('NET-01I-OAB'), false); // 0, 1, I, O excluded in Base32
  assert.equal(isValidRoomCode('NET-1234'), false);
  assert.equal(isValidRoomCode('bad'), false);
});

test('computeUnderlayHash detects mid-image changes and ignores metadata edits', () => {
  assert.equal(computeUnderlayHash(null), '');
  assert.equal(computeUnderlayHash({ name: 'plan.png' }), '');

  const baseSrc = 'data:image/png;base64,' + 'A'.repeat(2000) + 'MID1' + 'B'.repeat(2000);
  const sameImageDifferentMeta = {
    src: baseSrc,
    opacity: 85,
    scale: 150,
    x: 120,
    y: 240
  };
  const h1 = computeUnderlayHash({ src: baseSrc, opacity: 40, scale: 100, x: 0, y: 0 });
  const h2 = computeUnderlayHash(sameImageDifferentMeta);
  assert.equal(h1, h2);

  const editedMidSrc = 'data:image/png;base64,' + 'A'.repeat(2000) + 'MID2' + 'B'.repeat(2000);
  const h3 = computeUnderlayHash({ src: editedMidSrc });
  assert.notEqual(h1, h3);
});

test('chunkString and assembleChunks round-trip large Base64 payloads and reject incomplete sets', () => {
  const largeSrc = 'data:image/png;base64,' + 'XYZ123'.repeat(40000); // >240KB
  const chunks = chunkString(largeSrc, 60000);
  assert.ok(chunks.length >= 4);
  for (const c of chunks) {
    assert.ok(c.length <= 60000);
  }
  assert.equal(assembleChunks(chunks, chunks.length), largeSrc);

  const missing = [...chunks];
  delete missing[1];
  assert.equal(assembleChunks(missing, chunks.length), null);
  assert.equal(assembleChunks(chunks.slice(0, 2), chunks.length), null);
});

test('diffProjectSheets excludes viewport/activeSheetId and handles cross-sheet edits + underlay dedup', () => {
  const bigSrc = 'data:image/png;base64,' + 'M'.repeat(250000);
  const sheet1 = makeSheet('s1', 'Core', {
    nodes: [{ id: 'n1', type: 'router', name: 'R1', x: 100, y: 100, _cachedBoxW: 70 }],
    underlay: { src: bigSrc, name: 'floor.png', x: 0, y: 0, width: 1000, height: 800, scale: 100, opacity: 40, visible: true, locked: true }
  });
  const sheet2 = makeSheet('s2', 'Acceso', {
    nodes: [{ id: 'n2', type: 'switch_cisco', name: 'SW1', x: 200, y: 200 }]
  });

  const snap = createSyncSnapshot([sheet1, sheet2], 'Red Campus');

  // Changing viewport and transient _cachedBoxW produces zero diff
  sheet1.viewport = { x: 400, y: -120, zoom: 2.1 };
  sheet1.nodes[0]._cachedBoxW = 999;
  assert.equal(diffProjectSheets(snap, [sheet1, sheet2], 'Red Campus'), null);

  // Changing underlay opacity/position does NOT re-send image src
  sheet1.underlay.opacity = 70;
  sheet1.underlay.x = 48;
  // Also edit node on sheet2
  sheet2.nodes[0].name = 'SW-ACCESO-01';

  const delta = diffProjectSheets(snap, [sheet1, sheet2], 'Red Campus');
  assert.ok(delta);
  assert.equal(delta.underlaysToSend.length, 0);
  assert.equal(delta.sheetDeltas.length, 2);

  const d1 = delta.sheetDeltas.find(d => d.sheetId === 's1');
  assert.ok(d1.underlayMeta);
  assert.equal(d1.underlayMeta.opacity, 70);
  assert.equal(d1.underlayMeta.x, 48);
  assert.equal('src' in d1.underlayMeta, false);

  const d2 = delta.sheetDeltas.find(d => d.sheetId === 's2');
  assert.equal(d2.upsertNodes.length, 1);
  assert.equal(d2.upsertNodes[0].name, 'SW-ACCESO-01');
});

test('patchSnapshotEntity keeps immediate broadcasts out of subsequent 300ms diffs and supports undo/redo', () => {
  const s1 = makeSheet('s1', 'Principal', {
    nodes: [{ id: 'n1', type: 'pc', name: 'PC-1', x: 10, y: 20 }]
  });
  const snap = createSyncSnapshot([s1], 'Proj');

  // Simulate immediate NODE_CREATE + NODE_MOVE
  const newNode = { id: 'n2', type: 'pc', name: 'PC-2', x: 50, y: 60 };
  s1.nodes.push(newNode);
  patchSnapshotEntity(snap, 's1', 'node', 'upsert', newNode);
  newNode.x = 120;
  newNode.y = 140;
  patchSnapshotEntity(snap, 's1', 'node', 'move', { id: 'n2', x: 120, y: 140 });

  // 300ms diff should see no pending changes
  assert.equal(diffProjectSheets(snap, [s1], 'Proj'), null);

  // Undo restores snapshot without n2; diffProjectSheets emits only deleteNodeIds: ['n2']
  const undoneSheets = [makeSheet('s1', 'Principal', {
    nodes: [{ id: 'n1', type: 'pc', name: 'PC-1', x: 10, y: 20 }]
  })];
  const undoDelta = diffProjectSheets(snap, undoneSheets, 'Proj');
  assert.ok(undoDelta);
  assert.equal(undoDelta.sheetDeltas.length, 1);
  assert.deepEqual(undoDelta.sheetDeltas[0].deleteNodeIds, ['n2']);
  assert.equal(undoDelta.sheetDeltas[0].upsertNodes, undefined);
});

test('applySheetDelta preserves local activeSheetId, viewport, active drags, and existing underlay src', () => {
  const localSheets = [
    makeSheet('s1', 'Hoja 1', {
      nodes: [{ id: 'n1', type: 'router', name: 'R1', x: 300, y: 400 }],
      zones: [{ id: 'z1', name: 'DMZ', color: 'cyan', x: 50, y: 50, width: 300, height: 200 }],
      underlay: { src: 'data:image/png;base64,ABC', name: 'plan.png', x: 0, y: 0, width: 800, height: 600, scale: 100, opacity: 40, visible: true, locked: true },
      viewport: { x: 500, y: 600, zoom: 1.5 }
    }),
    makeSheet('s2', 'Hoja 2', { nodes: [] })
  ];

  const hash = computeUnderlayHash(localSheets[0].underlay);
  const delta = {
    projectNameChanged: true,
    projectName: 'Topología Compartida',
    sheetOrderChanged: false,
    addedSheets: [makeSheet('s3', 'Hoja 3')],
    removedSheetIds: [],
    sheetDeltas: [
      {
        sheetId: 's1',
        upsertNodes: [{ id: 'n1', type: 'router', name: 'R1-RENAMED', x: 999, y: 999 }],
        deleteNodeIds: [],
        upsertZones: [{ id: 'z1', name: 'DMZ-PRO', color: 'emerald', x: 0, y: 0, width: 320, height: 220 }],
        underlayMeta: { name: 'plan.png', x: 24, y: 24, width: 800, height: 600, scale: 100, opacity: 75, visible: true, locked: true, hash }
      },
      {
        sheetId: 's2',
        upsertNodes: [{ id: 'n9', type: 'server', name: 'SRV-9', x: 40, y: 40 }]
      }
    ]
  };

  // Locally dragging n1 -> x/y must stay at (300, 400), while remote name update applies
  const res = applySheetDelta(
    {
      sheets: localSheets,
      projectName: 'Local',
      activeSheetId: 's1',
      protectedDragIds: new Set(['n1'])
    },
    delta
  );

  assert.equal(res.activeSheetId, 's1');
  assert.equal(res.activeSheetDeleted, false);
  assert.equal(res.projectName, 'Topología Compartida');
  assert.equal(res.sheets.length, 3);
  assert.deepEqual(res.sheets[0].viewport, { x: 500, y: 600, zoom: 1.5 });
  assert.equal(res.sheets[0].nodes[0].x, 300);
  assert.equal(res.sheets[0].nodes[0].y, 400);
  assert.equal(res.sheets[0].nodes[0].name, 'R1-RENAMED');
  assert.equal(res.sheets[0].underlay.src, 'data:image/png;base64,ABC');
  assert.equal(res.sheets[0].underlay.opacity, 75);
  assert.equal(res.sheets[1].nodes[0].id, 'n9');

  // If active sheet s1 is deleted remotely, fall back cleanly to s2
  const delRes = applySheetDelta(
    { sheets: res.sheets, projectName: res.projectName, activeSheetId: 's1' },
    { removedSheetIds: ['s1'], addedSheets: [], sheetDeltas: [] }
  );
  assert.equal(delRes.activeSheetDeleted, true);
  assert.equal(delRes.activeSheetId, 's2');
});

test('buildPeersDirectory and filterCursorsForSheet scope presence and cursors by sheetId', () => {
  const dir = buildPeersDirectory({
    selfPeerId: 'host_1',
    selfName: 'Facu',
    selfColor: '#38bdf8',
    selfSheetId: 's1',
    isHost: true,
    peers: {
      guest_1: { name: 'Ana', color: '#10b981', sheetId: 's1', isHost: false },
      guest_2: { name: 'Luis', color: '#f59e0b', sheetId: 's2', isHost: false }
    }
  });

  assert.equal(dir.length, 3);
  assert.equal(dir[0].peerId, 'host_1');
  assert.equal(dir[0].isHost, true);

  const peersMap = {
    host_1: { name: 'Facu', sheetId: 's1' },
    guest_1: { name: 'Ana', sheetId: 's1' },
    guest_2: { name: 'Luis', sheetId: 's2' }
  };
  const scoped = filterCursorsForSheet(peersMap, 's1');
  assert.deepEqual(scoped.visible.sort(), ['guest_1', 'host_1']);
  assert.deepEqual(scoped.hidden, ['guest_2']);
});

test('syncObjectInPlace and applySheetDelta preserve live node/zone object references for DOM closures', () => {
  const liveNode = { id: 'n1', type: 'router', name: 'OldName', customColor: '#ff0000', x: 100, y: 100, _cachedBoxW: 80 };
  const liveZone = { id: 'z1', name: 'OldZone', color: 'cyan', x: 10, y: 20, width: 320, height: 220 };
  const sheet = makeSheet('s1', 'Hoja 1', { nodes: [liveNode], zones: [liveZone] });

  const res = applySheetDelta(
    { sheets: [sheet], projectName: 'P', activeSheetId: 's1' },
    {
      sheetDeltas: [
        {
          sheetId: 's1',
          upsertNodes: [{ id: 'n1', type: 'router', name: 'NewName', x: 250, y: 300 }],
          upsertZones: [{ id: 'z1', name: 'NewZone', color: 'emerald', x: 50, y: 60, width: 400, height: 260 }]
        }
      ]
    }
  );

  // Exact same object references preserved for DOM event closures
  assert.equal(res.sheets[0].nodes[0], liveNode);
  assert.equal(res.sheets[0].zones[0], liveZone);
  assert.equal(liveNode.name, 'NewName');
  assert.equal(liveNode.x, 250);
  assert.equal('customColor' in liveNode, false); // removed property deleted
  assert.equal(liveNode._cachedBoxW, 80); // transient _cached* preserved until re-render
  assert.equal(liveZone.name, 'NewZone');
  assert.equal(liveZone.color, 'emerald');

  // Direct syncObjectInPlace test
  const obj = { id: 'x', a: 1, b: 2 };
  const sameRef = syncObjectInPlace(obj, { id: 'x', a: 99 });
  assert.equal(sameRef, obj);
  assert.equal(obj.a, 99);
  assert.equal('b' in obj, false);
});

