/**
 * NetTopology - Módulo src/core/layers.js
 */

import { state, dom } from '../state/store.js';
import { app } from '../core/appContext.js';
import { DEVICE_ICONS, DEVICE_ICONS_LIGHT, DEVICE_METADATA, CABLE_TYPES, getDeviceIcon, generateSwitchPorts, generateRouterPorts } from '../config/icons.js';
import { STORAGE_PROJECTS_KEY, STORAGE_ACTIVE_ID_KEY, STORAGE_LEGACY_KEY, SHEET_PRESETS, ZONE_COLOR_PALETTES, MAX_HISTORY_STEPS, DEFAULT_GRID_SIZE } from '../config/constants.js';
import { escapeHtml, incrementIp, formatDateForFile, clamp, generateId } from '../utils/helpers.js';
import { renderConnections } from './cables.js';
import { renderNodeElement } from './nodes.js';
import { showToast } from '../storage/db.js';



  // ==========================================================================
  // GESTIÓN DE CAPAS TÉCNICAS (FÍSICO, LÓGICO, ELECTRICIDAD)
  // ==========================================================================
export function setActiveLayer(layer) {
    const validLayers = ['all', 'physical', 'logical', 'power'];
    state.activeLayer = validLayers.includes(layer) ? layer : 'all';

    // Actualizar items activos en el menú de capas
    document.querySelectorAll('.btn-layer-menu-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.layer === state.activeLayer);
    });

    // Actualizar indicador y dot del botón principal "Capas"
    if (dom.indicatorActiveLayerDot) {
      dom.indicatorActiveLayerDot.className = 'layer-dot';
      if (state.activeLayer === 'logical') dom.indicatorActiveLayerDot.classList.add('dot-logical');
      else if (state.activeLayer === 'physical') dom.indicatorActiveLayerDot.classList.add('dot-physical');
      else if (state.activeLayer === 'power') dom.indicatorActiveLayerDot.classList.add('dot-power');
      else dom.indicatorActiveLayerDot.style.display = 'none';

      if (state.activeLayer !== 'all') dom.indicatorActiveLayerDot.style.display = 'inline-block';
    }

    if (dom.labelActiveLayerBtn) {
      const labels = {
        logical: 'Lógico',
        physical: 'Físico',
        power: 'Electricidad',
        all: 'Capas'
      };
      dom.labelActiveLayerBtn.textContent = labels[state.activeLayer] || 'Capas';
    }

    // Re-renderizar conexiones con el nuevo filtro
    renderConnections();

    // Re-evaluar atenuación visual de nodos
    state.nodes.forEach(node => {
      const el = document.getElementById(node.id);
      if (el) renderNodeElement(node);
    });

    const layerNames = {
      all: 'Todas las capas visibles',
      physical: 'Capa Física activa (Cableado y Bocas)',
      logical: 'Capa Lógica activa (VLANs, Trunks e IPs)',
      power: 'Capa Eléctrica activa (220V y UPS)'
    };
    showToast(layerNames[state.activeLayer] || 'Capa cambiada', 'info');
  }


// Registrar métodos en el contexto global de aplicación
app.setActiveLayer = setActiveLayer;
