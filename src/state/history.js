/**
 * NetTopology - Módulo src/state/history.js
 */

import { state, dom } from '../state/store.js';
import { app } from '../core/appContext.js';
import { DEVICE_ICONS, DEVICE_ICONS_LIGHT, DEVICE_METADATA, CABLE_TYPES, getDeviceIcon, generateSwitchPorts, generateRouterPorts } from '../config/icons.js';
import { STORAGE_PROJECTS_KEY, STORAGE_ACTIVE_ID_KEY, STORAGE_LEGACY_KEY, SHEET_PRESETS, ZONE_COLOR_PALETTES, MAX_HISTORY_STEPS, DEFAULT_GRID_SIZE } from '../config/constants.js';
import { escapeHtml, incrementIp, formatDateForFile, clamp, generateId } from '../utils/helpers.js';
import { renderNodeElement } from '../core/nodes.js';
import { renderConnections } from '../core/cables.js';
import { deselectAll } from '../ui/inspector.js';
import { renderZones } from '../core/zones.js';
import { renderUnderlay } from '../core/underlay.js';
import { getCurrentSheet, updatePaperSheetDisplay, renderSheetsBar } from '../core/sheets.js';
import { updateViewportTransform } from '../core/canvas.js';
import { saveState } from '../storage/db.js';



  // ==========================================================================
  // HISTORIA Y MOTOR DE DESHACER / REHACER (UNDO / REDO)
  // ==========================================================================
  let historyDebounceTimeout = null;

  // Almacén en memoria para no duplicar cadenas Base64 pesadas de planos de fondo en los snapshots de historia
  const underlayImageStore = new Map();
  let underlayImageSeq = 1;

export function pruneUnderlayImageStore() {
    const activeIds = new Set();
    const collectUnderlayId = (u) => {
      if (!u) return;
      if (u.__imgId) activeIds.add(u.__imgId);
      if (typeof u.src === 'string' && u.src.startsWith('__cached_img__:')) {
        activeIds.add(u.src.slice('__cached_img__:'.length));
      }
    };
    collectUnderlayId(state.underlay);
    (state.sheets || []).forEach(s => collectUnderlayId(s?.underlay));
    (state.history || []).forEach(snap => {
      if (typeof snap !== 'string') return;
      const cachedRe = /__cached_img__:([^"\\]+)/g;
      let m;
      while ((m = cachedRe.exec(snap)) !== null) {
        activeIds.add(m[1]);
      }
      const imgIdRe = /"__imgId"\s*:\s*"([^"\\]+)"/g;
      while ((m = imgIdRe.exec(snap)) !== null) {
        activeIds.add(m[1]);
      }
    });
    for (const key of underlayImageStore.keys()) {
      if (!activeIds.has(key)) underlayImageStore.delete(key);
    }
  }

  function extractUnderlayForSnapshot(underlay) {
    if (!underlay || !underlay.src) return underlay;
    if (typeof underlay.src === 'string' && underlay.src.startsWith('__cached_img__:')) {
      return underlay;
    }
    let imageId = underlay.__imgId;
    if (!imageId || (underlayImageStore.has(imageId) && underlayImageStore.get(imageId) !== underlay.src)) {
      do {
        imageId = 'img_' + (underlayImageSeq++);
      } while (underlayImageStore.has(imageId));
      underlay.__imgId = imageId;
    }
    if (!underlayImageStore.has(imageId)) {
      underlayImageStore.set(imageId, underlay.src);
    }
    return {
      ...underlay,
      src: `__cached_img__:${imageId}`
    };
  }

  function restoreUnderlayFromSnapshot(underlay) {
    if (!underlay || !underlay.src) return underlay;
    if (typeof underlay.src === 'string' && underlay.src.startsWith('__cached_img__:')) {
      const imgId = underlay.src.replace('__cached_img__:', '');
      const realSrc = underlayImageStore.get(imgId);
      if (realSrc) {
        return {
          ...underlay,
          __imgId: underlay.__imgId || imgId,
          src: realSrc
        };
      }
    }
    return underlay;
  }

export function createHistorySnapshot() {
    const sanitizedUnderlay = extractUnderlayForSnapshot(state.underlay);
    const currSheet = getCurrentSheet();
    if (currSheet) {
      currSheet.nodes = state.nodes || [];
      currSheet.connections = state.connections || [];
      currSheet.zones = state.zones || [];
      currSheet.underlay = state.underlay ? { ...state.underlay } : null;
      currSheet.viewport = { ...state.viewport };
    }

    const sanitizedSheets = (state.sheets || []).map(s => {
      if (!s.underlay) return s;
      return {
        ...s,
        underlay: extractUnderlayForSnapshot(s.underlay)
      };
    });

    return JSON.stringify({
      nodes: state.nodes,
      connections: state.connections,
      zones: state.zones || [],
      underlay: sanitizedUnderlay,
      sheets: sanitizedSheets,
      activeSheetId: state.activeSheetId,
      currentProjectName: state.currentProjectName
    });
  }

