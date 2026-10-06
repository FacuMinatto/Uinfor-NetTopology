/**
 * NetTopology - Módulo src/core/cables.js
 */

import { state, dom } from '../state/store.js';
import { app } from '../core/appContext.js';
import { DEVICE_ICONS, DEVICE_ICONS_LIGHT, DEVICE_METADATA, CABLE_TYPES, getDeviceIcon, generateSwitchPorts, generateRouterPorts } from '../config/icons.js';
import { STORAGE_PROJECTS_KEY, STORAGE_ACTIVE_ID_KEY, STORAGE_LEGACY_KEY, SHEET_PRESETS, ZONE_COLOR_PALETTES, MAX_HISTORY_STEPS, DEFAULT_GRID_SIZE } from '../config/constants.js';
import { escapeHtml, incrementIp, formatDateForFile, clamp, generateId } from '../utils/helpers.js';
import { getNodeGeometry } from './nodes.js';
import { screenToWorld } from './canvas.js';
import { selectElement, deselectAll, renderInspector } from '../ui/inspector.js';
import { saveState } from '../storage/db.js';



  // ==========================================================================
  // GESTIÓN DE CABLES Y CONEXIONES ENTRE BOCAS
  // ==========================================================================
export function createConnection(fromNodeId, toNodeId, fromPort, toPort, cableType = 'ethernet', networkLabel = '', options = {}) {
    // Evitar duplicar misma conexión
    const exists = state.connections.some(c =>
      (c.fromNodeId === fromNodeId && c.toNodeId === toNodeId && c.fromPort === fromPort && c.toPort === toPort) ||
      (c.fromNodeId === toNodeId && c.toNodeId === fromNodeId && c.fromPort === toPort && c.toPort === fromPort)
    );

    if (exists) {
      alert('Ya existe una conexión entre esas mismas bocas.');
      return null;
    }

    const nodeA = state.nodes.find(n => n.id === fromNodeId);
    const nodeB = state.nodes.find(n => n.id === toNodeId);

    // Auto-asignación inteligente de bocas libres si no fueron especificadas
    if (!fromPort && nodeA && Array.isArray(nodeA.availablePorts)) {
      const usedA = new Set(state.connections.filter(c => c.fromNodeId === fromNodeId || c.toNodeId === fromNodeId).map(c => c.fromNodeId === fromNodeId ? c.fromPort : c.toPort));
      fromPort = nodeA.availablePorts.find(p => !usedA.has(p)) || nodeA.availablePorts[0] || 'Port 1';
    }
    if (!toPort && nodeB && Array.isArray(nodeB.availablePorts)) {
      const usedB = new Set(state.connections.filter(c => c.fromNodeId === toNodeId || c.toNodeId === toNodeId).map(c => c.fromNodeId === toNodeId ? c.fromPort : c.toPort));
      toPort = nodeB.availablePorts.find(p => !usedB.has(p)) || nodeB.availablePorts[0] || 'Port 1';
    }

    const isPowerNode = (n) => n && (['ups', 'termica', 'transfer'].includes(n.type) || (n.type && n.type.startsWith('canal_tension')));
    let resolvedCableType = cableType;
    if (cableType === 'ethernet' && (isPowerNode(nodeA) || isPowerNode(nodeB))) {
      resolvedCableType = 'power';
    }

    // Auto-asignación inteligente de caras para Transfer y Canal de Tensión
    let fromSide = options.fromSide || 'auto';
    let toSide = options.toSide || 'auto';

    const pA = (fromPort || '').toLowerCase();
    const pB = (toPort || '').toLowerCase();

    if (nodeA && nodeA.type === 'transfer') {
      if (pA.includes('canal')) fromSide = 'right';
      else if (pA.includes('salida pc') || pA.includes('pc')) fromSide = 'bottom';
      else fromSide = 'auto'; // S1 / S2 adaptativo según la posición de la UPS
    }
    if (nodeB && nodeB.type === 'transfer') {
      if (pB.includes('canal')) toSide = 'right';
      else if (pB.includes('salida pc') || pB.includes('pc')) toSide = 'bottom';
      else toSide = 'auto'; // S1 / S2 adaptativo según la posición de la UPS
    }
    if (nodeA && (nodeA.type === 'canal_tension' || (nodeA.type && nodeA.type.startsWith('canal_tension')))) {
      if (pA.includes('entrada') || pA.includes('in')) fromSide = 'left';
      else if (pA.includes('toma')) fromSide = 'bottom';
    }
    if (nodeB && (nodeB.type === 'canal_tension' || (nodeB.type && nodeB.type.startsWith('canal_tension')))) {
      if (pB.includes('entrada') || pB.includes('in')) toSide = 'left';
      else if (pB.includes('toma')) toSide = 'bottom';
    }

    // Determinar la capa técnica de la conexión (Lógica por defecto para todo el diagrama de red)
    let resolvedLayer = options.layer;
    if (!resolvedLayer) {
      if (state.activeLayer && state.activeLayer !== 'all') {
        resolvedLayer = state.activeLayer;
      } else if (resolvedCableType === 'power' || isPowerNode(nodeA) || isPowerNode(nodeB)) {
        resolvedLayer = 'power';
      } else {
        resolvedLayer = 'logical';
      }
    }

    const connection = {
      id: 'cable_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      fromNodeId,
      toNodeId,
      fromPort: fromPort || 'Port 1',
      toPort: toPort || 'Port 1',
      cableType: resolvedCableType || (resolvedLayer === 'power' ? 'power' : 'ethernet'),
      layer: resolvedLayer,
      networkLabel: networkLabel || '',
      fromSide: fromSide,
      toSide: toSide
    };

    state.connections.push(connection);
    if (app.broadcastCollabAction) {
      app.broadcastCollabAction('CONNECTION_CREATE', { connection });
    }
    renderConnections();
    selectElement('cable', connection.id);
    saveState();
    return connection;
  }

export function deleteConnection(cableId) {
    state.connections = state.connections.filter(c => c.id !== cableId);
    if (app.broadcastCollabAction) {
      app.broadcastCollabAction('CONNECTION_DELETE', { id: cableId });
    }
    if (state.selection.id === cableId) {
      deselectAll();
    }
    renderConnections();
    saveState();
  }

  // Calcula el punto de anclaje perimetral del dispositivo hacia el punto objetivo
  // (salida directa desde el borde del icono del dispositivo, por la cara más cercana)
export function getNodeEdgeAnchor(node, targetX, targetY) {
    const geo = getNodeGeometry(node);
    const cx = geo.cx;
    const cy = geo.cy;
    const dx = targetX - cx;
    const dy = targetY - cy;

    if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
      return { x: cx, y: cy };
    }

    // Perímetro directo del dispositivo
    const hw = geo.hw;
    const hh = geo.hh;

    let tX = Infinity;
    if (Math.abs(dx) > 1e-6) {
      tX = hw / Math.abs(dx);
    }

    let tY = Infinity;
    if (Math.abs(dy) > 1e-6) {
      tY = hh / Math.abs(dy);
    }

    const t = Math.min(tX, tY);
    if (!Number.isFinite(t) || t <= 0) {
      return { x: cx, y: cy };
    }

    return {
      x: cx + dx * t,
      y: cy + dy * t
    };
  }

  // Identifica el lado del nodo (arriba, abajo, izquierda o derecha) y su vector normal unitario
export function getNodeAnchorSide(node, anchor) {
    const geo = getNodeGeometry(node);
    const cx = geo.cx;
    const cy = geo.cy;
    const hw = geo.hw;
    const hh = geo.hh;

    const dLeft = Math.abs(anchor.x - (cx - hw));
    const dRight = Math.abs(anchor.x - (cx + hw));
    const dTop = Math.abs(anchor.y - (cy - hh));
    const dBottom = Math.abs(anchor.y - (cy + hh));

    const minD = Math.min(dLeft, dRight, dTop, dBottom);
    if (minD === dRight) return { side: 'right', normal: { x: 1, y: 0 } };
    if (minD === dLeft) return { side: 'left', normal: { x: -1, y: 0 } };
    if (minD === dBottom) return { side: 'bottom', normal: { x: 0, y: 1 } };
    return { side: 'top', normal: { x: 0, y: -1 } };
  }

  // Obtiene el punto de anclaje de un cable en un nodo permitiendo cualquier lado ('auto', 'top', 'bottom', 'left', 'right')
  // y cualquier posición a lo largo de dicho borde (evitando estar limitado a solo 4 puntos fijos), con soporte para bornes específicos de equipos
