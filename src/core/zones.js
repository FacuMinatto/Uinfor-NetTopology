/**
 * NetTopology - Módulo src/core/zones.js
 */

import { state, dom } from '../state/store.js';
import { app } from '../core/appContext.js';
import { DEVICE_ICONS, DEVICE_ICONS_LIGHT, DEVICE_METADATA, CABLE_TYPES, getDeviceIcon, generateSwitchPorts, generateRouterPorts } from '../config/icons.js';
import { STORAGE_PROJECTS_KEY, STORAGE_ACTIVE_ID_KEY, STORAGE_LEGACY_KEY, SHEET_PRESETS, MAX_HISTORY_STEPS, DEFAULT_GRID_SIZE } from '../config/constants.js';
import { escapeHtml, incrementIp, formatDateForFile, clamp, generateId } from '../utils/helpers.js';
import { snapNodeCoordinates } from './nodes.js';
import { renderConnections } from './cables.js';
import { updateMinimap } from './canvas.js';
import { updateSelectionVisuals, selectElement, deselectAll, renderInspector } from '../ui/inspector.js';
import { pushHistoryState } from '../state/history.js';
import { saveState } from '../storage/db.js';
import { toggleInspector } from '../ui/topbar.js';



  // ==========================================================================
  // GESTIÓN DE ÁREAS Y ZONAS DE RED / VLAN
  // ==========================================================================
  const ZONE_COLOR_PALETTES = {
    cyan: { border: 'rgba(56, 189, 248, 0.65)', bg: 'rgba(56, 189, 248, 0.05)', text: '#38bdf8' },
    emerald: { border: 'rgba(16, 185, 129, 0.65)', bg: 'rgba(16, 185, 129, 0.05)', text: '#10b981' },
    amber: { border: 'rgba(245, 158, 11, 0.65)', bg: 'rgba(245, 158, 11, 0.05)', text: '#f59e0b' },
    rose: { border: 'rgba(244, 63, 94, 0.65)', bg: 'rgba(244, 63, 94, 0.05)', text: '#f43f5e' },
    purple: { border: 'rgba(168, 85, 247, 0.65)', bg: 'rgba(168, 85, 247, 0.05)', text: '#a855f7' },
    blue: { border: 'rgba(59, 130, 246, 0.65)', bg: 'rgba(59, 130, 246, 0.05)', text: '#3b82f6' }
  };

export function createZone(name = 'Zona VLAN', x = 100, y = 100, width = 320, height = 220, color = 'cyan') {
    const id = 'zone_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    const snapX = state.snapToGrid ? Math.round(x / state.gridSize) * state.gridSize : Math.round(x);
    const snapY = state.snapToGrid ? Math.round(y / state.gridSize) * state.gridSize : Math.round(y);
    const newZone = {
      id,
      name,
      color,
      x: snapX,
      y: snapY,
      width: Math.max(120, width),
      height: Math.max(80, height)
    };

    if (!Array.isArray(state.zones)) state.zones = [];
    state.zones.push(newZone);
    renderZones();
    selectElement('zone', id);
    pushHistoryState();
    saveState();
    return newZone;
  }

export function deleteZone(zoneId) {
    if (!Array.isArray(state.zones)) return;
    const idx = state.zones.findIndex(z => z.id === zoneId);
    if (idx !== -1) {
      state.zones.splice(idx, 1);
      if (state.selection.type === 'zone' && state.selection.id === zoneId) {
        deselectAll();
      }
      renderZones();
      pushHistoryState();
      saveState();
    }
  }

