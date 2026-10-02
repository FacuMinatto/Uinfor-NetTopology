/**
 * NetTopology - Módulo src/core/sheets.js
 */

import { state, dom } from '../state/store.js';
import { app } from '../core/appContext.js';
import { DEVICE_ICONS, DEVICE_ICONS_LIGHT, DEVICE_METADATA, CABLE_TYPES, getDeviceIcon, generateSwitchPorts, generateRouterPorts } from '../config/icons.js';
import { STORAGE_PROJECTS_KEY, STORAGE_ACTIVE_ID_KEY, STORAGE_LEGACY_KEY, SHEET_PRESETS, ZONE_COLOR_PALETTES, MAX_HISTORY_STEPS, DEFAULT_GRID_SIZE } from '../config/constants.js';
import { escapeHtml, incrementIp, formatDateForFile, clamp, generateId } from '../utils/helpers.js';
import { renderNodeElement } from './nodes.js';
import { renderConnections } from './cables.js';
import { updateViewportTransform, updateMinimap } from './canvas.js';
import { deselectAll } from '../ui/inspector.js';
import { renderZones } from './zones.js';
import { renderUnderlay } from './underlay.js';
import { saveState } from '../storage/db.js';



  // ==========================================================================
  // GESTIÓN DE MÚLTIPLES HOJAS / SOLAPAS Y FORMATO DE HOJA (MULTI-SHEET)
  // ==========================================================================

export function getCurrentSheet() {
    if (!Array.isArray(state.sheets) || state.sheets.length === 0) return null;
    let sheet = state.sheets.find(s => s.id === state.activeSheetId);
    if (!sheet) {
      sheet = state.sheets[0];
      state.activeSheetId = sheet.id;
    }
    return sheet;
  }

export function normalizeProjectSheets(project) {
    if (!project) return;
    if (!Array.isArray(project.sheets) || project.sheets.length === 0) {
      project.sheets = [
        {
          id: 'sheet_1',
          name: 'Hoja 1',
          pageSize: 'infinite',
          pageWidth: 1123,
          pageHeight: 794,
          bgTheme: 'white',
          nodes: Array.isArray(project.nodes) ? project.nodes : [],
          connections: Array.isArray(project.connections) ? project.connections : [],
          zones: Array.isArray(project.zones) ? project.zones : [],
          underlay: project.underlay || null,
          viewport: project.viewport || { x: 80, y: 80, zoom: 1 }
        }
      ];
      project.activeSheetId = 'sheet_1';
    } else {
      if (!project.activeSheetId || !project.sheets.some(s => s.id === project.activeSheetId)) {
        project.activeSheetId = project.sheets[0].id;
      }
    }
  }

export function loadSheetData(sheet, resetView = true) {
    if (!sheet) return;

    dom.nodesLayer.innerHTML = '';
    dom.cablesGroup.innerHTML = '';
    dom.labelsLayer.innerHTML = '';
    if (dom.zonesLayer) dom.zonesLayer.innerHTML = '';
    if (dom.underlayLayer) dom.underlayLayer.innerHTML = '';

    state.nodes = sheet.nodes || [];
    state.connections = sheet.connections || [];
    state.zones = sheet.zones || [];
    state.underlay = sheet.underlay ? JSON.parse(JSON.stringify(sheet.underlay)) : null;

    // Normalizar automáticamente puertos antiguos o extensos a los nuevos estándares compactos (E 220V y S 220V)
    const convertOldPortName = (p) => {
      if (!p || typeof p !== 'string') return p;
      const t = p.trim();
      if (t === 'Alimentación 220V' || t === 'Entrada 220V' || t === 'Entrada Línea (220V)' || t === 'Cargador 220V' || t === 'Alimentación 12V/220V') return 'E 220V';
      if (t === 'Salida Carga' || t === 'Salida 220V') return 'S 220V';
      const mSal = t.match(/^Salida\s*(\d+)\s*\(UPS\)$/i);
      if (mSal) return `S 220V (${mSal[1]})`;
      const mPc = t.match(/^Salida\s*PC\s*(\d+)$/i);
      if (mPc) return `S PC ${mPc[1]}`;
      if (t === 'Salida Canal de Tensión') return 'S Canal Tensión';
      const mEntUps = t.match(/^Entrada\s*UPS\s*(\d+)(?:\s*\(S\d+\))?$/i);
      if (mEntUps) return `E UPS ${mEntUps[1]}`;
      return p;
    };

    state.nodes.forEach(n => {
      if (Array.isArray(n.availablePorts)) {
        n.availablePorts = n.availablePorts.map(convertOldPortName);
      }
    });
    state.connections.forEach(c => {
      if (c.fromPort) c.fromPort = convertOldPortName(c.fromPort);
      if (c.toPort) c.toPort = convertOldPortName(c.toPort);
    });

    if (resetView && sheet.viewport) {
      state.viewport = { ...sheet.viewport };
    }

    renderUnderlay();
    renderZones();
    state.nodes.forEach(node => renderNodeElement(node));
    renderConnections();
    deselectAll();
    updateViewportTransform();
    updatePaperSheetDisplay();
  }

