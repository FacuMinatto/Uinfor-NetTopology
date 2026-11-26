/**
 * NetTopology - Módulo src/core/underlay.js
 */

import { state, dom } from '../state/store.js';
import { app } from '../core/appContext.js';
import { DEVICE_ICONS, DEVICE_ICONS_LIGHT, DEVICE_METADATA, CABLE_TYPES, getDeviceIcon, generateSwitchPorts, generateRouterPorts } from '../config/icons.js';
import { STORAGE_PROJECTS_KEY, STORAGE_ACTIVE_ID_KEY, STORAGE_LEGACY_KEY, SHEET_PRESETS, ZONE_COLOR_PALETTES, MAX_HISTORY_STEPS, DEFAULT_GRID_SIZE } from '../config/constants.js';
import { escapeHtml, incrementIp, formatDateForFile, clamp, generateId, safeNum, sanitizeUnderlaySrc } from '../utils/helpers.js';
import { getCurrentSheet } from './sheets.js';
import { saveState, showToast } from '../storage/db.js';
import { closeAllDropdowns } from '../ui/topbar.js';
import { pruneUnderlayImageStore } from '../state/history.js';



  // ==========================================================================
  // CAPA DE PLANO ARQUITECTÓNICO / IMAGEN DE FONDO (UNDERLAY)
  // ==========================================================================
  let isDraggingUnderlay = false;
  let underlayDragAbort = null;

export function cleanupUnderlayEvents() {
    if (underlayDragAbort) {
      underlayDragAbort.abort();
      underlayDragAbort = null;
    }
    isDraggingUnderlay = false;
  }

export function renderUnderlay() {
    if (!dom.underlayLayer) return;
    dom.underlayLayer.innerHTML = '';

    const underlay = state.underlay;
    updateUnderlayModalUI();

    const safeSrc = underlay ? sanitizeUnderlaySrc(underlay.src, false) : '';
    if (!underlay || !safeSrc || underlay.visible === false) {
      if (dom.checkViewUnderlay) dom.checkViewUnderlay.style.display = 'none';
      if (dom.btnToggleUnderlay) dom.btnToggleUnderlay.classList.remove('active');
      return;
    }

    if (dom.checkViewUnderlay) dom.checkViewUnderlay.style.display = 'inline';
    if (dom.btnToggleUnderlay) dom.btnToggleUnderlay.classList.add('active');

    const container = document.createElement('div');
    container.className = `underlay-container ${underlay.locked !== false ? 'locked' : 'unlocked'}`;
    container.id = 'underlay-container';
    container.style.left = `${safeNum(underlay.x, 0)}px`;
    container.style.top = `${safeNum(underlay.y, 0)}px`;
    container.style.opacity = clamp(safeNum(underlay.opacity, 40), 0, 100) / 100;

    const img = document.createElement('img');
    img.className = 'underlay-image';
    img.src = safeSrc;
    img.alt = underlay.name || 'Plano de fondo';
    img.draggable = false;

    const scale = clamp(safeNum(underlay.scale, 100), 10, 600) / 100;
    const uw = safeNum(underlay.width, 0);
    const uh = safeNum(underlay.height, 0);
    if (uw > 0 && uh > 0) {
      img.style.width = `${Math.round(uw * scale)}px`;
      img.style.height = `${Math.round(uh * scale)}px`;
    }

    container.appendChild(img);
    dom.underlayLayer.appendChild(container);

    // Permitir arrastrar la imagen en el lienzo cuando está desbloqueada
    if (underlay.locked === false) {
      setupUnderlayDragging(container, underlay);
    }
  }

