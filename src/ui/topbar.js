/**
 * NetTopology - Módulo src/ui/topbar.js
 */

import { state, dom } from '../state/store.js';
import { app } from '../core/appContext.js';
import { DEVICE_ICONS, DEVICE_ICONS_LIGHT, DEVICE_METADATA, CABLE_TYPES, getDeviceIcon, generateSwitchPorts, generateRouterPorts } from '../config/icons.js';
import { STORAGE_PROJECTS_KEY, STORAGE_ACTIVE_ID_KEY, STORAGE_LEGACY_KEY, SHEET_PRESETS, ZONE_COLOR_PALETTES, MAX_HISTORY_STEPS, DEFAULT_GRID_SIZE } from '../config/constants.js';
import { escapeHtml, incrementIp, formatDateForFile, clamp, generateId } from '../utils/helpers.js';
import { renderPalette } from './palette.js';
import { createNode, deleteNode, duplicateNode, duplicateSelectedNodes, deleteSelectedNodes } from '../core/nodes.js';
import { deleteConnection, renderConnections } from '../core/cables.js';
import { setCanvasMode, applyZoom, updateViewportTransform, fitViewToNodes, getCanvasCenterWorld, toggleMinimapVisibility, updateMinimap } from '../core/canvas.js';
import { closeCableModal, openIpInventoryModal, closeIpInventoryModal, exportIpInventoryCsv } from './modals.js';
import { deselectAll, selectAllNodes, renderInspector } from './inspector.js';
import { deleteZone, renderZones } from '../core/zones.js';
import { renderUnderlay, openUnderlayModal, closeUnderlayModal, handleUnderlayFileSelect, processUnderlayFile, deleteUnderlay, fitUnderlayToCurrentSheet, resetUnderlayPosition, toggleUnderlayVisibility } from '../core/underlay.js';
import { setActiveLayer } from '../core/layers.js';
import { openQuickSearchModal, closeQuickSearchModal } from '../core/search.js';
import { renderTopologyAuditModal, openTopologyAuditModal, closeTopologyAuditModal } from '../core/audit.js';
import { getCurrentSheet, updatePaperSheetDisplay, renderSheetsBar, closeSheetConfigModal } from '../core/sheets.js';
import { pushHistoryState, undo, redo } from '../state/history.js';
import { saveState, createNewProject, showToast, saveProjectToFile, openProjectFilePicker, exportProjectToFile, importProjectFromFile, openProjectsModal, closeProjectsModal, unlinkDiskFile, linkProjectToDiskFile, performDiskAutoSave, getDiskFileStatus, getDiskFileHandle } from '../storage/db.js';
import { updateExportPagingUI } from '../export/exportPdf.js';
import { exportDiagramSvg } from '../export/exportSvg.js';
import { loadDefaultTopology, snapAllNodesAndConnectionsToGrid } from '../config/defaultTopology.js';
import { openBomModal, closeBomModal } from './bom.js';



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

      updateExportPagingUI();

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

    // Snap to grid (soporte directo si existe en DOM)
    if (dom.btnToggleSnap) {
      dom.btnToggleSnap.addEventListener('click', () => {
        state.snapToGrid = !state.snapToGrid;
        dom.btnToggleSnap.classList.toggle('active', state.snapToGrid);
        if (dom.checkViewSnap) dom.checkViewSnap.style.display = state.snapToGrid ? 'inline' : 'none';
        if (state.snapToGrid) {
          snapAllNodesAndConnectionsToGrid();
        }
      });
    }

    // Puentes en cruce de cables (soporte directo si existe en DOM)
    if (dom.btnToggleBridges) {
      dom.btnToggleBridges.addEventListener('click', () => {
        state.cableBridgesEnabled = !state.cableBridgesEnabled;
        dom.btnToggleBridges.classList.toggle('active', state.cableBridgesEnabled);
        if (dom.checkViewBridges) dom.checkViewBridges.style.display = state.cableBridgesEnabled ? 'inline' : 'none';
        try {
          localStorage.setItem('net_cable_bridges', state.cableBridgesEnabled ? 'true' : 'false');
        } catch (e) {}
        renderConnections();
      });
    }

    // Selector Flotante de Capas Técnicas (Menú Desplegable con 3 capas técnicas + Todo)
    if (dom.btnToggleLayersDropdown && dom.canvasLayersDropdownWrap) {
      dom.btnToggleLayersDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = dom.canvasLayersDropdownWrap.classList.contains('open');
        closeAllDropdowns();
        if (!isOpen) {
          dom.canvasLayersDropdownWrap.classList.add('open');
        } else {
          dom.canvasLayersDropdownWrap.classList.remove('open');
        }
      });
    }

    document.querySelectorAll('.btn-layer-menu-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const targetLayer = btn.dataset.layer || 'all';
        setActiveLayer(targetLayer);
        if (dom.canvasLayersDropdownWrap) {
          dom.canvasLayersDropdownWrap.classList.remove('open');
        }
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
      dom.btnModeSelect.addEventListener('click', () => setCanvasMode('select'));
    }
    if (dom.btnModePan) {
      dom.btnModePan.addEventListener('click', () => setCanvasMode('pan'));
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

    if (dom.menuViewThemeDark) {
      dom.menuViewThemeDark.addEventListener('click', () => {
        closeAllDropdowns();
        applyTheme('dark');
      });
    }
    if (dom.menuViewThemeGlass) {
      dom.menuViewThemeGlass.addEventListener('click', () => {
        closeAllDropdowns();
        applyTheme('glass');
      });
    }
    if (dom.menuViewThemeLight) {
      dom.menuViewThemeLight.addEventListener('click', () => {
        closeAllDropdowns();
        applyTheme('light');
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
        openBomModal();
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
    window.addEventListener('click', (e) => {
      if (!e.target.closest('.nav-menu-item')) {
        closeAllDropdowns();
      }
      if (!e.target.closest('.canvas-layers-dropdown-wrap') && dom.canvasLayersDropdownWrap) {
        dom.canvasLayersDropdownWrap.classList.remove('open');
      }
    });

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
      dom.btnExportSvg.addEventListener('click', () => {
        closeAllDropdowns();
        const selectedTheme = document.querySelector('input[name="export-theme"]:checked')?.value || 'monochrome';
        const includeGrid = document.getElementById('chk-export-grid')?.checked || false;
        const includeTitleBlock = document.getElementById('chk-export-title-block')?.checked || false;
        const exportElemScale = parseFloat(document.getElementById('inp-export-elem-scale')?.value || '1.25') || 1.25;
        const currSheet = getCurrentSheet();
        const authorVal = (document.getElementById('inp-export-author')?.value || '').trim();
        const companyVal = (document.getElementById('inp-export-company')?.value || '').trim() || 'Uinfor';
        const scaleVal = (document.getElementById('inp-export-scale')?.value || '').trim() || '1:1';
        const titleBlockData = {
          project: state.currentProjectName || 'Topología de Red',
          author: authorVal || 'Ingeniería de Red',
          company: companyVal,
          version: 'v1.0',
          date: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }),
          sheet: currSheet?.name || 'Hoja 1',
          scale: scaleVal
        };
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
        renderTopologyAuditModal(currentAuditFilter);
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
        pushHistoryState();
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
        pushHistoryState();
        saveState();
      });
    }
    document.querySelectorAll('.btn-scale-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!state.underlay) return;
        const s = parseInt(btn.getAttribute('data-scale'), 10);
        if (isNaN(s)) return;
        state.underlay.scale = s;
        if (dom.rngUnderlayScale) dom.rngUnderlayScale.value = s;
        if (dom.lblUnderlayScale) dom.lblUnderlayScale.textContent = `${s}%`;
        renderUnderlay();
        pushHistoryState();
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

export function applyTheme(themeName, showNotification = false) {
    const isLight = themeName === 'light';
    const isGlass = themeName === 'glass';

    document.body.removeAttribute('data-theme');
    if (isGlass) {
      document.body.setAttribute('data-theme', 'glass');
      state.theme = 'glass';
    } else if (isLight) {
      document.body.setAttribute('data-theme', 'light');
      state.theme = 'light';
    } else {
      state.theme = 'dark';
    }

    try {
      localStorage.setItem('nettopology_theme', state.theme);
    } catch (e) {}

    // Iconos en el botón rápido de la barra superior
    if (dom.themeIconSun) dom.themeIconSun.style.display = (state.theme === 'dark') ? 'block' : 'none';
    if (dom.themeIconGlass) dom.themeIconGlass.style.display = (state.theme === 'glass') ? 'block' : 'none';
    if (dom.themeIconMoon) dom.themeIconMoon.style.display = (state.theme === 'light') ? 'block' : 'none';

    // Tildes de verificación en el menú desplegable Vista
    if (dom.checkThemeDark) dom.checkThemeDark.style.display = (state.theme === 'dark') ? 'inline' : 'none';
    if (dom.checkThemeGlass) dom.checkThemeGlass.style.display = (state.theme === 'glass') ? 'inline' : 'none';
    if (dom.checkThemeLight) dom.checkThemeLight.style.display = (state.theme === 'light') ? 'inline' : 'none';

    if (dom.btnToggleTheme) {
      const titles = {
        dark: 'Modo Oscuro Clásico (Clic para cambiar a Liquid Glass)',
        glass: 'Modo Liquid Glass Apple (Clic para cambiar a Modo Blanco)',
        light: 'Modo Blanco Clásico (Clic para cambiar a Modo Oscuro)'
      };
      dom.btnToggleTheme.title = titles[state.theme] || 'Cambiar tema de interfaz';
    }

    if (dom.tempCable) {
      dom.tempCable.setAttribute('stroke', isLight ? '#0284c7' : '#38bdf8');
    }

    // 1. Refrescar paleta de dispositivos con los iconos correspondientes al tema
    renderPalette();

    // 2. Actualizar los iconos de todos los nodos activos en el lienzo
    state.nodes.forEach(node => {
      const el = document.getElementById(node.id);
      if (!el) return;
      const iconBox = el.querySelector('.node-icon-box');
      if (iconBox && node.type !== 'text_badge') {
        const handle = iconBox.querySelector('.node-cable-handle');
        const handleHtml = handle ? handle.outerHTML : `
          <div class="node-cable-handle" title="Tirar cable hacia otro equipo" data-handle="true">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" style="pointer-events: none;">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </div>
        `;
        const newIcon = typeof getDeviceIcon === 'function' ? getDeviceIcon(node.type, isLight) : (DEVICE_ICONS[node.type] || DEVICE_ICONS.pc);
        iconBox.innerHTML = `${newIcon}${handleHtml}`;
      }
    });

    renderConnections();
    renderZones();
    updatePaperSheetDisplay();
    if (typeof renderSheetsBar === 'function') renderSheetsBar();
    if (typeof updateMinimap === 'function') updateMinimap();
    if (state.selection && state.selection.id) renderInspector();

    if (showNotification) {
      const toastNames = {
        dark: '🌙 Modo Oscuro Clásico activado',
        glass: '✨ Modo Liquid Glass (Apple iOS) activado',
        light: '☀️ Modo Blanco Clásico activado'
      };
      if (typeof showToast === 'function') {
        showToast(toastNames[state.theme] || 'Tema actualizado', 'info', 2400);
      }
    }
  }

export function toggleTheme() {
    let nextTheme = 'glass';
    if (state.theme === 'dark') nextTheme = 'glass';
    else if (state.theme === 'glass') nextTheme = 'light';
    else if (state.theme === 'light') nextTheme = 'dark';
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
  }

export function setupPanelToggles() {
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

    // Atajos de teclado adicionales:
    // [ para alternar paleta izquierda, ] para alternar inspector derecho
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.key === '[') {
        togglePalette();
      } else if (e.key === ']') {
        toggleInspector();
      }
    });

    // Restaurar preferencias del usuario si existen
    try {
      if (localStorage.getItem('net_palette_collapsed') === 'true') {
        togglePalette(true);
      }
      if (localStorage.getItem('net_inspector_collapsed') === 'true') {
        toggleInspector(true);
      }
      const savedBridges = localStorage.getItem('net_cable_bridges');
      if (savedBridges !== null) {
        state.cableBridgesEnabled = (savedBridges === 'true');
        if (dom.btnToggleBridges) {
          dom.btnToggleBridges.classList.toggle('active', state.cableBridgesEnabled);
        }
      }
    } catch (e) {}
  }

  // ==========================================================================
  // ATAJOS DE TECLADO
  // ==========================================================================
