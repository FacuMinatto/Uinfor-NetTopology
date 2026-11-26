/**
 * NetTopology - Módulo src/ui/topbar.js
 */

import { state, dom } from '../state/store.js';
import { app } from '../core/appContext.js';
import { SHEET_PRESETS } from '../config/constants.js';
import { renderPalette } from './palette.js';
import { createNode, deleteNode, duplicateSelectedNodes, deleteSelectedNodes, renderNodeElement, nudgeSelectedElements } from '../core/nodes.js';
import { deleteConnection, renderConnections } from '../core/cables.js';
import { setCanvasMode, applyZoom, updateViewportTransform, fitViewToNodes, getCanvasCenterWorld, toggleMinimapVisibility, updateMinimap } from '../core/canvas.js';
import { closeCableModal, openIpInventoryModal, closeIpInventoryModal, exportIpInventoryCsv, loadExportPdfModule, loadExportSvgModule } from './modals.js';
import { deselectAll, selectAllNodes, renderInspector, flushPendingInspectorRender } from './inspector.js';
import { deleteZone, renderZones } from '../core/zones.js';
import { renderUnderlay, openUnderlayModal, closeUnderlayModal, handleUnderlayFileSelect, processUnderlayFile, deleteUnderlay, fitUnderlayToCurrentSheet, resetUnderlayPosition, toggleUnderlayVisibility } from '../core/underlay.js';
import { setActiveLayer } from '../core/layers.js';
import { openQuickSearchModal, closeQuickSearchModal } from '../core/search.js';
import { renderTopologyAuditModal, openTopologyAuditModal, closeTopologyAuditModal, getAuditFilter } from '../core/audit.js';
import { getCurrentSheet, updatePaperSheetDisplay, renderSheetsBar, closeSheetConfigModal, closeContextMenu } from '../core/sheets.js';
import { undo, redo } from '../state/history.js';
import { saveState, createNewProject, showToast, saveProjectToFile, openProjectFilePicker, exportProjectToFile, importProjectFromFile, openProjectsModal, closeProjectsModal, unlinkDiskFile, linkProjectToDiskFile, performDiskAutoSave, getDiskFileStatus, getDiskFileHandle } from '../storage/db.js';
import { loadDefaultTopology, snapAllNodesAndConnectionsToGrid } from '../config/defaultTopology.js';
import { closeCollabModal } from '../collab/peer.js';

let bomModulePromise = null;
function openBomModalLazy() {
  if (!bomModulePromise) {
    bomModulePromise = import('./bom.js');
  }
  return bomModulePromise.then((m) => {
    m.initBomModal();
    m.openBomModal();
  });
}



  // ==========================================================================
  // MENÚS DESPLEGABLES DE LA BARRA SUPERIOR (TOPBAR)
  // ==========================================================================
export function toggleDropdown(dropdownEl) {
    if (!dropdownEl) return;
    const isOpen = dropdownEl.classList.contains('show');
    closeAllDropdowns();
    if (!isOpen) {
      dropdownEl.classList.add('show');
    }
  }

export function closeAllDropdowns() {
    document.querySelectorAll('.dropdown-menu.show').forEach(el => el.classList.remove('show'));
  }

function setLayersMenuOpen(isOpen) {
    const wrap = dom.canvasLayersDropdownWrap;
    const menu = dom.dropdownLayersMenu;
    const trigger = dom.btnToggleLayersDropdown;
    if (!wrap) return;

    wrap.classList.toggle('open', isOpen);
    if (!menu) return;

    if (!isOpen) {
      menu.classList.remove('open');
      return;
    }

    if (typeof document !== 'undefined' && menu.parentElement !== document.body) {
      menu.classList.add('is-portaled');
      document.body.appendChild(menu);
    }
    menu.classList.add('open');

    if (trigger && typeof trigger.getBoundingClientRect === 'function') {
      const btnRect = trigger.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      const vw = window.innerWidth || 1024;
      const vh = window.innerHeight || 768;
      const menuW = menuRect.width || 195;
      const gap = document.body?.getAttribute('data-style') === 'glass' ? 10 : 8;
      const left = Math.max(8, Math.min(btnRect.right - menuW, vw - menuW - 8));
      const bottom = Math.max(8, vh - btnRect.top + gap);
      menu.style.left = `${Math.round(left)}px`;
      menu.style.bottom = `${Math.round(bottom)}px`;
      menu.style.top = 'auto';
      menu.style.right = 'auto';
    }
  }

export function closeOpenModals() {
    let closed = false;
    if (document.querySelectorAll('.dropdown-menu.show').length > 0) {
      closeAllDropdowns();
      closed = true;
    }
    if (dom.canvasLayersDropdownWrap?.classList.contains('open') || dom.dropdownLayersMenu?.classList.contains('open')) {
      setLayersMenuOpen(false);
      closed = true;
    }
    if (document.querySelector('.sheet-context-menu')) {
      closeContextMenu();
      closed = true;
    }
    if (app.closeTouchContextMenu?.()) {
      closed = true;
    }

    const openModalIds = new Set(
      Array.from(document.querySelectorAll('.modal-overlay.open')).map(el => el.id)
    );
    if (openModalIds.size === 0) return closed;

    if (openModalIds.has('modal-cable')) closeCableModal();
    if (openModalIds.has('modal-shortcuts') && dom.modalShortcuts) dom.modalShortcuts.classList.remove('open');
    if (openModalIds.has('modal-export') && dom.modalExport) dom.modalExport.classList.remove('open');
    if (openModalIds.has('modal-sheet-config')) closeSheetConfigModal();
    if (openModalIds.has('modal-projects')) closeProjectsModal();
    if (openModalIds.has('modal-search')) closeQuickSearchModal();
    if (openModalIds.has('modal-ip-inventory')) closeIpInventoryModal();
    if (openModalIds.has('modal-bom')) app.closeBomModal?.();
    if (openModalIds.has('modal-topology-audit')) closeTopologyAuditModal();
    if (openModalIds.has('modal-underlay')) closeUnderlayModal();
    if (openModalIds.has('modal-collab')) closeCollabModal();

    document.querySelectorAll('.modal-overlay.open').forEach(el => el.classList.remove('open'));
    if (document.activeElement && document.activeElement.closest('.modal-overlay:not(.open)')) {
      document.activeElement.blur();
    }
    return true;
  }

  // ==========================================================================
  // MENÚ VISTA Y CONTROLES VISUALES
  // ==========================================================================
