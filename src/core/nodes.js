/**
 * NetTopology - Módulo src/core/nodes.js
 */

import { state, dom } from '../state/store.js';
import { app } from '../core/appContext.js';
import { DEVICE_ICONS, DEVICE_ICONS_LIGHT, DEVICE_METADATA, CABLE_TYPES, getDeviceIcon, generateSwitchPorts, generateRouterPorts } from '../config/icons.js';
import { STORAGE_PROJECTS_KEY, STORAGE_ACTIVE_ID_KEY, STORAGE_LEGACY_KEY, SHEET_PRESETS, ZONE_COLOR_PALETTES, MAX_HISTORY_STEPS, DEFAULT_GRID_SIZE } from '../config/constants.js';
import { escapeHtml, incrementIp, formatDateForFile, clamp, generateId } from '../utils/helpers.js';
import { createConnection, renderConnections } from './cables.js';
import { drawAlignmentGuides, clearAlignmentGuides, updateMinimap } from './canvas.js';
import { updateSelectionVisuals, selectElement, deselectAll, renderInspector } from '../ui/inspector.js';
import { createZone } from './zones.js';
import { saveState, showToast } from '../storage/db.js';
import { toggleInspector } from '../ui/topbar.js';



  // ==========================================================================
  // GESTIÓN DE NODOS
  // ==========================================================================
  // Geometría y centros ópticos según el tipo de dispositivo
export function getNodeGeometry(node) {
    const scale = (node && node.scale) || 1;
    const type = (node && node.type) || '';
    if (type === 'transfer') {
      return {
        cx: node.x + 100,
        cy: node.y + 32,
        hw: 94 * scale,
        hh: 28 * scale,
        pad: 6 * scale
      };
    }
    if (type === 'canal_tension_7') {
      return {
        cx: node.x + 135,
        cy: node.y + 32,
        hw: 129 * scale,
        hh: 28 * scale,
        pad: 6 * scale
      };
    }
    if (type === 'canal_tension_5' || type === 'canal_tension') {
      return {
        cx: node.x + 105,
        cy: node.y + 32,
        hw: 99 * scale,
        hh: 28 * scale,
        pad: 6 * scale
      };
    }
    if (type === 'text_badge') {
      const text = (node.ip || node.name || '192.168.1.0/24').trim();
      const w = Math.max(text.length * 8.5 + 24, 68);
      const h = 26;
      return {
        cx: node.x + w / 2,
        cy: node.y + h / 2,
        hw: (w / 2) * scale,
        hh: (h / 2) * scale,
        pad: 2 * scale
      };
    }
    if (node && node.encapsulatedLabels) {
      if (type === 'transfer') {
        return {
          cx: node.x + 100,
          cy: node.y + 44,
          hw: 98 * scale,
          hh: 44 * scale,
          pad: 6 * scale
        };
      }
      if (type === 'canal_tension_7') {
        return {
          cx: node.x + 135,
          cy: node.y + 44,
          hw: 133 * scale,
          hh: 44 * scale,
          pad: 6 * scale
        };
      }
      if (type === 'canal_tension_5' || type === 'canal_tension') {
        return {
          cx: node.x + 105,
          cy: node.y + 44,
          hw: 103 * scale,
          hh: 44 * scale,
          pad: 6 * scale
        };
      }

      let boxW = 68;
      let boxH = 68;
      const el = typeof document !== 'undefined' && node.id ? document.getElementById(node.id) : null;
      if (el) {
        const iconBox = el.querySelector('.node-icon-box');
        if (iconBox && iconBox.offsetWidth > 0) {
          boxW = iconBox.offsetWidth;
          boxH = iconBox.offsetHeight;
        }
      } else {
        const nameText = (node.customName !== undefined && node.customName !== null ? node.customName : (node.name || '')).trim();
        const ipText = (node.ip || '').trim();
        const nameW = nameText.length > 0 ? (nameText.length * 8.2 + 20) : 0;
        const ipW = ipText.length > 0 ? (ipText.length * 7.2 + 22) : 0;
        boxW = Math.max(68, Math.round(Math.max(nameW, ipW)));
        boxH = ipText.length > 0 ? 98 : (nameText.length > 0 ? 76 : 68);
      }

      return {
        cx: node.x + boxW / 2,
        cy: node.y + boxH / 2,
        hw: (boxW / 2) * scale,
        hh: (boxH / 2) * scale,
        pad: 6 * scale
      };
    }
    return {
      cx: node.x + 52,
      cy: node.y + 40,
      hw: 36 * scale,
      hh: 36 * scale,
      pad: 6 * scale
    };
  }

  // Centrado estricto de dispositivos en la cuadrícula:
  // Ajustamos (x, y) de modo que el centro del dispositivo caiga con exactitud en la intersección de la cuadrícula.