export function pushHistoryState(immediate = false) {
    if (!immediate) {
      clearTimeout(historyDebounceTimeout);
      historyDebounceTimeout = setTimeout(() => {
        executePushHistory();
      }, 180);
      return;
    }
    clearTimeout(historyDebounceTimeout);
    executePushHistory();
  }

export function executePushHistory() {
    try {
      const snapshot = createHistorySnapshot();
      if (state.historyIndex >= 0 && state.history[state.historyIndex] === snapshot) {
        return;
      }
      let shouldPrune = false;
      if (state.historyIndex < state.history.length - 1) {
        state.history = state.history.slice(0, state.historyIndex + 1);
        shouldPrune = true;
      }
      state.history.push(snapshot);
      if (state.history.length > MAX_HISTORY_STEPS) {
        state.history.shift();
        shouldPrune = true;
      }
      if (shouldPrune) {
        pruneUnderlayImageStore();
      }
      state.historyIndex = state.history.length - 1;
      updateUndoRedoUI();
    } catch (e) {
      console.warn('Error al registrar historia:', e);
    }
  }

export function undo() {
    if (state.historyIndex <= 0) return;
    state.historyIndex--;
    applyHistorySnapshot(state.history[state.historyIndex]);
    updateUndoRedoUI();
  }

export function redo() {
    if (state.historyIndex >= state.history.length - 1) return;
    state.historyIndex++;
    applyHistorySnapshot(state.history[state.historyIndex]);
    updateUndoRedoUI();
  }

export function applyHistorySnapshot(snapshotStr) {
    if (!snapshotStr) return;
    try {
      const prevSheetId = state.activeSheetId;
      const data = JSON.parse(snapshotStr);
      state.sheets = (data.sheets || []).map(s => ({
        ...s,
        underlay: restoreUnderlayFromSnapshot(s.underlay)
      }));
      state.activeSheetId = data.activeSheetId || (state.sheets[0] ? state.sheets[0].id : null);
      state.nodes = data.nodes || [];
      state.connections = data.connections || [];
      state.zones = data.zones || [];
      state.underlay = restoreUnderlayFromSnapshot(data.underlay);
      if (data.currentProjectName) {
        state.currentProjectName = data.currentProjectName;
        if (dom.projectTitleInput) {
          dom.projectTitleInput.value = state.currentProjectName;
        }
      }

      // Reconstruir elementos del lienzo
      dom.nodesLayer.innerHTML = '';
      dom.cablesGroup.innerHTML = '';
      dom.labelsLayer.innerHTML = '';
      if (dom.zonesLayer) dom.zonesLayer.innerHTML = '';
      if (dom.underlayLayer) dom.underlayLayer.innerHTML = '';

      renderUnderlay();
      renderZones();
      if (state.nodes.length > 0 && dom.nodesLayer) {
        const nodesFragment = document.createDocumentFragment();
        state.nodes.forEach(node => renderNodeElement(node, nodesFragment));
        dom.nodesLayer.appendChild(nodesFragment);
      }
      renderConnections();
      renderSheetsBar();
      if (state.activeSheetId !== prevSheetId) {
        const activeSheet = getCurrentSheet();
        if (activeSheet && activeSheet.viewport) {
          state.viewport = { ...activeSheet.viewport };
        }
        updateViewportTransform();
      }
      updatePaperSheetDisplay();
      deselectAll();

      // Guardar en disco sin empujar nueva historia
      saveState(false);
    } catch (e) {
      console.error('Error al restaurar historia:', e);
    }
  }

export function updateUndoRedoUI() {
    const canUndo = state.historyIndex > 0;
    const canRedo = state.historyIndex < state.history.length - 1;

    if (dom.btnUndo) {
      dom.btnUndo.disabled = !canUndo;
      dom.btnUndo.classList.toggle('disabled', !canUndo);
    }
    if (dom.btnRedo) {
      dom.btnRedo.disabled = !canRedo;
      dom.btnRedo.classList.toggle('disabled', !canRedo);
    }
  }


// Registrar métodos en el contexto global de aplicación
app.createHistorySnapshot = createHistorySnapshot;
app.pushHistoryState = pushHistoryState;
app.executePushHistory = executePushHistory;
app.undo = undo;
app.redo = redo;
app.applyHistorySnapshot = applyHistorySnapshot;
app.updateUndoRedoUI = updateUndoRedoUI;
