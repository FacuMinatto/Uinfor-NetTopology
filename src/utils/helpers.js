/**
 * NetTopology - Funciones auxiliares y utilidades
 */

export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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