export function snapNodeCoordinates(x, y, type = '') {
    if (type === 'text_badge') {
      return {
        x: Math.round(x / state.gridSize) * state.gridSize,
        y: Math.round(y / state.gridSize) * state.gridSize
      };
    }
    let offsetX = 52;
    let offsetY = 40;
    if (type === 'transfer') {
      offsetX = 100;
      offsetY = 32;
    } else if (type === 'canal_tension_7') {
      offsetX = 135;
      offsetY = 32;
    } else if (type === 'canal_tension_5' || type === 'canal_tension') {
      offsetX = 105;
      offsetY = 32;
    }
    const cx = x + offsetX;
    const cy = y + offsetY;
    const snappedCx = Math.round(cx / state.gridSize) * state.gridSize;
    const snappedCy = Math.round(cy / state.gridSize) * state.gridSize;
    return {
      x: snappedCx - offsetX,
      y: snappedCy - offsetY
    };
  }

export function createNode(type, x, y, customProps = {}) {
    const meta = DEVICE_METADATA[type] || {
      label: 'Equipo',
      defaultNamePrefix: 'NODE',
      defaultIp: '192.168.1.100',
      ports: ['eth0']
    };

    // Contar cuántos del mismo tipo hay para sugerir nombre
    const count = state.nodes.filter(n => n.type === type).length + 1;
    let defaultName = `${meta.defaultNamePrefix}-${count}`;
    if (['ups', 'transfer', 'termica', 'switch_cisco', 'switch_hp', 'switch_huawei', 'switch_aruba', 'nvr', 'dvr', 'camara', 'nas', 'pc_backup'].includes(type)) {
      defaultName = count > 1 ? `${meta.defaultNamePrefix} ${count}` : meta.defaultNamePrefix;
    }

    if (state.snapToGrid) {
      const snapped = snapNodeCoordinates(x, y, type);
      x = snapped.x;
      y = snapped.y;
    }

    // Determinar si el nuevo nodo debe crearse encapsulado:
    // 1. Si viene indicado explícitamente en customProps, se respeta.
    // 2. Si hay dispositivos de red en el lienzo y todos están encapsulados, el nuevo nace encapsulado.
    // 3. Si no hay dispositivos aún, se toma la preferencia global (state.defaultEncapsulatedLabels).
    let shouldEncapsulate = false;
    if (type !== 'text_badge') {
      if (customProps.encapsulatedLabels !== undefined) {
        shouldEncapsulate = Boolean(customProps.encapsulatedLabels);
      } else {
        const existingPhysical = state.nodes.filter(n => n.type !== 'text_badge');
        if (existingPhysical.length > 0) {
          shouldEncapsulate = existingPhysical.every(n => Boolean(n.encapsulatedLabels));
        } else if (state.defaultEncapsulatedLabels !== undefined) {
          shouldEncapsulate = Boolean(state.defaultEncapsulatedLabels);
        }
      }
    }

    const node = {
      id: customProps.id || 'node_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      type: type,
      name: customProps.name || defaultName,
      ip: customProps.ip || meta.defaultIp,
      mask: customProps.mask || '255.255.255.0 (/24)',
      gateway: customProps.gateway || '192.168.1.1',
      x: x,
      y: y,
      scale: customProps.scale || 1,
      notes: customProps.notes || '',
      encapsulatedLabels: shouldEncapsulate,
      availablePorts: customProps.availablePorts || [...(meta.ports || ['Port 1'])]
    };

    state.nodes.push(node);
    renderNodeElement(node);
    selectElement('node', node.id);

    if (app.broadcastCollabAction) {
      app.broadcastCollabAction('NODE_CREATE', { node });
    }

    return node;
  }