export function switchSheet(targetSheetId) {
    if (state.activeSheetId === targetSheetId) return;

    // 1. Guardar la hoja actual en el array en memoria
    const current = getCurrentSheet();
    if (current) {
      current.nodes = state.nodes;
      current.connections = state.connections;
      current.zones = state.zones || [];
      current.underlay = state.underlay ? JSON.parse(JSON.stringify(state.underlay)) : null;
      current.viewport = { ...state.viewport };
    }

    // 2. Establecer nueva hoja activa
    state.activeSheetId = targetSheetId;

    // 3. Cargar datos de la nueva hoja
    const target = getCurrentSheet();
    if (target) {
      loadSheetData(target, true);
    }

    renderSheetsBar();
    saveState();
  }

export function addNewSheet(customName, presetKey = 'infinite') {
    const current = getCurrentSheet();
    if (current) {
      current.nodes = state.nodes;
      current.connections = state.connections;
      current.zones = state.zones || [];
      current.viewport = { ...state.viewport };
    }

    const nextNum = state.sheets.length + 1;
    const name = customName || `Hoja ${nextNum}`;
    const preset = SHEET_PRESETS[presetKey] || SHEET_PRESETS.infinite;

    const newSheet = {
      id: 'sheet_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      name: name,
      pageSize: presetKey,
      pageWidth: preset.width || 1123,
      pageHeight: preset.height || 794,
      bgTheme: 'white',
      nodes: [],
      connections: [],
      zones: [],
      viewport: { x: 80, y: 80, zoom: 1 }
    };

    state.sheets.push(newSheet);
    state.activeSheetId = newSheet.id;
    loadSheetData(newSheet, true);
    renderSheetsBar();
    saveState();
  }

export function duplicateCurrentSheet() {
    const current = getCurrentSheet();
    if (!current) return;

    current.nodes = state.nodes;
    current.connections = state.connections;
    current.zones = state.zones || [];
    current.viewport = { ...state.viewport };

    const idMap = {};
    const clonedNodes = current.nodes.map(n => {
      const newId = 'node_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
      idMap[n.id] = newId;
      return {
        ...JSON.parse(JSON.stringify(n)),
        id: newId
      };
    });

    const clonedConns = current.connections.map(c => {
      return {
        ...JSON.parse(JSON.stringify(c)),
        id: 'cable_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        fromNodeId: idMap[c.fromNodeId] || c.fromNodeId,
        toNodeId: idMap[c.toNodeId] || c.toNodeId
      };
    });

    const clonedZones = (current.zones || []).map(z => ({
      ...JSON.parse(JSON.stringify(z)),
      id: 'zone_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4)
    }));

    const newSheet = {
      id: 'sheet_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      name: `${current.name} (Copia)`,
      pageSize: current.pageSize,
      pageWidth: current.pageWidth,
      pageHeight: current.pageHeight,
      bgTheme: current.bgTheme || 'white',
      nodes: clonedNodes,
      connections: clonedConns,
      zones: clonedZones,
      underlay: current.underlay ? JSON.parse(JSON.stringify(current.underlay)) : null,
      viewport: { ...current.viewport }
    };

    state.sheets.push(newSheet);
    state.activeSheetId = newSheet.id;
    loadSheetData(newSheet, false);
    renderSheetsBar();
    saveState();
  }

