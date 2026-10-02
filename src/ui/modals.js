/**
 * NetTopology - Módulo src/ui/modals.js
 */

import { state, dom } from '../state/store.js';
import { app } from '../core/appContext.js';
import { DEVICE_ICONS, DEVICE_ICONS_LIGHT, DEVICE_METADATA, CABLE_TYPES, getDeviceIcon, generateSwitchPorts, generateRouterPorts } from '../config/icons.js';
import { STORAGE_PROJECTS_KEY, STORAGE_ACTIVE_ID_KEY, STORAGE_LEGACY_KEY, SHEET_PRESETS, ZONE_COLOR_PALETTES, MAX_HISTORY_STEPS, DEFAULT_GRID_SIZE } from '../config/constants.js';
import { escapeHtml, incrementIp, formatDateForFile, clamp, generateId } from '../utils/helpers.js';
import { createConnection, renderConnections } from '../core/cables.js';
import { closeQuickSearchModal, panAndHighlightNode, setupSearchEvents } from '../core/search.js';
import { closeTopologyAuditModal } from '../core/audit.js';
import { getCurrentSheet } from '../core/sheets.js';
import { createNewProject, closeProjectsModal } from '../storage/db.js';
import { updateExportPagingUI, exportDiagramPdf, exportDiagramPng } from '../export/exportPdf.js';
import { exportDiagramSvg } from '../export/exportSvg.js';
import { closeAllDropdowns } from './topbar.js';

let pendingConnection = null;

  // ==========================================================================
  // MODAL DE CONFIGURACIÓN DE CONEXIÓN Y BOCAS
  // ==========================================================================
