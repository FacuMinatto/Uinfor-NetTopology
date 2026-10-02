/**
 * NetTopology - Módulo src/ui/inspector.js
 */

import { state, dom } from '../state/store.js';
import { app } from '../core/appContext.js';
import { DEVICE_ICONS, DEVICE_ICONS_LIGHT, DEVICE_METADATA, CABLE_TYPES, getDeviceIcon, generateSwitchPorts, generateRouterPorts } from '../config/icons.js';
import { STORAGE_PROJECTS_KEY, STORAGE_ACTIVE_ID_KEY, STORAGE_LEGACY_KEY, SHEET_PRESETS, ZONE_COLOR_PALETTES, MAX_HISTORY_STEPS, DEFAULT_GRID_SIZE } from '../config/constants.js';
import { escapeHtml, incrementIp, formatDateForFile, clamp, generateId } from '../utils/helpers.js';
import { renderNodeElement, deleteNode, duplicateNode, duplicateSelectedNodes, deleteSelectedNodes } from '../core/nodes.js';
import { deleteConnection, insertWaypointAtOptimalIndex, computeConnectionCurve, getPointAlongCable, renderConnections } from '../core/cables.js';
import { normalizePortName } from './modals.js';
import { deleteZone, renderZones } from '../core/zones.js';
import { simulateCablePing } from '../core/audit.js';
import { getCurrentSheet } from '../core/sheets.js';
import { saveState, showToast } from '../storage/db.js';
import { toggleInspector } from './topbar.js';



  // ==========================================================================
  // PANEL INSPECTOR DE PROPIEDADES Y GESTIÓN DE SELECCIÓN
  // ==========================================================================
export function updateSelectionVisuals() {
    const totalCount = state.selectedNodeIds.size + (state.selectedZoneIds ? state.selectedZoneIds.size : 0);
    document.querySelectorAll('.network-node').forEach(el => {
      const isSel = state.selectedNodeIds.has(el.id);
      el.classList.toggle('selected', isSel);
      el.classList.toggle('multi-selected', isSel && totalCount > 1);
    });
    document.querySelectorAll('.network-zone').forEach(el => {
      const isSel = (state.selection.type === 'zone' && state.selection.id === el.id) || (state.selectedZoneIds && state.selectedZoneIds.has(el.id));
      el.classList.toggle('selected', isSel);
      el.classList.toggle('multi-selected', isSel && totalCount > 1);
    });
  }

export function selectElement(type, id, isMulti = false) {
    if (!state.selectedZoneIds) state.selectedZoneIds = new Set();

    if (type === 'node') {
      if (isMulti) {
        if (state.selectedNodeIds.has(id)) {
          state.selectedNodeIds.delete(id);
        } else {
          state.selectedNodeIds.add(id);
        }
      } else {
        state.selectedNodeIds.clear();
        state.selectedZoneIds.clear();
        state.selectedNodeIds.add(id);
      }

      const totalCount = state.selectedNodeIds.size + state.selectedZoneIds.size;
      state.selection = {
        type: totalCount > 1 ? 'multi-node' : (state.selectedNodeIds.size === 1 ? 'node' : (state.selectedZoneIds.size === 1 ? 'zone' : null)),
        id: totalCount > 0 ? (state.selectedNodeIds.has(id) ? id : (Array.from(state.selectedNodeIds)[0] || Array.from(state.selectedZoneIds)[0])) : null,
        ids: [...Array.from(state.selectedNodeIds), ...Array.from(state.selectedZoneIds)]
      };
    } else if (type === 'cable') {
      state.selectedNodeIds.clear();
      state.selectedZoneIds.clear();
      state.selection = { type: 'cable', id, ids: [] };
    } else if (type === 'zone') {
      if (isMulti) {
        if (state.selectedZoneIds.has(id)) {
          state.selectedZoneIds.delete(id);
        } else {
          state.selectedZoneIds.add(id);
        }
      } else {
        state.selectedNodeIds.clear();
        state.selectedZoneIds.clear();
        state.selectedZoneIds.add(id);
      }

      const totalCount = state.selectedNodeIds.size + state.selectedZoneIds.size;
      state.selection = {
        type: totalCount > 1 ? 'multi-node' : (state.selectedZoneIds.size === 1 ? 'zone' : (state.selectedNodeIds.size === 1 ? 'node' : null)),
        id: totalCount > 0 ? (state.selectedZoneIds.has(id) ? id : (Array.from(state.selectedZoneIds)[0] || Array.from(state.selectedNodeIds)[0])) : null,
        ids: [...Array.from(state.selectedNodeIds), ...Array.from(state.selectedZoneIds)]
      };
    }

    updateSelectionVisuals();
    renderConnections();
    renderInspector();
  }

export function deselectAll() {
    state.selectedNodeIds.clear();
    if (state.selectedZoneIds) state.selectedZoneIds.clear();
    state.selection = { type: null, id: null, ids: [] };
    updateSelectionVisuals();
    renderConnections();
    renderInspector();
  }

export function selectAllNodes() {
    const currentSheet = getCurrentSheet();
    const sheetNodes = (currentSheet && Array.isArray(currentSheet.nodes)) ? currentSheet.nodes : state.nodes;
    const sheetZones = (currentSheet && Array.isArray(currentSheet.zones)) ? currentSheet.zones : state.zones;
    if ((!sheetNodes || sheetNodes.length === 0) && (!sheetZones || sheetZones.length === 0)) return;

    state.selectedNodeIds.clear();
    if (!state.selectedZoneIds) state.selectedZoneIds = new Set();
    state.selectedZoneIds.clear();

    if (sheetNodes) sheetNodes.forEach(n => state.selectedNodeIds.add(n.id));
    if (sheetZones) sheetZones.forEach(z => state.selectedZoneIds.add(z.id));

    const totalCount = state.selectedNodeIds.size + state.selectedZoneIds.size;
    state.selection = {
      type: totalCount > 1 ? 'multi-node' : (state.selectedNodeIds.size === 1 ? 'node' : (state.selectedZoneIds.size === 1 ? 'zone' : null)),
      id: Array.from(state.selectedNodeIds)[0] || Array.from(state.selectedZoneIds)[0] || null,
      ids: [...Array.from(state.selectedNodeIds), ...Array.from(state.selectedZoneIds)]
    };

    updateSelectionVisuals();
    renderConnections();
    if (dom.sidebarInspector && dom.sidebarInspector.classList.contains('collapsed')) {
      toggleInspector(false);
    }
    renderInspector();
  }

export function detectPortType(portName) {
    const name = (portName || '').toLowerCase();
    if (name.includes('220') || name.includes('ups') || name.includes('aliment') || name.includes('potencia') || name.includes('volt') || name.includes('canal') || name.includes('salida pc') || name.includes('carga') || name.includes('borne') || name.includes('toma') || name.includes('s1') || name.includes('s2')) {
      return { type: 'power', label: '⚡ 220V' };
    }
    if (name.includes('poe')) {
      return { type: 'power', label: '⚡ PoE' };
    }
    if (name.includes('bnc')) {
      return { type: 'serial', label: 'BNC' };
    }
    if (name.includes('fibra') || name.includes('sfp') || name.includes('fiber') || name.includes('fo') || name.includes('opt') || name.includes('10g')) {
      return { type: 'fiber', label: 'Fibra' };
    }
    if (name.includes('ser') || name.includes('wan') || name.includes('t1')) {
      return { type: 'serial', label: 'WAN' };
    }
    return { type: 'copper', label: 'Boca / Eth' };
  }

