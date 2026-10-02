/**
 * NetTopology - Módulo src/export/exportSvg.js
 */

import { state, dom } from '../state/store.js';
import { app } from '../core/appContext.js';
import { DEVICE_ICONS, DEVICE_ICONS_LIGHT, DEVICE_METADATA, CABLE_TYPES, getDeviceIcon, generateSwitchPorts, generateRouterPorts } from '../config/icons.js';
import { STORAGE_PROJECTS_KEY, STORAGE_ACTIVE_ID_KEY, STORAGE_LEGACY_KEY, SHEET_PRESETS, ZONE_COLOR_PALETTES, MAX_HISTORY_STEPS, DEFAULT_GRID_SIZE } from '../config/constants.js';
import { escapeHtml, incrementIp, formatDateForFile, clamp, generateId } from '../utils/helpers.js';
import { getNodeGeometry } from '../core/nodes.js';
import { computeConnectionCurve, getPointAlongCable, applyCableBridgesToCurves } from '../core/cables.js';
import { getCurrentSheet } from '../core/sheets.js';
import { escapeXml } from './exportPdf.js';



  // ==========================================================================
  // EXPORTACIÓN VECTORIAL NATIVA A FORMATO SVG (.svg)
  // ==========================================================================
export function exportDiagramSvg(theme = 'monochrome', includeGrid = false, includeTitleBlock = false, titleBlockData = null, elemScale = 1.25) {
    if ((!state.nodes || state.nodes.length === 0) && (!Array.isArray(state.zones) || state.zones.length === 0)) {
      alert('El diagrama está vacío. Agrega algunos equipos o zonas antes de exportar.');
      return;
    }

    const isMono = theme === 'monochrome';
    const currSheet = getCurrentSheet();
    const useSheetBounds = currSheet && currSheet.pageSize !== 'infinite' && dom.chkExportSheetBounds && dom.chkExportSheetBounds.checked;

    let minX, minY, width, height;

    if (useSheetBounds) {
      let bMinX = 0, bMinY = 0, bMaxX = currSheet.pageWidth || 1123, bMaxY = currSheet.pageHeight || 794;
      if (Array.isArray(state.nodes)) {
        state.nodes.forEach(n => {
          bMinX = Math.min(bMinX, n.x);
          bMinY = Math.min(bMinY, n.y - (n.encapsulatedLabels ? 25 : 35));
          const nodeW = n.type === 'transfer' ? 200 : (n.type === 'canal_tension_7' ? 270 : ((n.type === 'canal_tension_5' || n.type === 'canal_tension') ? 210 : (n.encapsulatedLabels ? 120 : 104)));
          bMaxX = Math.max(bMaxX, n.x + nodeW);
          bMaxY = Math.max(bMaxY, n.y + (n.encapsulatedLabels ? 130 : 110));
        });
      }
      if (Array.isArray(state.zones)) {
        state.zones.forEach(z => {
          bMinX = Math.min(bMinX, z.x);
          bMinY = Math.min(bMinY, z.y);
          bMaxX = Math.max(bMaxX, z.x + z.width);
          bMaxY = Math.max(bMaxY, z.y + z.height);
        });
      }
      if (Array.isArray(state.connections)) {
        state.connections.forEach(c => {
          const na = state.nodes?.find(n => n.id === c.fromNodeId);
          const nb = state.nodes?.find(n => n.id === c.toNodeId);
          if (na && nb) {
            bMinX = Math.min(bMinX, na.x - 20, nb.x - 20);
            bMinY = Math.min(bMinY, na.y - 45, nb.y - 45);
            bMaxX = Math.max(bMaxX, na.x + 120, nb.x + 120);
            bMaxY = Math.max(bMaxY, na.y + 120, nb.y + 120);
          }
        });
      }
      const pad = (bMinX < 0 || bMinY < 0 || bMaxX > (currSheet.pageWidth || 1123) || bMaxY > (currSheet.pageHeight || 794)) ? 70 : 0;
      minX = bMinX - pad;
      minY = bMinY - pad;
      width = (bMaxX + pad) - minX;
      height = (bMaxY + pad) - minY;
    } else {
      let bMinX = Infinity, bMinY = Infinity, bMaxX = -Infinity, bMaxY = -Infinity;
      if (Array.isArray(state.nodes)) {
        state.nodes.forEach(n => {
          bMinX = Math.min(bMinX, n.x);
          bMinY = Math.min(bMinY, n.y - (n.encapsulatedLabels ? 25 : 35));
          const nodeW = n.type === 'transfer' ? 200 : (n.type === 'canal_tension_7' ? 270 : ((n.type === 'canal_tension_5' || n.type === 'canal_tension') ? 210 : (n.encapsulatedLabels ? 120 : 104)));
          bMaxX = Math.max(bMaxX, n.x + nodeW);
          bMaxY = Math.max(bMaxY, n.y + (n.encapsulatedLabels ? 130 : 110));
        });
      }

      if (Array.isArray(state.zones)) {
        state.zones.forEach(z => {
          bMinX = Math.min(bMinX, z.x);
          bMinY = Math.min(bMinY, z.y);
          bMaxX = Math.max(bMaxX, z.x + z.width);
          bMaxY = Math.max(bMaxY, z.y + z.height);
        });
      }

      if (Array.isArray(state.connections)) {
        state.connections.forEach(c => {
          const na = state.nodes?.find(n => n.id === c.fromNodeId);
          const nb = state.nodes?.find(n => n.id === c.toNodeId);
          if (na && nb) {
            bMinX = Math.min(bMinX, na.x - 20, nb.x - 20);
            bMinY = Math.min(bMinY, na.y - 45, nb.y - 45);
            bMaxX = Math.max(bMaxX, na.x + 120, nb.x + 120);
            bMaxY = Math.max(bMaxY, na.y + 120, nb.y + 120);
          }
        });
      }

      if (!isFinite(bMinX)) {
        bMinX = 0; bMinY = 0; bMaxX = 800; bMaxY = 600;
      }

      const padding = 80;
      minX = bMinX - padding;
      minY = bMinY - padding;
      width = (bMaxX + padding) - minX;
      height = (bMaxY + padding) - minY;

      if (includeTitleBlock) {
        width = Math.max(width, 740);
        height = Math.max(height, 520);
      }
    }

    width = Math.round(width);
    height = Math.round(height);

    const bgColor = isMono ? '#ffffff' : '#090d16';
    const gridLineColor = isMono ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.04)';

    // Calcular curvas de conexión y badges
    const exportBadges = [];
    const activeExportCurves = [];

    state.connections.forEach(conn => {
      const nodeA = state.nodes.find(n => n.id === conn.fromNodeId);
      const nodeB = state.nodes.find(n => n.id === conn.toNodeId);
      if (!nodeA || !nodeB) return;

      const cableConfig = CABLE_TYPES[conn.cableType] || CABLE_TYPES.ethernet;
      const curve = computeConnectionCurve(conn, nodeA, nodeB);
      activeExportCurves.push({ conn, nodeA, nodeB, cableConfig, curve });
    });

    applyCableBridgesToCurves(activeExportCurves);

    activeExportCurves.forEach(({ conn, nodeA, nodeB, cableConfig, curve }) => {
      const dist = curve.totalLength || 100;
      const offsetDist = Math.min(28, Math.max(dist * 0.25, 14));

      const rawPosA = getPointAlongCable(curve, offsetDist, false);
      const rawPosB = getPointAlongCable(curve, offsetDist, true);
      const rawPosMid = getPointAlongCable(curve, dist * 0.5, false);

      const posA = { x: rawPosA.x - minX, y: rawPosA.y - minY };
      const posB = { x: rawPosB.x - minX, y: rawPosB.y - minY };
      const posMid = { x: rawPosMid.x - minX, y: rawPosMid.y - minY };

      const offA = conn.portAOffset || { x: 0, y: 0 };
      const offB = conn.portBOffset || { x: 0, y: 0 };
      const offMid = conn.labelOffset || { x: 0, y: 0 };

      if (conn.fromPort && conn.fromPort.trim() !== '') {
        const textA = conn.fromPort.trim();
        exportBadges.push({
          text: textA,
          x: posA.x + (offA.x || 0),
          y: posA.y + (offA.y || 0),
          w: Math.max(textA.length * 7 + 14, 32),
          h: 20,
          type: 'port',
          isManualOffset: Boolean(conn.portAOffset && (conn.portAOffset.x || conn.portAOffset.y))
        });
      }

      if (conn.toPort && conn.toPort.trim() !== '') {
        const textB = conn.toPort.trim();
        exportBadges.push({
          text: textB,
          x: posB.x + (offB.x || 0),
          y: posB.y + (offB.y || 0),
          w: Math.max(textB.length * 7 + 14, 32),
          h: 20,
          type: 'port',
          isManualOffset: Boolean(conn.portBOffset && (conn.portBOffset.x || conn.portBOffset.y))
        });
      }

      if (conn.networkLabel && conn.networkLabel.trim() !== '') {
        const textMid = conn.networkLabel.trim();
        exportBadges.push({
          text: textMid,
          x: posMid.x + (offMid.x || 0),
          y: posMid.y + (offMid.y || 0),
          w: Math.max(textMid.length * 7.5 + 20, 48),
          h: 22,
          type: 'network',
          isManualOffset: Boolean(conn.labelOffset && (conn.labelOffset.x || conn.labelOffset.y))
        });
      }
    });

    // Resolver colisiones en exportBadges
    for (let iter = 0; iter < 8; iter++) {
      for (let i = 0; i < exportBadges.length; i++) {
        const b1 = exportBadges[i];
        if (b1.isManualOffset) continue;
        for (let j = i + 1; j < exportBadges.length; j++) {
          const b2 = exportBadges[j];
          if (b2.isManualOffset) continue;
          const minDx = (b1.w + b2.w) / 2 + 6;
          const minDy = (b1.h + b2.h) / 2 + 4;
          const dx = b2.x - b1.x;
          const dy = b2.y - b1.y;
          if (Math.abs(dx) < minDx && Math.abs(dy) < minDy) {
            const overlapX = minDx - Math.abs(dx);
            const overlapY = minDy - Math.abs(dy);
            if (overlapX < overlapY) {
              const shift = (overlapX / 2) + 0.5;
              const sign = dx >= 0 ? 1 : -1;
              b1.x -= shift * sign;
              b2.x += shift * sign;
            } else {
              const shift = (overlapY / 2) + 0.5;
              const sign = dy >= 0 ? 1 : -1;
              b1.y -= shift * sign;
              b2.y += shift * sign;
            }
          }
        }
      }

      for (let i = 0; i < exportBadges.length; i++) {
        const b = exportBadges[i];
        state.nodes.forEach(node => {
          const scale = node.scale || 1;
          const ncx = (node.x - minX) + 52;
          const ncy = (node.y - minY) + 40;
          const hw = 56 * scale;
          const hhTop = 46 * scale;
          const hhBottom = (node.ip ? 96 : 72) * scale;

          const minXBox = ncx - hw - (b.w / 2) - 6;
          const maxXBox = ncx + hw + (b.w / 2) + 6;
          const minYBox = ncy - hhTop - (b.h / 2) - 6;
          const maxYBox = ncy + hhBottom + (b.h / 2) + 6;

          if (b.x > minXBox && b.x < maxXBox && b.y > minYBox && b.y < maxYBox) {
            const dLeft = b.x - minXBox;
            const dRight = maxXBox - b.x;
            const dTop = b.y - minYBox;
            const dBottom = maxYBox - b.y;
            const minShift = Math.min(dLeft, dRight, dTop, dBottom);
            if (minShift === dTop) b.y = minYBox;
            else if (minShift === dBottom) b.y = maxYBox;
            else if (minShift === dLeft) b.x = minXBox;
            else b.x = maxXBox;
          }
        });
      }
    }

    const svgParts = [];
    svgParts.push(`<?xml version="1.0" encoding="UTF-8"?>`);
    svgParts.push(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`);
    svgParts.push(`<defs>`);
    if (includeGrid) {
      svgParts.push(`  <pattern id="svg-grid-pattern" width="24" height="24" patternUnits="userSpaceOnUse">`);
      svgParts.push(`    <path d="M 24 0 L 0 0 0 24" fill="none" stroke="${gridLineColor}" stroke-width="1"/>`);
      svgParts.push(`  </pattern>`);
    }
    svgParts.push(`  <filter id="svg-node-shadow" x="-10%" y="-10%" width="130%" height="130%">`);
    svgParts.push(`    <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="${isMono ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.5)'}"/>`);
    svgParts.push(`  </filter>`);
    svgParts.push(`</defs>`);

    // Fondo base
    svgParts.push(`<rect width="100%" height="100%" fill="${bgColor}"/>`);
    if (includeGrid) {
      svgParts.push(`<rect width="100%" height="100%" fill="url(#svg-grid-pattern)"/>`);
    }

    // Grupo de transformación mundo
    svgParts.push(`<g transform="translate(${-minX}, ${-minY})">`);

    // 0. Capa de Plano Arquitectónico / Imagen de Fondo (Underlay)
    if (state.underlay && state.underlay.src && state.underlay.visible !== false) {
      const u = state.underlay;
      const uScale = (u.scale || 100) / 100;
      const uw = Math.round((u.width || 800) * uScale);
      const uh = Math.round((u.height || 600) * uScale);
      const uOpacity = ((typeof u.opacity === 'number' ? u.opacity : 40) / 100).toFixed(2);
      svgParts.push(`  <!-- Plano Arquitectónico (Underlay) -->`);
      svgParts.push(`  <image href="${u.src}" x="${u.x || 0}" y="${u.y || 0}" width="${uw}" height="${uh}" opacity="${uOpacity}" preserveAspectRatio="none"/>`);
    }

    // 1. Capa de Zonas VLAN
    if (Array.isArray(state.zones) && state.zones.length > 0) {
      svgParts.push(`  <!-- Zonas VLAN -->`);
      svgParts.push(`  <g class="vlan-zones-layer">`);
      state.zones.forEach(zone => {
        const palette = ZONE_COLOR_PALETTES[zone.color] || ZONE_COLOR_PALETTES.cyan;
        const zFill = isMono ? 'rgba(0, 0, 0, 0.02)' : palette.bg;
        const zStroke = palette.border;
        const headerBg = isMono ? '#f1f5f9' : 'rgba(15, 23, 42, 0.9)';
        const headerBorder = palette.border;
        const dotColor = palette.text;
        const titleColor = isMono ? '#0f172a' : '#ffffff';
        const zName = escapeXml(zone.name || 'Zona VLAN');

        svgParts.push(`    <g class="vlan-zone" id="zone-${zone.id}">`);
        svgParts.push(`      <rect x="${zone.x}" y="${zone.y}" width="${zone.width}" height="${zone.height}" rx="12" ry="12" fill="${zFill}" stroke="${zStroke}" stroke-width="2" stroke-dasharray="7,5"/>`);
        svgParts.push(`      <path d="M ${zone.x + 12} ${zone.y} L ${zone.x + zone.width - 12} ${zone.y} Q ${zone.x + zone.width} ${zone.y}, ${zone.x + zone.width} ${zone.y + 12} L ${zone.x + zone.width} ${zone.y + 26} L ${zone.x} ${zone.y + 26} L ${zone.x} ${zone.y + 12} Q ${zone.x} ${zone.y}, ${zone.x + 12} ${zone.y} Z" fill="${headerBg}"/>`);
        svgParts.push(`      <line x1="${zone.x}" y1="${zone.y + 26}" x2="${zone.x + zone.width}" y2="${zone.y + 26}" stroke="${headerBorder}" stroke-width="1"/>`);
        svgParts.push(`      <circle cx="${zone.x + 12}" cy="${zone.y + 13}" r="4.5" fill="${dotColor}"/>`);
        svgParts.push(`      <text x="${zone.x + 21}" y="${zone.y + 13.5}" font-family="Inter, -apple-system, sans-serif" font-size="11px" font-weight="bold" fill="${titleColor}" dominant-baseline="central">${zName}</text>`);
        svgParts.push(`    </g>`);
      });
      svgParts.push(`  </g>`);
    }

    // 2. Capa de Cables
    svgParts.push(`  <!-- Cables y Conexiones -->`);
    svgParts.push(`  <g class="cables-layer">`);
    activeExportCurves.forEach(({ conn, nodeA, nodeB, cableConfig, curve }) => {
      const cableColor = conn.color || cableConfig.color;
      const cableW = isMono ? (conn.cableType === 'fiber' ? 2.5 : 2) : cableConfig.width;
      let dashAttr = '';
      if (conn.cableType === 'serial') dashAttr = 'stroke-dasharray="8,4"';
      else if (conn.cableType === 'wireless') dashAttr = 'stroke-dasharray="3,3"';

      svgParts.push(`    <path d="${curve.pathData}" fill="none" stroke="${cableColor}" stroke-width="${cableW}" ${dashAttr} stroke-linecap="round" stroke-linejoin="round"/>`);
    });
    svgParts.push(`  </g>`);

    // 3. Capa de Nodos
    svgParts.push(`  <!-- Dispositivos de Red -->`);
    svgParts.push(`  <g class="nodes-layer">`);
    state.nodes.forEach(node => {
      const scale = node.scale || 1;

      if (node.type === 'text_badge') {
        const textVal = escapeXml((node.ip || node.name || '192.168.1.0/24').trim());
        const geo = getNodeGeometry(node);
        const baseScale = node.scale || 1;
        const w = geo.hw * 2 / baseScale;
        const h = geo.hh * 2 / baseScale;
        const badgeColor = node.badgeColor || 'emerald';

        let strokeCol = isMono ? '#059669' : 'rgba(16, 185, 129, 0.5)';
        let textCol = isMono ? '#059669' : '#10b981';
        if (badgeColor === 'cyan') {
          strokeCol = isMono ? '#0284c7' : 'rgba(56, 189, 248, 0.5)';
          textCol = isMono ? '#0284c7' : '#38bdf8';
        } else if (badgeColor === 'amber') {
          strokeCol = isMono ? '#d97706' : 'rgba(245, 158, 11, 0.5)';
          textCol = isMono ? '#d97706' : '#f59e0b';
        } else if (badgeColor === 'purple') {
          strokeCol = isMono ? '#9333ea' : 'rgba(192, 132, 252, 0.5)';
          textCol = isMono ? '#9333ea' : '#c084fc';
        } else if (badgeColor === 'neutral') {
          strokeCol = isMono ? '#334155' : 'rgba(148, 163, 184, 0.5)';
          textCol = isMono ? '#0f172a' : '#f8fafc';
        }
        const bgCol = isMono ? '#ffffff' : '#09131e';

        svgParts.push(`    <g class="node-text-badge" transform="translate(${node.x}, ${node.y}) scale(${scale})">`);
        svgParts.push(`      <rect width="${w}" height="${h}" rx="6" ry="6" fill="${bgCol}" stroke="${strokeCol}" stroke-width="1.2" filter="url(#svg-node-shadow)"/>`);
        svgParts.push(`      <text x="${w / 2}" y="${h / 2 + 1}" font-family="'JetBrains Mono', monospace" font-size="11px" font-weight="bold" fill="${textCol}" text-anchor="middle" dominant-baseline="central">${textVal}</text>`);
        svgParts.push(`    </g>`);
        return;
      }

      const rawName = (node.customName !== undefined && node.customName !== null ? node.customName : (node.name || '')).trim();
      const displayName = rawName ? escapeXml(rawName) : (node.encapsulatedLabels ? '' : 'Dispositivo');
      const ipText = escapeXml((node.ip || '').trim());

      let origX = 52, origY = 40;
      let boxX = 18, boxY = 0, boxW = 68, boxH = 68, boxRx = 12;
      let iconX = 27, iconY = 9, iconW = 50, iconH = 50;
      let nameX = 52, nameY = 83;
      let ipX = 52, ipY = 101;

      if (node.encapsulatedLabels) {
        if (node.type === 'transfer') {
          origX = 100; origY = 44;
          boxX = 4; boxY = 2; boxW = 192; boxH = 86; boxRx = 10;
          iconX = 12; iconY = 6; iconW = 176; iconH = 42;
          nameX = 100; nameY = 58;
          ipX = 100; ipY = 74;
        } else if (node.type === 'canal_tension_7') {
          origX = 135; origY = 44;
          boxX = 4; boxY = 2; boxW = 262; boxH = 86; boxRx = 10;
          iconX = 12; iconY = 6; iconW = 246; iconH = 42;
          nameX = 135; nameY = 58;
          ipX = 135; ipY = 74;
        } else if (node.type === 'canal_tension_5' || node.type === 'canal_tension') {
          origX = 105; origY = 44;
          boxX = 4; boxY = 2; boxW = 202; boxH = 86; boxRx = 10;
          iconX = 12; iconY = 6; iconW = 186; iconH = 42;
          nameX = 105; nameY = 58;
          ipX = 105; ipY = 74;
        } else {
          const el = document.getElementById(node.id);
          const iconBox = el ? el.querySelector('.node-icon-box') : null;
          if (iconBox && iconBox.offsetWidth > 0) {
            boxW = iconBox.offsetWidth;
            boxH = iconBox.offsetHeight;
          } else {
            const dName = (node.customName !== undefined && node.customName !== null ? node.customName : (node.name || '')).trim();
            const dIp = (node.ip || '').trim();
            boxW = Math.max(68, Math.round(Math.max(dName ? (dName.length * 8.2 + 20) : 0, dIp ? (dIp.length * 7.2 + 22) : 0)));
            boxH = dIp ? 98 : (dName ? 76 : 68);
          }
          origX = boxW / 2; origY = boxH / 2;
          boxX = 0; boxY = 0; boxRx = 14;
          iconW = 44; iconH = 44;
          iconX = (boxW - iconW) / 2; iconY = 7;
          nameX = boxW / 2; nameY = ipText ? 64 : Math.round((boxH + 44) / 2);
          ipX = boxW / 2; ipY = 82;
        }
      } else if (node.type === 'transfer') {
        origX = 100; origY = 32;
        boxX = 8; boxY = 6; boxW = 184; boxH = 52; boxRx = 8;
        iconX = 12; iconY = 9; iconW = 176; iconH = 46;
        nameX = 100; nameY = 68;
        ipX = 100; ipY = 86;
      } else if (node.type === 'canal_tension_7') {
        origX = 135; origY = 32;
        boxX = 8; boxY = 6; boxW = 254; boxH = 52; boxRx = 8;
        iconX = 12; iconY = 9; iconW = 246; iconH = 46;
        nameX = 135; nameY = 68;
        ipX = 135; ipY = 86;
      } else if (node.type === 'canal_tension_5' || node.type === 'canal_tension') {
        origX = 105; origY = 32;
        boxX = 8; boxY = 6; boxW = 194; boxH = 52; boxRx = 8;
        iconX = 12; iconY = 9; iconW = 186; iconH = 46;
        nameX = 105; nameY = 68;
        ipX = 105; ipY = 86;
      }

      const nameW = Math.min(Math.max(displayName.length * 7.5 + 16, 54), 160);
      const ipW = Math.max(ipText.length * 6.5 + 12, 46);

      const boxFill = isMono ? '#ffffff' : '#1e293b';
      const boxStroke = isMono ? '#0f172a' : 'rgba(255, 255, 255, 0.12)';
      const boxStrokeW = isMono ? '1.8' : '1.5';
      let rawIcon = typeof getDeviceIcon === 'function' ? getDeviceIcon(node.type, isMono || state.theme === 'light') : (DEVICE_ICONS[node.type] || DEVICE_ICONS.pc);
      rawIcon = rawIcon.replace(/<\?xml.*?\?>/gi, '').trim();

      const safeNodeId = String(node.id || '').replace(/[^a-zA-Z0-9_-]/g, '_');
      rawIcon = rawIcon.replace(/\bid="([a-zA-Z0-9_-]+)"/g, `id="$1_${safeNodeId}"`);
      rawIcon = rawIcon.replace(/url\(#([a-zA-Z0-9_-]+)\)/g, `url(#$1_${safeNodeId})`);

      const vbMatch = rawIcon.match(/viewBox="([^"]*)"/i);
      const vb = vbMatch ? vbMatch[1] : (node.type === 'transfer' ? '0 0 176 46' : (node.type === 'canal_tension_7' ? '0 0 246 46' : ((node.type === 'canal_tension_5' || node.type === 'canal_tension') ? '0 0 186 46' : '0 0 56 56')));

      const adjustedIcon = rawIcon.replace(/<svg\b([^>]*)>/i, (m, attrs) => {
        const clean = attrs
          .replace(/\bx="[^"]*"/gi, '')
          .replace(/\by="[^"]*"/gi, '')
          .replace(/\bwidth="[^"]*"/gi, '')
          .replace(/\bheight="[^"]*"/gi, '')
          .replace(/\bviewBox="[^"]*"/gi, '');
        return `<svg${clean} x="${iconX}" y="${iconY}" width="${iconW}" height="${iconH}" viewBox="${vb}">`;
      });

      svgParts.push(`    <g class="network-node" id="node-${node.id}" transform="translate(${node.x + origX}, ${node.y + origY}) scale(${scale}) translate(-${origX}, -${origY})">`);
      // Caja principal del dispositivo
      svgParts.push(`      <rect x="${boxX}" y="${boxY}" width="${boxW}" height="${boxH}" rx="${boxRx}" fill="${boxFill}" stroke="${boxStroke}" stroke-width="${boxStrokeW}" filter="url(#svg-node-shadow)"/>`);

      // Icono vectorial embebido nativo
      svgParts.push(`      ${adjustedIcon}`);

      if (node.encapsulatedLabels) {
        const nameTextColor = isMono ? '#0f172a' : '#f8fafc';
        if (displayName) {
          svgParts.push(`      <text x="${nameX}" y="${nameY}" font-family="Inter, -apple-system, sans-serif" font-size="11px" font-weight="bold" fill="${nameTextColor}" text-anchor="middle" dominant-baseline="central">${displayName}</text>`);
        }
        if (ipText) {
          const encIpW = Math.max(ipText.length * 6.5 + 14, 46);
          const ipBoxFill = isMono ? 'rgba(5, 150, 105, 0.08)' : 'rgba(16, 185, 129, 0.14)';
          const ipBoxStroke = isMono ? 'rgba(5, 150, 105, 0.35)' : 'rgba(16, 185, 129, 0.35)';
          const ipTextColor = isMono ? '#059669' : '#10b981';
          svgParts.push(`      <rect x="${ipX - encIpW / 2}" y="${ipY - 8}" width="${encIpW}" height="16" rx="4" fill="${ipBoxFill}" stroke="${ipBoxStroke}" stroke-width="1"/>`);
          svgParts.push(`      <text x="${ipX}" y="${ipY}" font-family="'JetBrains Mono', monospace" font-size="9.5px" font-weight="bold" fill="${ipTextColor}" text-anchor="middle" dominant-baseline="central">${ipText}</text>`);
        }
      } else {
        // Recuadro y Nombre externo del dispositivo
        const nameBoxFill = isMono ? '#ffffff' : '#0f172a';
        const nameBoxStroke = isMono ? '#0f172a' : 'rgba(255, 255, 255, 0.16)';
        const nameTextColor = isMono ? '#000000' : '#f8fafc';
        svgParts.push(`      <rect x="${nameX - nameW / 2}" y="${nameY - 9.5}" width="${nameW}" height="19" rx="6" fill="${nameBoxFill}" stroke="${nameBoxStroke}" stroke-width="${isMono ? '1.5' : '1'}" filter="url(#svg-node-shadow)"/>`);
        svgParts.push(`      <text x="${nameX}" y="${nameY}" font-family="Inter, -apple-system, sans-serif" font-size="12px" font-weight="bold" fill="${nameTextColor}" text-anchor="middle" dominant-baseline="central">${displayName}</text>`);

        // Recuadro e IP externa si existe
        if (ipText) {
          const ipBoxFill = isMono ? '#ffffff' : '#09131e';
          const ipBoxStroke = isMono ? '#475569' : 'rgba(16, 185, 129, 0.4)';
          const ipTextColor = isMono ? '#0f172a' : '#10b981';
          svgParts.push(`      <rect x="${ipX - ipW / 2}" y="${ipY - 8}" width="${ipW}" height="16" rx="4" fill="${ipBoxFill}" stroke="${ipBoxStroke}" stroke-width="1" filter="url(#svg-node-shadow)"/>`);
          svgParts.push(`      <text x="${ipX}" y="${ipY}" font-family="'JetBrains Mono', monospace" font-size="10px" font-weight="${isMono ? 'bold' : 'normal'}" fill="${ipTextColor}" text-anchor="middle" dominant-baseline="central">${ipText}</text>`);
        }
      }

      svgParts.push(`    </g>`);
    });
    svgParts.push(`  </g>`);

    svgParts.push(`</g> <!-- Fin grupo mundo -->`);

    // 4. Capa de Badges (Puertos y Etiquetas de Red)
    if (exportBadges.length > 0) {
      svgParts.push(`<!-- Badges de Puertos y Redes -->`);
      svgParts.push(`<g class="badges-layer">`);
      exportBadges.forEach(b => {
        const bText = escapeXml(b.text);
        if (b.type === 'port') {
          const bg = isMono ? '#ffffff' : '#090d16';
          const fg = isMono ? '#0284c7' : '#38bdf8';
          svgParts.push(`  <rect x="${b.x - b.w / 2}" y="${b.y - b.h / 2}" width="${b.w}" height="${b.h}" rx="4" fill="${bg}" stroke="${fg}" stroke-width="1"/>`);
          svgParts.push(`  <text x="${b.x}" y="${b.y + 1}" font-family="JetBrains Mono, monospace" font-size="10px" font-weight="bold" fill="${fg}" text-anchor="middle" dominant-baseline="central">${bText}</text>`);
        } else {
          const bg = isMono ? '#fffbeb' : '#78350f';
          const fg = isMono ? '#d97706' : '#f59e0b';
          svgParts.push(`  <rect x="${b.x - b.w / 2}" y="${b.y - b.h / 2}" width="${b.w}" height="${b.h}" rx="4" fill="${bg}" stroke="${fg}" stroke-width="1" stroke-dasharray="3,2"/>`);
          svgParts.push(`  <text x="${b.x}" y="${b.y + 1}" font-family="JetBrains Mono, monospace" font-size="10px" font-weight="bold" fill="${fg}" text-anchor="middle" dominant-baseline="central">${bText}</text>`);
        }
      });
      svgParts.push(`</g>`);
    }

    // 5. Cuadro de Rotulación Técnico de Ingeniería en una sola línea al pie
    if (includeTitleBlock && titleBlockData) {
      const pad = 16;
      const footerY = height - 20;

      const pName = escapeXml(titleBlockData.project || 'Topología de Red');
      const cName = escapeXml(titleBlockData.company || 'Uinfor');
      const aName = escapeXml(titleBlockData.author || 'Ingeniería de Red');
      const dDate = escapeXml(titleBlockData.date || new Date().toLocaleDateString('es-ES'));
      const sSheet = escapeXml(titleBlockData.sheet || 'Hoja 1');
      const scaleText = (titleBlockData.scale || '').trim();
      const verText = (titleBlockData.version || 'v1.0').trim();
      const vVer = escapeXml(scaleText ? `${verText} · ${scaleText}` : verText);

      const divStroke = isMono ? '#cbd5e1' : 'rgba(56, 189, 248, 0.3)';
      const textColor = isMono ? '#334155' : '#94a3b8';

      svgParts.push(`<!-- Rótulo Técnico en una sola línea al pie -->`);
      svgParts.push(`<g class="engineering-title-line">`);
      svgParts.push(`  <line x1="${pad}" y1="${footerY}" x2="${width - pad}" y2="${footerY}" stroke="${divStroke}" stroke-width="1"/>`);
      svgParts.push(`  <text x="${pad + 4}" y="${footerY + 11}" font-family="'JetBrains Mono', Inter, monospace" font-size="8.5px" font-weight="600" fill="${textColor}" text-anchor="start" dominant-baseline="central">${pName} › ${sSheet}  |  AUTOR: ${aName}  |  ORG: ${cName}</text>`);
      svgParts.push(`  <text x="${width - pad - 4}" y="${footerY + 11}" font-family="'JetBrains Mono', Inter, monospace" font-size="8.5px" font-weight="600" fill="${textColor}" text-anchor="end" dominant-baseline="central">FECHA: ${dDate}  |  ${vVer}</text>`);
      svgParts.push(`</g>`);
    }

    svgParts.push(`</svg>`);

    const svgString = svgParts.join('\n');
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const a = document.createElement('a');
    a.href = svgUrl;
    a.download = `topologia_${isMono ? 'impresion_bn' : 'digital'}_${formatDateForFile(new Date())}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(svgUrl);
  }

export function drawBadge(ctx, text, x, y, bgColor, textColor, borderColor, isDashed = false, badgeScale = 1) {
    const s = Math.max(0.8, Number(badgeScale) || 1);
    ctx.font = `bold ${Math.round(10 * s)}px "JetBrains Mono", monospace`;
    const textWidth = ctx.measureText(text).width;
    const padX = 6 * s;
    const padY = 3 * s;
    const w = textWidth + padX * 2;
    const h = 16 * s;

    ctx.fillStyle = bgColor;
    ctx.strokeStyle = borderColor || textColor;
    ctx.lineWidth = Math.max(1 * Math.sqrt(s), 1);
    if (isDashed) {
      ctx.setLineDash([3 * s, 2 * s]);
    } else {
      ctx.setLineDash([]);
    }
    roundRect(ctx, x - w / 2, y - h / 2, w, h, 4 * s, true, true);
    ctx.setLineDash([]);

    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y + 1);
  }

export function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }


// Registrar métodos en el contexto global de aplicación
app.exportDiagramSvg = exportDiagramSvg;
app.drawBadge = drawBadge;
app.roundRect = roundRect;