export function openCableConfigModal(fromNodeId, toNodeId) {
    const nodeA = state.nodes.find(n => n.id === fromNodeId);
    const nodeB = state.nodes.find(n => n.id === toNodeId);
    if (!nodeA || !nodeB) return;

    pendingConnection = { fromNodeId, toNodeId };

    const isElecA = ['ups', 'termica', 'transfer'].includes(nodeA.type) || (nodeA.type && nodeA.type.startsWith('canal_tension'));
    const isElecB = ['ups', 'termica', 'transfer'].includes(nodeB.type) || (nodeB.type && nodeB.type.startsWith('canal_tension'));
    const isElectricConn = isElecA || isElecB;

    // Asegurar que dispositivos comunes tengan opción de E 220V al conectarse con energía
    if (isElectricConn) {
      if (!isElecA && !(nodeA.availablePorts || []).includes('E 220V')) {
        nodeA.availablePorts = [...(nodeA.availablePorts || []), 'E 220V'];
      }
      if (!isElecB && !(nodeB.availablePorts || []).includes('E 220V')) {
        nodeB.availablePorts = [...(nodeB.availablePorts || []), 'E 220V'];
      }
    }

    const labelPrefixA = isElecA ? 'Borne / Conexión' : (nodeA.type === 'text_badge' ? 'Enlace' : (nodeA.type && nodeA.type.startsWith('router') ? 'Interfaz' : 'Boca'));
    const labelPrefixB = isElecB ? 'Borne / Conexión' : (nodeB.type === 'text_badge' ? 'Enlace' : (nodeB.type && nodeB.type.startsWith('router') ? 'Interfaz' : 'Boca'));

    dom.lblDeviceA.textContent = `${labelPrefixA} en ${nodeA.name} (${DEVICE_METADATA[nodeA.type]?.label || nodeA.type})`;
    dom.lblDeviceB.textContent = `${labelPrefixB} en ${nodeB.name} (${DEVICE_METADATA[nodeB.type]?.label || nodeB.type})`;

    // Sugerir bocas libres primero
    const usedPortsA = state.connections
      .filter(c => c.fromNodeId === fromNodeId || c.toNodeId === fromNodeId)
      .map(c => c.fromNodeId === fromNodeId ? c.fromPort : c.toPort);

    const usedPortsB = state.connections
      .filter(c => c.fromNodeId === toNodeId || c.toNodeId === toNodeId)
      .map(c => c.fromNodeId === toNodeId ? c.fromPort : c.toPort);

    const availA = (nodeA.availablePorts || []).filter(p => !usedPortsA.includes(p));
    const availB = (nodeB.availablePorts || []).filter(p => !usedPortsB.includes(p));

    const defaultPrefixA = (nodeA.type && nodeA.type.startsWith('router')) ? 'Eth' : (isElecA ? 'Borne' : (nodeA.type && nodeA.type.startsWith('switch') ? 'Boca' : 'Port'));
    const defaultPrefixB = (nodeB.type && nodeB.type.startsWith('router')) ? 'Eth' : (isElecB ? 'Borne' : (nodeB.type && nodeB.type.startsWith('switch') ? 'Boca' : 'Port'));

    // Asignación inteligente según tipos de equipos conectados (E 220V para entrada, S 220V para salida)
    let suggestedPortA = availA[0] || (nodeA.availablePorts[0] || `${defaultPrefixA} 1`);
    let suggestedPortB = availB[0] || (nodeB.availablePorts[0] || `${defaultPrefixB} 1`);

    if (nodeA.type === 'text_badge') suggestedPortA = '';
    if (nodeB.type === 'text_badge') suggestedPortB = '';

    if (nodeA.type === 'transfer' && nodeB.type && nodeB.type.startsWith('canal_tension')) {
      suggestedPortA = 'S Canal Tensión';
      suggestedPortB = 'E 220V';
    } else if (nodeA.type && nodeA.type.startsWith('canal_tension') && nodeB.type === 'transfer') {
      suggestedPortA = 'E 220V';
      suggestedPortB = 'S Canal Tensión';
    } else if (nodeA.type && nodeA.type.startsWith('canal_tension') && nodeB.type !== 'transfer') {
      suggestedPortA = (nodeA.availablePorts || []).filter(p => p.startsWith('Toma')).find(p => !usedPortsA.includes(p)) || 'Toma 1';
      suggestedPortB = 'E 220V';
    } else if (nodeA.type !== 'transfer' && nodeB.type && nodeB.type.startsWith('canal_tension')) {
      suggestedPortA = 'E 220V';
      suggestedPortB = (nodeB.availablePorts || []).filter(p => p.startsWith('Toma')).find(p => !usedPortsB.includes(p)) || 'Toma 1';
    } else if (nodeA.type === 'camara' && nodeB.type === 'nvr') {
      suggestedPortA = 'PoE / Eth 1';
      suggestedPortB = ['PoE 1', 'PoE 2', 'PoE 3', 'PoE 4', 'PoE 5', 'PoE 6', 'PoE 7', 'PoE 8'].find(p => !usedPortsB.includes(p)) || 'PoE 1';
    } else if (nodeA.type === 'nvr' && nodeB.type === 'camara') {
      suggestedPortA = ['PoE 1', 'PoE 2', 'PoE 3', 'PoE 4', 'PoE 5', 'PoE 6', 'PoE 7', 'PoE 8'].find(p => !usedPortsA.includes(p)) || 'PoE 1';
      suggestedPortB = 'PoE / Eth 1';
    } else if (nodeA.type === 'camara' && nodeB.type === 'dvr') {
      suggestedPortA = 'PoE / Eth 1';
      suggestedPortB = ['BNC 1', 'BNC 2', 'BNC 3', 'BNC 4', 'BNC 5', 'BNC 6', 'BNC 7', 'BNC 8'].find(p => !usedPortsB.includes(p)) || 'BNC 1';
    } else if (nodeA.type === 'dvr' && nodeB.type === 'camara') {
      suggestedPortA = ['BNC 1', 'BNC 2', 'BNC 3', 'BNC 4', 'BNC 5', 'BNC 6', 'BNC 7', 'BNC 8'].find(p => !usedPortsA.includes(p)) || 'BNC 1';
      suggestedPortB = 'PoE / Eth 1';
    } else if (nodeA.type === 'transfer' && nodeB.type === 'pc') {
      suggestedPortA = ['S PC 1', 'S PC 2', 'S PC 3', 'S PC 4'].find(p => !usedPortsA.includes(p)) || 'S PC 1';
      suggestedPortB = 'E 220V';
    } else if (nodeA.type === 'pc' && nodeB.type === 'transfer') {
      suggestedPortA = 'E 220V';
      suggestedPortB = ['S PC 1', 'S PC 2', 'S PC 3', 'S PC 4'].find(p => !usedPortsB.includes(p)) || 'S PC 1';
    } else if (nodeA.type === 'transfer' && nodeB.type === 'ups') {
      suggestedPortA = ['E UPS 1', 'E UPS 2'].find(p => !usedPortsA.includes(p)) || 'E UPS 1';
      suggestedPortB = ['S 220V (1)', 'S 220V (2)', 'S 220V (3)', 'S 220V (4)'].find(p => !usedPortsB.includes(p)) || 'S 220V (1)';
    } else if (nodeA.type === 'ups' && nodeB.type === 'transfer') {
      suggestedPortA = ['S 220V (1)', 'S 220V (2)', 'S 220V (3)', 'S 220V (4)'].find(p => !usedPortsA.includes(p)) || 'S 220V (1)';
      suggestedPortB = ['E UPS 1', 'E UPS 2'].find(p => !usedPortsB.includes(p)) || 'E UPS 1';
    } else if (nodeA.type === 'transfer' && !['ups', 'termica', 'pc'].includes(nodeB.type) && (!nodeB.type || !nodeB.type.startsWith('canal_tension'))) {
      suggestedPortA = !usedPortsA.includes('S Canal Tensión') ? 'S Canal Tensión' : (availA[0] || 'S Canal Tensión');
      suggestedPortB = 'E 220V';
    } else if ((!['ups', 'termica', 'pc'].includes(nodeA.type) && (!nodeA.type || !nodeA.type.startsWith('canal_tension'))) && nodeB.type === 'transfer') {
      suggestedPortA = 'E 220V';
      suggestedPortB = !usedPortsB.includes('S Canal Tensión') ? 'S Canal Tensión' : (availB[0] || 'S Canal Tensión');
    } else if (nodeA.type === 'termica' && nodeB.type === 'ups') {
      suggestedPortA = 'S 220V';
      suggestedPortB = 'E 220V';
    } else if (nodeA.type === 'ups' && nodeB.type === 'termica') {
      suggestedPortA = 'E 220V';
      suggestedPortB = 'S 220V';
    } else if (nodeA.type === 'ups' && !['termica', 'transfer'].includes(nodeB.type)) {
      suggestedPortA = ['S 220V (1)', 'S 220V (2)', 'S 220V (3)', 'S 220V (4)'].find(p => !usedPortsA.includes(p)) || 'S 220V (1)';
      suggestedPortB = 'E 220V';
    } else if (!['termica', 'transfer'].includes(nodeA.type) && nodeB.type === 'ups') {
      suggestedPortA = 'E 220V';
      suggestedPortB = ['S 220V (1)', 'S 220V (2)', 'S 220V (3)', 'S 220V (4)'].find(p => !usedPortsB.includes(p)) || 'S 220V (1)';
    } else if (isElectricConn) {
      if (isElecA && !isElecB) {
        suggestedPortA = (nodeA.availablePorts || []).find(p => (p.startsWith('S ') || p.startsWith('Toma')) && !usedPortsA.includes(p)) || 'S 220V';
        suggestedPortB = 'E 220V';
      } else if (!isElecA && isElecB) {
        suggestedPortA = 'E 220V';
        suggestedPortB = (nodeB.availablePorts || []).find(p => (p.startsWith('S ') || p.startsWith('Toma')) && !usedPortsB.includes(p)) || 'S 220V';
      }
    } else if (nodeA.type.startsWith('switch') && !nodeB.type.startsWith('switch')) {
      suggestedPortA = (nodeA.availablePorts || []).find(p => p.startsWith('Boca') && !usedPortsA.includes(p)) || availA[0] || 'Boca 1';
    } else if (!nodeA.type.startsWith('switch') && nodeB.type.startsWith('switch')) {
      suggestedPortB = (nodeB.availablePorts || []).find(p => p.startsWith('Boca') && !usedPortsB.includes(p)) || availB[0] || 'Boca 1';
    }

    dom.cablePortA.value = suggestedPortA;
    dom.cablePortB.value = suggestedPortB;

    // Renderizar chips de selección rápida con 1 clic
    const renderQuickChips = (containerId, inputEl, node, usedList) => {
      const container = document.getElementById(containerId);
      if (!container) return;
      container.innerHTML = '';
      const ports = (node.availablePorts || []).slice(0, 10);
      ports.forEach(p => {
        const isUsed = usedList.includes(p);
        const isFib = p.toLowerCase().includes('fibra') || p.toLowerCase().includes('sfp');
        const isPwr = p.toLowerCase().includes('220') || p.toLowerCase().includes('ups') || p.toLowerCase().includes('salida') || p.toLowerCase().includes('carga') || p.toLowerCase().includes('canal');
        const chip = document.createElement('span');
        chip.className = `quick-port-chip ${isFib ? 'is-fiber' : (isPwr ? 'is-power' : '')}`;
        chip.textContent = p;
        chip.title = isUsed ? 'Borne / Boca actualmente ocupada' : 'Clic para seleccionar';
        chip.addEventListener('click', () => {
          inputEl.value = p;
          autoAdjustCableType();
        });
        container.appendChild(chip);
      });
    };

    renderQuickChips('quick-ports-a', dom.cablePortA, nodeA, usedPortsA);
    renderQuickChips('quick-ports-b', dom.cablePortB, nodeB, usedPortsB);

    // Cargar datalists con opciones libres primero
    dom.portsListA.innerHTML = '';
    const sortedPortsA = [...(nodeA.availablePorts || [])].sort((a, b) => {
      const aUsed = usedPortsA.includes(a);
      const bUsed = usedPortsA.includes(b);
      return aUsed === bUsed ? 0 : aUsed ? 1 : -1;
    });
    sortedPortsA.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p;
      dom.portsListA.appendChild(opt);
    });

    dom.portsListB.innerHTML = '';
    const sortedPortsB = [...(nodeB.availablePorts || [])].sort((a, b) => {
      const aUsed = usedPortsB.includes(a);
      const bUsed = usedPortsB.includes(b);
      return aUsed === bUsed ? 0 : aUsed ? 1 : -1;
    });
    sortedPortsB.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p;
      dom.portsListB.appendChild(opt);
    });

    // Detectar automáticamente el tipo de cable idóneo (Rojo por defecto para electricidad)
    const autoAdjustCableType = () => {
      const pA = (dom.cablePortA.value || '').toLowerCase();
      const pB = (dom.cablePortB.value || '').toLowerCase();

      const isPower = isElectricConn ||
                      pA.includes('220v') || pB.includes('220v') ||
                      pA.includes('ups') || pB.includes('ups') ||
                      pA.includes('salida') || pB.includes('salida') ||
                      pA.includes('carga') || pB.includes('carga') ||
                      pA.includes('aliment') || pB.includes('aliment') ||
                      pA.includes('canal') || pB.includes('canal') ||
                      pA.includes('línea') || pB.includes('linea');

      if (isPower) {
        dom.cableTypeSelect.value = 'power';
      } else if (pA.includes('fibra') || pA.includes('sfp') || pB.includes('fibra') || pB.includes('sfp')) {
        dom.cableTypeSelect.value = 'fiber';
      } else if (pA.includes('ser') || pB.includes('ser') || nodeA.type === 'cloud' || nodeB.type === 'cloud') {
        dom.cableTypeSelect.value = 'serial';
      } else if (nodeA.type === 'ap' || nodeB.type === 'ap' || pA.includes('wi-fi') || pB.includes('wi-fi')) {
        dom.cableTypeSelect.value = 'wireless';
      } else {
        dom.cableTypeSelect.value = 'ethernet';
      }
    };

    autoAdjustCableType();

    dom.cableNetworkTag.value = '';
    dom.modalCable.classList.add('open');
    dom.cablePortA.focus();
  }

