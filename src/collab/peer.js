/**
 * NetTopology - Módulo de Colaboración P2P en Tiempo Real (WebRTC con PeerJS)
 * Permite trabajo colaborativo multiusuario sin necesidad de servidor centralizado.
 */

import { Peer } from 'peerjs';
import { state, dom } from '../state/store.js';
import { app } from '../core/appContext.js';
import { showToast } from '../storage/db.js';
import { renderConnections } from '../core/cables.js';
import { renderNodeElement } from '../core/nodes.js';
import { renderZones } from '../core/zones.js';
import { renderUnderlay } from '../core/underlay.js';
import { renderSheetsBar, updatePaperSheetDisplay } from '../core/sheets.js';
import { escapeHtml } from '../utils/helpers.js';

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

let activePeer = null;
let activeConnections = new Map(); // peerId -> DataConnection
let localUserName = localStorage.getItem('nettopology_collab_name') || 'Usuario_' + Math.floor(100 + Math.random() * 900);
let localUserColor = PEER_COLORS[Math.floor(Math.random() * PEER_COLORS.length)];
let isHostMode = false;
let currentRoomId = null;
let cursorThrottleTimeout = null;
let lastCursorSentTime = 0;
let pendingCursor = null;

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

/**
 * Normalizar códigos de sala ingresados por el usuario
 */
