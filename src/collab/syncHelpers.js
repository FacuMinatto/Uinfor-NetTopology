/**
 * NetTopology - Pure Collaboration Sync Helpers (DOM-free for unit testing)
 */

const VALID_ROOM_CODE_RE = /^NET-[2-9A-HJ-NP-Z]{3}-[2-9A-HJ-NP-Z]{3}$/;
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Normalize user-entered room codes into NET-XXX-XXX format.
 */
export function normalizeRoomCode(input) {
  let cleaned = String(input || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (cleaned.startsWith('NET')) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.length === 6) {
    return `NET-${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  }
  return cleaned ? `NET-${cleaned}` : '';
}

/**
 * Validate normalized room code against Base32 NET-XXX-XXX format.
 */
export function isValidRoomCode(input) {
  return VALID_ROOM_CODE_RE.test(normalizeRoomCode(input));
}

/**
 * Compute a fast, collision-resistant fingerprint for an underlay image without cloning megabytes.
 */
export function computeUnderlayHash(underlay) {
  const src = (underlay && typeof underlay.src === 'string') ? underlay.src : '';
  if (!src) return '';
  const len = src.length;
  const head = src.slice(0, 24);
  const tail = len > 24 ? src.slice(-24) : '';
  let h = 2166136261;
  for (let i = 0; i < len; i++) {
    h ^= src.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return `${len}:${h.toString(36)}:${head}:${tail}`;
}

/**
 * Split a string into chunks of at most chunkSize characters.
 */
export function chunkString(str, chunkSize = 60000) {
  if (typeof str !== 'string' || !str.length) return [];
  const size = Math.max(1024, Math.floor(chunkSize));
  const chunks = [];
  for (let i = 0; i < str.length; i += size) {
    chunks.push(str.slice(i, i + size));
  }
  return chunks;
}

/**
 * Reassemble an ordered array of string chunks. Returns null if any chunk is missing.
 */
export function assembleChunks(chunks, expectedTotal = null) {
  if (!Array.isArray(chunks) || chunks.length === 0) return null;
  if (expectedTotal !== null && chunks.length !== expectedTotal) return null;
  for (let i = 0; i < chunks.length; i++) {
    if (typeof chunks[i] !== 'string') return null;
  }
  return chunks.join('');
}

function deepCloneClean(val, depth = 0) {
  if (val === null || typeof val !== 'object') return val;
  if (depth >= 12) return Array.isArray(val) ? [] : {};
  if (Array.isArray(val)) {
    return val.map(item => deepCloneClean(item, depth + 1));
  }
  const out = {};
  for (const key of Object.keys(val)) {
    if (UNSAFE_KEYS.has(key) || key.startsWith('_cached')) continue;
    out[key] = deepCloneClean(val[key], depth + 1);
  }
  return out;
}

function extractUnderlayMeta(underlay) {
  if (!underlay || typeof underlay !== 'object' || !underlay.src) return null;
  return {
    name: typeof underlay.name === 'string' ? underlay.name : 'Plano de fondo',
    x: Number.isFinite(Number(underlay.x)) ? Number(underlay.x) : 0,
    y: Number.isFinite(Number(underlay.y)) ? Number(underlay.y) : 0,
    width: Number.isFinite(Number(underlay.width)) ? Number(underlay.width) : 800,
    height: Number.isFinite(Number(underlay.height)) ? Number(underlay.height) : 600,
    scale: Number.isFinite(Number(underlay.scale)) ? Number(underlay.scale) : 100,
    opacity: Number.isFinite(Number(underlay.opacity)) ? Number(underlay.opacity) : 40,
    visible: underlay.visible === false ? false : true,
    locked: underlay.locked === false ? false : true,
    hash: computeUnderlayHash(underlay)
  };
}

function extractSheetMeta(sheet) {
  return {
    name: typeof sheet.name === 'string' ? sheet.name : 'Hoja',
    pageSize: typeof sheet.pageSize === 'string' ? sheet.pageSize : 'infinite',
    pageWidth: Number.isFinite(Number(sheet.pageWidth)) ? Number(sheet.pageWidth) : 1123,
    pageHeight: Number.isFinite(Number(sheet.pageHeight)) ? Number(sheet.pageHeight) : 794,
    bgTheme: typeof sheet.bgTheme === 'string' ? sheet.bgTheme : 'white'
  };
}

function makeEntityMap(arr) {
  const map = {};
  if (!Array.isArray(arr)) return map;
  for (const item of arr) {
    if (!item || typeof item.id !== 'string' || !item.id) continue;
    const clean = deepCloneClean(item);
    map[item.id] = { data: clean, sig: JSON.stringify(clean) };
  }
  return map;
}

/**
 * Build a normalized, viewport/activeSheetId-free snapshot of project sheets for diffing.
 */
export function createSyncSnapshot(sheets, projectName = '') {
  const sheetOrder = [];
  const sheetsById = {};
  const list = Array.isArray(sheets) ? sheets : [];

  for (const sheet of list) {
    if (!sheet || typeof sheet.id !== 'string' || !sheet.id) continue;
    sheetOrder.push(sheet.id);
    const meta = extractSheetMeta(sheet);
    const underlayMeta = extractUnderlayMeta(sheet.underlay);
    sheetsById[sheet.id] = {
      id: sheet.id,
      meta,
      metaSig: JSON.stringify(meta),
      nodesById: makeEntityMap(sheet.nodes),
      connectionsById: makeEntityMap(sheet.connections),
      zonesById: makeEntityMap(sheet.zones),
      underlayMeta,
      underlayMetaSig: underlayMeta ? JSON.stringify(underlayMeta) : ''
    };
  }

  return {
    projectName: typeof projectName === 'string' ? projectName : '',
    sheetOrder,
    sheetsById
  };
}

/**
 * Incrementally keep lastSyncedSnapshot aligned with immediate broadcasts (NODE_MOVE/CREATE/DELETE, CONNECTION_CREATE/DELETE).
 */
export function patchSnapshotEntity(snapshot, sheetId, kind, op, entityOrId) {
  if (!snapshot || !sheetId || !snapshot.sheetsById?.[sheetId]) return;
  const sheetSnap = snapshot.sheetsById[sheetId];
  const mapKey = kind === 'node' ? 'nodesById' : (kind === 'connection' ? 'connectionsById' : 'zonesById');
  const entityMap = sheetSnap[mapKey];
  if (!entityMap) return;

  if (op === 'delete') {
    const id = typeof entityOrId === 'string' ? entityOrId : entityOrId?.id;
    if (id) delete entityMap[id];
    if (kind === 'node' && id) {
      for (const [cid, entry] of Object.entries(sheetSnap.connectionsById)) {
        if (entry.data.fromNodeId === id || entry.data.toNodeId === id) {
          delete sheetSnap.connectionsById[cid];
        }
      }
    }
    return;
  }

  if (op === 'move' && kind === 'node' && entityOrId && typeof entityOrId.id === 'string') {
    const existing = entityMap[entityOrId.id];
    if (existing) {
      existing.data.x = entityOrId.x;
      existing.data.y = entityOrId.y;
      existing.sig = JSON.stringify(existing.data);
      return;
    }
  }

  if (entityOrId && typeof entityOrId.id === 'string' && entityOrId.id) {
    const clean = deepCloneClean(entityOrId);
    entityMap[entityOrId.id] = { data: clean, sig: JSON.stringify(clean) };
  }
}

function diffEntityMap(prevMap, currArray) {
  const upsert = [];
  const del = [];
  const seen = new Set();

  for (const item of (Array.isArray(currArray) ? currArray : [])) {
    if (!item || typeof item.id !== 'string' || !item.id) continue;
    seen.add(item.id);
    const clean = deepCloneClean(item);
    const sig = JSON.stringify(clean);
    if (!prevMap[item.id] || prevMap[item.id].sig !== sig) {
      upsert.push(clean);
    }
  }

  for (const id of Object.keys(prevMap)) {
    if (!seen.has(id)) {
      del.push(id);
    }
  }

  return { upsert, del };
}

/**
 * Compute minimal project delta between previous sync snapshot and current state.sheets.
 * Excludes local activeSheetId and viewport so view navigation never triggers syncs.
 */
export function diffProjectSheets(prevSnapshot, currSheets, currProjectName = '') {
  const prev = prevSnapshot || { projectName: '', sheetOrder: [], sheetsById: {} };
  const list = Array.isArray(currSheets) ? currSheets : [];
  const nextProjectName = typeof currProjectName === 'string' ? currProjectName : '';

  const projectNameChanged = prev.projectName !== nextProjectName;
  const currOrder = list.filter(s => s && typeof s.id === 'string' && s.id).map(s => s.id);
  const sheetOrderChanged = JSON.stringify(prev.sheetOrder) !== JSON.stringify(currOrder);

  const currIdSet = new Set(currOrder);
  const removedSheetIds = prev.sheetOrder.filter(id => !currIdSet.has(id));
  const addedSheets = [];
  const sheetDeltas = [];
  const underlaysToSend = [];

  for (const sheet of list) {
    if (!sheet || typeof sheet.id !== 'string' || !sheet.id) continue;
    const prevSheet = prev.sheetsById[sheet.id];
    const currUnderlayMeta = extractUnderlayMeta(sheet.underlay);

    if (!prevSheet) {
      const cleanSheet = {
        id: sheet.id,
        ...extractSheetMeta(sheet),
        nodes: (Array.isArray(sheet.nodes) ? sheet.nodes : []).map(n => deepCloneClean(n)),
        connections: (Array.isArray(sheet.connections) ? sheet.connections : []).map(c => deepCloneClean(c)),
        zones: (Array.isArray(sheet.zones) ? sheet.zones : []).map(z => deepCloneClean(z)),
        underlay: currUnderlayMeta
      };
      addedSheets.push(cleanSheet);
      if (currUnderlayMeta && sheet.underlay?.src) {
        underlaysToSend.push({
          sheetId: sheet.id,
          hash: currUnderlayMeta.hash,
          src: sheet.underlay.src,
          meta: currUnderlayMeta
        });
      }
      continue;
    }

    const currMeta = extractSheetMeta(sheet);
    const metaChanged = prevSheet.metaSig !== JSON.stringify(currMeta);
    const nodesDiff = diffEntityMap(prevSheet.nodesById, sheet.nodes);
    const connsDiff = diffEntityMap(prevSheet.connectionsById, sheet.connections);
    const zonesDiff = diffEntityMap(prevSheet.zonesById, sheet.zones);

    const currUnderlaySig = currUnderlayMeta ? JSON.stringify(currUnderlayMeta) : '';
    const underlayRemoved = Boolean(prevSheet.underlayMeta && !currUnderlayMeta);
    const underlayMetaChanged = Boolean(currUnderlayMeta && prevSheet.underlayMetaSig !== currUnderlaySig);
    const underlayImageChanged = Boolean(
      currUnderlayMeta &&
      sheet.underlay?.src &&
      currUnderlayMeta.hash !== (prevSheet.underlayMeta?.hash || '')
    );

    if (
      metaChanged ||
      nodesDiff.upsert.length > 0 || nodesDiff.del.length > 0 ||
      connsDiff.upsert.length > 0 || connsDiff.del.length > 0 ||
      zonesDiff.upsert.length > 0 || zonesDiff.del.length > 0 ||
      underlayRemoved ||
      underlayMetaChanged
    ) {
      const sd = { sheetId: sheet.id };
      if (metaChanged) sd.meta = currMeta;
      if (nodesDiff.upsert.length > 0) sd.upsertNodes = nodesDiff.upsert;
      if (nodesDiff.del.length > 0) sd.deleteNodeIds = nodesDiff.del;
      if (connsDiff.upsert.length > 0) sd.upsertConnections = connsDiff.upsert;
      if (connsDiff.del.length > 0) sd.deleteConnectionIds = connsDiff.del;
      if (zonesDiff.upsert.length > 0) sd.upsertZones = zonesDiff.upsert;
      if (zonesDiff.del.length > 0) sd.deleteZoneIds = zonesDiff.del;
      if (underlayRemoved) sd.underlayRemoved = true;
      if (underlayMetaChanged) sd.underlayMeta = currUnderlayMeta;
      sheetDeltas.push(sd);
    }

    if (underlayImageChanged) {
      underlaysToSend.push({
        sheetId: sheet.id,
        hash: currUnderlayMeta.hash,
        src: sheet.underlay.src,
        meta: currUnderlayMeta
      });
    }
  }

  if (
    !projectNameChanged &&
    !sheetOrderChanged &&
    removedSheetIds.length === 0 &&
    addedSheets.length === 0 &&
    sheetDeltas.length === 0 &&
    underlaysToSend.length === 0
  ) {
    return null;
  }

  return {
    projectNameChanged,
    ...(projectNameChanged ? { projectName: nextProjectName } : {}),
    sheetOrderChanged,
    ...(sheetOrderChanged ? { sheetOrder: currOrder } : {}),
    addedSheets,
    removedSheetIds,
    sheetDeltas,
    underlaysToSend
  };
}

/**
 * Update an existing entity object in place so live DOM event closures keep pointing to the same reference.
 */
export function syncObjectInPlace(target, incoming) {
  if (!target || typeof target !== 'object' || !incoming || typeof incoming !== 'object') {
    return incoming;
  }
  for (const key of Object.keys(target)) {
    if (!key.startsWith('_cached') && !(key in incoming)) {
      delete target[key];
    }
  }
  Object.assign(target, incoming);
  return target;
}

function applyEntityOps(list, upsertList, deleteIds, protectedDragIds = null) {
  const arr = Array.isArray(list) ? [...list] : [];
  const delSet = new Set(Array.isArray(deleteIds) ? deleteIds : []);
  const filtered = delSet.size > 0 ? arr.filter(item => item && !delSet.has(item.id)) : arr;

  const byId = new Map();
  filtered.forEach((item, idx) => {
    if (item && item.id) byId.set(item.id, idx);
  });

  const appliedUpserts = [];
  for (const raw of (Array.isArray(upsertList) ? upsertList : [])) {
    if (!raw || typeof raw.id !== 'string' || !raw.id) continue;
    const incoming = deepCloneClean(raw);
    const existingIdx = byId.get(incoming.id);
    if (existingIdx !== undefined) {
      const existing = filtered[existingIdx];
      if (protectedDragIds && protectedDragIds.has(incoming.id)) {
        // Preserve local coordinates while user is actively dragging this element
        incoming.x = existing.x;
        incoming.y = existing.y;
      }
      syncObjectInPlace(existing, incoming);
      appliedUpserts.push(existing);
    } else {
      byId.set(incoming.id, filtered.length);
      filtered.push(incoming);
      appliedUpserts.push(incoming);
    }
  }

  return {
    list: filtered,
    upserted: appliedUpserts,
    deletedIds: Array.from(delSet)
  };
}

/**
 * Apply a remote delta onto sheets without overwriting local activeSheetId (unless deleted) or viewport.
 */
export function applySheetDelta({ sheets, projectName = '', activeSheetId = null, protectedDragIds = null }, delta) {
  if (!delta || typeof delta !== 'object') {
    return {
      sheets: Array.isArray(sheets) ? sheets : [],
      projectName,
      activeSheetId,
      activeSheetDeleted: false,
      sheetsBarChanged: false,
      projectNameChanged: false,
      activeEffects: null
    };
  }

  let nextProjectName = projectName;
  let projectNameChanged = false;
  if (delta.projectNameChanged && typeof delta.projectName === 'string') {
    nextProjectName = delta.projectName;
    projectNameChanged = true;
  }

  let nextSheets = Array.isArray(sheets) ? sheets.map(s => ({ ...s })) : [];
  let sheetsBarChanged = false;
  let activeSheetDeleted = false;

  const removedSet = new Set(Array.isArray(delta.removedSheetIds) ? delta.removedSheetIds : []);
  if (removedSet.size > 0) {
    if (activeSheetId && removedSet.has(activeSheetId) && nextSheets.length > removedSet.size) {
      activeSheetDeleted = true;
    }
    nextSheets = nextSheets.filter(s => s && !removedSet.has(s.id));
    if (nextSheets.length === 0) {
      // Never leave project with zero sheets
      nextSheets.push({
        id: activeSheetId || 'sheet_1',
        name: 'Hoja 1',
        pageSize: 'infinite',
        pageWidth: 1123,
        pageHeight: 794,
        bgTheme: 'white',
        nodes: [],
        connections: [],
        zones: [],
        underlay: null,
        viewport: { x: 80, y: 80, zoom: 1 }
      });
      activeSheetDeleted = true;
    }
    sheetsBarChanged = true;
  }

  for (const added of (Array.isArray(delta.addedSheets) ? delta.addedSheets : [])) {
    if (!added || typeof added.id !== 'string' || !added.id) continue;
    if (nextSheets.some(s => s.id === added.id)) continue;
    nextSheets.push({
      id: added.id,
      ...extractSheetMeta(added),
      nodes: (Array.isArray(added.nodes) ? added.nodes : []).map(n => deepCloneClean(n)),
      connections: (Array.isArray(added.connections) ? added.connections : []).map(c => deepCloneClean(c)),
      zones: (Array.isArray(added.zones) ? added.zones : []).map(z => deepCloneClean(z)),
      underlay: added.underlay ? { ...added.underlay, src: added.underlay.src || '' } : null,
      viewport: { x: 80, y: 80, zoom: 1 }
    });
    sheetsBarChanged = true;
  }

  if (delta.sheetOrderChanged && Array.isArray(delta.sheetOrder) && delta.sheetOrder.length > 0) {
    const byId = new Map(nextSheets.map(s => [s.id, s]));
    const ordered = [];
    const seen = new Set();
    for (const sid of delta.sheetOrder) {
      if (byId.has(sid) && !seen.has(sid)) {
        ordered.push(byId.get(sid));
        seen.add(sid);
      }
    }
    for (const s of nextSheets) {
      if (!seen.has(s.id)) ordered.push(s);
    }
    nextSheets = ordered;
    sheetsBarChanged = true;
  }

  let nextActiveSheetId = activeSheetId;
  if (activeSheetDeleted || !nextSheets.some(s => s.id === nextActiveSheetId)) {
    nextActiveSheetId = nextSheets[0]?.id || null;
  }

  let activeEffects = null;
  const sheetById = new Map(nextSheets.map(s => [s.id, s]));

  for (const sd of (Array.isArray(delta.sheetDeltas) ? delta.sheetDeltas : [])) {
    if (!sd || typeof sd.sheetId !== 'string') continue;
    const sheet = sheetById.get(sd.sheetId);
    if (!sheet) continue;

    const isActive = sheet.id === nextActiveSheetId;
    const dragGuard = isActive ? protectedDragIds : null;

    let metaChanged = false;
    if (sd.meta && typeof sd.meta === 'object') {
      const cleanMeta = extractSheetMeta(sd.meta);
      if (
        sheet.name !== cleanMeta.name ||
        sheet.pageSize !== cleanMeta.pageSize ||
        sheet.pageWidth !== cleanMeta.pageWidth ||
        sheet.pageHeight !== cleanMeta.pageHeight ||
        sheet.bgTheme !== cleanMeta.bgTheme
      ) {
        Object.assign(sheet, cleanMeta);
        metaChanged = true;
        sheetsBarChanged = true;
      }
    }

    const nodeRes = applyEntityOps(sheet.nodes, sd.upsertNodes, sd.deleteNodeIds, dragGuard);
    sheet.nodes = nodeRes.list;

    const connRes = applyEntityOps(sheet.connections, sd.upsertConnections, sd.deleteConnectionIds);
    sheet.connections = connRes.list;

    const zoneRes = applyEntityOps(sheet.zones, sd.upsertZones, sd.deleteZoneIds, dragGuard);
    sheet.zones = zoneRes.list;

    let underlayChanged = false;
    if (sd.underlayRemoved) {
      if (sheet.underlay !== null) {
        sheet.underlay = null;
        underlayChanged = true;
      }
    } else if (sd.underlayMeta && typeof sd.underlayMeta === 'object') {
      const existingSrc = (sheet.underlay && typeof sheet.underlay.src === 'string') ? sheet.underlay.src : '';
      const existingHash = existingSrc ? computeUnderlayHash({ src: existingSrc }) : '';
      const nextSrc = (sd.underlayMeta.hash && existingHash === sd.underlayMeta.hash) ? existingSrc : '';
      sheet.underlay = {
        ...deepCloneClean(sd.underlayMeta),
        src: nextSrc
      };
      underlayChanged = true;
    }

    if (isActive) {
      activeEffects = {
        metaChanged,
        upsertedNodes: nodeRes.upserted,
        deletedNodeIds: nodeRes.deletedIds,
        upsertedConnections: connRes.upserted,
        deletedConnectionIds: connRes.deletedIds,
        upsertedZones: zoneRes.upserted,
        deletedZoneIds: zoneRes.deletedIds,
        underlayChanged
      };
    }
  }

  return {
    sheets: nextSheets,
    projectName: nextProjectName,
    activeSheetId: nextActiveSheetId,
    activeSheetDeleted,
    sheetsBarChanged,
    projectNameChanged,
    activeEffects
  };
}

/**
 * Build a sanitized peers directory array including Host identity and all connected peers.
 */
export function buildPeersDirectory({ selfPeerId, selfName, selfColor, selfSheetId = null, isHost = false, peers = {} }) {
  const dir = [];
  if (selfPeerId) {
    dir.push({
      peerId: String(selfPeerId),
      name: String(selfName || 'Anfitrión').slice(0, 32),
      color: String(selfColor || '#38bdf8'),
      sheetId: selfSheetId || null,
      isHost: Boolean(isHost)
    });
  }
  if (peers && typeof peers === 'object') {
    for (const [peerId, info] of Object.entries(peers)) {
      if (!peerId || peerId === selfPeerId || !info) continue;
      dir.push({
        peerId: String(peerId),
        name: String(info.name || 'Invitado').slice(0, 32),
        color: String(info.color || '#38bdf8'),
        sheetId: info.sheetId || null,
        isHost: Boolean(info.isHost)
      });
    }
  }
  return dir;
}

/**
 * Return only peer IDs whose active sheet matches receiver's activeSheetId (for cursor visibility scoping).
 */
export function filterCursorsForSheet(peers, activeSheetId) {
  const visible = [];
  const hidden = [];
  if (!peers || typeof peers !== 'object') return { visible, hidden };
  for (const [peerId, info] of Object.entries(peers)) {
    if (!info) continue;
    if (!activeSheetId || !info.sheetId || info.sheetId === activeSheetId) {
      visible.push(peerId);
    } else {
      hidden.push(peerId);
    }
  }
  return { visible, hidden };
}