export function applyPortTemplateToNode(node, templateKey) {
    let newPorts = [];
    if (templateKey === 'sw_24_4') newPorts = generateSwitchPorts(24, 4); // Boca 1-24, Fibra 1-4
    else if (templateKey === 'sw_48_4') newPorts = generateSwitchPorts(48, 4); // Boca 1-48, Fibra 1-4
    else if (templateKey === 'sw_8_2') newPorts = generateSwitchPorts(8, 2); // Boca 1-8, Fibra 1-2
    else if (templateKey === 'sw_16_2') newPorts = generateSwitchPorts(16, 2); // Boca 1-16, Fibra 1-2
    else if (templateKey === 'rtr_4_2') newPorts = generateRouterPorts(4, 2, 0); // Eth 1-4, Fibra 1-2
    else if (templateKey === 'rtr_8_2') newPorts = generateRouterPorts(8, 2, 0); // Eth 1-8, Fibra 1-2
    else if (templateKey === 'rtr_simple_4') newPorts = ['Boca 1', 'Boca 2', 'Boca 3', 'Boca 4'];
    else if (templateKey === 'nvr_8') {
      newPorts = ['LAN 1', 'LAN 2', 'PoE 1', 'PoE 2', 'PoE 3', 'PoE 4', 'PoE 5', 'PoE 6', 'PoE 7', 'PoE 8', 'HDMI', 'E 220V'];
    } else if (templateKey === 'nvr_16') {
      newPorts = ['LAN 1', 'LAN 2'];
      for (let i = 1; i <= 16; i++) newPorts.push(`PoE ${i}`);
      newPorts.push('HDMI', 'E 220V');
    } else if (templateKey === 'dvr_8') {
      newPorts = ['LAN'];
      for (let i = 1; i <= 8; i++) newPorts.push(`BNC ${i}`);
      newPorts.push('HDMI', 'E 220V');
    } else if (templateKey === 'dvr_16') {
      newPorts = ['LAN'];
      for (let i = 1; i <= 16; i++) newPorts.push(`BNC ${i}`);
      newPorts.push('HDMI', 'E 220V');
    } else if (templateKey === 'trf_standard') {
      newPorts = ['E UPS 1', 'E UPS 2', 'S PC 1', 'S PC 2', 'S PC 3', 'S PC 4', 'S Canal Tensión'];
    } else if (templateKey === 'ct_5' || templateKey === 'ct_standard') {
      newPorts = ['E 220V', 'Toma 1', 'Toma 2', 'Toma 3', 'Toma 4', 'Toma 5'];
    } else if (templateKey === 'ct_7') {
      newPorts = ['E 220V', 'Toma 1', 'Toma 2', 'Toma 3', 'Toma 4', 'Toma 5', 'Toma 6', 'Toma 7'];
    } else if (templateKey === 'ct_8') {
      newPorts = ['E 220V', 'Toma 1', 'Toma 2', 'Toma 3', 'Toma 4', 'Toma 5', 'Toma 6', 'Toma 7', 'Toma 8'];
    } else if (templateKey === 'ups_standard') {
      newPorts = ['E 220V', 'S 220V (1)', 'S 220V (2)', 'S 220V (3)', 'S 220V (4)', 'Bypass'];
    } else if (templateKey === 'ups_8') {
      newPorts = ['E 220V', 'S 220V (1)', 'S 220V (2)', 'S 220V (3)', 'S 220V (4)', 'S 220V (5)', 'S 220V (6)', 'S 220V (7)', 'S 220V (8)', 'Bypass'];
    } else if (templateKey === 'term_bipolar') {
      newPorts = ['E 220V', 'S 220V', 'Bypass'];
    } else if (templateKey === 'term_tetra') {
      newPorts = ['Entrada R', 'Entrada S', 'Entrada T', 'Entrada N', 'Salida R', 'Salida S', 'Salida T', 'Salida N'];
    } else return;

    // Preservar bocas actualmente conectadas para no romper cables existentes
    const usedPorts = state.connections
      .filter(c => c.fromNodeId === node.id || c.toNodeId === node.id)
      .map(c => c.fromNodeId === node.id ? c.fromPort : c.toPort);

    usedPorts.forEach(up => {
      if (!newPorts.includes(up)) newPorts.push(up);
    });

    node.availablePorts = newPorts;
    renderInspector();
    saveState();
  }

  let currentInspectorTab = 'data';