export function renderNodeElement(node) {
    let el = document.getElementById(node.id);
    if (!el) {
      el = document.createElement('div');
      el.id = node.id;
      el.className = 'network-node';
      dom.nodesLayer.appendChild(el);
      setupNodeDragEvents(el, node);
    }

    el.dataset.nodeType = node.type;

    if (node.type === 'text_badge') {
      el.classList.add('node-type-text-badge');
      el.classList.remove('node-wide');
      const textVal = escapeHtml((node.ip || node.name || '192.168.1.0/24').trim());
      const badgeColor = node.badgeColor || 'emerald';

      el.style.left = `${node.x}px`;
      el.style.top = `${node.y}px`;
      el.style.setProperty('--node-scale', node.scale || 1);

      el.innerHTML = `
        <div class="node-text-badge-box color-${badgeColor}" title="${textVal} (Doble clic para editar)">
          <span class="node-text-badge-content">${textVal}</span>
          <div class="node-cable-handle" title="Tirar cable hacia otro equipo o texto" data-handle="true">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" style="pointer-events: none;">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </div>
        </div>
      `;

      // Edición rápida in-situ con doble clic
      const box = el.querySelector('.node-text-badge-box');
      if (box) {
        box.addEventListener('dblclick', (e) => {
          e.stopPropagation();
          const span = box.querySelector('.node-text-badge-content');
          if (!span) return;
          const currentVal = node.ip || node.name || '';
          span.style.display = 'none';

          let input = box.querySelector('.node-text-badge-inline-input');
          if (!input) {
            input = document.createElement('input');
            input.type = 'text';
            input.className = 'node-text-badge-inline-input';
            box.insertBefore(input, box.firstChild);
          }
          input.value = currentVal;
          input.style.display = 'inline-block';
          input.focus();
          input.select();

          const finishEdit = () => {
            const newVal = input.value.trim() || currentVal;
            node.ip = newVal;
            node.name = newVal;
            input.remove();
            span.textContent = newVal;
            span.style.display = 'inline';
            renderConnections();
            renderInspector();
            saveState();
          };

          input.addEventListener('blur', finishEdit, { once: true });
          input.addEventListener('keydown', (ke) => {
            if (ke.key === 'Enter') {
              ke.preventDefault();
              input.blur();
            } else if (ke.key === 'Escape') {
              ke.preventDefault();
              input.value = currentVal;
              input.blur();
            }
          });
        });
      }

      const isNodeSelected = state.selectedNodeIds && state.selectedNodeIds.has(node.id);
      if (isNodeSelected) {
        el.classList.add('selected');
        el.classList.toggle('multi-selected', state.selectedNodeIds.size > 1);
      } else {
        el.classList.remove('selected');
        el.classList.remove('multi-selected');
      }
      return;
    } else {
      el.classList.remove('node-type-text-badge');
    }

    if (node.type === 'transfer' || (node.type && node.type.startsWith('canal_tension'))) {
      el.classList.add('node-wide');
    } else {
      el.classList.remove('node-wide');
    }

    el.classList.toggle('node-encapsulated', Boolean(node.encapsulatedLabels));

    const isLight = state.theme === 'light';
    const iconSvg = typeof getDeviceIcon === 'function' ? getDeviceIcon(node.type, isLight) : (DEVICE_ICONS[node.type] || DEVICE_ICONS.pc);

    el.style.left = `${node.x}px`;
    el.style.top = `${node.y}px`;
    el.style.setProperty('--node-scale', node.scale || 1);

    const rawName = (node.customName !== undefined && node.customName !== null ? node.customName : (node.name || '')).trim();
    const rawIp = (node.ip || '').trim();

    const encapsulatedHtml = node.encapsulatedLabels && (rawName || rawIp) ? `
      <div class="node-encapsulated-content">
        ${rawName ? `<div class="node-encapsulated-label" title="${escapeHtml(rawName)}">${escapeHtml(rawName)}</div>` : ''}
        ${rawIp ? `<div class="node-encapsulated-ip">${escapeHtml(rawIp)}</div>` : ''}
      </div>
    ` : '';

    const showOuterName = !node.encapsulatedLabels && Boolean(rawName);
    const showOuterIp = !node.encapsulatedLabels && Boolean(rawIp);

    el.innerHTML = `
      <div class="node-icon-box" title="${node.name}">
        ${iconSvg}
        ${encapsulatedHtml}
        <div class="node-cable-handle" title="Tirar cable hacia otro equipo" data-handle="true">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" style="pointer-events: none;">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </div>
      </div>
      ${showOuterName ? `<div class="node-label">${escapeHtml(rawName)}</div>` : ''}
      ${showOuterIp ? `<div class="node-ip">${escapeHtml(rawIp)}</div>` : ''}
    `;

    const isNodeSelected = state.selectedNodeIds && state.selectedNodeIds.has(node.id);
    if (isNodeSelected) {
      el.classList.add('selected');
      el.classList.toggle('multi-selected', state.selectedNodeIds.size > 1);
    } else {
      el.classList.remove('selected');
      el.classList.remove('multi-selected');
    }

    // Atenuación inteligente según la Capa Activa
    const isElectricOnlyNode = ['ups', 'termica', 'transfer'].includes(node.type) || (node.type && node.type.startsWith('canal_tension'));
    if (state.activeLayer === 'logical' && isElectricOnlyNode) {
      el.classList.add('node-dimmed-layer');
    } else if (state.activeLayer === 'power' && !isElectricOnlyNode) {
      // En modo electricidad, si un equipo de datos no tiene cables de potencia conectados, atenuarlo suavemente
      const hasPowerConn = state.connections.some(c => (c.fromNodeId === node.id || c.toNodeId === node.id) && (c.layer === 'power' || c.cableType === 'power'));
      el.classList.toggle('node-dimmed-layer', !hasPowerConn);
    } else {
      el.classList.remove('node-dimmed-layer');
    }
  }

