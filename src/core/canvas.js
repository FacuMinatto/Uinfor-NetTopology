/**
 * NetTopology - Módulo src/core/canvas.js
 */

import { state, dom } from '../state/store.js';
import { app } from '../core/appContext.js';
import { DEVICE_ICONS, DEVICE_ICONS_LIGHT, DEVICE_METADATA, CABLE_TYPES, getDeviceIcon, generateSwitchPorts, generateRouterPorts } from '../config/icons.js';
import { STORAGE_PROJECTS_KEY, STORAGE_ACTIVE_ID_KEY, STORAGE_LEGACY_KEY, SHEET_PRESETS, ZONE_COLOR_PALETTES, MAX_HISTORY_STEPS, DEFAULT_GRID_SIZE } from '../config/constants.js';
import { escapeHtml, incrementIp, formatDateForFile, clamp, generateId } from '../utils/helpers.js';
import { createNode } from './nodes.js';
import { getNodeEdgeAnchor, renderConnections } from './cables.js';
import { openCableConfigModal } from '../ui/modals.js';
import { updateSelectionVisuals, deselectAll, renderInspector } from '../ui/inspector.js';
import { createZone } from './zones.js';
import { getCurrentSheet } from './sheets.js';
import { saveState } from '../storage/db.js';



  // ==========================================================================
  // ==========================================================================
  // MANIPULACIÓN DE EVENTOS DEL CANVAS (HOJA INFINITA, PAN, ZOOM, DRAG & DROP)
  // ==========================================================================
export function setCanvasMode(mode) {
    state.canvasMode = mode;
    if (dom.btnModeSelect) dom.btnModeSelect.classList.toggle('active-mode', mode === 'select');
    if (dom.btnModePan) dom.btnModePan.classList.toggle('active-mode', mode === 'pan');
    dom.viewport.classList.toggle('mode-pan', mode === 'pan');
  }