export function setupKeyboardShortcuts() {
    let lastEscapePressTime = 0;

    window.addEventListener('keydown', (e) => {
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
          closeQuickSearchModal();
          closeIpInventoryModal();
          closeBomModal();
          closeAllDropdowns();
          lastEscapePressTime = Date.now();
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

      // Supr / Backspace: borrar seleccionado(s)
      if (e.key === 'Delete' || e.key === 'Backspace') {
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

      // Escape: deseleccionar y cerrar cualquier modal abierto.
      // Si se pulsa 2 veces seguidas (<= 550ms): oculta o muestra los paneles laterales (Dispositivos y Propiedades)
      if (e.key === 'Escape') {
        const now = Date.now();
        const isDoubleEscape = (now - lastEscapePressTime) <= 550;
        lastEscapePressTime = now;

        if (state.isConnecting) {
          state.isConnecting = false;
          state.connectingSourceNodeId = null;
          dom.tempCable.setAttribute('d', '');
        }

        deselectAll();
        closeCableModal();
        closeQuickSearchModal();
        closeIpInventoryModal();
        closeTopologyAuditModal();
        closeAllDropdowns();
        if (dom.modalShortcuts) dom.modalShortcuts.classList.remove('open');
        if (dom.modalExport) dom.modalExport.classList.remove('open');
        closeProjectsModal();
        closeSheetConfigModal();

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

      // Ctrl + S: Guardar / Descargar archivo
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        exportProjectToFile();
      }

      // Ctrl + D: Duplicar seleccionado(s)
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        if (state.selectedNodeIds.size > 1) {
          duplicateSelectedNodes();
        } else if (state.selection.type === 'node' && state.selection.id) {
          duplicateNode(state.selection.id);
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
    });
  }


// Registrar métodos en el contexto global de aplicación
app.toggleDropdown = toggleDropdown;
app.closeAllDropdowns = closeAllDropdowns;
app.initViewMenu = initViewMenu;
app.toggleGridVisibility = toggleGridVisibility;
app.toggleSmartGuides = toggleSmartGuides;
app.setupToolbarEvents = setupToolbarEvents;
app.applyTheme = applyTheme;
app.toggleTheme = toggleTheme;
app.togglePalette = togglePalette;
app.toggleInspector = toggleInspector;
app.setupPanelToggles = setupPanelToggles;
app.setupKeyboardShortcuts = setupKeyboardShortcuts;