export function updateNodePosition(node, x, y, updateCables = true) {
    if (state.snapToGrid) {
      const snapped = snapNodeCoordinates(x, y, node.type);
      x = snapped.x;
      y = snapped.y;
    }
    node.x = x;
    node.y = y;

    const el = document.getElementById(node.id);
    if (el) {
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
    }

    if (updateCables) {
      // Actualizar todos los cables conectados a este nodo
      renderConnections();
    }
  }

export function deleteNode(nodeId) {
    // Eliminar cables asociados
    state.connections = state.connections.filter(c => c.fromNodeId !== nodeId && c.toNodeId !== nodeId);

    // Eliminar nodo del estado
    state.nodes = state.nodes.filter(n => n.id !== nodeId);

    // Eliminar del DOM
    const el = document.getElementById(nodeId);
    if (el) el.remove();

    if (app.broadcastCollabAction) {
      app.broadcastCollabAction('NODE_DELETE', { id: nodeId });
    }

    if (state.selection.id === nodeId) {
      deselectAll();
    }

    renderConnections();
    saveState();
  }

export function generateDuplicateName(baseName) {
    const existingNames = new Set(state.nodes.map(n => n.name));
    const numMatch = baseName.match(/^(.*?)(\d+)$/);
    let nextName = '';
    if (numMatch) {
      const prefix = numMatch[1];
      let num = parseInt(numMatch[2], 10) + 1;
      nextName = `${prefix}${num}`;
      while (existingNames.has(nextName)) {
        num++;
        nextName = `${prefix}${num}`;
      }
    } else {
      let counter = 2;
      nextName = `${baseName} ${counter}`;
      while (existingNames.has(nextName)) {
        counter++;
        nextName = `${baseName} ${counter}`;
      }
    }
    return nextName;
  }

export function generateFreeCorrelativeIp(baseIp) {
    const existingIps = new Set(state.nodes.map(n => n.ip));
    const parts = (baseIp || '').split('.');
    if (parts.length === 4 && !isNaN(parseInt(parts[3], 10))) {
      let lastOctet = parseInt(parts[3], 10) + 1;
      const prefix = `${parts[0]}.${parts[1]}.${parts[2]}.`;
      let nextIp = `${prefix}${lastOctet}`;
      while (existingIps.has(nextIp) && lastOctet < 254) {
        lastOctet++;
        nextIp = `${prefix}${lastOctet}`;
      }
      return nextIp;
    }
    return incrementIp(baseIp);
  }

export function duplicateNode(nodeId) {
    const orig = state.nodes.find(n => n.id === nodeId);
    if (!orig) return;

    const newName = generateDuplicateName(orig.name);
    const newIp = generateFreeCorrelativeIp(orig.ip);

    const newNode = createNode(orig.type, orig.x + 40, orig.y + 40, {
      name: newName,
      ip: newIp,
      mask: orig.mask,
      gateway: orig.gateway,
      scale: orig.scale || 1,
      notes: orig.notes,
      encapsulatedLabels: orig.encapsulatedLabels,
      availablePorts: [...orig.availablePorts]
    });

    saveState();
    if (typeof updateMinimap === 'function') updateMinimap();
    showToast(`Equipo duplicado: ${newName}`);
    return newNode;
  }