export function getAnchorOnSide(node, side, targetX, targetY, offsetPx = 0, portName = '') {
    const geo = getNodeGeometry(node);
    const cx = geo.cx;
    const cy = geo.cy;
    const hw = geo.hw;
    const hh = geo.hh;
    const pad = geo.pad;
    const scale = node.scale || 1;
    const pName = (portName || '').toLowerCase().trim();

    // 1. Zócalos físicos precisos según el puerto y tipo de dispositivo
    if (node.type === 'canal_tension_7') {
      if (pName.includes('in') || pName.includes('entrada')) {
        return { x: cx - hw, y: cy, side: 'left', normal: { x: -1, y: 0 } };
      }
      for (let i = 1; i <= 7; i++) {
        if (pName.includes(`toma ${i}`) || pName.includes(`t${i}`) || pName.endsWith(` ${i}`)) {
          const xPos = cx + (-85 + (i - 1) * 30) * scale;
          return { x: xPos, y: cy + hh, side: 'bottom', normal: { x: 0, y: 1 } };
        }
      }
    }

    if (node.type === 'canal_tension_5' || node.type === 'canal_tension') {
      if (pName.includes('in') || pName.includes('entrada')) {
        return { x: cx - hw, y: cy, side: 'left', normal: { x: -1, y: 0 } };
      }
      for (let i = 1; i <= 5; i++) {
        if (pName.includes(`toma ${i}`) || pName.includes(`t${i}`) || pName.endsWith(` ${i}`)) {
          const xPos = cx + (-55 + (i - 1) * 30) * scale;
          return { x: xPos, y: cy + hh, side: 'bottom', normal: { x: 0, y: 1 } };
        }
      }
    }

    if (node.type === 'transfer') {
      const isTargetBelow = targetY != null && targetY > (cy + hh * 0.2);
      const isTargetAbove = targetY != null && targetY < (cy - hh * 0.2);

      if (pName.includes('s1') || (pName.includes('ups') && pName.includes('1'))) {
        if (isTargetBelow) {
          return { x: cx - 70 * scale, y: cy + hh, side: 'bottom', normal: { x: 0, y: 1 } };
        } else if (isTargetAbove) {
          return { x: cx - 70 * scale, y: cy - hh, side: 'top', normal: { x: 0, y: -1 } };
        } else {
          return { x: cx - hw, y: cy - 8 * scale, side: 'left', normal: { x: -1, y: 0 } };
        }
      }
      if (pName.includes('s2') || (pName.includes('ups') && pName.includes('2'))) {
        if (isTargetBelow) {
          return { x: cx - 50 * scale, y: cy + hh, side: 'bottom', normal: { x: 0, y: 1 } };
        } else if (isTargetAbove) {
          return { x: cx - 50 * scale, y: cy - hh, side: 'top', normal: { x: 0, y: -1 } };
        } else {
          return { x: cx - hw, y: cy + 8 * scale, side: 'left', normal: { x: -1, y: 0 } };
        }
      }
      if (pName.includes('canal')) {
        return { x: cx + hw, y: cy, side: 'right', normal: { x: 1, y: 0 } };
      }
      if (pName.includes('pc 1') || (pName.includes('salida') && pName.endsWith('1'))) {
        return { x: cx - 20 * scale, y: cy + hh, side: 'bottom', normal: { x: 0, y: 1 } };
      }
      if (pName.includes('pc 2') || (pName.includes('salida') && pName.endsWith('2'))) {
        return { x: cx - 2 * scale, y: cy + hh, side: 'bottom', normal: { x: 0, y: 1 } };
      }
      if (pName.includes('pc 3') || (pName.includes('salida') && pName.endsWith('3'))) {
        return { x: cx + 16 * scale, y: cy + hh, side: 'bottom', normal: { x: 0, y: 1 } };
      }
      if (pName.includes('pc 4') || (pName.includes('salida') && pName.endsWith('4'))) {
        return { x: cx + 34 * scale, y: cy + hh, side: 'bottom', normal: { x: 0, y: 1 } };
      }
    }

    if (node.type === 'ups') {
      const isTargetBelow = targetY != null && targetY > (cy + hh * 0.4);
      const isTargetAbove = targetY != null && targetY < (cy - hh * 0.4);
      const isTargetLeft = targetX != null && targetX < (cx - hw * 0.4);

      if (pName.includes('in') || pName.includes('entrada') || pName.startsWith('e ') || pName.startsWith('e220') || pName.includes('220v')) {
        if (isTargetBelow) {
          return { x: cx, y: cy + hh, side: 'bottom', normal: { x: 0, y: 1 } };
        } else if (isTargetAbove) {
          return { x: cx, y: cy - hh, side: 'top', normal: { x: 0, y: -1 } };
        } else if (isTargetLeft) {
          return { x: cx - hw, y: cy, side: 'left', normal: { x: -1, y: 0 } };
        } else {
          return { x: cx + hw, y: cy, side: 'right', normal: { x: 1, y: 0 } };
        }
      }
      if (pName.includes('out') || pName.includes('salida') || pName.startsWith('s ') || pName.startsWith('s220')) {
        if (isTargetAbove) {
          return { x: cx, y: cy - hh, side: 'top', normal: { x: 0, y: -1 } };
        } else if (isTargetBelow) {
          return { x: cx, y: cy + hh, side: 'bottom', normal: { x: 0, y: 1 } };
        } else if (isTargetLeft) {
          return { x: cx - hw, y: cy, side: 'left', normal: { x: -1, y: 0 } };
        } else {
          return { x: cx + hw, y: cy, side: 'right', normal: { x: 1, y: 0 } };
        }
      }
    }

    if (node.type === 'termica') {
      const isTargetAbove = targetY != null && targetY < (cy - hh * 0.4);
      const isTargetBelow = targetY != null && targetY > (cy + hh * 0.4);
      const isTargetLeft = targetX != null && targetX < (cx - hw * 0.4);

      if (pName.includes('salida') || pName.includes('carga') || pName.startsWith('s ') || pName.startsWith('s220')) {
        if (isTargetAbove) {
          return { x: cx, y: cy - hh, side: 'top', normal: { x: 0, y: -1 } };
        } else if (isTargetBelow) {
          return { x: cx, y: cy + hh, side: 'bottom', normal: { x: 0, y: 1 } };
        } else if (isTargetLeft) {
          return { x: cx - hw, y: cy, side: 'left', normal: { x: -1, y: 0 } };
        } else {
          return { x: cx + hw, y: cy, side: 'right', normal: { x: 1, y: 0 } };
        }
      }
    }

    // Si es un puerto de alimentación eléctrica en un equipo consumidor (Router, Switch, Servidor, PC, DVR)
    if (pName.includes('220v') || pName.includes('aliment')) {
      const isSourceAbove = targetY != null && targetY < (cy - hh * 0.45);
      const isSourceBelow = targetY != null && targetY > (cy + hh * 0.45);
      const isSourceLeft = targetX != null && targetX < (cx - hw * 0.45);
      const isSourceRight = targetX != null && targetX > (cx + hw * 0.45);

      if (isSourceAbove) {
        return { x: cx, y: cy - hh, side: 'top', normal: { x: 0, y: -1 } };
      } else if (isSourceBelow) {
        return { x: cx, y: cy + hh, side: 'bottom', normal: { x: 0, y: 1 } };
      } else if (isSourceLeft) {
        return { x: cx - hw, y: cy, side: 'left', normal: { x: -1, y: 0 } };
      } else if (isSourceRight) {
        return { x: cx + hw, y: cy, side: 'right', normal: { x: 1, y: 0 } };
      }
    }

    if (side === 'right') {
      const rawY = targetY != null ? targetY : cy;
      const clampedY = Math.max(cy - hh + pad, Math.min(cy + hh - pad, rawY + offsetPx));
      return { x: cx + hw, y: clampedY, side: 'right', normal: { x: 1, y: 0 } };
    }
    if (side === 'left') {
      const rawY = targetY != null ? targetY : cy;
      const clampedY = Math.max(cy - hh + pad, Math.min(cy + hh - pad, rawY + offsetPx));
      return { x: cx - hw, y: clampedY, side: 'left', normal: { x: -1, y: 0 } };
    }
    if (side === 'bottom') {
      const rawX = targetX != null ? targetX : cx;
      const clampedX = Math.max(cx - hw + pad, Math.min(cx + hw - pad, rawX + offsetPx));
      return { x: clampedX, y: cy + hh, side: 'bottom', normal: { x: 0, y: 1 } };
    }
    if (side === 'top') {
      const rawX = targetX != null ? targetX : cx;
      const clampedX = Math.max(cx - hw + pad, Math.min(cx + hw - pad, rawX + offsetPx));
      return { x: clampedX, y: cy - hh, side: 'top', normal: { x: 0, y: -1 } };
    }

    // Modo Automático continuo: calcula la intersección en cualquier punto del perímetro (360°)
    const base = getNodeEdgeAnchor(node, targetX, targetY);
    const info = getNodeAnchorSide(node, base);
    let x = base.x;
    let y = base.y;
    if (info.side === 'left' || info.side === 'right') {
      y = Math.max(cy - hh + pad, Math.min(cy + hh - pad, y + offsetPx));
    } else {
      x = Math.max(cx - hw + pad, Math.min(cx + hw - pad, x + offsetPx));
    }
    return { x, y, side: info.side, normal: info.normal };
  }

  // ==========================================================================
  // MOTOR GEOMÉTRICO DE ENRUTAMIENTO DE CABLES Y PUNTOS DE INFLEXIÓN
  // ==========================================================================

  // Genera un trazado SVG y puntos con esquinas redondeadas (radio r px)
export function generateRoundedPath(points, radius = 12) {
    if (!points || points.length === 0) {
      return { pathData: '', points: [], totalLength: 0 };
    }

    // Filtrar puntos duplicados consecutivos
    const cleanPts = [points[0]];
    for (let i = 1; i < points.length; i++) {
      const prev = cleanPts[cleanPts.length - 1];
      if (Math.hypot(points[i].x - prev.x, points[i].y - prev.y) > 0.5) {
        cleanPts.push(points[i]);
      }
    }

    if (cleanPts.length <= 1) {
      const p = cleanPts[0] || { x: 0, y: 0 };
      return { pathData: `M ${p.x} ${p.y}`, points: cleanPts, totalLength: 0 };
    }

    if (cleanPts.length === 2) {
      const p0 = cleanPts[0];
      const p1 = cleanPts[1];
      const len = Math.hypot(p1.x - p0.x, p1.y - p0.y);
      return {
        pathData: `M ${p0.x} ${p0.y} L ${p1.x} ${p1.y}`,
        points: cleanPts,
        totalLength: len
      };
    }

    let d = `M ${cleanPts[0].x} ${cleanPts[0].y}`;
    const sampledPoints = [cleanPts[0]];

    for (let i = 1; i < cleanPts.length - 1; i++) {
      const pPrev = cleanPts[i - 1];
      const pCurr = cleanPts[i];
      const pNext = cleanPts[i + 1];

      const v1 = { x: pPrev.x - pCurr.x, y: pPrev.y - pCurr.y };
      const v2 = { x: pNext.x - pCurr.x, y: pNext.y - pCurr.y };
      const len1 = Math.hypot(v1.x, v1.y);
      const len2 = Math.hypot(v2.x, v2.y);

      if (len1 < 1e-3 || len2 < 1e-3) {
        d += ` L ${pCurr.x} ${pCurr.y}`;
        sampledPoints.push(pCurr);
        continue;
      }

      const r = Math.min(radius, len1 / 2, len2 / 2);
      const startPt = {
        x: pCurr.x + (v1.x / len1) * r,
        y: pCurr.y + (v1.y / len1) * r
      };
      const endPt = {
        x: pCurr.x + (v2.x / len2) * r,
        y: pCurr.y + (v2.y / len2) * r
      };

      d += ` L ${startPt.x} ${startPt.y} Q ${pCurr.x} ${pCurr.y}, ${endPt.x} ${endPt.y}`;
      sampledPoints.push(startPt);
      sampledPoints.push(pCurr);
      sampledPoints.push(endPt);
    }

    const pLast = cleanPts[cleanPts.length - 1];
    d += ` L ${pLast.x} ${pLast.y}`;
    sampledPoints.push(pLast);

    let totalLength = 0;
    for (let i = 1; i < cleanPts.length; i++) {
      totalLength += Math.hypot(cleanPts[i].x - cleanPts[i - 1].x, cleanPts[i].y - cleanPts[i - 1].y);
    }

    return {
      pathData: d,
      points: cleanPts,
      sampledPoints,
      totalLength
    };
  }

  // Dibuja la ruta redondeada en un contexto de Canvas 2D (para exportación PNG idéntica)
export function drawRoundedPathOnCanvas(ctx, points, minX, minY, radius = 12) {
    if (!points || points.length < 2) return;
    const cleanPts = [];
    points.forEach(p => {
      cleanPts.push({ x: p.x - minX, y: p.y - minY });
    });

    ctx.moveTo(cleanPts[0].x, cleanPts[0].y);
    for (let i = 1; i < cleanPts.length - 1; i++) {
      const pPrev = cleanPts[i - 1];
      const pCurr = cleanPts[i];
      const pNext = cleanPts[i + 1];

      const v1 = { x: pPrev.x - pCurr.x, y: pPrev.y - pCurr.y };
      const v2 = { x: pNext.x - pCurr.x, y: pNext.y - pCurr.y };
      const len1 = Math.hypot(v1.x, v1.y);
      const len2 = Math.hypot(v2.x, v2.y);

      if (len1 < 1e-3 || len2 < 1e-3) {
        ctx.lineTo(pCurr.x, pCurr.y);
        continue;
      }

      const r = Math.min(radius, len1 / 2, len2 / 2);
      const startPt = {
        x: pCurr.x + (v1.x / len1) * r,
        y: pCurr.y + (v1.y / len1) * r
      };
      const endPt = {
        x: pCurr.x + (v2.x / len2) * r,
        y: pCurr.y + (v2.y / len2) * r
      };

      ctx.lineTo(startPt.x, startPt.y);
      ctx.quadraticCurveTo(pCurr.x, pCurr.y, endPt.x, endPt.y);
    }
    ctx.lineTo(cleanPts[cleanPts.length - 1].x, cleanPts[cleanPts.length - 1].y);
  }

  // Convierte una secuencia de puntos en un spline Catmull-Rom suave (Cúbica de Bézier continua)
