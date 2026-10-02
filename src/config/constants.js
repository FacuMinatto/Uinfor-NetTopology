/**
 * NetTopology - Constantes y Configuraciones Globales
 */

export const STORAGE_PROJECTS_KEY = 'net_topology_projects_collection_v1';
export const STORAGE_ACTIVE_ID_KEY = 'net_topology_active_project_id';
export const STORAGE_LEGACY_KEY = 'net_topology_project_v1';

export const MAX_HISTORY_STEPS = 60;
export const DEFAULT_GRID_SIZE = 24;

// Formatos y plantillas estándar de hojas
export const SHEET_PRESETS = {
  infinite: { label: 'Hoja Infinita', isInfinite: true, badge: 'Infinito' },
  a4_landscape: { label: 'A4 Horizontal', isInfinite: false, width: 1123, height: 794, badge: 'A4 297×210' },
  a4_portrait: { label: 'A4 Vertical', isInfinite: false, width: 794, height: 1123, badge: 'A4 210×297' },
  a3_landscape: { label: 'A3 Horizontal', isInfinite: false, width: 1587, height: 1123, badge: 'A3 420×297' },
  a3_portrait: { label: 'A3 Vertical', isInfinite: false, width: 1123, height: 1587, badge: 'A3 297×420' },
  letter_landscape: { label: 'Carta Horizontal', isInfinite: false, width: 1056, height: 816, badge: 'Letter 11×8.5"' },
  letter_portrait: { label: 'Carta Vertical', isInfinite: false, width: 816, height: 1056, badge: 'Letter 8.5×11"' },
  '1080p': { label: 'Full HD 1080p', isInfinite: false, width: 1920, height: 1080, badge: '1920×1080' },
  '4k': { label: '4K Ultra HD', isInfinite: false, width: 3840, height: 2160, badge: '3840×2160' },
  custom: { label: 'Personalizado', isInfinite: false, width: 1200, height: 800, badge: 'A medida' }
};

// Paletas de color para Áreas / Zonas / VLANs
export const ZONE_COLOR_PALETTES = {
  cyan: { border: 'rgba(56, 189, 248, 0.65)', bg: 'rgba(56, 189, 248, 0.05)', text: '#38bdf8' },
  emerald: { border: 'rgba(16, 185, 129, 0.65)', bg: 'rgba(16, 185, 129, 0.05)', text: '#10b981' },
  amber: { border: 'rgba(245, 158, 11, 0.65)', bg: 'rgba(245, 158, 11, 0.05)', text: '#f59e0b' },
  rose: { border: 'rgba(244, 63, 94, 0.65)', bg: 'rgba(244, 63, 94, 0.05)', text: '#f43f5e' },
  purple: { border: 'rgba(168, 85, 247, 0.65)', bg: 'rgba(168, 85, 247, 0.05)', text: '#a855f7' },
  blue: { border: 'rgba(59, 130, 246, 0.65)', bg: 'rgba(59, 130, 246, 0.05)', text: '#3b82f6' }
};