export function closeCableModal() {
    dom.modalCable.classList.remove('open');
    pendingConnection = null;
  }

  // Normalizador intuitivo de nombres de bocas
export function normalizePortName(input, defaultPrefix = 'Boca') {
    if (!input) return `${defaultPrefix} 1`;
    let str = input.trim();

    // Solo número: ej "1" -> respetar solo el número ("1") tal como lo escribió el usuario
    if (/^\d+$/.test(str)) {
      return str;
    }

    const lower = str.toLowerCase();
    // Normalización inteligente de Entradas Eléctricas a formato compacto "E 220V"
    if (lower === 'e' || lower === 'entrada' || lower === 'in' || lower === '220' || lower === '220v' || lower === 'e 220' || lower === 'e 220v' || lower === 'e220' || lower === 'e220v' || lower === 'alimentacion' || lower === 'alimentación' || lower === 'alimentación 220v' || lower === 'alimentacion 220v' || lower === 'cargador 220v') {
      return 'E 220V';
    }

    // Normalización inteligente de Salidas Eléctricas a formato compacto "S 220V"
    if (lower === 's' || lower === 'salida' || lower === 'out' || lower === 's 220' || lower === 's 220v' || lower === 's220' || lower === 's220v' || lower === 'salida 220v' || lower === 'salida carga') {
      return 'S 220V';
    }

    // Salidas numeradas: s1, s 1, salida 1, salida 1 (ups) -> S 220V (1)
    const sUpsMatch = str.match(/^s(?:alida)?\s*(\d+)(?:\s*\(ups\))?$/i);
    if (sUpsMatch) {
      return `S 220V (${sUpsMatch[1]})`;
    }

    // Entradas numeradas: e1, e 1, entrada 1 -> E 220V (1)
    const eUpsMatch = str.match(/^e(?:ntrada)?\s*(\d+)$/i);
    if (eUpsMatch) {
      return `E 220V (${eUpsMatch[1]})`;
    }

    // Boca 1, boca1, b 1, b1
    const bMatch = str.match(/^b(?:oca)?\s*(\d+)$/i);
    if (bMatch) {
      return `Boca ${bMatch[1]}`;
    }

    // Eth 1, eth1
    const ethMatch = str.match(/^eth\s*(\d+)$/i);
    if (ethMatch) {
      return `Eth ${ethMatch[1]}`;
    }

    // Fibra 1, fibra1, f 1, f1, sfp 1, sfp1
    const fMatch = str.match(/^(?:fibra|fiber|f|sfp)\s*(\d+)$/i);
    if (fMatch) {
      return `Fibra ${fMatch[1]}`;
    }

    // WAN 1, wan1, w 1, w1
    const wMatch = str.match(/^w(?:an)?\s*(\d+)$/i);
    if (wMatch) {
      return `WAN ${wMatch[1]}`;
    }

    return str;
  }

