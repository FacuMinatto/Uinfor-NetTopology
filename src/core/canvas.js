/**
 * NetTopology - Módulo src/core/canvas.js
 */

import { state, dom } from '../state/store.js';
import { app } from '../core/appContext.js';
import { DEVICE_ICONS, DEVICE_ICONS_LIGHT, DEVICE_METADATA, CABLE_TYPES, getDeviceIcon, generateSwitchPorts, generateRouterPorts } from '../config/icons.js';
import { STORAGE_PROJECTS_KEY, STORAGE_ACTIVE_ID_KEY, STORAGE_LEGACY_KEY, SHEET_PRESETS, ZONE_COLOR_PALETTES, MAX_HISTORY_STEPS, DEFAULT_GRID_SIZE } from '../config/constants.js';
import { escapeHtml, incrementIp, formatDateForFile, clamp, generateId } from '../utils/helpers.js';
import { createNode, getNodePlacementOffset, getNodeGeometry } from './nodes.js';
import { getNodeEdgeAnchor, renderConnections } from './cables.js';
import { openCableConfigModal } from '../ui/modals.js';
import { updateSelectionVisuals, deselectAll, renderInspector } from '../ui/inspector.js';
import { createZone } from './zones.js';
import { getCurrentSheet } from './sheets.js';
import { saveState, showToast } from '../storage/db.js';



  // ==========================================================================
  // ==========================================================================
  // MANIPULACIÓN DE EVENTOS DEL CANVAS (HOJA INFINITA, PAN, ZOOM, DRAG & DROP)
  // ==========================================================================
let touchMarqueeExplicit = false;

export function closeTouchContextMenu() {
    const existing = typeof document !== 'undefined' ? document.querySelector('.touch-context-menu') : null;
    if (!existing) return false;
    existing.remove();
    return true;
  }

export function showTouchContextMenu(clientX, clientY, title, items) {
    if (typeof document === 'undefined' || !items || items.length === 0) return null;
    closeTouchContextMenu();

    const menu = document.createElement('div');
    menu.className = 'touch-context-menu';
    menu.setAttribute('role', 'menu');

    if (title) {
      const hdr = document.createElement('div');
      hdr.className = 'touch-context-header';
      hdr.textContent = title;
      menu.appendChild(hdr);
    }

    items.forEach(item => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'touch-context-item' + (item.danger ? ' danger' : '');
      btn.textContent = item.label;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeTouchContextMenu();
        item.onClick?.();
      });
      menu.appendChild(btn);
    });

    document.body.appendChild(menu);

    const rect = menu.getBoundingClientRect();
    const vw = window.innerWidth || 1024;
    const vh = window.innerHeight || 768;
    const left = Math.max(8, Math.min(clientX, vw - rect.width - 8));
    const top = Math.max(8, Math.min(clientY - 12, vh - rect.height - 8));
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;

    const onOutsidePointerDown = (ev) => {
      if (!menu.contains(ev.target)) {
        closeTouchContextMenu();
        window.removeEventListener('pointerdown', onOutsidePointerDown, true);
      }
    };
    setTimeout(() => {
      if (document.body.contains(menu)) {
        window.addEventListener('pointerdown', onOutsidePointerDown, true);
      }
    }, 0);

    return menu;
  }

let quickActionsActiveNodeId = null;
let quickActionsBarWidth = 0;
let quickActionsBarHeight = 0;
let quickPasteStagger = 0;

const coarsePointerMql = (typeof window !== 'undefined' && typeof window.matchMedia === 'function')
  ? window.matchMedia('(pointer: coarse)')
  : null;

function isTouchInteraction() {
    if (state.lastPointerType === 'touch' || state.lastPointerType === 'pen') return true;
    return Boolean(coarsePointerMql?.matches);
  }

export function updateNodeQuickActions() {
    if (typeof document === 'undefined') return;

    const canShow = isTouchInteraction()
      && state.selection?.type === 'node'
      && state.selectedNodeIds.size === 1
      && !state.isDraggingNode
      && !state.isPanning
      && !state.isConnecting
      && state.canvasMode !== 'connect';

    if (!canShow && quickActionsActiveNodeId === null) return;

    let bar = document.getElementById('node-quick-actions');
    const node = canShow ? state.nodes.find(n => n.id === state.selection.id) : null;
    const nodeEl = node ? document.getElementById(node.id) : null;

    if (!node || !nodeEl) {
      if (bar) bar.style.display = 'none';
      quickActionsActiveNodeId = null;
      quickActionsBarWidth = 0;
      quickActionsBarHeight = 0;
      return;
    }

    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'node-quick-actions';
      bar.className = 'node-quick-actions';
      bar.setAttribute('role', 'toolbar');
      bar.setAttribute('aria-label', 'Acciones rápidas del equipo');
      bar.addEventListener('pointerdown', (e) => e.stopPropagation());
      document.body.appendChild(bar);
    }

    const actions = state.readOnlyLock
      ? [
          {
            id: 'props',
            label: 'Propiedades',
            icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.77 1 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
            onClick: () => app.toggleInspector?.(false)
          },
          {
            id: 'copy',
            label: 'Copiar',
            icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
            onClick: () => app.copyNodeToClipboard?.(node.id)
          }
        ]
      : [
          {
            id: 'connect',
            label: 'Conectar',
            icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
            onClick: () => {
              setCanvasMode('connect', { sourceNodeId: node.id });
              document.getElementById(node.id)?.classList.add('connect-source-pending');
              showToast('Toca el equipo destino para conectar.', 'info', 2200);
            }
          },
          {
            id: 'copy',
            label: 'Copiar',
            icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
            onClick: () => app.copyNodeToClipboard?.(node.id)
          },
          {
            id: 'duplicate',
            label: 'Duplicar',
            icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V6a2 2 0 0 1 2-2h10"/><line x1="14" y1="11" x2="14" y2="17"/><line x1="11" y1="14" x2="17" y2="14"/></svg>',
            onClick: () => app.duplicateNode?.(node.id)
          },
          {
            id: 'ports',
            label: 'Bocas',
            icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h.01M10 12h.01M14 12h.01M18 12h.01"/></svg>',
            onClick: () => {
              app.toggleInspector?.(false);
              setTimeout(() => {
                const portsBox = document.getElementById('ports-list-box');
                portsBox?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }, 60);
            }
          },
          {
            id: 'delete',
            label: 'Eliminar',
            danger: true,
            icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>',
            onClick: () => app.deleteNode?.(node.id)
          }
        ];

    const modeKey = `${node.id}:${state.readOnlyLock ? 'ro' : 'rw'}`;
    if (quickActionsActiveNodeId !== modeKey) {
      quickActionsActiveNodeId = modeKey;
      bar.innerHTML = '';
      actions.forEach((act) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'node-quick-btn' + (act.danger ? ' danger' : '');
        btn.title = act.label;
        btn.setAttribute('aria-label', act.label);
        btn.innerHTML = `${act.icon}<span>${act.label}</span>`;
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          act.onClick();
        });
        bar.appendChild(btn);
      });
      bar.style.display = 'flex';
      const barRect = bar.getBoundingClientRect();
      quickActionsBarWidth = barRect.width || 240;
      quickActionsBarHeight = barRect.height || 44;
    } else {
      bar.style.display = 'flex';
    }

    const geo = getNodeGeometry(node);
    const vpRect = getViewportRect() || { left: 0, top: 0, width: window.innerWidth || 1024, height: window.innerHeight || 768 };
    const zoom = state.viewport.zoom || 1;
    const rectLeft = vpRect.left + state.viewport.x + (geo.cx - geo.hw) * zoom;
    const rectRight = vpRect.left + state.viewport.x + (geo.cx + geo.hw) * zoom;
    const rectTop = vpRect.top + state.viewport.y + (geo.cy - geo.hh) * zoom;
    const rectBottom = vpRect.top + state.viewport.y + (geo.cy + geo.hh) * zoom;
    const rectWidth = rectRight - rectLeft;

    const vw = window.innerWidth || 1024;
    const vh = window.innerHeight || 768;

    const left = clamp(rectLeft + rectWidth / 2 - quickActionsBarWidth / 2, 8, Math.max(8, vw - quickActionsBarWidth - 8));
    const preferTop = rectTop - quickActionsBarHeight - 10;
    const top = preferTop >= 68
      ? preferTop
      : Math.min(vh - quickActionsBarHeight - 78, rectBottom + 10);

    bar.style.left = `${Math.round(left)}px`;
    bar.style.top = `${Math.round(Math.max(8, top))}px`;
  }

