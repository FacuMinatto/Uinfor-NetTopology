/**
 * NetTopology - Módulo de Colaboración P2P en Tiempo Real (WebRTC con PeerJS)
 * Permite trabajo colaborativo multiusuario sin necesidad de servidor centralizado.
 */

import { state, dom } from '../state/store.js';
import { app } from '../core/appContext.js';
import { showToast, saveStateImmediately, unlinkDiskFile, saveState, getDiskFileHandle } from '../storage/db.js';
import { renderConnections } from '../core/cables.js';
import { renderNodeElement } from '../core/nodes.js';
import { renderZones, renderZoneElement } from '../core/zones.js';
import { renderUnderlay } from '../core/underlay.js';
import { renderSheetsBar, updatePaperSheetDisplay, getCurrentSheet, loadSheetData } from '../core/sheets.js';
import { deselectAll, renderInspector, updateSelectionVisuals } from '../ui/inspector.js';
import { updateMinimap } from '../core/canvas.js';
import {
  escapeHtml,
  sanitizeHexColor,
  sanitizeNodePayload,
  sanitizeConnectionPayload,
  sanitizeZonePayload,
  sanitizeProjectData,
  sanitizeUnderlaySrc
} from '../utils/helpers.js';
import { createHistorySnapshot, updateUndoRedoUI } from '../state/history.js';
import {
  normalizeRoomCode,
  isValidRoomCode,
  computeUnderlayHash,
  chunkString,
  assembleChunks,
  createSyncSnapshot,
  patchSnapshotEntity,
  diffProjectSheets,
  applySheetDelta,
  buildPeersDirectory,
  filterCursorsForSheet
} from './syncHelpers.js';

export { normalizeRoomCode, isValidRoomCode };

// Paleta de colores para los cursores y avatares de participantes
const PEER_COLORS = [
  '#38bdf8', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#f43f5e', // Rose
  '#a855f7', // Purple
  '#06b6d4', // Teal
  '#ec4899', // Pink
  '#3b82f6'  // Blue
];

const GUEST_CONNECT_TIMEOUT_MS = 15000;
const HEARTBEAT_INTERVAL_MS = 10000;
const HEARTBEAT_STALE_MS = 30000;
const LARGE_UNDERLAY_THRESHOLD = 200000;
const UNDERLAY_CHUNK_SIZE = 60000;
const MAX_PEER_MSG_CHARS = 8 * 1024 * 1024;
const MAX_CONTROL_MSG_CHARS = 16384;
const MAX_PEER_TREE_DEPTH = 24;
const UNSAFE_PROTO_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const CONTROL_MSG_TYPES = new Set([
  'PING',
  'PONG',
  'PEER_META',
  'NODE_MOVE',
  'NODE_DELETE',
  'CONNECTION_DELETE',
  'CURSOR_MOVE',
  'ROOM_CLOSED'
]);

let cachedPeerClass = null;
let peerInitToken = 0;
let collabBeforeUnloadBound = false;

async function loadPeerClass() {
  if (cachedPeerClass) return cachedPeerClass;
  const { Peer: PeerCtor } = await import('peerjs');
  if (typeof PeerCtor !== 'function') {
    throw new Error('PeerJS no exportó una clase Peer válida');
  }
  cachedPeerClass = PeerCtor;
  return cachedPeerClass;
}

function isPlainObject(val) {
  if (!val || typeof val !== 'object' || Array.isArray(val)) return false;
  const proto = Object.getPrototypeOf(val);
  return proto === Object.prototype || proto === null;
}

function inspectPeerValue(val, stats, maxChars, depth = 0) {
  if (depth > MAX_PEER_TREE_DEPTH) return false;
  if (val === null || val === undefined) return true;
  const t = typeof val;
  if (t === 'string') {
    stats.chars += val.length;
    return stats.chars <= maxChars;
  }
  if (t === 'number') {
    stats.chars += 8;
    return Number.isFinite(val) && stats.chars <= maxChars;
  }
  if (t === 'boolean') {
    stats.chars += 5;
    return stats.chars <= maxChars;
  }
  if (t !== 'object') return false;

  if (Array.isArray(val)) {
    stats.chars += 2;
    if (stats.chars > maxChars) return false;
    for (let i = 0; i < val.length; i++) {
      if (!inspectPeerValue(val[i], stats, maxChars, depth + 1)) return false;
    }
    return true;
  }

  if (!isPlainObject(val)) return false;
  const keys = Object.keys(val);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (UNSAFE_PROTO_KEYS.has(key)) return false;
    stats.chars += key.length + 4;
    if (stats.chars > maxChars) return false;
    if (!inspectPeerValue(val[key], stats, maxChars, depth + 1)) return false;
  }
  return true;
}

/**
 * Valida estructura, tamaño, profundidad, claves de prototipo y coordenadas de mensajes P2P entrantes.
 */
export function sanitizeIncomingPeerPayload(msg) {
  if (!isPlainObject(msg)) return null;
  if (typeof msg.type !== 'string' || !msg.type || msg.type.length > 64) return null;

  const maxChars = CONTROL_MSG_TYPES.has(msg.type) ? MAX_CONTROL_MSG_CHARS : MAX_PEER_MSG_CHARS;
  if (!inspectPeerValue(msg, { chars: 0 }, maxChars, 0)) {
    return null;
  }

  const payload = msg.payload;
  switch (msg.type) {
    case 'NODE_MOVE': {
      if (!isPlainObject(payload) || typeof payload.id !== 'string' || !payload.id.trim()) return null;
      if (typeof payload.x !== 'number' || typeof payload.y !== 'number') return null;
      if (!Number.isFinite(payload.x) || !Number.isFinite(payload.y)) return null;
      if (payload.sheetId !== undefined && typeof payload.sheetId !== 'string') return null;
      break;
    }
    case 'CURSOR_MOVE': {
      if (!isPlainObject(payload)) return null;
      if (typeof payload.x !== 'number' || typeof payload.y !== 'number') return null;
      if (!Number.isFinite(payload.x) || !Number.isFinite(payload.y)) return null;
      if (payload.sheetId !== undefined && payload.sheetId !== null && typeof payload.sheetId !== 'string') return null;
      break;
    }
    case 'INITIAL_SYNC':
    case 'STATE_SYNC':
    case 'PROJECT_DELTA':
    case 'NODE_CREATE':
    case 'CONNECTION_CREATE':
    case 'UNDERLAY_IMAGE':
    case 'UNDERLAY_IMAGE_CHUNK':
    case 'PEER_META': {
      if (!isPlainObject(payload)) return null;
      break;
    }
    default:
      break;
  }

  return msg;
}

let activePeer = null;
let activeConnections = new Map(); // peerId -> DataConnection
let lastActivityAt = new Map(); // peerId -> timestamp ms
let localUserName = localStorage.getItem('nettopology_collab_name') || 'Usuario_' + Math.floor(100 + Math.random() * 900);
let localUserColor = PEER_COLORS[Math.floor(Math.random() * PEER_COLORS.length)];
let isHostMode = false;
let hasReceivedInitialSync = false;
let currentRoomId = null;
let cursorThrottleTimeout = null;
let lastCursorSentTime = 0;
let pendingCursor = null;
let remoteMoveDebounceTimer = null;
let remoteMoveRafId = null;

let hostReconnectAttempts = 0;
let hostReconnectTimer = null;
let guestConnectTimeout = null;
let pendingGuestConn = null;
let heartbeatInterval = null;
let hostClosingTimer = null;
let lastSyncedSnapshot = null;
const incomingUnderlayChunks = new Map(); // `${sheetId}:${hash}` -> { total, chunks, meta, received }

// Capa de cursores remotos en el mundo del canvas
let remoteCursorsLayer = null;

function ensureRemoteCursorsLayer() {
  if (!remoteCursorsLayer) {
    let layer = document.getElementById('remote-cursors-layer');
    if (!layer && dom.world) {
      layer = document.createElement('div');
      layer.id = 'remote-cursors-layer';
      layer.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 50;';
      dom.world.appendChild(layer);
    }
    remoteCursorsLayer = layer;
  }
  return remoteCursorsLayer;
}

/**
 * Construir opciones de PeerJS desde variables de entorno Vite (fallback a 0.peerjs.com por defecto)
 */
function getPeerOptions() {
  const options = { debug: 1 };
  const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {};

  if (env.VITE_PEERJS_HOST && String(env.VITE_PEERJS_HOST).trim()) {
    options.host = String(env.VITE_PEERJS_HOST).trim();
  }
  if (env.VITE_PEERJS_PORT && String(env.VITE_PEERJS_PORT).trim()) {
    const port = parseInt(env.VITE_PEERJS_PORT, 10);
    if (Number.isFinite(port) && port > 0) {
      options.port = port;
    }
  }
  if (env.VITE_PEERJS_PATH && String(env.VITE_PEERJS_PATH).trim()) {
    options.path = String(env.VITE_PEERJS_PATH).trim();
  }
  if (env.VITE_PEERJS_SECURE !== undefined && String(env.VITE_PEERJS_SECURE).trim() !== '') {
    options.secure = String(env.VITE_PEERJS_SECURE).trim().toLowerCase() === 'true';
  }

  const turnUrlsRaw = env.VITE_TURN_URLS ? String(env.VITE_TURN_URLS).trim() : '';
  if (turnUrlsRaw) {
    const urls = turnUrlsRaw.split(',').map(u => u.trim()).filter(Boolean);
    if (urls.length > 0) {
      const iceServers = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ];
      const turnEntry = { urls };
      if (env.VITE_TURN_USERNAME) turnEntry.username = String(env.VITE_TURN_USERNAME).trim();
      if (env.VITE_TURN_CREDENTIAL) turnEntry.credential = String(env.VITE_TURN_CREDENTIAL).trim();
      iceServers.push(turnEntry);
      options.config = { iceServers };
    }
  }

  return options;
}

