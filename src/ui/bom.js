/**
 * NetTopology - Módulo src/ui/bom.js
 */

import { state, dom } from '../state/store.js';
import { app } from '../core/appContext.js';
import { DEVICE_ICONS, DEVICE_ICONS_LIGHT, DEVICE_METADATA, CABLE_TYPES, getDeviceIcon, generateSwitchPorts, generateRouterPorts } from '../config/icons.js';
import { STORAGE_PROJECTS_KEY, STORAGE_ACTIVE_ID_KEY, STORAGE_LEGACY_KEY, SHEET_PRESETS, ZONE_COLOR_PALETTES, MAX_HISTORY_STEPS, DEFAULT_GRID_SIZE } from '../config/constants.js';
import { escapeHtml, incrementIp, formatDateForFile, clamp, generateId } from '../utils/helpers.js';
import { showToast } from '../storage/db.js';



  // ==========================================================================
  // CÓMPUTO DE MATERIALES (BOM - BILL OF MATERIALS)
  // ==========================================================================
  let activeBomTab = 'cables';
  let cachedBomData = null;

export function initBomModal() {
    if (dom.tabBomCables) {
      dom.tabBomCables.addEventListener('click', () => switchBomTab('cables'));
    }
    if (dom.tabBomHardware) {
      dom.tabBomHardware.addEventListener('click', () => switchBomTab('hardware'));
    }
    if (dom.tabBomPorts) {
      dom.tabBomPorts.addEventListener('click', () => switchBomTab('ports'));
    }
    if (dom.btnCloseBomModal) {
      dom.btnCloseBomModal.addEventListener('click', closeBomModal);
    }
    if (dom.btnCloseBomBottom) {
      dom.btnCloseBomBottom.addEventListener('click', closeBomModal);
    }
    if (dom.btnExportBomCsv) {
      dom.btnExportBomCsv.addEventListener('click', exportBOMToCSV);
    }
    if (dom.btnCopyBom) {
      dom.btnCopyBom.addEventListener('click', copyBOMToClipboard);
    }
  }

export function openBomModal() {
    if (!dom.modalBom) return;
    switchBomTab('cables');
    computeAndRenderBOM();
    dom.modalBom.classList.add('open');
  }

export function closeBomModal() {
    if (!dom.modalBom) return;
    dom.modalBom.classList.remove('open');
  }

export function switchBomTab(tabName) {
    activeBomTab = tabName;
    const tabs = [
      { id: 'tab-bom-cables', panel: dom.bomPanelCables, name: 'cables' },
      { id: 'tab-bom-hardware', panel: dom.bomPanelHardware, name: 'hardware' },
      { id: 'tab-bom-ports', panel: dom.bomPanelPorts, name: 'ports' }
    ];

    tabs.forEach(t => {
      const btn = document.getElementById(t.id);
      const isActive = (t.name === tabName);
      if (btn) btn.classList.toggle('active', isActive);
      if (t.panel) t.panel.style.display = isActive ? 'block' : 'none';
    });
  }

