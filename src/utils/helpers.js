/**
 * NetTopology - Funciones auxiliares y utilidades
 */

export function escapeHtml(str) {
  if (str === null || str === undefined || str === '') return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function incrementIp(ip) {
  if (!ip) return '192.168.1.100';
  const parts = ip.split('.');
  if (parts.length === 4 && !isNaN(parts[3])) {
    parts[3] = Math.min(parseInt(parts[3], 10) + 1, 254);
    return parts.join('.');
  }
  return ip;
}

export function formatDateForFile(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}${m}${d}_${h}${min}`;
}

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

const HEX_COLOR_RE = /^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const RASTER_DATA_URL_RE = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i;
const CACHED_IMG_REF_RE = /^__cached_img__:[A-Za-z0-9_]+$/;
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const VALID_BADGE_COLORS = new Set(['emerald', 'cyan', 'amber', 'rose', 'purple', 'neutral', 'slate']);
const VALID_ZONE_COLORS = new Set(['cyan', 'emerald', 'amber', 'rose', 'purple', 'blue']);
const VALID_SIDES = new Set(['auto', 'top', 'bottom', 'left', 'right']);
const VALID_ROUTING = new Set(['orthogonal', 'curved', 'straight']);
const VALID_LAYERS = new Set(['physical', 'logical', 'power']);

export function sanitizeHexColor(val, fallback = '#38bdf8') {
  if (typeof val !== 'string') return fallback;
  const trimmed = val.trim();
  return HEX_COLOR_RE.test(trimmed) ? trimmed : fallback;
}

export function safeNum(val, fallback = 0) {
  if (typeof val !== 'number' && typeof val !== 'string') return fallback;
  if (typeof val === 'string' && val.trim() === '') return fallback;
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

export function isElectricNodeType(type) {
  return ['ups', 'termica', 'transfer'].includes(type) || (typeof type === 'string' && type.startsWith('canal_tension'));
}

export function sanitizeUnderlaySrc(src, allowCachedRef = false) {
  if (typeof src !== 'string') return '';
  const trimmed = src.trim();
  if (RASTER_DATA_URL_RE.test(trimmed)) return trimmed;
  if (allowCachedRef && CACHED_IMG_REF_RE.test(trimmed)) return trimmed;
  return '';
}

export function stripUnsafeKeys(val, depth = 0) {
  if (val === null || typeof val !== 'object') return val;
  if (depth >= 12) return Array.isArray(val) ? [] : {};
  if (Array.isArray(val)) {
    return val.map(item => stripUnsafeKeys(item, depth + 1));
  }
  const out = {};
  for (const key of Object.keys(val)) {
    if (UNSAFE_KEYS.has(key)) continue;
    out[key] = stripUnsafeKeys(val[key], depth + 1);
  }
  return out;
}

function cleanStr(val, fallback = '', maxLen = 256) {
  return typeof val === 'string' ? val.slice(0, maxLen) : fallback;
}

function cleanOffset(val) {
  if (!val || typeof val !== 'object' || Array.isArray(val)) return undefined;
  return { x: safeNum(val.x, 0), y: safeNum(val.y, 0) };
}

function cleanNodeObj(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  if (typeof raw.id !== 'string' || !raw.id.trim()) return null;

  const node = {
    id: raw.id.trim().slice(0, 128),
    type: (typeof raw.type === 'string' && raw.type.trim()) ? raw.type.trim().slice(0, 64) : 'pc',
    name: cleanStr(raw.name, '', 200),
    ip: cleanStr(raw.ip, '', 128),
    mask: cleanStr(raw.mask, '', 128),
    gateway: cleanStr(raw.gateway, '', 128),
    x: safeNum(raw.x, 0),
    y: safeNum(raw.y, 0),
    scale: clamp(safeNum(raw.scale, 1), 0.25, 4),
    notes: cleanStr(raw.notes, '', 4000)
  };

  if (typeof raw.customName === 'string') node.customName = raw.customName.slice(0, 200);
  if (typeof raw.badgeColor === 'string') {
    node.badgeColor = VALID_BADGE_COLORS.has(raw.badgeColor) ? raw.badgeColor : 'emerald';
  }
  if (typeof raw.customColor === 'string') {
    const hex = sanitizeHexColor(raw.customColor, '');
    if (hex) node.customColor = hex;
  }
  if (raw.encapsulatedLabels !== undefined) node.encapsulatedLabels = Boolean(raw.encapsulatedLabels);
  if (Array.isArray(raw.availablePorts)) {
    node.availablePorts = raw.availablePorts.filter(p => typeof p === 'string').map(p => p.slice(0, 80));
  }
  if (Array.isArray(raw.ports)) {
    node.ports = raw.ports
      .filter(p => p && (typeof p === 'string' || (typeof p === 'object' && !Array.isArray(p))))
      .map(p => typeof p === 'string' ? p.slice(0, 80) : {
        name: cleanStr(p.name, 'Port', 80),
        ip: cleanStr(p.ip, '', 128),
        subnetMask: cleanStr(p.subnetMask, '', 128),
        gateway: cleanStr(p.gateway, '', 128)
      });
  }
  if (typeof raw.visible === 'boolean') node.visible = raw.visible;
  if (typeof raw.locked === 'boolean') node.locked = raw.locked;

  return node;
}

function cleanConnectionObj(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  if (typeof raw.id !== 'string' || !raw.id.trim()) return null;
  if (typeof raw.fromNodeId !== 'string' || !raw.fromNodeId.trim()) return null;
  if (typeof raw.toNodeId !== 'string' || !raw.toNodeId.trim()) return null;

  const conn = {
    id: raw.id.trim().slice(0, 128),
    fromNodeId: raw.fromNodeId.trim().slice(0, 128),
    toNodeId: raw.toNodeId.trim().slice(0, 128),
    fromPort: cleanStr(raw.fromPort, 'Port 1', 80),
    toPort: cleanStr(raw.toPort, 'Port 1', 80),
    cableType: (typeof raw.cableType === 'string' && raw.cableType.trim()) ? raw.cableType.trim().slice(0, 32) : 'ethernet',
    networkLabel: cleanStr(raw.networkLabel, '', 200),
    fromSide: VALID_SIDES.has(raw.fromSide) ? raw.fromSide : 'auto',
    toSide: VALID_SIDES.has(raw.toSide) ? raw.toSide : 'auto'
  };

  if (VALID_LAYERS.has(raw.layer)) conn.layer = raw.layer;
  if (VALID_ROUTING.has(raw.routingMode)) conn.routingMode = raw.routingMode;
  if (typeof raw.customColor === 'string') {
    const hex = sanitizeHexColor(raw.customColor, '');
    if (hex) conn.customColor = hex;
  }
  if (typeof raw.color === 'string') {
    const hex = sanitizeHexColor(raw.color, '');
    if (hex) conn.color = hex;
  }
  if (Array.isArray(raw.waypoints)) {
    conn.waypoints = raw.waypoints
      .filter(w => w && typeof w === 'object' && !Array.isArray(w))
      .map(w => ({ x: safeNum(w.x, 0), y: safeNum(w.y, 0) }));
  }
  const offA = cleanOffset(raw.portAOffset);
  if (offA) conn.portAOffset = offA;
  const offB = cleanOffset(raw.portBOffset);
  if (offB) conn.portBOffset = offB;
  const offLabel = cleanOffset(raw.labelOffset);
  if (offLabel) conn.labelOffset = offLabel;
  if (typeof raw.visible === 'boolean') conn.visible = raw.visible;
  if (typeof raw.locked === 'boolean') conn.locked = raw.locked;

  return conn;
}

function cleanZoneObj(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  if (typeof raw.id !== 'string' || !raw.id.trim()) return null;

  const zone = {
    id: raw.id.trim().slice(0, 128),
    name: cleanStr(raw.name, 'Zona VLAN', 200),
    color: VALID_ZONE_COLORS.has(raw.color) ? raw.color : 'cyan',
    x: safeNum(raw.x, 0),
    y: safeNum(raw.y, 0),
    width: Math.max(120, safeNum(raw.width, 320)),
    height: Math.max(80, safeNum(raw.height, 220))
  };

  if (typeof raw.visible === 'boolean') zone.visible = raw.visible;
  if (typeof raw.locked === 'boolean') zone.locked = raw.locked;
  return zone;
}

function cleanUnderlayObj(raw, allowCachedUnderlay) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const src = sanitizeUnderlaySrc(raw.src, allowCachedUnderlay);
  if (!src) return null;

  return {
    src,
    name: cleanStr(raw.name, 'Plano de fondo', 200),
    x: safeNum(raw.x, 0),
    y: safeNum(raw.y, 0),
    width: Math.max(1, safeNum(raw.width, 800)),
    height: Math.max(1, safeNum(raw.height, 600)),
    scale: clamp(safeNum(raw.scale, 100), 10, 600),
    opacity: clamp(safeNum(raw.opacity, 40), 0, 100),
    visible: raw.visible === false ? false : true,
    locked: raw.locked === false ? false : true
  };
}

function cleanViewportObj(raw) {
  const v = (raw && typeof raw === 'object' && !Array.isArray(raw)) ? raw : {};
  return {
    x: safeNum(v.x, 80),
    y: safeNum(v.y, 80),
    zoom: clamp(safeNum(v.zoom, 1), 0.1, 5)
  };
}

function cleanSheetObj(raw, allowCachedUnderlay) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  return {
    id: (typeof raw.id === 'string' && raw.id.trim()) ? raw.id.trim().slice(0, 128) : generateId('sheet'),
    name: (typeof raw.name === 'string' && raw.name.trim()) ? raw.name.slice(0, 120) : 'Hoja',
    pageSize: (typeof raw.pageSize === 'string' && raw.pageSize.trim()) ? raw.pageSize.trim().slice(0, 64) : 'infinite',
    pageWidth: Math.max(100, safeNum(raw.pageWidth, 1123)),
    pageHeight: Math.max(100, safeNum(raw.pageHeight, 794)),
    bgTheme: cleanStr(raw.bgTheme, 'white', 32),
    nodes: Array.isArray(raw.nodes) ? raw.nodes.map(cleanNodeObj).filter(Boolean) : [],
    connections: Array.isArray(raw.connections) ? raw.connections.map(cleanConnectionObj).filter(Boolean) : [],
    zones: Array.isArray(raw.zones) ? raw.zones.map(cleanZoneObj).filter(Boolean) : [],
    underlay: cleanUnderlayObj(raw.underlay, allowCachedUnderlay),
    viewport: cleanViewportObj(raw.viewport)
  };
}

export function sanitizeNodePayload(node) {
  return cleanNodeObj(stripUnsafeKeys(node));
}

export function sanitizeConnectionPayload(conn) {
  return cleanConnectionObj(stripUnsafeKeys(conn));
}

export function sanitizeZonePayload(zone) {
  return cleanZoneObj(stripUnsafeKeys(zone));
}

export function sanitizeProjectData(raw, { allowCachedUnderlay = false } = {}) {
  const clean = stripUnsafeKeys(raw);
  if (!clean || typeof clean !== 'object' || Array.isArray(clean)) return null;

  const rawTitle = (typeof clean.projectName === 'string' && clean.projectName.trim())
    ? clean.projectName
    : (typeof clean.name === 'string' && clean.name.trim() ? clean.name : '');
  const projectName = rawTitle ? rawTitle.trim().slice(0, 120) : '';

  const sheets = Array.isArray(clean.sheets)
    ? clean.sheets.map(s => cleanSheetObj(s, allowCachedUnderlay)).filter(Boolean)
    : [];

  let activeSheetId = (typeof clean.activeSheetId === 'string' && clean.activeSheetId.trim())
    ? clean.activeSheetId.trim().slice(0, 128)
    : null;
  if (sheets.length > 0 && (!activeSheetId || !sheets.some(s => s.id === activeSheetId))) {
    activeSheetId = sheets[0].id;
  }

  const out = {
    projectName,
    name: projectName,
    activeSheetId,
    viewport: cleanViewportObj(clean.viewport),
    nodes: Array.isArray(clean.nodes) ? clean.nodes.map(cleanNodeObj).filter(Boolean) : [],
    connections: Array.isArray(clean.connections) ? clean.connections.map(cleanConnectionObj).filter(Boolean) : [],
    zones: Array.isArray(clean.zones) ? clean.zones.map(cleanZoneObj).filter(Boolean) : [],
    underlay: cleanUnderlayObj(clean.underlay, allowCachedUnderlay),
    sheets
  };

  if (typeof clean.exportDate === 'string') {
    out.exportDate = clean.exportDate.slice(0, 64);
  }

  return out;
}

export function formatCsvCell(val, delimiter = ';') {
  if (val === null || val === undefined) return '';
  let str = String(val).trim();
  if (/^[=+\-@\t\r]/.test(str) && str !== '-') {
    str = "'" + str;
  }
  if (str.includes(delimiter) || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