function getSyncedSheetsArray() {
  const currSheet = getCurrentSheet();
  if (currSheet) {
    currSheet.nodes = state.nodes;
    currSheet.connections = state.connections;
    currSheet.zones = state.zones || [];
    currSheet.underlay = state.underlay ? { ...state.underlay } : null;
  }
  return Array.isArray(state.sheets) ? state.sheets : [];
}

function getProtectedDragIds() {
  if (!state.isDraggingNode && !state.isResizingZone) return null;
  const ids = new Set();
  if (state.selectedNodeIds) state.selectedNodeIds.forEach(id => ids.add(id));
  if (state.selectedZoneIds) state.selectedZoneIds.forEach(id => ids.add(id));
  if (state.selection?.id) ids.add(state.selection.id);
  return ids.size > 0 ? ids : null;
}

function startHeartbeat() {
  stopHeartbeat();
  heartbeatInterval = setInterval(() => {
    if (!state.collab.active) return;
    const now = Date.now();
    for (const [peerId, conn] of activeConnections.entries()) {
      const last = lastActivityAt.get(peerId) || now;
      if (now - last > HEARTBEAT_STALE_MS) {
        console.warn('[Collab] Conexión inactiva por timeout de heartbeat:', peerId);
        try {
          conn.close();
        } catch (e) {
          console.warn('[Collab] Error cerrando conexión inactiva:', peerId, e);
        }
        continue;
      }
      if (conn.open) {
        try {
          conn.send({ type: 'PING', payload: { t: now } });
        } catch (e) {
          console.warn('[Collab] Error enviando PING a par:', peerId, e);
        }
      }
    }
  }, HEARTBEAT_INTERVAL_MS);
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  lastActivityAt.clear();
}

function clearGuestConnectTimers() {
  if (guestConnectTimeout) {
    clearTimeout(guestConnectTimeout);
    guestConnectTimeout = null;
  }
  pendingGuestConn = null;
}

function sendUnderlayTransfer(targetOrBroadcast, transfer) {
  const { sheetId, hash, src, meta } = transfer;
  if (!src) return;

  const emit = (msg) => {
    if (targetOrBroadcast && typeof targetOrBroadcast.send === 'function') {
      if (targetOrBroadcast.open) {
        try { targetOrBroadcast.send(msg); } catch (e) {
          console.warn('[Collab] Error enviando transferencia de plano a par:', e);
        }
      }
    } else {
      broadcastCollabAction(msg.type, msg.payload);
    }
  };

  if (src.length <= LARGE_UNDERLAY_THRESHOLD) {
    emit({
      type: 'UNDERLAY_IMAGE',
      payload: { sheetId, hash, src, meta }
    });
    return;
  }

  const chunks = chunkString(src, UNDERLAY_CHUNK_SIZE);
  for (let i = 0; i < chunks.length; i++) {
    emit({
      type: 'UNDERLAY_IMAGE_CHUNK',
      payload: {
        sheetId,
        hash,
        index: i,
        totalChunks: chunks.length,
        data: chunks[i],
        meta: i === 0 ? meta : undefined
      }
    });
  }
}

function broadcastPeersList() {
  if (!isHostMode || !state.collab.active) return;
  const directory = buildPeersDirectory({
    selfPeerId: state.collab.peerId,
    selfName: localUserName,
    selfColor: localUserColor,
    selfSheetId: state.activeSheetId,
    isHost: true,
    peers: state.collab.peers
  });
  broadcastCollabAction('PEERS_LIST', { peers: directory });
}

function applyPeersDirectory(directory) {
  if (!Array.isArray(directory)) return;
  const nextPeers = {};
  const validIds = new Set();

  for (const entry of directory) {
    if (!entry || typeof entry.peerId !== 'string' || !entry.peerId) continue;
    if (entry.peerId === state.collab.peerId) continue;
    validIds.add(entry.peerId);
    const prev = state.collab.peers[entry.peerId];
    nextPeers[entry.peerId] = {
      name: String(entry.name || 'Participante').slice(0, 32),
      color: sanitizeHexColor(entry.color, '#38bdf8'),
      sheetId: typeof entry.sheetId === 'string' ? entry.sheetId : null,
      isHost: Boolean(entry.isHost),
      cursor: prev ? prev.cursor : null
    };
  }

  for (const oldPeerId of Object.keys(state.collab.peers)) {
    if (!validIds.has(oldPeerId)) {
      removeRemoteCursor(oldPeerId);
    }
  }

  state.collab.peers = nextPeers;
  refreshRemoteCursorsVisibility();
  updateCollabStatus('connected', `Conectado a ${currentRoomId || state.collab.roomId}`);
  updateCollabUI();
}

function refreshRemoteCursorsVisibility() {
  const { visible, hidden } = filterCursorsForSheet(state.collab.peers, state.activeSheetId);
  for (const peerId of visible) {
    const el = document.getElementById(`remote-cursor-${peerId}`);
    if (el) el.style.display = '';
  }
  for (const peerId of hidden) {
    const el = document.getElementById(`remote-cursor-${peerId}`);
    if (el) el.style.display = 'none';
  }
}

/**
 * Generar un código de sala criptográficamente seguro (Base32, +1.000 millones de combinaciones)
 */
export function generateSecureRoomCode() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const randomBytes = new Uint8Array(6);
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(randomBytes);
  } else {
    for (let i = 0; i < 6; i++) randomBytes[i] = Math.floor(Math.random() * 256);
  }
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[randomBytes[i] % chars.length];
  }
  return `NET-${code.slice(0, 3)}-${code.slice(3)}`;
}

const TRANSIENT_SIGNALING_ERRORS = new Set([
  'network',
  'server-error',
  'socket-error',
  'socket-closed',
  'disconnected'
]);

function attachSignalingReconnect(peer, shouldReconnect) {
  peer.on('disconnected', () => {
    if (!peer || peer.destroyed || activePeer !== peer || !shouldReconnect()) return;
    const delay = Math.min(1000 * Math.pow(2, hostReconnectAttempts), 15000);
    hostReconnectAttempts++;
    clearTimeout(hostReconnectTimer);
    hostReconnectTimer = setTimeout(() => {
      if (peer && !peer.destroyed && peer.disconnected && activePeer === peer && shouldReconnect()) {
        try {
          peer.reconnect();
        } catch (e) {
          console.warn('[Collab] Fallo al reconectar señalización:', e);
        }
      }
    }, delay);
  });
}

/**
 * Iniciar sesión como Anfitrión (Host)
 */
export async function startHostSession(roomId = null) {
  if (activePeer) leaveCollabSession(false);

  const code = roomId ? normalizeRoomCode(roomId) : generateSecureRoomCode();
  const peerId = 'nettop_v2_' + code.replace(/[^A-Z0-9]/g, '_');
  currentRoomId = code;
  isHostMode = true;
  hasReceivedInitialSync = false;
  hostReconnectAttempts = 0;

  updateCollabStatus('connecting', `Conectando sala ${code}...`);

  const initToken = ++peerInitToken;

  try {
    const PeerCtor = await loadPeerClass();
    if (initToken !== peerInitToken) return;

    activePeer = new PeerCtor(peerId, getPeerOptions());

    activePeer.on('open', (id) => {
      hostReconnectAttempts = 0;
      clearTimeout(hostReconnectTimer);
      hostReconnectTimer = null;

      state.collab.active = true;
      state.collab.isHost = true;
      state.collab.roomId = code;
      state.collab.peerId = id;
      state.collab.status = 'connected';
      lastSyncedSnapshot = createSyncSnapshot(getSyncedSheetsArray(), state.currentProjectName);
      startHeartbeat();
      updateCollabStatus('connected', `Sala activa: ${code}`);
      showToast(`Sala colaborativa creada: ${code}`, 'success');
      updateCollabUI();
    });

    activePeer.on('connection', (conn) => {
      setupConnectionHandlers(conn);
    });

    attachSignalingReconnect(activePeer, () => isHostMode);

    activePeer.on('error', (err) => {
      console.error('[Collab] Error en PeerJS Host:', err);
      if (err.type === 'unavailable-id') {
        showToast('El código de sala ya está en uso. Generando uno nuevo...', 'warning');
        startHostSession();
      } else if (TRANSIENT_SIGNALING_ERRORS.has(err.type)) {
        showToast('Error temporal de señalización P2P. Intentando mantener conexiones activas...', 'warning');
      } else {
        showToast('Error de conexión P2P: ' + (err.message || err.type), 'error');
        updateCollabStatus('error', 'Error de conexión');
      }
    });

    activePeer.on('close', () => {
      leaveCollabSession(false);
    });

  } catch (err) {
    console.error('[Collab] No se pudo inicializar PeerJS:', err);
    showToast('No se pudo iniciar el servicio P2P', 'error');
    updateCollabStatus('error', 'Error de conexión');
  }
}