export function deleteSheet(sheetId) {
    if (state.sheets.length <= 1) {
      alert('No puedes eliminar la única hoja del proyecto. Puedes crear otra antes de borrar esta.');
      return;
    }

    const target = state.sheets.find(s => s.id === sheetId);
    const sheetName = target ? target.name : 'esta hoja';

    if (confirm(`¿Estás seguro de eliminar "${sheetName}" y todo su diagrama?`)) {
      const idx = state.sheets.findIndex(s => s.id === sheetId);
      state.sheets = state.sheets.filter(s => s.id !== sheetId);

      if (state.activeSheetId === sheetId) {
        const nextActive = state.sheets[Math.max(0, idx - 1)] || state.sheets[0];
        state.activeSheetId = nextActive.id;
        loadSheetData(nextActive, true);
      }

      renderSheetsBar();
      saveState();
    }
  }

export function renameSheet(sheetId, newName) {
    const sheet = state.sheets.find(s => s.id === sheetId);
    if (sheet && newName && newName.trim()) {
      sheet.name = newName.trim();
      renderSheetsBar();
      updatePaperSheetDisplay();
      saveState();
    }
  }

export function updatePaperSheetDisplay() {
    const sheet = getCurrentSheet();
    if (!sheet) return;

    const isInf = sheet.pageSize === 'infinite';
    const preset = SHEET_PRESETS[sheet.pageSize] || SHEET_PRESETS.custom;
    const presetLabel = preset.label || 'Personalizado';

    if (isInf) {
      if (dom.paperSheet) dom.paperSheet.style.display = 'none';
      if (dom.viewport) dom.viewport.classList.remove('has-sheet');
      if (dom.sheetModeText) dom.sheetModeText.textContent = 'Hoja Infinita';
      if (dom.sheetCurrentFormatLabel) dom.sheetCurrentFormatLabel.textContent = 'Hoja Infinita';
      if (dom.optExportSheetBoundsWrap) dom.optExportSheetBoundsWrap.style.display = 'none';
    } else {
      if (dom.viewport) dom.viewport.classList.add('has-sheet');
      if (dom.paperSheet) {
        dom.paperSheet.style.display = 'block';
        dom.paperSheet.style.width = `${sheet.pageWidth}px`;
        dom.paperSheet.style.height = `${sheet.pageHeight}px`;
        dom.paperSheet.className = 'paper-sheet';
        if (dom.paperSheetTag) {
          dom.paperSheetTag.textContent = `${sheet.name} · ${presetLabel} (${sheet.pageWidth} × ${sheet.pageHeight} px)`;
        }
      }
      if (dom.sheetModeText) dom.sheetModeText.textContent = preset.badge || presetLabel;
      if (dom.sheetCurrentFormatLabel) dom.sheetCurrentFormatLabel.textContent = preset.badge || presetLabel;
      if (dom.optExportSheetBoundsWrap) {
        dom.optExportSheetBoundsWrap.style.display = 'block';
        if (dom.lblExportSheetName) dom.lblExportSheetName.textContent = `${sheet.name} (${presetLabel})`;
      }
    }
    updateMinimap();
  }

export function updateSheetNavArrows() {
    const container = dom.sheetsScrollContainer;
    if (!container) return;
    const hasOverflow = container.scrollWidth > container.clientWidth + 4;
    if (dom.btnSheetScrollPrev) {
      dom.btnSheetScrollPrev.style.display = hasOverflow ? 'inline-flex' : 'none';
      dom.btnSheetScrollPrev.disabled = container.scrollLeft <= 2;
    }
    if (dom.btnSheetScrollNext) {
      dom.btnSheetScrollNext.style.display = hasOverflow ? 'inline-flex' : 'none';
      const maxScroll = container.scrollWidth - container.clientWidth;
      dom.btnSheetScrollNext.disabled = container.scrollLeft >= maxScroll - 2;
    }
  }