export function renderZones() {
    if (!dom.zonesLayer) return;
    dom.zonesLayer.innerHTML = '';
    if (!Array.isArray(state.zones)) return;

    state.zones.forEach(zone => {
      const el = document.createElement('div');
      el.id = zone.id;
      el.className = 'network-zone';
      if (state.selection.type === 'zone' && state.selection.id === zone.id) {
        el.classList.add('selected');
      }

      const colors = ZONE_COLOR_PALETTES[zone.color] || ZONE_COLOR_PALETTES.cyan;
      el.style.left = `${zone.x}px`;
      el.style.top = `${zone.y}px`;
      el.style.width = `${zone.width}px`;
      el.style.height = `${zone.height}px`;
      el.style.borderColor = colors.border;
      el.style.backgroundColor = colors.bg;

      el.innerHTML = `
        <div class="zone-header" style="border-bottom-color: ${colors.border};">
          <div class="zone-title">
            <span class="zone-color-tag" style="background-color: ${colors.text};"></span>
            <span class="zone-name-text">${escapeHtml(zone.name || 'Zona')}</span>
          </div>
          <div class="zone-actions">
            <button class="zone-btn-action btn-zone-del" title="Eliminar esta zona" type="button">✕</button>
          </div>
        </div>
        <!-- 4 Lados / Bordes para redimensionar desde cualquier lado -->
        <div class="zone-edge-handle zone-edge-t" data-dir="n" title="Arrastrar para redimensionar arriba"></div>
        <div class="zone-edge-handle zone-edge-b" data-dir="s" title="Arrastrar para redimensionar abajo"></div>
        <div class="zone-edge-handle zone-edge-l" data-dir="w" title="Arrastrar para redimensionar izquierda"></div>
        <div class="zone-edge-handle zone-edge-r" data-dir="e" title="Arrastrar para redimensionar derecha"></div>
        <!-- 4 Esquinas para redimensionar -->
        <div class="zone-corner-handle zone-corner-tl" data-dir="nw" title="Redimensionar esquina sup. izquierda"></div>
        <div class="zone-corner-handle zone-corner-tr" data-dir="ne" title="Redimensionar esquina sup. derecha"></div>
        <div class="zone-corner-handle zone-corner-bl" data-dir="sw" title="Redimensionar esquina inf. izquierda"></div>
        <div class="zone-corner-handle zone-corner-br" data-dir="se" title="Redimensionar esquina inf. derecha"></div>
      `;

      // Seleccionar la zona al hacer clic en su cabecera
      const headerEl = el.querySelector('.zone-header');
      if (headerEl) {
        headerEl.addEventListener('mousedown', (e) => {
          if (e.target.closest('.btn-zone-del')) return;
          selectElement('zone', zone.id);
        });
        headerEl.addEventListener('dblclick', (e) => {
          if (e.target.closest('.btn-zone-del')) return;
          e.stopPropagation();
          selectElement('zone', zone.id);
          if (dom.sidebarInspector && dom.sidebarInspector.classList.contains('collapsed')) {
            toggleInspector(false);
          }
          setTimeout(() => {
            const zName = document.getElementById('insp-zone-name');
            if (zName) {
              zName.focus();
              zName.select();
            }
          }, 50);
        });
      }

      // Botón eliminar dentro del header de la zona
      const btnDel = el.querySelector('.btn-zone-del');
      if (btnDel) {
        btnDel.addEventListener('click', (e) => {
          e.stopPropagation();
          deleteZone(zone.id);
        });
      }

      setupZoneDrag(el, zone);
      setupZoneResize(el, zone);

      dom.zonesLayer.appendChild(el);
    });
  }