export function computeBOM() {
    const hardwareMap = new Map();
    const portsReport = [];
    let totalDevices = state.nodes.length;
    let totalPortsAvailable = 0;
    let totalPortsConnected = 0;

    state.nodes.forEach(node => {
      const type = node.type || 'pc';
      const meta = DEVICE_METADATA[type] || { label: 'Dispositivo' };
      const brand = node.brand || meta.label || type.toUpperCase();
      const key = `${type}|${brand}`;

      const connectedCount = state.connections.filter(c => c.fromNodeId === node.id || c.toNodeId === node.id).length;
      const availCount = Array.isArray(node.availablePorts) ? Math.max(node.availablePorts.length, connectedCount) : Math.max(1, connectedCount);
      const freeCount = Math.max(0, availCount - connectedCount);

      totalPortsAvailable += availCount;
      totalPortsConnected += connectedCount;

      if (!hardwareMap.has(key)) {
        hardwareMap.set(key, {
          typeLabel: meta.label || type,
          modelBrand: brand,
          count: 0,
          totalPorts: 0,
          usedPorts: 0,
          freePorts: 0,
          hostnames: []
        });
      }
      const hw = hardwareMap.get(key);
      hw.count++;
      hw.totalPorts += availCount;
      hw.usedPorts += connectedCount;
      hw.freePorts += freeCount;
      hw.hostnames.push(node.name || 'S/N');

      const saturationPct = availCount > 0 ? Math.round((connectedCount / availCount) * 100) : 0;
      portsReport.push({
        nodeName: node.name,
        ip: node.ip || 'DHCP',
        typeLabel: meta.label || type,
        used: connectedCount,
        total: availCount,
        free: freeCount,
        saturation: saturationPct
      });
    });

    const cablesMap = new Map();
    let totalCords = state.connections.length;
    let totalEstimatedMeters = 0;

    state.connections.forEach(conn => {
      const nodeA = state.nodes.find(n => n.id === conn.fromNodeId);
      const nodeB = state.nodes.find(n => n.id === conn.toNodeId);
      const nameA = nodeA ? nodeA.name : 'Desc';
      const nameB = nodeB ? nodeB.name : 'Desc';

      let cableType = conn.cableType || 'ethernet';
      let category = 'UTP Cat.6';
      let connectorA = 'RJ45';
      let connectorB = 'RJ45';

      if (cableType === 'fiber') {
        category = conn.label && conn.label.includes('SM') ? 'Fibra Monomodo (OS2)' : 'Fibra Multimodo (OM3)';
        connectorA = 'LC Duplex';
        connectorB = 'LC Duplex';
      } else if (cableType === 'power') {
        category = 'Alimentación 220V (Poder)';
        connectorA = 'Schuko / C14';
        connectorB = 'IEC C13';
      } else {
        if (conn.label) {
          if (conn.label.toLowerCase().includes('cat6a')) category = 'UTP Cat.6A';
          else if (conn.label.toLowerCase().includes('cat5')) category = 'UTP Cat.5e';
          else if (conn.label.toLowerCase().includes('cat7')) category = 'S/FTP Cat.7';
        }
      }

      let distPx = 100;
      if (nodeA && nodeB) {
        distPx = Math.hypot(nodeB.x - nodeA.x, nodeB.y - nodeA.y);
      }
      const estMeters = Math.max(1, Math.round((distPx * 0.05 + 1.5) * 10) / 10);
      totalEstimatedMeters += estMeters;

      const key = `${category}|${connectorA}`;
      if (!cablesMap.has(key)) {
        cablesMap.set(key, {
          category,
          connectorA,
          connectorB,
          cableType,
          count: 0,
          totalMeters: 0,
          links: []
        });
      }
      const cItem = cablesMap.get(key);
      cItem.count++;
      cItem.totalMeters += estMeters;
      cItem.links.push(`${nameA} ↔ ${nameB} (${estMeters}m)`);
    });

    const overallSaturation = totalPortsAvailable > 0 ? Math.round((totalPortsConnected / totalPortsAvailable) * 100) : 0;

    cachedBomData = {
      totalDevices,
      totalCords,
      totalEstimatedMeters: Math.round(totalEstimatedMeters * 10) / 10,
      overallSaturation,
      cables: Array.from(cablesMap.values()),
      hardware: Array.from(hardwareMap.values()),
      ports: portsReport.sort((a, b) => b.saturation - a.saturation)
    };

    return cachedBomData;
  }

