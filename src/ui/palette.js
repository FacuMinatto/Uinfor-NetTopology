/**
 * NetTopology - Módulo src/ui/palette.js
 */

import { state, dom } from '../state/store.js';
import { app } from '../core/appContext.js';
import { DEVICE_ICONS, DEVICE_METADATA, getDeviceIcon } from '../config/icons.js';
import { escapeHtml } from '../utils/helpers.js';
import { createNode, getNodePlacementOffset } from '../core/nodes.js';
import { getCanvasCenterWorld, placePaletteItemAtScreen } from '../core/canvas.js';
import { createZone } from '../core/zones.js';
import { saveState } from '../storage/db.js';

let activeTouchDragCleanup = null;

export function cleanupPaletteEvents() {
  if (activeTouchDragCleanup) {
    activeTouchDragCleanup();
    activeTouchDragCleanup = null;
  }
}

function bindPaletteItemKeyboard(item) {
  item.setAttribute('role', 'button');
  item.setAttribute('tabindex', '0');
  item.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      item.click();
    }
  });
}

function isPointOverCanvasDropTarget(clientX, clientY) {
  if (!dom.viewport) return false;
  const vpRect = dom.viewport.getBoundingClientRect();
  if (clientX < vpRect.left || clientX > vpRect.right || clientY < vpRect.top || clientY > vpRect.bottom) {
    return false;
  }
  const paletteEl = dom.sidebarPalette;
  if (paletteEl && !paletteEl.classList.contains('collapsed')) {
    const palRect = paletteEl.getBoundingClientRect();
    if (clientX >= palRect.left && clientX <= palRect.right && clientY >= palRect.top && clientY <= palRect.bottom) {
      return false;
    }
  }
  return true;
}