export function setupZoneDrag(el, zone) {
    const header = el.querySelector('.zone-header');
    if (!header) return;

    let isDragging = false;
    let dragStart = { x: 0, y: 0 };
    let hasMoved = false;
    let dragRafId = null;
    let lastDx = 0;
    let lastDy = 0;

    let initialZonePositions = [];
    let initialNodePositions = [];
    let movingConnWaypoints = [];

    header.addEventListener('mousedown', (e) => {
      if (e.button !== 0 || e.target.closest('.zone-btn-action')) return;
      e.stopPropagation();
      e.preventDefault();

      const isMultiKey = e.shiftKey || e.ctrlKey || e.metaKey;
      if (!state.selectedZoneIds) state.selectedZoneIds = new Set();

      if (isMultiKey) {
        if (state.selectedZoneIds.has(zone.id)) {
          state.selectedZoneIds.delete(zone.id);
        } else {
          state.selectedZoneIds.add(zone.id);
        }
        const totalCount = state.selectedNodeIds.size + state.selectedZoneIds.size;
        state.selection = {
          type: totalCount > 1 ? 'multi-node' : (state.selectedZoneIds.has(zone.id) ? 'zone' : null),
          id: zone.id,
          ids: [...Array.from(state.selectedNodeIds), ...Array.from(state.selectedZoneIds)]
        };
        updateSelectionVisuals();
        renderConnections();
        renderInspector();
        if (!state.selectedZoneIds.has(zone.id)) return;
      } else {
        if (!state.selectedZoneIds.has(zone.id)) {
          state.selectedNodeIds.clear();
          state.selectedZoneIds.clear();
          state.selectedZoneIds.add(zone.id);
          selectElement('zone', zone.id);
        }
      }

      isDragging = true;
      state.isDraggingNode = true;
      hasMoved = false;
      dragStart = { x: e.clientX, y: e.clientY };

      const zonesToDrag = (state.zones || []).filter(z => state.selectedZoneIds.has(z.id));
      initialZonePositions = zonesToDrag.map(z => ({
        zone: z,
        x: z.x,
        y: z.y,
        el: document.getElementById(z.id)
      }));

      const nodesToDrag = (state.nodes || []).filter(n => state.selectedNodeIds.has(n.id));
      initialNodePositions = nodesToDrag.map(n => ({
        node: n,
        x: n.x,
        y: n.y,
        el: document.getElementById(n.id)
      }));

      movingConnWaypoints = state.connections
        .filter(c => state.selectedNodeIds.has(c.fromNodeId) && state.selectedNodeIds.has(c.toNodeId) && Array.isArray(c.waypoints) && c.waypoints.length > 0)
        .map(c => ({
          conn: c,
          initialWps: c.waypoints.map(w => ({ ...w }))
        }));

      const performZoneDragUpdate = () => {
        dragRafId = null;
        if (!isDragging) return;

        // Mover todas las zonas seleccionadas
        initialZonePositions.forEach(item => {
          let nx = item.x + lastDx;
          let ny = item.y + lastDy;
          if (state.snapToGrid) {
            nx = Math.round(nx / state.gridSize) * state.gridSize;
            ny = Math.round(ny / state.gridSize) * state.gridSize;
          }
          item.zone.x = Math.round(nx);
          item.zone.y = Math.round(ny);
          if (item.el) {
            item.el.style.left = `${item.zone.x}px`;
            item.el.style.top = `${item.zone.y}px`;
          }
        });

        // Mover todos los nodos seleccionados si formaban parte de la selección en bloque
        initialNodePositions.forEach(item => {
          let nx = item.x + lastDx;
          let ny = item.y + lastDy;
          if (state.snapToGrid) {
            const snapped = snapNodeCoordinates(nx, ny);
            nx = snapped.x;
            ny = snapped.y;
          }
          item.node.x = nx;
          item.node.y = ny;
          if (item.el) {
            item.el.style.left = `${nx}px`;
            item.el.style.top = `${ny}px`;
          }
        });

        // Trasladar waypoints de cables internos
        movingConnWaypoints.forEach(item => {
          item.conn.waypoints = item.initialWps.map(w => {
            let wx = w.x + lastDx;
            let wy = w.y + lastDy;
            if (state.snapToGrid) {
              wx = Math.round(wx / state.gridSize) * state.gridSize;
              wy = Math.round(wy / state.gridSize) * state.gridSize;
            }
            return { x: Math.round(wx), y: Math.round(wy) };
          });
        });

        if (initialNodePositions.length > 0) {
          renderConnections();
        }
      };

      const onMouseMove = (moveEvent) => {
        if (!isDragging) return;
        lastDx = (moveEvent.clientX - dragStart.x) / state.viewport.zoom;
        lastDy = (moveEvent.clientY - dragStart.y) / state.viewport.zoom;

        if (Math.abs(lastDx) > 1 || Math.abs(lastDy) > 1) {
          hasMoved = true;
        }

        if (!dragRafId) {
          dragRafId = requestAnimationFrame(performZoneDragUpdate);
        }
      };

      const onMouseUp = () => {
        if (isDragging) {
          isDragging = false;
          state.isDraggingNode = false;
          if (dragRafId) {
            cancelAnimationFrame(dragRafId);
            dragRafId = null;
          }
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
          if (hasMoved) {
            performZoneDragUpdate();
            renderConnections();
            pushHistoryState();
            saveState();
            if (typeof updateMinimap === 'function') updateMinimap();
          }
        }
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });

    header.addEventListener('click', (e) => {
      e.stopPropagation();
      if (hasMoved) return;
      const isMultiKey = e.shiftKey || e.ctrlKey || e.metaKey;
      const totalSelected = state.selectedNodeIds.size + (state.selectedZoneIds ? state.selectedZoneIds.size : 0);
      if (!isMultiKey && totalSelected > 1) {
        state.selectedNodeIds.clear();
        state.selectedZoneIds.clear();
        state.selectedZoneIds.add(zone.id);
        selectElement('zone', zone.id);
      }
    });
  }

export function setupZoneResize(el, zone) {
    const handles = el.querySelectorAll('.zone-edge-handle, .zone-corner-handle');
    if (!handles.length) return;

    handles.forEach(handle => {
      handle.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        e.preventDefault();

        const dir = handle.dataset.dir;
        let isResizing = true;
        const startX = e.clientX;
        const startY = e.clientY;
        const origX = zone.x;
        const origY = zone.y;
        const origW = zone.width;
        const origH = zone.height;
        const origRight = origX + origW;
        const origBottom = origY + origH;
        selectElement('zone', zone.id);

        const MIN_W = 120;
        const MIN_H = 80;
        let resizeRafId = null;
        let pendingResize = null;

        const onMouseMove = (moveEvent) => {
          if (!isResizing) return;
          pendingResize = moveEvent;
          if (!resizeRafId) {
            resizeRafId = requestAnimationFrame(() => {
              if (isResizing && pendingResize) {
                const zoom = state.viewport.zoom || 1;
                const dx = (pendingResize.clientX - startX) / zoom;
                const dy = (pendingResize.clientY - startY) / zoom;

                let newX = origX;
                let newY = origY;
                let newW = origW;
                let newH = origH;

                if (dir.includes('e')) {
                  let curRight = origRight + dx;
                  if (state.snapToGrid) curRight = Math.round(curRight / state.gridSize) * state.gridSize;
                  if (curRight - origX < MIN_W) curRight = origX + MIN_W;
                  newW = curRight - origX;
                } else if (dir.includes('w')) {
                  let curX = origX + dx;
                  if (state.snapToGrid) curX = Math.round(curX / state.gridSize) * state.gridSize;
                  if (origRight - curX < MIN_W) curX = origRight - MIN_W;
                  newX = curX;
                  newW = origRight - curX;
                }

                if (dir.includes('s')) {
                  let curBottom = origBottom + dy;
                  if (state.snapToGrid) curBottom = Math.round(curBottom / state.gridSize) * state.gridSize;
                  if (curBottom - origY < MIN_H) curBottom = origY + MIN_H;
                  newH = curBottom - origY;
                } else if (dir.includes('n')) {
                  let curY = origY + dy;
                  if (state.snapToGrid) curY = Math.round(curY / state.gridSize) * state.gridSize;
                  if (origBottom - curY < MIN_H) curY = origBottom - MIN_H;
                  newY = curY;
                  newH = origBottom - curY;
                }

                zone.x = Math.round(newX);
                zone.y = Math.round(newY);
                zone.width = Math.max(MIN_W, Math.round(newW));
                zone.height = Math.max(MIN_H, Math.round(newH));

                el.style.left = `${zone.x}px`;
                el.style.top = `${zone.y}px`;
                el.style.width = `${zone.width}px`;
                el.style.height = `${zone.height}px`;

                const inspX = document.getElementById('insp-zone-x');
                const inspY = document.getElementById('insp-zone-y');
                const inspW = document.getElementById('insp-zone-w');
                const inspH = document.getElementById('insp-zone-h');
                if (inspX) inspX.value = zone.x;
                if (inspY) inspY.value = zone.y;
                if (inspW) inspW.value = zone.width;
                if (inspH) inspH.value = zone.height;
              }
              resizeRafId = null;
            });
          }
        };

        const onMouseUp = () => {
          if (resizeRafId) {
            cancelAnimationFrame(resizeRafId);
            resizeRafId = null;
          }
          if (isResizing) {
            isResizing = false;
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            pushHistoryState();
            saveState();
          }
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      });
    });
  }


// Registrar métodos en el contexto global de aplicación
app.createZone = createZone;
app.deleteZone = deleteZone;
app.renderZones = renderZones;
app.setupZoneDrag = setupZoneDrag;
app.setupZoneResize = setupZoneResize;