/**
 * Unirse como Invitado a una sala existente
 */
export async function joinCollabSession(code) {
  const cleanCode = normalizeRoomCode(code);
  if (!cleanCode || !isValidRoomCode(cleanCode)) {
    showToast('Por favor introduce un código de sala válido (formato NET-XXX-XXX)', 'warning');
    return;
  }
  if (activePeer) leaveCollabSession(false);

  // Guardar proyecto local antes de unirse sin emitir cambios ni mostrar toasts innecesarios
  try {
    saveStateImmediately(false, false);
    if (typeof getDiskFileHandle === 'function' && getDiskFileHandle()) {
      unlinkDiskFile();
    }
  } catch (e) {}

  const hostPeerId = 'nettop_v2_' + cleanCode.replace(/[^A-Z0-9]/g, '_');
  currentRoomId = cleanCode;
  isHostMode = false;
  hasReceivedInitialSync = false;
  hostReconnectAttempts = 0;
  state.collab.status = 'connecting';
  state.collab.roomId = cleanCode;

  updateCollabStatus('connecting', `Conectando a la sala ${cleanCode}...`);

  const failGuestConnect = (reasonMsg, statusText = 'No se pudo conectar') => {
    clearGuestConnectTimers();
    showToast(reasonMsg, 'error', 5500);
    updateCollabStatus('error', statusText);
    leaveCollabSession(false);
  };

  guestConnectTimeout = setTimeout(() => {
    if (state.collab.active && hasReceivedInitialSync) return;
    const iceState = pendingGuestConn?.peerConnection?.iceConnectionState;
    if (iceState === 'failed' || iceState === 'disconnected' || iceState === 'checking') {
      failGuestConnect(
        `Tiempo de espera agotado (ICE ${iceState}). Posible bloqueo de firewall/NAT entre redes.`,
        'Fallo ICE / Firewall'
      );
    } else {
      failGuestConnect(
        `No se pudo conectar a la sala ${cleanCode}. Verifica que el anfitrión esté en línea.`,
        'Tiempo agotado'
      );
    }
  }, GUEST_CONNECT_TIMEOUT_MS);

  const initToken = ++peerInitToken;

  try {
    const PeerCtor = await loadPeerClass();
    if (initToken !== peerInitToken) return;

    const guestPeerId = 'nettop_guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    activePeer = new PeerCtor(guestPeerId, getPeerOptions());

    activePeer.on('open', (id) => {
      hostReconnectAttempts = 0;
      clearTimeout(hostReconnectTimer);
      hostReconnectTimer = null;

      if (pendingGuestConn || hasReceivedInitialSync) return;

      state.collab.peerId = id;
      const conn = activePeer.connect(hostPeerId, {
        metadata: {
          userName: localUserName,
          userColor: localUserColor,
          sheetId: state.activeSheetId
        },
        reliable: true
      });
      pendingGuestConn = conn;

      const handleIceState = (iceState) => {
        if (hasReceivedInitialSync) return;
        if (iceState === 'failed') {
          failGuestConnect(
            'Error de red WebRTC (ICE failed): firewall o NAT estricto bloqueando la conexión directa.',
            'Fallo ICE / Firewall'
          );
        }
      };

      if (typeof conn.on === 'function') {
        conn.on('iceStateChanged', handleIceState);
      }
      if (conn.peerConnection && typeof conn.peerConnection.addEventListener === 'function') {
        conn.peerConnection.addEventListener('iceconnectionstatechange', () => {
          handleIceState(conn.peerConnection?.iceConnectionState);
        });
      }

      setupConnectionHandlers(conn);
    });

    attachSignalingReconnect(activePeer, () => !isHostMode && state.collab.active);

    activePeer.on('error', (err) => {
      console.error('[Collab] Error al conectar con sala:', err);
      if (hasReceivedInitialSync && state.collab.active && TRANSIENT_SIGNALING_ERRORS.has(err?.type)) {
        console.warn('[Collab] Error transitorio de señalización en Guest; manteniendo DataConnection WebRTC activa:', err.type);
        return;
      }
      if (err.type === 'peer-unavailable') {
        failGuestConnect(`La sala ${cleanCode} no existe o el anfitrión está desconectado.`, 'Anfitrión desconectado');
      } else {
        failGuestConnect(`No se pudo conectar a la sala ${cleanCode} (${err.type || 'error de red'}).`, 'No se pudo conectar');
      }
    });

  } catch (err) {
    console.error('[Collab] Error inicializando cliente:', err);
    failGuestConnect('Error inicializando WebRTC P2P', 'Error WebRTC');
  }
}

/**
 * Configurar eventos de una conexión de datos WebRTC
 */
function setupConnectionHandlers(conn) {
  conn.on('open', () => {
    activeConnections.set(conn.peer, conn);
    lastActivityAt.set(conn.peer, Date.now());
    const rawName = (typeof conn.metadata?.userName === 'string') ? conn.metadata.userName.trim().slice(0, 32) : 'Invitado';
    const cleanName = rawName || 'Invitado';
    const defaultColor = PEER_COLORS[activeConnections.size % PEER_COLORS.length];
    state.collab.peers[conn.peer] = {
      name: cleanName,
      color: sanitizeHexColor(conn.metadata?.userColor, defaultColor),
      sheetId: typeof conn.metadata?.sheetId === 'string' ? conn.metadata.sheetId : null,
      isHost: !isHostMode,
      cursor: null
    };

    if (!isHostMode) {
      // Establecer estado activo ANTES de actualizar UI para evitar orden inválido
      state.collab.active = true;
      state.collab.isHost = false;
      state.collab.status = 'connected';
      state.collab.roomId = currentRoomId;
      state.collab.peerId = activePeer?.id || state.collab.peerId;
      startHeartbeat();
      updateCollabStatus('connected', `Conectado a ${currentRoomId}`);
      updateCollabUI();
      showToast(`${cleanName} conectado en la sala`, 'info');
      return;
    }

    // Host: actualizar badge + modal y enviar INITIAL_SYNC + PEERS_LIST
    updateCollabStatus('connected', `Sala activa: ${currentRoomId}`);
    updateCollabUI();
    showToast(`${cleanName} se unió a la sesión`, 'info');

    const sheets = getSyncedSheetsArray();
    const largeUnderlays = [];
    const preparedSheets = sheets.map(s => {
      const underlaySrc = s.underlay?.src || '';
      if (underlaySrc.length > LARGE_UNDERLAY_THRESHOLD) {
        const hash = computeUnderlayHash(s.underlay);
        const { src: _omit, __imgId: _omitId, ...meta } = s.underlay;
        largeUnderlays.push({
          sheetId: s.id,
          hash,
          src: underlaySrc,
          meta: { ...meta, hash }
        });
        return { ...s, underlay: null };
      }
      return s;
    });

    const activeUnderlay = state.underlay && state.underlay.src && state.underlay.src.length > LARGE_UNDERLAY_THRESHOLD
      ? null
      : (state.underlay || null);

    const directory = buildPeersDirectory({
      selfPeerId: state.collab.peerId,
      selfName: localUserName,
      selfColor: localUserColor,
      selfSheetId: state.activeSheetId,
      isHost: true,
      peers: state.collab.peers
    });

    conn.send({
      type: 'INITIAL_SYNC',
      payload: {
        nodes: state.nodes,
        connections: state.connections,
        zones: state.zones || [],
        underlay: activeUnderlay,
        sheets: preparedSheets,
        activeSheetId: state.activeSheetId,
        projectName: state.currentProjectName,
        peers: directory
      }
    });

    for (const transfer of largeUnderlays) {
      sendUnderlayTransfer(conn, transfer);
    }

    broadcastPeersList();
  });

  conn.on('data', (data) => {
    lastActivityAt.set(conn.peer, Date.now());
    handleIncomingCollabData(conn.peer, data, conn);
  });

  conn.on('close', () => {
    if (!state.collab.active) return;

    const peerInfo = state.collab.peers[conn.peer];
    if (peerInfo) {
      showToast(`${peerInfo.name} abandonó la sesión`, 'subtle');
      removeRemoteCursor(conn.peer);
      delete state.collab.peers[conn.peer];
    }
    activeConnections.delete(conn.peer);
    lastActivityAt.delete(conn.peer);

    if (!isHostMode) {
      showToast('El anfitrión ha cerrado la sala. Tu copia local del diagrama continúa guardada en tu navegador.', 'info', 5000);
      leaveCollabSession(false);
      return;
    }

    broadcastPeersList();
    updateCollabStatus('connected', `Sala activa: ${currentRoomId}`);
    updateCollabUI();
  });

  conn.on('error', (err) => {
    console.warn('[Collab] Error en canal de datos con par:', conn.peer, err);
    if (!conn.open) {
      activeConnections.delete(conn.peer);
      lastActivityAt.delete(conn.peer);
      removeRemoteCursor(conn.peer);
      if (state.collab.peers && state.collab.peers[conn.peer]) {
        delete state.collab.peers[conn.peer];
      }
      if (state.collab.active && isHostMode) {
        broadcastPeersList();
      }
      updateCollabUI();
    }
  });
}