export function renderInspector() {
    const { type, id } = state.selection;

    if (!type || (!id && type !== 'multi-node')) {
      dom.inspectorTitle.textContent = 'Propiedades';
      dom.inspectorBody.innerHTML = `
        <div class="inspector-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 16v-4M12 8h.01"/>
          </svg>
          <p>Selecciona un dispositivo o un cable para ver y editar sus propiedades técnicas.</p>
        </div>
      `;
      return;
    }

    if (type === 'multi-node') {
      const selectedNodes = state.nodes.filter(n => state.selectedNodeIds.has(n.id));
      const selectedZones = (state.zones || []).filter(z => state.selectedZoneIds && state.selectedZoneIds.has(z.id));
      const totalCount = selectedNodes.length + selectedZones.length;
      dom.inspectorTitle.textContent = `Selección Múltiple (${totalCount})`;

      const nodesListHtml = selectedNodes.map(n => `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.35rem 0.5rem; background: var(--bg-surface-elevated); border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.75rem;">
          <span style="display: flex; align-items: center; gap: 0.4rem; overflow: hidden;">
            <span style="color: var(--accent-cyan);">●</span>
            <b style="color: var(--text-primary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${escapeHtml(n.name)}</b>
            <span style="color: var(--text-muted); font-size: 0.65rem;">(${n.type})</span>
          </span>
          <button class="btn btn-icon-only" style="width: 20px; height: 20px; padding: 0; opacity: 0.7;" data-remove-from-sel="${n.id}" title="Quitar de la selección">✕</button>
        </div>
      `).join('');

      const zonesListHtml = selectedZones.map(z => `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.35rem 0.5rem; background: var(--bg-surface-elevated); border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.75rem;">
          <span style="display: flex; align-items: center; gap: 0.4rem; overflow: hidden;">
            <span style="color: #a855f7;">🔲</span>
            <b style="color: var(--text-primary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${escapeHtml(z.name || 'Zona')}</b>
            <span style="color: var(--text-muted); font-size: 0.65rem;">(Zona / Área)</span>
          </span>
          <button class="btn btn-icon-only" style="width: 20px; height: 20px; padding: 0; opacity: 0.7;" data-remove-zone-from-sel="${z.id}" title="Quitar de la selección">✕</button>
        </div>
      `).join('');

      dom.inspectorBody.innerHTML = `
        <div style="padding: 0.75rem; background: rgba(56, 189, 248, 0.08); border-radius: 8px; border: 1px solid rgba(56, 189, 248, 0.25); display: flex; flex-direction: column; gap: 0.4rem; flex-shrink: 0 !important; width: 100% !important;">
          <div style="font-size: 0.8rem; font-weight: 700; color: var(--accent-cyan); display: flex; align-items: center; gap: 0.4rem;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            ${totalCount} Elementos Seleccionados ${selectedZones.length > 0 ? `(${selectedNodes.length} equipos, ${selectedZones.length} zonas)` : ''}
          </div>
          <div style="font-size: 0.72rem; color: var(--text-secondary);">
            Puedes arrastrar cualquiera de los equipos o la cabecera de las zonas para mover todo el bloque en conjunto manteniendo sus posiciones y conexiones.
          </div>
        </div>

        <!-- SECCIÓN: ACCIONES EN BLOQUE -->
        <div class="inspector-section" style="flex-shrink: 0 !important; width: 100% !important;">
          <div class="inspector-section-header">
            <span>⚡ Acciones en Bloque</span>
          </div>
          <div class="inspector-section-body">
            <button id="btn-dup-group" class="btn" style="width: 100%; justify-content: center; gap: 0.4rem;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              Duplicar Grupo Completo
            </button>
            <button id="btn-del-group" class="btn btn-danger" style="width: 100%; justify-content: center; gap: 0.4rem;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              Eliminar ${totalCount} Elementos
            </button>
          </div>
        </div>

        <!-- SECCIÓN: LISTA DE ELEMENTOS SELECCIONADOS -->
        <div class="inspector-section" style="flex-shrink: 0 !important; width: 100% !important; margin-bottom: 2rem !important;">
          <div class="inspector-section-header">
            <span>📋 Elementos en el Grupo (${totalCount})</span>
          </div>
          <div class="inspector-section-body" style="gap: 0.4rem; max-height: 280px; overflow-y: auto;">
            ${nodesListHtml}
            ${zonesListHtml}
          </div>
        </div>
      `;

      document.getElementById('btn-dup-group').addEventListener('click', () => {
        duplicateSelectedNodes();
      });

      document.getElementById('btn-del-group').addEventListener('click', () => {
        deleteSelectedNodes();
      });

      dom.inspectorBody.querySelectorAll('[data-remove-from-sel]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const targetId = btn.dataset.removeFromSel;
          state.selectedNodeIds.delete(targetId);
          const remainingCount = state.selectedNodeIds.size + (state.selectedZoneIds ? state.selectedZoneIds.size : 0);
          state.selection = {
            type: remainingCount > 1 ? 'multi-node' : (state.selectedNodeIds.size === 1 ? 'node' : (state.selectedZoneIds && state.selectedZoneIds.size === 1 ? 'zone' : null)),
            id: Array.from(state.selectedNodeIds)[0] || (state.selectedZoneIds && Array.from(state.selectedZoneIds)[0]) || null,
            ids: [...Array.from(state.selectedNodeIds), ...(state.selectedZoneIds ? Array.from(state.selectedZoneIds) : [])]
          };
          updateSelectionVisuals();
          renderConnections();
          renderInspector();
        });
      });

      dom.inspectorBody.querySelectorAll('[data-remove-zone-from-sel]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const targetId = btn.dataset.removeZoneFromSel;
          if (state.selectedZoneIds) state.selectedZoneIds.delete(targetId);
          const remainingCount = state.selectedNodeIds.size + (state.selectedZoneIds ? state.selectedZoneIds.size : 0);
          state.selection = {
            type: remainingCount > 1 ? 'multi-node' : (state.selectedNodeIds.size === 1 ? 'node' : (state.selectedZoneIds && state.selectedZoneIds.size === 1 ? 'zone' : null)),
            id: Array.from(state.selectedNodeIds)[0] || (state.selectedZoneIds && Array.from(state.selectedZoneIds)[0]) || null,
            ids: [...Array.from(state.selectedNodeIds), ...(state.selectedZoneIds ? Array.from(state.selectedZoneIds) : [])]
          };
          updateSelectionVisuals();
          renderConnections();
          renderInspector();
        });
      });

      return;
    }

    if (type === 'zone') {
      const zone = (state.zones || []).find(z => z.id === id);
      if (!zone) return deselectAll();

      dom.inspectorTitle.textContent = `Área / Zona: ${zone.name || 'VLAN'}`;
      dom.inspectorBody.innerHTML = `
        <div class="form-group" style="margin-bottom: 0.85rem;">
          <label>Nombre o Etiqueta de la Zona (VLAN)</label>
          <input type="text" id="insp-zone-name" class="form-control" value="${escapeHtml(zone.name || '')}" placeholder="ej. VLAN 10 - Gestión / DMZ">
        </div>

        <div class="form-group" style="margin-bottom: 0.85rem;">
          <label>Color de la Zona</label>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.4rem; margin-top: 0.35rem;">
            ${[
              { key: 'cyan', label: 'Cian', color: '#38bdf8' },
              { key: 'emerald', label: 'Esmeralda', color: '#10b981' },
              { key: 'amber', label: 'Ámbar', color: '#f59e0b' },
              { key: 'rose', label: 'Rojo', color: '#f43f5e' },
              { key: 'purple', label: 'Púrpura', color: '#a855f7' },
              { key: 'blue', label: 'Azul', color: '#3b82f6' }
            ].map(c => `
              <button type="button" class="btn btn-zone-color-pick ${zone.color === c.key ? 'active' : ''}" data-color="${c.key}" style="padding: 0.35rem 0.45rem; font-size: 0.72rem; display: flex; align-items: center; gap: 0.35rem; ${zone.color === c.key ? 'border-color: ' + c.color + '; background: rgba(255,255,255,0.08);' : ''}">
                <span style="width: 10px; height: 10px; border-radius: 50%; background: ${c.color};"></span>
                <span>${c.label}</span>
              </button>
            `).join('')}
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 0.85rem;">
          <div class="form-group">
            <label>Ancho (px)</label>
            <input type="number" id="insp-zone-w" class="form-control mono" value="${zone.width}" min="120" step="24">
          </div>
          <div class="form-group">
            <label>Alto (px)</label>
            <input type="number" id="insp-zone-h" class="form-control mono" value="${zone.height}" min="80" step="24">
          </div>
        </div>

        <div style="margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid var(--border-color); display: flex; gap: 0.5rem;">
          <button type="button" id="btn-insp-delete-zone" class="btn btn-danger" style="width: 100%; justify-content: center; gap: 0.4rem;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            Eliminar Zona
          </button>
        </div>
      `;

      document.getElementById('insp-zone-name').addEventListener('input', (e) => {
        zone.name = e.target.value.trim() || 'Zona';
        dom.inspectorTitle.textContent = `Área / Zona: ${zone.name}`;
        const zEl = document.getElementById(zone.id);
        if (zEl) {
          const txt = zEl.querySelector('.zone-name-text');
          if (txt) txt.textContent = zone.name;
        }
        saveState();
      });

      document.querySelectorAll('.btn-zone-color-pick').forEach(btn => {
        btn.addEventListener('click', () => {
          zone.color = btn.dataset.color;
          renderZones();
          renderInspector();
          saveState();
        });
      });

      document.getElementById('insp-zone-w').addEventListener('change', (e) => {
        zone.width = Math.max(120, parseInt(e.target.value, 10) || 200);
        renderZones();
        saveState();
      });

      document.getElementById('insp-zone-h').addEventListener('change', (e) => {
        zone.height = Math.max(80, parseInt(e.target.value, 10) || 160);
        renderZones();
        saveState();
      });

      document.getElementById('btn-insp-delete-zone').addEventListener('click', () => {
        deleteZone(zone.id);
      });
      return;
    }

    if (type === 'node') {
      const node = state.nodes.find(n => n.id === id);
      if (!node) return deselectAll();

      if (node.type === 'text_badge') {
        dom.inspectorTitle.textContent = 'Etiqueta / Recuadro IP';
        const badgeColor = node.badgeColor || 'emerald';
        const nodeConns = state.connections.filter(c => c.fromNodeId === node.id || c.toNodeId === node.id);

        const connsHtml = nodeConns.length === 0 ? `
          <div style="font-size: 0.72rem; color: var(--text-muted); padding: 0.5rem; text-align: center;">
            No hay cables conectados a este recuadro.
          </div>
        ` : nodeConns.map(c => {
          const isFrom = c.fromNodeId === node.id;
          const remoteNode = state.nodes.find(n => n.id === (isFrom ? c.toNodeId : c.fromNodeId));
          const cableType = CABLE_TYPES[c.cableType] || CABLE_TYPES.ethernet;
          return `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.35rem 0.5rem; background: var(--bg-surface-elevated); border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.75rem;">
              <span style="display: flex; align-items: center; gap: 0.4rem; overflow: hidden;">
                <span style="color: ${c.color || cableType.color}; font-size: 0.8rem;">●</span>
                <b style="color: var(--text-primary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${escapeHtml(remoteNode ? remoteNode.name : 'Equipo')}</b>
                <span style="color: var(--text-muted); font-size: 0.65rem;">(${cableType.name.split('/')[0].trim()})</span>
              </span>
              <button class="btn btn-icon-only" style="width: 20px; height: 20px; padding: 0; opacity: 0.7;" data-del-conn="${c.id}" title="Eliminar cable">✕</button>
            </div>
          `;
        }).join('');

        dom.inspectorBody.innerHTML = `
          <div class="inspector-section">
            <div class="inspector-section-header">
              <span>🏷️ Contenido del Recuadro</span>
            </div>
            <div class="inspector-section-body">
              <div class="form-group">
                <label>Texto / Dirección IP / Subred</label>
                <input type="text" id="prop-text-badge-val" class="form-control mono" value="${escapeHtml(node.ip || node.name || '')}" placeholder="Ej: 192.168.1.0/24, VLAN 10, Gateway..." style="font-size: 0.85rem; font-weight: 600;">
              </div>

              <div class="form-group">
                <label style="margin-bottom: 0.35rem; display: block;">Color del Recuadro</label>
                <div style="display: flex; gap: 0.35rem;">
                  <button type="button" class="btn-badge-color ${badgeColor === 'emerald' ? 'active' : ''}" data-color="emerald" title="Verde Esmeralda (IP estándar)" style="background: var(--bg-surface-elevated); color: #10b981; border: 1px solid ${badgeColor === 'emerald' ? '#10b981' : 'rgba(16, 185, 129, 0.4)'}; border-radius: 4px; padding: 4px 6px; font-size: 0.7rem; font-weight: 600; cursor: pointer; flex: 1;">Verde</button>
                  <button type="button" class="btn-badge-color ${badgeColor === 'cyan' ? 'active' : ''}" data-color="cyan" title="Azul Cyan (VLAN / Enlace)" style="background: var(--bg-surface-elevated); color: #0284c7; border: 1px solid ${badgeColor === 'cyan' ? '#0284c7' : 'rgba(2, 132, 199, 0.4)'}; border-radius: 4px; padding: 4px 6px; font-size: 0.7rem; font-weight: 600; cursor: pointer; flex: 1;">Cyan</button>
                  <button type="button" class="btn-badge-color ${badgeColor === 'amber' ? 'active' : ''}" data-color="amber" title="Ámbar / Naranja (Alerta / DMZ)" style="background: var(--bg-surface-elevated); color: #d97706; border: 1px solid ${badgeColor === 'amber' ? '#d97706' : 'rgba(217, 119, 6, 0.4)'}; border-radius: 4px; padding: 4px 6px; font-size: 0.7rem; font-weight: 600; cursor: pointer; flex: 1;">Ámbar</button>
                  <button type="button" class="btn-badge-color ${badgeColor === 'purple' ? 'active' : ''}" data-color="purple" title="Violeta (VPN / Túnel)" style="background: var(--bg-surface-elevated); color: #9333ea; border: 1px solid ${badgeColor === 'purple' ? '#9333ea' : 'rgba(147, 51, 234, 0.4)'}; border-radius: 4px; padding: 4px 6px; font-size: 0.7rem; font-weight: 600; cursor: pointer; flex: 1;">Violeta</button>
                  <button type="button" class="btn-badge-color ${badgeColor === 'neutral' ? 'active' : ''}" data-color="neutral" title="Blanco / Neutro" style="background: var(--bg-surface-elevated); color: var(--text-primary); border: 1px solid ${badgeColor === 'neutral' ? 'var(--text-primary)' : 'var(--border-color)'}; border-radius: 4px; padding: 4px 6px; font-size: 0.7rem; font-weight: 600; cursor: pointer; flex: 1;">Neutro</button>
                </div>
              </div>

              <!-- Control de Tamaño y Escala -->
              <div class="form-group" style="background: rgba(56, 189, 248, 0.05); padding: 0.5rem; border-radius: 6px; border: 1px solid rgba(56, 189, 248, 0.2); margin-bottom: 0.75rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
                  <label style="margin-bottom:0; font-size: 0.72rem; color: var(--text-primary); font-weight: 600;">📏 Escala / Zoom</label>
                  <span id="lbl-node-scale" class="mono" style="font-size: 0.75rem; color: var(--accent-cyan); font-weight: 700;">${Math.round((node.scale || 1) * 100)}%</span>
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <input type="range" id="prop-node-scale-slider" min="50" max="250" step="5" value="${Math.round((node.scale || 1) * 100)}" style="flex: 1; accent-color: var(--accent-cyan); cursor: pointer;">
                  <input type="number" id="prop-node-scale-input" class="form-control mono" min="50" max="250" step="5" value="${Math.round((node.scale || 1) * 100)}" style="width: 58px; padding: 0.2rem 0.35rem; font-size: 0.75rem; text-align: center;">
                </div>
                <div style="display: flex; gap: 0.3rem; margin-top: 0.4rem;">
                  <button type="button" class="btn-scale-preset ${Math.round((node.scale || 1) * 100) === 75 ? 'active' : ''}" data-scale="75" style="flex: 1; padding: 2px 0; font-size: 0.65rem;">75%</button>
                  <button type="button" class="btn-scale-preset ${Math.round((node.scale || 1) * 100) === 100 ? 'active' : ''}" data-scale="100" style="flex: 1; padding: 2px 0; font-size: 0.65rem;">100%</button>
                  <button type="button" class="btn-scale-preset ${Math.round((node.scale || 1) * 100) === 130 ? 'active' : ''}" data-scale="130" style="flex: 1; padding: 2px 0; font-size: 0.65rem;">130%</button>
                  <button type="button" class="btn-scale-preset ${Math.round((node.scale || 1) * 100) === 160 ? 'active' : ''}" data-scale="160" style="flex: 1; padding: 2px 0; font-size: 0.65rem;">160%</button>
                </div>
              </div>

              <div class="form-group">
                <label>Notas Técnicas</label>
                <textarea id="prop-node-notes" class="form-control" placeholder="Notas sobre esta IP o enlace...">${escapeHtml(node.notes || '')}</textarea>
              </div>
            </div>
          </div>

          <div class="inspector-section">
            <div class="inspector-section-header">
              <span>🔌 Cables Conectados (${nodeConns.length})</span>
            </div>
            <div class="inspector-section-body" style="gap: 0.35rem;">
              ${connsHtml}
            </div>
          </div>

          <div class="inspector-section" style="margin-bottom: 2rem;">
            <div class="inspector-section-body" style="display: flex; gap: 0.4rem;">
              <button id="btn-node-dup" class="btn" style="flex: 1; justify-content: center; gap: 0.3rem;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                Duplicar
              </button>
              <button id="btn-node-delete" class="btn btn-danger" style="flex: 1; justify-content: center; gap: 0.3rem;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                Eliminar
              </button>
            </div>
          </div>
        `;

        // Event listeners para text badge
        const inpVal = document.getElementById('prop-text-badge-val');
        if (inpVal) {
          inpVal.addEventListener('input', (e) => {
            const val = e.target.value.trim();
            node.ip = val;
            node.name = val;
            renderNodeElement(node);
            renderConnections();
            saveState();
          });
        }

        document.querySelectorAll('.btn-badge-color').forEach(b => {
          b.addEventListener('click', () => {
            node.badgeColor = b.dataset.color;
            renderNodeElement(node);
            renderInspector();
            saveState();
          });
        });

        const scaleSlider = document.getElementById('prop-node-scale-slider');
        const scaleInput = document.getElementById('prop-node-scale-input');
        const scaleLabel = document.getElementById('lbl-node-scale');

        const applyScale = (val) => {
          const num = Math.min(250, Math.max(50, parseInt(val, 10) || 100));
          node.scale = num / 100;
          if (scaleSlider) scaleSlider.value = num;
          if (scaleInput) scaleInput.value = num;
          if (scaleLabel) scaleLabel.textContent = `${num}%`;
          dom.inspectorBody.querySelectorAll('.btn-scale-preset').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.scale, 10) === num);
          });
          const el = document.getElementById(node.id);
          if (el) el.style.setProperty('--node-scale', node.scale);
          renderConnections();
          saveState();
        };

        if (scaleSlider) scaleSlider.addEventListener('input', (e) => applyScale(e.target.value));
        if (scaleInput) scaleInput.addEventListener('change', (e) => applyScale(e.target.value));
        dom.inspectorBody.querySelectorAll('.btn-scale-preset').forEach(btn => {
          btn.addEventListener('click', () => applyScale(btn.dataset.scale));
        });

        const notesArea = document.getElementById('prop-node-notes');
        if (notesArea) {
          notesArea.addEventListener('input', (e) => {
            node.notes = e.target.value;
            saveState();
          });
        }

        document.querySelectorAll('[data-del-conn]').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteConnection(btn.dataset.delConn);
            renderInspector();
          });
        });

        document.getElementById('btn-node-dup')?.addEventListener('click', () => {
          duplicateSelectedNodes();
        });
        document.getElementById('btn-node-delete')?.addEventListener('click', () => {
          deleteNode(node.id);
        });

        return;
      }

      dom.inspectorTitle.textContent = `Configuración: ${node.name}`;

      // Obtener conexiones activas de este nodo
      const nodeConns = state.connections.filter(c => c.fromNodeId === node.id || c.toNodeId === node.id);
      const usedPortsMap = {};
      nodeConns.forEach(c => {
        const isFrom = c.fromNodeId === node.id;
        const localPort = isFrom ? c.fromPort : c.toPort;
        const remoteNode = state.nodes.find(n => n.id === (isFrom ? c.toNodeId : c.fromNodeId));
        const remotePort = isFrom ? c.toPort : c.fromPort;
        usedPortsMap[localPort] = {
          cableId: c.id,
          remoteName: remoteNode ? remoteNode.name : 'Desconocido',
          remotePort
        };
      });

      // Renderizar lista detallada de bocas
      const portsListHtml = (node.availablePorts || []).map(portName => {
        const connInfo = usedPortsMap[portName];
        const pType = detectPortType(portName);
        const typeBadge = `<span class="port-type-badge ${pType.type}">${pType.label}</span>`;

        if (connInfo) {
          return `
            <div class="port-item-row" title="Clic para ver cable" data-cable-id="${connInfo.cableId}" style="cursor:pointer;">
              <span style="display:flex; align-items:center; gap:0.4rem; overflow:hidden;">
                <span class="port-status connected" title="Boca en uso"></span>
                ${typeBadge}
                <b>${escapeHtml(portName)}</b>
                <span style="color:var(--text-muted); font-size:0.65rem;">→ ${escapeHtml(connInfo.remoteName)} (${escapeHtml(connInfo.remotePort)})</span>
              </span>
              <button class="btn btn-icon-only btn-danger" style="width:20px;height:20px;padding:0;" data-del-cable="${connInfo.cableId}" title="Desconectar cable">✕</button>
            </div>
          `;
        } else {
          return `
            <div class="port-item-row">
              <span style="display:flex; align-items:center; gap:0.4rem;">
                <span class="port-status" title="Boca disponible"></span>
                ${typeBadge}
                <span>${escapeHtml(portName)}</span>
                <span style="color:var(--accent-emerald); font-size:0.65rem;">Libre</span>
              </span>
              <button class="btn btn-icon-only" style="width:20px;height:20px;padding:0;opacity:0.6;" data-remove-port="${escapeHtml(portName)}" title="Eliminar boca de este equipo">✕</button>
            </div>
          `;
        }
      }).join('');

      const freeCount = Math.max((node.availablePorts || []).length - Object.keys(usedPortsMap).length, 0);

      const isElectric = ['ups', 'termica', 'transfer'].includes(node.type) || (node.type && node.type.startsWith('canal_tension'));

      const isLight = state.theme === 'light';
      const nodeIconSvg = typeof getDeviceIcon === 'function' ? getDeviceIcon(node.type, isLight) : (DEVICE_ICONS[node.type] || DEVICE_ICONS.pc);
      const meta = (typeof DEVICE_METADATA !== 'undefined' && DEVICE_METADATA[node.type]) ? DEVICE_METADATA[node.type] : { label: node.type };
      const typeLabel = meta.label || (isElectric ? 'Equipo Eléctrico' : 'Dispositivo de Red');
      const activeTab = currentInspectorTab || 'data';

      dom.inspectorBody.innerHTML = `
        <!-- TARJETA HERO DEL EQUIPO -->
        <div class="inspector-hero-card">
          <div class="inspector-hero-icon">
            ${nodeIconSvg}
          </div>
          <div class="inspector-hero-details">
            <span class="inspector-hero-title">${escapeHtml(node.customName || node.name)}</span>
            <div class="inspector-hero-meta">
              <span>${escapeHtml(typeLabel)}</span>
              <span class="inspector-hero-badge">
                ${Object.keys(usedPortsMap).length}/${(node.availablePorts || []).length} bocas
              </span>
            </div>
          </div>
        </div>

        <!-- BARRA DE PESTAÑAS (SEGMENTED TABS) -->
        <div class="inspector-tabs-nav">
          <button type="button" class="inspector-tab-btn ${activeTab === 'data' ? 'active' : ''}" data-tab="data" title="Parámetros de Red y Datos">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>
            <span>Datos & Red</span>
          </button>
          <button type="button" class="inspector-tab-btn ${activeTab === 'ports' ? 'active' : ''}" data-tab="ports" title="Gestión de Bocas e Interfaces">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
            <span>Bocas (${(node.availablePorts || []).length})</span>
          </button>
          <button type="button" class="inspector-tab-btn ${activeTab === 'style' ? 'active' : ''}" data-tab="style" title="Escala, Tamaño y Diseño">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            <span>Estilo</span>
          </button>
        </div>

        <!-- PESTAÑA 1: DATOS & RED -->
        <div class="inspector-tab-pane ${activeTab === 'data' ? 'active' : ''}" data-pane="data">
          <div class="inspector-card">
            <div class="form-group">
              <label>${isElectric ? 'Identificador / Nombre' : 'Nombre del Equipo (Hostname)'}</label>
              <input type="text" id="prop-node-name" class="form-control" value="${escapeHtml(node.name)}">
            </div>

            <div class="form-group">
              <label>${isElectric ? 'Dirección IP (Opcional - Monitoreo / SNMP)' : 'Dirección IP'}</label>
              <input type="text" id="prop-node-ip" class="form-control mono" value="${escapeHtml(node.ip)}" placeholder="${isElectric ? 'Opcional (ej: 192.168.1.50)' : 'Ej: 192.168.1.1'}">
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
              <div class="form-group">
                <label>${isElectric ? 'Tensión / Voltaje' : 'Máscara / CIDR'}</label>
                <input type="text" id="prop-node-mask" class="form-control mono" value="${escapeHtml(node.mask)}" placeholder="${isElectric ? '220V AC' : '255.255.255.0'}">
              </div>
              <div class="form-group">
                <label>${isElectric ? 'Potencia' : 'Gateway'}</label>
                <input type="text" id="prop-node-gw" class="form-control mono" value="${escapeHtml(node.gateway)}" placeholder="${isElectric ? '3000 VA' : '192.168.1.254'}">
              </div>
            </div>

            <div class="form-group">
              <label>Notas Técnicas / Ubicación</label>
              <textarea id="prop-node-notes" class="form-control" placeholder="${isElectric ? 'Ej: Tablero Principal, Rack Servidores...' : 'Ej: Patch panel Rack 2, VLAN administración...'}">${escapeHtml(node.notes)}</textarea>
            </div>
          </div>
        </div>

        <!-- PESTAÑA 2: BOCAS E INTERFACES -->
        <div class="inspector-tab-pane ${activeTab === 'ports' ? 'active' : ''}" data-pane="ports">
          <div class="inspector-card">
            <div class="inspector-card-header">
              <span>${isElectric ? 'Bornes y Salidas' : 'Bocas e Interfaces'}</span>
              <span style="color: var(--accent-cyan); font-weight: 700; font-size: 0.72rem;">${Object.keys(usedPortsMap).length} en uso · ${freeCount} libres</span>
            </div>

            <!-- Selector de plantillas -->
            <div class="form-group">
              <label style="font-size: 0.68rem;">Plantilla de Conexiones</label>
              <select id="select-port-template" class="form-control" style="font-size: 0.75rem; padding: 0.35rem 0.5rem;">
                <option value="">⚙️ ${isElectric ? 'Plantillas de conexiones...' : 'Cambiar cantidad de bocas...'}</option>
                ${node.type === 'transfer' ? `
                  <option value="trf_standard">Transfer Estándar (2 UPS S1/S2 + 4 PC + Canal)</option>
                ` : (node.type && node.type.startsWith('canal_tension')) ? `
                  <option value="ct_5">Canal de Tensión (5 Tomas)</option>
                  <option value="ct_7">Canal de Tensión (7 Tomas)</option>
                  <option value="ct_8">Canal de Tensión (8 Tomas)</option>
                ` : node.type === 'ups' ? `
                  <option value="ups_standard">UPS Estándar (1 Entrada 220V + 4 Salidas UPS + Bypass)</option>
                  <option value="ups_8">UPS 8 Salidas (1 Entrada 220V + 8 Salidas UPS + Bypass)</option>
                ` : node.type === 'termica' ? `
                  <option value="term_bipolar">Térmica Bipolar (Entrada 220V + Salida Carga + Bypass)</option>
                  <option value="term_tetra">Térmica Tetrapolar (3 Fases R,S,T + Neutro N)</option>
                ` : node.type === 'nvr' ? `
                  <option value="nvr_8">NVR: 8 Puertos PoE + 2 LAN</option>
                  <option value="nvr_16">NVR: 16 Puertos PoE + 2 LAN</option>
                ` : node.type === 'dvr' ? `
                  <option value="dvr_8">DVR: 8 Canales BNC + 1 LAN</option>
                  <option value="dvr_16">DVR: 16 Canales BNC + 1 LAN</option>
                ` : (node.type && node.type.startsWith('router')) ? `
                  <option value="rtr_4_2">Router: 4 Eth + 2 Fibra</option>
                  <option value="rtr_8_2">Router: 8 Eth + 2 Fibra</option>
                  <option value="rtr_simple_4">Router: 4 Bocas Simples (Boca 1 a 4)</option>
                ` : `
                  <option value="sw_24_4">Switch: 24 Bocas + 4 Fibra</option>
                  <option value="sw_48_4">Switch: 48 Bocas + 4 Fibra</option>
                  <option value="sw_16_2">Switch: 16 Bocas + 2 Fibra</option>
                  <option value="sw_8_2">Switch: 8 Bocas + 2 Fibra</option>
                  <option value="rtr_4_2">Router: 4 Eth + 2 Fibra</option>
                `}
                <option value="custom">✏️ Personalizar cantidad a medida...</option>
              </select>
            </div>

            <!-- Personalizador numérico a medida -->
            <div id="custom-ports-box" style="display: none; background: var(--bg-surface-elevated); padding: 0.6rem; border-radius: 6px; border: 1px solid var(--border-color);">
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.4rem;">
                <div>
                  <label style="font-size:0.62rem;">Bocas Cobre</label>
                  <input type="number" id="custom-copper-count" class="form-control mono" value="24" min="0" max="96" style="padding:0.25rem; font-size:0.75rem;">
                </div>
                <div>
                  <label style="font-size:0.62rem;">Bocas Fibra</label>
                  <input type="number" id="custom-fiber-count" class="form-control mono" value="4" min="0" max="32" style="padding:0.25rem; font-size:0.75rem;">
                </div>
                <div>
                  <label style="font-size:0.62rem;">Bocas WAN</label>
                  <input type="number" id="custom-serial-count" class="form-control mono" value="0" min="0" max="16" style="padding:0.25rem; font-size:0.75rem;">
                </div>
              </div>
              <button id="btn-apply-custom-ports" class="btn btn-primary" style="width: 100%; margin-top: 0.5rem; font-size: 0.75rem; padding: 0.35rem;">
                Aplicar Nuevas Bocas
              </button>
            </div>

            <!-- Agregar boca individual manual -->
            <div class="form-group">
              <label style="font-size: 0.68rem;">Añadir Boca Manual</label>
              <div style="display: flex; gap: 0.4rem;">
                <input type="text" id="input-new-port" class="form-control mono" placeholder="${isElectric ? 'Ej: Salida 5 o Borne Auxiliar' : 'Ej: Boca 25 o Fibra 5'}" style="font-size: 0.75rem; padding: 0.35rem 0.5rem;">
                <button id="btn-add-port" class="btn" style="font-size: 0.75rem; padding: 0.35rem 0.65rem; white-space: nowrap;">+ ${isElectric ? 'Borne' : 'Boca'}</button>
              </div>
            </div>

            <!-- Lista deslizable de bocas con estado -->
            <div class="ports-list-box" style="max-height: 200px;">${portsListHtml}</div>
          </div>
        </div>

        <!-- PESTAÑA 3: ESTILO & ESCALA -->
        <div class="inspector-tab-pane ${activeTab === 'style' ? 'active' : ''}" data-pane="style">
          <div class="inspector-card">
            <div class="inspector-card-header">
              <span>📏 Tamaño y Escala</span>
              <span id="lbl-node-scale" class="mono" style="color: var(--accent-cyan); font-weight: 700;">${Math.round((node.scale || 1) * 100)}%</span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <input type="range" id="prop-node-scale-slider" min="50" max="250" step="5" value="${Math.round((node.scale || 1) * 100)}" style="flex: 1; accent-color: var(--accent-cyan); cursor: pointer;">
              <input type="number" id="prop-node-scale-input" class="form-control mono" min="50" max="250" step="5" value="${Math.round((node.scale || 1) * 100)}" style="width: 58px; padding: 0.2rem 0.35rem; font-size: 0.75rem; text-align: center;">
            </div>
            <div class="scale-preset-pills">
              <button type="button" class="btn-scale-preset ${Math.round((node.scale || 1) * 100) === 75 ? 'active' : ''}" data-scale="75">75%</button>
              <button type="button" class="btn-scale-preset ${Math.round((node.scale || 1) * 100) === 100 ? 'active' : ''}" data-scale="100">100%</button>
              <button type="button" class="btn-scale-preset ${Math.round((node.scale || 1) * 100) === 130 ? 'active' : ''}" data-scale="130">130%</button>
              <button type="button" class="btn-scale-preset ${Math.round((node.scale || 1) * 100) === 160 ? 'active' : ''}" data-scale="160">160%</button>
              <button type="button" class="btn-scale-preset ${Math.round((node.scale || 1) * 100) === 200 ? 'active' : ''}" data-scale="200">200%</button>
            </div>
          </div>

          <div class="inspector-card">
            <div class="inspector-card-header">
              <span>🏷️ Diseño de Etiquetas</span>
            </div>
            <label class="toggle-switch-wrap" for="prop-node-encapsulate">
              <div>
                <div style="font-size: 0.76rem; font-weight: 600; color: var(--text-primary);">Encapsular en la tarjeta</div>
                <div style="font-size: 0.68rem; color: var(--text-muted); margin-top: 2px;">Integra nombre e IP dentro del recuadro unificado.</div>
              </div>
              <div class="toggle-switch">
                <input type="checkbox" id="prop-node-encapsulate" ${node.encapsulatedLabels ? 'checked' : ''}>
                <span class="toggle-slider"></span>
              </div>
            </label>
            <button type="button" id="btn-apply-encapsulate-all" class="btn btn-secondary" style="width: 100%; font-size: 0.72rem; justify-content: center; gap: 0.35rem; padding: 0.35rem 0.5rem; margin-top: 0.2rem;">
              <span>⊞</span> Aplicar este diseño a todos los equipos
            </button>
          </div>
        </div>

        <!-- BARRA FIJA DE ACCIONES AL PIE -->
        <div class="inspector-actions-bar">
          <button id="btn-dup-node" class="btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            Duplicar
          </button>
          <button id="btn-del-node" class="btn btn-danger">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            Eliminar
          </button>
        </div>
      `;

      // Manejador de cambio de pestañas del inspector
      dom.inspectorBody.querySelectorAll('.inspector-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          currentInspectorTab = btn.dataset.tab;
          dom.inspectorBody.querySelectorAll('.inspector-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === currentInspectorTab));
          dom.inspectorBody.querySelectorAll('.inspector-tab-pane').forEach(p => p.classList.toggle('active', p.dataset.pane === currentInspectorTab));
        });
      });

      // Eventos de campos del nodo
      document.getElementById('prop-node-name').addEventListener('input', (e) => {
        node.name = e.target.value;
        if (node.customName !== undefined) node.customName = e.target.value;
        renderNodeElement(node);
        renderConnections();
        saveState();
      });

      // Manejadores de escala (%) del equipo
      const scaleSlider = document.getElementById('prop-node-scale-slider');
      const scaleInput = document.getElementById('prop-node-scale-input');
      const scaleLabel = document.getElementById('lbl-node-scale');

      const applyScale = (pctVal) => {
        const pct = Math.max(50, Math.min(250, parseInt(pctVal, 10) || 100));
        node.scale = pct / 100;
        if (scaleSlider) scaleSlider.value = pct;
        if (scaleInput) scaleInput.value = pct;
        if (scaleLabel) scaleLabel.textContent = `${pct}%`;

        dom.inspectorBody.querySelectorAll('.btn-scale-preset').forEach(btn => {
          btn.classList.toggle('active', parseInt(btn.dataset.scale, 10) === pct);
        });

        renderNodeElement(node);
        renderConnections();
        saveState();
      };

      if (scaleSlider) {
        scaleSlider.addEventListener('input', (e) => applyScale(e.target.value));
      }
      if (scaleInput) {
        scaleInput.addEventListener('change', (e) => applyScale(e.target.value));
      }
      dom.inspectorBody.querySelectorAll('.btn-scale-preset').forEach(btn => {
        btn.addEventListener('click', () => applyScale(btn.dataset.scale));
      });

      document.getElementById('prop-node-ip').addEventListener('input', (e) => {
        node.ip = e.target.value;
        renderNodeElement(node);
        renderConnections();
        saveState();
      });

      const chkEncapsulate = document.getElementById('prop-node-encapsulate');
      if (chkEncapsulate) {
        chkEncapsulate.addEventListener('change', (e) => {
          node.encapsulatedLabels = e.target.checked;
          const physical = state.nodes.filter(n => n.type !== 'text_badge');
          if (physical.length > 0 && physical.every(n => Boolean(n.encapsulatedLabels) === e.target.checked)) {
            state.defaultEncapsulatedLabels = e.target.checked;
            try {
              localStorage.setItem('nettopology_default_encapsulated', String(e.target.checked));
            } catch (err) {}
          }
          renderNodeElement(node);
          renderConnections();
          saveState();
        });
      }

      const btnApplyEncapsulateAll = document.getElementById('btn-apply-encapsulate-all');
      if (btnApplyEncapsulateAll) {
        btnApplyEncapsulateAll.addEventListener('click', () => {
          const val = Boolean(node.encapsulatedLabels);
          state.defaultEncapsulatedLabels = val;
          try {
            localStorage.setItem('nettopology_default_encapsulated', String(val));
          } catch(e) {}
          state.nodes.forEach(n => {
            if (n.type !== 'text_badge') {
              n.encapsulatedLabels = val;
              renderNodeElement(n);
            }
          });
          renderConnections();
          saveState();
          if (typeof showToast === 'function') {
            showToast(val ? 'Diseño encapsulado aplicado a todos los equipos (y nuevos)' : 'Diseño estándar restaurado en todos los equipos', 'success');
          }
        });
      }

      document.getElementById('prop-node-mask').addEventListener('input', (e) => {
        node.mask = e.target.value;
        saveState();
      });

      document.getElementById('prop-node-gw').addEventListener('input', (e) => {
        node.gateway = e.target.value;
        saveState();
      });

      document.getElementById('prop-node-notes').addEventListener('input', (e) => {
        node.notes = e.target.value;
        saveState();
      });

      // Manejador de plantillas de bocas
      const templateSelect = document.getElementById('select-port-template');
      const customBox = document.getElementById('custom-ports-box');

      templateSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        if (!val) return;
        if (val === 'custom') {
          customBox.style.display = 'block';
        } else {
          customBox.style.display = 'none';
          applyPortTemplateToNode(node, val);
        }
      });

      document.getElementById('btn-apply-custom-ports').addEventListener('click', () => {
        const cu = parseInt(document.getElementById('custom-copper-count').value, 10) || 0;
        const fib = parseInt(document.getElementById('custom-fiber-count').value, 10) || 0;
        const ser = parseInt(document.getElementById('custom-serial-count').value, 10) || 0;

        let newPorts = [];
        const prefix = (node.type === 'router') ? 'Eth' : 'Boca';
        for (let i = 1; i <= cu; i++) newPorts.push(`${prefix} ${i}`);
        for (let i = 1; i <= fib; i++) newPorts.push(`Fibra ${i}`);
        for (let i = 1; i <= ser; i++) newPorts.push(`WAN ${i}`);

        // Preservar bocas actualmente conectadas
        Object.keys(usedPortsMap).forEach(up => {
          if (!newPorts.includes(up)) newPorts.push(up);
        });

        node.availablePorts = newPorts;
        renderInspector();
        saveState();
      });

      // Agregar boca individual manual (con normalizador inteligente)
      const newPortInput = document.getElementById('input-new-port');
      const addPortBtn = document.getElementById('btn-add-port');

      const handleAddManualPort = () => {
        const raw = newPortInput.value.trim();
        if (!raw) return;
        const defaultPrefix = (node.type === 'router') ? 'Eth' : 'Boca';
        const pName = normalizePortName(raw, defaultPrefix);
        if (!node.availablePorts) node.availablePorts = [];
        if (!node.availablePorts.includes(pName)) {
          node.availablePorts.push(pName);
          renderInspector();
          saveState();
        } else {
          alert(`La boca "${pName}" ya existe en este equipo.`);
        }
      };

      addPortBtn.addEventListener('click', handleAddManualPort);
      newPortInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleAddManualPort();
      });

      // Eliminar boca libre
      dom.inspectorBody.querySelectorAll('[data-remove-port]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const portToRemove = btn.dataset.removePort;
          if (usedPortsMap[portToRemove]) {
            alert(`No puedes eliminar la boca "${portToRemove}" porque tiene un cable conectado.`);
            return;
          }
          node.availablePorts = node.availablePorts.filter(p => p !== portToRemove);
          renderInspector();
          saveState();
        });
      });

      document.getElementById('btn-dup-node').addEventListener('click', () => {
        duplicateNode(node.id);
      });

      document.getElementById('btn-del-node').addEventListener('click', () => {
        if (confirm(`¿Eliminar el dispositivo "${node.name}" y sus conexiones?`)) {
          deleteNode(node.id);
        }
      });

      // Clics en la lista de conexiones del inspector
      dom.inspectorBody.querySelectorAll('[data-cable-id]').forEach(row => {
        row.addEventListener('click', (e) => {
          if (e.target.dataset.delCable) return;
          selectElement('cable', row.dataset.cableId);
        });
      });

      dom.inspectorBody.querySelectorAll('[data-del-cable]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          deleteConnection(btn.dataset.delCable);
          renderInspector();
        });
      });
    } else if (type === 'cable') {
      const conn = state.connections.find(c => c.id === id);
      if (!conn) return deselectAll();

      const nodeA = state.nodes.find(n => n.id === conn.fromNodeId);
      const nodeB = state.nodes.find(n => n.id === conn.toNodeId);

      dom.inspectorTitle.textContent = 'Configuración de Enlace';

      const cableConfig = CABLE_TYPES[conn.cableType] || CABLE_TYPES.ethernet;

      dom.inspectorBody.innerHTML = `
        <!-- TARJETA HERO DEL ENLACE -->
        <div class="inspector-hero-card">
          <div class="inspector-hero-icon" style="color: ${cableConfig.color || 'var(--accent-cyan)'};">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </div>
          <div class="inspector-hero-details">
            <span class="inspector-hero-title">${nodeA ? escapeHtml(nodeA.name) : 'Equipo A'} ↔ ${nodeB ? escapeHtml(nodeB.name) : 'Equipo B'}</span>
            <div class="inspector-hero-meta">
              <span>${cableConfig.name || 'Enlace'}</span>
              <span class="inspector-hero-badge">${escapeHtml(conn.fromPort)} → ${escapeHtml(conn.toPort)}</span>
            </div>
          </div>
        </div>

        <!-- BOTÓN DE PRUEBA DE PING Y TRÁFICO -->
        <button type="button" class="btn-ping-trigger" id="btn-ping-conn" title="Enviar paquetes de prueba y medir latencia entre ambos equipos">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          Probar Conectividad (Ping / Tráfico)
        </button>

        <!-- TARJETA: BOCAS Y TIPO DE CABLE -->
        <div class="inspector-card">
          <div class="inspector-card-header">
            <span>🔌 Bocas y Medio Físico</span>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
            <div class="form-group">
              <label style="font-size:0.68rem;">Boca en ${nodeA ? escapeHtml(nodeA.name) : 'A'}</label>
              <input type="text" id="prop-cable-porta" class="form-control mono" value="${escapeHtml(conn.fromPort)}">
            </div>
            <div class="form-group">
              <label style="font-size:0.68rem;">Boca en ${nodeB ? escapeHtml(nodeB.name) : 'B'}</label>
              <input type="text" id="prop-cable-portb" class="form-control mono" value="${escapeHtml(conn.toPort)}">
            </div>
          </div>

          <div class="form-group">
            <label style="font-size:0.68rem;">Capa Técnica</label>
            <select id="prop-cable-layer" class="form-control" style="font-size:0.78rem;">
              <option value="physical" ${(conn.layer || 'physical') === 'physical' ? 'selected' : ''}>🌐 Capa Física (Cableado Estructurado / Datos)</option>
              <option value="logical" ${(conn.layer || 'physical') === 'logical' ? 'selected' : ''}>🔀 Capa Lógica (Trunks / VLANs / IPs)</option>
              <option value="power" ${(conn.layer || 'physical') === 'power' ? 'selected' : ''}>⚡ Capa Eléctrica (Alimentación 220V / UPS)</option>
            </select>
          </div>

          <div class="form-group">
            <label style="font-size:0.68rem;">Tipo de Cable / Medio</label>
            <select id="prop-cable-type" class="form-control">
              <option value="ethernet" ${conn.cableType === 'ethernet' ? 'selected' : ''}>🔌 Ethernet UTP / Cat6</option>
              <option value="power" ${conn.cableType === 'power' ? 'selected' : ''}>⚡ Alimentación Eléctrica AC / 220V (Rojo)</option>
              <option value="fiber" ${conn.cableType === 'fiber' ? 'selected' : ''}>💡 Fibra Óptica</option>
              <option value="serial" ${conn.cableType === 'serial' ? 'selected' : ''}>⚡ Serial WAN</option>
              <option value="wireless" ${conn.cableType === 'wireless' ? 'selected' : ''}>📶 Enlace WiFi / Inalámbrico</option>
            </select>
          </div>

          <div class="form-group">
            <label style="font-size:0.68rem;">Etiqueta de Red / VLAN</label>
            <input type="text" id="prop-cable-tag" class="form-control mono" placeholder="Ej: 192.168.10.0/24 - VLAN 20" value="${escapeHtml(conn.networkLabel || '')}">
          </div>
        </div>

        <!-- TARJETA: TRAZADO Y PUNTOS -->
        <div class="inspector-card">
          <div class="inspector-card-header">
            <span>📐 Geometría y Puntos de Quiebre</span>
          </div>
          <div class="routing-mode-buttons">
            <button type="button" class="btn-routing-mode ${(conn.routingMode || state.defaultRoutingMode || 'orthogonal') === 'orthogonal' ? 'active' : ''}" data-routing="orthogonal" title="Ángulo recto a 90° con esquinas redondeadas técnicas">🔲 Ortogonal 90°</button>
            <button type="button" class="btn-routing-mode ${(conn.routingMode || state.defaultRoutingMode || 'orthogonal') === 'curved' ? 'active' : ''}" data-routing="curved" title="Curva suave fluida">〰️ Curvo</button>
            <button type="button" class="btn-routing-mode ${(conn.routingMode || state.defaultRoutingMode || 'orthogonal') === 'straight' ? 'active' : ''}" data-routing="straight" title="Línea recta clásica">📏 Recto</button>
          </div>

          <!-- Selector de Lado de Salida y Entrada -->
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:0.5rem; background:var(--bg-surface-elevated); padding:0.5rem; border-radius:6px; border:1px solid var(--border-color);">
            <div>
              <label style="font-size:0.65rem; color:var(--text-secondary); font-weight:600; display:block; margin-bottom:0.2rem;">Salida (${escapeHtml(nodeA ? (nodeA.customName || nodeA.name) : 'A')})</label>
              <select id="prop-cable-from-side" class="form-control form-control-sm" style="font-size:0.72rem; padding:0.25rem 0.35rem; width:100%;">
                <option value="auto" ${(!conn.fromSide || conn.fromSide === 'auto') ? 'selected' : ''}>⚡ Automático</option>
                <option value="top" ${conn.fromSide === 'top' ? 'selected' : ''}>⬆️ Arriba</option>
                <option value="bottom" ${conn.fromSide === 'bottom' ? 'selected' : ''}>⬇️ Abajo</option>
                <option value="left" ${conn.fromSide === 'left' ? 'selected' : ''}>⬅️ Izquierda</option>
                <option value="right" ${conn.fromSide === 'right' ? 'selected' : ''}>➡️ Derecha</option>
              </select>
            </div>
            <div>
              <label style="font-size:0.65rem; color:var(--text-secondary); font-weight:600; display:block; margin-bottom:0.2rem;">Entrada (${escapeHtml(nodeB ? (nodeB.customName || nodeB.name) : 'B')})</label>
              <select id="prop-cable-to-side" class="form-control form-control-sm" style="font-size:0.72rem; padding:0.25rem 0.35rem; width:100%;">
                <option value="auto" ${(!conn.toSide || conn.toSide === 'auto') ? 'selected' : ''}>⚡ Automático</option>
                <option value="top" ${conn.toSide === 'top' ? 'selected' : ''}>⬆️ Arriba</option>
                <option value="bottom" ${conn.toSide === 'bottom' ? 'selected' : ''}>⬇️ Abajo</option>
                <option value="left" ${conn.toSide === 'left' ? 'selected' : ''}>⬅️ Izquierda</option>
                <option value="right" ${conn.toSide === 'right' ? 'selected' : ''}>➡️ Derecha</option>
              </select>
            </div>
          </div>

          <div class="waypoint-info-box" style="margin-top: 0.2rem;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:0.72rem; color:var(--text-primary); font-weight:600;">Puntos de Inflexión:</span>
              <span class="mono" style="font-size:0.75rem; color:var(--accent-cyan); font-weight:700;">${(conn.waypoints || []).length}</span>
            </div>
            ${(Array.isArray(conn.waypoints) && conn.waypoints.length > 0) ? `
              <div class="waypoint-items-list" style="margin-top: 0.35rem;">
                ${conn.waypoints.map((wp, i) => `
                  <div class="waypoint-item-chip">
                    <span style="color:var(--accent-cyan); font-weight:700;">P${i + 1}</span>
                    <span>(${Math.round(wp.x)}, ${Math.round(wp.y)})</span>
                    <button type="button" data-del-wp="${i}" title="Eliminar punto P${i + 1}">✕</button>
                  </div>
                `).join('')}
              </div>
            ` : ''}
            <div style="display:flex; gap:0.4rem; margin-top:0.4rem;">
              <button type="button" id="btn-add-wp" class="btn btn-sm" style="flex:1; font-size:0.72rem; padding:0.35rem;">
                ➕ Añadir Punto
              </button>
              <button type="button" id="btn-clear-wps" class="btn btn-sm" style="flex:1; font-size:0.72rem; padding:0.35rem;" ${(conn.waypoints || []).length === 0 ? 'disabled' : ''}>
                ↺ Restablecer
              </button>
            </div>
          </div>
        </div>

        <!-- BARRA FIJA DE ACCIONES AL PIE -->
        <div class="inspector-actions-bar" style="grid-template-columns: 1fr;">
          <button id="btn-del-cable" class="btn btn-danger" style="width: 100%;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            Eliminar Conexión
          </button>
        </div>
      `;

      const btnPing = document.getElementById('btn-ping-conn');
      if (btnPing) {
        btnPing.addEventListener('click', () => {
          simulateCablePing(conn);
        });
      }

      document.getElementById('prop-cable-porta').addEventListener('input', (e) => {
        conn.fromPort = e.target.value;
        renderConnections();
        saveState();
      });

      document.getElementById('prop-cable-portb').addEventListener('input', (e) => {
        conn.toPort = e.target.value;
        renderConnections();
        saveState();
      });

      const selCableLayer = document.getElementById('prop-cable-layer');
      if (selCableLayer) {
        selCableLayer.addEventListener('change', (e) => {
          conn.layer = e.target.value;
          if (conn.layer === 'power' && conn.cableType !== 'power') {
            conn.cableType = 'power';
          }
          renderConnections();
          renderInspector();
          saveState();
        });
      }

      document.getElementById('prop-cable-type').addEventListener('change', (e) => {
        conn.cableType = e.target.value;
        if (conn.cableType === 'power') {
          conn.layer = 'power';
        }
        renderConnections();
        renderInspector();
        saveState();
      });

      document.getElementById('prop-cable-tag').addEventListener('input', (e) => {
        conn.networkLabel = e.target.value;
        renderConnections();
        saveState();
      });

      // Selectores de lado de salida y entrada
      const selFromSide = document.getElementById('prop-cable-from-side');
      if (selFromSide) {
        selFromSide.addEventListener('change', (e) => {
          conn.fromSide = e.target.value;
          renderConnections();
          saveState();
        });
      }

      const selToSide = document.getElementById('prop-cable-to-side');
      if (selToSide) {
        selToSide.addEventListener('change', (e) => {
          conn.toSide = e.target.value;
          renderConnections();
          saveState();
        });
      }

      // Manejadores de modo de enrutamiento
      dom.inspectorBody.querySelectorAll('.btn-routing-mode').forEach(btn => {
        btn.addEventListener('click', () => {
          conn.routingMode = btn.dataset.routing;
          renderConnections();
          renderInspector();
          saveState();
        });
      });

      // Eliminar punto individual de waypoint desde el inspector
      dom.inspectorBody.querySelectorAll('[data-del-wp]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const wpIdx = parseInt(btn.dataset.delWp, 10);
          if (!isNaN(wpIdx) && Array.isArray(conn.waypoints)) {
            conn.waypoints.splice(wpIdx, 1);
            renderConnections();
            renderInspector();
            saveState();
          }
        });
      });

      // Añadir punto de quiebre en el centro geométrico del cable
      const btnAddWp = document.getElementById('btn-add-wp');
      if (btnAddWp) {
        btnAddWp.addEventListener('click', () => {
          const curve = computeConnectionCurve(conn, nodeA, nodeB);
          const posMid = getPointAlongCable(curve, (curve.totalLength || 100) * 0.5, false);

          let wx = posMid.x;
          let wy = posMid.y;
          if (state.snapToGrid) {
            wx = Math.round(wx / state.gridSize) * state.gridSize;
            wy = Math.round(wy / state.gridSize) * state.gridSize;
          }

          insertWaypointAtOptimalIndex(conn, { x: Math.round(wx), y: Math.round(wy) }, nodeA, nodeB);
          renderConnections();
          renderInspector();
          saveState();
        });
      }

      // Limpiar waypoints y volver al trazado automático
      const btnClearWps = document.getElementById('btn-clear-wps');
      if (btnClearWps) {
        btnClearWps.addEventListener('click', () => {
          conn.waypoints = [];
          renderConnections();
          renderInspector();
          saveState();
        });
      }

      document.getElementById('btn-del-cable').addEventListener('click', () => {
        deleteConnection(conn.id);
      });
    }
  }


// Registrar métodos en el contexto global de aplicación
app.updateSelectionVisuals = updateSelectionVisuals;
app.selectElement = selectElement;
app.deselectAll = deselectAll;
app.selectAllNodes = selectAllNodes;
app.detectPortType = detectPortType;
app.applyPortTemplateToNode = applyPortTemplateToNode;
app.renderInspector = renderInspector;