export function setupModalEvents() {
    setupSearchEvents();
    document.getElementById('btn-close-cable-modal').addEventListener('click', closeCableModal);
    document.getElementById('btn-cancel-cable').addEventListener('click', closeCableModal);

    // Ajuste dinámico de tipo de cable al escribir o cambiar boca
    const autoAdjustCableType = () => {
      const pA = (dom.cablePortA.value || '').toLowerCase();
      const pB = (dom.cablePortB.value || '').toLowerCase();
      const isPower = pA.startsWith('e ') || pB.startsWith('e ') ||
                      pA.startsWith('s ') || pB.startsWith('s ') ||
                      pA.includes('220') || pB.includes('220') ||
                      pA.includes('ups') || pB.includes('ups') ||
                      pA.includes('salida') || pB.includes('salida') ||
                      pA.includes('carga') || pB.includes('carga') ||
                      pA.includes('aliment') || pB.includes('aliment') ||
                      pA.includes('línea') || pB.includes('linea') ||
                      pA.includes('canal') || pB.includes('canal');
      if (isPower) {
        dom.cableTypeSelect.value = 'power';
      } else if (pA.includes('fibra') || pA.includes('sfp') || pB.includes('fibra') || pB.includes('sfp')) {
        dom.cableTypeSelect.value = 'fiber';
      } else if (pA.includes('ser') || pB.includes('ser')) {
        dom.cableTypeSelect.value = 'serial';
      }
    };
    dom.cablePortA.addEventListener('input', autoAdjustCableType);
    dom.cablePortB.addEventListener('input', autoAdjustCableType);

    document.getElementById('btn-save-cable').addEventListener('click', () => {
      if (!pendingConnection) return;
      const nodeA = state.nodes.find(n => n.id === pendingConnection.fromNodeId);
      const nodeB = state.nodes.find(n => n.id === pendingConnection.toNodeId);
      const isElecA = nodeA && (['ups', 'termica', 'transfer'].includes(nodeA.type) || (nodeA.type && nodeA.type.startsWith('canal_tension')));
      const isElecB = nodeB && (['ups', 'termica', 'transfer'].includes(nodeB.type) || (nodeB.type && nodeB.type.startsWith('canal_tension')));
      const defPrefixA = (nodeA && (nodeA.type === 'router' || nodeA.type.startsWith('router_'))) ? 'Eth' : (isElecA ? 'Borne' : 'Boca');
      const defPrefixB = (nodeB && (nodeB.type === 'router' || nodeB.type.startsWith('router_'))) ? 'Eth' : (isElecB ? 'Borne' : 'Boca');

      const portA = normalizePortName(dom.cablePortA.value, defPrefixA);
      const portB = normalizePortName(dom.cablePortB.value, defPrefixB);
      const cableType = dom.cableTypeSelect.value;
      const tag = dom.cableNetworkTag.value.trim();

      createConnection(
        pendingConnection.fromNodeId,
        pendingConnection.toNodeId,
        portA,
        portB,
        cableType,
        tag
      );
      closeCableModal();
    });

    // Modal de atajos
    document.getElementById('btn-shortcuts').addEventListener('click', () => {
      dom.modalShortcuts.classList.add('open');
    });
    document.getElementById('btn-close-shortcuts-modal').addEventListener('click', () => {
      dom.modalShortcuts.classList.remove('open');
    });
    document.getElementById('btn-dismiss-shortcuts').addEventListener('click', () => {
      dom.modalShortcuts.classList.remove('open');
    });

    // Modal de exportación (Blanco y Negro / Modo Oscuro / PNG / SVG)
    document.getElementById('btn-close-export-modal').addEventListener('click', () => {
      dom.modalExport.classList.remove('open');
    });
    document.getElementById('btn-cancel-export').addEventListener('click', () => {
      dom.modalExport.classList.remove('open');
    });

    // Interactividad en tarjetas de selección de estilo de exportación
    const exportThemeCards = document.querySelectorAll('.export-theme-card');
    exportThemeCards.forEach(card => {
      card.addEventListener('click', () => {
        const radio = card.querySelector('input[name="export-theme"]');
        if (radio) {
          radio.checked = true;
          exportThemeCards.forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
        }
      });
    });

    // Selector de Formato de Exportación (PDF por defecto, SVG, PNG)
    const inpExportFormat = document.getElementById('inp-export-format');
    const lblConfirmExportText = document.getElementById('lbl-confirm-export-text');

    const updateFormatUI = (fmt) => {
      document.querySelectorAll('.export-format-pill').forEach(b => {
        b.classList.toggle('active', b.dataset.format === fmt);
      });
      if (inpExportFormat) inpExportFormat.value = fmt;
      const groupExportQuality = document.getElementById('group-export-quality');
      if (groupExportQuality) {
        groupExportQuality.style.display = (fmt === 'svg') ? 'none' : 'block';
      }
      updateExportPagingUI();
    };

    document.querySelectorAll('.export-format-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        updateFormatUI(btn.dataset.format || 'pdf');
      });
    });

    // Selector de Calidad / Escala de Exportación (2x, 3x 4K, 4x 300DPI)
    const inpExportScaleRes = document.getElementById('inp-export-scale-res');
    const hintExportQuality = document.getElementById('hint-export-quality');
    document.querySelectorAll('#wrap-export-quality-pills .export-quality-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#wrap-export-quality-pills .export-quality-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const scaleVal = btn.dataset.scale || '3';
        if (inpExportScaleRes) inpExportScaleRes.value = scaleVal;
        if (hintExportQuality) {
          if (scaleVal === '2') {
            hintExportQuality.textContent = 'Alta Definición (2x): Renderizado FHD balanceado y liviano.';
          } else if (scaleVal === '3') {
            hintExportQuality.textContent = 'Ultra HD 4K (3x): Máxima nitidez recomendada con trazos y tipografías cristalinas.';
          } else if (scaleVal === '4') {
            hintExportQuality.textContent = 'Impresión 300 DPI (4x): Resolución profesional extrema para ploteo y gigantografías.';
          }
        }
      });
    });

    // Selector de Zoom de Impresión (100%, 125%, 150%)
    const inpExportElemScale = document.getElementById('inp-export-elem-scale');
    const hintExportElemScale = document.getElementById('hint-export-elem-scale');
    document.querySelectorAll('#wrap-export-elem-size-pills .export-quality-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#wrap-export-elem-size-pills .export-quality-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const elemScaleVal = btn.dataset.elemScale || '1.25';
        if (inpExportElemScale) inpExportElemScale.value = elemScaleVal;
        if (hintExportElemScale) {
          if (elemScaleVal === '1') {
            hintExportElemScale.textContent = 'Normal (100%): Tamaño proporcional estándar sin aumentar hojas.';
          } else if (elemScaleVal === '1.25') {
            hintExportElemScale.textContent = 'Grande (Zoom 125%): Aumenta 25% el plano entero y agrega más hojas si es necesario sin deformar el diseño.';
          } else if (elemScaleVal === '1.5') {
            hintExportElemScale.textContent = 'Muy Grande (Zoom 150%): Aumenta 50% el plano entero para máxima legibilidad y detalle.';
          }
        }
        updateExportPagingUI();
      });
    });

    // Selector de Distribución de Páginas (Paginación: 1 Página vs Mosaico Multi-página)
    document.querySelectorAll('#wrap-export-paging-pills button').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#wrap-export-paging-pills button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const pagingVal = btn.dataset.paging || 'single';
        const inpPaging = document.getElementById('inp-export-paging');
        if (inpPaging) inpPaging.value = pagingVal;
        updateExportPagingUI();
      });
    });

    // Selector de Capa Técnica para Exportación / Impresión
    const layerNamesMap = {
      current: 'Capa en pantalla',
      logical: 'Solo Lógico',
      physical: 'Solo Físico',
      power: 'Solo Electricidad',
      all: 'Plano Maestro (Todas)'
    };
    document.querySelectorAll('#wrap-export-layer-pills .export-layer-card').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#wrap-export-layer-pills .export-layer-card').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const layerVal = btn.dataset.exportLayer || 'current';
        const inpExportLayer = document.getElementById('inp-export-layer');
        if (inpExportLayer) inpExportLayer.value = layerVal;
        const badgeSummary = document.getElementById('badge-export-layer-summary');
        if (badgeSummary) {
          badgeSummary.textContent = layerNamesMap[layerVal] || 'Capa en pantalla';
        }
      });
    });

    // Toggle de campos para el Cuadro de Rotulación Técnico (Title Block)
    const chkExportTitleBlock = document.getElementById('chk-export-title-block');
    const wrapTitleBlockFields = document.getElementById('wrap-export-title-block-fields');
    if (chkExportTitleBlock && wrapTitleBlockFields) {
      chkExportTitleBlock.addEventListener('change', () => {
        wrapTitleBlockFields.style.display = chkExportTitleBlock.checked ? 'block' : 'none';
      });
    }

    const selMosaicGrid = document.getElementById('sel-mosaic-grid');
    if (selMosaicGrid) {
      selMosaicGrid.addEventListener('change', () => {
        updateExportPagingUI();
      });
    }

    document.getElementById('btn-confirm-export').addEventListener('click', async () => {
      const btnConfirm = document.getElementById('btn-confirm-export');
      const origBtnHtml = btnConfirm.innerHTML;

      const selectedTheme = document.querySelector('input[name="export-theme"]:checked')?.value || 'monochrome';
      const includeGrid = document.getElementById('chk-export-grid')?.checked || false;
      const format = inpExportFormat?.value || 'pdf';
      const includeTitleBlock = chkExportTitleBlock?.checked || false;
      const exportScaleRes = parseInt(document.getElementById('inp-export-scale-res')?.value || '3', 10) || 3;
      const exportElemScale = parseFloat(document.getElementById('inp-export-elem-scale')?.value || '1.25') || 1.25;
      const exportPaging = document.getElementById('inp-export-paging')?.value || 'single';
      const mosaicGridChoice = document.getElementById('sel-mosaic-grid')?.value || 'auto';

      const authorVal = (document.getElementById('inp-export-author')?.value || '').trim();
      const companyVal = (document.getElementById('inp-export-company')?.value || '').trim() || 'Uinfor';
      const versionVal = (document.getElementById('inp-export-version')?.value || '').trim() || 'v1.0';
      const scaleVal = (document.getElementById('inp-export-scale')?.value || '').trim() || '1:1';

      try {
        if (authorVal) localStorage.setItem('nettopology_author', authorVal);
        if (companyVal) localStorage.setItem('nettopology_company', companyVal);
        if (scaleVal) localStorage.setItem('nettopology_scale', scaleVal);
      } catch (e) {}

      const currSheet = getCurrentSheet();
      const titleBlockData = {
        project: state.projectName || 'Topología de Red',
        author: authorVal || 'Ingeniería de Red',
        company: companyVal,
        version: versionVal,
        date: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        sheet: currSheet?.name || 'Hoja 1',
        scale: scaleVal
      };

      // Estado de carga con spinner y mensaje dinámico
      btnConfirm.disabled = true;
      btnConfirm.innerHTML = '<span class="export-spinner"></span> <span id="lbl-confirm-export-text">Generando plano...</span>';
      await new Promise(r => setTimeout(r, 40));

      const onProgress = (cur, tot) => {
        const lbl = document.getElementById('lbl-confirm-export-text');
        if (lbl) lbl.textContent = `Procesando hoja ${cur} de ${tot}...`;
      };

      const exportChosenLayer = document.getElementById('inp-export-layer')?.value || 'current';
      const origActiveLayer = state.activeLayer;

      try {
        if (exportChosenLayer !== 'current') {
          state.activeLayer = exportChosenLayer;
          renderConnections();
        }

        if (format === 'svg') {
          exportDiagramSvg(selectedTheme, includeGrid, includeTitleBlock, titleBlockData, exportElemScale);
        } else if (format === 'png') {
          await exportDiagramPng(selectedTheme, includeGrid, includeTitleBlock, titleBlockData, exportScaleRes, exportElemScale);
        } else {
          await exportDiagramPdf(selectedTheme, includeGrid, includeTitleBlock, titleBlockData, exportScaleRes, exportPaging, mosaicGridChoice, exportElemScale, onProgress);
        }
      } catch (err) {
        console.error('Error durante la exportación:', err);
      } finally {
        if (exportChosenLayer !== 'current') {
          state.activeLayer = origActiveLayer;
          renderConnections();
        }
        btnConfirm.disabled = false;
        btnConfirm.innerHTML = origBtnHtml;
        dom.modalExport.classList.remove('open');
      }
    });

    // Botón Imprimir Directo del Sistema (window.print)
    const btnDirectPrint = document.getElementById('btn-direct-print');
    if (btnDirectPrint) {
      btnDirectPrint.addEventListener('click', () => {
        dom.modalExport.classList.remove('open');
        setTimeout(() => {
          window.print();
        }, 200);
      });
    }

    // Modal Gestor de Proyectos
    if (dom.btnCloseProjectsModal) {
      dom.btnCloseProjectsModal.addEventListener('click', closeProjectsModal);
    }
    if (dom.btnCloseProjectsBottom) {
      dom.btnCloseProjectsBottom.addEventListener('click', closeProjectsModal);
    }
    if (dom.btnCreateProjectSubmit) {
      dom.btnCreateProjectSubmit.addEventListener('click', () => {
        const val = dom.inputNewProjectName.value.trim();
        createNewProject(val || 'Nuevo Proyecto');
      });
    }
    if (dom.inputNewProjectName) {
      dom.inputNewProjectName.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const val = dom.inputNewProjectName.value.trim();
          createNewProject(val || 'Nuevo Proyecto');
        }
      });
    }
    if (dom.btnImportProjectModal) {
      dom.btnImportProjectModal.addEventListener('click', () => {
        dom.fileInput.click();
      });
    }

    // Modal Inventario IP y Puertos
    if (dom.btnCloseIpInventory) {
      dom.btnCloseIpInventory.addEventListener('click', closeIpInventoryModal);
    }
    if (dom.btnCloseIpInventoryBottom) {
      dom.btnCloseIpInventoryBottom.addEventListener('click', closeIpInventoryModal);
    }
    if (dom.btnExportIpCsv) {
      dom.btnExportIpCsv.addEventListener('click', exportIpInventoryCsv);
    }
    if (dom.btnCopyIpTable) {
      dom.btnCopyIpTable.addEventListener('click', copyIpInventoryToClipboard);
    }
    if (dom.ipTableFilter) {
      dom.ipTableFilter.addEventListener('input', (e) => {
        renderIpInventoryTable(e.target.value);
      });
    }

    // Cerrar modales con clic fuera
    [dom.modalCable, dom.modalShortcuts, dom.modalExport, dom.modalProjects, dom.modalSheetConfig, dom.modalSearch, dom.modalIpInventory, dom.modalTopologyAudit].forEach(modal => {
      if (modal) {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) {
            modal.classList.remove('open');
            if (modal === dom.modalSearch) closeQuickSearchModal();
            if (modal === dom.modalIpInventory) closeIpInventoryModal();
            if (modal === dom.modalTopologyAudit) closeTopologyAuditModal();
          }
        });
      }
    });
  }

  // ==========================================================================
  // INVENTARIO DE DIRECCIONAMIENTO IP Y PUERTOS
  // ==========================================================================