function bindPaletteTouchDrag(item, type, label, iconHtml) {
  item.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' || !e.isPrimary) return;
    if (state.readOnlyLock) return;

    const pointerId = e.pointerId;
    const startX = e.clientX;
    const startY = e.clientY;
    let dragActive = false;
    let ghostEl = null;
    let holdTimer = null;

    cleanupPaletteEvents();

    const preventTouchScroll = (ev) => {
      if (dragActive) ev.preventDefault();
    };

    const updateGhost = (cx, cy) => {
      if (ghostEl) {
        ghostEl.style.transform = `translate3d(${Math.round(cx - 42)}px, ${Math.round(cy - 36)}px, 0)`;
      }
      if (dom.viewport) {
        dom.viewport.classList.toggle('drag-drop-active', isPointOverCanvasDropTarget(cx, cy));
      }
    };

    const activateDrag = (cx, cy) => {
      if (dragActive) return;
      dragActive = true;
      clearTimeout(holdTimer);
      holdTimer = null;

      ghostEl = document.createElement('div');
      ghostEl.className = 'palette-touch-ghost';
      ghostEl.innerHTML = `<div class="item-icon">${iconHtml}</div><span class="item-name">${escapeHtml(label)}</span>`;
      document.body.appendChild(ghostEl);
      navigator.vibrate?.(12);
      updateGhost(cx, cy);
    };

    const cleanup = () => {
      if (activeTouchDragCleanup === cleanup) {
        activeTouchDragCleanup = null;
      }
      clearTimeout(holdTimer);
      holdTimer = null;
      if (ghostEl) {
        ghostEl.remove();
        ghostEl = null;
      }
      if (dom.viewport) {
        dom.viewport.classList.remove('drag-drop-active');
      }
      window.removeEventListener('pointermove', onMove, true);
      window.removeEventListener('pointerup', onEnd, true);
      window.removeEventListener('pointercancel', onEnd, true);
      window.removeEventListener('touchmove', preventTouchScroll, { passive: false });
    };

    const onMove = (me) => {
      if (me.pointerId !== pointerId) return;
      const dx = me.clientX - startX;
      const dy = me.clientY - startY;

      if (!dragActive) {
        if (Math.abs(dy) > 9 && Math.abs(dy) >= Math.abs(dx)) {
          cleanup();
          return;
        }
        if (dx > 14 && Math.abs(dx) > Math.abs(dy) * 1.2) {
          activateDrag(me.clientX, me.clientY);
          return;
        }
        return;
      }
      updateGhost(me.clientX, me.clientY);
    };

    const onEnd = (ee) => {
      if (ee.pointerId !== pointerId) return;
      const wasDragging = dragActive;
      const dropX = ee.clientX;
      const dropY = ee.clientY;
      cleanup();

      if (wasDragging) {
        item.dataset.suppressClickUntil = String(Date.now() + 400);
        if (ee.type === 'pointerup' && isPointOverCanvasDropTarget(dropX, dropY)) {
          const created = placePaletteItemAtScreen(type, dropX, dropY);
          if (created && window.innerWidth <= 1024) {
            app.togglePalette?.(true);
          }
        }
      }
    };

    activeTouchDragCleanup = cleanup;
    holdTimer = setTimeout(() => activateDrag(startX, startY), 210);
    window.addEventListener('pointermove', onMove, true);
    window.addEventListener('pointerup', onEnd, true);
    window.addEventListener('pointercancel', onEnd, true);
    window.addEventListener('touchmove', preventTouchScroll, { passive: false });
  });
}



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
      header.setAttribute('aria-expanded', 'true');
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

      const toggleCategory = () => {
        const isCollapsed = group.classList.toggle('collapsed');
        header.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
      };
      header.addEventListener('click', toggleCategory);
      header.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleCategory();
        }
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
        bindPaletteItemKeyboard(item);

        const zoneIconSvg = `
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <rect x="3" y="3" width="18" height="18" rx="3" stroke-dasharray="3 3"/>
            <rect x="6" y="6" width="6" height="5" rx="1" fill="rgba(56, 189, 248, 0.35)"/>
            <line x1="6" y1="15" x2="18" y2="15"/>
            <line x1="6" y1="18" x2="13" y2="18"/>
          </svg>
        `;
        item.innerHTML = `
          <div class="item-icon" style="color: var(--accent-cyan); display: flex; align-items: center; justify-content: center;">
            ${zoneIconSvg}
          </div>
          <span class="item-name">Zona / VLAN</span>
        `;

        item.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/plain', 'vlan_zone');
          e.dataTransfer.effectAllowed = 'copy';
        });

        bindPaletteTouchDrag(item, 'vlan_zone', 'Zona / VLAN', zoneIconSvg);

        item.addEventListener('click', () => {
          if (Number(item.dataset.suppressClickUntil || 0) > Date.now()) return;
          if (state.readOnlyLock) { app.notifyReadOnlyBlocked?.(); return; }
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
        const iconSvg = typeof getDeviceIcon === 'function' ? getDeviceIcon(type, isLight, 'pal_' + type) : DEVICE_ICONS[type];
        if (!meta || !iconSvg) return;

        const item = document.createElement('div');
        const isWide = type === 'transfer' || (type && type.startsWith('canal_tension'));
        item.className = 'palette-item' + (isWide ? ' palette-item-wide' : '');
        item.draggable = true;
        item.dataset.type = type;
        item.title = `Arrastrar ${meta.label} al lienzo o hacer clic`;
        bindPaletteItemKeyboard(item);

        item.innerHTML = `
          <div class="item-icon">${iconSvg}</div>
          <span class="item-name">${escapeHtml(meta.label)}</span>
        `;

        // Arrastrar hacia el lienzo (PC y táctil)
        item.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/plain', type);
          e.dataTransfer.effectAllowed = 'copy';
        });

        bindPaletteTouchDrag(item, type, meta.label, iconSvg);

        // O clic para agregar en el centro geométrico del viewport
        item.addEventListener('click', () => {
          if (Number(item.dataset.suppressClickUntil || 0) > Date.now()) return;
          if (state.readOnlyLock) { app.notifyReadOnlyBlocked?.(); return; }
          const center = getCanvasCenterWorld();
          const offset = getNodePlacementOffset(type);
          createNode(type, center.x - offset.x, center.y - offset.y);
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