export function updateQuickPastePill() {
    if (typeof document === 'undefined' || !dom.viewport) return;
    let pill = document.getElementById('quick-paste-pill');
    const clip = state.clipboard;
    const shouldShow = Boolean(clip && clip.type === 'node' && clip.data && !state.readOnlyLock);

    if (!shouldShow) {
      if (pill) pill.style.display = 'none';
      quickPasteStagger = 0;
      return;
    }

    if (!pill) {
      pill = document.createElement('div');
      pill.id = 'quick-paste-pill';
      pill.className = 'quick-paste-pill';
      pill.addEventListener('pointerdown', (e) => e.stopPropagation());

      const execBtn = document.createElement('button');
      execBtn.type = 'button';
      execBtn.id = 'btn-quick-paste-exec';
      execBtn.className = 'quick-paste-exec';
      execBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const center = getCanvasCenterWorld();
        const delta = (quickPasteStagger % 5) * 24;
        quickPasteStagger += 1;
        const pasted = app.pasteClipboardAt?.(center.x + delta, center.y + delta);
        if (pasted) {
          state.selectedNodeIds.clear();
          if (state.selectedZoneIds) state.selectedZoneIds.clear();
          state.selectedNodeIds.add(pasted.id);
          state.selection = { type: 'node', id: pasted.id, ids: [pasted.id] };
          updateSelectionVisuals();
          renderInspector();
        }
      });

      const clearBtn = document.createElement('button');
      clearBtn.type = 'button';
      clearBtn.id = 'btn-quick-paste-clear';
      clearBtn.className = 'quick-paste-clear';
      clearBtn.title = 'Descartar copia';
      clearBtn.setAttribute('aria-label', 'Descartar copia');
      clearBtn.textContent = '×';
      clearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        state.clipboard = null;
        updateQuickPastePill();
      });

      pill.appendChild(execBtn);
      pill.appendChild(clearBtn);
      dom.viewport.appendChild(pill);
    }

    const execBtn = pill.querySelector('#btn-quick-paste-exec');
    if (execBtn) {
      execBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg><span>Pegar "${escapeHtml(clip.data.name || 'Equipo')}"</span>`;
    }
    pill.style.display = 'flex';
  }

export function placePaletteItemAtScreen(type, clientX, clientY) {
    if (state.readOnlyLock) { app.notifyReadOnlyBlocked?.(); return null; }
    if (!dom.viewport) return null;
    const rect = dom.viewport.getBoundingClientRect();
    const worldPos = screenToWorld(clientX - rect.left, clientY - rect.top);
    if (type === 'vlan_zone' || type === 'zone') {
      const zone = createZone('VLAN ' + ((state.zones ? state.zones.length : 0) + 10), worldPos.x - 160, worldPos.y - 110, 320, 220);
      saveState();
      return zone;
    }
    if (type && DEVICE_METADATA[type]) {
      const offset = getNodePlacementOffset(type);
      const node = createNode(type, worldPos.x - offset.x, worldPos.y - offset.y);
      saveState();
      return node;
    }
    return null;
  }

export function setCanvasMode(mode, options = {}) {
    if (state.readOnlyLock && mode === 'connect') {
      app.notifyReadOnlyBlocked?.();
      return;
    }
    state.canvasMode = mode;
    touchMarqueeExplicit = (mode === 'select' && Boolean(options && options.explicit));

    if (dom.btnModeSelect) dom.btnModeSelect.classList.toggle('active-mode', mode === 'select');
    if (dom.btnModePan) dom.btnModePan.classList.toggle('active-mode', mode === 'pan');
    if (dom.btnModeConnect) dom.btnModeConnect.classList.toggle('active-mode', mode === 'connect');
    if (dom.viewport) {
      dom.viewport.classList.toggle('mode-pan', mode === 'pan');
      dom.viewport.classList.toggle('mode-connect', mode === 'connect');
    }

    if (typeof document !== 'undefined' && document.querySelectorAll) {
      document.querySelectorAll('.network-node.connect-source-pending').forEach(el => {
        el.classList.remove('connect-source-pending');
      });
    }

    if (mode === 'connect' && options && options.sourceNodeId) {
      state.connectingSourceNodeId = options.sourceNodeId;
      const srcEl = typeof document !== 'undefined' ? document.getElementById(options.sourceNodeId) : null;
      if (srcEl) srcEl.classList.add('connect-source-pending');
      if (typeof showToast === 'function') {
        showToast('Toca el equipo destino para conectar.', 'info');
      }
    } else {
      state.connectingSourceNodeId = null;
      if (mode === 'connect' && typeof showToast === 'function') {
        showToast('Modo conectar: toca el equipo origen y luego el destino.', 'info');
      }
    }
  }

let canvasWindowAbort = null;

export function cleanupCanvasEvents() {
    if (canvasWindowAbort) {
      canvasWindowAbort.abort();
      canvasWindowAbort = null;
    }
  }

export function setupCanvasEvents() {
    if (canvasWindowAbort) canvasWindowAbort.abort();
    canvasWindowAbort = new AbortController();
    const { signal } = canvasWindowAbort;

    let isPanning = false;
    let startPan = { x: 0, y: 0 };
    let isSpacePressed = false;

    // Detectar barra espaciadora para paneo fluido tipo Figma / Miro
    window.addEventListener('keydown', (e) => {
      if (!dom.viewport) return;
      if (e.code === 'Space' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        e.preventDefault(); // Prevenir scroll nativo de página con barra espaciadora
        if (!isSpacePressed) {
          isSpacePressed = true;
          dom.viewport.classList.add('space-grab');
        }
      }
    }, { signal });

    window.addEventListener('keyup', (e) => {
      if (!dom.viewport) return;
      if (e.code === 'Space') {
        isSpacePressed = false;
        dom.viewport.classList.remove('space-grab');
        if (isPanning) {
          isPanning = false;
          state.isPanning = false;
          dom.viewport.classList.remove('panning');
          updateNodeQuickActions();
        }
      }
    }, { signal });

    // Soltar dispositivo desde la paleta izquierda
    dom.viewport.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    });

    dom.viewport.addEventListener('drop', (e) => {
      e.preventDefault();
      const type = e.dataTransfer.getData('text/plain');
      placePaletteItemAtScreen(type, e.clientX, e.clientY);
    });

    // Paneo infinito, Multitouch (Pinch-to-Zoom + Pan) o Selección por recuadro (Marquee Selection)
    const activePointers = new Map();
    let isPinching = false;
    let pinchSuppressSinglePointer = false;
    let prevPinchDist = 0;
    let prevPinchMid = null;
    let pinchRafId = null;

    let activePanPointerId = null;
    let activeMarqueePointerId = null;
    let isMarqueeSelecting = false;
    let marqueeStart = { clientX: 0, clientY: 0, screenX: 0, screenY: 0 };

    let panRafId = null;
    let pendingPan = null;

    let marqueeRafId = null;
    let pendingMarquee = null;

    let connectingRafId = null;
    let pendingConnecting = null;

    let panStartClient = { x: 0, y: 0 };

    dom.viewport.addEventListener('pointerdown', (e) => {
      state.lastPointerType = e.pointerType || 'mouse';
      closeTouchContextMenu();
      const isUiChrome = e.target?.closest?.('.canvas-controls') ||
                         e.target?.closest?.('.floating-panel-toggle') ||
                         e.target?.closest?.('.sheets-bar') ||
                         e.target?.closest?.('.canvas-minimap') ||
                         e.target?.closest?.('.canvas-quick-actions-bar') ||
                         e.target?.closest?.('.node-quick-actions') ||
                         e.target?.closest?.('.quick-paste-pill') ||
                         e.target?.closest?.('#btn-toggle-mobile-hud');
      const isInteractive = isUiChrome || (!state.readOnlyLock && (
                            e.target?.closest?.('.network-node') ||
                            e.target?.closest?.('.node-cable-handle') ||
                            e.target?.closest?.('.port-badge') ||
                            e.target?.closest?.('.cable-waypoint-group') ||
                            e.target?.closest?.('.cable-ghost-handle') ||
                            e.target?.closest?.('.zone-header') ||
                            e.target?.closest?.('.zone-edge-handle') ||
                            e.target?.closest?.('.zone-corner-handle') ||
                            e.target?.classList?.contains('network-cable') ||
                            e.target?.classList?.contains('cable-outline')));

      if (activePointers.size === 0 && isInteractive) return;

      activePointers.set(e.pointerId, {
        clientX: e.clientX,
        clientY: e.clientY,
        pointerType: e.pointerType || 'mouse'
      });

      if (activePointers.size === 2) {
        if (panRafId) { cancelAnimationFrame(panRafId); panRafId = null; }
        if (marqueeRafId) { cancelAnimationFrame(marqueeRafId); marqueeRafId = null; }
        if (connectingRafId) { cancelAnimationFrame(connectingRafId); connectingRafId = null; }

        isPanning = false;
        state.isPanning = false;
        activePanPointerId = null;
        dom.viewport.classList.remove('panning');
        updateNodeQuickActions();

        if (isMarqueeSelecting) {
          isMarqueeSelecting = false;
          activeMarqueePointerId = null;
          if (dom.marquee) dom.marquee.style.display = 'none';
        }

        if (state.isConnecting) {
          state.isConnecting = false;
          state.connectingSourceNodeId = null;
          if (dom.tempCable) dom.tempCable.style.display = 'none';
        }

        const pts = Array.from(activePointers.values());
        const [p1, p2] = pts;
        isPinching = true;
        pinchSuppressSinglePointer = true;
        prevPinchMid = {
          x: (p1.clientX + p2.clientX) / 2,
          y: (p1.clientY + p2.clientY) / 2
        };
        prevPinchDist = Math.hypot(p2.clientX - p1.clientX, p2.clientY - p1.clientY);
        e.preventDefault();
        return;
      }

      if (activePointers.size > 2 || pinchSuppressSinglePointer) {
        return;
      }

      const isMiddleClick = e.button === 1;
      const isRightClick = e.button === 2;
      const isSpaceClick = (e.button === 0 && isSpacePressed);
      const isTouch = e.pointerType === 'touch';

      // Paneo con: Botón derecho, Botón central, Espacio + Clic
      if (isMiddleClick || isRightClick || isSpaceClick) {
        isPanning = true;
        state.isPanning = true;
        activePanPointerId = e.pointerId;
        startPan = { x: e.clientX - state.viewport.x, y: e.clientY - state.viewport.y };
        dom.viewport.classList.add('panning');
        updateNodeQuickActions();
        e.preventDefault();
        return;
      }

      if (isInteractive) return;

      // En modo conectar (2 toques), tocar el fondo vacío cancela el equipo origen pendiente
      if (state.canvasMode === 'connect') {
        if (state.connectingSourceNodeId) {
          if (typeof document !== 'undefined' && document.querySelectorAll) {
            document.querySelectorAll('.network-node.connect-source-pending').forEach(el => {
              el.classList.remove('connect-source-pending');
            });
          }
          state.connectingSourceNodeId = null;
        }
        return;
      }

      // Táctil 1 dedo sobre fondo libre (o cualquier toque en Solo Lectura): paneo por defecto
      const shouldPan = state.readOnlyLock
        ? (isTouch || e.button === 0)
        : (isTouch
          ? (state.canvasMode === 'pan' || !touchMarqueeExplicit)
          : (state.canvasMode === 'pan' && e.button === 0));

      if (shouldPan) {
        isPanning = true;
        state.isPanning = true;
        activePanPointerId = e.pointerId;
        panStartClient = { x: e.clientX, y: e.clientY };
        startPan = { x: e.clientX - state.viewport.x, y: e.clientY - state.viewport.y };
        dom.viewport.classList.add('panning');
        updateNodeQuickActions();

        e.preventDefault();
        return;
      }

      const shouldMarquee = isTouch
        ? (state.canvasMode === 'select' && touchMarqueeExplicit)
        : (e.button === 0 && state.canvasMode === 'select');

      if (shouldMarquee) {
        // Clic en el fondo libre: iniciar marquesina de selección elástica
        const rect = dom.viewport.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;

        marqueeStart = { clientX: e.clientX, clientY: e.clientY, screenX, screenY };
        isMarqueeSelecting = true;
        activeMarqueePointerId = e.pointerId;

        if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
          deselectAll();
        }

        if (dom.marquee) {
          dom.marquee.style.left = `${screenX}px`;
          dom.marquee.style.top = `${screenY}px`;
          dom.marquee.style.width = '0px';
          dom.marquee.style.height = '0px';
          dom.marquee.style.display = 'block';
        }
        e.preventDefault();
      }
    });

    // Evitar menú contextual al usar clic derecho para panear
    dom.viewport.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    window.addEventListener('pointermove', (e) => {
      if (activePointers.has(e.pointerId)) {
        activePointers.set(e.pointerId, {
          clientX: e.clientX,
          clientY: e.clientY,
          pointerType: e.pointerType || 'mouse'
        });
      }

      if (isPinching && activePointers.size === 2) {
        if (!pinchRafId) {
          pinchRafId = requestAnimationFrame(() => {
            pinchRafId = null;
            if (!isPinching || activePointers.size !== 2 || !prevPinchMid) return;
            const pts = Array.from(activePointers.values());
            const [p1, p2] = pts;
            const newMid = {
              x: (p1.clientX + p2.clientX) / 2,
              y: (p1.clientY + p2.clientY) / 2
            };
            const newDist = Math.hypot(p2.clientX - p1.clientX, p2.clientY - p1.clientY);

            state.viewport.x += newMid.x - prevPinchMid.x;
            state.viewport.y += newMid.y - prevPinchMid.y;

            if (prevPinchDist >= 1 && newDist >= 1) {
              const scaleRatio = newDist / prevPinchDist;
              applyZoom(scaleRatio, newMid.x, newMid.y);
            } else {
              updateViewportTransform();
            }

            prevPinchMid = newMid;
            prevPinchDist = newDist;
          });
        }
        return;
      }

      if (state.collab && state.collab.active && app.sendLocalCursor && dom.viewport) {
        const rect = getViewportRect();
        if (rect) {
          const world = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
          app.sendLocalCursor(world.x, world.y);
        }
      }

      if (pinchSuppressSinglePointer) return;

      if (isPanning && e.pointerId === activePanPointerId) {
        pendingPan = { clientX: e.clientX, clientY: e.clientY };
        if (!panRafId) {
          panRafId = requestAnimationFrame(() => {
            if (isPanning && pendingPan) {
              state.viewport.x = pendingPan.clientX - startPan.x;
              state.viewport.y = pendingPan.clientY - startPan.y;
              updateViewportTransform();
            }
            panRafId = null;
          });
        }
      } else if (isMarqueeSelecting && e.pointerId === activeMarqueePointerId) {
        pendingMarquee = {
          clientX: e.clientX,
          clientY: e.clientY,
          shiftKey: e.shiftKey,
          ctrlKey: e.ctrlKey,
          metaKey: e.metaKey
        };
        if (!marqueeRafId) {
          marqueeRafId = requestAnimationFrame(() => {
            if (isMarqueeSelecting && pendingMarquee) {
              const rect = getViewportRect();
              if (rect) {
                const curScreenX = Math.max(0, Math.min(rect.width, pendingMarquee.clientX - rect.left));
                const curScreenY = Math.max(0, Math.min(rect.height, pendingMarquee.clientY - rect.top));

                const minX = Math.min(marqueeStart.screenX, curScreenX);
                const maxX = Math.max(marqueeStart.screenX, curScreenX);
                const minY = Math.min(marqueeStart.screenY, curScreenY);
                const maxY = Math.max(marqueeStart.screenY, curScreenY);

              if (dom.marquee) {
                dom.marquee.style.left = `${minX}px`;
                dom.marquee.style.top = `${minY}px`;
                dom.marquee.style.width = `${maxX - minX}px`;
                dom.marquee.style.height = `${maxY - minY}px`;
                dom.marquee.style.display = 'block';
              }

              // Convertir caja a coordenadas del mundo del lienzo
              const worldMin = screenToWorld(minX, minY);
              const worldMax = screenToWorld(maxX, maxY);

              // Detectar nodos dentro o tocando la caja
              const baseSelected = (pendingMarquee.shiftKey || pendingMarquee.ctrlKey || pendingMarquee.metaKey) ? new Set(state.selectedNodeIds) : new Set();
              state.nodes.forEach(node => {
                const hw = 40 * (node.scale || 1);
                const hh = 40 * (node.scale || 1);
                const nodeMinX = node.x - hw;
                const nodeMaxX = node.x + hw;
                const nodeMinY = node.y - hh;
                const nodeMaxY = node.y + hh;

                const intersects = !(nodeMaxX < worldMin.x || nodeMinX > worldMax.x || nodeMaxY < worldMin.y || nodeMinY > worldMax.y);
                if (intersects) {
                  baseSelected.add(node.id);
                }
              });
              state.selectedNodeIds = baseSelected;

              // Detectar zonas dentro o englobadas por la caja (selección gigante)
              const baseSelectedZones = (pendingMarquee.shiftKey || pendingMarquee.ctrlKey || pendingMarquee.metaKey) ? new Set(state.selectedZoneIds) : new Set();
              if (Array.isArray(state.zones)) {
                const marqueeW = worldMax.x - worldMin.x;
                const marqueeH = worldMax.y - worldMin.y;

                state.zones.forEach(zone => {
                  const zMinX = zone.x;
                  const zMaxX = zone.x + zone.width;
                  const zMinY = zone.y;
                  const zMaxY = zone.y + zone.height;

                  const headerH = 38;
                  const headerIntersects = !(zMaxX < worldMin.x || zMinX > worldMax.x || (zMinY + headerH) < worldMin.y || zMinY > worldMax.y);
                  const boxEnclosesZone = (zMinX >= worldMin.x && zMaxX <= worldMax.x && zMinY >= worldMin.y && zMaxY <= worldMax.y);
                  const zoneIntersects = !(zMaxX < worldMin.x || zMinX > worldMax.x || zMaxY < worldMin.y || zMinY > worldMax.y);
                  const isGiantMarquee = (marqueeW > zone.width * 0.45 && marqueeH > zone.height * 0.45);

                  if (headerIntersects || boxEnclosesZone || (zoneIntersects && isGiantMarquee)) {
                    baseSelectedZones.add(zone.id);
                  }
                });
              }
              state.selectedZoneIds = baseSelectedZones;

              const totalCount = state.selectedNodeIds.size + state.selectedZoneIds.size;
              state.selection = {
                type: totalCount > 1 ? 'multi-node' : (state.selectedNodeIds.size === 1 ? 'node' : (state.selectedZoneIds.size === 1 ? 'zone' : null)),
                id: state.selectedNodeIds.size > 0 ? Array.from(state.selectedNodeIds)[0] : (state.selectedZoneIds.size > 0 ? Array.from(state.selectedZoneIds)[0] : null),
                ids: [...Array.from(state.selectedNodeIds), ...Array.from(state.selectedZoneIds)]
              };
              updateSelectionVisuals();
              }
            }
            marqueeRafId = null;
          });
        }
      } else if (state.isConnecting && e.isPrimary !== false) {
        pendingConnecting = { clientX: e.clientX, clientY: e.clientY };
        if (!connectingRafId) {
          connectingRafId = requestAnimationFrame(() => {
            if (state.isConnecting && pendingConnecting) {
              // Actualizar cable elástico temporal mientras se arrastra
              const sourceNode = state.nodes.find(n => n.id === state.connectingSourceNodeId);
              if (sourceNode) {
                const rect = getViewportRect();
                if (rect) {
                  const screenX = pendingConnecting.clientX - rect.left;
                  const screenY = pendingConnecting.clientY - rect.top;
                  const mouseWorld = screenToWorld(screenX, screenY);

                  const anchor = getNodeEdgeAnchor(sourceNode, mouseWorld.x, mouseWorld.y);
                  dom.tempCable.setAttribute('d', `M ${anchor.x} ${anchor.y} L ${mouseWorld.x} ${mouseWorld.y}`);
                  dom.tempCable.style.display = 'block';
                }
              }
            }
            connectingRafId = null;
          });
        }
      }
    });

    const onViewportPointerEnd = (e) => {
      activePointers.delete(e.pointerId);

      if (isPinching && activePointers.size < 2) {
        isPinching = false;
        prevPinchDist = 0;
        prevPinchMid = null;
        if (pinchRafId) {
          cancelAnimationFrame(pinchRafId);
          pinchRafId = null;
        }
      }

      if (activePointers.size === 0) {
        pinchSuppressSinglePointer = false;
      }

      if (isPanning && e.pointerId === activePanPointerId) {
        if (panRafId) {
          cancelAnimationFrame(panRafId);
          panRafId = null;
        }
        isPanning = false;
        state.isPanning = false;
        activePanPointerId = null;
        dom.viewport.classList.remove('panning');
        const movedDist = Math.hypot(e.clientX - panStartClient.x, e.clientY - panStartClient.y);
        if (e.type === 'pointerup' && movedDist < 6 && activePointers.size === 0 && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
          deselectAll();
        } else {
          updateNodeQuickActions();
        }
      }

      if (isMarqueeSelecting && e.pointerId === activeMarqueePointerId) {
        if (marqueeRafId) {
          cancelAnimationFrame(marqueeRafId);
          marqueeRafId = null;
        }
        isMarqueeSelecting = false;
        activeMarqueePointerId = null;
        if (dom.marquee) {
          dom.marquee.style.display = 'none';
        }
        updateSelectionVisuals();
        renderInspector();
      }

      if (state.isConnecting && e.isPrimary !== false) {
        if (connectingRafId) {
          cancelAnimationFrame(connectingRafId);
          connectingRafId = null;
        }
        const sourceId = state.connectingSourceNodeId;
        const startPos = state.connectStartPos;
        state.isConnecting = false;
        state.connectingSourceNodeId = null;
        state.connectStartPos = null;
        if (dom.tempCable) {
          dom.tempCable.style.display = 'none';
        }

        if (e.type === 'pointerup' && sourceId) {
          // Detectar si soltó sobre un nodo destino (arrastre directo) o si fue un tap en (+) (2 toques)
          const targetElement = document.elementFromPoint(e.clientX, e.clientY);
          const targetNodeEl = targetElement ? targetElement.closest('.network-node') : null;
          const movedDist = startPos ? Math.hypot(e.clientX - startPos.x, e.clientY - startPos.y) : Infinity;

          if (targetNodeEl && targetNodeEl.id !== sourceId) {
            if (state.canvasMode === 'connect') setCanvasMode('select');
            openCableConfigModal(sourceId, targetNodeEl.id);
          } else if (movedDist < 14) {
            setCanvasMode('connect', { sourceNodeId: sourceId });
          }
        }
      }
    };

    window.addEventListener('pointerup', onViewportPointerEnd, { signal: canvasWindowAbort.signal });
    window.addEventListener('pointercancel', onViewportPointerEnd, { signal: canvasWindowAbort.signal });

    // Zoom suave y controlado con rueda del ratón hacia el puntero (coalescido en rAF)
    let wheelRafId = null;
    let pendingZoomDelta = 1;
    let pendingClientX = 0;
    let pendingClientY = 0;

    dom.viewport.addEventListener('wheel', (e) => {
      if (e.target.closest('#sheets-bar, .canvas-controls, .canvas-minimap')) return;
      e.preventDefault();
      const zoomFactor = 1.05;
      const delta = e.deltaY < 0 ? zoomFactor : 1 / zoomFactor;
      pendingZoomDelta *= delta;
      pendingClientX = e.clientX;
      pendingClientY = e.clientY;

      if (!wheelRafId) {
        wheelRafId = requestAnimationFrame(() => {
          applyZoom(pendingZoomDelta, pendingClientX, pendingClientY);
          pendingZoomDelta = 1;
          wheelRafId = null;
        });
      }
    }, { passive: false });
  }

let cachedViewportRect = null;
let cachedViewportRectTime = 0;
export function getViewportRect() {
  if (!dom.viewport) return null;
  const now = performance.now();
  if (!cachedViewportRect || now - cachedViewportRectTime > 250) {
    cachedViewportRect = dom.viewport.getBoundingClientRect();
    cachedViewportRectTime = now;
  }
  return cachedViewportRect;
}

if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => {
    cachedViewportRect = null;
  });
}

let lastRenderedZoom = null;
let lastRenderedGridSize = null;
let lastRenderedGridLayer = null;

export function computeGridTileOffset(pos, tileSize) {
  if (!Number.isFinite(tileSize) || tileSize <= 0) return 0;
  return ((pos % tileSize) + tileSize) % tileSize - tileSize;
}

export function applyZoom(delta, clientX, clientY) {
    const oldZoom = state.viewport.zoom;
    let newZoom = oldZoom * delta;
    newZoom = Math.min(Math.max(newZoom, 0.15), 3.0); // Rango ampliado de 15% a 300% para la hoja infinita

    const rect = getViewportRect() || { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    const mouseX = clientX !== undefined ? (clientX - rect.left) : (rect.width / 2);
    const mouseY = clientY !== undefined ? (clientY - rect.top) : (rect.height / 2);

    // Ajustar origen para hacer zoom exactamente hacia el puntero del mouse
    state.viewport.x = mouseX - (mouseX - state.viewport.x) * (newZoom / oldZoom);
    state.viewport.y = mouseY - (mouseY - state.viewport.y) * (newZoom / oldZoom);
    state.viewport.zoom = newZoom;

    updateViewportTransform();
  }

export function updateViewportTransform() {
    dom.world.style.transform = `translate3d(${state.viewport.x}px, ${state.viewport.y}px, 0) scale(${state.viewport.zoom})`;

    // Sincronizar la cuadrícula infinita con la posición y el zoom del lienzo
    const zoom = state.viewport.zoom;
    const gridSize = state.gridSize || DEFAULT_GRID_SIZE;
    const dotSize = gridSize * zoom;
    const majorLineSize = (gridSize * 5) * zoom;
    const posX = state.viewport.x;
    const posY = state.viewport.y;
    const dotOffset = (gridSize / 2) * zoom;
    const gridLayer = dom.gridLayer;

    if (zoom !== lastRenderedZoom || gridSize !== lastRenderedGridSize || gridLayer !== lastRenderedGridLayer) {
      lastRenderedZoom = zoom;
      lastRenderedGridSize = gridSize;
      lastRenderedGridLayer = gridLayer;
      if (dom.zoomValue) {
        dom.zoomValue.textContent = `${Math.round(zoom * 100)}%`;
      }
      if (gridLayer) {
        gridLayer.style.backgroundSize = `${dotSize}px ${dotSize}px, ${majorLineSize}px ${majorLineSize}px, ${majorLineSize}px ${majorLineSize}px`;
        gridLayer.style.backgroundPosition = `${-dotOffset}px ${-dotOffset}px, 0 0, 0 0`;
        gridLayer.style.width = `calc(100% + ${majorLineSize}px)`;
        gridLayer.style.height = `calc(100% + ${majorLineSize}px)`;
      } else if (dom.viewport) {
        dom.viewport.style.backgroundSize = `${dotSize}px ${dotSize}px, ${majorLineSize}px ${majorLineSize}px, ${majorLineSize}px ${majorLineSize}px`;
      }
    }

    if (gridLayer) {
      const ox = computeGridTileOffset(posX, majorLineSize);
      const oy = computeGridTileOffset(posY, majorLineSize);
      gridLayer.style.transform = `translate3d(${ox}px, ${oy}px, 0)`;
    } else if (dom.viewport) {
      dom.viewport.style.backgroundPosition = `${posX - dotOffset}px ${posY - dotOffset}px, ${posX}px ${posY}px, ${posX}px ${posY}px`;
    }

    updateMinimapViewportOnly();
    updateNodeQuickActions();
  }

  // Centrar y encuadrar todos los equipos en la pantalla (Fit to screen)
export function fitViewToNodes() {
    if (!state.nodes || state.nodes.length === 0) {
      state.viewport.x = 80;
      state.viewport.y = 80;
      state.viewport.zoom = 1;
      updateViewportTransform();
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    state.nodes.forEach(n => {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + 104);
      maxY = Math.max(maxY, n.y + 110);
    });

    const padding = 80;
    const bottomReserve = 96; // Espacio reservado para barra de hojas y controles flotantes inferiores
    const contentW = (maxX - minX) + padding * 2;
    const contentH = (maxY - minY) + padding * 2;
    const viewRect = dom.viewport.getBoundingClientRect();
    const viewW = viewRect.width || window.innerWidth;
    const viewH = viewRect.height || window.innerHeight;
    const usableH = Math.max(viewH - bottomReserve, 220);

    let targetZoom = Math.min(viewW / contentW, usableH / contentH);
    targetZoom = Math.min(Math.max(targetZoom, 0.25), 1.5);

    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;

    state.viewport.zoom = targetZoom;
    state.viewport.x = (viewW / 2) - midX * targetZoom;
    state.viewport.y = (usableH / 2) - midY * targetZoom;

    updateViewportTransform();
  }

export function screenToWorld(screenX, screenY) {
    return {
      x: (screenX - state.viewport.x) / state.viewport.zoom,
      y: (screenY - state.viewport.y) / state.viewport.zoom
    };
  }

export function getCanvasCenterWorld() {
    const rect = getViewportRect() || (dom.viewport ? dom.viewport.getBoundingClientRect() : { width: 800, height: 600 });
    return screenToWorld(rect.width / 2, rect.height / 2);
  }

  // ==========================================================================
  // GUÍAS MAGNÉTICAS INTELIGENTES (SMART GUIDES)
  // ==========================================================================
let guideLineX = null;
let guideLineY = null;

function ensureAlignmentGuideLines() {
    if (!dom.alignmentGuidesOverlay) return false;
    if (!guideLineY || guideLineY.parentNode !== dom.alignmentGuidesOverlay) {
      guideLineY = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      guideLineY.setAttribute('x1', '-5000');
      guideLineY.setAttribute('x2', '10000');
      guideLineY.setAttribute('class', 'alignment-guide-line');
      guideLineY.style.display = 'none';
      dom.alignmentGuidesOverlay.appendChild(guideLineY);
    }
    if (!guideLineX || guideLineX.parentNode !== dom.alignmentGuidesOverlay) {
      guideLineX = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      guideLineX.setAttribute('y1', '-5000');
      guideLineX.setAttribute('y2', '10000');
      guideLineX.setAttribute('class', 'alignment-guide-line');
      guideLineX.style.display = 'none';
      dom.alignmentGuidesOverlay.appendChild(guideLineX);
    }
    return true;
  }

export function drawAlignmentGuides(primaryNode) {
    if (!state.smartGuidesEnabled || !dom.alignmentGuidesOverlay) {
      return { guideX: null, guideY: null };
    }
    ensureAlignmentGuideLines();

    const snapDist = 5;
    const stationaryNodes = state.nodes.filter(n => !state.selectedNodeIds.has(n.id));
    if (stationaryNodes.length === 0) {
      clearAlignmentGuides();
      return { guideX: null, guideY: null };
    }

    const pGeo = getNodeGeometry(primaryNode);
    const pcx = pGeo.cx;
    const pcy = pGeo.cy;
    const dxCenter = pcx - primaryNode.x;
    const dyCenter = pcy - primaryNode.y;

    let snappedX = primaryNode.x;
    let snappedY = primaryNode.y;
    let guideX = null;
    let guideY = null;
    let minDiffX = snapDist + 1;
    let minDiffY = snapDist + 1;

    for (const other of stationaryNodes) {
      const oGeo = getNodeGeometry(other);
      const ocx = oGeo.cx;
      const ocy = oGeo.cy;

      // Alineación Horizontal en Centros Y o bordes Y (match más cercano)
      const diffCy = Math.abs(pcy - ocy);
      if (diffCy <= snapDist && diffCy < minDiffY) {
        minDiffY = diffCy;
        snappedY = ocy - dyCenter;
        guideY = ocy;
      }
      const diffTop = Math.abs(primaryNode.y - other.y);
      if (diffTop <= snapDist && diffTop < minDiffY) {
        minDiffY = diffTop;
        snappedY = other.y;
        guideY = other.y;
      }

      // Alineación Vertical en Centros X o bordes X (match más cercano)
      const diffCx = Math.abs(pcx - ocx);
      if (diffCx <= snapDist && diffCx < minDiffX) {
        minDiffX = diffCx;
        snappedX = ocx - dxCenter;
        guideX = ocx;
      }
      const diffLeft = Math.abs(primaryNode.x - other.x);
      if (diffLeft <= snapDist && diffLeft < minDiffX) {
        minDiffX = diffLeft;
        snappedX = other.x;
        guideX = other.x;
      }
    }

    primaryNode.x = snappedX;
    primaryNode.y = snappedY;

    if (guideLineY) {
      if (guideY !== null) {
        guideLineY.setAttribute('y1', guideY);
        guideLineY.setAttribute('y2', guideY);
        guideLineY.style.display = 'block';
      } else {
        guideLineY.style.display = 'none';
      }
    }

    if (guideLineX) {
      if (guideX !== null) {
        guideLineX.setAttribute('x1', guideX);
        guideLineX.setAttribute('x2', guideX);
        guideLineX.style.display = 'block';
      } else {
        guideLineX.style.display = 'none';
      }
    }

    return { guideX, guideY };
  }

export function clearAlignmentGuides() {
    if (guideLineX && guideLineX.parentNode === dom.alignmentGuidesOverlay) {
      guideLineX.style.display = 'none';
    }
    if (guideLineY && guideLineY.parentNode === dom.alignmentGuidesOverlay) {
      guideLineY.style.display = 'none';
    }
  }

  // ==========================================================================
  // GESTIÓN DEL MINIMAPA INTERACTIVO (RADAR)
  // ==========================================================================
  let isMinimapDragging = false;
  let minimapBoundsCache = null;

export function initMinimap() {
    if (!dom.canvasMinimap || !dom.minimapCanvas) return;

    try {
      const savedMinimap = localStorage.getItem('nettopology_minimap_visible');
      if (savedMinimap !== null) {
        state.minimapVisible = (savedMinimap === 'true');
      }
    } catch (e) {}

    dom.canvasMinimap.classList.toggle('is-hidden', !state.minimapVisible);
    if (dom.checkViewMinimap) {
      dom.checkViewMinimap.textContent = state.minimapVisible ? '✓' : '';
    }

    if (dom.minimapHeaderToggle) {
      dom.minimapHeaderToggle.addEventListener('click', (e) => {
        if (e.target.closest('#btn-minimize-minimap')) return;
        toggleMinimapCollapse();
      });
    }

    if (dom.btnMinimizeMinimap) {
      dom.btnMinimizeMinimap.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMinimapCollapse();
      });
    }

    let minimapDragRect = null;
    let minimapDragRafId = null;
    let pendingMinimapPointer = null;
    let minimapPointerId = null;

    const handleMinimapPointer = (clientX, clientY) => {
      const rect = minimapDragRect || dom.minimapCanvas.getBoundingClientRect();
      const clickX = clientX - rect.left;
      const clickY = clientY - rect.top;
      panCanvasFromMinimapCoord(clickX, clickY);
    };

    dom.minimapCanvas.addEventListener('pointerdown', (e) => {
      if (!e.isPrimary) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      isMinimapDragging = true;
      minimapPointerId = e.pointerId;
      minimapDragRect = dom.minimapCanvas.getBoundingClientRect();
      handleMinimapPointer(e.clientX, e.clientY);
    });

    if (dom.minimapViewport) {
      dom.minimapViewport.addEventListener('pointerdown', (e) => {
        if (!e.isPrimary) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.stopPropagation();
        isMinimapDragging = true;
        minimapPointerId = e.pointerId;
        minimapDragRect = dom.minimapCanvas.getBoundingClientRect();
      });
    }

    const minimapSignal = (canvasWindowAbort || (canvasWindowAbort = new AbortController())).signal;
    window.addEventListener('pointermove', (e) => {
      if (!isMinimapDragging || e.pointerId !== minimapPointerId) return;
      pendingMinimapPointer = { clientX: e.clientX, clientY: e.clientY };
      if (!minimapDragRafId) {
        minimapDragRafId = requestAnimationFrame(() => {
          minimapDragRafId = null;
          if (isMinimapDragging && pendingMinimapPointer) {
            handleMinimapPointer(pendingMinimapPointer.clientX, pendingMinimapPointer.clientY);
          }
        });
      }
    }, { signal: minimapSignal });

    const onMinimapPointerEnd = (e) => {
      if (isMinimapDragging && e.pointerId === minimapPointerId) {
        isMinimapDragging = false;
        minimapPointerId = null;
        minimapDragRect = null;
        pendingMinimapPointer = null;
        if (minimapDragRafId) {
          cancelAnimationFrame(minimapDragRafId);
          minimapDragRafId = null;
        }
      }
    };

    window.addEventListener('pointerup', onMinimapPointerEnd, { signal: minimapSignal });
    window.addEventListener('pointercancel', onMinimapPointerEnd, { signal: minimapSignal });

    updateMinimap();
  }

export function toggleMinimapCollapse() {
    if (!dom.canvasMinimap) return;
    dom.canvasMinimap.classList.toggle('is-minimized');
    if (!dom.canvasMinimap.classList.contains('is-minimized')) {
      updateMinimap();
    }
  }

export function toggleMinimapVisibility(forceState) {
    state.minimapVisible = (typeof forceState === 'boolean') ? forceState : !state.minimapVisible;
    if (dom.canvasMinimap) {
      dom.canvasMinimap.classList.toggle('is-hidden', !state.minimapVisible);
    }
    if (dom.checkViewMinimap) {
      dom.checkViewMinimap.textContent = state.minimapVisible ? '✓' : '';
    }
    try {
      localStorage.setItem('nettopology_minimap_visible', state.minimapVisible ? 'true' : 'false');
    } catch (e) {}
    if (state.minimapVisible) {
      updateMinimap();
    }
  }

  let minimapRafId = null;
  let lastMinimapVpEl = null;
  let lastMinimapVpW = null;
  let lastMinimapVpH = null;

  function applyMinimapViewportBox(mw, mh, vx, vy, vw, vh) {
    if (!dom.minimapViewport) return;
    if (dom.minimapViewport !== lastMinimapVpEl) {
      lastMinimapVpEl = dom.minimapViewport;
      lastMinimapVpW = null;
      lastMinimapVpH = null;
    }
    const clampedX = Math.max(0, Math.min(mw - 6, vx));
    const clampedY = Math.max(0, Math.min(mh - 6, vy));
    const roundedW = Math.round(Math.max(6, Math.min(mw, vw)));
    const roundedH = Math.round(Math.max(6, Math.min(mh, vh)));

    dom.minimapViewport.style.transform = `translate3d(${clampedX}px, ${clampedY}px, 0)`;
    if (roundedW !== lastMinimapVpW) {
      lastMinimapVpW = roundedW;
      dom.minimapViewport.style.width = `${roundedW}px`;
    }
    if (roundedH !== lastMinimapVpH) {
      lastMinimapVpH = roundedH;
      dom.minimapViewport.style.height = `${roundedH}px`;
    }
  }

export function updateMinimapViewportOnly() {
    if (!state.minimapVisible || !dom.minimapCanvas || !dom.viewport || !dom.minimapViewport) return;
    if (!minimapBoundsCache) {
      updateMinimap();
      return;
    }

    const mw = dom.minimapCanvas.width;
    const mh = dom.minimapCanvas.height;
    const vpRect = getViewportRect();
    const vpW = (vpRect && vpRect.width) || dom.viewport.clientWidth || 800;
    const vpH = (vpRect && vpRect.height) || dom.viewport.clientHeight || 600;
    const viewWorldX1 = -state.viewport.x / state.viewport.zoom;
    const viewWorldY1 = -state.viewport.y / state.viewport.zoom;
    const { scale, offsetX, offsetY } = minimapBoundsCache;

    const vx = viewWorldX1 * scale + offsetX;
    const vy = viewWorldY1 * scale + offsetY;
    const vw = (vpW / state.viewport.zoom) * scale;
    const vh = (vpH / state.viewport.zoom) * scale;

    applyMinimapViewportBox(mw, mh, vx, vy, vw, vh);
  }

export function updateMinimap() {
    if (!state.minimapVisible || !dom.minimapCanvas || !dom.viewport) return;
    if (minimapRafId) return;
    minimapRafId = requestAnimationFrame(() => {
      minimapRafId = null;
      renderMinimapDirect();
    });
  }

export function renderMinimapDirect() {
    if (!state.minimapVisible || !dom.minimapCanvas || !dom.viewport) return;
    const ctx = dom.minimapCanvas.getContext('2d');
    if (!ctx) return;

    const mw = dom.minimapCanvas.width;
    const mh = dom.minimapCanvas.height;
    ctx.clearRect(0, 0, mw, mh);

    const vpW = dom.viewport.clientWidth || 800;
    const vpH = dom.viewport.clientHeight || 600;

    const viewWorldX1 = -state.viewport.x / state.viewport.zoom;
    const viewWorldY1 = -state.viewport.y / state.viewport.zoom;
    const viewWorldX2 = viewWorldX1 + vpW / state.viewport.zoom;
    const viewWorldY2 = viewWorldY1 + vpH / state.viewport.zoom;

    let minX = Math.min(viewWorldX1, 0);
    let minY = Math.min(viewWorldY1, 0);
    let maxX = Math.max(viewWorldX2, 1200);
    let maxY = Math.max(viewWorldY2, 800);

    const currSheet = getCurrentSheet();
    if (currSheet && currSheet.pageSize !== 'infinite') {
      maxX = Math.max(maxX, currSheet.pageWidth);
      maxY = Math.max(maxY, currSheet.pageHeight);
    }

    const nodeMap = new Map();
    state.nodes.forEach(n => {
      nodeMap.set(n.id, n);
      minX = Math.min(minX, n.x - 30);
      minY = Math.min(minY, n.y - 30);
      maxX = Math.max(maxX, n.x + 130);
      maxY = Math.max(maxY, n.y + 110);
    });

    const padding = 100;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    const worldWidth = Math.max(maxX - minX, 100);
    const worldHeight = Math.max(maxY - minY, 100);

    const scale = Math.min(mw / worldWidth, mh / worldHeight);
    const offsetX = (mw - worldWidth * scale) / 2 - minX * scale;
    const offsetY = (mh - worldHeight * scale) / 2 - minY * scale;

    minimapBoundsCache = { minX, minY, maxX, maxY, scale, offsetX, offsetY };

    const isLight = document.body.getAttribute('data-theme') === 'light';

    // 1. Dibujar hoja si no es infinita
    if (currSheet && currSheet.pageSize !== 'infinite') {
      const sx = currSheet.pageWidth * scale;
      const sy = currSheet.pageHeight * scale;
      ctx.fillStyle = isLight ? '#ffffff' : '#0b1120';
      ctx.strokeStyle = isLight ? '#cbd5e1' : 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 1;
      ctx.fillRect(offsetX, offsetY, sx, sy);
      ctx.strokeRect(offsetX, offsetY, sx, sy);
    }

    // 2. Dibujar conexiones (cables)
    ctx.lineWidth = 1;
    state.connections.forEach(conn => {
      const nodeA = nodeMap.get(conn.fromNodeId);
      const nodeB = nodeMap.get(conn.toNodeId);
      if (!nodeA || !nodeB) return;

      const ax = (nodeA.x + 52) * scale + offsetX;
      const ay = (nodeA.y + 35) * scale + offsetY;
      const bx = (nodeB.x + 52) * scale + offsetX;
      const by = (nodeB.y + 35) * scale + offsetY;

      ctx.beginPath();
      ctx.moveTo(ax, ay);
      if (Array.isArray(conn.waypoints) && conn.waypoints.length > 0) {
        conn.waypoints.forEach(wp => {
          ctx.lineTo(wp.x * scale + offsetX, wp.y * scale + offsetY);
        });
      }
      ctx.lineTo(bx, by);
      ctx.strokeStyle = conn.cableType === 'fiber' ? (isLight ? '#d97706' : '#f59e0b') :
                        conn.cableType === 'power' ? (isLight ? '#dc2626' : '#ef4444') :
                        (isLight ? '#0284c7' : '#38bdf8');
      ctx.stroke();
    });

    // 3. Dibujar nodos
    state.nodes.forEach(n => {
      const nx = n.x * scale + offsetX;
      const ny = n.y * scale + offsetY;
      const nw = Math.max(104 * scale, 4);
      const nh = Math.max(70 * scale, 4);

      ctx.fillStyle = isLight ? '#0284c7' : '#38bdf8';
      if (['router', 'router_sophos', 'router_fortinet', 'firewall_fortinet', 'firewall_huawei', 'firewall_cisco'].includes(n.type)) {
        ctx.fillStyle = isLight ? '#d97706' : '#f59e0b';
      } else if (['ups', 'termica', 'pdu', 'canal_tension', 'canal_tension_5', 'canal_tension_7', 'transfer'].includes(n.type)) {
        ctx.fillStyle = isLight ? '#dc2626' : '#ef4444';
      } else if (['server', 'servidor_rack', 'servidor_torre'].includes(n.type)) {
        ctx.fillStyle = isLight ? '#059669' : '#10b981';
      }
      ctx.fillRect(nx, ny, nw, nh);
    });

    // 4. Posicionar recuadro del visor (viewport)
    if (dom.minimapViewport) {
      const vx = viewWorldX1 * scale + offsetX;
      const vy = viewWorldY1 * scale + offsetY;
      const vw = (vpW / state.viewport.zoom) * scale;
      const vh = (vpH / state.viewport.zoom) * scale;

      applyMinimapViewportBox(mw, mh, vx, vy, vw, vh);
    }
  }

export function panCanvasFromMinimapCoord(clickX, clickY) {
    if (!minimapBoundsCache || !dom.viewport) return;
    const { scale, offsetX, offsetY } = minimapBoundsCache;
    const targetWorldX = (clickX - offsetX) / scale;
    const targetWorldY = (clickY - offsetY) / scale;

    const vpRect = getViewportRect();
    const vpW = (vpRect && vpRect.width) || dom.viewport.clientWidth || 800;
    const vpH = (vpRect && vpRect.height) || dom.viewport.clientHeight || 600;

    state.viewport.x = vpW / 2 - targetWorldX * state.viewport.zoom;
    state.viewport.y = vpH / 2 - targetWorldY * state.viewport.zoom;

    updateViewportTransform();
  }


// Registrar métodos en el contexto global de aplicación
app.setCanvasMode = setCanvasMode;
app.closeTouchContextMenu = closeTouchContextMenu;
app.showTouchContextMenu = showTouchContextMenu;
app.updateNodeQuickActions = updateNodeQuickActions;
app.updateQuickPastePill = updateQuickPastePill;
app.placePaletteItemAtScreen = placePaletteItemAtScreen;
app.setupCanvasEvents = setupCanvasEvents;
app.applyZoom = applyZoom;
app.updateViewportTransform = updateViewportTransform;
app.fitViewToNodes = fitViewToNodes;
app.screenToWorld = screenToWorld;
app.getCanvasCenterWorld = getCanvasCenterWorld;
app.drawAlignmentGuides = drawAlignmentGuides;
app.clearAlignmentGuides = clearAlignmentGuides;
app.initMinimap = initMinimap;
app.toggleMinimapCollapse = toggleMinimapCollapse;
app.toggleMinimapVisibility = toggleMinimapVisibility;
app.updateMinimapViewportOnly = updateMinimapViewportOnly;
app.updateMinimap = updateMinimap;
app.renderMinimapDirect = renderMinimapDirect;
app.panCanvasFromMinimapCoord = panCanvasFromMinimapCoord;