function pruneSelectionIds(deletedNodeIds = [], deletedZoneIds = [], deletedConnIds = []) {
  const delNodes = new Set(deletedNodeIds);
  const delZones = new Set(deletedZoneIds);
  const delConns = new Set(deletedConnIds);
  let selectionChanged = false;

  if (state.selectedNodeIds) {
    for (const id of delNodes) {
      if (state.selectedNodeIds.delete(id)) selectionChanged = true;
    }
  }
  if (state.selectedZoneIds) {
    for (const id of delZones) {
      if (state.selectedZoneIds.delete(id)) selectionChanged = true;
    }
  }

  if (state.selection) {
    if (state.selection.type === 'cable' && delConns.has(state.selection.id)) {
      state.selection = { type: null, id: null, ids: [] };
      selectionChanged = true;
    } else if (state.selection.type === 'node' || state.selection.type === 'zone' || state.selection.type === 'multi-node') {
      const nCount = state.selectedNodeIds ? state.selectedNodeIds.size : 0;
      const zCount = state.selectedZoneIds ? state.selectedZoneIds.size : 0;
      const total = nCount + zCount;
      if (total === 0) {
        if (state.selection.type !== null) {
          state.selection = { type: null, id: null, ids: [] };
          selectionChanged = true;
        }
      } else {
        const nextIds = [
          ...(state.selectedNodeIds ? Array.from(state.selectedNodeIds) : []),
          ...(state.selectedZoneIds ? Array.from(state.selectedZoneIds) : [])
        ];
        state.selection = {
          type: total > 1 ? 'multi-node' : (nCount === 1 ? 'node' : 'zone'),
          id: nextIds[0] || null,
          ids: nextIds
        };
      }
    }
  }

  if (selectionChanged) {
    updateSelectionVisuals();
    renderInspector();
  }
}

function applyReceivedUnderlayImage(sheetId, hash, rawSrc, meta) {
  const safeSrc = sanitizeUnderlaySrc(rawSrc, false);
  if (!safeSrc) return;
  if (hash && computeUnderlayHash({ src: safeSrc }) !== hash) return;

  const targetSheet = (state.sheets || []).find(s => s.id === sheetId);
  if (!targetSheet) return;

  const baseMeta = (targetSheet.underlay && typeof targetSheet.underlay === 'object')
    ? targetSheet.underlay
    : (meta && typeof meta === 'object' ? meta : { name: 'Plano de fondo', x: 0, y: 0, width: 800, height: 600, scale: 100, opacity: 40, visible: true, locked: true });

  const nextUnderlay = {
    name: typeof baseMeta.name === 'string' ? baseMeta.name.slice(0, 200) : 'Plano de fondo',
    x: Number.isFinite(Number(baseMeta.x)) ? Number(baseMeta.x) : 0,
    y: Number.isFinite(Number(baseMeta.y)) ? Number(baseMeta.y) : 0,
    width: Math.max(1, Number.isFinite(Number(baseMeta.width)) ? Number(baseMeta.width) : 800),
    height: Math.max(1, Number.isFinite(Number(baseMeta.height)) ? Number(baseMeta.height) : 600),
    scale: Number.isFinite(Number(baseMeta.scale)) ? Number(baseMeta.scale) : 100,
    opacity: Number.isFinite(Number(baseMeta.opacity)) ? Number(baseMeta.opacity) : 40,
    visible: baseMeta.visible === false ? false : true,
    locked: baseMeta.locked === false ? false : true,
    src: safeSrc
  };

  state.isApplyingRemoteSync = true;
  try {
    targetSheet.underlay = nextUnderlay;
    if (sheetId === state.activeSheetId) {
      state.underlay = { ...nextUnderlay };
      renderUnderlay();
    }
    lastSyncedSnapshot = createSyncSnapshot(getSyncedSheetsArray(), state.currentProjectName);
    saveStateImmediately(false, false);
  } finally {
    state.isApplyingRemoteSync = false;
  }
}

/**
 * Procesar mensaje entrante de un par
 */