export function initViewMenu() {
    try {
      const savedGrid = localStorage.getItem('nettopology_grid_visible');
      if (savedGrid !== null) {
        state.gridVisible = (savedGrid === 'true');
      }
      const savedGuides = localStorage.getItem('nettopology_smart_guides');
      if (savedGuides !== null) {
        state.smartGuidesEnabled = (savedGuides === 'true');
      }
    } catch (e) {}

    if (dom.viewport) {
      dom.viewport.classList.toggle('hide-grid', !state.gridVisible);
    }
    if (dom.checkViewGrid) {
      dom.checkViewGrid.textContent = state.gridVisible ? '✓' : '';
    }
    if (dom.checkViewGuides) {
      dom.checkViewGuides.textContent = state.smartGuidesEnabled ? '✓' : '';
    }
    if (dom.checkViewSnap) {
      dom.checkViewSnap.textContent = state.snapToGrid ? '✓' : '';
      dom.checkViewSnap.style.display = state.snapToGrid ? 'inline' : 'none';
    }
    if (dom.checkViewBridges) {
      dom.checkViewBridges.textContent = state.cableBridgesEnabled ? '✓' : '';
      dom.checkViewBridges.style.display = state.cableBridgesEnabled ? 'inline' : 'none';
    }
  }

export function toggleGridVisibility(forceState) {
    state.gridVisible = (typeof forceState === 'boolean') ? forceState : !state.gridVisible;
    if (dom.viewport) {
      dom.viewport.classList.toggle('hide-grid', !state.gridVisible);
    }
    if (dom.checkViewGrid) {
      dom.checkViewGrid.textContent = state.gridVisible ? '✓' : '';
    }
    try {
      localStorage.setItem('nettopology_grid_visible', state.gridVisible ? 'true' : 'false');
    } catch (e) {}
  }

export function toggleSmartGuides(forceState) {
    state.smartGuidesEnabled = (typeof forceState === 'boolean') ? forceState : !state.smartGuidesEnabled;
    if (dom.checkViewGuides) {
      dom.checkViewGuides.textContent = state.smartGuidesEnabled ? '✓' : '';
    }
    try {
      localStorage.setItem('nettopology_smart_guides', state.smartGuidesEnabled ? 'true' : 'false');
    } catch (e) {}
    showToast(`Guías Magnéticas: ${state.smartGuidesEnabled ? 'Activadas' : 'Desactivadas'}`);
  }

  // ==========================================================================
  // EVENTOS DE LA BARRA DE HERRAMIENTAS
  // ==========================================================================