export function openIpInventoryModal() {
    if (!dom.modalIpInventory) return;
    closeAllDropdowns();
    dom.modalIpInventory.classList.add('open');
    if (dom.ipTableFilter) {
      dom.ipTableFilter.value = '';
      setTimeout(() => dom.ipTableFilter.focus(), 50);
    }
    renderIpInventoryTable('');
  }

export function closeIpInventoryModal() {
    if (!dom.modalIpInventory) return;
    dom.modalIpInventory.classList.remove('open');
  }

export function getIpInventoryRows() {
    const rows = [];
    const ipNodeMap = {}; // ip -> Set de node IDs para detectar duplicados reales entre dispositivos

    // 1. Registrar todas las IPs existentes en el diagrama para detectar duplicados entre equipos distintos
    state.nodes.forEach(node => {
      const nodeIp = (node.ip || '').trim();
      if (nodeIp) {
        if (!ipNodeMap[nodeIp]) ipNodeMap[nodeIp] = new Set();
        ipNodeMap[nodeIp].add(node.id);
      }
      if (Array.isArray(node.ports)) {
        node.ports.forEach(p => {
          const pIp = (p.ip || '').trim();
          if (pIp) {
            if (!ipNodeMap[pIp]) ipNodeMap[pIp] = new Set();
            ipNodeMap[pIp].add(node.id);
          }
        });
      }
    });

    // 2. Construir filas de inventario: exactamente 1 fila consolidada por equipo de la topología
    state.nodes.forEach(node => {
      const nodeName = node.customName || node.name || 'Dispositivo';
      const nodeType = DEVICE_METADATA[node.type]?.label || node.type;
      const nodeIp = (node.ip || '').trim();
      const nodeMask = node.mask || '255.255.255.0 (/24)';
      const nodeGw = node.gateway || '-';

      // Conexiones de este dispositivo en el lienzo
      const conns = state.connections.filter(c => c.fromNodeId === node.id || c.toNodeId === node.id);

      // Si tuviera array explícito de puertos detallados con IPs distintas (ej. router con IP por puerto)
      if (Array.isArray(node.ports) && node.ports.length > 0 && node.ports.some(p => p.ip && p.ip.trim() !== nodeIp)) {
        node.ports.forEach(port => {
          const portIp = (port.ip || nodeIp).trim();
          const conn = conns.find(c => 
            (c.fromNodeId === node.id && c.fromPort === port.name) ||
            (c.toNodeId === node.id && c.toPort === port.name)
          );

          let remoteText = 'Libre / Sin conectar';
          let isConnected = false;
          if (conn) {
            isConnected = true;
            const isFrom = conn.fromNodeId === node.id;
            const remoteNodeId = isFrom ? conn.toNodeId : conn.fromNodeId;
            const remotePortName = isFrom ? conn.toPort : conn.fromPort;
            const remoteNode = state.nodes.find(n => n.id === remoteNodeId);
            const remoteNodeName = remoteNode ? (remoteNode.customName || remoteNode.name) : 'Equipo';
            remoteText = `${remoteNodeName} (${remotePortName || 'Puerto'})`;
          }

          rows.push({
            nodeId: node.id,
            nodeName: nodeName,
            nodeType: nodeType,
            portName: port.name || 'Port',
            ip: portIp,
            mask: port.subnetMask || nodeMask,
            gateway: port.gateway || nodeGw,
            remoteText: remoteText,
            fullRemoteText: remoteText,
            connsCount: 1,
            isConnected: isConnected,
            isConflict: Boolean(portIp && ipNodeMap[portIp] && ipNodeMap[portIp].size > 1)
          });
        });
        return;
      }

      // Mapear cada conexión a un formato estructurado
      const connDetails = conns.map(conn => {
        const isFrom = conn.fromNodeId === node.id;
        const myPort = (isFrom ? conn.fromPort : conn.toPort) || 'Enlace';
        const remoteNodeId = isFrom ? conn.toNodeId : conn.fromNodeId;
        const remotePortName = (isFrom ? conn.toPort : conn.fromPort) || 'Puerto';
        const remoteNode = state.nodes.find(n => n.id === remoteNodeId);
        const remoteNodeName = remoteNode ? (remoteNode.customName || remoteNode.name) : 'Equipo';
        return {
          myPort,
          remoteNodeId,
          remoteNodeName,
          remotePortName,
          summary: `${myPort} ➔ ${remoteNodeName} (${remotePortName})`
        };
      });

      let portName = '';
      let remoteText = '';
      let fullRemoteText = '';
      let isConnected = false;

      if (conns.length === 0) {
        // Dispositivo sin cables conectados aún
        portName = (node.availablePorts && node.availablePorts[0]) || 'Eth 1';
        remoteText = 'Libre / Sin conectar';
        fullRemoteText = 'Sin conexiones activas';
        isConnected = false;
      } else if (conns.length === 1) {
        // Un solo enlace activo
        const first = connDetails[0];
        portName = first.myPort;
        remoteText = `${first.remoteNodeName} (${first.remotePortName})`;
        fullRemoteText = first.summary;
        isConnected = true;
      } else {
        // Múltiples conexiones (Switch, Hub, Router multi-interfaz)
        const isSwitchOrHub = (node.type && node.type.startsWith('switch')) || node.type === 'hub';
        if (isSwitchOrHub) {
          portName = `VLAN / Gestión (${conns.length} bocas en uso)`;
        } else {
          portName = `${conns.length} interfaces activas`;
        }

        const remoteNames = [...new Set(connDetails.map(d => d.remoteNodeName))];
        if (remoteNames.length <= 2) {
          remoteText = `${remoteNames.join(', ')} (${conns.length} enlaces)`;
        } else if (remoteNames.length === 3) {
          remoteText = remoteNames.join(', ');
        } else {
          remoteText = `${remoteNames.slice(0, 2).join(', ')} y ${remoteNames.length - 2} más (${conns.length} enlaces)`;
        }

        fullRemoteText = connDetails.map(d => d.summary).join('\n');
        isConnected = true;
      }

      rows.push({
        nodeId: node.id,
        nodeName: nodeName,
        nodeType: nodeType,
        portName: portName,
        ip: nodeIp,
        mask: nodeMask,
        gateway: nodeGw,
        remoteText: remoteText,
        fullRemoteText: fullRemoteText,
        connsCount: conns.length,
        isConnected: isConnected,
        isConflict: Boolean(nodeIp && ipNodeMap[nodeIp] && ipNodeMap[nodeIp].size > 1)
      });
    });

    return { rows, ipNodeMap };
  }