export function renderSheetsBar() {
    if (!dom.sheetsTabsList) return;
    dom.sheetsTabsList.innerHTML = '';

    state.sheets.forEach(sheet => {
      const isActive = sheet.id === state.activeSheetId;
      const preset = SHEET_PRESETS[sheet.pageSize] || SHEET_PRESETS.custom;
      const isInf = sheet.pageSize === 'infinite';

      const tab = document.createElement('div');
      tab.className = `sheet-tab ${isActive ? 'active' : ''}`;
      tab.dataset.sheetId = sheet.id;
      tab.title = `${sheet.name} (${preset.label || (sheet.pageWidth + '×' + sheet.pageHeight)}) - Clic para ver, doble clic para renombrar`;

      tab.innerHTML = `
        <span class="sheet-tab-icon">
          ${isInf ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18.178 8c5.096 0 5.096 8 0 8-2.673 0-4.63-2.667-6.178-5.333C10.452 7.333 8.495 4.667 5.822 4.667c-5.096 0-5.096 8 0 8 2.673 0 4.63-2.667 6.178-5.333C13.548 4.667 15.505 2 18.178 2z"/></svg>' : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>'}
        </span>
        <span class="sheet-tab-name">${escapeHtml(sheet.name)}</span>
        <span class="sheet-tab-badge">${escapeHtml(preset.badge || 'A medida')}</span>
        <button class="sheet-tab-menu-btn" data-sheet-menu="${sheet.id}" title="Opciones de hoja">⋮</button>
      `;

      tab.addEventListener('click', (e) => {
        if (e.target.closest('.sheet-tab-menu-btn')) return;
        switchSheet(sheet.id);
      });

      tab.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        const newName = prompt('Nuevo nombre para la hoja:', sheet.name);
        if (newName !== null && newName.trim()) {
          renameSheet(sheet.id, newName.trim());
        }
      });

      const menuBtn = tab.querySelector('.sheet-tab-menu-btn');
      menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openSheetContextMenu(e, sheet);
      });

      dom.sheetsTabsList.appendChild(tab);
    });

    updatePaperSheetDisplay();

    // Desplazar suavemente para que la solapa activa sea visible y actualizar flechas
    requestAnimationFrame(() => {
      if (dom.sheetsTabsList && dom.sheetsScrollContainer) {
        const activeTab = dom.sheetsTabsList.querySelector('.sheet-tab.active');
        if (activeTab) {
          activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        }
      }
      updateSheetNavArrows();
    });
  }

  let activeContextMenu = null;
export function closeContextMenu() {
    if (activeContextMenu) {
      activeContextMenu.remove();
      activeContextMenu = null;
    }
  }

  window.addEventListener('click', closeContextMenu);

export function openSheetContextMenu(e, sheet) {
    closeContextMenu();

    const menu = document.createElement('div');
    menu.className = 'sheet-context-menu';
    menu.innerHTML = `
      <button class="sheet-menu-item" data-action="rename">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
        Renombrar Hoja
      </button>
      <button class="sheet-menu-item" data-action="duplicate">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Duplicar Hoja
      </button>
      <button class="sheet-menu-item" data-action="config">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
        Configurar Tamaño (${SHEET_PRESETS[sheet.pageSize]?.badge || 'Personalizado'})
      </button>
      <div style="height: 1px; background: var(--border-color); margin: 3px 0;"></div>
      <button class="sheet-menu-item item-danger" data-action="delete" ${state.sheets.length <= 1 ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        Eliminar Hoja
      </button>
    `;

    const rect = e.target.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.zIndex = '1050';

    // Determinar si abrir hacia abajo (normal, dado que la barra de solapas está arriba) o hacia arriba
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    if (spaceBelow >= 160 || spaceBelow >= spaceAbove) {
      menu.style.top = `${rect.bottom + 4}px`;
      menu.style.bottom = 'auto';
    } else {
      menu.style.bottom = `${window.innerHeight - rect.top + 4}px`;
      menu.style.top = 'auto';
    }

    const leftPos = Math.max(10, Math.min(window.innerWidth - 225, rect.left - 40));
    menu.style.left = `${leftPos}px`;

    menu.addEventListener('click', (evt) => {
      evt.stopPropagation();
      const btn = evt.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      closeContextMenu();

      if (action === 'rename') {
        const newName = prompt('Nuevo nombre para la hoja:', sheet.name);
        if (newName !== null && newName.trim()) renameSheet(sheet.id, newName.trim());
      } else if (action === 'duplicate') {
        duplicateCurrentSheet();
      } else if (action === 'config') {
        switchSheet(sheet.id);
        openSheetConfigModal();
      } else if (action === 'delete') {
        deleteSheet(sheet.id);
      }
    });

    document.body.appendChild(menu);
    activeContextMenu = menu;
  }