export function setupToolbarEvents() {
    // Deshacer (Undo) / Rehacer (Redo)
    if (dom.btnUndo) {
      dom.btnUndo.addEventListener('click', () => undo());
    }
    if (dom.btnRedo) {
      dom.btnRedo.addEventListener('click', () => redo());
    }

    // Gestor de Proyectos ("Mis Proyectos")
    if (dom.btnProjectsMgr) {
      dom.btnProjectsMgr.addEventListener('click', openProjectsModal);
    }

    // Renombrar proyecto activo directamente desde la barra superior
    if (dom.projectTitleInput) {
      dom.projectTitleInput.addEventListener('input', (e) => {
        state.currentProjectName = e.target.value.trim() || 'Sin Título';
        saveState();
      });
    }

    // Nuevo Proyecto
    document.getElementById('btn-new').addEventListener('click', () => {
      const name = prompt('Ingresa el nombre para el nuevo proyecto:', 'Nueva Topología');
      if (name !== null) {
        createNewProject(name);
      }
    });

    // Abrir / Importar archivo de proyecto (.netdiag / .json) desde la PC
    const btnOpenEl = document.getElementById('btn-open');
    if (btnOpenEl) {
      btnOpenEl.addEventListener('click', () => {
        openProjectFilePicker();
      });
    }

    dom.fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        importProjectFromFile(e.target.files[0]);
        dom.fileInput.value = '';
      }
    });

    // Guardar (Pisar archivo en disco o pedir carpeta la primera vez)
    const btnSaveEl = document.getElementById('btn-save');
    if (btnSaveEl) {
      btnSaveEl.addEventListener('click', () => {
        saveProjectToFile(false);
      });
    }

    // Guardar como... (Elegir nueva carpeta o nombre en disco)
    if (dom.btnSaveAs) {
      dom.btnSaveAs.addEventListener('click', () => {
        saveProjectToFile(true);
      });
    }

    // Vincular a archivo local en PC (Auto-guardado continuo en PC)
    if (dom.btnLinkDiskFile) {
      dom.btnLinkDiskFile.addEventListener('click', () => {
        linkProjectToDiskFile();
      });
    }

    // Clic en la insignia del archivo vinculado para guardar rápidamente o autorizar
    if (dom.diskFileBadge) {
      dom.diskFileBadge.addEventListener('click', async (e) => {
        // Si se hizo clic en el botón de desvincular (x)
        if (e.target.closest('#btn-unlink-disk-file') || e.target.classList.contains('btn-unlink-disk-file')) {
          e.stopPropagation();
          const handle = getDiskFileHandle();
          const fileName = handle ? handle.name : 'este archivo';
          if (confirm(`¿Desvincular "${fileName}" del proyecto actual?\nEl diagrama seguirá guardándose automáticamente en este navegador.`)) {
            await unlinkDiskFile();
          }
          return;
        }

        // Si requiere permisos de lectura/escritura (recarga de pestaña en Chrome)
        const status = getDiskFileStatus();
        const handle = getDiskFileHandle();
        if (status === 'needs-permission' && handle && handle.requestPermission) {
          try {
            const req = await handle.requestPermission({ mode: 'readwrite' });
            if (req === 'granted') {
              showToast(`Permiso otorgado para "${handle.name}". Auto-guardado en PC activo.`, 'success');
              await performDiskAutoSave(true);
            } else {
              showToast('No se otorgaron permisos para escribir en el archivo.', 'warning');
            }
          } catch (err) {
            saveProjectToFile(false);
          }
          return;
        }

        // Si ya está vinculado y sincronizado, forzar guardado inmediato
        saveProjectToFile(false);
      });
    }

    // Exportar Imagen / Plano (abre modal para elegir Formato PNG/SVG, Blanco y Negro / Modo Oscuro)
    document.getElementById('btn-export-png').addEventListener('click', () => {
      const currSheet = getCurrentSheet();
      if (currSheet && currSheet.pageSize !== 'infinite') {
        if (dom.optExportSheetBoundsWrap) dom.optExportSheetBoundsWrap.style.display = 'block';
        if (dom.lblExportSheetName) {
          const presetName = (SHEET_PRESETS[currSheet.pageSize]?.name || currSheet.pageSize).toUpperCase();
          dom.lblExportSheetName.textContent = `${presetName} (${currSheet.pageWidth}×${currSheet.pageHeight}px)`;
        }
      } else {
        if (dom.optExportSheetBoundsWrap) dom.optExportSheetBoundsWrap.style.display = 'none';
      }

      // Restaurar autor, empresa y escala desde localStorage si están vacíos o migrar Uinfor Networks a Uinfor
      try {
        const savedAuthor = localStorage.getItem('nettopology_author');
        let savedCompany = localStorage.getItem('nettopology_company');
        const savedScale = localStorage.getItem('nettopology_scale');
        if (savedCompany === 'Uinfor Networks') {
          savedCompany = 'Uinfor';
          localStorage.setItem('nettopology_company', 'Uinfor');
        }
        const inpAuthor = document.getElementById('inp-export-author');
        const inpCompany = document.getElementById('inp-export-company');
        const inpScale = document.getElementById('inp-export-scale');
        if (savedAuthor && inpAuthor && !inpAuthor.value) inpAuthor.value = savedAuthor;
        if (inpCompany) {
          if (savedCompany) {
            inpCompany.value = savedCompany;
          } else if (!inpCompany.value || inpCompany.value === 'Uinfor Networks') {
            inpCompany.value = 'Uinfor';
          }
        }
        if (inpScale && savedScale) {
          inpScale.value = savedScale;
        }
      } catch (e) {}

      // Sincronizar estado visual de las tarjetas según el radio activo
      document.querySelectorAll('.export-theme-card').forEach(card => {
        const r = card.querySelector('input[name="export-theme"]');
        card.classList.toggle('selected', Boolean(r && r.checked));
      });

      // Sincronizar pills de capa de exportación
      const inpExportLayer = document.getElementById('inp-export-layer');
      if (inpExportLayer) {
        inpExportLayer.value = 'current';
        document.querySelectorAll('#wrap-export-layer-pills .export-layer-card').forEach(pill => {
          pill.classList.toggle('active', pill.dataset.exportLayer === 'current');
        });
        const badgeSummary = document.getElementById('badge-export-layer-summary');
        if (badgeSummary) {
          badgeSummary.textContent = 'Capa en pantalla';
        }
      }

      loadExportPdfModule().then((m) => m.updateExportPagingUI());

      dom.modalExport.classList.add('open');
    });

    // Cargar ejemplo
    document.getElementById('btn-example').addEventListener('click', () => {
      if (confirm('¿Cargar la topología corporativa de ejemplo en el proyecto actual?')) {
        loadDefaultTopology();
      }
    });

    // Zoom flotante
    document.getElementById('btn-zoom-in').addEventListener('click', () => applyZoom(1.15));
    document.getElementById('btn-zoom-out').addEventListener('click', () => applyZoom(1 / 1.15));
    // Restablecer vista a 100%
    document.getElementById('btn-zoom-reset').addEventListener('click', () => {
      state.viewport.x = 80;
      state.viewport.y = 80;
      state.viewport.zoom = 1;
      updateViewportTransform();
    });

    // Centrar y encuadrar todos los equipos en la pantalla (Hoja Infinita)
    const btnFit = document.getElementById('btn-fit-screen');
    if (btnFit) {
      btnFit.addEventListener('click', fitViewToNodes);
    }

    // Selector Flotante de Capas Técnicas (Menú Desplegable con 3 capas técnicas + Todo)
    if (dom.btnToggleLayersDropdown && dom.canvasLayersDropdownWrap) {
      dom.btnToggleLayersDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = dom.canvasLayersDropdownWrap.classList.contains('open');
        closeAllDropdowns();
        setLayersMenuOpen(!isOpen);
      });
    }

    document.querySelectorAll('.btn-layer-menu-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const targetLayer = btn.dataset.layer || 'all';
        setActiveLayer(targetLayer);
        setLayersMenuOpen(false);
      });
    });

    // Seleccionar todos los equipos
    if (dom.btnSelectAll) {
      dom.btnSelectAll.addEventListener('click', () => {
        selectAllNodes();
      });
    }

    // Botones de modo: Seleccionar vs Mover Lienzo y Herramienta Texto
    function addNewTextBadgeAtCenter() {
      if (state.readOnlyLock) {
        notifyReadOnlyBlocked();
        return;
      }
      const center = getCanvasCenterWorld();
      const node = createNode('text_badge', Math.round(center.x - 45), Math.round(center.y - 13), {
        name: '192.168.1.0/24',
        ip: '192.168.1.0/24',
        badgeColor: 'emerald'
      });
      saveState();
      showToast('Recuadro de texto / IP agregado. Doble clic para editar.', 'success');
      setTimeout(() => {
        const inp = document.getElementById('prop-text-badge-val');
        if (inp) {
          inp.focus();
          inp.select();
        }
      }, 60);
    }

    if (dom.btnModeSelect) {
      dom.btnModeSelect.addEventListener('click', () => setCanvasMode('select', { explicit: true }));
    }
    if (dom.btnModePan) {
      dom.btnModePan.addEventListener('click', () => setCanvasMode('pan'));
    }
    if (dom.btnModeConnect) {
      dom.btnModeConnect.addEventListener('click', () => setCanvasMode(state.canvasMode === 'connect' ? 'select' : 'connect'));
    }
    if (dom.btnToggleReadOnly) {
      dom.btnToggleReadOnly.addEventListener('click', () => toggleReadOnlyLock());
    }
    if (dom.btnAddTextBadge) {
      dom.btnAddTextBadge.addEventListener('click', () => addNewTextBadgeAtCenter());
    }

    // Menús desplegables estilo suite en la barra superior (TopBar)
    if (dom.btnMenuFileTrigger && dom.dropdownFile) {
      dom.btnMenuFileTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdown(dom.dropdownFile);
      });
    }

    if (dom.btnMenuEditTrigger && dom.dropdownEdit) {
      dom.btnMenuEditTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdown(dom.dropdownEdit);
      });
    }

    if (dom.btnExportDropdownTrigger && dom.dropdownExport) {
      dom.btnExportDropdownTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdown(dom.dropdownExport);
      });
    }

    // Menú Vista en la cabecera
    if (dom.btnMenuViewTrigger && dom.dropdownView) {
      dom.btnMenuViewTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdown(dom.dropdownView);
      });
    }

    // Menú Cuenta / Sesión Firebase en la cabecera
    if (dom.btnAuthUserTrigger && dom.dropdownAuthUser) {
      dom.btnAuthUserTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdown(dom.dropdownAuthUser);
      });
    }

    if (dom.menuViewStyleDefault) {
      dom.menuViewStyleDefault.addEventListener('click', () => {
        closeAllDropdowns();
        applyStyle('default', true);
      });
    }
    if (dom.menuViewStyleGlass) {
      dom.menuViewStyleGlass.addEventListener('click', () => {
        closeAllDropdowns();
        applyStyle('glass', true);
      });
    }
    if (dom.menuViewStyleObsidian) {
      dom.menuViewStyleObsidian.addEventListener('click', () => {
        closeAllDropdowns();
        applyStyle('obsidian', true);
      });
    }
    if (dom.menuViewToggleMinimap) {
      dom.menuViewToggleMinimap.addEventListener('click', () => {
        closeAllDropdowns();
        toggleMinimapVisibility();
      });
    }
    if (dom.menuViewToggleGrid) {
      dom.menuViewToggleGrid.addEventListener('click', () => {
        closeAllDropdowns();
        toggleGridVisibility();
      });
    }
    if (dom.menuViewToggleGuides) {
      dom.menuViewToggleGuides.addEventListener('click', () => {
        closeAllDropdowns();
        toggleSmartGuides();
      });
    }
    if (dom.menuViewToggleSnap) {
      dom.menuViewToggleSnap.addEventListener('click', () => {
        closeAllDropdowns();
        state.snapToGrid = !state.snapToGrid;
        if (dom.checkViewSnap) dom.checkViewSnap.style.display = state.snapToGrid ? 'inline' : 'none';
        if (state.snapToGrid) {
          snapAllNodesAndConnectionsToGrid();
        }
        showToast(state.snapToGrid ? 'Ajuste a cuadrícula (Snap) activado' : 'Ajuste a cuadrícula (Snap) desactivado', 'info');
      });
    }
    if (dom.menuViewToggleBridges) {
      dom.menuViewToggleBridges.addEventListener('click', () => {
        closeAllDropdowns();
        state.cableBridgesEnabled = !state.cableBridgesEnabled;
        if (dom.checkViewBridges) dom.checkViewBridges.style.display = state.cableBridgesEnabled ? 'inline' : 'none';
        try {
          localStorage.setItem('net_cable_bridges', state.cableBridgesEnabled ? 'true' : 'false');
        } catch (e) {}
        renderConnections();
        showToast(state.cableBridgesEnabled ? 'Puentes de cable activados' : 'Puentes de cable desactivados', 'info');
      });
    }
    if (dom.menuViewFit) {
      dom.menuViewFit.addEventListener('click', () => {
        closeAllDropdowns();
        fitViewToNodes();
      });
    }
    if (dom.menuViewResetZoom) {
      dom.menuViewResetZoom.addEventListener('click', () => {
        closeAllDropdowns();
        state.viewport.x = 80;
        state.viewport.y = 80;
        state.viewport.zoom = 1;
        updateViewportTransform();
      });
    }

    // Duplicar selección desde el menú Editar
    if (dom.menuBtnDuplicate) {
      dom.menuBtnDuplicate.addEventListener('click', () => {
        closeAllDropdowns();
        duplicateSelectedNodes();
      });
    }

    // Abrir Cómputo de Materiales (BOM) desde el menú Exportar
    if (dom.btnOpenBomMenu) {
      dom.btnOpenBomMenu.addEventListener('click', () => {
        closeAllDropdowns();
        openBomModalLazy();
      });
    }

    // Acciones de los menús
    if (dom.menuBtnUndo) {
      dom.menuBtnUndo.addEventListener('click', () => {
        closeAllDropdowns();
        undo();
      });
    }
    if (dom.menuBtnRedo) {
      dom.menuBtnRedo.addEventListener('click', () => {
        closeAllDropdowns();
        redo();
      });
    }
    if (dom.btnExportCsvMenu) {
      dom.btnExportCsvMenu.addEventListener('click', () => {
        closeAllDropdowns();
        exportIpInventoryCsv();
      });
    }
    if (dom.btnSaveMenuCopy) {
      dom.btnSaveMenuCopy.addEventListener('click', () => {
        closeAllDropdowns();
        exportProjectToFile();
      });
    }

    // Cerrar menú al presionar cualquier item
    document.querySelectorAll('.dropdown-item').forEach(item => {
      item.addEventListener('click', () => closeAllDropdowns());
    });

    // Cerrar menús al hacer clic fuera
    if (setupToolbarEvents._abort) setupToolbarEvents._abort.abort();
    setupToolbarEvents._abort = new AbortController();
    window.addEventListener('click', (e) => {
      if (!e.target.closest('.nav-menu-item')) {
        closeAllDropdowns();
      }
      if (!e.target.closest('.canvas-layers-dropdown-wrap') && !e.target.closest('.canvas-layers-menu') && dom.canvasLayersDropdownWrap) {
        setLayersMenuOpen(false);
      }
    }, { signal: setupToolbarEvents._abort.signal });

    // Botón Búsqueda Rápida (Spotlight / Ctrl + F)
    if (dom.btnQuickSearch) {
      dom.btnQuickSearch.addEventListener('click', openQuickSearchModal);
    }

    // Botón Tabla de Inventario IP
    if (dom.btnOpenIpTable) {
      dom.btnOpenIpTable.addEventListener('click', openIpInventoryModal);
    }

    // Exportación Vectorial SVG directa desde el menú
    if (dom.btnExportSvg) {
      dom.btnExportSvg.addEventListener('click', async () => {
        closeAllDropdowns();
        const selectedTheme = document.querySelector('input[name="export-theme"]:checked')?.value || 'monochrome';
        const includeGrid = document.getElementById('chk-export-grid')?.checked || false;
        const includeTitleBlock = document.getElementById('chk-export-title-block')?.checked || false;
        const exportElemScale = parseFloat(document.getElementById('inp-export-elem-scale')?.value || '1.25') || 1.25;
        const currSheet = getCurrentSheet();
        const authorVal = (document.getElementById('inp-export-author')?.value || '').trim();
        const companyVal = (document.getElementById('inp-export-company')?.value || '').trim() || 'Uinfor';
        const versionVal = (document.getElementById('inp-export-version')?.value || '').trim() || 'v1.0';
        const scaleVal = (document.getElementById('inp-export-scale')?.value || '').trim() || '1:1';
        const titleBlockData = {
          project: state.currentProjectName || 'Topología de Red',
          author: authorVal || 'Ingeniería de Red',
          company: companyVal,
          version: versionVal,
          date: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }),
          sheet: currSheet?.name || 'Hoja 1',
          scale: scaleVal
        };
        const { exportDiagramSvg } = await loadExportSvgModule();
        exportDiagramSvg(selectedTheme, includeGrid, includeTitleBlock, titleBlockData, exportElemScale);
      });
    }

    // Auditor y Diagnóstico de Red (Linter Topológico)
    if (dom.btnOpenTopologyAudit) {
      dom.btnOpenTopologyAudit.addEventListener('click', () => {
        closeAllDropdowns();
        openTopologyAuditModal();
      });
    }
    if (dom.btnCloseAuditModal) {
      dom.btnCloseAuditModal.addEventListener('click', closeTopologyAuditModal);
    }
    if (dom.btnCloseAuditBottom) {
      dom.btnCloseAuditBottom.addEventListener('click', closeTopologyAuditModal);
    }
    if (dom.btnRecheckAudit) {
      dom.btnRecheckAudit.addEventListener('click', () => {
        renderTopologyAuditModal(getAuditFilter());
        showToast('Diagnóstico topológico actualizado', 'info');
      });
    }

    // Pestañas de Filtrado del Auditor de Red
    document.querySelectorAll('[data-audit-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        const filter = btn.dataset.auditFilter || 'all';
        renderTopologyAuditModal(filter);
      });
    });

    // Alternar Modo Blanco / Modo Oscuro
    if (dom.btnToggleTheme) {
      dom.btnToggleTheme.addEventListener('click', () => {
        toggleTheme();
      });
    }

    // Controles y eventos del Plano Arquitectónico de Fondo (Underlay)
    if (dom.btnToggleUnderlay) {
      dom.btnToggleUnderlay.addEventListener('click', () => {
        openUnderlayModal();
      });
      dom.btnToggleUnderlay.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openUnderlayModal();
        }
      });
    }
    if (dom.btnImportUnderlayMenu) {
      dom.btnImportUnderlayMenu.addEventListener('click', () => {
        closeAllDropdowns();
        openUnderlayModal();
      });
    }
    if (dom.menuViewToggleUnderlay) {
      dom.menuViewToggleUnderlay.addEventListener('click', () => {
        closeAllDropdowns();
        toggleUnderlayVisibility();
      });
    }
    if (dom.btnCloseUnderlayModal) {
      dom.btnCloseUnderlayModal.addEventListener('click', closeUnderlayModal);
    }
    if (dom.btnCloseUnderlayBottom) {
      dom.btnCloseUnderlayBottom.addEventListener('click', closeUnderlayModal);
    }
    if (dom.modalUnderlay) {
      dom.modalUnderlay.addEventListener('click', (e) => {
        if (e.target === dom.modalUnderlay) {
          closeUnderlayModal();
        }
      });
    }
    if (dom.btnBrowseUnderlay && dom.inputUnderlayFile) {
      dom.btnBrowseUnderlay.addEventListener('click', () => {
        dom.inputUnderlayFile.click();
      });
    }
    if (dom.btnChangeUnderlayFile && dom.inputUnderlayFile) {
      dom.btnChangeUnderlayFile.addEventListener('click', () => {
        dom.inputUnderlayFile.click();
      });
    }
    if (dom.inputUnderlayFile) {
      dom.inputUnderlayFile.addEventListener('change', handleUnderlayFileSelect);
    }
    if (dom.underlayEmptyState) {
      dom.underlayEmptyState.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dom.underlayEmptyState.style.borderColor = 'var(--accent-cyan)';
        dom.underlayEmptyState.style.background = 'rgba(56, 189, 248, 0.08)';
      });
      dom.underlayEmptyState.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dom.underlayEmptyState.style.borderColor = '';
        dom.underlayEmptyState.style.background = '';
      });
      dom.underlayEmptyState.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dom.underlayEmptyState.style.borderColor = '';
        dom.underlayEmptyState.style.background = '';
        const dt = e.dataTransfer;
        if (dt && dt.files && dt.files[0]) {
          processUnderlayFile(dt.files[0]);
        }
      });
    }
    if (dom.btnDeleteUnderlay) {
      dom.btnDeleteUnderlay.addEventListener('click', deleteUnderlay);
    }
    if (dom.chkUnderlayVisible) {
      dom.chkUnderlayVisible.addEventListener('change', (e) => {
        if (!state.underlay) return;
        state.underlay.visible = e.target.checked;
        renderUnderlay();
        saveState();
      });
    }
    if (dom.chkUnderlayLocked) {
      dom.chkUnderlayLocked.addEventListener('change', (e) => {
        if (!state.underlay) return;
        state.underlay.locked = e.target.checked;
        renderUnderlay();
        saveState();
      });
    }
    if (dom.rngUnderlayOpacity) {
      dom.rngUnderlayOpacity.addEventListener('input', (e) => {
        if (!state.underlay) return;
        const val = parseInt(e.target.value, 10);
        state.underlay.opacity = val;
        if (dom.lblUnderlayOpacity) dom.lblUnderlayOpacity.textContent = `${val}%`;
        const el = document.getElementById('underlay-container');
        if (el) el.style.opacity = val / 100;
      });
      dom.rngUnderlayOpacity.addEventListener('change', () => {
        saveState();
      });
    }
    if (dom.rngUnderlayScale) {
      dom.rngUnderlayScale.addEventListener('input', (e) => {
        if (!state.underlay) return;
        const val = parseInt(e.target.value, 10);
        state.underlay.scale = val;
        if (dom.lblUnderlayScale) dom.lblUnderlayScale.textContent = `${val}%`;
        renderUnderlay();
      });
      dom.rngUnderlayScale.addEventListener('change', () => {
        saveState();
      });
    }
    (dom.modalUnderlay || document).querySelectorAll('.btn-scale-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!state.underlay) return;
        const s = parseInt(btn.getAttribute('data-scale'), 10);
        if (isNaN(s)) return;
        state.underlay.scale = s;
        if (dom.rngUnderlayScale) dom.rngUnderlayScale.value = s;
        if (dom.lblUnderlayScale) dom.lblUnderlayScale.textContent = `${s}%`;
        renderUnderlay();
        saveState();
      });
    });
    if (dom.btnFitUnderlaySheet) {
      dom.btnFitUnderlaySheet.addEventListener('click', fitUnderlayToCurrentSheet);
    }
    if (dom.btnResetUnderlayPos) {
      dom.btnResetUnderlayPos.addEventListener('click', resetUnderlayPosition);
    }
    if (dom.btnToggleMoveUnderlay) {
      dom.btnToggleMoveUnderlay.addEventListener('click', () => {
        if (!state.underlay) return;
        state.underlay.locked = !state.underlay.locked;
        renderUnderlay();
        saveState();
        if (!state.underlay.locked) {
          closeUnderlayModal();
          showToast('Plano desbloqueado: arrástralo en el lienzo para posicionarlo', 'info');
        }
      });
    }
  }