export function renderIpInventoryTable(filterQuery) {
    if (!dom.ipInventoryTbody) return;
    const { rows, ipNodeMap } = getIpInventoryRows();
    const q = (filterQuery || '').toLowerCase().trim();

    const filtered = rows.filter(r => {
      if (!q) return true;
      return r.nodeName.toLowerCase().includes(q) ||
             r.nodeType.toLowerCase().includes(q) ||
             r.portName.toLowerCase().includes(q) ||
             r.ip.toLowerCase().includes(q) ||
             r.mask.toLowerCase().includes(q) ||
             r.gateway.toLowerCase().includes(q) ||
             r.remoteText.toLowerCase().includes(q) ||
             (r.fullRemoteText && r.fullRemoteText.toLowerCase().includes(q));
    });

    // Estadísticas consolidadas por equipo
    const totalDevices = rows.length;
    const assignedIps = rows.filter(r => r.ip).length;
    const conflicts = Object.keys(ipNodeMap).filter(ip => ipNodeMap[ip].size > 1).length;

    if (dom.ipTableStats) {
      dom.ipTableStats.innerHTML = `
        <span class="ip-stat-pill"><b>${totalDevices}</b> equipos</span>
        <span class="ip-stat-pill"><b>${assignedIps}</b> con IP</span>
        ${conflicts > 0
          ? `<span class="ip-conflict-badge">⚠️ ${conflicts} conflicto(s) IP</span>`
          : `<span class="ip-status-pill ip-status-connected">✓ Sin conflictos</span>`}
      `;
    }

    dom.ipInventoryTbody.innerHTML = '';

    if (filtered.length === 0) {
      dom.ipInventoryTbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-muted);">
            No se encontraron equipos ni interfaces que coincidan con "${escapeHtml(q)}".
          </td>
        </tr>
      `;
      return;
    }

    filtered.forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><b style="color: #ffffff;">${escapeHtml(row.nodeName)}</b></td>
        <td><span class="badge-tag">${escapeHtml(row.nodeType)}</span></td>
        <td class="ip-cell-mono">
          ${row.ip ? `<span>${escapeHtml(row.ip)}</span>` : '<span class="ip-status-pill ip-status-free">Sin IP</span>'}
          ${row.isConflict ? '<span class="ip-conflict-badge">⚠️ Duplicada</span>' : ''}
        </td>
        <td class="ip-cell-mono" style="color: var(--text-secondary);">${escapeHtml(row.mask)}</td>
        <td class="ip-cell-mono" style="color: var(--text-secondary);">${escapeHtml(row.gateway)}</td>
        <td class="ip-cell-mono" style="color: var(--accent-cyan);">${escapeHtml(row.portName)}</td>
        <td>
          <span class="ip-status-pill ${row.isConnected ? 'ip-status-connected' : 'ip-status-free'}"
                title="${escapeHtml(row.fullRemoteText || row.remoteText)}"
                style="${row.connsCount > 1 ? 'cursor: help; text-decoration: underline dotted;' : ''}">
            ${escapeHtml(row.remoteText)}
          </span>
        </td>
        <td style="text-align: center;">
          <button type="button" class="btn btn-icon-only btn-locate-node" title="Localizar y ver en el lienzo" style="width: 26px; height: 26px; padding: 0;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </td>
      `;

      tr.querySelector('.btn-locate-node').addEventListener('click', () => {
        closeIpInventoryModal();
        panAndHighlightNode(row.nodeId);
      });

      dom.ipInventoryTbody.appendChild(tr);
    });
  }

