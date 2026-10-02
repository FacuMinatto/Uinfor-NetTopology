/**
 * NetTopology - Módulo src/config/defaultTopology.js
 */

import { state, dom } from '../state/store.js';
import { app } from '../core/appContext.js';
import { DEVICE_ICONS, DEVICE_ICONS_LIGHT, DEVICE_METADATA, CABLE_TYPES, getDeviceIcon, generateSwitchPorts, generateRouterPorts } from '../config/icons.js';
import { STORAGE_PROJECTS_KEY, STORAGE_ACTIVE_ID_KEY, STORAGE_LEGACY_KEY, SHEET_PRESETS, ZONE_COLOR_PALETTES, MAX_HISTORY_STEPS, DEFAULT_GRID_SIZE } from '../config/constants.js';
import { escapeHtml, incrementIp, formatDateForFile, clamp, generateId } from '../utils/helpers.js';
import { snapNodeCoordinates, createNode } from '../core/nodes.js';
import { createConnection, renderConnections } from '../core/cables.js';
import { deselectAll, renderInspector } from '../ui/inspector.js';
import { createZone } from '../core/zones.js';
import { saveState } from '../storage/db.js';



  // ==========================================================================
  // TOPOLOGÍA DE EJEMPLO REALISTA
  // ==========================================================================
export function loadDefaultTopology() {
    state.nodes = [];
    state.connections = [];
    state.zones = [];

    if (dom.nodesLayer) dom.nodesLayer.innerHTML = '';
    if (dom.cablesGroup) dom.cablesGroup.innerHTML = '';
    if (dom.labelsLayer) dom.labelsLayer.innerHTML = '';
    if (dom.zonesLayer) dom.zonesLayer.innerHTML = '';

    // Nube WAN
    const cloud = createNode('cloud', 100, 160, {
      name: 'INTERNET_ISP',
      ip: '200.45.12.1',
      mask: '/30',
      availablePorts: ['Internet', 'Fibra 1']
    });

    // Firewall
    const fw = createNode('firewall', 300, 160, {
      name: 'FW-FORTINET',
      ip: '192.168.1.1',
      mask: '255.255.255.0',
      availablePorts: ['WAN 1', 'LAN 1', 'LAN 2', 'DMZ']
    });

    // Router Borde Sophos
    const router = createNode('router_sophos', 500, 160, {
      name: 'RTR-SOPHOS-CORE',
      ip: '192.168.1.254',
      mask: '255.255.255.0',
      availablePorts: ['WAN 1', 'WAN 2', 'Port 1 (LAN)', 'Port 2 (LAN)', 'Port 3 (DMZ)', 'Fibra 1', 'Fibra 2']
    });

    // Switch Cisco Distribución (24 Bocas Cobre + 4 Fibra)
    const swL3 = createNode('switch_cisco', 700, 160, {
      name: 'SW-CISCO-CORE',
      ip: '192.168.10.1',
      mask: '255.255.255.0',
      availablePorts: generateSwitchPorts(24, 4)
    });

    // Switch Aruba Acceso (24 Bocas Cobre + 4 Fibra)
    const swL2 = createNode('switch_aruba', 700, 390, {
      name: 'SW-ARUBA-ACCESO',
      ip: '192.168.10.2',
      mask: '255.255.255.0',
      availablePorts: generateSwitchPorts(24, 4)
    });

    // Servidor Rack y Servidor DB
    const srv = createNode('server', 950, 60, {
      name: 'SRV-WEB-PROD',
      ip: '192.168.10.10',
      mask: '255.255.255.0',
      gateway: '192.168.10.1',
      availablePorts: ['Eth 1', 'Eth 2', 'iDRAC']
    });

    const db = createNode('database', 950, 210, {
      name: 'SRV-POSTGRES',
      ip: '192.168.10.15',
      mask: '255.255.255.0',
      gateway: '192.168.10.1',
      availablePorts: ['Eth 1', 'Eth 2']
    });

    // Puntos de acceso y estaciones de trabajo
    const ap = createNode('ap', 460, 390, {
      name: 'AP-OFICINA-CENTRAL',
      ip: '192.168.20.5',
      mask: '255.255.255.0',
      gateway: '192.168.20.1',
      availablePorts: ['PoE-In', 'SSID-Corp']
    });

    const pc1 = createNode('pc', 950, 390, {
      name: 'PC-ADMIN',
      ip: '192.168.10.50',
      mask: '255.255.255.0',
      gateway: '192.168.10.1',
      availablePorts: ['Eth 1']
    });

    const pc2 = createNode('laptop', 460, 560, {
      name: 'LAPTOP-GERENCIA',
      ip: '192.168.20.101',
      mask: '255.255.255.0',
      gateway: '192.168.20.1',
      availablePorts: ['Wi-Fi', 'Eth 1']
    });

    // Conexiones claras y directas (Boca 1, Eth 1, Fibra 1)
    createConnection(cloud.id, fw.id, 'Fibra 1', 'WAN 1', 'serial', 'WAN Public IP');
    createConnection(fw.id, router.id, 'LAN 1', 'Eth 1', 'ethernet', 'Enlace Seguro');
    createConnection(router.id, swL3.id, 'Fibra 1', 'Fibra 1', 'fiber', 'Trunk 10Gbps');
    createConnection(swL3.id, srv.id, 'Boca 1', 'Eth 1', 'ethernet', 'VLAN 10 DMZ');
    createConnection(swL3.id, db.id, 'Boca 2', 'Eth 1', 'ethernet', 'VLAN 10 DB');
    createConnection(swL3.id, swL2.id, 'Fibra 2', 'Fibra 1', 'fiber', 'VLAN 10,20 Trunk');
    createConnection(swL2.id, pc1.id, 'Boca 1', 'Eth 1', 'ethernet', 'VLAN 10');
    createConnection(swL2.id, ap.id, 'Boca 24', 'PoE-In', 'ethernet', 'PoE 802.3at');
    createConnection(ap.id, pc2.id, 'SSID-Corp', 'Wi-Fi', 'wireless', 'WPA3 Enterprise');

    // Áreas y Zonas de Red (VLAN) de demostración
    createZone('VLAN 10 - Servidores y BD', 900, 24, 240, 312, 'emerald');
    createZone('VLAN 20 - Oficinas y WiFi', 408, 336, 264, 312, 'cyan');

    deselectAll();
    saveState();
  }

  // Ajustar todos los equipos y conexiones al nuevo centrado de cuadrícula
export function snapAllNodesAndConnectionsToGrid() {
    state.nodes.forEach(node => {
      const snapped = snapNodeCoordinates(node.x, node.y);
      node.x = snapped.x;
      node.y = snapped.y;
      const el = document.getElementById(node.id);
      if (el) {
        el.style.left = `${node.x}px`;
        el.style.top = `${node.y}px`;
      }
    });

    state.connections.forEach(conn => {
      if (Array.isArray(conn.waypoints)) {
        conn.waypoints = conn.waypoints.map(wp => ({
          x: Math.round(wp.x / state.gridSize) * state.gridSize,
          y: Math.round(wp.y / state.gridSize) * state.gridSize
        }));
      }
    });

    renderConnections();
    renderInspector();
    saveState();
  }


// Registrar métodos en el contexto global de aplicación
app.loadDefaultTopology = loadDefaultTopology;
app.snapAllNodesAndConnectionsToGrid = snapAllNodesAndConnectionsToGrid;