export function setupCanvasEvents() {
    let isPanning = false;
    let startPan = { x: 0, y: 0 };
    let isSpacePressed = false;

    // Detectar barra espaciadora para paneo fluido tipo Figma / Miro
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        e.preventDefault(); // Prevenir scroll nativo de página con barra espaciadora
        if (!isSpacePressed) {
          isSpacePressed = true;
          dom.viewport.classList.add('space-grab');
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        isSpacePressed = false;
        dom.viewport.classList.remove('space-grab');
        if (isPanning) {
          isPanning = false;
          dom.viewport.classList.remove('panning');
        }
      }
    });

    // Soltar dispositivo desde la paleta izquierda
    dom.viewport.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    });

    dom.viewport.addEventListener('drop', (e) => {
      e.preventDefault();
      const type = e.dataTransfer.getData('text/plain');
      if (type === 'vlan_zone' || type === 'zone') {
        const rect = dom.viewport.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        const worldPos = screenToWorld(screenX, screenY);
        createZone('VLAN ' + ((state.zones ? state.zones.length : 0) + 10), worldPos.x - 160, worldPos.y - 110, 320, 220);
        saveState();
        return;
      }
      if (type && DEVICE_METADATA[type]) {
        const rect = dom.viewport.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        const worldPos = screenToWorld(screenX, screenY);
        createNode(type, worldPos.x - 52, worldPos.y - 40);
        saveState();
      }
    });

    // Paneo infinito o Selección por recuadro (Marquee Selection)
    let isMarqueeSelecting = false;
    let marqueeStart = { clientX: 0, clientY: 0, screenX: 0, screenY: 0 };

    dom.viewport.addEventListener('mousedown', (e) => {
      const isMiddleClick = e.button === 1;
      const isRightClick = e.button === 2;
      const isSpaceClick = (e.button === 0 && isSpacePressed);
      const isPanModeClick = (state.canvasMode === 'pan' && e.button === 0);
      const isInteractive = e.target.closest('.network-node') || 
                            e.target.closest('.node-cable-handle') || 
                            e.target.closest('.canvas-controls') || 
                            e.target.closest('.floating-panel-toggle') || 
                            e.target.closest('.port-badge') || 
                            e.target.closest('.cable-waypoint-group') || 
                            e.target.closest('.cable-ghost-handle') || 
                            e.target.closest('.zone-header') || 
                            e.target.closest('.zone-edge-handle') || 
                            e.target.closest('.zone-corner-handle') || 
                            e.target.classList.contains('network-cable') || 
                            e.target.classList.contains('cable-outline');

      // Paneo con: Botón derecho, Botón central, Espacio + Clic, o Modo Mano (Pan)
      if (isMiddleClick || isRightClick || isSpaceClick || (isPanModeClick && !isInteractive)) {
        isPanning = true;
        startPan = { x: e.clientX - state.viewport.x, y: e.clientY - state.viewport.y };
        dom.viewport.classList.add('panning');
        e.preventDefault();
        return;
      }

      if (!isInteractive && e.button === 0 && state.canvasMode === 'select') {
        // Clic en el fondo libre: iniciar marquesina de selección elástica
        const rect = dom.viewport.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;

        marqueeStart = { clientX: e.clientX, clientY: e.clientY, screenX, screenY };
        isMarqueeSelecting = true;

        if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
          deselectAll();
        }

        if (dom.marquee) {
          dom.marquee.style.left = `${screenX}px`;
          dom.marquee.style.top = `${screenY}px`;
          dom.marquee.style.width = '0px';
          dom.marquee.style.height = '0px';
          dom.marquee.style.display = 'block';
        }
        e.preventDefault();
      }
    });

    // Evitar menú contextual al usar clic derecho para panear
    dom.viewport.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    let panRafId = null;
    let pendingPan = null;

    let marqueeRafId = null;
    let pendingMarquee = null;

    let connectingRafId = null;
    let pendingConnecting = null;

    window.addEventListener('mousemove', (e) => {
      if (state.collab && state.collab.active && app.sendLocalCursor && dom.viewport) {
        const rect = dom.viewport.getBoundingClientRect();
        const world = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
        app.sendLocalCursor(world.x, world.y);
      }

      if (isPanning) {
        pendingPan = { clientX: e.clientX, clientY: e.clientY };
        if (!panRafId) {
          panRafId = requestAnimationFrame(() => {
            if (isPanning && pendingPan) {
              state.viewport.x = pendingPan.clientX - startPan.x;
              state.viewport.y = pendingPan.clientY - startPan.y;
              updateViewportTransform();
            }
            panRafId = null;
          });
        }
      } else if (isMarqueeSelecting) {
        pendingMarquee = {
          clientX: e.clientX,
          clientY: e.clientY,
          shiftKey: e.shiftKey,
          ctrlKey: e.ctrlKey,
          metaKey: e.metaKey
        };
        if (!marqueeRafId) {
          marqueeRafId = requestAnimationFrame(() => {
            if (isMarqueeSelecting && pendingMarquee) {
              const rect = dom.viewport.getBoundingClientRect();
              const curScreenX = Math.max(0, Math.min(rect.width, pendingMarquee.clientX - rect.left));
              const curScreenY = Math.max(0, Math.min(rect.height, pendingMarquee.clientY - rect.top));

              const minX = Math.min(marqueeStart.screenX, curScreenX);
              const maxX = Math.max(marqueeStart.screenX, curScreenX);
              const minY = Math.min(marqueeStart.screenY, curScreenY);
              const maxY = Math.max(marqueeStart.screenY, curScreenY);

              if (dom.marquee) {
                dom.marquee.style.left = `${minX}px`;
                dom.marquee.style.top = `${minY}px`;
                dom.marquee.style.width = `${maxX - minX}px`;
                dom.marquee.style.height = `${maxY - minY}px`;
                dom.marquee.style.display = 'block';
              }

              // Convertir caja a coordenadas del mundo del lienzo
              const worldMin = screenToWorld(minX, minY);
              const worldMax = screenToWorld(maxX, maxY);

              // Detectar nodos dentro o tocando la caja
              const baseSelected = (pendingMarquee.shiftKey || pendingMarquee.ctrlKey || pendingMarquee.metaKey) ? new Set(state.selectedNodeIds) : new Set();
              state.nodes.forEach(node => {
                const hw = 40 * (node.scale || 1);
                const hh = 40 * (node.scale || 1);
                const nodeMinX = node.x - hw;
                const nodeMaxX = node.x + hw;
                const nodeMinY = node.y - hh;
                const nodeMaxY = node.y + hh;

                const intersects = !(nodeMaxX < worldMin.x || nodeMinX > worldMax.x || nodeMaxY < worldMin.y || nodeMinY > worldMax.y);
                if (intersects) {
                  baseSelected.add(node.id);
                }
              });
              state.selectedNodeIds = baseSelected;

              // Detectar zonas dentro o englobadas por la caja (selección gigante)
              const baseSelectedZones = (pendingMarquee.shiftKey || pendingMarquee.ctrlKey || pendingMarquee.metaKey) ? new Set(state.selectedZoneIds) : new Set();
              if (Array.isArray(state.zones)) {
                const marqueeW = worldMax.x - worldMin.x;
                const marqueeH = worldMax.y - worldMin.y;

                state.zones.forEach(zone => {
                  const zMinX = zone.x;
                  const zMaxX = zone.x + zone.width;
                  const zMinY = zone.y;
                  const zMaxY = zone.y + zone.height;

                  const headerH = 38;
                  const headerIntersects = !(zMaxX < worldMin.x || zMinX > worldMax.x || (zMinY + headerH) < worldMin.y || zMinY > worldMax.y);
                  const boxEnclosesZone = (zMinX >= worldMin.x && zMaxX <= worldMax.x && zMinY >= worldMin.y && zMaxY <= worldMax.y);
                  const zoneIntersects = !(zMaxX < worldMin.x || zMinX > worldMax.x || zMaxY < worldMin.y || zMinY > worldMax.y);
                  const isGiantMarquee = (marqueeW > zone.width * 0.45 && marqueeH > zone.height * 0.45);

                  if (headerIntersects || boxEnclosesZone || (zoneIntersects && isGiantMarquee)) {
                    baseSelectedZones.add(zone.id);
                  }
                });
              }
              state.selectedZoneIds = baseSelectedZones;

              const totalCount = state.selectedNodeIds.size + state.selectedZoneIds.size;
              state.selection = {
                type: totalCount > 1 ? 'multi-node' : (state.selectedNodeIds.size === 1 ? 'node' : (state.selectedZoneIds.size === 1 ? 'zone' : null)),
                id: state.selectedNodeIds.size > 0 ? Array.from(state.selectedNodeIds)[0] : (state.selectedZoneIds.size > 0 ? Array.from(state.selectedZoneIds)[0] : null),
                ids: [...Array.from(state.selectedNodeIds), ...Array.from(state.selectedZoneIds)]
              };
              updateSelectionVisuals();
            }
            marqueeRafId = null;
          });
        }
      } else if (state.isConnecting) {
        pendingConnecting = { clientX: e.clientX, clientY: e.clientY };
        if (!connectingRafId) {
          connectingRafId = requestAnimationFrame(() => {
            if (state.isConnecting && pendingConnecting) {
              // Actualizar cable elástico temporal mientras se arrastra
              const sourceNode = state.nodes.find(n => n.id === state.connectingSourceNodeId);
              if (sourceNode) {
                const rect = dom.viewport.getBoundingClientRect();
                const screenX = pendingConnecting.clientX - rect.left;
                const screenY = pendingConnecting.clientY - rect.top;
                const mouseWorld = screenToWorld(screenX, screenY);

                const anchor = getNodeEdgeAnchor(sourceNode, mouseWorld.x, mouseWorld.y);
                dom.tempCable.setAttribute('d', `M ${anchor.x} ${anchor.y} L ${mouseWorld.x} ${mouseWorld.y}`);
                dom.tempCable.style.display = 'block';
              }
            }
            connectingRafId = null;
          });
        }
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (panRafId) {
        cancelAnimationFrame(panRafId);
        panRafId = null;
      }
      if (marqueeRafId) {
        cancelAnimationFrame(marqueeRafId);
        marqueeRafId = null;
      }
      if (connectingRafId) {
        cancelAnimationFrame(connectingRafId);
        connectingRafId = null;
      }

      if (isPanning) {
        isPanning = false;
        dom.viewport.classList.remove('panning');
      }

      if (isMarqueeSelecting) {
        isMarqueeSelecting = false;
        if (dom.marquee) {
          dom.marquee.style.display = 'none';
        }
        renderConnections();
        renderInspector();
      }

      if (state.isConnecting) {
        state.isConnecting = false;
        dom.tempCable.style.display = 'none';

        // Detectar si soltó sobre un nodo destino
        const targetElement = document.elementFromPoint(e.clientX, e.clientY);
        const targetNodeEl = targetElement ? targetElement.closest('.network-node') : null;

        if (targetNodeEl && targetNodeEl.id !== state.connectingSourceNodeId) {
          openCableConfigModal(state.connectingSourceNodeId, targetNodeEl.id);
        }
        state.connectingSourceNodeId = null;
      }
    });

    // Zoom suave y controlado con rueda del ratón hacia el puntero
    dom.viewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = 1.05; // Velocidad de zoom más suave y controlada
      const delta = e.deltaY < 0 ? zoomFactor : 1 / zoomFactor;
      applyZoom(delta, e.clientX, e.clientY);
    }, { passive: false });
  }