function handleIncomingCollabData(senderPeerId, msg, conn = null) {
  if (!activeConnections.has(senderPeerId)) return;
  const cleanMsg = sanitizeIncomingPeerPayload(msg);
  if (!cleanMsg) {
    console.warn('[Collab] Mensaje P2P rechazado por validación:', senderPeerId, msg?.type);
    return;
  }
  msg = cleanMsg;

  switch (msg.type) {
    case 'PING': {
      const targetConn = conn || activeConnections.get(senderPeerId);
      if (targetConn && targetConn.open) {
        try {
          targetConn.send({ type: 'PONG', payload: { t: msg.payload?.t } });
        } catch (e) {
          console.warn('[Collab] Error enviando PONG a par:', senderPeerId, e);
        }
      }
      return;
    }

    case 'PONG': {
      return;
    }

    case 'PEERS_LIST': {
      if (isHostMode) return;
      applyPeersDirectory(msg.payload?.peers);
      return;
    }

    case 'PEER_META': {
      if (!isHostMode) return;
      const peerInfo = state.collab.peers[senderPeerId];
      if (!peerInfo || !msg.payload || typeof msg.payload !== 'object') return;
      if (typeof msg.payload.name === 'string' && msg.payload.name.trim()) {
        peerInfo.name = msg.payload.name.trim().slice(0, 32);
      }
      if (typeof msg.payload.color === 'string') {
        peerInfo.color = sanitizeHexColor(msg.payload.color, peerInfo.color);
      }
      if (typeof msg.payload.sheetId === 'string') {
        peerInfo.sheetId = msg.payload.sheetId;
      }
      refreshRemoteCursorsVisibility();
      updateCollabUI();
      broadcastPeersList();
      return;
    }

    case 'INITIAL_SYNC':
    case 'STATE_SYNC': {
      if (msg.type === 'INITIAL_SYNC' && (isHostMode || hasReceivedInitialSync)) return;

      if (!msg.payload || typeof msg.payload !== 'object' || Array.isArray(msg.payload)) return;
      const p = sanitizeProjectData(msg.payload, { allowCachedUnderlay: false });
      if (!p) return;

      if (msg.type === 'INITIAL_SYNC') {
        clearGuestConnectTimers();
      }

      if (remoteMoveDebounceTimer) {
        clearTimeout(remoteMoveDebounceTimer);
        remoteMoveDebounceTimer = null;
      }
      if (remoteMoveRafId) {
        cancelAnimationFrame(remoteMoveRafId);
        remoteMoveRafId = null;
      }
      state.isRemoteMoving = false;

      state.isApplyingRemoteSync = true;
      try {
        if (msg.type === 'INITIAL_SYNC') {
          hasReceivedInitialSync = true;
          const cleanRoom = (currentRoomId || 'ROOM').replace(/[^A-Z0-9]/g, '_');
          state.currentProjectId = 'proj_collab_' + cleanRoom;
          if (Array.isArray(msg.payload.peers)) {
            applyPeersDirectory(msg.payload.peers);
          }
        }

        if (p.projectName) {
          state.currentProjectName = p.projectName;
          if (dom.projectTitleInput && document.activeElement !== dom.projectTitleInput) {
            dom.projectTitleInput.value = state.currentProjectName;
          }
        }
        if (Array.isArray(p.sheets) && p.sheets.length > 0) {
          state.sheets = p.sheets;
        }
        if (msg.type === 'INITIAL_SYNC') {
          if (p.activeSheetId) {
            state.activeSheetId = p.activeSheetId;
          } else if (state.sheets.length > 0 && !state.sheets.some(s => s.id === state.activeSheetId)) {
            state.activeSheetId = state.sheets[0].id;
          }
        } else if (state.sheets.length > 0 && !state.sheets.some(s => s.id === state.activeSheetId)) {
          state.activeSheetId = state.sheets[0].id;
        }

        const activeSheet = getCurrentSheet();
        if (activeSheet && msg.type === 'STATE_SYNC') {
          state.nodes = activeSheet.nodes || [];
          state.connections = activeSheet.connections || [];
          state.zones = activeSheet.zones || [];
          state.underlay = activeSheet.underlay ? { ...activeSheet.underlay } : null;
        } else {
          state.nodes = p.nodes;
          state.connections = p.connections;
          state.zones = p.zones;
          state.underlay = p.underlay;
        }

        deselectAll();

        if (dom.nodesLayer) dom.nodesLayer.innerHTML = '';
        if (dom.cablesGroup) dom.cablesGroup.innerHTML = '';
        if (dom.labelsLayer) dom.labelsLayer.innerHTML = '';
        if (dom.zonesLayer) dom.zonesLayer.innerHTML = '';
        if (dom.underlayLayer) dom.underlayLayer.innerHTML = '';

        renderUnderlay();
        renderZones();
        if (state.nodes.length > 0 && dom.nodesLayer) {
          const nodesFragment = document.createDocumentFragment();
          state.nodes.forEach(node => {
            try {
              renderNodeElement(node, nodesFragment);
            } catch (e) {
              console.warn('[Collab] Error al renderizar nodo remoto:', node, e);
            }
          });
          dom.nodesLayer.appendChild(nodesFragment);
        }
        renderConnections();
        renderSheetsBar();
        updatePaperSheetDisplay();
        lastSyncedSnapshot = createSyncSnapshot(getSyncedSheetsArray(), state.currentProjectName);
        saveStateImmediately(false, false);
        if (typeof updateMinimap === 'function') updateMinimap();

        if (msg.type === 'INITIAL_SYNC') {
          state.history = [createHistorySnapshot()];
          state.historyIndex = 0;
          updateUndoRedoUI();
        }
      } finally {
        state.isApplyingRemoteSync = false;
      }

      if (msg.type === 'INITIAL_SYNC') {
        showToast('Topología sincronizada con el anfitrión', 'success');
      } else if (isHostMode) {
        relayToOtherPeers(senderPeerId, { type: 'STATE_SYNC', payload: p });
      }
      break;
    }

    case 'PROJECT_DELTA': {
      if (!msg.payload || typeof msg.payload !== 'object' || Array.isArray(msg.payload)) return;
      if (state.isExporting) return;

      const rawDelta = msg.payload;
      // Sanitizar entidades entrantes en el delta
      const cleanDelta = {
        projectNameChanged: Boolean(rawDelta.projectNameChanged),
        projectName: typeof rawDelta.projectName === 'string' ? rawDelta.projectName.trim().slice(0, 120) : '',
        sheetOrderChanged: Boolean(rawDelta.sheetOrderChanged),
        sheetOrder: Array.isArray(rawDelta.sheetOrder) ? rawDelta.sheetOrder.filter(id => typeof id === 'string') : [],
        removedSheetIds: Array.isArray(rawDelta.removedSheetIds) ? rawDelta.removedSheetIds.filter(id => typeof id === 'string') : [],
        addedSheets: Array.isArray(rawDelta.addedSheets) ? rawDelta.addedSheets.map(s => {
          const clean = sanitizeProjectData({ sheets: [s] }, { allowCachedUnderlay: false });
          return clean?.sheets?.[0] || null;
        }).filter(Boolean) : [],
        sheetDeltas: Array.isArray(rawDelta.sheetDeltas) ? rawDelta.sheetDeltas.map(sd => {
          if (!sd || typeof sd.sheetId !== 'string') return null;
          const out = { sheetId: sd.sheetId };
          if (sd.meta && typeof sd.meta === 'object') out.meta = sd.meta;
          if (Array.isArray(sd.upsertNodes)) out.upsertNodes = sd.upsertNodes.map(sanitizeNodePayload).filter(Boolean);
          if (Array.isArray(sd.deleteNodeIds)) out.deleteNodeIds = sd.deleteNodeIds.filter(id => typeof id === 'string');
          if (Array.isArray(sd.upsertConnections)) out.upsertConnections = sd.upsertConnections.map(sanitizeConnectionPayload).filter(Boolean);
          if (Array.isArray(sd.deleteConnectionIds)) out.deleteConnectionIds = sd.deleteConnectionIds.filter(id => typeof id === 'string');
          if (Array.isArray(sd.upsertZones)) out.upsertZones = sd.upsertZones.map(sanitizeZonePayload).filter(Boolean);
          if (Array.isArray(sd.deleteZoneIds)) out.deleteZoneIds = sd.deleteZoneIds.filter(id => typeof id === 'string');
          if (sd.underlayRemoved) out.underlayRemoved = true;
          if (sd.underlayMeta && typeof sd.underlayMeta === 'object') out.underlayMeta = sd.underlayMeta;
          return out;
        }).filter(Boolean) : []
      };

      const protectedDragIds = getProtectedDragIds();

      state.isApplyingRemoteSync = true;
      try {
        const currSheet = getCurrentSheet();
        if (currSheet) {
          currSheet.nodes = state.nodes;
          currSheet.connections = state.connections;
          currSheet.zones = state.zones || [];
          currSheet.underlay = state.underlay ? { ...state.underlay } : null;
        }

        const result = applySheetDelta(
          {
            sheets: state.sheets,
            projectName: state.currentProjectName,
            activeSheetId: state.activeSheetId,
            protectedDragIds
          },
          cleanDelta
        );

        state.sheets = result.sheets;
        if (result.projectNameChanged) {
          state.currentProjectName = result.projectName;
          if (dom.projectTitleInput && document.activeElement !== dom.projectTitleInput) {
            dom.projectTitleInput.value = state.currentProjectName;
          }
        }

        if (result.activeSheetDeleted) {
          state.activeSheetId = result.activeSheetId;
          const nextSheet = getCurrentSheet();
          if (nextSheet) loadSheetData(nextSheet, false);
          renderSheetsBar();
          updatePaperSheetDisplay();
          refreshRemoteCursorsVisibility();
        } else {
          const activeSheet = getCurrentSheet();
          if (activeSheet) {
            state.nodes = activeSheet.nodes || [];
            state.connections = activeSheet.connections || [];
            state.zones = activeSheet.zones || [];
            state.underlay = activeSheet.underlay ? { ...activeSheet.underlay } : null;
          }

          if (result.sheetsBarChanged) {
            renderSheetsBar();
            updatePaperSheetDisplay();
          }

          const fx = result.activeEffects;
          if (fx) {
            if (fx.metaChanged && !result.sheetsBarChanged) {
              renderSheetsBar();
              updatePaperSheetDisplay();
            }

            for (const delId of fx.deletedNodeIds) {
              const el = document.getElementById(delId);
              if (el) el.remove();
            }
            for (const node of fx.upsertedNodes) {
              if (protectedDragIds && protectedDragIds.has(node.id)) continue;
              try {
                renderNodeElement(node);
              } catch (e) {
                console.warn('[Collab] Error renderizando nodo remoto:', node?.id, e);
              }
            }

            for (const delZoneId of fx.deletedZoneIds) {
              const el = document.getElementById(delZoneId);
              if (el) el.remove();
            }
            for (const zone of fx.upsertedZones) {
              if (protectedDragIds && protectedDragIds.has(zone.id)) continue;
              renderZoneElement(zone);
            }

            if (fx.underlayChanged) {
              renderUnderlay();
            }

            if (
              fx.deletedNodeIds.length > 0 ||
              fx.upsertedNodes.length > 0 ||
              fx.deletedConnectionIds.length > 0 ||
              fx.upsertedConnections.length > 0
            ) {
              renderConnections();
            }

            pruneSelectionIds(fx.deletedNodeIds, fx.deletedZoneIds, fx.deletedConnectionIds);

            // Actualizar inspector si el elemento seleccionado fue modificado (el guardia de foco evita perder el cursor al escribir)
            if (state.selection?.id) {
              const selId = state.selection.id;
              const touched =
                fx.upsertedNodes.some(n => n.id === selId) ||
                fx.upsertedConnections.some(c => c.id === selId) ||
                fx.upsertedZones.some(z => z.id === selId);
              if (touched) renderInspector();
            }

            if (typeof updateMinimap === 'function') updateMinimap();
          }
        }

        const prevActiveSnap = lastSyncedSnapshot?.sheetsById?.[state.activeSheetId];
        lastSyncedSnapshot = createSyncSnapshot(getSyncedSheetsArray(), state.currentProjectName);
        if (protectedDragIds && prevActiveSnap && lastSyncedSnapshot.sheetsById?.[state.activeSheetId]) {
          for (const dragId of protectedDragIds) {
            if (prevActiveSnap.zonesById?.[dragId] && lastSyncedSnapshot.sheetsById[state.activeSheetId].zonesById?.[dragId]) {
              lastSyncedSnapshot.sheetsById[state.activeSheetId].zonesById[dragId] = prevActiveSnap.zonesById[dragId];
            }
          }
        }
        saveStateImmediately(false, false);
      } finally {
        state.isApplyingRemoteSync = false;
      }

      if (isHostMode) {
        relayToOtherPeers(senderPeerId, { type: 'PROJECT_DELTA', payload: cleanDelta });
      }
      break;
    }

    case 'UNDERLAY_IMAGE': {
      if (!msg.payload || typeof msg.payload.sheetId !== 'string' || typeof msg.payload.src !== 'string') return;
      const { sheetId, hash, src, meta } = msg.payload;
      applyReceivedUnderlayImage(sheetId, hash, src, meta);
      if (isHostMode) {
        relayToOtherPeers(senderPeerId, msg);
      }
      break;
    }

    case 'UNDERLAY_IMAGE_CHUNK': {
      const p = msg.payload;
      if (!p || typeof p.sheetId !== 'string' || typeof p.hash !== 'string' || typeof p.data !== 'string') return;
      const idx = Number(p.index);
      const total = Number(p.totalChunks);
      if (!Number.isInteger(idx) || !Number.isInteger(total) || idx < 0 || idx >= total || total <= 0 || total > 512) return;

      const key = `${p.sheetId}:${p.hash}`;
      let entry = incomingUnderlayChunks.get(key);
      if (!entry || entry.total !== total) {
        entry = { total, chunks: new Array(total), meta: p.meta || null, received: 0 };
        incomingUnderlayChunks.set(key, entry);
      }
      if (p.meta && !entry.meta) entry.meta = p.meta;
      if (entry.chunks[idx] === undefined) {
        entry.chunks[idx] = p.data;
        entry.received++;
      }

      if (entry.received === entry.total) {
        incomingUnderlayChunks.delete(key);
        const fullSrc = assembleChunks(entry.chunks, entry.total);
        if (fullSrc) {
          applyReceivedUnderlayImage(p.sheetId, p.hash, fullSrc, entry.meta);
        }
      }

      if (isHostMode) {
        relayToOtherPeers(senderPeerId, msg);
      }
      break;
    }

    case 'NODE_MOVE': {
      if (!msg.payload || typeof msg.payload.id !== 'string') return;
      const { id, x, y } = msg.payload;
      if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) return;

      const targetSheetId = typeof msg.payload.sheetId === 'string' ? msg.payload.sheetId : state.activeSheetId;
      const protectedDragIds = getProtectedDragIds();
      if (targetSheetId === state.activeSheetId && protectedDragIds && protectedDragIds.has(id)) {
        if (isHostMode) relayToOtherPeers(senderPeerId, msg);
        return;
      }

      const targetSheet = (state.sheets || []).find(s => s.id === targetSheetId);
      const nodeList = targetSheetId === state.activeSheetId ? state.nodes : targetSheet?.nodes;
      const targetNode = Array.isArray(nodeList) ? nodeList.find(n => n.id === id) : null;

      if (targetNode) {
        targetNode.x = x;
        targetNode.y = y;
        patchSnapshotEntity(lastSyncedSnapshot, targetSheetId, 'node', 'move', { id, x, y });

        if (targetSheetId === state.activeSheetId) {
          const el = document.getElementById(id);
          if (el) {
            el.style.left = `${x}px`;
            el.style.top = `${y}px`;
          }
          state.isRemoteMoving = true;
          if (!remoteMoveRafId) {
            remoteMoveRafId = requestAnimationFrame(() => {
              remoteMoveRafId = null;
              renderConnections();
              if (typeof updateMinimap === 'function') updateMinimap();
            });
          }
          clearTimeout(remoteMoveDebounceTimer);
          remoteMoveDebounceTimer = setTimeout(() => {
            state.isRemoteMoving = false;
            if (remoteMoveRafId) {
              cancelAnimationFrame(remoteMoveRafId);
              remoteMoveRafId = null;
            }
            renderConnections();
            if (typeof updateMinimap === 'function') updateMinimap();
            saveState(false, false, false);
          }, 120);
        } else {
          saveState(false, false, false);
        }
      }
      if (isHostMode) relayToOtherPeers(senderPeerId, msg);
      break;
    }

    case 'NODE_CREATE': {
      const node = sanitizeNodePayload(msg.payload?.node);
      if (!node) return;
      const targetSheetId = typeof msg.payload?.sheetId === 'string' ? msg.payload.sheetId : state.activeSheetId;
      const targetSheet = (state.sheets || []).find(s => s.id === targetSheetId);
      const nodeList = targetSheetId === state.activeSheetId ? state.nodes : targetSheet?.nodes;

      if (Array.isArray(nodeList) && !nodeList.some(n => n.id === node.id)) {
        nodeList.push(node);
        patchSnapshotEntity(lastSyncedSnapshot, targetSheetId, 'node', 'upsert', node);

        if (targetSheetId === state.activeSheetId) {
          try {
            renderNodeElement(node);
          } catch (e) {
            console.warn('[Collab] Error creando nodo remoto:', e);
          }
          renderConnections();
          if (typeof updateMinimap === 'function') updateMinimap();
        }
        saveState(false, false, false);
      }
      if (isHostMode) relayToOtherPeers(senderPeerId, { type: 'NODE_CREATE', payload: { node, sheetId: targetSheetId } });
      break;
    }

    case 'NODE_DELETE': {
      if (!msg.payload || typeof msg.payload.id !== 'string') return;
      const { id } = msg.payload;
      const targetSheetId = typeof msg.payload.sheetId === 'string' ? msg.payload.sheetId : state.activeSheetId;
      const targetSheet = (state.sheets || []).find(s => s.id === targetSheetId);
      const isTargetActive = targetSheetId === state.activeSheetId;
      const nodeList = isTargetActive ? state.nodes : targetSheet?.nodes;
      const idx = Array.isArray(nodeList) ? nodeList.findIndex(n => n.id === id) : -1;

      if (idx !== -1) {
        nodeList.splice(idx, 1);
        if (isTargetActive) {
          state.connections = state.connections.filter(c => c.fromNodeId !== id && c.toNodeId !== id);
          const el = document.getElementById(id);
          if (el) el.remove();
          pruneSelectionIds([id], [], []);
          renderConnections();
          if (typeof updateMinimap === 'function') updateMinimap();
        } else if (targetSheet) {
          targetSheet.connections = (targetSheet.connections || []).filter(c => c.fromNodeId !== id && c.toNodeId !== id);
        }
        patchSnapshotEntity(lastSyncedSnapshot, targetSheetId, 'node', 'delete', id);
        saveState(false, false, false);
      }
      if (isHostMode) relayToOtherPeers(senderPeerId, msg);
      break;
    }

    case 'CONNECTION_CREATE': {
      const connection = sanitizeConnectionPayload(msg.payload?.connection);
      if (!connection) return;
      const targetSheetId = typeof msg.payload?.sheetId === 'string' ? msg.payload.sheetId : state.activeSheetId;
      const targetSheet = (state.sheets || []).find(s => s.id === targetSheetId);
      const connList = targetSheetId === state.activeSheetId ? state.connections : targetSheet?.connections;

      if (Array.isArray(connList) && !connList.some(c => c.id === connection.id)) {
        connList.push(connection);
        patchSnapshotEntity(lastSyncedSnapshot, targetSheetId, 'connection', 'upsert', connection);
        if (targetSheetId === state.activeSheetId) {
          renderConnections();
          if (typeof updateMinimap === 'function') updateMinimap();
        }
        saveState(false, false, false);
      }
      if (isHostMode) relayToOtherPeers(senderPeerId, { type: 'CONNECTION_CREATE', payload: { connection, sheetId: targetSheetId } });
      break;
    }

    case 'CONNECTION_DELETE': {
      if (!msg.payload || typeof msg.payload.id !== 'string') return;
      const { id } = msg.payload;
      const targetSheetId = typeof msg.payload.sheetId === 'string' ? msg.payload.sheetId : state.activeSheetId;
      const targetSheet = (state.sheets || []).find(s => s.id === targetSheetId);
      const isTargetActive = targetSheetId === state.activeSheetId;
      const connList = isTargetActive ? state.connections : targetSheet?.connections;
      const cIdx = Array.isArray(connList) ? connList.findIndex(c => c.id === id) : -1;

      if (cIdx !== -1) {
        connList.splice(cIdx, 1);
        patchSnapshotEntity(lastSyncedSnapshot, targetSheetId, 'connection', 'delete', id);
        if (isTargetActive) {
          pruneSelectionIds([], [], [id]);
          renderConnections();
          if (typeof updateMinimap === 'function') updateMinimap();
        }
        saveState(false, false, false);
      }
      if (isHostMode) relayToOtherPeers(senderPeerId, msg);
      break;
    }

    case 'CURSOR_MOVE': {
      if (!msg.payload || typeof msg.payload.x !== 'number' || typeof msg.payload.y !== 'number' || !Number.isFinite(msg.payload.x) || !Number.isFinite(msg.payload.y)) return;

      // En estrella, el Host inyecta senderPeerId para evitar suplantación y fusión de cursores
      const effectivePeerId = isHostMode
        ? senderPeerId
        : (typeof msg.payload.peerId === 'string' && msg.payload.peerId ? msg.payload.peerId : senderPeerId);

      if (effectivePeerId === state.collab.peerId) return;

      const sheetId = typeof msg.payload.sheetId === 'string' ? msg.payload.sheetId : null;
      if (state.collab.peers[effectivePeerId]) {
        if (sheetId) state.collab.peers[effectivePeerId].sheetId = sheetId;
        if (typeof msg.payload.name === 'string' && msg.payload.name.trim()) {
          state.collab.peers[effectivePeerId].name = msg.payload.name.trim().slice(0, 32);
        }
        if (typeof msg.payload.color === 'string') {
          state.collab.peers[effectivePeerId].color = sanitizeHexColor(msg.payload.color, state.collab.peers[effectivePeerId].color);
        }
      }

      updateRemoteCursor(effectivePeerId, msg.payload.x, msg.payload.y, sheetId);

      if (isHostMode) {
        const peerInfo = state.collab.peers[senderPeerId];
        relayToOtherPeers(senderPeerId, {
          type: 'CURSOR_MOVE',
          payload: {
            peerId: senderPeerId,
            x: msg.payload.x,
            y: msg.payload.y,
            sheetId: sheetId || peerInfo?.sheetId || null,
            name: peerInfo?.name || msg.payload.name,
            color: peerInfo?.color || msg.payload.color
          }
        });
      }
      break;
    }

    case 'ROOM_CLOSED': {
      if (isHostMode) return;
      showToast('⚠️ El anfitrión ha cerrado la sala. Tu diagrama permanece guardado en tu navegador.', 'warning', 6000);
      leaveCollabSession(false);
      closeCollabModal();
      break;
    }

    default:
      console.log('[Collab] Mensaje desconocido recibido:', msg.type);
  }
}