export function normalizeRoomCode(input) {
  let cleaned = (input || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (cleaned.startsWith('NET')) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.length === 6) {
    return `NET-${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  }
  return `NET-${cleaned}`;
}

/**
 * Iniciar sesión como Anfitrión (Host)
 */
export function startHostSession(roomId = null) {
  if (activePeer) leaveCollabSession();

  const code = roomId ? normalizeRoomCode(roomId) : generateSecureRoomCode();
  const peerId = 'nettop_v2_' + code.replace(/[^A-Z0-9]/g, '_');
  currentRoomId = code;
  isHostMode = true;

  updateCollabStatus('connecting', `Conectando sala ${code}...`);

  try {
    activePeer = new Peer(peerId, {
      debug: 1
    });

    activePeer.on('open', (id) => {
      state.collab.active = true;
      state.collab.isHost = true;
      state.collab.roomId = code;
      state.collab.peerId = id;
      state.collab.status = 'connected';
      updateCollabStatus('connected', `Sala activa: ${code}`);
      showToast(`Sala colaborativa creada: ${code}`, 'success');
      updateCollabUI();
    });

    activePeer.on('connection', (conn) => {
      setupConnectionHandlers(conn);
    });

    activePeer.on('error', (err) => {
      console.error('[Collab] Error en PeerJS Host:', err);
      if (err.type === 'unavailable-id') {
        showToast('El código de sala ya está en uso. Generando uno nuevo...', 'warning');
        startHostSession();
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
  }
}

/**
 * Unirse como Invitado a una sala existente
 */
export function joinCollabSession(code) {
  if (!code || !code.trim()) {
    showToast('Por favor introduce un código de sala válido', 'warning');
    return;
  }
  if (activePeer) leaveCollabSession();

  const cleanCode = normalizeRoomCode(code);
  const hostPeerId = 'nettop_v2_' + cleanCode.replace(/[^A-Z0-9]/g, '_');
  currentRoomId = cleanCode;
  isHostMode = false;

  updateCollabStatus('connecting', `Conectando a la sala ${cleanCode}...`);

  try {
    const guestPeerId = 'nettop_guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    activePeer = new Peer(guestPeerId, { debug: 1 });

    activePeer.on('open', () => {
      const conn = activePeer.connect(hostPeerId, {
        metadata: {
          userName: localUserName,
          userColor: localUserColor
        },
        reliable: true
      });
      setupConnectionHandlers(conn);
    });

    activePeer.on('error', (err) => {
      console.error('[Collab] Error al conectar con sala:', err);
      showToast(`No se pudo conectar a la sala ${cleanCode}. Verifica que el anfitrión esté en línea.`, 'error');
      updateCollabStatus('error', 'No se pudo conectar');
      leaveCollabSession(false);
    });

  } catch (err) {
    console.error('[Collab] Error inicializando cliente:', err);
    showToast('Error inicializando WebRTC P2P', 'error');
  }
}

/**
 * Configurar eventos de una conexión de datos WebRTC
 */
function setupConnectionHandlers(conn) {
  conn.on('open', () => {
    activeConnections.set(conn.peer, conn);
    state.collab.peers[conn.peer] = {
      name: conn.metadata?.userName || 'Invitado',
      color: conn.metadata?.userColor || PEER_COLORS[activeConnections.size % PEER_COLORS.length],
      cursor: null
    };

    updateCollabUI();
    showToast(`${state.collab.peers[conn.peer].name} se unió a la sesión`, 'info');

    // Si somos el Host, le enviamos inmediatamente el estado completo de la topología
    if (isHostMode) {
      conn.send({
        type: 'INITIAL_SYNC',
        payload: {
          nodes: state.nodes,
          connections: state.connections,
          zones: state.zones || [],
          underlay: state.underlay || null,
          sheets: state.sheets || [],
          activeSheetId: state.activeSheetId,
          projectName: state.currentProjectName
        }
      });
    } else {
      state.collab.active = true;
      state.collab.status = 'connected';
      state.collab.roomId = currentRoomId;
      updateCollabStatus('connected', `Conectado a ${currentRoomId}`);
    }
  });

  conn.on('data', (data) => {
    handleIncomingCollabData(conn.peer, data);
  });

  conn.on('close', () => {
    const peerInfo = state.collab.peers[conn.peer];
    if (peerInfo) {
      showToast(`${peerInfo.name} abandonó la sesión`, 'subtle');
      removeRemoteCursor(conn.peer);
      delete state.collab.peers[conn.peer];
    }
    activeConnections.delete(conn.peer);

    // Si somos un invitado y el host cerró la sala
    if (!isHostMode) {
      showToast('El anfitrión ha cerrado la sala. Tu copia local del diagrama continúa guardada en tu navegador.', 'info', 5000);
      leaveCollabSession(false);
    }

    updateCollabUI();
  });

  conn.on('error', (err) => {
    console.warn('[Collab] Error en canal de datos con par:', conn.peer, err);
  });
}

/**
 * Procesar mensaje entrante de un par
 */
function handleIncomingCollabData(senderPeerId, msg) {
  if (!msg || typeof msg !== 'object' || typeof msg.type !== 'string') return;

  switch (msg.type) {
    case 'INITIAL_SYNC': {
      // Reemplazar estado con el del anfitrión previa validación defensiva
      const p = msg.payload;
      if (!p || typeof p !== 'object') return;

      if (typeof p.projectName === 'string' && p.projectName.trim()) {
        state.currentProjectName = p.projectName.slice(0, 120);
      }
      if (Array.isArray(p.sheets) && p.sheets.length > 0) {
        state.sheets = p.sheets;
      }
      if (typeof p.activeSheetId === 'string') {
        state.activeSheetId = p.activeSheetId;
      }
      state.nodes = Array.isArray(p.nodes) ? p.nodes.filter(n => n && typeof n === 'object' && typeof n.id === 'string') : [];
      state.connections = Array.isArray(p.connections) ? p.connections.filter(c => c && typeof c === 'object' && typeof c.id === 'string') : [];
      state.zones = Array.isArray(p.zones) ? p.zones.filter(z => z && typeof z === 'object' && typeof z.id === 'string') : [];
      state.underlay = (p.underlay && typeof p.underlay === 'object') ? p.underlay : null;

      // Re-renderizar lienzo completamente
      if (dom.nodesLayer) dom.nodesLayer.innerHTML = '';
      if (dom.cablesGroup) dom.cablesGroup.innerHTML = '';
      if (dom.labelsLayer) dom.labelsLayer.innerHTML = '';
      if (dom.zonesLayer) dom.zonesLayer.innerHTML = '';
      if (dom.underlayLayer) dom.underlayLayer.innerHTML = '';

      renderUnderlay();
      renderZones();
      state.nodes.forEach(node => {
        try {
          renderNodeElement(node);
        } catch (e) {
          console.warn('[Collab] Error al renderizar nodo remoto:', node, e);
        }
      });
      renderConnections();
      renderSheetsBar();
      updatePaperSheetDisplay();

      showToast('Topología sincronizada con el anfitrión', 'success');
      break;
    }

    case 'NODE_MOVE': {
      // Mover nodo remotamente con validación de tipo y valores finitos
      if (!msg.payload || typeof msg.payload.id !== 'string') return;
      const { id, x, y } = msg.payload;
      if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) return;

      const targetNode = state.nodes.find(n => n.id === id);
      if (targetNode) {
        targetNode.x = x;
        targetNode.y = y;
        const el = document.getElementById(id);
        if (el) {
          el.style.left = `${x}px`;
          el.style.top = `${y}px`;
        }
        renderConnections();
      }
      // Si somos el host, retransmitimos a los demás pares
      if (isHostMode) relayToOtherPeers(senderPeerId, msg);
      break;
    }

    case 'NODE_CREATE': {
      if (!msg.payload || !msg.payload.node || typeof msg.payload.node !== 'object' || typeof msg.payload.node.id !== 'string') return;
      const { node } = msg.payload;
      if (!state.nodes.some(n => n.id === node.id)) {
        state.nodes.push(node);
        try {
          renderNodeElement(node);
        } catch (e) {
          console.warn('[Collab] Error creando nodo remoto:', e);
        }
        renderConnections();
      }
      if (isHostMode) relayToOtherPeers(senderPeerId, msg);
      break;
    }

    case 'NODE_DELETE': {
      if (!msg.payload || typeof msg.payload.id !== 'string') return;
      const { id } = msg.payload;
      const idx = state.nodes.findIndex(n => n.id === id);
      if (idx !== -1) {
        state.nodes.splice(idx, 1);
        const el = document.getElementById(id);
        if (el) el.remove();
        renderConnections();
      }
      if (isHostMode) relayToOtherPeers(senderPeerId, msg);
      break;
    }

    case 'CONNECTION_CREATE': {
      if (!msg.payload || !msg.payload.connection || typeof msg.payload.connection !== 'object' || typeof msg.payload.connection.id !== 'string') return;
      const { connection } = msg.payload;
      if (!state.connections.some(c => c.id === connection.id)) {
        state.connections.push(connection);
        renderConnections();
      }
      if (isHostMode) relayToOtherPeers(senderPeerId, msg);
      break;
    }

    case 'CONNECTION_DELETE': {
      if (!msg.payload || typeof msg.payload.id !== 'string') return;
      const { id } = msg.payload;
      const cIdx = state.connections.findIndex(c => c.id === id);
      if (cIdx !== -1) {
        state.connections.splice(cIdx, 1);
        renderConnections();
      }
      if (isHostMode) relayToOtherPeers(senderPeerId, msg);
      break;
    }

    case 'CURSOR_MOVE': {
      if (!msg.payload || typeof msg.payload.x !== 'number' || typeof msg.payload.y !== 'number' || !Number.isFinite(msg.payload.x) || !Number.isFinite(msg.payload.y)) return;
      updateRemoteCursor(senderPeerId, msg.payload.x, msg.payload.y);
      if (isHostMode) relayToOtherPeers(senderPeerId, msg);
      break;
    }

    case 'ROOM_CLOSED': {
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
      } catch (e) {}
    }
  }
}

/**
 * Transmitir una acción atómica a los pares conectados
 */
export function broadcastCollabAction(type, payload) {
  if (!state.collab.active || activeConnections.size === 0) return;

  const msg = { type, payload };
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
 * Enviar posición del cursor con aceleración y límite de tasa (throttling suave a 30 FPS garantizando posición final)
 */
export function sendLocalCursor(x, y) {
  if (!state.collab.active || activeConnections.size === 0) return;
  pendingCursor = { x, y };

  const now = performance.now();
  const elapsed = now - lastCursorSentTime;
  const THROTTLE_MS = 33; // ~30 fps suave

  if (elapsed >= THROTTLE_MS) {
    if (cursorThrottleTimeout) {
      clearTimeout(cursorThrottleTimeout);
      cursorThrottleTimeout = null;
    }
    lastCursorSentTime = now;
    broadcastCollabAction('CURSOR_MOVE', { x, y, name: localUserName, color: localUserColor });
    pendingCursor = null;
  } else if (!cursorThrottleTimeout) {
    cursorThrottleTimeout = setTimeout(() => {
      cursorThrottleTimeout = null;
      if (pendingCursor) {
        lastCursorSentTime = performance.now();
        broadcastCollabAction('CURSOR_MOVE', { 
          x: pendingCursor.x, 
          y: pendingCursor.y, 
          name: localUserName, 
          color: localUserColor 
        });
        pendingCursor = null;
      }
    }, THROTTLE_MS - elapsed);
  }
}

/**
 * Dibujar o actualizar un cursor remoto en el canvas
 */
function updateRemoteCursor(peerId, x, y) {
  const layer = ensureRemoteCursorsLayer();
  if (!layer) return;

  let cursorEl = document.getElementById(`remote-cursor-${peerId}`);
  const peerInfo = state.collab.peers[peerId] || { name: 'Invitado', color: '#38bdf8' };

  if (!cursorEl) {
    cursorEl = document.createElement('div');
    cursorEl.id = `remote-cursor-${peerId}`;
    cursorEl.className = 'remote-canvas-cursor';
    cursorEl.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="${peerInfo.color}" stroke="#000000" stroke-width="1.5">
        <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.85a.5.5 0 0 0-.85.36z"/>
      </svg>
      <span class="remote-cursor-label" style="background-color: ${peerInfo.color}; color: #000; font-weight: 700; font-size: 0.68rem; padding: 2px 6px; border-radius: 4px; margin-left: 12px; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,0.4);">
        ${escapeHtml(peerInfo.name)}
      </span>
    `;
    cursorEl.style.cssText = 'position: absolute; pointer-events: none; transition: transform 0.08s linear; z-index: 9999; will-change: transform;';
    layer.appendChild(cursorEl);
  }

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
  const wasHost = isHostMode;
  const wasActive = state.collab.active;

  for (const conn of activeConnections.values()) {
    try {
      conn.close();
    } catch (e) {}
  }
  activeConnections.clear();

  if (activePeer) {
    try {
      activePeer.destroy();
    } catch (e) {}
    activePeer = null;
  }

  state.collab.active = false;
  state.collab.isHost = false;
  state.collab.roomId = null;
  state.collab.peerId = null;
  state.collab.peers = {};
  state.collab.status = 'disconnected';
  isHostMode = false;

  if (remoteCursorsLayer) {
    remoteCursorsLayer.innerHTML = '';
  }

  if (cursorThrottleTimeout) {
    clearTimeout(cursorThrottleTimeout);
    cursorThrottleTimeout = null;
  }
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
      const count = activeConnections.size + 1;
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
  const copyLinkBtn = document.getElementById('btn-collab-copy-link');

  if (!sessionActiveCard || !sessionInactiveCard) return;

  if (state.collab.active) {
    sessionActiveCard.style.display = 'block';
    sessionInactiveCard.style.display = 'none';

    if (roomCodeDisplay) {
      roomCodeDisplay.textContent = state.collab.roomId || '---';
    }

    if (peersListContainer) {
      const peersArray = Object.entries(state.collab.peers);
      let html = `
        <div style="display: flex; align-items: center; gap: 8px; padding: 6px 10px; background: rgba(255,255,255,0.04); border-radius: 6px; margin-bottom: 6px;">
          <span style="width: 10px; height: 10px; border-radius: 3px; background: ${localUserColor};"></span>
          <span style="font-weight: 600; font-size: 0.82rem;">${escapeHtml(localUserName)} (Tú) ${isHostMode ? '★ Anfitrión' : ''}</span>
        </div>
      `;

      peersArray.forEach(([pId, info]) => {
        html += `
          <div style="display: flex; align-items: center; gap: 8px; padding: 6px 10px; background: rgba(255,255,255,0.02); border-radius: 6px; margin-bottom: 4px;">
            <span style="width: 10px; height: 10px; border-radius: 3px; background: ${info.color};"></span>
            <span style="font-size: 0.82rem;">${escapeHtml(info.name)}</span>
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

  if (triggerBtn) triggerBtn.addEventListener('click', openCollabModal);
  if (closeBtn) closeBtn.addEventListener('click', closeCollabModal);
  if (closeBottomBtn) closeBottomBtn.addEventListener('click', closeCollabModal);

  if (nameInput) {
    nameInput.addEventListener('change', (e) => {
      const val = e.target.value.trim();
      if (val) {
        localUserName = val;
        localStorage.setItem('nettopology_collab_name', val);
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
      const isHost = isHostMode;
      const confirmMsg = isHost
        ? '¿Cerrar la sala colaborativa para todos los participantes?'
        : '¿Deseas salir de la sala colaborativa?';

      if (confirm(confirmMsg)) {
        if (isHost) {
          try {
            broadcastCollabAction('ROOM_CLOSED', { message: 'El anfitrión ha cerrado la sala.' });
          } catch (e) {}
        }
        leaveCollabSession(true);
        closeCollabModal();
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
          showToast('Enlace de invitación copiado al portapapeles', 'success');
        });
      }
    });
  }

  // Detectar parámetro ?room=XXXX en la URL para unirse automáticamente
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    if (roomParam) {
      setTimeout(() => {
        joinCollabSession(roomParam);
      }, 1000);
    }
  } catch (e) {}

  window.addEventListener('beforeunload', () => {
    if (state.collab && state.collab.active && isHostMode && activeConnections.size > 0) {
      try {
        broadcastCollabAction('ROOM_CLOSED', { message: 'El anfitrión ha cerrado el navegador.' });
      } catch (e) {}
    }
  });
}

// Registrar en el bus global app
app.startHostSession = startHostSession;
app.joinCollabSession = joinCollabSession;
app.leaveCollabSession = leaveCollabSession;
app.broadcastCollabAction = broadcastCollabAction;
app.sendLocalCursor = sendLocalCursor;
app.openCollabModal = openCollabModal;
app.closeCollabModal = closeCollabModal;
app.initCollabUI = initCollabUI;
