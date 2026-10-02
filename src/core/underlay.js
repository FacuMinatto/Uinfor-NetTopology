/**
 * NetTopology - Módulo src/core/underlay.js
 */

import { state, dom } from '../state/store.js';
import { app } from '../core/appContext.js';
import { DEVICE_ICONS, DEVICE_ICONS_LIGHT, DEVICE_METADATA, CABLE_TYPES, getDeviceIcon, generateSwitchPorts, generateRouterPorts } from '../config/icons.js';
import { STORAGE_PROJECTS_KEY, STORAGE_ACTIVE_ID_KEY, STORAGE_LEGACY_KEY, SHEET_PRESETS, ZONE_COLOR_PALETTES, MAX_HISTORY_STEPS, DEFAULT_GRID_SIZE } from '../config/constants.js';
import { escapeHtml, incrementIp, formatDateForFile, clamp, generateId } from '../utils/helpers.js';
import { getCurrentSheet } from './sheets.js';
import { pushHistoryState } from '../state/history.js';
import { saveState, showToast } from '../storage/db.js';
import { closeAllDropdowns } from '../ui/topbar.js';



  // ==========================================================================
  // CAPA DE PLANO ARQUITECTÓNICO / IMAGEN DE FONDO (UNDERLAY)
  // ==========================================================================
  let isDraggingUnderlay = false;

export function renderUnderlay() {
    if (!dom.underlayLayer) return;
    dom.underlayLayer.innerHTML = '';

    const underlay = state.underlay;
    updateUnderlayModalUI();

    if (!underlay || !underlay.src || underlay.visible === false) {
      if (dom.checkViewUnderlay) dom.checkViewUnderlay.style.display = 'none';
      if (dom.btnToggleUnderlay) dom.btnToggleUnderlay.classList.remove('active');
      return;
    }

    if (dom.checkViewUnderlay) dom.checkViewUnderlay.style.display = 'inline';
    if (dom.btnToggleUnderlay) dom.btnToggleUnderlay.classList.add('active');

    const container = document.createElement('div');
    container.className = `underlay-container ${underlay.locked !== false ? 'locked' : 'unlocked'}`;
    container.id = 'underlay-container';
    container.style.left = `${underlay.x || 0}px`;
    container.style.top = `${underlay.y || 0}px`;
    container.style.opacity = (typeof underlay.opacity === 'number' ? underlay.opacity : 40) / 100;

    const img = document.createElement('img');
    img.className = 'underlay-image';
    img.src = underlay.src;
    img.alt = underlay.name || 'Plano de fondo';
    img.draggable = false;

    const scale = (typeof underlay.scale === 'number' ? underlay.scale : 100) / 100;
    if (underlay.width && underlay.height) {
      img.style.width = `${Math.round(underlay.width * scale)}px`;
      img.style.height = `${Math.round(underlay.height * scale)}px`;
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

    container.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      isDraggingUnderlay = true;
      startX = e.clientX;
      startY = e.clientY;
      origX = underlay.x || 0;
      origY = underlay.y || 0;
      hasMoved = false;

      const onMouseMove = (moveEvent) => {
        if (!isDraggingUnderlay) return;
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

        underlay.x = Math.round(newX);
        underlay.y = Math.round(newY);
        container.style.left = `${underlay.x}px`;
        container.style.top = `${underlay.y}px`;
      };

      const onMouseUp = () => {
        if (isDraggingUnderlay) {
          isDraggingUnderlay = false;
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
          if (hasMoved) {
            pushHistoryState();
            saveState();
          }
        }
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
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

export function processUnderlayFile(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido (PNG, JPG, SVG o WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target.result;
      const img = new Image();
      img.onload = () => {
        const currSheet = getCurrentSheet();
        let initW = img.naturalWidth || 800;
        let initH = img.naturalHeight || 600;
        let initX = 0;
        let initY = 0;

        // Si la hoja tiene dimensiones delimitadas (A4, etc.), sugerir ajuste inicial
        if (currSheet && currSheet.pageSize !== 'infinite' && currSheet.pageWidth) {
          const ratio = Math.min(currSheet.pageWidth / initW, currSheet.pageHeight / initH);
          if (ratio < 1) {
            initW = Math.round(initW * ratio);
            initH = Math.round(initH * ratio);
          }
        }

        state.underlay = {
          src,
          name: file.name,
          x: initX,
          y: initY,
          width: img.naturalWidth || 800,
          height: img.naturalHeight || 600,
          scale: 100,
          opacity: 40,
          visible: true,
          locked: true
        };

        renderUnderlay();
        pushHistoryState();
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
      renderUnderlay();
      pushHistoryState();
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
    pushHistoryState();
    saveState();
    showToast('Plano adaptado a la hoja', 'success');
  }

export function resetUnderlayPosition() {
    if (!state.underlay) return;
    state.underlay.x = 0;
    state.underlay.y = 0;
    renderUnderlay();
    pushHistoryState();
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