export function generateCatmullRomSpline(points) {
    if (!points || points.length < 2) return { pathData: '', points: [], totalLength: 0 };
    if (points.length === 2) {
      const p0 = points[0], p1 = points[1];
      const len = Math.hypot(p1.x - p0.x, p1.y - p0.y);
      return {
        pathData: `M ${p0.x} ${p0.y} L ${p1.x} ${p1.y}`,
        points: [p0, p1],
        totalLength: len,
        drawOnCanvas: (ctx, minX, minY) => {
          ctx.moveTo(p0.x - minX, p0.y - minY);
          ctx.lineTo(p1.x - minX, p1.y - minY);
        }
      };
    }

    const n = points.length;
    const pStart = {
      x: 2 * points[0].x - points[1].x,
      y: 2 * points[0].y - points[1].y
    };
    const pEnd = {
      x: 2 * points[n - 1].x - points[n - 2].x,
      y: 2 * points[n - 1].y - points[n - 2].y
    };
    const extPts = [pStart, ...points, pEnd];

    let d = `M ${points[0].x} ${points[0].y}`;
    const sampledPoints = [points[0]];
    let totalLength = 0;
    const beziers = [];

    for (let i = 1; i < extPts.length - 2; i++) {
      const p0 = extPts[i - 1];
      const p1 = extPts[i];
      const p2 = extPts[i + 1];
      const p3 = extPts[i + 2];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
      beziers.push({
        cp1x, cp1y, cp2x, cp2y,
        x: p2.x, y: p2.y
      });

      const steps = 14;
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        const pt = getBezierPoint(t, p1.x, p1.y, cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
        const prev = sampledPoints[sampledPoints.length - 1];
        totalLength += Math.hypot(pt.x - prev.x, pt.y - prev.y);
        sampledPoints.push(pt);
      }
    }

    return {
      pathData: d,
      points: sampledPoints,
      totalLength,
      drawOnCanvas: (ctx, minX, minY) => {
        ctx.moveTo(points[0].x - minX, points[0].y - minY);
        for (let b of beziers) {
          ctx.bezierCurveTo(b.cp1x - minX, b.cp1y - minY, b.cp2x - minX, b.cp2y - minY, b.x - minX, b.y - minY);
        }
      }
    };
  }

  // Genera una curva S-Curve suave fluida entre dos equipos sin waypoints
export function computeCurvedSplineNoWaypoints(nodeA, nodeB, conn, offsetIdx) {
    const geoA = getNodeGeometry(nodeA);
    const geoB = getNodeGeometry(nodeB);
    const cxA = geoA.cx;
    const cyA = geoA.cy;
    const cxB = geoB.cx;
    const cyB = geoB.cy;
    const bow = (offsetIdx || 0) * 24;

    const anchorA = getAnchorOnSide(nodeA, conn.fromSide || 'auto', cxB, cyB, bow, conn.fromPort);
    const anchorB = getAnchorOnSide(nodeB, conn.toSide || 'auto', cxA, cyA, -bow, conn.toPort);

    const spanX = Math.max(Math.abs(anchorB.x - anchorA.x) * 0.55, 45);
    const spanY = Math.max(Math.abs(anchorB.y - anchorA.y) * 0.55, 45);

    const cx1 = anchorA.x + anchorA.normal.x * spanX;
    const cy1 = anchorA.y + anchorA.normal.y * spanY + (anchorA.normal.y === 0 ? bow : 0);
    const cx2 = anchorB.x + anchorB.normal.x * spanX;
    const cy2 = anchorB.y + anchorB.normal.y * spanY + (anchorB.normal.y === 0 ? bow : 0);

    const pathData = `M ${anchorA.x} ${anchorA.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${anchorB.x} ${anchorB.y}`;

    const sampled = [anchorA];
    let totalLength = 0;
    const steps = 24;
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      const pt = getBezierPoint(t, anchorA.x, anchorA.y, cx1, cy1, cx2, cy2, anchorB.x, anchorB.y);
      totalLength += Math.hypot(pt.x - sampled[sampled.length - 1].x, pt.y - sampled[sampled.length - 1].y);
      sampled.push(pt);
    }

    return {
      pathData,
      points: sampled,
      totalLength,
      anchorA,
      anchorB,
      drawOnCanvas: (ctx, minX, minY) => {
        ctx.moveTo(anchorA.x - minX, anchorA.y - minY);
        ctx.bezierCurveTo(cx1 - minX, cy1 - minY, cx2 - minX, cy2 - minY, anchorB.x - minX, anchorB.y - minY);
      }
    };
  }

  // Inserta un waypoint interactivo en la posición óptima del cable
export function insertWaypointAtOptimalIndex(conn, clickPoint, nodeA, nodeB) {
    if (!Array.isArray(conn.waypoints)) {
      conn.waypoints = [];
    }

    // Asegurar nodos si no fueron pasados
    if (!nodeA) nodeA = state.nodes.find(n => n.id === conn.fromNodeId);
    if (!nodeB) nodeB = state.nodes.find(n => n.id === conn.toNodeId);

    let targetX = clickPoint ? clickPoint.x : 0;
    let targetY = clickPoint ? clickPoint.y : 0;
    if (state.snapToGrid) {
      targetX = Math.round(targetX / state.gridSize) * state.gridSize;
      targetY = Math.round(targetY / state.gridSize) * state.gridSize;
    }
    const newPt = { x: targetX, y: targetY };

    if (conn.waypoints.length === 0) {
      conn.waypoints.push(newPt);
      return;
    }

    if (!nodeA || !nodeB) {
      conn.waypoints.push(newPt);
      return;
    }

    const curve = computeConnectionCurve(conn, nodeA, nodeB);
    const startPt = { x: curve.x1, y: curve.y1 };
    const endPt = { x: curve.x2, y: curve.y2 };

    const currentChain = [
      startPt,
      ...conn.waypoints,
      endPt
    ];

    let bestIdx = 0;
    let minAddedDist = Infinity;

    for (let i = 0; i < currentChain.length - 1; i++) {
      const p1 = currentChain[i];
      const p2 = currentChain[i + 1];

      const origSeg = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const d1 = Math.hypot(newPt.x - p1.x, newPt.y - p1.y);
      const d2 = Math.hypot(p2.x - newPt.x, p2.y - newPt.y);
      const addedDist = (d1 + d2) - origSeg;

      if (addedDist < minAddedDist) {
        minAddedDist = addedDist;
        bestIdx = i;
      }
    }

    conn.waypoints.splice(bestIdx, 0, newPt);
  }

  // Soporte retrocompatible con llamada por posición
export function insertWaypointAtPoint(conn, nodeA, nodeB, clickPoint) {
    if (nodeA && typeof nodeA.x === 'number' && typeof nodeA.y === 'number' && !clickPoint) {
      insertWaypointAtOptimalIndex(conn, nodeA, nodeB, clickPoint);
    } else {
      insertWaypointAtOptimalIndex(conn, clickPoint, nodeA, nodeB);
    }
  }

  // Desvía tramos ortogonales automáticamente alrededor de otros equipos intermedios
export function avoidObstaclesOnOrthogonalPath(pts, nodeA, nodeB) {
    if (!pts || pts.length < 2) return pts;
    if (!state.nodes || state.nodes.length <= 2) return pts;

    const obstacles = state.nodes.filter(n => n.id !== nodeA.id && n.id !== nodeB.id);
    if (obstacles.length === 0) return pts;

    const obsBoxes = obstacles.map(n => {
      const geo = getNodeGeometry(n);
      const pad = 20;
      return {
        node: n,
        minX: geo.cx - geo.hw - pad,
        maxX: geo.cx + geo.hw + pad,
        minY: geo.cy - geo.hh - pad,
        maxY: geo.cy + geo.hh + pad
      };
    });

    let result = [...pts];
    let hasModified = false;

    for (let i = 0; i < result.length - 1; i++) {
      const p1 = result[i];
      const p2 = result[i + 1];

      const isHoriz = Math.abs(p1.y - p2.y) < 2;
      const isVert = Math.abs(p1.x - p2.x) < 2;
      if (!isHoriz && !isVert) continue;

      for (let o = 0; o < obsBoxes.length; o++) {
        const box = obsBoxes[o];

        if (isHoriz) {
          const segY = p1.y;
          const minX = Math.min(p1.x, p2.x);
          const maxX = Math.max(p1.x, p2.x);

          // Si el tramo horizontal cruza la caja del obstáculo
          if (segY > box.minY && segY < box.maxY && minX < box.maxX && maxX > box.minX) {
            const detourY = Math.abs(segY - box.minY) < Math.abs(segY - box.maxY) ? box.minY : box.maxY;
            const x1 = p1.x < p2.x ? box.minX : box.maxX;
            const x2 = p1.x < p2.x ? box.maxX : box.minX;

            const detour = [
              p1,
              { x: x1, y: segY },
              { x: x1, y: detourY },
              { x: x2, y: detourY },
              { x: x2, y: segY },
              p2
            ];
            result.splice(i, 2, ...detour);
            hasModified = true;
            break;
          }
        } else if (isVert) {
          const segX = p1.x;
          const minY = Math.min(p1.y, p2.y);
          const maxY = Math.max(p1.y, p2.y);

          // Si el tramo vertical cruza la caja del obstáculo
          if (segX > box.minX && segX < box.maxX && minY < box.maxY && maxY > box.minY) {
            const detourX = Math.abs(segX - box.minX) < Math.abs(segX - box.maxX) ? box.minX : box.maxX;
            const y1 = p1.y < p2.y ? box.minY : box.maxY;
            const y2 = p1.y < p2.y ? box.maxY : box.minY;

            const detour = [
              p1,
              { x: segX, y: y1 },
              { x: detourX, y: y1 },
              { x: detourX, y: y2 },
              { x: segX, y: y2 },
              p2
            ];
            result.splice(i, 2, ...detour);
            hasModified = true;
            break;
          }
        }
      }
      if (hasModified) break;
    }

    return result;
  }

  // Calcula los vértices para trazado ortogonal (90°) permitiendo salidas por cualquier lado y posición