const VALID_STYLES = ['default', 'glass', 'obsidian'];

export function applyStyle(styleName, showNotification = false) {
    state.style = VALID_STYLES.includes(styleName) ? styleName : 'default';
    try {
      localStorage.setItem('nettopology_style', state.style);
    } catch (e) {}

    applyTheme(state.theme === 'light' ? 'light' : 'dark', false);

    if (showNotification && typeof showToast === 'function') {
      const styleNames = {
        default: '🎨 Estilo Default activado',
        glass: '✨ Estilo Liquid Glass activado',
        obsidian: '💎 Estilo Obsidian activado'
      };
      showToast(styleNames[state.style] || 'Estilo actualizado', 'info', 2200);
    }
  }

export function applyTheme(themeName, showNotification = false) {
    if (themeName === 'glass' || themeName === 'obsidian') {
      state.style = themeName;
      themeName = state.theme === 'light' ? 'light' : 'dark';
    }

    const isLight = themeName === 'light';
    state.theme = isLight ? 'light' : 'dark';
    if (!VALID_STYLES.includes(state.style)) {
      state.style = 'default';
    }

    document.body.setAttribute('data-style', state.style);
    if (isLight) {
      document.body.setAttribute('data-theme', 'light');
    } else {
      document.body.removeAttribute('data-theme');
    }

    try {
      localStorage.setItem('nettopology_theme', state.theme);
      localStorage.setItem('nettopology_style', state.style);
    } catch (e) {}

    // Iconos en el botón rápido de la barra superior (solo Oscuro / Blanco)
    if (dom.themeIconSun) dom.themeIconSun.style.display = !isLight ? 'block' : 'none';
    if (dom.themeIconMoon) dom.themeIconMoon.style.display = isLight ? 'block' : 'none';
    if (dom.themeIconGlass) dom.themeIconGlass.style.display = 'none';

    // Tildes de verificación en el menú desplegable Vista (Estilo)
    if (dom.checkStyleDefault) dom.checkStyleDefault.style.display = (state.style === 'default') ? 'inline' : 'none';
    if (dom.checkStyleGlass) dom.checkStyleGlass.style.display = (state.style === 'glass') ? 'inline' : 'none';
    if (dom.checkStyleObsidian) dom.checkStyleObsidian.style.display = (state.style === 'obsidian') ? 'inline' : 'none';

    if (dom.btnToggleTheme) {
      dom.btnToggleTheme.title = isLight
        ? 'Modo Blanco activo (Clic para cambiar a Modo Oscuro)'
        : 'Modo Oscuro activo (Clic para cambiar a Modo Blanco)';
    }

    if (dom.tempCable) {
      dom.tempCable.setAttribute('stroke', isLight ? '#0284c7' : '#38bdf8');
    }

    // 1. Refrescar paleta de dispositivos con los iconos correspondientes al tema
    renderPalette();

    // 2. Actualizar los nodos activos en el lienzo preservando iconos, nombres e IPs
    state.nodes.forEach(node => {
      const el = document.getElementById(node.id);
      if (el) {
        renderNodeElement(node);
      }
    });

    renderConnections();
    renderZones();
    updatePaperSheetDisplay();
    if (typeof renderSheetsBar === 'function') renderSheetsBar();
    if (typeof updateMinimap === 'function') updateMinimap();
    if (state.selection && state.selection.id) renderInspector();

    if (showNotification && typeof showToast === 'function') {
      showToast(isLight ? '☀️ Modo Blanco activado' : '🌙 Modo Oscuro activado', 'info', 2200);
    }
  }