export function openSheetConfigModal() {
    const sheet = getCurrentSheet();
    if (!sheet) return;

    dom.cfgSheetName.value = sheet.name;
    dom.cfgSheetPreset.value = sheet.pageSize || 'infinite';
    dom.cfgCustomWidth.value = sheet.pageWidth || 1200;
    dom.cfgCustomHeight.value = sheet.pageHeight || 800;

    dom.cfgCustomDimsBox.style.display = (sheet.pageSize === 'custom') ? 'block' : 'none';
    dom.modalSheetConfig.classList.add('open');
  }

export function closeSheetConfigModal() {
    dom.modalSheetConfig.classList.remove('open');
  }

export function applySheetConfig() {
    const sheet = getCurrentSheet();
    if (!sheet) return;

    const name = dom.cfgSheetName.value.trim() || sheet.name;
    const presetKey = dom.cfgSheetPreset.value;
    const preset = SHEET_PRESETS[presetKey] || SHEET_PRESETS.custom;

    sheet.name = name;
    sheet.pageSize = presetKey;

    if (presetKey === 'custom') {
      sheet.pageWidth = parseInt(dom.cfgCustomWidth.value, 10) || 1200;
      sheet.pageHeight = parseInt(dom.cfgCustomHeight.value, 10) || 800;
    } else if (preset && !preset.isInfinite) {
      sheet.pageWidth = preset.width;
      sheet.pageHeight = preset.height;
    }

    closeSheetConfigModal();
    renderSheetsBar();
    updatePaperSheetDisplay();
    saveState();
  }

