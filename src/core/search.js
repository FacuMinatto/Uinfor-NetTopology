/**
 * NetTopology - Módulo src/core/search.js
 */

import { state, dom } from '../state/store.js';
import { app } from '../core/appContext.js';
import { DEVICE_ICONS, DEVICE_ICONS_LIGHT, DEVICE_METADATA, CABLE_TYPES, getDeviceIcon, generateSwitchPorts, generateRouterPorts } from '../config/icons.js';
import { STORAGE_PROJECTS_KEY, STORAGE_ACTIVE_ID_KEY, STORAGE_LEGACY_KEY, SHEET_PRESETS, ZONE_COLOR_PALETTES, MAX_HISTORY_STEPS, DEFAULT_GRID_SIZE } from '../config/constants.js';
import { escapeHtml, incrementIp, formatDateForFile, clamp, generateId } from '../utils/helpers.js';
import { updateViewportTransform } from './canvas.js';
import { selectElement } from '../ui/inspector.js';
import { closeAllDropdowns } from '../ui/topbar.js';



export function updateSearchSelectionVisuals() {
    if (!dom.searchResultsContainer) return;
    const items = dom.searchResultsContainer.querySelectorAll('.search-result-item');
    items.forEach((item, idx) => {
      item.classList.toggle('selected', idx === searchActiveIndex);
      if (idx === searchActiveIndex) {
        item.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  // ==========================================================================
  // BÚSQUEDA RÁPIDA / SPOTLIGHT (CTRL + F)
  // ==========================================================================
  let searchResultsData = [];
  let searchActiveIndex = -1;

export function openQuickSearchModal() {
    if (!dom.modalSearch) return;
    closeAllDropdowns();
    dom.modalSearch.classList.add('open');
    if (dom.inputQuickSearch) {
      dom.inputQuickSearch.value = '';
      setTimeout(() => dom.inputQuickSearch.focus(), 50);
    }
    renderSearchResults('');
  }

export function closeQuickSearchModal() {
    if (!dom.modalSearch) return;
    dom.modalSearch.classList.remove('open');
    searchActiveIndex = -1;
    searchResultsData = [];
  }

export function renderSearchResults(query) {
    if (!dom.searchResultsContainer) return;
    const q = (query || '').toLowerCase().trim();

    // Buscar en todos los nodos de la hoja activa
    const matches = state.nodes.filter(node => {
      if (!q) return true; // Mostrar todos si está vacío
      const nameMatch = (node.customName || node.name || '').toLowerCase().includes(q);
      const typeMatch = (node.type || '').toLowerCase().includes(q);
      const metaMatch = (DEVICE_METADATA[node.type]?.label || '').toLowerCase().includes(q);
      const ipMatch = (node.ip || '').toLowerCase().includes(q);
      const portMatch = (node.availablePorts || []).some(p => 
        p && p.toLowerCase().includes(q)
      );
      return nameMatch || typeMatch || metaMatch || ipMatch || portMatch;
    });

    searchResultsData = matches;
    searchActiveIndex = matches.length > 0 ? 0 : -1;

    if (dom.searchResultsStats) {
      dom.searchResultsStats.textContent = q
        ? `${matches.length} ${matches.length === 1 ? 'coincidencia encontrada' : 'coincidencias encontradas'}`
        : `Mostrando todos los equipos (${matches.length})`;
    }

    dom.searchResultsContainer.innerHTML = '';

    if (matches.length === 0) {
      dom.searchResultsContainer.innerHTML = `
        <div style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
          No se encontraron equipos ni direcciones IP que coincidan con "${escapeHtml(q)}".
        </div>
      `;
      return;
    }

    matches.slice(0, 30).forEach((node, idx) => {
      const item = document.createElement('div');
      item.className = `search-result-item ${idx === 0 ? 'selected' : ''}`;
      item.dataset.index = idx;

      const typeLabel = DEVICE_METADATA[node.type]?.label || node.type;
      const isLight = state.theme === 'light';
      const iconSvg = typeof getDeviceIcon === 'function' ? getDeviceIcon(node.type, isLight) : (DEVICE_ICONS[node.type] || '');

      // Información de IP
      const displayIp = (node.ip || '').trim() 
        ? `IP: ${node.ip} · Máscara: ${node.mask || '255.255.255.0'}`
        : 'Sin IP configurada';

      item.innerHTML = `
        <div class="search-result-icon">${iconSvg}</div>
        <div class="search-result-info">
          <div class="search-result-title">
            <span>${escapeHtml(node.customName || node.name)}</span>
            <span class="search-result-type-tag">${typeLabel}</span>
          </div>
          <div class="search-result-meta">${escapeHtml(displayIp)}</div>
        </div>
        <div class="search-result-action">Saltar ↵</div>
      `;

      item.addEventListener('click', () => {
        panAndHighlightNode(node.id);
        closeQuickSearchModal();
      });

      dom.searchResultsContainer.appendChild(item);
    });
  }

export function panAndHighlightNode(nodeId) {
    const node = state.nodes.find(n => n.id === nodeId);
    if (!node) return;

    // Centrar la cámara suavemente en el equipo
    const vpW = dom.viewport.clientWidth;
    const vpH = dom.viewport.clientHeight;
    state.viewport.x = (vpW / 2) - (node.x + 52) * state.viewport.zoom;
    state.viewport.y = (vpH / 2) - (node.y + 40) * state.viewport.zoom;
    updateViewportTransform();

    // Seleccionar el nodo
    selectElement('node', node.id);

    // Aplicar pulso luminoso para que el usuario lo ubique al instante
    const el = document.getElementById(node.id);
    if (el) {
      el.classList.remove('node-glow-pulse');
      void el.offsetWidth; // Forzar reflujo
      el.classList.add('node-glow-pulse');
      setTimeout(() => el.classList.remove('node-glow-pulse'), 2500);
    }
  }


export function setupSearchEvents() {
    // Modal Búsqueda Rápida (Spotlight / Ctrl + F)
    if (dom.btnCloseSearchModal) {
      dom.btnCloseSearchModal.addEventListener('click', closeQuickSearchModal);
    }
    if (dom.inputQuickSearch) {
      dom.inputQuickSearch.addEventListener('input', (e) => {
        renderSearchResults(e.target.value);
      });
      dom.inputQuickSearch.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          closeQuickSearchModal();
        } else if (e.key === 'Enter') {
          if (searchResultsData.length > 0) {
            const idx = searchActiveIndex >= 0 ? searchActiveIndex : 0;
            panAndHighlightNode(searchResultsData[idx].id);
            closeQuickSearchModal();
          }
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (searchResultsData.length > 0) {
            searchActiveIndex = (searchActiveIndex + 1) % searchResultsData.length;
            updateSearchSelectionVisuals();
          }
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (searchResultsData.length > 0) {
            searchActiveIndex = (searchActiveIndex - 1 + searchResultsData.length) % searchResultsData.length;
            updateSearchSelectionVisuals();
          }
        }
      });
    }
}


// Registrar métodos en el contexto global de aplicación
app.updateSearchSelectionVisuals = updateSearchSelectionVisuals;
app.openQuickSearchModal = openQuickSearchModal;
app.closeQuickSearchModal = closeQuickSearchModal;
app.renderSearchResults = renderSearchResults;
app.panAndHighlightNode = panAndHighlightNode;