export function applyZoom(delta, clientX, clientY) {
    const oldZoom = state.viewport.zoom;
    let newZoom = oldZoom * delta;
    newZoom = Math.min(Math.max(newZoom, 0.15), 3.0); // Rango ampliado de 15% a 300% para la hoja infinita

    const rect = dom.viewport.getBoundingClientRect();
    const mouseX = clientX !== undefined ? (clientX - rect.left) : (rect.width / 2);
    const mouseY = clientY !== undefined ? (clientY - rect.top) : (rect.height / 2);

    // Ajustar origen para hacer zoom exactamente hacia el puntero del mouse
    state.viewport.x = mouseX - (mouseX - state.viewport.x) * (newZoom / oldZoom);
    state.viewport.y = mouseY - (mouseY - state.viewport.y) * (newZoom / oldZoom);
    state.viewport.zoom = newZoom;

    updateViewportTransform();
  }

export function updateViewportTransform() {
    dom.world.style.transform = `translate(${state.viewport.x}px, ${state.viewport.y}px) scale(${state.viewport.zoom})`;
    dom.zoomValue.textContent = `${Math.round(state.viewport.zoom * 100)}%`;

    // Sincronizar la cuadrícula infinita con la posición y el zoom del lienzo
    const zoom = state.viewport.zoom;
    const dotSize = state.gridSize * zoom;
    const majorLineSize = (state.gridSize * 5) * zoom;
    const posX = state.viewport.x;
    const posY = state.viewport.y;
    const dotOffset = (state.gridSize / 2) * zoom;

    dom.viewport.style.backgroundPosition = `${posX - dotOffset}px ${posY - dotOffset}px, ${posX}px ${posY}px, ${posX}px ${posY}px`;
    dom.viewport.style.backgroundSize = `${dotSize}px ${dotSize}px, ${majorLineSize}px ${majorLineSize}px, ${majorLineSize}px ${majorLineSize}px`;

    if (typeof updateMinimap === 'function') {
      updateMinimap();
    }
  }

  // Centrar y encuadrar todos los equipos en la pantalla (Fit to screen)