export function computeAndRenderBOM() {
    const data = computeBOM();

    const elDev = document.getElementById('bom-kpi-devices');
    const elCords = document.getElementById('bom-kpi-cords');
    const elLen = document.getElementById('bom-kpi-length');
    const elPorts = document.getElementById('bom-kpi-ports');

    if (elDev) elDev.textContent = data.totalDevices;
    if (elCords) elCords.textContent = data.totalCords;
    if (elLen) elLen.textContent = `~${data.totalEstimatedMeters} m`;
    if (elPorts) elPorts.textContent = `${data.overallSaturation}%`;

    const tbodyCables = document.getElementById('tbody-bom-cables');
    if (tbodyCables) {
      if (data.cables.length === 0) {
        tbodyCables.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2rem; color: var(--text-muted);">No hay conexiones ni cables en este diagrama</td></tr>`;
      } else {
        tbodyCables.innerHTML = data.cables.map(c => {
          const avgLen = Math.round((c.totalMeters / c.count) * 10) / 10;
          const badgeClass = c.cableType === 'fiber' ? 'badge-cat-fiber' : (c.cableType === 'power' ? 'badge-cat-power' : 'badge-cat-utp');
          
          let suggestion = `${c.count}x Patch Cords de ${Math.max(1, Math.ceil(avgLen))}m`;
          if (c.totalMeters > 50 && c.cableType === 'ethernet') {
            const coils = Math.ceil(c.totalMeters / 305);
            suggestion = `${coils} bobina(s) 305m o ${c.count} cords de ${Math.ceil(avgLen)}m`;
          }

          return `
            <tr>
              <td><span class="badge-cable-cat ${badgeClass}">${c.category}</span></td>
              <td style="font-family: var(--font-mono); font-size: 0.75rem;">${c.connectorA} → ${c.connectorB}</td>
              <td style="text-align: center; font-weight: 700;">${c.count}</td>
              <td style="text-align: right; font-family: var(--font-mono);">~${avgLen} m</td>
              <td style="text-align: right; font-family: var(--font-mono); font-weight: 700;">~${Math.round(c.totalMeters)} m</td>
              <td><span class="badge-stock-rec">${suggestion}</span></td>
              <td style="font-size: 0.75rem; color: var(--text-secondary); max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${c.links.join('\n')}">
                ${c.links.slice(0, 3).join(', ')}${c.links.length > 3 ? '...' : ''}
              </td>
            </tr>
          `;
        }).join('');
      }
    }

    const tbodyHardware = document.getElementById('tbody-bom-hardware');
    if (tbodyHardware) {
      if (data.hardware.length === 0) {
        tbodyHardware.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2rem; color: var(--text-muted);">No hay dispositivos en este diagrama</td></tr>`;
      } else {
        tbodyHardware.innerHTML = data.hardware.map(hw => `
          <tr>
            <td style="font-weight: 600;">${hw.typeLabel}</td>
            <td><span class="status-badge-subtle">${hw.modelBrand}</span></td>
            <td style="text-align: center; font-weight: 700;">${hw.count}</td>
            <td style="text-align: center; font-family: var(--font-mono);">${hw.totalPorts}</td>
            <td style="text-align: center; font-family: var(--font-mono); color: var(--accent-cyan); font-weight: 600;">${hw.usedPorts}</td>
            <td style="text-align: center; font-family: var(--font-mono); color: var(--accent-emerald); font-weight: 600;">${hw.freePorts}</td>
            <td style="font-size: 0.75rem; color: var(--text-secondary); max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${hw.hostnames.join(', ')}">
              ${hw.hostnames.join(', ')}
            </td>
          </tr>
        `).join('');
      }
    }

    const tbodyPorts = document.getElementById('tbody-bom-ports');
    if (tbodyPorts) {
      if (data.ports.length === 0) {
        tbodyPorts.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2rem; color: var(--text-muted);">No hay equipos configurados</td></tr>`;
      } else {
        tbodyPorts.innerHTML = data.ports.map(p => {
          let statusBadge = '<span style="color: #10b981; font-weight: 600; font-size: 0.75rem;">● Óptimo</span>';
          if (p.saturation >= 85) {
            statusBadge = '<span style="color: #ef4444; font-weight: 700; font-size: 0.75rem;">▲ Saturación Alta</span>';
          } else if (p.saturation >= 60) {
            statusBadge = '<span style="color: #f59e0b; font-weight: 600; font-size: 0.75rem;">◆ Carga Media</span>';
          } else if (p.used === 0) {
            statusBadge = '<span style="color: #64748b; font-size: 0.75rem;">○ Sin Enlaces</span>';
          }

          return `
            <tr>
              <td style="font-weight: 600;">${p.nodeName}</td>
              <td style="font-family: var(--font-mono); font-size: 0.75rem;">${p.ip}</td>
              <td>${p.typeLabel}</td>
              <td style="text-align: center; font-family: var(--font-mono); font-weight: 600;">${p.used} / ${p.total}</td>
              <td style="text-align: center; font-family: var(--font-mono);">${p.free} libres</td>
              <td style="text-align: center; font-family: var(--font-mono); font-weight: 700;">${p.saturation}%</td>
              <td>${statusBadge}</td>
            </tr>
          `;
        }).join('');
      }
    }
  }