export function toggleTheme() {
    const nextTheme = state.theme === 'light' ? 'dark' : 'light';
    applyTheme(nextTheme, true);
  }

  // ==========================================================================
  // GESTIÓN Y ALTERNANCIA DE PANELES LATERALES (COLAPSAR / EXPANDIR)
  // ==========================================================================
export function togglePalette(forceState) {
    if (!dom.sidebarPalette) return;
    const isCurrentlyCollapsed = dom.sidebarPalette.classList.contains('collapsed');
    const newState = (typeof forceState === 'boolean') ? forceState : !isCurrentlyCollapsed;

    dom.sidebarPalette.classList.toggle('collapsed', newState);

    if (dom.btnExpandPalette) {
      dom.btnExpandPalette.style.display = newState ? 'inline-flex' : 'none';
    }
    if (dom.btnTogglePaletteTop) {
      dom.btnTogglePaletteTop.classList.toggle('active-panel', !newState);
    }
    try {
      localStorage.setItem('net_palette_collapsed', newState ? 'true' : 'false');
    } catch (e) {}
  }

export function toggleInspector(forceState) {
    if (!dom.sidebarInspector) return;
    const isCurrentlyCollapsed = dom.sidebarInspector.classList.contains('collapsed');
    const newState = (typeof forceState === 'boolean') ? forceState : !isCurrentlyCollapsed;

    dom.sidebarInspector.classList.toggle('collapsed', newState);

    if (dom.btnExpandInspector) {
      dom.btnExpandInspector.style.display = newState ? 'inline-flex' : 'none';
    }
    if (dom.btnToggleInspectorTop) {
      dom.btnToggleInspectorTop.classList.toggle('active-panel', !newState);
    }
    try {
      localStorage.setItem('net_inspector_collapsed', newState ? 'true' : 'false');
    } catch (e) {}
    if (!newState) {
      flushPendingInspectorRender();
    }
  }