export function fitViewToNodes() {
    if (!state.nodes || state.nodes.length === 0) {
      state.viewport.x = 80;
      state.viewport.y = 80;
      state.viewport.zoom = 1;
      updateViewportTransform();
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    state.nodes.forEach(n => {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + 104);
      maxY = Math.max(maxY, n.y + 110);
    });

    const padding = 100;
    const contentW = (maxX - minX) + padding * 2;
    const contentH = (maxY - minY) + padding * 2;
    const viewRect = dom.viewport.getBoundingClientRect();
    const viewW = viewRect.width || window.innerWidth;
    const viewH = viewRect.height || window.innerHeight;

    let targetZoom = Math.min(viewW / contentW, viewH / contentH);
    targetZoom = Math.min(Math.max(targetZoom, 0.25), 1.5);

    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;

    state.viewport.zoom = targetZoom;
    state.viewport.x = (viewW / 2) - midX * targetZoom;
    state.viewport.y = (viewH / 2) - midY * targetZoom;

    updateViewportTransform();
  }

export function screenToWorld(screenX, screenY) {
    return {
      x: (screenX - state.viewport.x) / state.viewport.zoom,
      y: (screenY - state.viewport.y) / state.viewport.zoom
    };
  }

export function getCanvasCenterWorld() {
    const rect = dom.viewport.getBoundingClientRect();
    return screenToWorld(rect.width / 2, rect.height / 2);
  }

  // ==========================================================================
  // GUÍAS MAGNÉTICAS INTELIGENTES (SMART GUIDES)
  // ==========================================================================