export function exportBOMToCSV() {
    const data = cachedBomData || computeBOM();
    let csv = '\uFEFF';

    csv += 'CÓMPUTO CUANTITATIVO DE MATERIALES (BOM) - UINFOR NETTOPOLOGY\r\n';
    csv += `Proyecto;${state.currentProjectName}\r\n`;
    csv += `Fecha;${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\r\n`;
    csv += `Total Equipos;${data.totalDevices};Total Cables;${data.totalCords};Metros Estimados;${data.totalEstimatedMeters} m;Saturacion Global;${data.overallSaturation}%\r\n\r\n`;

    csv += '--- 1. LISTADO CUANTITATIVO DE CABLEADO Y PATCH CORDS ---\r\n';
    csv += 'Categoria / Tipo;Conector A;Conector B;Cantidad;Longitud Promedio (m);Metros Totales (m);Sugerencia de Compra\r\n';
    data.cables.forEach(c => {
      const avgLen = Math.round((c.totalMeters / c.count) * 10) / 10;
      csv += `"${c.category}";"${c.connectorA}";"${c.connectorB}";${c.count};${avgLen};${Math.round(c.totalMeters)};"${c.count} patch cords de ${Math.ceil(avgLen)}m"\r\n`;
    });

    csv += '\r\n--- 2. INVENTARIO DE HARDWARE Y EQUIPOS ---\r\n';
    csv += 'Tipo de Equipo;Modelo / Marca;Cantidad;Bocas Totales;Bocas Ocupadas;Bocas Libres;Equipos\r\n';
    data.hardware.forEach(hw => {
      csv += `"${hw.typeLabel}";"${hw.modelBrand}";${hw.count};${hw.totalPorts};${hw.usedPorts};${hw.freePorts};"${hw.hostnames.join(', ')}"\r\n`;
    });

    csv += '\r\n--- 3. BALANCE DE PUERTOS POR DISPOSITIVO ---\r\n';
    csv += 'Dispositivo;Direccion IP;Tipo;Puertos Ocupados;Capacidad Total;Puertos Libres;% Saturacion\r\n';
    data.ports.forEach(p => {
      csv += `"${p.nodeName}";"${p.ip}";"${p.typeLabel}";${p.used};${p.total};${p.free};${p.saturation}%\r\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Computo_Materiales_BOM_${state.currentProjectName.replace(/\s+/g, '_')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Lista de Materiales (BOM) exportada a CSV para Excel');
  }

export function copyBOMToClipboard() {
    const data = cachedBomData || computeBOM();
    let text = `CÓMPUTO DE MATERIALES (BOM) - ${state.currentProjectName}\n\n`;

    text += `CATEGORÍA / TIPO\tCONECTORES\tCANTIDAD\tLONGITUD PROMEDIO\tMETROS TOTALES\tSUGERENCIA\n`;
    data.cables.forEach(c => {
      const avgLen = Math.round((c.totalMeters / c.count) * 10) / 10;
      text += `${c.category}\t${c.connectorA} → ${c.connectorB}\t${c.count}\t${avgLen} m\t${Math.round(c.totalMeters)} m\t${c.count} patch cords ${Math.ceil(avgLen)}m\n`;
    });

    text += `\nTIPO EQUIPO\tMODELO/MARCA\tCANTIDAD\tBOCAS TOTALES\tBOCAS OCUPADAS\tBOCAS LIBRES\n`;
    data.hardware.forEach(hw => {
      text += `${hw.typeLabel}\t${hw.modelBrand}\t${hw.count}\t${hw.totalPorts}\t${hw.usedPorts}\t${hw.freePorts}\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      showToast('Datos del Cómputo (BOM) copiados al portapapeles');
    }).catch(() => {
      showToast('No se pudo copiar al portapapeles', 'warning');
    });
  }


// Registrar métodos en el contexto global de aplicación
app.initBomModal = initBomModal;
app.openBomModal = openBomModal;
app.closeBomModal = closeBomModal;
app.switchBomTab = switchBomTab;
app.computeBOM = computeBOM;
app.computeAndRenderBOM = computeAndRenderBOM;
app.exportBOMToCSV = exportBOMToCSV;
app.copyBOMToClipboard = copyBOMToClipboard;