export function duplicateSelectedNodes() {
    const ids = Array.from(state.selectedNodeIds);
    const zoneIds = state.selectedZoneIds ? Array.from(state.selectedZoneIds) : [];
    if (ids.length === 0 && zoneIds.length === 0) return;

    const offset = 48;
    const oldToNewIdMap = {};
    const newSelectedIds = new Set();
    const newSelectedZoneIds = new Set();

    ids.forEach(id => {
      const orig = state.nodes.find(n => n.id === id);
      if (orig) {
        const newName = generateDuplicateName(orig.name);
        const newIp = generateFreeCorrelativeIp(orig.ip);

        const newNode = createNode(orig.type, orig.x + offset, orig.y + offset, {
          name: newName,
          ip: newIp,
          mask: orig.mask,
          gateway: orig.gateway,
          scale: orig.scale || 1,
          notes: orig.notes,
          encapsulatedLabels: orig.encapsulatedLabels,
          availablePorts: [...orig.availablePorts]
        });
        oldToNewIdMap[orig.id] = newNode.id;
        newSelectedIds.add(newNode.id);
      }
    });

    zoneIds.forEach(zid => {
      const origZone = (state.zones || []).find(z => z.id === zid);
      if (origZone) {
        const newZone = createZone(
          origZone.name ? `${origZone.name} (Copia)` : 'Zona (Copia)',
          origZone.x + offset,
          origZone.y + offset,
          origZone.width,
          origZone.height,
          origZone.color
        );
        if (newZone) newSelectedZoneIds.add(newZone.id);
      }
    });

    // Replicar conexiones internas que existían entre los nodos duplicados
    const internalConns = state.connections.filter(c => ids.includes(c.fromNodeId) && ids.includes(c.toNodeId));
    internalConns.forEach(c => {
      const newFrom = oldToNewIdMap[c.fromNodeId];
      const newTo = oldToNewIdMap[c.toNodeId];
      if (newFrom && newTo) {
        createConnection(newFrom, newTo, c.fromPort, c.toPort, c.cableType, c.networkLabel);
      }
    });

    state.selectedNodeIds = newSelectedIds;
    state.selectedZoneIds = newSelectedZoneIds;
    const totalCount = newSelectedIds.size + newSelectedZoneIds.size;
    state.selection = {
      type: totalCount > 1 ? 'multi-node' : (newSelectedIds.size === 1 ? 'node' : (newSelectedZoneIds.size === 1 ? 'zone' : null)),
      id: Array.from(newSelectedIds)[0] || Array.from(newSelectedZoneIds)[0] || null,
      ids: [...Array.from(newSelectedIds), ...Array.from(newSelectedZoneIds)]
    };

    updateSelectionVisuals();
    renderConnections();
    renderInspector();
    saveState();
    if (typeof updateMinimap === 'function') updateMinimap();
    showToast(`Se duplicaron ${totalCount} elemento(s) con éxito`);
  }

export function deleteSelectedNodes() {
    const nodeIds = Array.from(state.selectedNodeIds);
    const zoneIds = state.selectedZoneIds ? Array.from(state.selectedZoneIds) : [];
    if (nodeIds.length === 0 && zoneIds.length === 0) return;
    const totalCount = nodeIds.length + zoneIds.length;

    let msg = `¿Eliminar los ${totalCount} elementos seleccionados?`;
    if (nodeIds.length > 0 && zoneIds.length === 0) {
      msg = `¿Eliminar los ${nodeIds.length} dispositivos seleccionados y sus conexiones?`;
    } else if (nodeIds.length === 0 && zoneIds.length > 0) {
      msg = `¿Eliminar la(s) ${zoneIds.length} zona(s) seleccionada(s)?`;
    }

    if (confirm(msg)) {
      nodeIds.forEach(nodeId => {
        // Eliminar cables asociados
        state.connections = state.connections.filter(c => c.fromNodeId !== nodeId && c.toNodeId !== nodeId);
        // Eliminar nodo del estado
        state.nodes = state.nodes.filter(n => n.id !== nodeId);
        // Eliminar del DOM
        const el = document.getElementById(nodeId);
        if (el) el.remove();

        if (app.broadcastCollabAction) {
          app.broadcastCollabAction('NODE_DELETE', { id: nodeId });
        }
      });

      zoneIds.forEach(zoneId => {
        state.zones = (state.zones || []).filter(z => z.id !== zoneId);
        const el = document.getElementById(zoneId);
        if (el) el.remove();
      });

      deselectAll();
      saveState();
      if (typeof updateMinimap === 'function') updateMinimap();
    }
  }

  // ==========================================================================
  // EVENTOS DE ARRASTRE DE NODOS Y MOVIMIENTO EN BLOQUE
  // ==========================================================================
