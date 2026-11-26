/**
 * NetTopology - Bootstrap Diferido del Espacio de Trabajo (Lazy-Loaded Post-Login)
 */

import { state, dom, initDom } from '../state/store.js';

import '../ui/palette.js';
import '../core/nodes.js';
import '../core/cables.js';
import '../core/canvas.js';
import '../ui/modals.js';
import '../ui/inspector.js';
import '../core/zones.js';
import '../core/underlay.js';
import '../core/layers.js';
import '../core/search.js';
import '../core/audit.js';
import '../core/sheets.js';
import '../storage/db.js';
import '../state/history.js';
import '../config/defaultTopology.js';
import '../ui/topbar.js';
import '../collab/peer.js';

import { applyStyle, setupToolbarEvents, setupPanelToggles, setupKeyboardShortcuts, initViewMenu } from '../ui/topbar.js';
import { renderPalette, cleanupPaletteEvents } from '../ui/palette.js';
import { setupCanvasEvents, cleanupCanvasEvents, updateViewportTransform, fitViewToNodes, initMinimap } from '../core/canvas.js';
import { cleanupUnderlayEvents } from '../core/underlay.js';
import { setupSheetEvents } from '../core/sheets.js';
import { setupModalEvents } from '../ui/modals.js';
import { initProjectsManager } from '../storage/db.js';
import { createHistorySnapshot, updateUndoRedoUI } from '../state/history.js';
import { runTopologyAudit } from '../core/audit.js';
import { initCollabUI, processPendingRoomJoin, leaveCollabSession } from '../collab/peer.js';
import { normalizeRoomCode, isValidRoomCode } from '../collab/syncHelpers.js';
import { bindLogoutButton } from '../auth/firebase.js';
import workspaceShellHtml from './workspaceShell.html?raw';
import uinforLogoUrl from '../../Uinforlogo2.png';

let workspaceInitialized = false;

export async function mountAndInitWorkspace() {
  const workspaceRoot = document.getElementById('workspace-root');
  if (workspaceRoot && workspaceRoot.innerHTML.trim() === '') {
    workspaceRoot.innerHTML = workspaceShellHtml.replace(/src="Uinforlogo2\.png"/g, `src="${uinforLogoUrl}"`);
  }

  initDom();
  applyStyle(state.style || 'default');
  bindLogoutButton();

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    if (roomParam) {
      const cleanRoom = normalizeRoomCode(roomParam);
      if (isValidRoomCode(cleanRoom)) {
        state.collab.pendingRoomCode = cleanRoom;
      } else {
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('room');
        window.history.replaceState({}, '', cleanUrl.toString());
      }
    }
  } catch (e) {}

  if (!workspaceInitialized) {
    workspaceInitialized = true;

    renderPalette();
    setupCanvasEvents();
    setupToolbarEvents();
    setupPanelToggles();
    setupSheetEvents();
    setupModalEvents();
    setupKeyboardShortcuts();

    initViewMenu();
    initMinimap();

    await initProjectsManager();
    initCollabUI();

    const isDefaultViewport = state.viewport.x === 80 && state.viewport.y === 80 && state.viewport.zoom === 1;
    if (isDefaultViewport && state.nodes.length > 0 && dom.viewport) {
      const rect = dom.viewport.getBoundingClientRect();
      const maxScreenY = Math.max(...state.nodes.map(n => n.y + 110)) + state.viewport.y;
      const maxScreenX = Math.max(...state.nodes.map(n => n.x + 104)) + state.viewport.x;
      if (maxScreenY > (rect.height - 96) || maxScreenX > (rect.width - 40)) {
        fitViewToNodes();
      } else {
        updateViewportTransform();
      }
    } else {
      updateViewportTransform();
    }

    if (!state.history || state.history.length === 0) {
      state.history = [createHistorySnapshot()];
      state.historyIndex = 0;
      updateUndoRedoUI();
    }

    runTopologyAudit();
  }

  processPendingRoomJoin();
}

export function unmountWorkspace() {
  leaveCollabSession(false);
  cleanupCanvasEvents();
  cleanupUnderlayEvents();
  cleanupPaletteEvents();
  if (setupToolbarEvents._abort) {
    setupToolbarEvents._abort.abort();
    setupToolbarEvents._abort = null;
  }
  if (setupKeyboardShortcuts._abort) {
    setupKeyboardShortcuts._abort.abort();
    setupKeyboardShortcuts._abort = null;
  }
  if (setupSheetEvents._abort) {
    setupSheetEvents._abort.abort();
    setupSheetEvents._abort = null;
  }

  const workspaceRoot = document.getElementById('workspace-root');
  if (workspaceRoot) {
    workspaceRoot.innerHTML = '';
  }

  workspaceInitialized = false;

  const quickActionsBar = document.getElementById('node-quick-actions');
  if (quickActionsBar) {
    quickActionsBar.remove();
  }

  const quickPastePill = document.getElementById('quick-paste-pill');
  if (quickPastePill) {
    quickPastePill.remove();
  }

  const layersMenu = document.getElementById('dropdown-layers-menu');
  if (layersMenu) {
    layersMenu.remove();
  }

  state.selection = { type: null, id: null, ids: [] };
  state.selectedNodeIds.clear();
  state.selectedZoneIds.clear();
  state.isConnecting = false;
  state.connectingSourceNodeId = null;
  state.isDraggingNode = false;
  state.isPanning = false;
  state.draggingNodeIds = null;
  state.isResizingZone = false;
  state.clipboard = null;
  state.connectStartPos = null;

  initDom();
}