export function setupUnderlayDragging(container, underlay) {
    let startX = 0, startY = 0;
    let origX = 0, origY = 0;
    let hasMoved = false;
    let underlayRafId = null;
    let pendingUnderlayPos = null;

    container.addEventListener('pointerdown', (e) => {
      if (!e.isPrimary || state.readOnlyLock) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.stopPropagation();
      cleanupUnderlayEvents();
      const activePointerId = e.pointerId;
      isDraggingUnderlay = true;
      const ac = new AbortController();
      underlayDragAbort = ac;
      startX = e.clientX;
      startY = e.clientY;
      origX = underlay.x || 0;
      origY = underlay.y || 0;
      hasMoved = false;

      const applyUnderlayMove = () => {
        underlayRafId = null;
        if (!isDraggingUnderlay || !pendingUnderlayPos) return;
        underlay.x = pendingUnderlayPos.x;
        underlay.y = pendingUnderlayPos.y;
        container.style.left = `${underlay.x}px`;
        container.style.top = `${underlay.y}px`;
      };

      const onPointerMove = (moveEvent) => {
        if (!isDraggingUnderlay || moveEvent.pointerId !== activePointerId) return;
        const zoom = state.viewport.zoom || 1;
        const dx = (moveEvent.clientX - startX) / zoom;
        const dy = (moveEvent.clientY - startY) / zoom;
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
          hasMoved = true;
        }

        let newX = origX + dx;
        let newY = origY + dy;
        if (state.snapToGrid) {
          newX = Math.round(newX / state.gridSize) * state.gridSize;
          newY = Math.round(newY / state.gridSize) * state.gridSize;
        }

        pendingUnderlayPos = { x: Math.round(newX), y: Math.round(newY) };
        if (!underlayRafId) {
          underlayRafId = requestAnimationFrame(applyUnderlayMove);
        }
      };

      const onPointerEnd = (endEvent) => {
        if (endEvent.pointerId !== activePointerId) return;
        if (isDraggingUnderlay) {
          if (underlayRafId) {
            cancelAnimationFrame(underlayRafId);
            underlayRafId = null;
          }
          if (pendingUnderlayPos) {
            underlay.x = pendingUnderlayPos.x;
            underlay.y = pendingUnderlayPos.y;
            container.style.left = `${underlay.x}px`;
            container.style.top = `${underlay.y}px`;
            pendingUnderlayPos = null;
          }
          isDraggingUnderlay = false;
          if (underlayDragAbort === ac) {
            underlayDragAbort = null;
          }
          ac.abort();
          if (hasMoved) {
            saveState();
          }
        }
      };

      window.addEventListener('pointermove', onPointerMove, { signal: ac.signal });
      window.addEventListener('pointerup', onPointerEnd, { signal: ac.signal });
      window.addEventListener('pointercancel', onPointerEnd, { signal: ac.signal });
    });
  }

export function openUnderlayModal() {
    if (!dom.modalUnderlay) return;
    closeAllDropdowns();
    updateUnderlayModalUI();
    dom.modalUnderlay.classList.add('open');
  }

export function closeUnderlayModal() {
    if (!dom.modalUnderlay) return;
    dom.modalUnderlay.classList.remove('open');
  }

export function updateUnderlayModalUI() {
    const underlay = state.underlay;
    const hasUnderlay = Boolean(underlay && underlay.src);

    if (dom.underlayEmptyState) {
      dom.underlayEmptyState.style.display = hasUnderlay ? 'none' : 'block';
    }
    if (dom.underlayControlsCard) {
      dom.underlayControlsCard.style.display = hasUnderlay ? 'flex' : 'none';
    }

    if (hasUnderlay) {
      if (dom.lblUnderlayFilename) {
        dom.lblUnderlayFilename.textContent = underlay.name || 'Plano de fondo';
      }
      if (dom.lblUnderlayDims) {
        const sc = (underlay.scale || 100) / 100;
        const curW = Math.round((underlay.width || 0) * sc);
        const curH = Math.round((underlay.height || 0) * sc);
        dom.lblUnderlayDims.textContent = `${underlay.width || 0} × ${underlay.height || 0} px (En lienzo: ${curW} × ${curH} px)`;
      }
      if (dom.chkUnderlayVisible) {
        dom.chkUnderlayVisible.checked = underlay.visible !== false;
      }
      if (dom.chkUnderlayLocked) {
        dom.chkUnderlayLocked.checked = underlay.locked !== false;
      }
      if (dom.rngUnderlayOpacity) {
        dom.rngUnderlayOpacity.value = underlay.opacity !== undefined ? underlay.opacity : 40;
      }
      if (dom.lblUnderlayOpacity) {
        dom.lblUnderlayOpacity.textContent = `${underlay.opacity !== undefined ? underlay.opacity : 40}%`;
      }
      if (dom.rngUnderlayScale) {
        dom.rngUnderlayScale.value = underlay.scale !== undefined ? underlay.scale : 100;
      }
      if (dom.lblUnderlayScale) {
        dom.lblUnderlayScale.textContent = `${underlay.scale !== undefined ? underlay.scale : 100}%`;
      }
      if (dom.btnToggleMoveUnderlay) {
        const isUnlocked = underlay.locked === false;
        dom.btnToggleMoveUnderlay.classList.toggle('active', isUnlocked);
        dom.btnToggleMoveUnderlay.innerHTML = isUnlocked
          ? '<span>✓ Modo Mover Activo</span>'
          : '<span>Modo Mover Plano</span>';
      }
    }
  }