export function computeOrthogonalPoints(nodeA, nodeB, conn, offsetIdx) {
    const geoA = getNodeGeometry(nodeA);
    const geoB = getNodeGeometry(nodeB);
    const cxA = geoA.cx;
    const cyA = geoA.cy;
    const cxB = geoB.cx;
    const cyB = geoB.cy;

    const waypoints = Array.isArray(conn.waypoints) ? conn.waypoints : [];
    const parallelShift = (offsetIdx || 0) * 14;

    let anchorA, anchorB;

    if (waypoints.length === 0) {
      let sideA = conn.fromSide || 'auto';
      let sideB = conn.toSide || 'auto';

      // Nodos que deben calcular su cara libre adaptativa sin quedar atascados en viejas asignaciones
      const pLowerFrom = (conn.fromPort || '').toLowerCase();
      const pLowerTo = (conn.toPort || '').toLowerCase();
      if (nodeA.type === 'transfer' && pLowerFrom.includes('s')) sideA = 'auto';
      if (nodeB.type === 'transfer' && pLowerTo.includes('s')) sideB = 'auto';
      if (nodeA.type === 'ups') sideA = 'auto';
      if (nodeB.type === 'ups') sideB = 'auto';
      if (nodeA.type === 'termica') sideA = 'auto';
      if (nodeB.type === 'termica') sideB = 'auto';
      if (pLowerFrom.includes('220v') || pLowerFrom.includes('aliment')) sideA = 'auto';
      if (pLowerTo.includes('220v') || pLowerTo.includes('aliment')) sideB = 'auto';

      anchorA = getAnchorOnSide(nodeA, sideA, cxB, cyB, parallelShift, conn.fromPort);
      anchorB = getAnchorOnSide(nodeB, sideB, cxA, cyA, -parallelShift, conn.toPort);

      // Desplazamiento inteligente y suave para evitar solapamientos entre cables múltiples del mismo equipo
      let spreadShift = 0;
      const sideConnsA = state.connections.filter(c => {
        const isFrom = c.fromNodeId === nodeA.id;
        const isTo = c.toNodeId === nodeA.id;
        if (!isFrom && !isTo) return false;
        const s = isFrom ? (c.fromSide || anchorA.side) : (c.toSide || anchorA.side);
        return s === anchorA.side;
      });

      if (nodeA.type && nodeA.type.startsWith('canal_tension')) {
        for (let i = 1; i <= 7; i++) {
          if (pLowerFrom.includes(`toma ${i}`) || pLowerFrom.includes(`t${i}`) || pLowerFrom.endsWith(` ${i}`)) {
            spreadShift = (i % 2 === 1 ? -1 : 1) * (12 + (i % 4) * 6);
            break;
          }
        }
      } else if (nodeA.type === 'transfer') {
        if (pLowerFrom.includes('pc 1')) spreadShift = -20;
        else if (pLowerFrom.includes('pc 2')) spreadShift = -8;
        else if (pLowerFrom.includes('pc 3')) spreadShift = 8;
        else if (pLowerFrom.includes('pc 4')) spreadShift = 20;
      } else if (sideConnsA.length > 1) {
        // Ordenar conexiones por la posición de su contraparte para que los cables salgan limpios y paralelos
        sideConnsA.sort((ca, cb) => {
          const otherIdA = ca.fromNodeId === nodeA.id ? ca.toNodeId : ca.fromNodeId;
          const otherIdB = cb.fromNodeId === nodeA.id ? cb.toNodeId : cb.fromNodeId;
          const nodeOtherA = state.nodes.find(n => n.id === otherIdA);
          const nodeOtherB = state.nodes.find(n => n.id === otherIdB);
          if (!nodeOtherA || !nodeOtherB) return 0;
          if (anchorA.normal.x !== 0) return (nodeOtherA.y || 0) - (nodeOtherB.y || 0);
          return (nodeOtherA.x || 0) - (nodeOtherB.x || 0);
        });
        const sIdx = sideConnsA.findIndex(c => c.id === conn.id);
        if (sIdx >= 0) {
          spreadShift = (sIdx - (sideConnsA.length - 1) / 2) * 16;
        }
      }

      // Si hay spreadShift, re-anclar anchorA para que nazca en un punto propio a lo largo del lateral
      if (spreadShift !== 0 && !nodeA.type?.startsWith('canal_tension')) {
        anchorA = getAnchorOnSide(nodeA, sideA, cxB, cyB, parallelShift + spreadShift, conn.fromPort);
      }

      let spreadShiftB = 0;
      const sideConnsB = state.connections.filter(c => {
        const isFrom = c.fromNodeId === nodeB.id;
        const isTo = c.toNodeId === nodeB.id;
        if (!isFrom && !isTo) return false;
        const s = isFrom ? (c.fromSide || anchorB.side) : (c.toSide || anchorB.side);
        return s === anchorB.side;
      });
      if (sideConnsB.length > 1) {
        sideConnsB.sort((ca, cb) => {
          const otherIdA = ca.fromNodeId === nodeB.id ? ca.toNodeId : ca.fromNodeId;
          const otherIdB = cb.fromNodeId === nodeB.id ? cb.toNodeId : cb.fromNodeId;
          const nodeOtherA = state.nodes.find(n => n.id === otherIdA);
          const nodeOtherB = state.nodes.find(n => n.id === otherIdB);
          if (!nodeOtherA || !nodeOtherB) return 0;
          if (anchorB.normal.x !== 0) return (nodeOtherA.y || 0) - (nodeOtherB.y || 0);
          return (nodeOtherA.x || 0) - (nodeOtherB.x || 0);
        });
        const sIdxB = sideConnsB.findIndex(c => c.id === conn.id);
        if (sIdxB >= 0) {
          spreadShiftB = (sIdxB - (sideConnsB.length - 1) / 2) * 16;
        }
      }
      if (spreadShiftB !== 0 && !nodeB.type?.startsWith('canal_tension')) {
        anchorB = getAnchorOnSide(nodeB, sideB, cxA, cyA, -parallelShift + spreadShiftB, conn.toPort);
      }

      const pA = { x: anchorA.x, y: anchorA.y };
      const pB = { x: anchorB.x, y: anchorB.y };
      const nA = anchorA.normal;
      const nB = anchorB.normal;

      let pts = [];

      // A) Ambos horizontales
      if (nA.y === 0 && nB.y === 0) {
        if (nA.x !== nB.x) {
          // Enfrentados (ej: A sale derecha, B recibe izquierda)
          const inFront = (pB.x - pA.x) * nA.x > 0;
          if (inFront) {
            // Umbral de alineación directa (Snap-to-Straight):
            // Si la diferencia vertical es leve (<= 14px), lo forzamos 100% recto continuo
            // para evitar los micro-escalones molestos en medio del plano
            if (Math.abs(pA.y - pB.y) <= 14) {
              const commonY = Math.round((pA.y + pB.y) / 2);
              pA.y = commonY;
              pB.y = commonY;
              anchorA.y = commonY;
              anchorB.y = commonY;
              pts = [pA, pB];
            } else {
              const stubLen = 24;
              const xMin = pA.x + nA.x * stubLen;
              const xMax = pB.x + nB.x * stubLen;
              let midX = (pA.x + pB.x) / 2 + parallelShift + spreadShift;
              if (nA.x > 0) {
                midX = Math.max(xMin, Math.min(xMax, midX));
              } else {
                midX = Math.min(xMin, Math.max(xMax, midX));
              }
              if (state.snapToGrid) midX = Math.round(midX / state.gridSize) * state.gridSize;
              pts = [pA, { x: midX, y: pA.y }, { x: midX, y: pB.y }, pB];
            }
          } else {
            // De espaldas / uno detrás del otro: rodeo limpio perpendicular
            const stubA = pA.x + nA.x * 24;
            const stubB = pB.x + nB.x * 24;
            const turnY = pB.y >= pA.y ? Math.max(pA.y + 36, pB.y + 36) : Math.min(pA.y - 36, pB.y - 36);
            pts = [pA, { x: stubA, y: pA.y }, { x: stubA, y: turnY }, { x: stubB, y: turnY }, { x: stubB, y: pB.y }, pB];
          }
        } else {
          // Misma dirección horizontal (U-bend)
          const turnX = nA.x > 0 ? Math.max(pA.x, pB.x) + 28 + Math.abs(parallelShift) + Math.abs(spreadShift) : Math.min(pA.x, pB.x) - 28 - Math.abs(parallelShift) - Math.abs(spreadShift);
          pts = [pA, { x: turnX, y: pA.y }, { x: turnX, y: pB.y }, pB];
        }
      }
      // B) Ambos verticales
      else if (nA.x === 0 && nB.x === 0) {
        if (nA.y !== nB.y) {
          // Enfrentados (ej: A sale abajo, B recibe arriba)
          const inFront = (pB.y - pA.y) * nA.y > 0;
          if (inFront) {
            // Umbral de alineación directa (Snap-to-Straight):
            if (Math.abs(pA.x - pB.x) <= 14) {
              const commonX = Math.round((pA.x + pB.x) / 2);
              pA.x = commonX;
              pB.x = commonX;
              anchorA.x = commonX;
              anchorB.x = commonX;
              pts = [pA, pB];
            } else {
              const stubLen = 24;
              const yMin = pA.y + nA.y * stubLen;
              const yMax = pB.y + nB.y * stubLen;
              let midY = (pA.y + pB.y) / 2 + parallelShift + spreadShift;
              if (nA.y > 0) {
                midY = Math.max(yMin, Math.min(yMax, midY));
              } else {
                midY = Math.min(yMin, Math.max(yMax, midY));
              }
              if (state.snapToGrid) midY = Math.round(midY / state.gridSize) * state.gridSize;
              pts = [pA, { x: pA.x, y: midY }, { x: pB.x, y: midY }, pB];
            }
          } else {
            // De espaldas / uno detrás del otro: rodeo limpio perpendicular
            const stubA = pA.y + nA.y * 24;
            const stubB = pB.y + nB.y * 24;
            const turnX = pB.x >= pA.x ? Math.max(pA.x + 36, pB.x + 36) : Math.min(pA.x - 36, pB.x - 36);
            pts = [pA, { x: pA.x, y: stubA }, { x: turnX, y: stubA }, { x: turnX, y: stubB }, { x: pB.x, y: stubB }, pB];
          }
        } else {
          // Misma dirección vertical (U-bend)
          const turnY = nA.y > 0 ? Math.max(pA.y, pB.y) + 28 + Math.abs(parallelShift) + Math.abs(spreadShift) : Math.min(pA.y, pB.y) - 28 - Math.abs(parallelShift) - Math.abs(spreadShift);
          pts = [pA, { x: pA.x, y: turnY }, { x: pB.x, y: turnY }, pB];
        }
      }
      // C) Perpendiculares: A horizontal, B vertical
      else if (nA.y === 0 && nB.x === 0) {
        const canL = (pB.x - pA.x) * nA.x >= 12 && (pA.y - pB.y) * nB.y >= 12;
        if (canL) {
          pts = [pA, { x: pB.x, y: pA.y }, pB];
        } else {
          const stubA = pA.x + nA.x * 24;
          const stubB = pB.y + nB.y * 24;
          pts = [pA, { x: stubA, y: pA.y }, { x: stubA, y: stubB }, { x: pB.x, y: stubB }, pB];
        }
      }
      // D) Perpendiculares: A vertical, B horizontal
      else {
        const canL = (pB.y - pA.y) * nA.y >= 12 && (pA.x - pB.x) * nB.x >= 12;
        if (canL) {
          pts = [pA, { x: pA.x, y: pB.y }, pB];
        } else {
          const stubA = pA.y + nA.y * 24;
          const stubB = pB.x + nB.x * 24;
          pts = [pA, { x: pA.x, y: stubA }, { x: stubB, y: stubA }, { x: stubB, y: pB.y }, pB];
        }
      }

      pts = avoidObstaclesOnOrthogonalPath(pts, nodeA, nodeB);
      return { pts, anchorA, anchorB };
    }

    // Caso con waypoints manuales:
    const firstWp = waypoints[0];
    const lastWp = waypoints[waypoints.length - 1];

    let sideA = conn.fromSide || 'auto';
    let sideB = conn.toSide || 'auto';
    if (nodeA.type === 'transfer' && (conn.fromPort || '').toLowerCase().includes('s')) sideA = 'auto';
    if (nodeB.type === 'transfer' && (conn.toPort || '').toLowerCase().includes('s')) sideB = 'auto';
    if (nodeA.type === 'ups') sideA = 'auto';
    if (nodeB.type === 'ups') sideB = 'auto';
    if (nodeA.type === 'termica') sideA = 'auto';
    if (nodeB.type === 'termica') sideB = 'auto';

    anchorA = getAnchorOnSide(nodeA, sideA, firstWp.x, firstWp.y, 0, conn.fromPort);
    anchorB = getAnchorOnSide(nodeB, sideB, lastWp.x, lastWp.y, 0, conn.toPort);

    const fullChain = [anchorA, ...waypoints, anchorB];
    const rawOrtho = [fullChain[0]];

    for (let i = 0; i < fullChain.length - 1; i++) {
      const p1 = fullChain[i];
      const p2 = fullChain[i + 1];

      if (Math.abs(p1.x - p2.x) < 4 || Math.abs(p1.y - p2.y) < 4) {
        rawOrtho.push({ x: p2.x, y: p2.y });
      } else {
        let elbow;
        if (i === 0) {
          // El primer tramo respeta el vector normal de salida de anchorA
          if (anchorA.normal.y === 0) {
            elbow = { x: p2.x, y: p1.y };
          } else {
            elbow = { x: p1.x, y: p2.y };
          }
        } else if (i === fullChain.length - 2) {
          // El último tramo respeta el vector normal de entrada hacia anchorB
          if (anchorB.normal.y === 0) {
            elbow = { x: p1.x, y: p2.y };
          } else {
            elbow = { x: p2.x, y: p1.y };
          }
        } else {
          const prevPt = rawOrtho[rawOrtho.length - 1];
          const wasHorizontal = Math.abs(prevPt.y - p1.y) < 2;
          if (wasHorizontal) {
            elbow = { x: p1.x, y: p2.y };
          } else {
            elbow = { x: p2.x, y: p1.y };
          }
        }
        rawOrtho.push(elbow);
        rawOrtho.push({ x: p2.x, y: p2.y });
      }
    }

    // Simplificar vértices colineales consecutivos
    const cleanOrtho = [rawOrtho[0]];
    for (let i = 1; i < rawOrtho.length - 1; i++) {
      const prev = cleanOrtho[cleanOrtho.length - 1];
      const curr = rawOrtho[i];
      const next = rawOrtho[i + 1];

      const isColinearX = Math.abs(prev.x - curr.x) < 2 && Math.abs(curr.x - next.x) < 2;
      const isColinearY = Math.abs(prev.y - curr.y) < 2 && Math.abs(curr.y - next.y) < 2;

      if (!isColinearX && !isColinearY) {
        cleanOrtho.push(curr);
      }
    }
    cleanOrtho.push(rawOrtho[rawOrtho.length - 1]);

    return { pts: cleanOrtho, anchorA, anchorB };
  }

  // Obtiene un punto a lo largo de una polilínea a una distancia dada
