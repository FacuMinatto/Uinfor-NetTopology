/**
 * NetTopology - Módulo src/state/history.js
 */

import { state, dom } from '../state/store.js';
import { app } from '../core/appContext.js';
import { DEVICE_ICONS, DEVICE_ICONS_LIGHT, DEVICE_METADATA, CABLE_TYPES, getDeviceIcon, generateSwitchPorts, generateRouterPorts } from '../config/icons.js';
import { STORAGE_PROJECTS_KEY, STORAGE_ACTIVE_ID_KEY, STORAGE_LEGACY_KEY, SHEET_PRESETS, ZONE_COLOR_PALETTES, DEFAULT_GRID_SIZE } from '../config/constants.js';
import { escapeHtml, incrementIp, formatDateForFile, clamp, generateId } from '../utils/helpers.js';
import { renderNodeElement } from '../core/nodes.js';
import { renderConnections } from '../core/cables.js';
import { deselectAll } from '../ui/inspector.js';
import { renderZones } from '../core/zones.js';
import { renderUnderlay } from '../core/underlay.js';
import { getCurrentSheet, updatePaperSheetDisplay, renderSheetsBar } from '../core/sheets.js';
import { saveState } from '../storage/db.js';



  // ==========================================================================
  // HISTORIA Y MOTOR DE DESHACER / REHACER (UNDO / REDO)
  // ==========================================================================
  const MAX_HISTORY_STEPS = 60;
  let historyDebounceTimeout = null;

export function createHistorySnapshot() {
    const currSheet = getCurrentSheet();
    if (currSheet) {
      currSheet.nodes = JSON.parse(JSON.stringify(state.nodes));
      currSheet.connections = JSON.parse(JSON.stringify(state.connections));
      currSheet.zones = JSON.parse(JSON.stringify(state.zones || []));
      currSheet.underlay = state.underlay ? JSON.parse(JSON.stringify(state.underlay)) : null;
      currSheet.viewport = { ...state.viewport };
    }
    return JSON.stringify({
      nodes: state.nodes,
      connections: state.connections,
      zones: state.zones || [],
      underlay: state.underlay || null,
      sheets: state.sheets,
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
      if (state.historyIndex < state.history.length - 1) {
        state.history = state.history.slice(0, state.historyIndex + 1);
      }
      state.history.push(snapshot);
      if (state.history.length > MAX_HISTORY_STEPS) {
        state.history.shift();
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
      const data = JSON.parse(snapshotStr);
      state.sheets = data.sheets || [];
      state.activeSheetId = data.activeSheetId || (state.sheets[0] ? state.sheets[0].id : null);
      state.nodes = data.nodes || [];
      state.connections = data.connections || [];
      state.zones = data.zones || [];
      state.underlay = data.underlay || null;
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
      state.nodes.forEach(node => renderNodeElement(node));
      renderConnections();
      renderSheetsBar();
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