export function handleUnderlayFileSelect(e) {
    const file = e.target.files && e.target.files[0];
    if (file) processUnderlayFile(file);
    e.target.value = '';
  }

const ALLOWED_UNDERLAY_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const MAX_UNDERLAY_BYTES = 10 * 1024 * 1024;

export function processUnderlayFile(file) {
    if (!file) return;
    const mime = (file.type || '').toLowerCase();
    if (!ALLOWED_UNDERLAY_MIMES.has(mime)) {
      alert('Formato no soportado. Por favor selecciona una imagen válida (PNG, JPG, WEBP o GIF). Los archivos SVG no están permitidos por seguridad.');
      return;
    }
    if (file.size > MAX_UNDERLAY_BYTES) {
      alert('La imagen supera el tamaño máximo permitido de 10 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => {
      showToast('Error al leer el archivo de imagen.', 'error');
    };
    reader.onload = (event) => {
      const src = sanitizeUnderlaySrc(event.target?.result, false);
      if (!src) {
        showToast('Formato de imagen no válido o no soportado.', 'error');
        return;
      }
      const img = new Image();
      img.onerror = () => {
        showToast('No se pudo decodificar la imagen seleccionada.', 'error');
      };
      img.onload = () => {
        const currSheet = getCurrentSheet();
        const natW = img.naturalWidth || 800;
        const natH = img.naturalHeight || 600;
        let initialScale = 100;

        // Si la hoja tiene dimensiones delimitadas (A4, etc.), sugerir ajuste inicial
        if (currSheet && currSheet.pageSize !== 'infinite' && currSheet.pageWidth && currSheet.pageHeight) {
          const ratio = Math.min(currSheet.pageWidth / natW, currSheet.pageHeight / natH);
          if (ratio < 1) {
            initialScale = Math.max(20, Math.round(ratio * 100));
          }
        }

        state.underlay = {
          src,
          name: file.name,
          x: 0,
          y: 0,
          width: natW,
          height: natH,
          scale: initialScale,
          opacity: 40,
          visible: true,
          locked: true
        };

        renderUnderlay();
        saveState();
        showToast('Plano de fondo cargado correctamente', 'success');
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }

export function deleteUnderlay() {
    if (!state.underlay) return;
    if (confirm('¿Deseas quitar la imagen de plano de fondo de esta hoja?')) {
      state.underlay = null;
      pruneUnderlayImageStore();
      renderUnderlay();
      saveState();
      showToast('Plano eliminado', 'info');
    }
  }

export function fitUnderlayToCurrentSheet() {
    if (!state.underlay) return;
    const currSheet = getCurrentSheet();
    const sheetW = (currSheet && currSheet.pageSize !== 'infinite') ? (currSheet.pageWidth || 1123) : 1920;
    const sheetH = (currSheet && currSheet.pageSize !== 'infinite') ? (currSheet.pageHeight || 794) : 1080;

    const baseW = state.underlay.width || 800;
    const baseH = state.underlay.height || 600;

    const scaleX = (sheetW / baseW) * 100;
    const scaleY = (sheetH / baseH) * 100;
    const newScale = Math.round(Math.min(scaleX, scaleY));

    state.underlay.scale = Math.max(20, Math.min(600, newScale));
    state.underlay.x = 0;
    state.underlay.y = 0;

    renderUnderlay();
    saveState();
    showToast('Plano adaptado a la hoja', 'success');
  }

export function resetUnderlayPosition() {
    if (!state.underlay) return;
    state.underlay.x = 0;
    state.underlay.y = 0;
    renderUnderlay();
    saveState();
  }

export function toggleUnderlayVisibility() {
    if (!state.underlay) {
      openUnderlayModal();
      return;
    }
    state.underlay.visible = state.underlay.visible === false ? true : false;
    renderUnderlay();
    saveState();
    showToast(state.underlay.visible ? 'Plano de fondo visible' : 'Plano de fondo oculto', 'info');
  }


// Registrar métodos en el contexto global de aplicación
app.renderUnderlay = renderUnderlay;
app.setupUnderlayDragging = setupUnderlayDragging;
app.openUnderlayModal = openUnderlayModal;
app.closeUnderlayModal = closeUnderlayModal;
app.updateUnderlayModalUI = updateUnderlayModalUI;
app.handleUnderlayFileSelect = handleUnderlayFileSelect;
app.processUnderlayFile = processUnderlayFile;
app.deleteUnderlay = deleteUnderlay;
app.fitUnderlayToCurrentSheet = fitUnderlayToCurrentSheet;
app.resetUnderlayPosition = resetUnderlayPosition;
app.toggleUnderlayVisibility = toggleUnderlayVisibility;