export function togglePaletteView(forceList) {
    if (!dom.sidebarPalette) return;
    const isCurrentlyList = dom.sidebarPalette.classList.contains('palette-list-view');
    const isList = (typeof forceList === 'boolean') ? forceList : !isCurrentlyList;

    dom.sidebarPalette.classList.toggle('palette-list-view', isList);

    if (dom.iconPaletteGrid) {
      dom.iconPaletteGrid.style.display = isList ? 'none' : 'block';
    }
    if (dom.iconPaletteList) {
      dom.iconPaletteList.style.display = isList ? 'block' : 'none';
    }
    if (dom.btnTogglePaletteView) {
      dom.btnTogglePaletteView.title = isList
        ? 'Vista de lista compacta (Clic para cambiar a cuadrícula)'
        : 'Vista en cuadrícula (Clic para cambiar a lista compacta)';
    }
    try {
      localStorage.setItem('net_palette_view', isList ? 'list' : 'grid');
    } catch (e) {}
  }

export function setupPanelToggles() {
    // Alternar vista cuadrícula / lista compacta en la paleta de dispositivos
    if (dom.btnTogglePaletteView) {
      dom.btnTogglePaletteView.addEventListener('click', () => togglePaletteView());
    }
    // Botón colapsar en cabecera de la paleta izquierda
    if (dom.btnCollapsePalette) {
      dom.btnCollapsePalette.addEventListener('click', () => togglePalette(true));
    }
    // Pestaña flotante para reabrir paleta izquierda
    if (dom.btnExpandPalette) {
      dom.btnExpandPalette.addEventListener('click', () => togglePalette(false));
    }
    // Botón en topbar para alternar paleta
    if (dom.btnTogglePaletteTop) {
      dom.btnTogglePaletteTop.addEventListener('click', () => togglePalette());
    }

    // Botón colapsar en cabecera del inspector derecho
    if (dom.btnCollapseInspector) {
      dom.btnCollapseInspector.addEventListener('click', () => toggleInspector(true));
    }
    // Pestaña flotante para reabrir inspector derecho
    if (dom.btnExpandInspector) {
      dom.btnExpandInspector.addEventListener('click', () => toggleInspector(false));
    }
    // Botón en topbar para alternar inspector
    if (dom.btnToggleInspectorTop) {
      dom.btnToggleInspectorTop.addEventListener('click', () => toggleInspector());
    }

    // Asegurar desplazamiento fluido con rueda de ratón en el inspector de propiedades
    if (dom.sidebarInspector) {
      dom.sidebarInspector.addEventListener('wheel', (e) => {
        if (!dom.inspectorBody) return;
        const isInnerScroll = e.target.closest('.ports-list-box');
        if (isInnerScroll) return; // Permitir scroll interno en lista de puertos
        // Si el puntero está en la cabecera o bordes del panel, transferir scroll al inspectorBody
        if (!e.target.closest('#inspector-body')) {
          dom.inspectorBody.scrollTop += e.deltaY;
        }
      }, { passive: true });
    }

    // Restaurar preferencias del usuario si existen
    try {
      if (localStorage.getItem('net_palette_collapsed') === 'true') {
        togglePalette(true);
      }
      if (localStorage.getItem('net_palette_view') === 'list') {
        togglePaletteView(true);
      }
      if (localStorage.getItem('net_inspector_collapsed') === 'true') {
        toggleInspector(true);
      }
      const savedBridges = localStorage.getItem('net_cable_bridges');
      if (savedBridges !== null) {
        state.cableBridgesEnabled = (savedBridges === 'true');
      }
    } catch (e) {}
  }

  // ==========================================================================
  // ATAJOS DE TECLADO
  // ==========================================================================