/**
 * Retransmitir mensaje a todos los demás participantes excepto el emisor
 */
function relayToOtherPeers(originPeerId, msg) {
  for (const [peerId, conn] of activeConnections.entries()) {
    if (peerId !== originPeerId && conn.open) {
      try {
        conn.send(msg);
      } catch (e) {
        console.warn('[Collab] Error retransmitiendo a par:', peerId, e);
      }
    }
  }
}

/**
 * Transmitir una acción atómica a los pares conectados
 */
export function broadcastCollabAction(type, payload) {
  if (!state.collab.active || activeConnections.size === 0) return;

  let enrichedPayload = payload;
  if (
    payload &&
    typeof payload === 'object' &&
    ['NODE_MOVE', 'NODE_CREATE', 'NODE_DELETE', 'CONNECTION_CREATE', 'CONNECTION_DELETE'].includes(type)
  ) {
    const sheetId = payload.sheetId || state.activeSheetId;
    enrichedPayload = payload.sheetId ? payload : { ...payload, sheetId };
    if (type === 'NODE_MOVE') patchSnapshotEntity(lastSyncedSnapshot, sheetId, 'node', 'move', payload);
    else if (type === 'NODE_CREATE') patchSnapshotEntity(lastSyncedSnapshot, sheetId, 'node', 'upsert', payload.node);
    else if (type === 'NODE_DELETE') patchSnapshotEntity(lastSyncedSnapshot, sheetId, 'node', 'delete', payload.id);
    else if (type === 'CONNECTION_CREATE') patchSnapshotEntity(lastSyncedSnapshot, sheetId, 'connection', 'upsert', payload.connection);
    else if (type === 'CONNECTION_DELETE') patchSnapshotEntity(lastSyncedSnapshot, sheetId, 'connection', 'delete', payload.id);
  }

  const msg = { type, payload: enrichedPayload };
  for (const conn of activeConnections.values()) {
    if (conn.open) {
      try {
        conn.send(msg);
      } catch (err) {
        console.warn('[Collab] Fallo al enviar a par:', conn.peer, err);
      }
    }
  }
}