export function getPointAlongPolyline(points, distPx, fromEnd = false) {
    if (!points || points.length === 0) return { x: 0, y: 0 };
    if (points.length === 1) return { x: points[0].x, y: points[0].y };

    let totalLen = 0;
    const segLens = [];
    for (let i = 1; i < points.length; i++) {
      const d = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
      segLens.push(d);
      totalLen += d;
    }

    if (totalLen < 1e-3) return { x: points[0].x, y: points[0].y };

    const effectiveDist = Math.min(distPx, totalLen * 0.45);
    const targetDist = fromEnd ? (totalLen - effectiveDist) : effectiveDist;

    let currentDist = 0;
    for (let i = 0; i < segLens.length; i++) {
      const slen = segLens[i];
      if (currentDist + slen >= targetDist) {
        const frac = slen > 0 ? (targetDist - currentDist) / slen : 0;
        return {
          x: points[i].x + (points[i + 1].x - points[i].x) * frac,
          y: points[i].y + (points[i + 1].y - points[i].y) * frac
        };
      }
      currentDist += slen;
    }
    return fromEnd ? { x: points[points.length - 1].x, y: points[points.length - 1].y } : { x: points[0].x, y: points[0].y };
  }

  // Calcula la trayectoria (ortogonal, curva suave o recta) para cables entre dos equipos
export function computeConnectionCurve(conn, nodeA, nodeB, pairInfo = null) {
    const geoA = getNodeGeometry(nodeA);
    const geoB = getNodeGeometry(nodeB);
    const cxA = geoA.cx;
    const cyA = geoA.cy;
    const cxB = geoB.cx;
    const cyB = geoB.cy;

    let totalInPair, idxInPair;
    if (pairInfo) {
      totalInPair = pairInfo.totalInPair;
      idxInPair = pairInfo.idxInPair;
    } else {
      const pairConns = state.connections.filter(c =>
        (c.fromNodeId === nodeA.id && c.toNodeId === nodeB.id) ||
        (c.fromNodeId === nodeB.id && c.toNodeId === nodeA.id)
      );
      totalInPair = pairConns.length;
      idxInPair = pairConns.findIndex(c => c.id === conn.id);
    }
    const offsetIdx = totalInPair > 1 ? (idxInPair - (totalInPair - 1) / 2) : 0;

    const mode = conn.routingMode || state.defaultRoutingMode || 'orthogonal';
    const waypoints = Array.isArray(conn.waypoints) ? conn.waypoints : [];
    const hasWaypoints = waypoints.length > 0;

    // 1. MODO ORTOGONAL (90° en escalón con esquinas redondeadas)
    if (mode === 'orthogonal') {
      const { pts, anchorA, anchorB } = computeOrthogonalPoints(nodeA, nodeB, conn, offsetIdx);
      const rounded = generateRoundedPath(pts, 12);
      return {
        x1: anchorA.x,
        y1: anchorA.y,
        x2: anchorB.x,
        y2: anchorB.y,
        pathData: rounded.pathData,
        points: rounded.points,
        pts: pts,
        totalLength: rounded.totalLength,
        routingMode: 'orthogonal',
        waypoints,
        totalInPair,
        drawOnCanvas: (ctx, minX, minY) => drawRoundedPathOnCanvas(ctx, pts, minX, minY, 12)
      };
    }

    // 2. MODO CURVO (S-Curve o Catmull-Rom Spline continuo)
    if (mode === 'curved') {
      if (!hasWaypoints) {
        const res = computeCurvedSplineNoWaypoints(nodeA, nodeB, conn, offsetIdx);
        return {
          x1: res.anchorA.x,
          y1: res.anchorA.y,
          x2: res.anchorB.x,
          y2: res.anchorB.y,
          pathData: res.pathData,
          points: res.points,
          totalLength: res.totalLength,
          routingMode: 'curved',
          waypoints: [],
          totalInPair,
          drawOnCanvas: res.drawOnCanvas
        };
      }
      let sideA = conn.fromSide || 'auto';
      let sideB = conn.toSide || 'auto';
      if (nodeA.type === 'transfer' && (conn.fromPort || '').toLowerCase().includes('s')) sideA = 'auto';
      if (nodeB.type === 'transfer' && (conn.toPort || '').toLowerCase().includes('s')) sideB = 'auto';
      if (nodeA.type === 'ups') sideA = 'auto';
      if (nodeB.type === 'ups') sideB = 'auto';
      if (nodeA.type === 'termica') sideA = 'auto';
      if (nodeB.type === 'termica') sideB = 'auto';

      const anchorA = getAnchorOnSide(nodeA, sideA, waypoints[0].x, waypoints[0].y, 0, conn.fromPort);
      const anchorB = getAnchorOnSide(nodeB, sideB, waypoints[waypoints.length - 1].x, waypoints[waypoints.length - 1].y, 0, conn.toPort);
      const spline = generateCatmullRomSpline([anchorA, ...waypoints, anchorB]);
      return {
        x1: anchorA.x,
        y1: anchorA.y,
        x2: anchorB.x,
        y2: anchorB.y,
        pathData: spline.pathData,
        points: spline.points,
        totalLength: spline.totalLength,
        routingMode: 'curved',
        waypoints,
        totalInPair,
        drawOnCanvas: spline.drawOnCanvas
      };
    }

    // 3. MODO RECTO (Líneas rectas directas)
    const target1 = hasWaypoints ? waypoints[0] : { x: cxB, y: cyB };
    const target2 = hasWaypoints ? waypoints[waypoints.length - 1] : { x: cxA, y: cyA };
    let sideA = conn.fromSide || 'auto';
    let sideB = conn.toSide || 'auto';
    if (nodeA.type === 'transfer' && (conn.fromPort || '').toLowerCase().includes('s')) sideA = 'auto';
    if (nodeB.type === 'transfer' && (conn.toPort || '').toLowerCase().includes('s')) sideB = 'auto';
    if (nodeA.type === 'ups') sideA = 'auto';
    if (nodeB.type === 'ups') sideB = 'auto';
    if (nodeA.type === 'termica') sideA = 'auto';
    if (nodeB.type === 'termica') sideB = 'auto';

    let anchorA = getAnchorOnSide(nodeA, sideA, target1.x, target1.y, 0, conn.fromPort);
    let anchorB = getAnchorOnSide(nodeB, sideB, target2.x, target2.y, 0, conn.toPort);

    if (!hasWaypoints && offsetIdx !== 0) {
      const baseDx = cxB - cxA;
      const baseDy = cyB - cyA;
      const baseDist = Math.max(Math.hypot(baseDx, baseDy), 1);
      const nx = -baseDy / baseDist;
      const ny = baseDx / baseDist;
      const shift = offsetIdx * 12;
      anchorA = { x: anchorA.x + nx * shift, y: anchorA.y + ny * shift };
      anchorB = { x: anchorB.x + nx * shift, y: anchorB.y + ny * shift };
    }

    const pts = [anchorA, ...waypoints, anchorB];
    let pathData = `M ${pts[0].x} ${pts[0].y}`;
    let totalLength = 0;
    for (let i = 1; i < pts.length; i++) {
      pathData += ` L ${pts[i].x} ${pts[i].y}`;
      totalLength += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    }

    return {
      x1: anchorA.x,
      y1: anchorA.y,
      x2: anchorB.x,
      y2: anchorB.y,
      pathData,
      points: pts,
      pts: pts,
      totalLength,
      routingMode: 'straight',
      waypoints,
      totalInPair,
      drawOnCanvas: (ctx, minX, minY) => {
        ctx.moveTo(pts[0].x - minX, pts[0].y - minY);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x - minX, pts[i].y - minY);
        }
      }
    };
  }

  // Obtiene un punto a lo largo de un cable a una distancia específica en píxeles
export function getPointAlongCable(curve, distPx, fromEnd = false) {
    if (curve && Array.isArray(curve.points) && curve.points.length > 0) {
      return getPointAlongPolyline(curve.points, distPx, fromEnd);
    }
    return fromEnd ? { x: curve.x2, y: curve.y2 } : { x: curve.x1, y: curve.y1 };
  }

  // Obtiene punto x, y de una curva de Bézier cúbica para t entre 0 y 1
export function getBezierPoint(t, p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y) {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;

    const x = uuu * p0x + 3 * uu * t * p1x + 3 * u * tt * p2x + ttt * p3x;
    const y = uuu * p0y + 3 * uu * t * p1y + 3 * u * tt * p2y + ttt * p3y;
    return { x, y };
  }

  // Sistema de Hitbox y Resolución de Colisiones para etiquetas de bocas y redes