export function setupKeyboardShortcuts() {
    let lastEscapePressTime = 0;

    if (setupKeyboardShortcuts._abort) setupKeyboardShortcuts._abort.abort();
    setupKeyboardShortcuts._abort = new AbortController();
    window.addEventListener('keydown', (e) => {
      if (!state.user) return;

      // Ctrl + S (Guardar / Sobrescribir en disco) y Ctrl + Shift + S (Guardar como...)
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        saveProjectToFile(e.shiftKey);
        return;
      }

      // Ctrl + O: Abrir archivo de proyecto (.netdiag / .json)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'o' || e.key === 'O')) {
        e.preventDefault();
        openProjectFilePicker();
        return;
      }

      // Si el usuario está escribiendo en un input o textarea y presiona Escape, desenfocar el campo y cerrar modales
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        if (e.key === 'Escape') {
          e.target.blur();
          const closed = closeOpenModals();
          lastEscapePressTime = closed ? 0 : Date.now();
        }
        return;
      }

      // T: Insertar Recuadro de Texto / IP en el lienzo (sin teclas modificadoras)
      if (!e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        addNewTextBadgeAtCenter();
        return;
      }

      // Ctrl + D: Duplicar selección de equipos
      if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        if (state.readOnlyLock) { notifyReadOnlyBlocked(); return; }
        duplicateSelectedNodes();
        return;
      }

      // Ctrl + 0: Zoom al 100%
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        state.viewport.x = 80;
        state.viewport.y = 80;
        state.viewport.zoom = 1;
        updateViewportTransform();
        return;
      }

      // Shift + 1: Ajustar al contenido
      if (e.shiftKey && e.key === '!') {
        e.preventDefault();
        fitViewToNodes();
        return;
      }

      // Ctrl + F: Búsqueda rápida de equipos e IPs (Spotlight)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        openQuickSearchModal();
        return;
      }

      // Ctrl + Z: Deshacer (Undo)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      // Ctrl + Y o Ctrl + Shift + Z: Rehacer (Redo)
      if ((e.ctrlKey || e.metaKey) && ((e.key === 'y' || e.key === 'Y') || (e.shiftKey && (e.key === 'z' || e.key === 'Z')))) {
        e.preventDefault();
        redo();
        return;
      }

      // Ctrl + A: Seleccionar todos los equipos de la hoja activa
      if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        selectAllNodes();
        return;
      }

      // Flechas de dirección (↑ ↓ ← →): Desplazar dispositivo(s) o zona(s) seleccionadas, o mover el lienzo si no hay selección
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          const hasOpenModal = document.querySelector('.modal-overlay.open, .modal.open, .dropdown-menu.show');
          if (!hasOpenModal) {
            const grid = state.gridSize || 24;
            const subGrid = grid * 0.25; // 0.25 de cuadrícula (6px con grid de 24px)
            const step = state.snapToGrid
              ? (e.shiftKey ? grid : subGrid)
              : (e.shiftKey ? grid : 2);

            let dx = 0;
            let dy = 0;
            if (e.key === 'ArrowUp') dy = -step;
            else if (e.key === 'ArrowDown') dy = step;
            else if (e.key === 'ArrowLeft') dx = -step;
            else if (e.key === 'ArrowRight') dx = step;

            const targetGridSize = state.snapToGrid ? (e.shiftKey ? grid : subGrid) : null;
            const moved = nudgeSelectedElements(dx, dy, targetGridSize);
            if (!moved) {
              const panStep = e.shiftKey ? 120 : 48;
              if (e.key === 'ArrowUp') state.viewport.y += panStep;
              else if (e.key === 'ArrowDown') state.viewport.y -= panStep;
              else if (e.key === 'ArrowLeft') state.viewport.x += panStep;
              else if (e.key === 'ArrowRight') state.viewport.x -= panStep;
              updateViewportTransform();
            }
            e.preventDefault();
            return;
          }
        }
      }

      // Supr / Backspace: borrar seleccionado(s)
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (state.readOnlyLock) {
          notifyReadOnlyBlocked();
          return;
        }
        const hasSelectedZones = state.selectedZoneIds && state.selectedZoneIds.size > 0;
        const totalCount = state.selectedNodeIds.size + (hasSelectedZones ? state.selectedZoneIds.size : 0);
        if (totalCount > 1) {
          deleteSelectedNodes();
        } else if (state.selection.type === 'node' && state.selection.id) {
          deleteNode(state.selection.id);
        } else if (state.selection.type === 'cable' && state.selection.id) {
          deleteConnection(state.selection.id);
        } else if (state.selection.type === 'zone' && state.selection.id) {
          deleteZone(state.selection.id);
        } else if (hasSelectedZones && state.selectedZoneIds.size === 1) {
          deleteZone(Array.from(state.selectedZoneIds)[0]);
        }
      }

      // Escape: cerrar modales/menús abiertos sin deseleccionar el lienzo; o deseleccionar si no hay modales.
      // Si se pulsa 2 veces seguidas (<= 550ms): oculta o muestra los paneles laterales (Dispositivos y Propiedades)
      if (e.key === 'Escape') {
        if (closeOpenModals()) {
          lastEscapePressTime = 0;
          return;
        }

        const now = Date.now();
        const isDoubleEscape = (now - lastEscapePressTime) <= 550;
        lastEscapePressTime = now;

        if (state.isConnecting) {
          state.isConnecting = false;
          state.connectingSourceNodeId = null;
          if (dom.tempCable) {
            dom.tempCable.setAttribute('d', '');
            dom.tempCable.style.display = 'none';
          }
        }
        if (state.canvasMode === 'connect') {
          setCanvasMode('select');
        }

        deselectAll();

        // 2 veces seguidas: ocultar / restaurar ambos paneles laterales (Dispositivos y Propiedades)
        if (isDoubleEscape) {
          const isPaletteOpen = dom.sidebarPalette && !dom.sidebarPalette.classList.contains('collapsed');
          const isInspectorOpen = dom.sidebarInspector && !dom.sidebarInspector.classList.contains('collapsed');

          if (isPaletteOpen || isInspectorOpen) {
            togglePalette(true);
            toggleInspector(true);
          } else {
            togglePalette(false);
            toggleInspector(false);
          }
          lastEscapePressTime = 0; // Reiniciar
        }
      }

      // [ para alternar paleta izquierda, ] para alternar inspector derecho
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === '[') {
          togglePalette();
        } else if (e.key === ']') {
          toggleInspector();
        }
      }

      // H: Modo Mano (Pan), V: Modo Selección
      if ((e.key === 'h' || e.key === 'H') && !e.ctrlKey && !e.metaKey) {
        setCanvasMode('pan');
      } else if ((e.key === 'v' || e.key === 'V') && !e.ctrlKey && !e.metaKey) {
        setCanvasMode('select');
      }

      // F o Shift+F: Centrar y encuadrar todo en la pantalla (Fit view)
      if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey) {
        fitViewToNodes();
      }
    }, { signal: setupKeyboardShortcuts._abort.signal });
  }