export function drawAlignmentGuides(primaryNode) {
    if (!state.smartGuidesEnabled || !dom.alignmentGuidesOverlay) return;
    dom.alignmentGuidesOverlay.innerHTML = '';

    const snapDist = 6;
    const stationaryNodes = state.nodes.filter(n => !state.selectedNodeIds.has(n.id));
    if (stationaryNodes.length === 0) return;

    const pw = 104;
    const ph = 70;
    const pcx = primaryNode.x + pw / 2;
    const pcy = primaryNode.y + ph / 2;

    let snappedX = primaryNode.x;
    let snappedY = primaryNode.y;
    let guideX = null;
    let guideY = null;

    for (const other of stationaryNodes) {
      const ow = 104;
      const oh = 70;
      const ocx = other.x + ow / 2;
      const ocy = other.y + oh / 2;

      // Alineación Horizontal en Centros Y o bordes Y
      if (Math.abs(pcy - ocy) <= snapDist) {
        snappedY = ocy - ph / 2;
        guideY = ocy;
      } else if (Math.abs(primaryNode.y - other.y) <= snapDist) {
        snappedY = other.y;
        guideY = other.y;
      }

      // Alineación Vertical en Centros X o bordes X
      if (Math.abs(pcx - ocx) <= snapDist) {
        snappedX = ocx - pw / 2;
        guideX = ocx;
      } else if (Math.abs(primaryNode.x - other.x) <= snapDist) {
        snappedX = other.x;
        guideX = other.x;
      }
    }

    primaryNode.x = snappedX;
    primaryNode.y = snappedY;

    if (guideY !== null) {
      const lineY = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      lineY.setAttribute('x1', '-5000');
      lineY.setAttribute('y1', guideY);
      lineY.setAttribute('x2', '10000');
      lineY.setAttribute('y2', guideY);
      lineY.setAttribute('class', 'alignment-guide-line');
      dom.alignmentGuidesOverlay.appendChild(lineY);
    }

    if (guideX !== null) {
      const lineX = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      lineX.setAttribute('x1', guideX);
      lineX.setAttribute('y1', '-5000');
      lineX.setAttribute('x2', guideX);
      lineX.setAttribute('y2', '10000');
      lineX.setAttribute('class', 'alignment-guide-line');
      dom.alignmentGuidesOverlay.appendChild(lineX);
    }
  }

export function clearAlignmentGuides() {
    if (dom.alignmentGuidesOverlay) {
      dom.alignmentGuidesOverlay.innerHTML = '';
    }
  }

  // ==========================================================================
  // GESTIÓN DEL MINIMAPA INTERACTIVO (RADAR)
  // ==========================================================================
  let isMinimapDragging = false;
  let minimapBoundsCache = null;

export function initMinimap() {
    if (!dom.canvasMinimap || !dom.minimapCanvas) return;

    try {
      const savedMinimap = localStorage.getItem('nettopology_minimap_visible');
      if (savedMinimap !== null) {
        state.minimapVisible = (savedMinimap === 'true');
      }
    } catch (e) {}

    dom.canvasMinimap.classList.toggle('is-hidden', !state.minimapVisible);
    if (dom.checkViewMinimap) {
      dom.checkViewMinimap.textContent = state.minimapVisible ? '✓' : '';
    }

    if (dom.minimapHeaderToggle) {
      dom.minimapHeaderToggle.addEventListener('click', (e) => {
        if (e.target.closest('#btn-minimize-minimap')) return;
        toggleMinimapCollapse();
      });
    }

    if (dom.btnMinimizeMinimap) {
      dom.btnMinimizeMinimap.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMinimapCollapse();
      });
    }

    const handleMinimapPointer = (e) => {
      const rect = dom.minimapCanvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      panCanvasFromMinimapCoord(clickX, clickY);
    };

    dom.minimapCanvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      isMinimapDragging = true;
      handleMinimapPointer(e);
    });

    if (dom.minimapViewport) {
      dom.minimapViewport.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        isMinimapDragging = true;
      });
    }

    window.addEventListener('mousemove', (e) => {
      if (!isMinimapDragging) return;
      handleMinimapPointer(e);
    });

    window.addEventListener('mouseup', () => {
      if (isMinimapDragging) {
        isMinimapDragging = false;
      }
    });

    updateMinimap();
  }

