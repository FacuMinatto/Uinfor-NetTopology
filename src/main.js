/**
 * NetTopology Studio - Motor principal de la aplicación (Punto de Entrada ES Module)
 * Gestión de Canvas, Nodos, Cables, Bocas, Inspector y Persistencia
 */

import './styles/styles.css';
import './styles/glass.css';
import { state, dom, initDom } from './state/store.js';
import { app } from './core/appContext.js';

// Carga de todos los módulos del núcleo
import './ui/palette.js';
import './core/nodes.js';
import './core/cables.js';
import './core/canvas.js';
import './ui/modals.js';
import './ui/inspector.js';
import './core/zones.js';
import './core/underlay.js';
import './core/layers.js';
import './core/search.js';
import './core/audit.js';
import './core/sheets.js';
import './storage/db.js';
import './state/history.js';
import './export/exportPdf.js';
import './export/exportSvg.js';
import './config/defaultTopology.js';
import './ui/bom.js';
import './ui/topbar.js';
import './collab/peer.js';

import { applyTheme, setupToolbarEvents, setupPanelToggles, setupKeyboardShortcuts, initViewMenu } from './ui/topbar.js';
import { renderPalette } from './ui/palette.js';
import { setupCanvasEvents, updateViewportTransform, initMinimap } from './core/canvas.js';
import { setupSheetEvents } from './core/sheets.js';
import { setupModalEvents } from './ui/modals.js';
import { initBomModal } from './ui/bom.js';
import { initProjectsManager } from './storage/db.js';
import { createHistorySnapshot, updateUndoRedoUI } from './state/history.js';
import { runTopologyAudit } from './core/audit.js';
import { initCollabUI } from './collab/peer.js';

export function init() {
  // Inicializar mapa de referencias DOM
  initDom();

  // Restaurar tema (Oscuro por defecto o Blanco si fue seleccionado)
  try {
    const urlTheme = new URLSearchParams(window.location.search).get('theme');
    const savedTheme = urlTheme || localStorage.getItem('nettopology_theme') || 'dark';
    applyTheme(savedTheme);
    const savedEnc = localStorage.getItem('nettopology_default_encapsulated');
    if (savedEnc !== null) {
      state.defaultEncapsulatedLabels = (savedEnc === 'true');
    }
  } catch (e) {
    console.warn('Error inicializando tema:', e);
  }

  renderPalette();
  setupCanvasEvents();
  setupToolbarEvents();
  setupPanelToggles();
  setupSheetEvents();
  setupModalEvents();
  setupKeyboardShortcuts();

  // Inicializar Menú Vista, Minimapa y Cómputo de Materiales
  initViewMenu();
  initMinimap();
  initBomModal();

  // Inicializar Colaboración P2P WebRTC
  initCollabUI();

  // Inicializar gestor multi-proyecto y restaurar el proyecto activo
  initProjectsManager();

  updateViewportTransform();

  // Inicializar historia con el estado inicial del proyecto
  state.history = [createHistorySnapshot()];
  state.historyIndex = 0;
  updateUndoRedoUI();

  // Diagnóstico topológico inicial
  runTopologyAudit();
}

app.init = init;

// Exponer API interna para pruebas, depuración y extensiones
window.netTopology = app;
window.netTopology.state = state;
window.netTopology.dom = dom;

// Iniciar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export default app;