export function resolveLabelCollisions(badges) {
    if (!badges || badges.length === 0) return;

    // Si el usuario está arrastrando nodos activamente, aplicar posiciones inmediatas sin bucles N^2 para 60 FPS
    if (state.isDraggingNode) {
      badges.forEach(b => {
        if (Number.isFinite(b.x) && Number.isFinite(b.y)) {
          b.el.style.left = `${Math.round(b.x)}px`;
          b.el.style.top = `${Math.round(b.y)}px`;
        }
      });
      return;
    }

    // Precalcular cajas delimitadoras de los nodos una sola vez
    const nodeBoxes = state.nodes.map(node => {
      const scale = node.scale || 1;
      const geo = getNodeGeometry(node);
      const ncx = geo.cx;
      const ncy = geo.cy;
      const hw = (geo.hw + 20);
      const hhTop = (geo.hh + 10);
      const hhBottom = (geo.hh + (node.ip ? 56 : 32));
      return {
        minXBase: ncx - hw,
        maxXBase: ncx + hw,
        minYBase: ncy - hhTop,
        maxYBase: ncy + hhBottom
      };
    });

    const maxIterations = 4;
    for (let iter = 0; iter < maxIterations; iter++) {
      let hadCollision = false;

      // 1. Badge vs Badge (evitar que los números de puertos se pisen entre sí)
      for (let i = 0; i < badges.length; i++) {
        const b1 = badges[i];
        if (b1.isManualOffset) continue;
        for (let j = i + 1; j < badges.length; j++) {
          const b2 = badges[j];
          if (b2.isManualOffset) continue;

          const minDx = (b1.w + b2.w) / 2 + 6;
          const minDy = (b1.h + b2.h) / 2 + 4;

          const dx = b2.x - b1.x;
          const dy = b2.y - b1.y;

          if (Math.abs(dx) < minDx && Math.abs(dy) < minDy) {
            hadCollision = true;
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

      // 2. Badge vs Cajas Reales de Nodos (evitar que los textos tapen el icono, nombre o IP del nodo)
      for (let i = 0; i < badges.length; i++) {
        const b = badges[i];
        if (b.isManualOffset) continue;
        const halfW = (b.w / 2) + 6;
        const halfH = (b.h / 2) + 6;

        for (let k = 0; k < nodeBoxes.length; k++) {
          const box = nodeBoxes[k];
          const minX = box.minXBase - halfW;
          const maxX = box.maxXBase + halfW;
          const minY = box.minYBase - halfH;
          const maxY = box.maxYBase + halfH;

          // Si el badge está dentro de la caja del nodo, expulsarlo al borde libre más próximo
          if (b.x > minX && b.x < maxX && b.y > minY && b.y < maxY) {
            hadCollision = true;
            const dLeft = b.x - minX;
            const dRight = maxX - b.x;
            const dTop = b.y - minY;
            const dBottom = maxY - b.y;

            const minShift = Math.min(dLeft, dRight, dTop, dBottom);
            if (minShift === dTop) {
              b.y = minY;
            } else if (minShift === dBottom) {
              b.y = maxY;
            } else if (minShift === dLeft) {
              b.x = minX;
            } else {
              b.x = maxX;
            }
          }
        }
      }

      // Si en esta pasada no hubo colisiones, no hace falta seguir iterando
      if (!hadCollision) break;
    }

    // Aplicar las coordenadas finales a los elementos del DOM de forma segura
    badges.forEach(b => {
      if (Number.isFinite(b.x) && Number.isFinite(b.y)) {
        b.el.style.left = `${Math.round(b.x)}px`;
        b.el.style.top = `${Math.round(b.y)}px`;
      }
    });
  }

  // ==========================================================================
  // MOTOR DE CRUCES Y PUENTES DE CABLE (CABLE JUMPS / SCHEMATIC WIRE BRIDGES)
  // ==========================================================================

export function getLineSegmentIntersection(p1, p2, p3, p4) {
    const d1x = p2.x - p1.x;
    const d1y = p2.y - p1.y;
    const d2x = p4.x - p3.x;
    const d2y = p4.y - p3.y;

    const len1 = Math.hypot(d1x, d1y);
    const len2 = Math.hypot(d2x, d2y);
    if (len1 < 20 || len2 < 16) return null; // Segmentos demasiado cortos para un puente limpio

    const cross = d1x * d2y - d1y * d2x;
    if (Math.abs(cross) < 1e-5) return null; // Paralelas o colineales

    const dx = p3.x - p1.x;
    const dy = p3.y - p1.y;

    const t = (dx * d2y - dy * d2x) / cross;
    const u = (dx * d1y - dy * d1x) / cross;

    // Distancia mínima desde los extremos en píxeles reales para no rozar esquinas ni bornes
    const minDist1 = 12;
    const dist1 = t * len1;
    const dist2 = u * len2;

    if (dist1 >= minDist1 && (len1 - dist1) >= minDist1 && dist2 >= 8 && (len2 - dist2) >= 8) {
      return {
        x: p1.x + t * d1x,
        y: p1.y + t * d1y,
        t,
        u
      };
    }
    return null;
  }

export function isPointNearAnyNode(x, y, minDist = 44) {
    for (let i = 0; i < state.nodes.length; i++) {
      const n = state.nodes[i];
      const geo = getNodeGeometry(n);
      const cx = geo.cx;
      const cy = geo.cy;
      const effectiveDist = Math.max(minDist, geo.hw + 8);
      if (Math.hypot(x - cx, y - cy) < effectiveDist) {
        return true;
      }
    }
    return false;
  }

export function getSegmentsFromCurve(curve) {
    let pts = [];
    if (Array.isArray(curve.pts) && curve.pts.length >= 2) {
      pts = curve.pts;
    } else if (Array.isArray(curve.points) && curve.points.length >= 2) {
      pts = curve.points;
    } else {
      pts = [{ x: curve.x1, y: curve.y1 }, { x: curve.x2, y: curve.y2 }];
    }

    const segments = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      if (len > 0.5) {
        segments.push({ p1, p2, len, index: i });
      }
    }
    return { pts, segments };
  }

export function rebuildCurveWithJumps(curve, cleanPts, segmentsWithJumps, jumpRadius = 7.5) {
    if (!cleanPts || cleanPts.length < 2) return;

    const isOrthogonal = (curve.routingMode === 'orthogonal');
    const cornerRadius = isOrthogonal ? 12 : 0;

    // Precalcular las esquinas redondeadas
    const corners = [];
    for (let i = 1; i < cleanPts.length - 1; i++) {
      const pPrev = cleanPts[i - 1];
      const pCurr = cleanPts[i];
      const pNext = cleanPts[i + 1];

      const v1 = { x: pPrev.x - pCurr.x, y: pPrev.y - pCurr.y };
      const v2 = { x: pNext.x - pCurr.x, y: pNext.y - pCurr.y };
      const len1 = Math.hypot(v1.x, v1.y);
      const len2 = Math.hypot(v2.x, v2.y);

      if (len1 < 1e-3 || len2 < 1e-3 || cornerRadius <= 0) {
        corners.push({ startPt: pCurr, endPt: pCurr, pCurr, isTurn: false });
        continue;
      }

      const r = Math.min(cornerRadius, len1 / 2, len2 / 2);
      const startPt = {
        x: pCurr.x + (v1.x / len1) * r,
        y: pCurr.y + (v1.y / len1) * r
      };
      const endPt = {
        x: pCurr.x + (v2.x / len2) * r,
        y: pCurr.y + (v2.y / len2) * r
      };
      corners.push({ startPt, endPt, pCurr, isTurn: true });
    }

    let d = `M ${cleanPts[0].x} ${cleanPts[0].y}`;
    const drawSteps = [];
    drawSteps.push({ type: 'move', x: cleanPts[0].x, y: cleanPts[0].y });

    for (let i = 0; i < cleanPts.length - 1; i++) {
      const segInfo = segmentsWithJumps[i];
      const sStart = (i === 0) ? cleanPts[0] : corners[i - 1].endPt;
      const sEnd = (i === cleanPts.length - 2) ? cleanPts[cleanPts.length - 1] : corners[i].startPt;

      const segDx = sEnd.x - sStart.x;
      const segDy = sEnd.y - sStart.y;
      const straightLen = Math.hypot(segDx, segDy);

      if (straightLen > 1) {
        const ux = segDx / straightLen;
        const uy = segDy / straightLen;

        // Normal orientada uniformemente (arriba para horizontal, derecha para vertical)
        let nx = -uy;
        let ny = ux;
        if (Math.abs(ux) >= Math.abs(uy)) {
          if (ny > 0) { nx = -nx; ny = -ny; }
        } else {
          if (nx < 0) { nx = -nx; ny = -ny; }
        }
        const sweepFlag = (ux * ny - uy * nx) > 0 ? 1 : 0;

        let validJumps = [];
        if (segInfo && Array.isArray(segInfo.jumps) && segInfo.jumps.length > 0) {
          segInfo.jumps.forEach(jp => {
            const dist = (jp.x - sStart.x) * ux + (jp.y - sStart.y) * uy;
            if (dist >= (jumpRadius + 4) && dist <= (straightLen - jumpRadius - 4)) {
              validJumps.push({
                x: sStart.x + dist * ux,
                y: sStart.y + dist * uy,
                dist
              });
            }
          });

          validJumps.sort((a, b) => a.dist - b.dist);

          const filtered = [];
          for (let k = 0; k < validJumps.length; k++) {
            if (filtered.length === 0 || (validJumps[k].dist - filtered[filtered.length - 1].dist) >= (jumpRadius * 2 + 4)) {
              filtered.push(validJumps[k]);
            }
          }
          validJumps = filtered;
        }

        if (validJumps.length === 0) {
          d += ` L ${sEnd.x} ${sEnd.y}`;
          drawSteps.push({ type: 'line', x: sEnd.x, y: sEnd.y });
        } else {
          for (let k = 0; k < validJumps.length; k++) {
            const jp = validJumps[k];
            const aStartX = jp.x - jumpRadius * ux;
            const aStartY = jp.y - jumpRadius * uy;
            const aEndX = jp.x + jumpRadius * ux;
            const aEndY = jp.y + jumpRadius * uy;

            d += ` L ${Math.round(aStartX * 10) / 10} ${Math.round(aStartY * 10) / 10}`;
            d += ` A ${jumpRadius} ${jumpRadius} 0 0 ${sweepFlag} ${Math.round(aEndX * 10) / 10} ${Math.round(aEndY * 10) / 10}`;

            drawSteps.push({ type: 'line', x: aStartX, y: aStartY });
            drawSteps.push({
              type: 'arc',
              ctrlX: jp.x + 1.8 * jumpRadius * nx,
              ctrlY: jp.y + 1.8 * jumpRadius * ny,
              endX: aEndX,
              endY: aEndY
            });
          }
          d += ` L ${sEnd.x} ${sEnd.y}`;
          drawSteps.push({ type: 'line', x: sEnd.x, y: sEnd.y });
        }
      }

      if (i < cleanPts.length - 2) {
        const c = corners[i];
        if (c.isTurn) {
          d += ` Q ${c.pCurr.x} ${c.pCurr.y}, ${c.endPt.x} ${c.endPt.y}`;
          drawSteps.push({
            type: 'corner',
            ctrlX: c.pCurr.x,
            ctrlY: c.pCurr.y,
            endX: c.endPt.x,
            endY: c.endPt.y
          });
        }
      }
    }

    curve.pathData = d;
    curve.drawOnCanvas = (ctx, minX, minY) => {
      drawSteps.forEach(step => {
        if (step.type === 'move') {
          ctx.moveTo(step.x - minX, step.y - minY);
        } else if (step.type === 'line') {
          ctx.lineTo(step.x - minX, step.y - minY);
        } else if (step.type === 'arc' || step.type === 'corner') {
          ctx.quadraticCurveTo(step.ctrlX - minX, step.ctrlY - minY, step.endX - minX, step.endY - minY);
        }
      });
    };
  }

export function applyCableBridgesToCurves(activeCurves) {
    if (!state.cableBridgesEnabled || state.isDraggingNode || activeCurves.length < 2) return;

    // 1. Pre-calcular cajas delimitadoras de los nodos (con margen de 14px)
    const nodeBoxes = state.nodes.map(n => {
      const geo = getNodeGeometry(n);
      return {
        minX: geo.cx - geo.hw - 14,
        maxX: geo.cx + geo.hw + 14,
        minY: geo.cy - geo.hh - 14,
        maxY: geo.cy + geo.hh + 14
      };
    });

    // 2. Pre-calcular cajas de exclusión para todos los badges de bocas y etiquetas visibles
    const badgeBoxes = [];
    activeCurves.forEach(({ conn, curve }) => {
      const dist = curve.totalLength || 100;
      const offsetDist = Math.min(28, Math.max(dist * 0.25, 14));
      const offA = conn.portAOffset || { x: 0, y: 0 };
      const offB = conn.portBOffset || { x: 0, y: 0 };
      const offMid = conn.labelOffset || { x: 0, y: 0 };

      if (conn.fromPort && conn.fromPort.trim() !== '') {
        const pA = getPointAlongCable(curve, offsetDist, false);
        const bx = pA.x + (offA.x || 0);
        const by = pA.y + (offA.y || 0);
        badgeBoxes.push({ minX: bx - 22, maxX: bx + 22, minY: by - 14, maxY: by + 14 });
      }
      if (conn.toPort && conn.toPort.trim() !== '') {
        const pB = getPointAlongCable(curve, offsetDist, true);
        const bx = pB.x + (offB.x || 0);
        const by = pB.y + (offB.y || 0);
        badgeBoxes.push({ minX: bx - 22, maxX: bx + 22, minY: by - 14, maxY: by + 14 });
      }
      if (conn.networkLabel && conn.networkLabel.trim() !== '') {
        const pMid = getPointAlongCable(curve, dist * 0.5, false);
        const bx = pMid.x + (offMid.x || 0);
        const by = pMid.y + (offMid.y || 0);
        badgeBoxes.push({ minX: bx - 30, maxX: bx + 30, minY: by - 16, maxY: by + 16 });
      }
    });

    const isIntersectionBlocked = (x, y) => {
      for (let i = 0; i < nodeBoxes.length; i++) {
        const box = nodeBoxes[i];
        if (x >= box.minX && x <= box.maxX && y >= box.minY && y <= box.maxY) return true;
      }
      for (let i = 0; i < badgeBoxes.length; i++) {
        const b = badgeBoxes[i];
        if (x >= b.minX && x <= b.maxX && y >= b.minY && y <= b.maxY) return true;
      }
      return false;
    };

    const curveMeta = activeCurves.map(item => {
      const segInfo = getSegmentsFromCurve(item.curve);
      return {
        item,
        pts: segInfo.pts,
        segments: segInfo.segments.map(s => ({ ...s, jumps: [] }))
      };
    });

    const jumpRadius = 7.5;

    // Evaluación de intersección entre todos los pares con AABB pre-filtro y asignación canónica
    for (let j = 0; j < curveMeta.length; j++) {
      const metaJ = curveMeta[j];
      for (let k = j + 1; k < curveMeta.length; k++) {
        const metaK = curveMeta[k];

        for (let sj = 0; sj < metaJ.segments.length; sj++) {
          const segJ = metaJ.segments[sj];
          const minXJ = Math.min(segJ.p1.x, segJ.p2.x);
          const maxXJ = Math.max(segJ.p1.x, segJ.p2.x);
          const minYJ = Math.min(segJ.p1.y, segJ.p2.y);
          const maxYJ = Math.max(segJ.p1.y, segJ.p2.y);

          for (let sk = 0; sk < metaK.segments.length; sk++) {
            const segK = metaK.segments[sk];
            const minXK = Math.min(segK.p1.x, segK.p2.x);
            const maxXK = Math.max(segK.p1.x, segK.p2.x);
            const minYK = Math.min(segK.p1.y, segK.p2.y);
            const maxYK = Math.max(segK.p1.y, segK.p2.y);

            // Filtro rápido AABB
            if (maxXJ < minXK || minXJ > maxXK || maxYJ < minYK || minYJ > maxYK) {
              continue;
            }

            const hit = getLineSegmentIntersection(segJ.p1, segJ.p2, segK.p1, segK.p2);
            if (hit) {
              if (isIntersectionBlocked(hit.x, hit.y)) continue;

              // Regla canónica esquemática: el cable vertical salta sobre el horizontal
              const isJVert = Math.abs(segJ.p1.x - segJ.p2.x) < 2;
              const isKVert = Math.abs(segK.p1.x - segK.p2.x) < 2;
              const isJHoriz = Math.abs(segJ.p1.y - segJ.p2.y) < 2;
              const isKHoriz = Math.abs(segK.p1.y - segK.p2.y) < 2;

              let jumperSeg = segK;
              if (isJVert && isKHoriz) {
                jumperSeg = segJ;
              } else if (isKVert && isJHoriz) {
                jumperSeg = segK;
              }

              jumperSeg.jumps.push({
                x: hit.x,
                y: hit.y,
                t: hit.t
              });
            }
          }
        }
      }
    }

    curveMeta.forEach(meta => {
      const hasAnyJumps = meta.segments.some(s => s.jumps && s.jumps.length > 0);
      if (hasAnyJumps) {
        rebuildCurveWithJumps(meta.item.curve, meta.pts, meta.segments, jumpRadius);
      }
    });
  }

  // Configura la interacción de arrastre y eliminación para un punto de inflexión de cable
export function setupWaypointInteraction(wpGroup, conn, index) {
    let isDraggingWp = false;
    let hasMovedWp = false;
    let startScreenX = 0;
    let startScreenY = 0;

    const hitbox = wpGroup.querySelector('.cable-waypoint-hitbox');
    const handle = wpGroup.querySelector('.cable-waypoint-handle');
    const center = wpGroup.querySelector('.cable-waypoint-center');

    wpGroup.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();

      isDraggingWp = true;
      hasMovedWp = false;
      startScreenX = e.clientX;
      startScreenY = e.clientY;

      const pathEl = dom.cablesGroup.querySelector(`path.network-cable[data-cable-id="${conn.id}"]`);
      const outlineEl = dom.cablesGroup.querySelector(`path.cable-outline[data-cable-id="${conn.id}"]`);
      const nodeA = state.nodes.find(n => n.id === conn.fromNodeId);
      const nodeB = state.nodes.find(n => n.id === conn.toNodeId);

      let wpRafId = null;
      let lastWpEvent = null;

      const performWpUpdate = () => {
        wpRafId = null;
        if (!isDraggingWp || !lastWpEvent) return;

        const rect = dom.viewport.getBoundingClientRect();
        const screenX = lastWpEvent.clientX - rect.left;
        const screenY = lastWpEvent.clientY - rect.top;
        const world = screenToWorld(screenX, screenY);

        let targetX = world.x;
        let targetY = world.y;

        if (state.snapToGrid) {
          targetX = Math.round(targetX / state.gridSize) * state.gridSize;
          targetY = Math.round(targetY / state.gridSize) * state.gridSize;
        }

        conn.waypoints[index] = { x: Math.round(targetX), y: Math.round(targetY) };

        // Actualización fluida directa sin destruir el DOM en pleno arrastre
        if (hitbox) { hitbox.setAttribute('cx', targetX); hitbox.setAttribute('cy', targetY); }
        if (handle) { handle.setAttribute('cx', targetX); handle.setAttribute('cy', targetY); }
        if (center) { center.setAttribute('cx', targetX); center.setAttribute('cy', targetY); }

        if (nodeA && nodeB) {
          const curve = computeConnectionCurve(conn, nodeA, nodeB);
          if (pathEl) pathEl.setAttribute('d', curve.pathData);
          if (outlineEl) outlineEl.setAttribute('d', curve.pathData);
        }
      };

      const onMouseMove = (moveEvent) => {
        if (!isDraggingWp) return;
        const dragDist = Math.hypot(moveEvent.clientX - startScreenX, moveEvent.clientY - startScreenY);
        // Umbral de 4px para no interpretar clics como arrastre
        if (!hasMovedWp && dragDist < 4) {
          return;
        }

        if (!hasMovedWp) {
          hasMovedWp = true;
          wpGroup.classList.add('is-dragging');
          document.body.style.cursor = 'grabbing';
        }

        lastWpEvent = moveEvent;
        if (!wpRafId) {
          wpRafId = requestAnimationFrame(performWpUpdate);
        }
      };

      const onMouseUp = () => {
        if (isDraggingWp) {
          isDraggingWp = false;
          if (wpRafId) {
            cancelAnimationFrame(wpRafId);
            wpRafId = null;
          }
          wpGroup.classList.remove('is-dragging');
          document.body.style.cursor = '';
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
          if (hasMovedWp) {
            performWpUpdate();
            renderConnections();
            renderInspector();
            saveState();
          }
        }
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });

    // Doble clic para borrar punto
    wpGroup.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      e.preventDefault();
      conn.waypoints.splice(index, 1);
      renderConnections();
      renderInspector();
      saveState();
    });

    // Clic derecho como alternativa rápida para borrar punto
    wpGroup.addEventListener('contextmenu', (e) => {
      e.stopPropagation();
      e.preventDefault();
      conn.waypoints.splice(index, 1);
      renderConnections();
      renderInspector();
      saveState();
    });
  }

  // Permite arrastrar el badge de boca o red con un rango acotado para desembarazar el cable/equipo