export function formatCsvCell(val, delimiter = ';') {
    if (val === null || val === undefined) return '';
    const str = String(val).trim();
    if (str.includes(delimiter) || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

export function exportIpInventoryCsv() {
    const { rows } = getIpInventoryRows();
    if (rows.length === 0) {
      alert('No hay equipos en la topología para exportar.');
      return;
    }

    const delimiter = ';';
    const headers = [
      'Dispositivo',
      'Tipo de Equipo',
      'Dirección IP',
      'Máscara / Prefijo',
      'Gateway / VLAN',
      'Interfaz / Puerto',
      'Conectado con (Enlaces)',
      'Estado IP'
    ];

    const csvLines = [headers.map(h => formatCsvCell(h, delimiter)).join(delimiter)];

    rows.forEach(r => {
      const ipVal = r.ip || '(Sin asignar)';
      const gwVal = (r.gateway && r.gateway !== '-') ? r.gateway : '-';
      const statusVal = r.isConflict ? 'CONFLICTO: IP DUPLICADA' : (r.ip ? 'Asignada' : 'Sin IP');

      let connVal = 'Sin conexión';
      if (r.connsCount === 1) {
        connVal = r.remoteText;
      } else if (r.connsCount > 1) {
        connVal = r.fullRemoteText
          ? r.fullRemoteText.replace(/➔/g, ':').replace(/\n/g, ' | ').replace(/\s+/g, ' ').trim()
          : r.remoteText;
      }

      const lineValues = [
        formatCsvCell(r.nodeName, delimiter),
        formatCsvCell(r.nodeType, delimiter),
        formatCsvCell(ipVal, delimiter),
        formatCsvCell(r.mask, delimiter),
        formatCsvCell(gwVal, delimiter),
        formatCsvCell(r.portName, delimiter),
        formatCsvCell(connVal, delimiter),
        formatCsvCell(statusVal, delimiter)
      ];

      csvLines.push(lineValues.join(delimiter));
    });

    // \uFEFF (BOM UTF-8) + sep=; garantizan que Excel separe automáticamente cada columna en Windows/Mac
    const csvContent = '\uFEFFsep=;\r\n' + csvLines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeProjectName = (state.currentProjectName || 'Red').replace(/[^a-zA-Z0-9_-]/g, '_');
    a.download = `${safeProjectName}_Plan_Direccionamiento_IP.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

export function copyIpInventoryToClipboard() {
    const { rows } = getIpInventoryRows();
    if (rows.length === 0) {
      alert('No hay equipos para copiar.');
      return;
    }

    const headers = [
      'Dispositivo',
      'Tipo de Equipo',
      'Dirección IP',
      'Máscara / Prefijo',
      'Gateway / VLAN',
      'Interfaz / Puerto',
      'Conectado con (Enlaces)',
      'Estado IP'
    ];

    const lines = [headers.join('\t')];

    rows.forEach(r => {
      const ipVal = r.ip || '(Sin asignar)';
      const gwVal = (r.gateway && r.gateway !== '-') ? r.gateway : '-';
      const statusVal = r.isConflict ? 'CONFLICTO: IP DUPLICADA' : (r.ip ? 'Asignada' : 'Sin IP');

      let connVal = 'Sin conexión';
      if (r.connsCount === 1) {
        connVal = r.remoteText;
      } else if (r.connsCount > 1) {
        connVal = r.fullRemoteText
          ? r.fullRemoteText.replace(/➔/g, ':').replace(/\n/g, ' | ').replace(/\s+/g, ' ').trim()
          : r.remoteText;
      }

      lines.push([
        r.nodeName,
        r.nodeType,
        ipVal,
        r.mask,
        gwVal,
        r.portName,
        connVal,
        statusVal
      ].join('\t'));
    });

    const textToCopy = lines.join('\r\n');
    navigator.clipboard.writeText(textToCopy).then(() => {
      if (dom.btnCopyIpTable) {
        const originalHtml = dom.btnCopyIpTable.innerHTML;
        dom.btnCopyIpTable.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          <span style="color: #10b981; font-weight: 600;">¡Copiado!</span>
        `;
        setTimeout(() => {
          dom.btnCopyIpTable.innerHTML = originalHtml;
        }, 2200);
      }
    }).catch(err => {
      console.warn('Error al copiar al portapapeles:', err);
      alert('No se pudo copiar automáticamente. Puedes usar el botón Exportar a Excel (.CSV).');
    });
  }


// Registrar métodos en el contexto global de aplicación
app.openCableConfigModal = openCableConfigModal;
app.closeCableModal = closeCableModal;
app.normalizePortName = normalizePortName;
app.setupModalEvents = setupModalEvents;
app.openIpInventoryModal = openIpInventoryModal;
app.closeIpInventoryModal = closeIpInventoryModal;
app.getIpInventoryRows = getIpInventoryRows;
app.renderIpInventoryTable = renderIpInventoryTable;
app.formatCsvCell = formatCsvCell;
app.exportIpInventoryCsv = exportIpInventoryCsv;
app.copyIpInventoryToClipboard = copyIpInventoryToClipboard;
