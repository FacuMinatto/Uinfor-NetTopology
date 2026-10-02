/**
 * NetTopology - Módulo src/ui/palette.js
 */

import { state, dom } from '../state/store.js';
import { app } from '../core/appContext.js';
import { DEVICE_ICONS, DEVICE_ICONS_LIGHT, DEVICE_METADATA, CABLE_TYPES, getDeviceIcon, generateSwitchPorts, generateRouterPorts } from '../config/icons.js';
import { STORAGE_PROJECTS_KEY, STORAGE_ACTIVE_ID_KEY, STORAGE_LEGACY_KEY, SHEET_PRESETS, ZONE_COLOR_PALETTES, MAX_HISTORY_STEPS, DEFAULT_GRID_SIZE } from '../config/constants.js';
import { escapeHtml, incrementIp, formatDateForFile, clamp, generateId } from '../utils/helpers.js';
import { createNode } from '../core/nodes.js';
import { getCanvasCenterWorld } from '../core/canvas.js';
import { createZone } from '../core/zones.js';
import { saveState } from '../storage/db.js';



  // ==========================================================================
  // RENDERIZADO DE LA PALETA DE EQUIPOS
  // ==========================================================================
export function renderPalette() {
    const categories = [
      { id: 'power', title: '⚡ Electricidad', types: ['ups', 'termica', 'transfer', 'canal_tension_5', 'canal_tension_7'] },
      { id: 'cameras', title: '📹 Cámaras & Videovigilancia', types: ['nvr', 'dvr', 'camara'] },
      { id: 'network', title: '🌐 Equipos de Red', types: ['router_sophos', 'router_fortinet', 'switch_cisco', 'switch_hp', 'switch_huawei', 'switch_aruba', 'firewall', 'ap', 'cloud'] },
      { id: 'endpoints', title: '💻 Dispositivos de Usuario', types: ['pc', 'laptop', 'phone', 'printer'] },
      { id: 'servers', title: '🗄️ Servidores & Almacenamiento', types: ['server', 'database', 'pc_backup', 'nas'] },
      { id: 'grouping', title: '🔲 Áreas y Zonas (VLAN)', isZoneCategory: true, types: ['zone'] }
    ];

    dom.paletteContainer.innerHTML = '';

    categories.forEach(cat => {
      const group = document.createElement('div');
      group.className = 'category-group';

      const header = document.createElement('div');
      header.className = 'category-header-toggle';
      header.setAttribute('role', 'button');
      header.setAttribute('tabindex', '0');
      header.title = `Clic para comprimir / expandir "${cat.title}"`;
      header.innerHTML = `
        <h4>
          <span>${cat.title}</span>
          <span class="category-header-badge">${cat.isZoneCategory ? 1 : cat.types.length}</span>
        </h4>
        <svg class="category-chevron" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      `;

      header.addEventListener('click', () => {
        group.classList.toggle('collapsed');
      });

      group.appendChild(header);

      const grid = document.createElement('div');
      grid.className = 'device-grid';

      if (cat.isZoneCategory) {
        const item = document.createElement('div');
        item.className = 'palette-item';
        item.draggable = true;
        item.dataset.type = 'vlan_zone';
        item.title = 'Arrastrar al lienzo o hacer clic para crear un área o zona VLAN';

        item.innerHTML = `
          <div class="item-icon" style="color: var(--accent-cyan); display: flex; align-items: center; justify-content: center;">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <rect x="3" y="3" width="18" height="18" rx="3" stroke-dasharray="3 3"/>
              <rect x="6" y="6" width="6" height="5" rx="1" fill="rgba(56, 189, 248, 0.35)"/>
              <line x1="6" y1="15" x2="18" y2="15"/>
              <line x1="6" y1="18" x2="13" y2="18"/>
            </svg>
          </div>
          <span class="item-name">Zona / VLAN</span>
        `;

        item.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/plain', 'vlan_zone');
          e.dataTransfer.effectAllowed = 'copy';
        });

        item.addEventListener('click', () => {
          const center = getCanvasCenterWorld();
          createZone('VLAN ' + ((state.zones ? state.zones.length : 0) + 10), center.x - 160, center.y - 110, 320, 220);
          saveState();
        });

        grid.appendChild(item);
        group.appendChild(grid);
        dom.paletteContainer.appendChild(group);
        return;
      }

      cat.types.forEach(type => {
        const meta = DEVICE_METADATA[type];
        const isLight = state.theme === 'light';
        const iconSvg = typeof getDeviceIcon === 'function' ? getDeviceIcon(type, isLight) : DEVICE_ICONS[type];
        if (!meta || !iconSvg) return;

        const item = document.createElement('div');
        const isWide = type === 'transfer' || (type && type.startsWith('canal_tension'));
        item.className = 'palette-item' + (isWide ? ' palette-item-wide' : '');
        item.draggable = true;
        item.dataset.type = type;
        item.title = `Arrastrar ${meta.label} al lienzo o hacer clic`;

        item.innerHTML = `
          <div class="item-icon">${iconSvg}</div>
          <span class="item-name">${meta.label}</span>
        `;

        // Arrastrar hacia el lienzo
        item.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/plain', type);
          e.dataTransfer.effectAllowed = 'copy';
        });

        // O clic para agregar en el centro
        item.addEventListener('click', () => {
          const center = getCanvasCenterWorld();
          createNode(type, center.x, center.y);
          saveState();
        });

        grid.appendChild(item);
      });

      group.appendChild(grid);
      dom.paletteContainer.appendChild(group);
    });
  }


// Registrar métodos en el contexto global de aplicación
app.renderPalette = renderPalette;