export function setupSheetEvents() {
    if (dom.btnAddSheet) {
      dom.btnAddSheet.addEventListener('click', () => addNewSheet());
    }

    if (dom.btnSheetConfigTrigger) {
      dom.btnSheetConfigTrigger.addEventListener('click', openSheetConfigModal);
    }

    if (dom.cfgSheetPreset) {
      dom.cfgSheetPreset.addEventListener('change', (e) => {
        const val = e.target.value;
        dom.cfgCustomDimsBox.style.display = (val === 'custom') ? 'block' : 'none';
        if (SHEET_PRESETS[val] && !SHEET_PRESETS[val].isInfinite) {
          dom.cfgCustomWidth.value = SHEET_PRESETS[val].width;
          dom.cfgCustomHeight.value = SHEET_PRESETS[val].height;
        }
      });
    }

    if (dom.btnCfgSwapDims) {
      dom.btnCfgSwapDims.addEventListener('click', () => {
        const w = dom.cfgCustomWidth.value;
        const h = dom.cfgCustomHeight.value;
        dom.cfgCustomWidth.value = h;
        dom.cfgCustomHeight.value = w;
      });
    }

    if (dom.btnSaveSheetConfig) {
      dom.btnSaveSheetConfig.addEventListener('click', applySheetConfig);
    }

    if (dom.btnCloseSheetConfig) {
      dom.btnCloseSheetConfig.addEventListener('click', closeSheetConfigModal);
    }

    if (dom.btnCancelSheetConfig) {
      dom.btnCancelSheetConfig.addEventListener('click', closeSheetConfigModal);
    }

    // =========================================================================
    // NAVEGACIÓN Y DESPLAZAMIENTO HORIZONTAL DE SOLAPAS (RUEDA MOUSE / TRACKPAD)
    // =========================================================================
    const scrollContainer = dom.sheetsScrollContainer;
    const sheetsBar = dom.sheetsBar;

    if (scrollContainer) {
      // 1. Desplazamiento horizontal con rueda del mouse o gestos de dos dedos de notebook
      const onSheetsWheel = (e) => {
        // En barras de solapas horizontales, la rueda del mouse suele emitir deltaY (vertical),
        // mientras que un touchpad de notebook puede emitir deltaX o deltaY con dos dedos.
        const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        if (delta !== 0) {
          if (scrollContainer.scrollWidth > scrollContainer.clientWidth) {
            e.preventDefault();
            scrollContainer.scrollLeft += delta;
            updateSheetNavArrows();
          }
        }
      };

      scrollContainer.addEventListener('wheel', onSheetsWheel, { passive: false });
      if (sheetsBar && sheetsBar !== scrollContainer) {
        sheetsBar.addEventListener('wheel', onSheetsWheel, { passive: false });
      }

      // 2. Botones de flecha izquierda / derecha
      if (dom.btnSheetScrollPrev) {
        dom.btnSheetScrollPrev.addEventListener('click', () => {
          scrollContainer.scrollBy({ left: -240, behavior: 'smooth' });
          setTimeout(updateSheetNavArrows, 250);
        });
      }

      if (dom.btnSheetScrollNext) {
        dom.btnSheetScrollNext.addEventListener('click', () => {
          scrollContainer.scrollBy({ left: 240, behavior: 'smooth' });
          setTimeout(updateSheetNavArrows, 250);
        });
      }

      // 3. Listener para actualizar estado de flechas (disabled / enable)
      scrollContainer.addEventListener('scroll', () => {
        updateSheetNavArrows();
      }, { passive: true });

      window.addEventListener('resize', () => {
        updateSheetNavArrows();
      });

      // 4. Arrastre con el botón del mouse (Click & Drag para scrolling fluido)
      let isDraggingTabs = false;
      let startMouseX = 0;
      let initialScrollLeft = 0;
      let hasDragged = false;

      scrollContainer.addEventListener('mousedown', (e) => {
        if (e.target.closest('button') || e.target.closest('.sheet-tab-menu-btn')) return;
        isDraggingTabs = true;
        hasDragged = false;
        startMouseX = e.pageX - scrollContainer.offsetLeft;
        initialScrollLeft = scrollContainer.scrollLeft;
      });

      window.addEventListener('mouseup', () => {
        if (isDraggingTabs) {
          isDraggingTabs = false;
          scrollContainer.classList.remove('is-dragging');
        }
      });

      scrollContainer.addEventListener('mousemove', (e) => {
        if (!isDraggingTabs) return;
        const currentX = e.pageX - scrollContainer.offsetLeft;
        const diff = (currentX - startMouseX) * 1.5;
        if (Math.abs(diff) > 4) {
          hasDragged = true;
          scrollContainer.classList.add('is-dragging');
          scrollContainer.scrollLeft = initialScrollLeft - diff;
          updateSheetNavArrows();
        }
      });
    }
  }


// Registrar métodos en el contexto global de aplicación
app.getCurrentSheet = getCurrentSheet;
app.normalizeProjectSheets = normalizeProjectSheets;
app.loadSheetData = loadSheetData;
app.switchSheet = switchSheet;
app.addNewSheet = addNewSheet;
app.duplicateCurrentSheet = duplicateCurrentSheet;
app.deleteSheet = deleteSheet;
app.renameSheet = renameSheet;
app.updatePaperSheetDisplay = updatePaperSheetDisplay;
app.updateSheetNavArrows = updateSheetNavArrows;
app.renderSheetsBar = renderSheetsBar;
app.closeContextMenu = closeContextMenu;
app.openSheetContextMenu = openSheetContextMenu;
app.openSheetConfigModal = openSheetConfigModal;
app.closeSheetConfigModal = closeSheetConfigModal;
app.applySheetConfig = applySheetConfig;
app.setupSheetEvents = setupSheetEvents;