export function toggleMinimapCollapse() {
    if (!dom.canvasMinimap) return;
    dom.canvasMinimap.classList.toggle('is-minimized');
    if (!dom.canvasMinimap.classList.contains('is-minimized')) {
      updateMinimap();
    }
  }

export function toggleMinimapVisibility(forceState) {
    state.minimapVisible = (typeof forceState === 'boolean') ? forceState : !state.minimapVisible;
    if (dom.canvasMinimap) {
      dom.canvasMinimap.classList.toggle('is-hidden', !state.minimapVisible);
    }
    if (dom.checkViewMinimap) {
      dom.checkViewMinimap.textContent = state.minimapVisible ? '✓' : '';
    }
    try {
      localStorage.setItem('nettopology_minimap_visible', state.minimapVisible ? 'true' : 'false');
    } catch (e) {}
    if (state.minimapVisible) {
      updateMinimap();
    }
  }

  let minimapRafId = null;
export function updateMinimap() {
    if (!state.minimapVisible || !dom.minimapCanvas || !dom.viewport) return;
    if (minimapRafId) return;
    minimapRafId = requestAnimationFrame(() => {
      minimapRafId = null;
      renderMinimapDirect();
    });
  }

export function renderMinimapDirect() {
    if (!state.minimapVisible || !dom.minimapCanvas || !dom.viewport) return;
    const ctx = dom.minimapCanvas.getContext('2d');
    if (!ctx) return;

    const mw = dom.minimapCanvas.width;
    const mh = dom.minimapCanvas.height;
    ctx.clearRect(0, 0, mw, mh);

    const vpW = dom.viewport.clientWidth || 800;
    const vpH = dom.viewport.clientHeight || 600;

    const viewWorldX1 = -state.viewport.x / state.viewport.zoom;
    const viewWorldY1 = -state.viewport.y / state.viewport.zoom;
    const viewWorldX2 = viewWorldX1 + vpW / state.viewport.zoom;
    const viewWorldY2 = viewWorldY1 + vpH / state.viewport.zoom;

    let minX = Math.min(viewWorldX1, 0);
    let minY = Math.min(viewWorldY1, 0);
    let maxX = Math.max(viewWorldX2, 1200);
    let maxY = Math.max(viewWorldY2, 800);

    const currSheet = getCurrentSheet();
    if (currSheet && currSheet.pageSize !== 'infinite') {
      maxX = Math.max(maxX, currSheet.pageWidth);
      maxY = Math.max(maxY, currSheet.pageHeight);
    }

    const nodeMap = new Map();
    state.nodes.forEach(n => {
      nodeMap.set(n.id, n);
      minX = Math.min(minX, n.x - 30);
      minY = Math.min(minY, n.y - 30);
      maxX = Math.max(maxX, n.x + 130);
      maxY = Math.max(maxY, n.y + 110);
    });

    const padding = 100;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    const worldWidth = Math.max(maxX - minX, 100);
    const worldHeight = Math.max(maxY - minY, 100);

    const scale = Math.min(mw / worldWidth, mh / worldHeight);
    const offsetX = (mw - worldWidth * scale) / 2 - minX * scale;
    const offsetY = (mh - worldHeight * scale) / 2 - minY * scale;

    minimapBoundsCache = { minX, minY, maxX, maxY, scale, offsetX, offsetY };

    const isLight = document.body.getAttribute('data-theme') === 'light';

    // 1. Dibujar hoja si no es infinita
    if (currSheet && currSheet.pageSize !== 'infinite') {
      const sx = currSheet.pageWidth * scale;
      const sy = currSheet.pageHeight * scale;
      ctx.fillStyle = isLight ? '#ffffff' : '#0b1120';
      ctx.strokeStyle = isLight ? '#cbd5e1' : 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 1;
      ctx.fillRect(offsetX, offsetY, sx, sy);
      ctx.strokeRect(offsetX, offsetY, sx, sy);
    }

    // 2. Dibujar conexiones (cables)
    ctx.lineWidth = 1;
    state.connections.forEach(conn => {
      const nodeA = nodeMap.get(conn.fromNodeId);
      const nodeB = nodeMap.get(conn.toNodeId);
      if (!nodeA || !nodeB) return;

      const ax = (nodeA.x + 52) * scale + offsetX;
      const ay = (nodeA.y + 35) * scale + offsetY;
      const bx = (nodeB.x + 52) * scale + offsetX;
      const by = (nodeB.y + 35) * scale + offsetY;

      ctx.beginPath();
      ctx.moveTo(ax, ay);
      if (Array.isArray(conn.waypoints) && conn.waypoints.length > 0) {
        conn.waypoints.forEach(wp => {
          ctx.lineTo(wp.x * scale + offsetX, wp.y * scale + offsetY);
        });
      }
      ctx.lineTo(bx, by);
      ctx.strokeStyle = conn.cableType === 'fiber' ? (isLight ? '#d97706' : '#f59e0b') :
                        conn.cableType === 'power' ? (isLight ? '#dc2626' : '#ef4444') :
                        (isLight ? '#0284c7' : '#38bdf8');
      ctx.stroke();
    });

    // 3. Dibujar nodos
    state.nodes.forEach(n => {
      const nx = n.x * scale + offsetX;
      const ny = n.y * scale + offsetY;
      const nw = Math.max(104 * scale, 4);
      const nh = Math.max(70 * scale, 4);

      ctx.fillStyle = isLight ? '#0284c7' : '#38bdf8';
      if (['router', 'router_sophos', 'router_fortinet', 'firewall_fortinet', 'firewall_huawei', 'firewall_cisco'].includes(n.type)) {
        ctx.fillStyle = isLight ? '#d97706' : '#f59e0b';
      } else if (['ups', 'termica', 'pdu', 'canal_tension', 'canal_tension_5', 'canal_tension_7', 'transfer'].includes(n.type)) {
        ctx.fillStyle = isLight ? '#dc2626' : '#ef4444';
      } else if (['server', 'servidor_rack', 'servidor_torre'].includes(n.type)) {
        ctx.fillStyle = isLight ? '#059669' : '#10b981';
      }
      ctx.fillRect(nx, ny, nw, nh);
    });

    // 4. Posicionar recuadro del visor (viewport)
    if (dom.minimapViewport) {
      const vx = viewWorldX1 * scale + offsetX;
      const vy = viewWorldY1 * scale + offsetY;
      const vw = (vpW / state.viewport.zoom) * scale;
      const vh = (vpH / state.viewport.zoom) * scale;

      dom.minimapViewport.style.left = `${Math.max(0, Math.min(mw - 6, vx))}px`;
      dom.minimapViewport.style.top = `${Math.max(0, Math.min(mh - 6, vy))}px`;
      dom.minimapViewport.style.width = `${Math.max(6, Math.min(mw, vw))}px`;
      dom.minimapViewport.style.height = `${Math.max(6, Math.min(mh, vh))}px`;
    }
  }