export function setupDraggableBadge(badgeEl, conn, offsetKey, basePos) {
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let currentOffX = (conn[offsetKey] && typeof conn[offsetKey].x === 'number') ? conn[offsetKey].x : 0;
    let currentOffY = (conn[offsetKey] && typeof conn[offsetKey].y === 'number') ? conn[offsetKey].y : 0;
    let hasMoved = false;

    badgeEl.setAttribute('title', `${badgeEl.textContent} (Arrastra para mover la posición · Doble clic para restablecer)`);

    badgeEl.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();

      isDragging = true;
      hasMoved = false;
      startX = e.clientX;
      startY = e.clientY;
      currentOffX = (conn[offsetKey] && typeof conn[offsetKey].x === 'number') ? conn[offsetKey].x : 0;
      currentOffY = (conn[offsetKey] && typeof conn[offsetKey].y === 'number') ? conn[offsetKey].y : 0;

      badgeEl.classList.add('is-dragging');

      const onMouseMove = (moveEvt) => {
        if (!isDragging) return;
        const zoom = state.viewport.zoom || 1;
        const dx = (moveEvt.clientX - startX) / zoom;
        const dy = (moveEvt.clientY - startY) / zoom;

        if (Math.hypot(dx, dy) > 3) {
          hasMoved = true;
        }

        let targetX = currentOffX + dx;
        let targetY = currentOffY + dy;

        // Limitar a un radio acotado (máximo 80px del origen)
        const MAX_OFFSET = 80;
        const dist = Math.hypot(targetX, targetY);
        if (dist > MAX_OFFSET) {
          const angle = Math.atan2(targetY, targetX);
          targetX = Math.cos(angle) * MAX_OFFSET;
          targetY = Math.sin(angle) * MAX_OFFSET;
        }

        const nx = basePos.x + targetX;
        const ny = basePos.y + targetY;
        badgeEl.style.left = `${Math.round(nx)}px`;
        badgeEl.style.top = `${Math.round(ny)}px`;

        if (!conn[offsetKey]) conn[offsetKey] = {};
        conn[offsetKey].x = Math.round(targetX);
        conn[offsetKey].y = Math.round(targetY);
      };

      const onMouseUp = () => {
        if (!isDragging) return;
        isDragging = false;
        badgeEl.classList.remove('is-dragging');
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);

        if (hasMoved) {
          renderConnections();
          saveState();
        } else {
          selectElement('cable', conn.id);
        }
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });

    badgeEl.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      e.preventDefault();
      delete conn[offsetKey];
      renderConnections();
      saveState();
    });
  }