export function setupNodeDragEvents(el, node) {
    let isDragging = false;
    let dragStart = { x: 0, y: 0 };
    let hasMoved = false;

    el.addEventListener('mousedown', (e) => {
      // Si hizo clic en el conector circular (+) para tirar cable
      const handle = e.target.closest('.node-cable-handle');
      if (handle || e.target.dataset.handle) {
        e.stopPropagation();
        state.isConnecting = true;
        state.connectingSourceNodeId = node.id;
        return;
      }

      if (e.button !== 0) return; // Solo clic primario
      e.stopPropagation();

      const isMultiKey = e.shiftKey || e.ctrlKey || e.metaKey;

      if (isMultiKey) {
        // Alternar este nodo en la selección múltiple
        if (state.selectedNodeIds.has(node.id)) {
          state.selectedNodeIds.delete(node.id);
        } else {
          state.selectedNodeIds.add(node.id);
        }

        state.selection = {
          type: state.selectedNodeIds.size > 1 ? 'multi-node' : (state.selectedNodeIds.size === 1 ? 'node' : null),
          id: Array.from(state.selectedNodeIds)[0] || null,
          ids: Array.from(state.selectedNodeIds)
        };
        updateSelectionVisuals();
        renderConnections();
        renderInspector();

        // Si se deseleccionó con Shift, no iniciar arrastre
        if (!state.selectedNodeIds.has(node.id)) return;
      } else {
        // Si este nodo no estaba seleccionado, deseleccionar los demás y seleccionarlo
        if (!state.selectedNodeIds.has(node.id)) {
          state.selectedNodeIds.clear();
          if (state.selectedZoneIds) state.selectedZoneIds.clear();
          state.selectedNodeIds.add(node.id);
          state.selection = { type: 'node', id: node.id, ids: [node.id] };
          updateSelectionVisuals();
          renderConnections();
          renderInspector();
        }
        // Si ya formaba parte de la selección múltiple, mantenemos el grupo intacto para mover en bloque!
      }

      isDragging = true;
      state.isDraggingNode = true;
      hasMoved = false;
      dragStart = { x: e.clientX, y: e.clientY };

      // Guardar posiciones iniciales y referencias DOM de TODOS los nodos seleccionados para moverlos juntos en bloque
      const nodesToDrag = state.nodes.filter(n => state.selectedNodeIds.has(n.id));
      const initialPositions = nodesToDrag.map(n => ({
        node: n,
        x: n.x,
        y: n.y,
        el: document.getElementById(n.id)
      }));

      // Guardar posiciones iniciales y referencias DOM de TODAS las zonas seleccionadas para moverlas en conjunto
      const zonesToDrag = (state.zones || []).filter(z => state.selectedZoneIds && state.selectedZoneIds.has(z.id));
      const initialZonePositions = zonesToDrag.map(z => ({
        zone: z,
        x: z.x,
        y: z.y,
        el: document.getElementById(z.id)
      }));

      // Guardar posiciones iniciales de waypoints para cables cuyos dos extremos se están moviendo juntos en bloque
      const movingConnWaypoints = state.connections
        .filter(c => state.selectedNodeIds.has(c.fromNodeId) && state.selectedNodeIds.has(c.toNodeId) && Array.isArray(c.waypoints) && c.waypoints.length > 0)
        .map(c => ({
          conn: c,
          initialWps: c.waypoints.map(w => ({ ...w }))
        }));

      let rafId = null;
      let lastDx = 0;
      let lastDy = 0;

      const performDragUpdate = () => {
        rafId = null;
        if (!isDragging) return;

        // Mover todos los nodos seleccionados en conjunto manteniendo sus distancias relativas
        initialPositions.forEach(item => {
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
          if (app.broadcastCollabAction) {
            app.broadcastCollabAction('NODE_MOVE', { id: item.node.id, x: nx, y: ny });
          }
        });

        // Mover todas las zonas seleccionadas en conjunto manteniendo sus distancias relativas
        initialZonePositions.forEach(item => {
          let zx = item.x + lastDx;
          let zy = item.y + lastDy;
          if (state.snapToGrid) {
            zx = Math.round(zx / state.gridSize) * state.gridSize;
            zy = Math.round(zy / state.gridSize) * state.gridSize;
          }
          item.zone.x = Math.round(zx);
          item.zone.y = Math.round(zy);
          if (item.el) {
            item.el.style.left = `${item.zone.x}px`;
            item.el.style.top = `${item.zone.y}px`;
          }
        });

        // Aplicar guías magnéticas inteligentes si se arrastra un solo equipo (y ninguna zona)
        if (state.smartGuidesEnabled && initialPositions.length === 1 && initialZonePositions.length === 0 && typeof drawAlignmentGuides === 'function') {
          drawAlignmentGuides(node);
          if (itemElPrimary) {
            itemElPrimary.style.left = `${node.x}px`;
            itemElPrimary.style.top = `${node.y}px`;
          }
        }

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

        // Actualizar todos los cables conectados de forma agrupada
        renderConnections();
      };

      const itemElPrimary = document.getElementById(node.id);

      const onMouseMove = (moveEvent) => {
        if (!isDragging) return;
        lastDx = (moveEvent.clientX - dragStart.x) / state.viewport.zoom;
        lastDy = (moveEvent.clientY - dragStart.y) / state.viewport.zoom;

        if (Math.abs(lastDx) > 1 || Math.abs(lastDy) > 1) {
          hasMoved = true;
        }

        if (!rafId) {
          rafId = requestAnimationFrame(performDragUpdate);
        }
      };

      const onMouseUp = () => {
        if (isDragging) {
          isDragging = false;
          state.isDraggingNode = false;
          if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
          }
          if (typeof clearAlignmentGuides === 'function') {
            clearAlignmentGuides();
          }
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
          if (hasMoved) {
            performDragUpdate();
            renderConnections();
            saveState();
            if (typeof updateMinimap === 'function') updateMinimap();
          }
        }
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });

    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (hasMoved) return; // Si fue un arrastre de grupo, no re-seleccionar

      const isMultiKey = e.shiftKey || e.ctrlKey || e.metaKey;
      const totalSelected = state.selectedNodeIds.size + (state.selectedZoneIds ? state.selectedZoneIds.size : 0);
      if (!isMultiKey && totalSelected > 1) {
        // Clic simple sin arrastrar sobre un nodo de un grupo grande: aislar selección a este nodo
        state.selectedNodeIds.clear();
        if (state.selectedZoneIds) state.selectedZoneIds.clear();
        state.selectedNodeIds.add(node.id);
        state.selection = { type: 'node', id: node.id, ids: [node.id] };
        updateSelectionVisuals();
        renderConnections();
        renderInspector();
      }
    });

    // Doble clic en el dispositivo: abrir panel lateral de propiedades y enfocar el nombre
    el.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      e.preventDefault();

      // Seleccionar el nodo exclusivamente
      selectElement('node', node.id);

      // Si el panel de propiedades está colapsado, desplegarlo
      if (dom.sidebarInspector && dom.sidebarInspector.classList.contains('collapsed')) {
        toggleInspector(false);
      }

      // Asegurar que las propiedades se rendericen
      renderInspector();

      // Desplazar al inicio del inspector y enfocar el campo de nombre para edición inmediata
      setTimeout(() => {
        if (dom.inspectorBody) {
          dom.inspectorBody.scrollTop = 0;
        }
        const nameInput = document.getElementById('prop-node-name') || document.getElementById('prop-node-custom-name');
        if (nameInput) {
          nameInput.focus();
          nameInput.select();
        }
      }, 50);
    });
  }


// Registrar métodos en el contexto global de aplicación
app.getNodeGeometry = getNodeGeometry;
app.snapNodeCoordinates = snapNodeCoordinates;
app.createNode = createNode;
app.renderNodeElement = renderNodeElement;
app.updateNodePosition = updateNodePosition;
app.deleteNode = deleteNode;
app.generateDuplicateName = generateDuplicateName;
app.generateFreeCorrelativeIp = generateFreeCorrelativeIp;
app.duplicateNode = duplicateNode;
app.duplicateSelectedNodes = duplicateSelectedNodes;
app.deleteSelectedNodes = deleteSelectedNodes;
app.setupNodeDragEvents = setupNodeDragEvents;