/**
 * Emitir únicamente las diferencias entre el último snapshot sincronizado y el estado actual
 */
export function broadcastCollabDiff() {
  if (!state.collab.active || activeConnections.size === 0 || state.isApplyingRemoteSync || state.isRemoteMoving || state.isDraggingNode || state.isResizingZone || state.isExporting) {
    return;
  }

  const sheets = getSyncedSheetsArray();
  const delta = diffProjectSheets(lastSyncedSnapshot, sheets, state.currentProjectName);
  if (!delta) return;

  const { underlaysToSend, ...deltaPayload } = delta;
  const hasStructuralDelta =
    deltaPayload.projectNameChanged ||
    deltaPayload.sheetOrderChanged ||
    deltaPayload.addedSheets.length > 0 ||
    deltaPayload.removedSheetIds.length > 0 ||
    deltaPayload.sheetDeltas.length > 0;

  if (hasStructuralDelta) {
    broadcastCollabAction('PROJECT_DELTA', deltaPayload);
  }

  if (Array.isArray(underlaysToSend)) {
    for (const transfer of underlaysToSend) {
      sendUnderlayTransfer(null, transfer);
    }
  }

  lastSyncedSnapshot = createSyncSnapshot(sheets, state.currentProjectName);
}

// Alias de compatibilidad hacia atrás
export const broadcastFullCollabSync = broadcastCollabDiff;

/**
 * Enviar posición del cursor con aceleración y límite de tasa (throttling suave a 30 FPS garantizando posición final)
 */
export function sendLocalCursor(x, y) {
  if (!state.collab.active || activeConnections.size === 0) return;
  pendingCursor = { x, y, sheetId: state.activeSheetId };

  const now = performance.now();
  const elapsed = now - lastCursorSentTime;
  const THROTTLE_MS = 33; // ~30 fps suave

  if (elapsed >= THROTTLE_MS) {
    if (cursorThrottleTimeout) {
      clearTimeout(cursorThrottleTimeout);
      cursorThrottleTimeout = null;
    }
    lastCursorSentTime = now;
    broadcastCollabAction('CURSOR_MOVE', {
      x,
      y,
      sheetId: state.activeSheetId,
      name: localUserName,
      color: localUserColor
    });
    pendingCursor = null;
  } else if (!cursorThrottleTimeout) {
    cursorThrottleTimeout = setTimeout(() => {
      cursorThrottleTimeout = null;
      if (pendingCursor) {
        lastCursorSentTime = performance.now();
        broadcastCollabAction('CURSOR_MOVE', {
          x: pendingCursor.x,
          y: pendingCursor.y,
          sheetId: pendingCursor.sheetId || state.activeSheetId,
          name: localUserName,
          color: localUserColor
        });
        pendingCursor = null;
      }
    }, THROTTLE_MS - elapsed);
  }
}

/**
 * Dibujar o actualizar un cursor remoto en el canvas (solo visible en la hoja activa)
 */