let lastReadOnlyNoticeAt = 0;
export function notifyReadOnlyBlocked() {
  const now = Date.now();
  if (now - lastReadOnlyNoticeAt > 1800) {
    lastReadOnlyNoticeAt = now;
    showToast('🔒 Modo Solo Lectura activo — desbloquea el candado para editar.', 'info', 2200);
  }
}

export function toggleReadOnlyLock(forceState) {
  state.readOnlyLock = (typeof forceState === 'boolean') ? forceState : !state.readOnlyLock;
  if (typeof document !== 'undefined' && document.body) {
    document.body.classList.toggle('read-only-locked', state.readOnlyLock);
  }
  if (state.readOnlyLock) {
    state.isConnecting = false;
    state.connectingSourceNodeId = null;
    if (dom.tempCable) dom.tempCable.style.display = 'none';
    if (state.canvasMode === 'connect') setCanvasMode('pan');
  }
  const btn = dom.btnToggleReadOnly;
  if (btn) {
    btn.classList.toggle('active', state.readOnlyLock);
    btn.setAttribute('aria-pressed', state.readOnlyLock ? 'true' : 'false');
    const iconUnlock = document.getElementById('icon-readonly-unlock');
    const iconLock = document.getElementById('icon-readonly-lock');
    const lbl = document.getElementById('label-readonly-btn');
    if (iconUnlock) iconUnlock.style.display = state.readOnlyLock ? 'none' : 'block';
    if (iconLock) iconLock.style.display = state.readOnlyLock ? 'block' : 'none';
    if (lbl) lbl.textContent = state.readOnlyLock ? 'Solo Ver' : 'Bloquear';
  }
  app.updateNodeQuickActions?.();
  app.updateQuickPastePill?.();
  showToast(
    state.readOnlyLock
      ? '🔒 Bloqueo de plano activo: podés mover y hacer zoom sin editar.'
      : '🔓 Edición habilitada nuevamente.',
    state.readOnlyLock ? 'info' : 'success',
    2600
  );
}

// Registrar métodos en el contexto global de aplicación
app.notifyReadOnlyBlocked = notifyReadOnlyBlocked;
app.toggleReadOnlyLock = toggleReadOnlyLock;
app.toggleDropdown = toggleDropdown;
app.closeAllDropdowns = closeAllDropdowns;
app.closeOpenModals = closeOpenModals;
app.initViewMenu = initViewMenu;
app.toggleGridVisibility = toggleGridVisibility;
app.toggleSmartGuides = toggleSmartGuides;
app.setupToolbarEvents = setupToolbarEvents;
app.applyStyle = applyStyle;
app.applyTheme = applyTheme;
app.toggleTheme = toggleTheme;
app.togglePalette = togglePalette;
app.togglePaletteView = togglePaletteView;
app.toggleInspector = toggleInspector;
app.setupPanelToggles = setupPanelToggles;
app.setupKeyboardShortcuts = setupKeyboardShortcuts;