export function panCanvasFromMinimapCoord(clickX, clickY) {
    if (!minimapBoundsCache || !dom.viewport) return;
    const { scale, offsetX, offsetY } = minimapBoundsCache;
    const targetWorldX = (clickX - offsetX) / scale;
    const targetWorldY = (clickY - offsetY) / scale;

    const vpW = dom.viewport.clientWidth || 800;
    const vpH = dom.viewport.clientHeight || 600;

    state.viewport.x = vpW / 2 - targetWorldX * state.viewport.zoom;
    state.viewport.y = vpH / 2 - targetWorldY * state.viewport.zoom;

    updateViewportTransform();
  }


// Registrar métodos en el contexto global de aplicación
app.setCanvasMode = setCanvasMode;
app.setupCanvasEvents = setupCanvasEvents;
app.applyZoom = applyZoom;
app.updateViewportTransform = updateViewportTransform;
app.fitViewToNodes = fitViewToNodes;
app.screenToWorld = screenToWorld;
app.getCanvasCenterWorld = getCanvasCenterWorld;
app.drawAlignmentGuides = drawAlignmentGuides;
app.clearAlignmentGuides = clearAlignmentGuides;
app.initMinimap = initMinimap;
app.toggleMinimapCollapse = toggleMinimapCollapse;
app.toggleMinimapVisibility = toggleMinimapVisibility;
app.updateMinimap = updateMinimap;
app.renderMinimapDirect = renderMinimapDirect;
app.panCanvasFromMinimapCoord = panCanvasFromMinimapCoord;