export function renderConnections() {
    dom.cablesGroup.innerHTML = '';
    dom.labelsLayer.innerHTML = '';
    if (dom.waypointsGroup) {
      dom.waypointsGroup.innerHTML = '';
    }

    const allBadges = [];
    const wpTargetGroup = dom.waypointsGroup || dom.cablesGroup;

    // Optimización DOM: fragmentos para inserción por lotes en un solo ciclo
    const cablesFrag = document.createDocumentFragment();
    const labelsFrag = document.createDocumentFragment();
    const wpFrag = document.createDocumentFragment();

    // Indexación O(1) de nodos por ID
    const nodeMap = new Map();
    state.nodes.forEach(n => nodeMap.set(n.id, n));

    // Pre-agrupar conexiones por par de equipos para evitar filtros cuadráticos O(M^2)
    const pairMap = new Map();
    state.connections.forEach(c => {
      const key = c.fromNodeId < c.toNodeId ? `${c.fromNodeId}__${c.toNodeId}` : `${c.toNodeId}__${c.fromNodeId}`;
      if (!pairMap.has(key)) pairMap.set(key, []);
      pairMap.get(key).push(c);
    });

    const activeCurves = [];
    state.connections.forEach(conn => {
      // Filtrado por Capa Técnica: por defecto las conexiones pertenecen a la capa 'logical' (salvo energía)
      if (state.activeLayer && state.activeLayer !== 'all') {
        const connLayer = conn.layer || (conn.cableType === 'power' ? 'power' : 'logical');
        if (connLayer !== state.activeLayer) {
          return;
        }
      }

      const nodeA = nodeMap.get(conn.fromNodeId);
      const nodeB = nodeMap.get(conn.toNodeId);
      if (!nodeA || !nodeB) return;

      const key = conn.fromNodeId < conn.toNodeId ? `${conn.fromNodeId}__${conn.toNodeId}` : `${conn.toNodeId}__${conn.fromNodeId}`;
      const pairList = pairMap.get(key) || [conn];
      const pairInfo = {
        totalInPair: pairList.length,
        idxInPair: pairList.indexOf(conn)
      };

      const cableConfig = CABLE_TYPES[conn.cableType] || CABLE_TYPES.ethernet;
      const curve = computeConnectionCurve(conn, nodeA, nodeB, pairInfo);
      activeCurves.push({ conn, nodeA, nodeB, cableConfig, curve });
    });

    // Aplicar puentes automáticos en cruces de cable (Cable Jumps estilo esquemático)
    applyCableBridgesToCurves(activeCurves);

    activeCurves.forEach(({ conn, nodeA, nodeB, cableConfig, curve }) => {
      const isSelected = state.selection.type === 'cable' && state.selection.id === conn.id;

      // Línea invisible más ancha para facilitar el clic y doble clic
      const outline = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      outline.setAttribute('d', curve.pathData);
      outline.setAttribute('class', 'cable-outline');
      outline.setAttribute('data-cable-id', conn.id);

      outline.addEventListener('click', (e) => {
        e.stopPropagation();
        selectElement('cable', conn.id);
      });

      // Doble clic sobre el cable para insertar un nuevo punto de quiebre en esa posición exacta
      const onCableDblClick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        const rect = dom.viewport.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        const world = screenToWorld(screenX, screenY);

        let newX = world.x;
        let newY = world.y;
        if (state.snapToGrid) {
          newX = Math.round(newX / state.gridSize) * state.gridSize;
          newY = Math.round(newY / state.gridSize) * state.gridSize;
        }

        insertWaypointAtOptimalIndex(conn, { x: Math.round(newX), y: Math.round(newY) }, nodeA, nodeB);
        selectElement('cable', conn.id);
        renderConnections();
        renderInspector();
        saveState();
      };

      outline.addEventListener('dblclick', onCableDblClick);

      // Línea visible del cable
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', curve.pathData);
      path.setAttribute('class', `network-cable ${isSelected ? 'selected' : ''}`);

      const isLight = document.body.getAttribute('data-theme') === 'light';
      let strokeColor = cableConfig.color;
      if (isLight) {
        if (conn.cableType === 'ethernet' || !conn.cableType) strokeColor = '#0284c7';
        else if (conn.cableType === 'power') strokeColor = '#dc2626';
        else if (conn.cableType === 'fiber') strokeColor = '#d97706';
        else if (conn.cableType === 'serial') strokeColor = '#dc2626';
        else if (conn.cableType === 'wireless') strokeColor = '#7c3aed';
      }

      if (conn.customColor) {
        strokeColor = conn.customColor;
      }

      path.setAttribute('stroke', strokeColor);
      path.setAttribute('stroke-width', cableConfig.width);
      path.setAttribute('data-cable-id', conn.id);
      if (cableConfig.dash !== 'none') {
        path.setAttribute('stroke-dasharray', cableConfig.dash);
      }

      path.addEventListener('click', (e) => {
        e.stopPropagation();
        selectElement('cable', conn.id);
      });
      path.addEventListener('dblclick', onCableDblClick);

      cablesFrag.appendChild(outline);
      cablesFrag.appendChild(path);

      // Calcular posiciones iniciales a lo largo del cable para badges
      const dist = curve.totalLength || 100;
      const offsetDist = Math.min(28, Math.max(dist * 0.25, 14));

      const posA = getPointAlongCable(curve, offsetDist, false);
      const posB = getPointAlongCable(curve, offsetDist, true);
      const posMid = getPointAlongCable(curve, dist * 0.5, false);

      const offA = conn.portAOffset || { x: 0, y: 0 };
      const offB = conn.portBOffset || { x: 0, y: 0 };
      const offMid = conn.labelOffset || { x: 0, y: 0 };

      const finalPosA = { x: posA.x + (offA.x || 0), y: posA.y + (offA.y || 0) };
      const finalPosB = { x: posB.x + (offB.x || 0), y: posB.y + (offB.y || 0) };
      const finalPosMid = { x: posMid.x + (offMid.x || 0), y: posMid.y + (offMid.y || 0) };

      // Si el cable está seleccionado, renderizar tiradores interactivos de waypoints
      if (isSelected) {
        if (Array.isArray(conn.waypoints) && conn.waypoints.length > 0) {
          conn.waypoints.forEach((wp, idx) => {
            const wpG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            wpG.setAttribute('class', 'cable-waypoint-group');
            wpG.setAttribute('data-wp-idx', idx);

            const hitbox = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            hitbox.setAttribute('cx', wp.x);
            hitbox.setAttribute('cy', wp.y);
            hitbox.setAttribute('r', '24');
            hitbox.setAttribute('fill', 'rgba(56, 189, 248, 0.001)');
            hitbox.setAttribute('pointer-events', 'all');
            hitbox.setAttribute('class', 'cable-waypoint-hitbox');

            const handle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            handle.setAttribute('cx', wp.x);
            handle.setAttribute('cy', wp.y);
            handle.setAttribute('r', '8.5');
            handle.setAttribute('class', 'cable-waypoint-handle');

            const center = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            center.setAttribute('cx', wp.x);
            center.setAttribute('cy', wp.y);
            center.setAttribute('r', '3');
            center.setAttribute('class', 'cable-waypoint-center');

            wpG.appendChild(hitbox);
            wpG.appendChild(handle);
            wpG.appendChild(center);

            setupWaypointInteraction(wpG, conn, idx);
            wpFrag.appendChild(wpG);
          });
        } else {
          // Tirador fantasma central invitando a crear el primer punto de quiebre
          const ghostG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          ghostG.setAttribute('class', 'cable-ghost-handle');
          ghostG.setAttribute('title', 'Haz clic o arrastra para crear un punto de quiebre y moldear el cable');

          const ghostHitbox = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          ghostHitbox.setAttribute('cx', posMid.x);
          ghostHitbox.setAttribute('cy', posMid.y);
          ghostHitbox.setAttribute('r', '24');
          ghostHitbox.setAttribute('fill', 'rgba(56, 189, 248, 0.001)');
          ghostHitbox.setAttribute('pointer-events', 'all');
          ghostHitbox.setAttribute('class', 'cable-waypoint-hitbox');

          const ghostCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          ghostCircle.setAttribute('cx', posMid.x);
          ghostCircle.setAttribute('cy', posMid.y);
          ghostCircle.setAttribute('r', '12');
          ghostCircle.setAttribute('class', 'cable-ghost-circle');

          const ghostText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          ghostText.setAttribute('x', posMid.x);
          ghostText.setAttribute('y', posMid.y);
          ghostText.setAttribute('class', 'cable-ghost-plus');
          ghostText.textContent = '+';

          ghostG.appendChild(ghostHitbox);
          ghostG.appendChild(ghostCircle);
          ghostG.appendChild(ghostText);

          ghostG.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            e.stopPropagation();
            e.preventDefault();

            let wx = posMid.x;
            let wy = posMid.y;
            if (state.snapToGrid) {
              wx = Math.round(wx / state.gridSize) * state.gridSize;
              wy = Math.round(wy / state.gridSize) * state.gridSize;
            }

            const newPt = { x: Math.round(wx), y: Math.round(wy) };
            insertWaypointAtOptimalIndex(conn, newPt, nodeA, nodeB);
            renderConnections();
            renderInspector();
            saveState();

            // Activar arrastre inmediato sobre el nuevo punto
            const targetIdx = conn.waypoints.indexOf(newPt);
            const newWpG = wpTargetGroup.querySelector(`.cable-waypoint-group[data-wp-idx="${targetIdx}"]`);
            if (newWpG) {
              const downEvt = new MouseEvent('mousedown', {
                clientX: e.clientX,
                clientY: e.clientY,
                button: 0,
                bubbles: true
              });
              newWpG.dispatchEvent(downEvt);
            }
          });

          wpFrag.appendChild(ghostG);
        }
      }

      // Badge Boca A (solo si tiene texto visible y no está vacío)
      if (conn.fromPort && conn.fromPort.trim() !== '') {
        const textA = conn.fromPort.trim();
        const badgeA = document.createElement('div');
        const hasManualA = Boolean(conn.portAOffset && (conn.portAOffset.x || conn.portAOffset.y));
        badgeA.className = `port-badge ${hasManualA ? 'custom-offset' : ''}`;
        badgeA.textContent = textA;
        badgeA.style.left = `${finalPosA.x}px`;
        badgeA.style.top = `${finalPosA.y}px`;
        setupDraggableBadge(badgeA, conn, 'portAOffset', posA);
        labelsFrag.appendChild(badgeA);
        allBadges.push({
          el: badgeA,
          x: finalPosA.x,
          y: finalPosA.y,
          w: Math.max(textA.length * 7 + 14, 32),
          h: 20,
          isManualOffset: hasManualA
        });
      }

      // Badge Boca B (solo si tiene texto visible y no está vacío)
      if (conn.toPort && conn.toPort.trim() !== '') {
        const textB = conn.toPort.trim();
        const badgeB = document.createElement('div');
        const hasManualB = Boolean(conn.portBOffset && (conn.portBOffset.x || conn.portBOffset.y));
        badgeB.className = `port-badge ${hasManualB ? 'custom-offset' : ''}`;
        badgeB.textContent = textB;
        badgeB.style.left = `${finalPosB.x}px`;
        badgeB.style.top = `${finalPosB.y}px`;
        setupDraggableBadge(badgeB, conn, 'portBOffset', posB);
        labelsFrag.appendChild(badgeB);
        allBadges.push({
          el: badgeB,
          x: finalPosB.x,
          y: finalPosB.y,
          w: Math.max(textB.length * 7 + 14, 32),
          h: 20,
          isManualOffset: hasManualB
        });
      }

      // Etiqueta de Red / Subred en el medio si fue definida
      if (conn.networkLabel && conn.networkLabel.trim() !== '') {
        const textMid = conn.networkLabel.trim();
        const badgeMid = document.createElement('div');
        const hasManualMid = Boolean(conn.labelOffset && (conn.labelOffset.x || conn.labelOffset.y));
        badgeMid.className = `network-label-badge ${hasManualMid ? 'custom-offset' : ''}`;
        badgeMid.textContent = textMid;
        badgeMid.style.left = `${finalPosMid.x}px`;
        badgeMid.style.top = `${finalPosMid.y}px`;
        setupDraggableBadge(badgeMid, conn, 'labelOffset', posMid);
        labelsFrag.appendChild(badgeMid);
        allBadges.push({
          el: badgeMid,
          x: finalPosMid.x,
          y: finalPosMid.y,
          w: Math.max(textMid.length * 7.5 + 20, 48),
          h: 22,
          isManualOffset: hasManualMid
        });
      }
    });

    // Inserción agrupada en el DOM en un solo paso
    dom.cablesGroup.appendChild(cablesFrag);
    dom.labelsLayer.appendChild(labelsFrag);
    wpTargetGroup.appendChild(wpFrag);

    // Resolver colisiones entre hitboxes de etiquetas
    resolveLabelCollisions(allBadges);
  }


// Registrar métodos en el contexto global de aplicación
app.createConnection = createConnection;
app.deleteConnection = deleteConnection;
app.getNodeEdgeAnchor = getNodeEdgeAnchor;
app.getNodeAnchorSide = getNodeAnchorSide;
app.getAnchorOnSide = getAnchorOnSide;
app.generateRoundedPath = generateRoundedPath;
app.drawRoundedPathOnCanvas = drawRoundedPathOnCanvas;
app.generateCatmullRomSpline = generateCatmullRomSpline;
app.computeCurvedSplineNoWaypoints = computeCurvedSplineNoWaypoints;
app.insertWaypointAtOptimalIndex = insertWaypointAtOptimalIndex;
app.insertWaypointAtPoint = insertWaypointAtPoint;
app.avoidObstaclesOnOrthogonalPath = avoidObstaclesOnOrthogonalPath;
app.computeOrthogonalPoints = computeOrthogonalPoints;
app.getPointAlongPolyline = getPointAlongPolyline;
app.computeConnectionCurve = computeConnectionCurve;
app.getPointAlongCable = getPointAlongCable;
app.getBezierPoint = getBezierPoint;
app.resolveLabelCollisions = resolveLabelCollisions;
app.getLineSegmentIntersection = getLineSegmentIntersection;
app.isPointNearAnyNode = isPointNearAnyNode;
app.getSegmentsFromCurve = getSegmentsFromCurve;
app.rebuildCurveWithJumps = rebuildCurveWithJumps;
app.applyCableBridgesToCurves = applyCableBridgesToCurves;
app.setupWaypointInteraction = setupWaypointInteraction;
app.setupDraggableBadge = setupDraggableBadge;
app.renderConnections = renderConnections;