function updateRemoteCursor(peerId, x, y, sheetId = null) {
  const layer = ensureRemoteCursorsLayer();
  if (!layer) return;

  let cursorEl = document.getElementById(`remote-cursor-${peerId}`);
  const peerInfo = state.collab.peers[peerId] || { name: 'Invitado', color: '#38bdf8' };
  const safeColor = sanitizeHexColor(peerInfo.color, '#38bdf8');

  if (!cursorEl) {
    cursorEl = document.createElement('div');
    cursorEl.id = `remote-cursor-${peerId}`;
    cursorEl.className = 'remote-canvas-cursor';
    cursorEl.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="${safeColor}" stroke="#000000" stroke-width="1.5">
        <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.85a.5.5 0 0 0-.85.36z"/>
      </svg>
      <span class="remote-cursor-label" style="background-color: ${safeColor}; color: #000; font-weight: 700; font-size: 0.68rem; padding: 2px 6px; border-radius: 4px; margin-left: 12px; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,0.4);">
        ${escapeHtml(peerInfo.name)}
      </span>
    `;
    cursorEl.style.cssText = 'position: absolute; pointer-events: none; transition: transform 0.08s linear; z-index: 50; will-change: transform;';
    layer.appendChild(cursorEl);
  } else {
    const label = cursorEl.querySelector('.remote-cursor-label');
    if (label && label.textContent !== peerInfo.name) {
      label.textContent = peerInfo.name;
      label.style.backgroundColor = safeColor;
    }
    const svg = cursorEl.querySelector('svg');
    if (svg) svg.setAttribute('fill', safeColor);
  }

  const isSameSheet = !sheetId || !state.activeSheetId || sheetId === state.activeSheetId;
  cursorEl.style.display = isSameSheet ? '' : 'none';
  cursorEl.style.transform = `translate3d(${x}px, ${y}px, 0)`;
}

function removeRemoteCursor(peerId) {
  const el = document.getElementById(`remote-cursor-${peerId}`);
  if (el) el.remove();
}

/**
 * Salir o cerrar sesión colaborativa
 */
export function leaveCollabSession(notify = true) {
  peerInitToken++;
  const wasHost = isHostMode;
  const wasActive = state.collab.active;

  clearTimeout(hostReconnectTimer);
  hostReconnectTimer = null;
  hostReconnectAttempts = 0;

  clearTimeout(hostClosingTimer);
  hostClosingTimer = null;

  clearGuestConnectTimers();
  stopHeartbeat();
  incomingUnderlayChunks.clear();
  lastSyncedSnapshot = null;

  // Marcar inactivo antes de cerrar conexiones para que conn.on('close') no dispare doble notificación
  state.collab.active = false;
  state.collab.isHost = false;
  state.collab.roomId = null;
  state.collab.peerId = null;
  state.collab.peers = {};
  state.collab.status = 'disconnected';
  isHostMode = false;
  hasReceivedInitialSync = false;
  currentRoomId = null;

  for (const conn of activeConnections.values()) {
    try {
      conn.close();
    } catch (e) {
      console.warn('[Collab] Error cerrando canal al salir:', e);
    }
  }
  activeConnections.clear();

  if (activePeer) {
    try {
      activePeer.destroy();
    } catch (e) {
      console.warn('[Collab] Error destruyendo peer al salir:', e);
    }
    activePeer = null;
  }

  if (remoteCursorsLayer) {
    remoteCursorsLayer.innerHTML = '';
  }

  if (cursorThrottleTimeout) {
    clearTimeout(cursorThrottleTimeout);
    cursorThrottleTimeout = null;
  }
  if (remoteMoveDebounceTimer) {
    clearTimeout(remoteMoveDebounceTimer);
    remoteMoveDebounceTimer = null;
  }
  if (remoteMoveRafId) {
    cancelAnimationFrame(remoteMoveRafId);
    remoteMoveRafId = null;
  }
  state.isRemoteMoving = false;
  pendingCursor = null;
  lastCursorSentTime = 0;

  updateCollabStatus('disconnected', 'Desconectado');
  updateCollabUI();

  if (notify && wasActive) {
    const msg = wasHost
      ? '🔒 Sala colaborativa cerrada. Tu diagrama permanece guardado en tu navegador.'
      : '🚪 Has salido de la sala colaborativa. Tu copia del diagrama sigue guardada.';
    showToast(msg, 'info', 5000);
  }
}

/**
 * Actualizar indicador visual de estado en el topbar
 */
function updateCollabStatus(status, text) {
  const indicator = document.getElementById('badge-collab-indicator');
  const triggerBtn = document.getElementById('btn-collab-trigger');

  if (triggerBtn) {
    triggerBtn.classList.toggle('active-collab', status === 'connected');
  }

  if (indicator) {
    if (status === 'connected') {
      const count = Math.max(activeConnections.size + 1, Object.keys(state.collab.peers || {}).length + 1);
      indicator.textContent = `${count}`;
      indicator.style.display = 'inline-flex';
      indicator.style.background = 'var(--accent-emerald, #10b981)';
      indicator.title = `En vivo: ${count} participante(s)`;
    } else if (status === 'connecting') {
      indicator.textContent = '...';
      indicator.style.display = 'inline-flex';
      indicator.style.background = 'var(--accent-amber, #f59e0b)';
    } else {
      indicator.style.display = 'none';
    }
  }
}

/**
 * Actualizar contenido del modal de Colaboración
 */
export function updateCollabUI() {
  const roomCodeDisplay = document.getElementById('collab-room-code-display');
  const sessionActiveCard = document.getElementById('collab-session-active');
  const sessionInactiveCard = document.getElementById('collab-session-inactive');
  const peersListContainer = document.getElementById('collab-peers-list');

  if (!sessionActiveCard || !sessionInactiveCard) return;

  if (state.collab.active) {
    sessionActiveCard.style.display = 'block';
    sessionInactiveCard.style.display = 'none';

    if (roomCodeDisplay) {
      roomCodeDisplay.textContent = state.collab.roomId || '---';
    }

    if (peersListContainer) {
      const peersArray = Object.entries(state.collab.peers || {});
      let html = `
        <div style="display: flex; align-items: center; gap: 8px; padding: 6px 10px; background: rgba(255,255,255,0.04); border-radius: 6px; margin-bottom: 6px;">
          <span style="width: 10px; height: 10px; border-radius: 3px; background: ${sanitizeHexColor(localUserColor, '#38bdf8')};"></span>
          <span style="font-weight: 600; font-size: 0.82rem;">${escapeHtml(localUserName)} (Tú) ${isHostMode ? '★ Anfitrión' : ''}</span>
        </div>
      `;

      peersArray.forEach(([_pId, info]) => {
        const safePeerColor = sanitizeHexColor(info.color, '#38bdf8');
        const hostTag = info.isHost ? ' ★ Anfitrión' : '';
        html += `
          <div style="display: flex; align-items: center; gap: 8px; padding: 6px 10px; background: rgba(255,255,255,0.02); border-radius: 6px; margin-bottom: 4px;">
            <span style="width: 10px; height: 10px; border-radius: 3px; background: ${safePeerColor};"></span>
            <span style="font-size: 0.82rem;">${escapeHtml(info.name)}${hostTag}</span>
          </div>
        `;
      });
      peersListContainer.innerHTML = html;
    }

    const leaveBtn = document.getElementById('btn-collab-leave');
    if (leaveBtn) {
      leaveBtn.textContent = isHostMode ? 'Cerrar Sala' : 'Salir de la Sala';
      leaveBtn.title = isHostMode ? 'Finaliza la sala para todos los participantes' : 'Desconectarte de la sala colaborativa';
    }

  } else {
    sessionActiveCard.style.display = 'none';
    sessionInactiveCard.style.display = 'block';
  }
}

/**
 * Procesar enlace ?room= capturado al iniciar tras autenticación e IndexedDB
 */
export function processPendingRoomJoin() {
  const code = state.collab?.pendingRoomCode;
  if (!code) return;
  state.collab.pendingRoomCode = null;

  try {
    const cleanUrl = new URL(window.location.href);
    if (cleanUrl.searchParams.has('room')) {
      cleanUrl.searchParams.delete('room');
      window.history.replaceState({}, '', cleanUrl.toString());
    }
  } catch (e) {}

  showToast(`Conectando automáticamente a sala ${code}...`, 'info', 3500);
  joinCollabSession(code);
}

/**
 * Abrir Modal de Colaboración
 */
export function openCollabModal() {
  const modal = document.getElementById('modal-collab');
  if (modal) {
    updateCollabUI();
    const nameInput = document.getElementById('input-collab-username');
    if (nameInput) nameInput.value = localUserName;
    modal.classList.add('open');
  }
}

export function closeCollabModal() {
  const modal = document.getElementById('modal-collab');
  if (modal) {
    const wasOpen = modal.classList.contains('open');
    modal.classList.remove('open');
    if (wasOpen && state.collab && state.collab.active) {
      showToast('🟢 La sala colaborativa sigue activa en segundo plano', 'info', 2500);
    }
  }
}

/**
 * Inicializar eventos del UI de Colaboración
 */
export function initCollabUI() {
  const triggerBtn = document.getElementById('btn-collab-trigger');
  const closeBtn = document.getElementById('btn-close-collab-modal');
  const closeBottomBtn = document.getElementById('btn-close-collab-bottom');
  const createBtn = document.getElementById('btn-collab-create-room');
  const joinBtn = document.getElementById('btn-collab-join-room');
  const leaveBtn = document.getElementById('btn-collab-leave');
  const copyCodeBtn = document.getElementById('btn-collab-copy-code');
  const copyLinkBtn = document.getElementById('btn-collab-copy-link');
  const roomInput = document.getElementById('input-collab-room-code');
  const nameInput = document.getElementById('input-collab-username');

  const collabModal = document.getElementById('modal-collab');
  if (triggerBtn) triggerBtn.addEventListener('click', openCollabModal);
  if (closeBtn) closeBtn.addEventListener('click', closeCollabModal);
  if (closeBottomBtn) closeBottomBtn.addEventListener('click', closeCollabModal);
  if (collabModal) {
    collabModal.addEventListener('click', (e) => {
      if (e.target === collabModal) closeCollabModal();
    });
  }

  if (nameInput) {
    nameInput.addEventListener('change', (e) => {
      const val = e.target.value.trim().slice(0, 32);
      if (val) {
        localUserName = val;
        localStorage.setItem('nettopology_collab_name', val);
        updateCollabUI();
        if (state.collab.active) {
          if (isHostMode) {
            broadcastPeersList();
          } else {
            broadcastCollabAction('PEER_META', {
              name: localUserName,
              color: localUserColor,
              sheetId: state.activeSheetId
            });
          }
        }
      }
    });
  }

  if (createBtn) {
    createBtn.addEventListener('click', () => {
      startHostSession();
    });
  }

  if (joinBtn && roomInput) {
    joinBtn.addEventListener('click', () => {
      joinCollabSession(roomInput.value);
    });
    roomInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        joinCollabSession(roomInput.value);
      }
    });
  }

  if (leaveBtn) {
    leaveBtn.addEventListener('click', () => {
      if (hostClosingTimer) return;
      const isHost = isHostMode;
      const confirmMsg = isHost
        ? '¿Cerrar la sala colaborativa para todos los participantes?'
        : '¿Deseas salir de la sala colaborativa?';

      if (confirm(confirmMsg)) {
        if (isHost && activeConnections.size > 0) {
          try {
            broadcastCollabAction('ROOM_CLOSED', { message: 'El anfitrión ha cerrado la sala.' });
          } catch (e) {
            console.warn('[Collab] Error notificando cierre de sala:', e);
          }
          hostClosingTimer = setTimeout(() => {
            hostClosingTimer = null;
            leaveCollabSession(true);
            closeCollabModal();
          }, 120);
        } else {
          leaveCollabSession(true);
          closeCollabModal();
        }
      }
    });
  }

  if (copyCodeBtn) {
    copyCodeBtn.addEventListener('click', () => {
      if (state.collab.roomId) {
        navigator.clipboard.writeText(state.collab.roomId).then(() => {
          showToast(`Código ${state.collab.roomId} copiado al portapapeles`, 'success');
        });
      }
    });
  }

  if (copyLinkBtn) {
    copyLinkBtn.addEventListener('click', () => {
      if (state.collab.roomId) {
        const url = new URL(window.location.href);
        url.searchParams.set('room', state.collab.roomId);
        navigator.clipboard.writeText(url.toString()).then(() => {
          const isLocal =
            ['localhost', '127.0.0.1'].includes(window.location.hostname) ||
            window.location.protocol === 'file:';
          if (isLocal) {
            showToast('Enlace copiado (entorno local: para otros equipos usa la URL pública HTTPS)', 'warning', 4500);
          } else {
            showToast('Enlace de invitación copiado al portapapeles', 'success');
          }
        });
      }
    });
  }

  if (!collabBeforeUnloadBound) {
    collabBeforeUnloadBound = true;
    window.addEventListener('beforeunload', () => {
      if (state.collab && state.collab.active && isHostMode && activeConnections.size > 0) {
        try {
          broadcastCollabAction('ROOM_CLOSED', { message: 'El anfitrión ha cerrado el navegador.' });
        } catch (e) {}
      }
    });
  }
}

export function notifyCollabSheetChange() {
  refreshRemoteCursorsVisibility();
  if (!state.collab.active) return;
  if (isHostMode) {
    broadcastPeersList();
  } else {
    broadcastCollabAction('PEER_META', {
      name: localUserName,
      color: localUserColor,
      sheetId: state.activeSheetId
    });
  }
}

// Registrar en el bus global app
app.startHostSession = startHostSession;
app.joinCollabSession = joinCollabSession;
app.leaveCollabSession = leaveCollabSession;
app.broadcastCollabAction = broadcastCollabAction;
app.broadcastCollabDiff = broadcastCollabDiff;
app.broadcastFullCollabSync = broadcastCollabDiff;
app.sendLocalCursor = sendLocalCursor;
app.openCollabModal = openCollabModal;
app.closeCollabModal = closeCollabModal;
app.initCollabUI = initCollabUI;
app.processPendingRoomJoin = processPendingRoomJoin;
app.notifyCollabSheetChange = notifyCollabSheetChange;
