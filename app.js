/**
 * NetTopology Studio - Motor principal de la aplicación
 * Gestión de Canvas, Nodos, Cables, Bocas, Inspector y Persistencia
 */

(function () {
  'use strict';

  // ==========================================================================
  // ESTADO GLOBAL DE LA APLICACIÓN
  // ==========================================================================
  const state = {
    nodes: [],
    connections: [],
    selection: { type: null, id: null, ids: [] }, // type: 'node' | 'cable' | 'multi-node'
    selectedNodeIds: new Set(),
    selectedZoneIds: new Set(),
    canvasMode: 'select', // 'select' | 'pan'
    viewport: { x: 80, y: 80, zoom: 1 },
    snapToGrid: true,
    cableBridgesEnabled: true,
    gridSize: 24,
    history: [],
    historyIndex: -1,
    isConnecting: false,
    connectingSourceNodeId: null,
    tempCablePos: { x: 0, y: 0 },
    currentProjectId: null,
    currentProjectName: 'Red Corporativa Principal',
    defaultRoutingMode: 'orthogonal', // 'orthogonal' | 'curved' | 'straight'
    sheets: [],
    activeSheetId: null,
    zones: [], // { id, name, color, x, y, width, height }
    theme: 'dark', // 'dark' | 'light'
    minimapVisible: true,
    gridVisible: true,
    smartGuidesEnabled: true
  };

  const STORAGE_PROJECTS_KEY = 'net_topology_projects_collection_v1';
  const STORAGE_ACTIVE_ID_KEY = 'net_topology_active_project_id';
  const STORAGE_LEGACY_KEY = 'net_topology_project_v1';

  // Formatos y plantillas estándar de hojas
  const SHEET_PRESETS = {
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

  // Referencias a elementos del DOM
  const dom = {
    viewport: document.getElementById('canvas-viewport'),
    world: document.getElementById('canvas-world'),
    nodesLayer: document.getElementById('nodes-layer'),
    connectionsLayer: document.getElementById('connections-layer'),
    cablesGroup: document.getElementById('cables-group'),
    waypointsGroup: document.getElementById('waypoints-group'),
    labelsLayer: document.getElementById('labels-layer'),
    tempCable: document.getElementById('temp-cable'),
    marquee: document.getElementById('selection-marquee'),
    paletteContainer: document.getElementById('palette-container'),
    inspectorBody: document.getElementById('inspector-body'),
    inspectorTitle: document.getElementById('inspector-title'),
    zoomValue: document.getElementById('zoom-value'),
    statusDot: document.getElementById('status-dot'),
    statusText: document.getElementById('status-text'),
    btnToggleSnap: document.getElementById('btn-toggle-snap'),
    btnToggleBridges: document.getElementById('btn-toggle-bridges'),
    btnSelectAll: document.getElementById('btn-select-all'),
    btnModeSelect: document.getElementById('btn-mode-select'),
    btnModePan: document.getElementById('btn-mode-pan'),
    btnAddTextBadge: document.getElementById('btn-add-text-badge'),
    btnToggleTheme: document.getElementById('btn-toggle-theme'),
    themeIconSun: document.getElementById('theme-icon-sun'),
    themeIconMoon: document.getElementById('theme-icon-moon'),
    fileInput: document.getElementById('file-input'),
    btnUndo: document.getElementById('btn-undo'),
    btnRedo: document.getElementById('btn-redo'),

    // Paneles laterales colapsables y botones de alternancia
    sidebarPalette: document.getElementById('sidebar-palette'),
    sidebarInspector: document.getElementById('sidebar-inspector'),
    btnCollapsePalette: document.getElementById('btn-collapse-palette'),
    btnCollapseInspector: document.getElementById('btn-collapse-inspector'),
    btnExpandPalette: document.getElementById('btn-expand-palette'),
    btnExpandInspector: document.getElementById('btn-expand-inspector'),
    btnTogglePaletteTop: document.getElementById('btn-toggle-palette-top'),
    btnToggleInspectorTop: document.getElementById('btn-toggle-inspector-top'),

    // Hoja física y barra inferior de solapas
    paperSheet: document.getElementById('paper-sheet'),
    paperSheetTag: document.getElementById('paper-sheet-tag'),
    sheetsBar: document.getElementById('sheets-bar'),
    sheetsScrollContainer: document.getElementById('sheets-scroll-container'),
    sheetsTabsList: document.getElementById('sheets-tabs-list'),
    btnAddSheet: document.getElementById('btn-add-sheet'),
    btnSheetScrollPrev: document.getElementById('btn-sheet-scroll-prev'),
    btnSheetScrollNext: document.getElementById('btn-sheet-scroll-next'),
    btnSheetConfigTrigger: document.getElementById('btn-sheet-config-trigger'),
    sheetCurrentFormatLabel: document.getElementById('sheet-current-format-label'),
    sheetModeBadge: document.getElementById('sheet-mode-badge'),
    sheetModeText: document.getElementById('sheet-mode-text'),

    // Modal de configuración de hoja
    modalSheetConfig: document.getElementById('modal-sheet-config'),
    cfgSheetName: document.getElementById('cfg-sheet-name'),
    cfgSheetPreset: document.getElementById('cfg-sheet-preset'),
    cfgCustomDimsBox: document.getElementById('cfg-custom-dims-box'),
    cfgCustomWidth: document.getElementById('cfg-custom-width'),
    cfgCustomHeight: document.getElementById('cfg-custom-height'),
    btnCfgSwapDims: document.getElementById('btn-cfg-swap-dims'),
    cfgSheetBgTheme: document.getElementById('cfg-sheet-bg-theme'),
    btnCloseSheetConfig: document.getElementById('btn-close-sheet-config'),
    btnCancelSheetConfig: document.getElementById('btn-cancel-sheet-config'),
    btnSaveSheetConfig: document.getElementById('btn-save-sheet-config'),

    // Opciones de exportación según hoja
    optExportSheetBoundsWrap: document.getElementById('opt-export-sheet-bounds-wrap'),
    chkExportSheetBounds: document.getElementById('chk-export-sheet-bounds'),
    lblExportSheetName: document.getElementById('lbl-export-sheet-name'),

    // Título y estado del proyecto en cabecera
    projectTitleInput: document.getElementById('project-title-input'),
    projectSaveIndicator: document.getElementById('project-save-indicator'),

    // Modales
    modalCable: document.getElementById('modal-cable'),
    cablePortA: document.getElementById('cable-port-a'),
    cablePortB: document.getElementById('cable-port-b'),
    cableTypeSelect: document.getElementById('cable-type-select'),
    cableNetworkTag: document.getElementById('cable-network-tag'),
    portsListA: document.getElementById('ports-list-a'),
    portsListB: document.getElementById('ports-list-b'),
    lblDeviceA: document.getElementById('lbl-device-a'),
    lblDeviceB: document.getElementById('lbl-device-b'),

    modalShortcuts: document.getElementById('modal-shortcuts'),
    modalExport: document.getElementById('modal-export'),

    // Modal Gestor de Proyectos
    modalProjects: document.getElementById('modal-projects'),
    projectsListContainer: document.getElementById('projects-list-container'),
    projectsCountBadge: document.getElementById('projects-count-badge'),
    inputNewProjectName: document.getElementById('input-new-project-name'),
    btnCreateProjectSubmit: document.getElementById('btn-create-project-submit'),
    btnImportProjectModal: document.getElementById('btn-import-project-modal'),
    btnCloseProjectsModal: document.getElementById('btn-close-projects-modal'),
    btnCloseProjectsBottom: document.getElementById('btn-close-projects-bottom'),
    btnProjectsMgr: document.getElementById('btn-projects-mgr'),

    // Capa de Áreas / Zonas de Red (VLAN)
    zonesLayer: document.getElementById('zones-layer'),

    // Menús desplegables de la barra superior (TopBar)
    btnMenuFileTrigger: document.getElementById('btn-menu-file-trigger'),
    dropdownFile: document.getElementById('dropdown-file'),
    btnMenuEditTrigger: document.getElementById('btn-menu-edit-trigger'),
    dropdownEdit: document.getElementById('dropdown-edit'),
    btnExportDropdownTrigger: document.getElementById('btn-export-dropdown-trigger'),
    dropdownExport: document.getElementById('dropdown-export'),
    menuBtnUndo: document.getElementById('menu-btn-undo'),
    menuBtnRedo: document.getElementById('menu-btn-redo'),
    btnExportCsvMenu: document.getElementById('btn-export-csv-menu'),
    btnSaveMenuCopy: document.getElementById('btn-save-menu-copy'),
    btnSaveAs: document.getElementById('btn-save-as'),
    diskFileBadge: document.getElementById('disk-file-badge'),
    diskFileName: document.getElementById('disk-file-name'),

    // Modal Búsqueda Rápida (Spotlight / Ctrl + F)
    btnQuickSearch: document.getElementById('btn-quick-search'),
    modalSearch: document.getElementById('modal-search'),
    inputQuickSearch: document.getElementById('input-quick-search'),
    searchResultsContainer: document.getElementById('search-results-container'),
    searchResultsStats: document.getElementById('search-results-stats'),
    btnCloseSearchModal: document.getElementById('btn-close-search-modal'),

    // Modal Inventario IP
    btnOpenIpTable: document.getElementById('btn-open-ip-table'),
    modalIpInventory: document.getElementById('modal-ip-inventory'),
    ipTableFilter: document.getElementById('ip-table-filter'),
    ipTableStats: document.getElementById('ip-table-stats'),
    ipInventoryTbody: document.getElementById('ip-inventory-tbody'),
    btnExportIpCsv: document.getElementById('btn-export-ip-csv'),
    btnCopyIpTable: document.getElementById('btn-copy-ip-table'),
    btnCloseIpInventory: document.getElementById('btn-close-ip-inventory'),
    btnCloseIpInventoryBottom: document.getElementById('btn-close-ip-inventory-bottom'),

    // Menú Vista y Controles de Vista
    btnMenuViewTrigger: document.getElementById('btn-menu-view-trigger'),
    dropdownView: document.getElementById('dropdown-view'),
    menuViewThemeDark: document.getElementById('menu-view-theme-dark'),
    menuViewThemeLight: document.getElementById('menu-view-theme-light'),
    checkThemeDark: document.getElementById('check-theme-dark'),
    checkThemeLight: document.getElementById('check-theme-light'),
    menuViewToggleMinimap: document.getElementById('menu-view-toggle-minimap'),
    checkViewMinimap: document.getElementById('check-view-minimap'),
    menuViewToggleGrid: document.getElementById('menu-view-toggle-grid'),
    checkViewGrid: document.getElementById('check-view-grid'),
    menuViewToggleGuides: document.getElementById('menu-view-toggle-guides'),
    checkViewGuides: document.getElementById('check-view-guides'),
    menuViewFit: document.getElementById('menu-view-fit'),
    menuViewResetZoom: document.getElementById('menu-view-reset-zoom'),
    menuBtnDuplicate: document.getElementById('menu-btn-duplicate'),

    // Minimapa
    canvasMinimap: document.getElementById('canvas-minimap'),
    minimapHeaderToggle: document.getElementById('minimap-header-toggle'),
    btnMinimizeMinimap: document.getElementById('btn-minimize-minimap'),
    minimapCanvas: document.getElementById('minimap-canvas'),
    minimapViewport: document.getElementById('minimap-viewport'),

    // Capa de Guías de Alineación Magnética
    alignmentGuidesOverlay: document.getElementById('alignment-guides-overlay'),

    // Modal Cómputo de Materiales (BOM)
    btnOpenBomMenu: document.getElementById('btn-open-bom-menu'),
    modalBom: document.getElementById('modal-bom'),
    btnCloseBomModal: document.getElementById('btn-close-bom-modal'),
    btnCloseBomBottom: document.getElementById('btn-close-bom-bottom'),
    tabBomCables: document.getElementById('tab-bom-cables'),
    tabBomHardware: document.getElementById('tab-bom-hardware'),
    tabBomPorts: document.getElementById('tab-bom-ports'),
    bomPanelCables: document.getElementById('bom-panel-cables'),
    bomPanelHardware: document.getElementById('bom-panel-hardware'),
    bomPanelPorts: document.getElementById('bom-panel-ports'),
    btnExportBomCsv: document.getElementById('btn-export-bom-csv'),
    btnCopyBom: document.getElementById('btn-copy-bom')
  };

  let pendingConnection = null; // Guarda { fromNodeId, toNodeId } mientras el modal está abierto

  // ==========================================================================
  // INICIALIZACIÓN
  // ==========================================================================
  function init() {
    // Restaurar tema (Oscuro por defecto o Blanco si fue seleccionado)
    try {
      const urlTheme = new URLSearchParams(window.location.search).get('theme');
      const savedTheme = urlTheme || localStorage.getItem('nettopology_theme') || 'dark';
      applyTheme(savedTheme);
    } catch (e) {}

    renderPalette();
    setupCanvasEvents();
    setupToolbarEvents();
    setupPanelToggles();
    setupSheetEvents();
    setupModalEvents();
    setupKeyboardShortcuts();

    // Inicializar Menú Vista, Minimapa y Cómputo de Materiales
    initViewMenu();
    initMinimap();
    initBomModal();

    // Inicializar gestor multi-proyecto y restaurar el proyecto activo
    initProjectsManager();

    updateViewportTransform();

    // Inicializar historia con el estado inicial del proyecto
    state.history = [createHistorySnapshot()];
    state.historyIndex = 0;
    updateUndoRedoUI();
  }

  // ==========================================================================
  // RENDERIZADO DE LA PALETA DE EQUIPOS
  // ==========================================================================
  function renderPalette() {
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

  // ==========================================================================
  // GESTIÓN DE NODOS
  // ==========================================================================
  // Geometría y centros ópticos según el tipo de dispositivo
  function getNodeGeometry(node) {
    const scale = (node && node.scale) || 1;
    const type = (node && node.type) || '';
    if (type === 'transfer') {
      return {
        cx: node.x + 100,
        cy: node.y + 32,
        hw: 94 * scale,
        hh: 28 * scale,
        pad: 6 * scale
      };
    }
    if (type === 'canal_tension_7') {
      return {
        cx: node.x + 135,
        cy: node.y + 32,
        hw: 129 * scale,
        hh: 28 * scale,
        pad: 6 * scale
      };
    }
    if (type === 'canal_tension_5' || type === 'canal_tension') {
      return {
        cx: node.x + 105,
        cy: node.y + 32,
        hw: 99 * scale,
        hh: 28 * scale,
        pad: 6 * scale
      };
    }
    if (type === 'text_badge') {
      const text = (node.ip || node.name || '192.168.1.0/24').trim();
      const w = Math.max(text.length * 8.5 + 24, 68);
      const h = 26;
      return {
        cx: node.x + w / 2,
        cy: node.y + h / 2,
        hw: (w / 2) * scale,
        hh: (h / 2) * scale,
        pad: 2 * scale
      };
    }
    if (node && node.encapsulatedLabels) {
      if (type === 'transfer') {
        return {
          cx: node.x + 100,
          cy: node.y + 44,
          hw: 98 * scale,
          hh: 44 * scale,
          pad: 6 * scale
        };
      }
      if (type === 'canal_tension_7') {
        return {
          cx: node.x + 135,
          cy: node.y + 44,
          hw: 133 * scale,
          hh: 44 * scale,
          pad: 6 * scale
        };
      }
      if (type === 'canal_tension_5' || type === 'canal_tension') {
        return {
          cx: node.x + 105,
          cy: node.y + 44,
          hw: 103 * scale,
          hh: 44 * scale,
          pad: 6 * scale
        };
      }

      let boxW = 68;
      let boxH = 68;
      const el = typeof document !== 'undefined' && node.id ? document.getElementById(node.id) : null;
      if (el) {
        const iconBox = el.querySelector('.node-icon-box');
        if (iconBox && iconBox.offsetWidth > 0) {
          boxW = iconBox.offsetWidth;
          boxH = iconBox.offsetHeight;
        }
      } else {
        const nameText = (node.customName !== undefined && node.customName !== null ? node.customName : (node.name || '')).trim();
        const ipText = (node.ip || '').trim();
        const nameW = nameText.length > 0 ? (nameText.length * 8.2 + 20) : 0;
        const ipW = ipText.length > 0 ? (ipText.length * 7.2 + 22) : 0;
        boxW = Math.max(68, Math.round(Math.max(nameW, ipW)));
        boxH = ipText.length > 0 ? 98 : (nameText.length > 0 ? 76 : 68);
      }

      return {
        cx: node.x + boxW / 2,
        cy: node.y + boxH / 2,
        hw: (boxW / 2) * scale,
        hh: (boxH / 2) * scale,
        pad: 6 * scale
      };
    }
    return {
      cx: node.x + 52,
      cy: node.y + 40,
      hw: 36 * scale,
      hh: 36 * scale,
      pad: 6 * scale
    };
  }

  // Centrado estricto de dispositivos en la cuadrícula:
  // Ajustamos (x, y) de modo que el centro del dispositivo caiga con exactitud en la intersección de la cuadrícula.
  function snapNodeCoordinates(x, y, type = '') {
    if (type === 'text_badge') {
      return {
        x: Math.round(x / state.gridSize) * state.gridSize,
        y: Math.round(y / state.gridSize) * state.gridSize
      };
    }
    let offsetX = 52;
    let offsetY = 40;
    if (type === 'transfer') {
      offsetX = 100;
      offsetY = 32;
    } else if (type === 'canal_tension_7') {
      offsetX = 135;
      offsetY = 32;
    } else if (type === 'canal_tension_5' || type === 'canal_tension') {
      offsetX = 105;
      offsetY = 32;
    }
    const cx = x + offsetX;
    const cy = y + offsetY;
    const snappedCx = Math.round(cx / state.gridSize) * state.gridSize;
    const snappedCy = Math.round(cy / state.gridSize) * state.gridSize;
    return {
      x: snappedCx - offsetX,
      y: snappedCy - offsetY
    };
  }

  function createNode(type, x, y, customProps = {}) {
    const meta = DEVICE_METADATA[type] || {
      label: 'Equipo',
      defaultNamePrefix: 'NODE',
      defaultIp: '192.168.1.100',
      ports: ['eth0']
    };

    // Contar cuántos del mismo tipo hay para sugerir nombre
    const count = state.nodes.filter(n => n.type === type).length + 1;
    let defaultName = `${meta.defaultNamePrefix}-${count}`;
    if (['ups', 'transfer', 'termica', 'switch_cisco', 'switch_hp', 'switch_huawei', 'switch_aruba', 'nvr', 'dvr', 'camara', 'nas', 'pc_backup'].includes(type)) {
      defaultName = count > 1 ? `${meta.defaultNamePrefix} ${count}` : meta.defaultNamePrefix;
    }

    if (state.snapToGrid) {
      const snapped = snapNodeCoordinates(x, y, type);
      x = snapped.x;
      y = snapped.y;
    }

    const node = {
      id: customProps.id || 'node_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      type: type,
      name: customProps.name || defaultName,
      ip: customProps.ip || meta.defaultIp,
      mask: customProps.mask || '255.255.255.0 (/24)',
      gateway: customProps.gateway || '192.168.1.1',
      x: x,
      y: y,
      scale: customProps.scale || 1,
      notes: customProps.notes || '',
      availablePorts: customProps.availablePorts || [...(meta.ports || ['Port 1'])]
    };

    state.nodes.push(node);
    renderNodeElement(node);
    selectElement('node', node.id);
    return node;
  }

  function renderNodeElement(node) {
    let el = document.getElementById(node.id);
    if (!el) {
      el = document.createElement('div');
      el.id = node.id;
      el.className = 'network-node';
      dom.nodesLayer.appendChild(el);
      setupNodeDragEvents(el, node);
    }

    el.dataset.nodeType = node.type;

    if (node.type === 'text_badge') {
      el.classList.add('node-type-text-badge');
      el.classList.remove('node-wide');
      const textVal = escapeHtml((node.ip || node.name || '192.168.1.0/24').trim());
      const badgeColor = node.badgeColor || 'emerald';

      el.style.left = `${node.x}px`;
      el.style.top = `${node.y}px`;
      el.style.setProperty('--node-scale', node.scale || 1);

      el.innerHTML = `
        <div class="node-text-badge-box color-${badgeColor}" title="${textVal} (Doble clic para editar)">
          <span class="node-text-badge-content">${textVal}</span>
          <div class="node-cable-handle" title="Tirar cable hacia otro equipo o texto" data-handle="true">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" style="pointer-events: none;">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </div>
        </div>
      `;

      // Edición rápida in-situ con doble clic
      const box = el.querySelector('.node-text-badge-box');
      if (box) {
        box.addEventListener('dblclick', (e) => {
          e.stopPropagation();
          const span = box.querySelector('.node-text-badge-content');
          if (!span) return;
          const currentVal = node.ip || node.name || '';
          span.style.display = 'none';

          let input = box.querySelector('.node-text-badge-inline-input');
          if (!input) {
            input = document.createElement('input');
            input.type = 'text';
            input.className = 'node-text-badge-inline-input';
            box.insertBefore(input, box.firstChild);
          }
          input.value = currentVal;
          input.style.display = 'inline-block';
          input.focus();
          input.select();

          const finishEdit = () => {
            const newVal = input.value.trim() || currentVal;
            node.ip = newVal;
            node.name = newVal;
            input.remove();
            span.textContent = newVal;
            span.style.display = 'inline';
            renderConnections();
            renderInspector();
            saveState();
          };

          input.addEventListener('blur', finishEdit, { once: true });
          input.addEventListener('keydown', (ke) => {
            if (ke.key === 'Enter') {
              ke.preventDefault();
              input.blur();
            } else if (ke.key === 'Escape') {
              ke.preventDefault();
              input.value = currentVal;
              input.blur();
            }
          });
        });
      }

      const isNodeSelected = state.selectedNodeIds && state.selectedNodeIds.has(node.id);
      if (isNodeSelected) {
        el.classList.add('selected');
        el.classList.toggle('multi-selected', state.selectedNodeIds.size > 1);
      } else {
        el.classList.remove('selected');
        el.classList.remove('multi-selected');
      }
      return;
    } else {
      el.classList.remove('node-type-text-badge');
    }

    if (node.type === 'transfer' || (node.type && node.type.startsWith('canal_tension'))) {
      el.classList.add('node-wide');
    } else {
      el.classList.remove('node-wide');
    }

    el.classList.toggle('node-encapsulated', Boolean(node.encapsulatedLabels));

    const isLight = state.theme === 'light';
    const iconSvg = typeof getDeviceIcon === 'function' ? getDeviceIcon(node.type, isLight) : (DEVICE_ICONS[node.type] || DEVICE_ICONS.pc);

    el.style.left = `${node.x}px`;
    el.style.top = `${node.y}px`;
    el.style.setProperty('--node-scale', node.scale || 1);

    const rawName = (node.customName !== undefined && node.customName !== null ? node.customName : (node.name || '')).trim();
    const rawIp = (node.ip || '').trim();

    const encapsulatedHtml = node.encapsulatedLabels && (rawName || rawIp) ? `
      <div class="node-encapsulated-content">
        ${rawName ? `<div class="node-encapsulated-label" title="${escapeHtml(rawName)}">${escapeHtml(rawName)}</div>` : ''}
        ${rawIp ? `<div class="node-encapsulated-ip">${escapeHtml(rawIp)}</div>` : ''}
      </div>
    ` : '';

    const showOuterName = !node.encapsulatedLabels && Boolean(rawName);
    const showOuterIp = !node.encapsulatedLabels && Boolean(rawIp);

    el.innerHTML = `
      <div class="node-icon-box" title="${node.name}">
        ${iconSvg}
        ${encapsulatedHtml}
        <div class="node-cable-handle" title="Tirar cable hacia otro equipo" data-handle="true">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" style="pointer-events: none;">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </div>
      </div>
      ${showOuterName ? `<div class="node-label">${escapeHtml(rawName)}</div>` : ''}
      ${showOuterIp ? `<div class="node-ip">${escapeHtml(rawIp)}</div>` : ''}
    `;

    const isNodeSelected = state.selectedNodeIds && state.selectedNodeIds.has(node.id);
    if (isNodeSelected) {
      el.classList.add('selected');
      el.classList.toggle('multi-selected', state.selectedNodeIds.size > 1);
    } else {
      el.classList.remove('selected');
      el.classList.remove('multi-selected');
    }
  }

  function updateNodePosition(node, x, y, updateCables = true) {
    if (state.snapToGrid) {
      const snapped = snapNodeCoordinates(x, y, node.type);
      x = snapped.x;
      y = snapped.y;
    }
    node.x = x;
    node.y = y;

    const el = document.getElementById(node.id);
    if (el) {
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
    }

    if (updateCables) {
      // Actualizar todos los cables conectados a este nodo
      renderConnections();
    }
  }

  function deleteNode(nodeId) {
    // Eliminar cables asociados
    state.connections = state.connections.filter(c => c.fromNodeId !== nodeId && c.toNodeId !== nodeId);

    // Eliminar nodo del estado
    state.nodes = state.nodes.filter(n => n.id !== nodeId);

    // Eliminar del DOM
    const el = document.getElementById(nodeId);
    if (el) el.remove();

    if (state.selection.id === nodeId) {
      deselectAll();
    }

    renderConnections();
    saveState();
  }

  function generateDuplicateName(baseName) {
    const existingNames = new Set(state.nodes.map(n => n.name));
    const numMatch = baseName.match(/^(.*?)(\d+)$/);
    let nextName = '';
    if (numMatch) {
      const prefix = numMatch[1];
      let num = parseInt(numMatch[2], 10) + 1;
      nextName = `${prefix}${num}`;
      while (existingNames.has(nextName)) {
        num++;
        nextName = `${prefix}${num}`;
      }
    } else {
      let counter = 2;
      nextName = `${baseName} ${counter}`;
      while (existingNames.has(nextName)) {
        counter++;
        nextName = `${baseName} ${counter}`;
      }
    }
    return nextName;
  }

  function generateFreeCorrelativeIp(baseIp) {
    const existingIps = new Set(state.nodes.map(n => n.ip));
    const parts = (baseIp || '').split('.');
    if (parts.length === 4 && !isNaN(parseInt(parts[3], 10))) {
      let lastOctet = parseInt(parts[3], 10) + 1;
      const prefix = `${parts[0]}.${parts[1]}.${parts[2]}.`;
      let nextIp = `${prefix}${lastOctet}`;
      while (existingIps.has(nextIp) && lastOctet < 254) {
        lastOctet++;
        nextIp = `${prefix}${lastOctet}`;
      }
      return nextIp;
    }
    return incrementIp(baseIp);
  }

  function duplicateNode(nodeId) {
    const orig = state.nodes.find(n => n.id === nodeId);
    if (!orig) return;

    const newName = generateDuplicateName(orig.name);
    const newIp = generateFreeCorrelativeIp(orig.ip);

    const newNode = createNode(orig.type, orig.x + 40, orig.y + 40, {
      name: newName,
      ip: newIp,
      mask: orig.mask,
      gateway: orig.gateway,
      scale: orig.scale || 1,
      notes: orig.notes,
      availablePorts: [...orig.availablePorts]
    });

    saveState();
    if (typeof updateMinimap === 'function') updateMinimap();
    showToast(`Equipo duplicado: ${newName}`);
    return newNode;
  }

  function duplicateSelectedNodes() {
    const ids = Array.from(state.selectedNodeIds);
    const zoneIds = state.selectedZoneIds ? Array.from(state.selectedZoneIds) : [];
    if (ids.length === 0 && zoneIds.length === 0) return;

    const offset = 48;
    const oldToNewIdMap = {};
    const newSelectedIds = new Set();
    const newSelectedZoneIds = new Set();

    ids.forEach(id => {
      const orig = state.nodes.find(n => n.id === id);
      if (orig) {
        const newName = generateDuplicateName(orig.name);
        const newIp = generateFreeCorrelativeIp(orig.ip);

        const newNode = createNode(orig.type, orig.x + offset, orig.y + offset, {
          name: newName,
          ip: newIp,
          mask: orig.mask,
          gateway: orig.gateway,
          scale: orig.scale || 1,
          notes: orig.notes,
          availablePorts: [...orig.availablePorts]
        });
        oldToNewIdMap[orig.id] = newNode.id;
        newSelectedIds.add(newNode.id);
      }
    });

    zoneIds.forEach(zid => {
      const origZone = (state.zones || []).find(z => z.id === zid);
      if (origZone) {
        const newZone = createZone(
          origZone.name ? `${origZone.name} (Copia)` : 'Zona (Copia)',
          origZone.x + offset,
          origZone.y + offset,
          origZone.width,
          origZone.height,
          origZone.color
        );
        if (newZone) newSelectedZoneIds.add(newZone.id);
      }
    });

    // Replicar conexiones internas que existían entre los nodos duplicados
    const internalConns = state.connections.filter(c => ids.includes(c.fromNodeId) && ids.includes(c.toNodeId));
    internalConns.forEach(c => {
      const newFrom = oldToNewIdMap[c.fromNodeId];
      const newTo = oldToNewIdMap[c.toNodeId];
      if (newFrom && newTo) {
        createConnection(newFrom, newTo, c.fromPort, c.toPort, c.cableType, c.networkLabel);
      }
    });

    state.selectedNodeIds = newSelectedIds;
    state.selectedZoneIds = newSelectedZoneIds;
    const totalCount = newSelectedIds.size + newSelectedZoneIds.size;
    state.selection = {
      type: totalCount > 1 ? 'multi-node' : (newSelectedIds.size === 1 ? 'node' : (newSelectedZoneIds.size === 1 ? 'zone' : null)),
      id: Array.from(newSelectedIds)[0] || Array.from(newSelectedZoneIds)[0] || null,
      ids: [...Array.from(newSelectedIds), ...Array.from(newSelectedZoneIds)]
    };

    updateSelectionVisuals();
    renderConnections();
    renderInspector();
    saveState();
    if (typeof updateMinimap === 'function') updateMinimap();
    showToast(`Se duplicaron ${totalCount} elemento(s) con éxito`);
  }

  function deleteSelectedNodes() {
    const nodeIds = Array.from(state.selectedNodeIds);
    const zoneIds = state.selectedZoneIds ? Array.from(state.selectedZoneIds) : [];
    if (nodeIds.length === 0 && zoneIds.length === 0) return;
    const totalCount = nodeIds.length + zoneIds.length;

    let msg = `¿Eliminar los ${totalCount} elementos seleccionados?`;
    if (nodeIds.length > 0 && zoneIds.length === 0) {
      msg = `¿Eliminar los ${nodeIds.length} dispositivos seleccionados y sus conexiones?`;
    } else if (nodeIds.length === 0 && zoneIds.length > 0) {
      msg = `¿Eliminar la(s) ${zoneIds.length} zona(s) seleccionada(s)?`;
    }

    if (confirm(msg)) {
      nodeIds.forEach(nodeId => {
        // Eliminar cables asociados
        state.connections = state.connections.filter(c => c.fromNodeId !== nodeId && c.toNodeId !== nodeId);
        // Eliminar nodo del estado
        state.nodes = state.nodes.filter(n => n.id !== nodeId);
        // Eliminar del DOM
        const el = document.getElementById(nodeId);
        if (el) el.remove();
      });

      zoneIds.forEach(zoneId => {
        state.zones = (state.zones || []).filter(z => z.id !== zoneId);
        const el = document.getElementById(zoneId);
        if (el) el.remove();
      });

      deselectAll();
      saveState();
      if (typeof updateMinimap === 'function') updateMinimap();
    }
  }

  // ==========================================================================
  // GESTIÓN DE CABLES Y CONEXIONES ENTRE BOCAS
  // ==========================================================================
  function createConnection(fromNodeId, toNodeId, fromPort, toPort, cableType = 'ethernet', networkLabel = '', options = {}) {
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

    const connection = {
      id: 'cable_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      fromNodeId,
      toNodeId,
      fromPort: fromPort || 'Port 1',
      toPort: toPort || 'Port 1',
      cableType: resolvedCableType || 'ethernet',
      networkLabel: networkLabel || '',
      fromSide: fromSide,
      toSide: toSide
    };

    state.connections.push(connection);
    renderConnections();
    selectElement('cable', connection.id);
    saveState();
    return connection;
  }

  function deleteConnection(cableId) {
    state.connections = state.connections.filter(c => c.id !== cableId);
    if (state.selection.id === cableId) {
      deselectAll();
    }
    renderConnections();
    saveState();
  }

  // Calcula el punto de anclaje perimetral del dispositivo hacia el punto objetivo
  // (salida directa desde el borde del icono del dispositivo, por la cara más cercana)
  function getNodeEdgeAnchor(node, targetX, targetY) {
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
  function getNodeAnchorSide(node, anchor) {
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
  function getAnchorOnSide(node, side, targetX, targetY, offsetPx = 0, portName = '') {
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

    // Modo Automático continuo: calcula la intersección en cualquier punto del perímetro
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
  function generateRoundedPath(points, radius = 12) {
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
  function drawRoundedPathOnCanvas(ctx, points, minX, minY, radius = 12) {
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
  function generateCatmullRomSpline(points) {
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
  function computeCurvedSplineNoWaypoints(nodeA, nodeB, conn, offsetIdx) {
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
  function insertWaypointAtOptimalIndex(conn, clickPoint, nodeA, nodeB) {
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
  function insertWaypointAtPoint(conn, nodeA, nodeB, clickPoint) {
    if (nodeA && typeof nodeA.x === 'number' && typeof nodeA.y === 'number' && !clickPoint) {
      insertWaypointAtOptimalIndex(conn, nodeA, nodeB, clickPoint);
    } else {
      insertWaypointAtOptimalIndex(conn, clickPoint, nodeA, nodeB);
    }
  }

  // Calcula los vértices para trazado ortogonal (90°) permitiendo salidas por cualquier lado y posición
  function computeOrthogonalPoints(nodeA, nodeB, conn, offsetIdx) {
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

      const pA = { x: anchorA.x, y: anchorA.y };
      const pB = { x: anchorB.x, y: anchorB.y };
      const nA = anchorA.normal;
      const nB = anchorB.normal;

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
        const sIdx = sideConnsA.findIndex(c => c.id === conn.id);
        if (sIdx >= 0) {
          spreadShift = (sIdx - (sideConnsA.length - 1) / 2) * 16;
        }
      }

      let pts = [];

      // A) Ambos horizontales
      if (nA.y === 0 && nB.y === 0) {
        if (nA.x !== nB.x) {
          // Enfrentados (ej: A sale derecha, B recibe izquierda)
          const inFront = (pB.x - pA.x) * nA.x > 0;
          if (inFront) {
            if (Math.abs(pA.y - pB.y) < 4) {
              pts = [pA, pB];
            } else {
              const xMin = Math.min(pA.x, pB.x) + 16;
              const xMax = Math.max(pA.x, pB.x) - 16;
              let midX = (pA.x + pB.x) / 2 + parallelShift + spreadShift;
              if (xMin < xMax) {
                midX = Math.max(xMin, Math.min(xMax, midX));
              }
              if (state.snapToGrid) midX = Math.round(midX / state.gridSize) * state.gridSize;
              pts = [pA, { x: midX, y: pA.y }, { x: midX, y: pB.y }, pB];
            }
          } else {
            const stubA = pA.x + nA.x * 20;
            const turnY = pB.y >= pA.y ? Math.max(pA.y + 30, pB.y - 20) : Math.min(pA.y - 30, pB.y + 20);
            pts = [pA, { x: stubA, y: pA.y }, { x: stubA, y: turnY }, { x: pB.x, y: turnY }, pB];
          }
        } else {
          // Misma dirección horizontal (U-bend)
          const turnX = nA.x > 0 ? Math.max(pA.x, pB.x) + 24 + Math.abs(parallelShift) + Math.abs(spreadShift) : Math.min(pA.x, pB.x) - 24 - Math.abs(parallelShift) - Math.abs(spreadShift);
          pts = [pA, { x: turnX, y: pA.y }, { x: turnX, y: pB.y }, pB];
        }
      }
      // B) Ambos verticales
      else if (nA.x === 0 && nB.x === 0) {
        if (nA.y !== nB.y) {
          // Enfrentados (ej: A sale abajo, B recibe arriba)
          const inFront = (pB.y - pA.y) * nA.y > 0;
          if (inFront) {
            if (Math.abs(pA.x - pB.x) < 4) {
              pts = [pA, pB];
            } else {
              const yMin = Math.min(pA.y, pB.y) + 16;
              const yMax = Math.max(pA.y, pB.y) - 16;
              let midY = (pA.y + pB.y) / 2 + parallelShift + spreadShift;
              if (yMin < yMax) {
                midY = Math.max(yMin, Math.min(yMax, midY));
              }
              if (state.snapToGrid) midY = Math.round(midY / state.gridSize) * state.gridSize;
              pts = [pA, { x: pA.x, y: midY }, { x: pB.x, y: midY }, pB];
            }
          } else {
            // Rodeo limpio sin subir por encima de los equipos
            const stubA = pA.y + nA.y * 20;
            const turnX = pB.x >= pA.x ? Math.max(pA.x + 30, pB.x - 20) : Math.min(pA.x - 30, pB.x + 20);
            pts = [pA, { x: pA.x, y: stubA }, { x: turnX, y: stubA }, { x: turnX, y: pB.y }, pB];
          }
        } else {
          // Misma dirección vertical (U-bend)
          const turnY = nA.y > 0 ? Math.max(pA.y, pB.y) + 24 + Math.abs(parallelShift) + Math.abs(spreadShift) : Math.min(pA.y, pB.y) - 24 - Math.abs(parallelShift) - Math.abs(spreadShift);
          pts = [pA, { x: pA.x, y: turnY }, { x: pB.x, y: turnY }, pB];
        }
      }
      // C) Perpendiculares: A horizontal, B vertical
      else if (nA.y === 0 && nB.x === 0) {
        const canL = (pB.x - pA.x) * nA.x >= 0 && (pA.y - pB.y) * nB.y >= 0;
        if (canL) {
          pts = [pA, { x: pB.x, y: pA.y }, pB];
        } else {
          const stubA = pA.x + nA.x * 20;
          pts = [pA, { x: stubA, y: pA.y }, { x: stubA, y: pB.y - nB.y * 20 }, { x: pB.x, y: pB.y - nB.y * 20 }, pB];
        }
      }
      // D) Perpendiculares: A vertical, B horizontal
      else {
        const canL = (pB.y - pA.y) * nA.y >= 0 && (pA.x - pB.x) * nB.x >= 0;
        if (canL) {
          pts = [pA, { x: pA.x, y: pB.y }, pB];
        } else {
          const stubA = pA.y + nA.y * 20;
          pts = [pA, { x: pA.x, y: stubA }, { x: pB.x - nB.x * 20, y: stubA }, { x: pB.x - nB.x * 20, y: pB.y }, pB];
        }
      }

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
  function getPointAlongPolyline(points, distPx, fromEnd = false) {
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
  function computeConnectionCurve(conn, nodeA, nodeB, pairInfo = null) {
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
  function getPointAlongCable(curve, distPx, fromEnd = false) {
    if (curve && Array.isArray(curve.points) && curve.points.length > 0) {
      return getPointAlongPolyline(curve.points, distPx, fromEnd);
    }
    return fromEnd ? { x: curve.x2, y: curve.y2 } : { x: curve.x1, y: curve.y1 };
  }

  // Obtiene punto x, y de una curva de Bézier cúbica para t entre 0 y 1
  function getBezierPoint(t, p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y) {
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
  function resolveLabelCollisions(badges) {
    if (!badges || badges.length === 0) return;

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

  function getLineSegmentIntersection(p1, p2, p3, p4) {
    const d1x = p2.x - p1.x;
    const d1y = p2.y - p1.y;
    const d2x = p4.x - p3.x;
    const d2y = p4.y - p3.y;

    const cross = d1x * d2y - d1y * d2x;
    if (Math.abs(cross) < 1e-5) return null; // Paralelas o colineales

    const dx = p3.x - p1.x;
    const dy = p3.y - p1.y;

    const t = (dx * d2y - dy * d2x) / cross;
    const u = (dx * d1y - dy * d1x) / cross;

    // t y u deben estar estrictamente en el interior del segmento (evitando extremos exactos)
    if (t > 0.04 && t < 0.96 && u > 0.04 && u < 0.96) {
      return {
        x: p1.x + t * d1x,
        y: p1.y + t * d1y,
        t,
        u
      };
    }
    return null;
  }

  function isPointNearAnyNode(x, y, minDist = 44) {
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

  function getSegmentsFromCurve(curve) {
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

  function rebuildCurveWithJumps(curve, cleanPts, segmentsWithJumps, jumpRadius = 7.5) {
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

  function applyCableBridgesToCurves(activeCurves) {
    if (!state.cableBridgesEnabled || activeCurves.length < 2) return;

    // Optimización: Pre-calcular centros y radios de proximidad de los nodos una sola vez
    const nodeCircles = state.nodes.map(n => {
      const geo = getNodeGeometry(n);
      const effDist = Math.max(44, geo.hw + 8);
      return { cx: geo.cx, cy: geo.cy, rSq: effDist * effDist };
    });
    const isPointNearPrecomputedNode = (x, y) => {
      for (let i = 0; i < nodeCircles.length; i++) {
        const c = nodeCircles[i];
        const dx = x - c.cx;
        const dy = y - c.cy;
        if ((dx * dx + dy * dy) < c.rSq) return true;
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

    for (let j = 1; j < curveMeta.length; j++) {
      const currentMeta = curveMeta[j];
      let hasJumps = false;

      for (let k = 0; k < j; k++) {
        const prevMeta = curveMeta[k];

        for (let sj = 0; sj < currentMeta.segments.length; sj++) {
          const segJ = currentMeta.segments[sj];

          for (let sk = 0; sk < prevMeta.segments.length; sk++) {
            const segK = prevMeta.segments[sk];

            const hit = getLineSegmentIntersection(segJ.p1, segJ.p2, segK.p1, segK.p2);
            if (hit) {
              if (isPointNearPrecomputedNode(hit.x, hit.y)) continue;

              segJ.jumps.push({
                x: hit.x,
                y: hit.y,
                t: hit.t
              });
              hasJumps = true;
            }
          }
        }
      }

      if (hasJumps) {
        rebuildCurveWithJumps(currentMeta.item.curve, currentMeta.pts, currentMeta.segments, jumpRadius);
      }
    }
  }

  // Configura la interacción de arrastre y eliminación para un punto de inflexión de cable
  function setupWaypointInteraction(wpGroup, conn, index) {
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
  function setupDraggableBadge(badgeEl, conn, offsetKey, basePos) {
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

  function renderConnections() {
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

  // ==========================================================================
  // ==========================================================================
  // MANIPULACIÓN DE EVENTOS DEL CANVAS (HOJA INFINITA, PAN, ZOOM, DRAG & DROP)
  // ==========================================================================
  function setCanvasMode(mode) {
    state.canvasMode = mode;
    if (dom.btnModeSelect) dom.btnModeSelect.classList.toggle('active-mode', mode === 'select');
    if (dom.btnModePan) dom.btnModePan.classList.toggle('active-mode', mode === 'pan');
    dom.viewport.classList.toggle('mode-pan', mode === 'pan');
  }

  function setupCanvasEvents() {
    let isPanning = false;
    let startPan = { x: 0, y: 0 };
    let isSpacePressed = false;

    // Detectar barra espaciadora para paneo fluido tipo Figma / Miro
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        e.preventDefault(); // Prevenir scroll nativo de página con barra espaciadora
        if (!isSpacePressed) {
          isSpacePressed = true;
          dom.viewport.classList.add('space-grab');
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        isSpacePressed = false;
        dom.viewport.classList.remove('space-grab');
        if (isPanning) {
          isPanning = false;
          dom.viewport.classList.remove('panning');
        }
      }
    });

    // Soltar dispositivo desde la paleta izquierda
    dom.viewport.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    });

    dom.viewport.addEventListener('drop', (e) => {
      e.preventDefault();
      const type = e.dataTransfer.getData('text/plain');
      if (type === 'vlan_zone' || type === 'zone') {
        const rect = dom.viewport.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        const worldPos = screenToWorld(screenX, screenY);
        createZone('VLAN ' + ((state.zones ? state.zones.length : 0) + 10), worldPos.x - 160, worldPos.y - 110, 320, 220);
        saveState();
        return;
      }
      if (type && DEVICE_METADATA[type]) {
        const rect = dom.viewport.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        const worldPos = screenToWorld(screenX, screenY);
        createNode(type, worldPos.x - 52, worldPos.y - 40);
        saveState();
      }
    });

    // Paneo infinito o Selección por recuadro (Marquee Selection)
    let isMarqueeSelecting = false;
    let marqueeStart = { clientX: 0, clientY: 0, screenX: 0, screenY: 0 };

    dom.viewport.addEventListener('mousedown', (e) => {
      const isMiddleClick = e.button === 1;
      const isRightClick = e.button === 2;
      const isSpaceClick = (e.button === 0 && isSpacePressed);
      const isPanModeClick = (state.canvasMode === 'pan' && e.button === 0);
      const isInteractive = e.target.closest('.network-node') || 
                            e.target.closest('.node-cable-handle') || 
                            e.target.closest('.canvas-controls') || 
                            e.target.closest('.floating-panel-toggle') || 
                            e.target.closest('.port-badge') || 
                            e.target.closest('.cable-waypoint-group') || 
                            e.target.closest('.cable-ghost-handle') || 
                            e.target.closest('.zone-header') || 
                            e.target.closest('.zone-edge-handle') || 
                            e.target.closest('.zone-corner-handle') || 
                            e.target.classList.contains('network-cable') || 
                            e.target.classList.contains('cable-outline');

      // Paneo con: Botón derecho, Botón central, Espacio + Clic, o Modo Mano (Pan)
      if (isMiddleClick || isRightClick || isSpaceClick || (isPanModeClick && !isInteractive)) {
        isPanning = true;
        startPan = { x: e.clientX - state.viewport.x, y: e.clientY - state.viewport.y };
        dom.viewport.classList.add('panning');
        e.preventDefault();
        return;
      }

      if (!isInteractive && e.button === 0 && state.canvasMode === 'select') {
        // Clic en el fondo libre: iniciar marquesina de selección elástica
        const rect = dom.viewport.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;

        marqueeStart = { clientX: e.clientX, clientY: e.clientY, screenX, screenY };
        isMarqueeSelecting = true;

        if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
          deselectAll();
        }

        if (dom.marquee) {
          dom.marquee.style.left = `${screenX}px`;
          dom.marquee.style.top = `${screenY}px`;
          dom.marquee.style.width = '0px';
          dom.marquee.style.height = '0px';
          dom.marquee.style.display = 'block';
        }
        e.preventDefault();
      }
    });

    // Evitar menú contextual al usar clic derecho para panear
    dom.viewport.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    let panRafId = null;
    let pendingPan = null;

    let marqueeRafId = null;
    let pendingMarquee = null;

    let connectingRafId = null;
    let pendingConnecting = null;

    window.addEventListener('mousemove', (e) => {
      if (isPanning) {
        pendingPan = { clientX: e.clientX, clientY: e.clientY };
        if (!panRafId) {
          panRafId = requestAnimationFrame(() => {
            if (isPanning && pendingPan) {
              state.viewport.x = pendingPan.clientX - startPan.x;
              state.viewport.y = pendingPan.clientY - startPan.y;
              updateViewportTransform();
            }
            panRafId = null;
          });
        }
      } else if (isMarqueeSelecting) {
        pendingMarquee = {
          clientX: e.clientX,
          clientY: e.clientY,
          shiftKey: e.shiftKey,
          ctrlKey: e.ctrlKey,
          metaKey: e.metaKey
        };
        if (!marqueeRafId) {
          marqueeRafId = requestAnimationFrame(() => {
            if (isMarqueeSelecting && pendingMarquee) {
              const rect = dom.viewport.getBoundingClientRect();
              const curScreenX = Math.max(0, Math.min(rect.width, pendingMarquee.clientX - rect.left));
              const curScreenY = Math.max(0, Math.min(rect.height, pendingMarquee.clientY - rect.top));

              const minX = Math.min(marqueeStart.screenX, curScreenX);
              const maxX = Math.max(marqueeStart.screenX, curScreenX);
              const minY = Math.min(marqueeStart.screenY, curScreenY);
              const maxY = Math.max(marqueeStart.screenY, curScreenY);

              if (dom.marquee) {
                dom.marquee.style.left = `${minX}px`;
                dom.marquee.style.top = `${minY}px`;
                dom.marquee.style.width = `${maxX - minX}px`;
                dom.marquee.style.height = `${maxY - minY}px`;
                dom.marquee.style.display = 'block';
              }

              // Convertir caja a coordenadas del mundo del lienzo
              const worldMin = screenToWorld(minX, minY);
              const worldMax = screenToWorld(maxX, maxY);

              // Detectar nodos dentro o tocando la caja
              const baseSelected = (pendingMarquee.shiftKey || pendingMarquee.ctrlKey || pendingMarquee.metaKey) ? new Set(state.selectedNodeIds) : new Set();
              state.nodes.forEach(node => {
                const hw = 40 * (node.scale || 1);
                const hh = 40 * (node.scale || 1);
                const nodeMinX = node.x - hw;
                const nodeMaxX = node.x + hw;
                const nodeMinY = node.y - hh;
                const nodeMaxY = node.y + hh;

                const intersects = !(nodeMaxX < worldMin.x || nodeMinX > worldMax.x || nodeMaxY < worldMin.y || nodeMinY > worldMax.y);
                if (intersects) {
                  baseSelected.add(node.id);
                }
              });
              state.selectedNodeIds = baseSelected;

              // Detectar zonas dentro o englobadas por la caja (selección gigante)
              const baseSelectedZones = (pendingMarquee.shiftKey || pendingMarquee.ctrlKey || pendingMarquee.metaKey) ? new Set(state.selectedZoneIds) : new Set();
              if (Array.isArray(state.zones)) {
                const marqueeW = worldMax.x - worldMin.x;
                const marqueeH = worldMax.y - worldMin.y;

                state.zones.forEach(zone => {
                  const zMinX = zone.x;
                  const zMaxX = zone.x + zone.width;
                  const zMinY = zone.y;
                  const zMaxY = zone.y + zone.height;

                  const headerH = 38;
                  const headerIntersects = !(zMaxX < worldMin.x || zMinX > worldMax.x || (zMinY + headerH) < worldMin.y || zMinY > worldMax.y);
                  const boxEnclosesZone = (zMinX >= worldMin.x && zMaxX <= worldMax.x && zMinY >= worldMin.y && zMaxY <= worldMax.y);
                  const zoneIntersects = !(zMaxX < worldMin.x || zMinX > worldMax.x || zMaxY < worldMin.y || zMinY > worldMax.y);
                  const isGiantMarquee = (marqueeW > zone.width * 0.45 && marqueeH > zone.height * 0.45);

                  if (headerIntersects || boxEnclosesZone || (zoneIntersects && isGiantMarquee)) {
                    baseSelectedZones.add(zone.id);
                  }
                });
              }
              state.selectedZoneIds = baseSelectedZones;

              const totalCount = state.selectedNodeIds.size + state.selectedZoneIds.size;
              state.selection = {
                type: totalCount > 1 ? 'multi-node' : (state.selectedNodeIds.size === 1 ? 'node' : (state.selectedZoneIds.size === 1 ? 'zone' : null)),
                id: state.selectedNodeIds.size > 0 ? Array.from(state.selectedNodeIds)[0] : (state.selectedZoneIds.size > 0 ? Array.from(state.selectedZoneIds)[0] : null),
                ids: [...Array.from(state.selectedNodeIds), ...Array.from(state.selectedZoneIds)]
              };
              updateSelectionVisuals();
            }
            marqueeRafId = null;
          });
        }
      } else if (state.isConnecting) {
        pendingConnecting = { clientX: e.clientX, clientY: e.clientY };
        if (!connectingRafId) {
          connectingRafId = requestAnimationFrame(() => {
            if (state.isConnecting && pendingConnecting) {
              // Actualizar cable elástico temporal mientras se arrastra
              const sourceNode = state.nodes.find(n => n.id === state.connectingSourceNodeId);
              if (sourceNode) {
                const rect = dom.viewport.getBoundingClientRect();
                const screenX = pendingConnecting.clientX - rect.left;
                const screenY = pendingConnecting.clientY - rect.top;
                const mouseWorld = screenToWorld(screenX, screenY);

                const anchor = getNodeEdgeAnchor(sourceNode, mouseWorld.x, mouseWorld.y);
                dom.tempCable.setAttribute('d', `M ${anchor.x} ${anchor.y} L ${mouseWorld.x} ${mouseWorld.y}`);
                dom.tempCable.style.display = 'block';
              }
            }
            connectingRafId = null;
          });
        }
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (panRafId) {
        cancelAnimationFrame(panRafId);
        panRafId = null;
      }
      if (marqueeRafId) {
        cancelAnimationFrame(marqueeRafId);
        marqueeRafId = null;
      }
      if (connectingRafId) {
        cancelAnimationFrame(connectingRafId);
        connectingRafId = null;
      }

      if (isPanning) {
        isPanning = false;
        dom.viewport.classList.remove('panning');
      }

      if (isMarqueeSelecting) {
        isMarqueeSelecting = false;
        if (dom.marquee) {
          dom.marquee.style.display = 'none';
        }
        renderConnections();
        renderInspector();
      }

      if (state.isConnecting) {
        state.isConnecting = false;
        dom.tempCable.style.display = 'none';

        // Detectar si soltó sobre un nodo destino
        const targetElement = document.elementFromPoint(e.clientX, e.clientY);
        const targetNodeEl = targetElement ? targetElement.closest('.network-node') : null;

        if (targetNodeEl && targetNodeEl.id !== state.connectingSourceNodeId) {
          openCableConfigModal(state.connectingSourceNodeId, targetNodeEl.id);
        }
        state.connectingSourceNodeId = null;
      }
    });

    // Zoom suave y controlado con rueda del ratón hacia el puntero
    dom.viewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = 1.05; // Velocidad de zoom más suave y controlada
      const delta = e.deltaY < 0 ? zoomFactor : 1 / zoomFactor;
      applyZoom(delta, e.clientX, e.clientY);
    }, { passive: false });
  }

  function applyZoom(delta, clientX, clientY) {
    const oldZoom = state.viewport.zoom;
    let newZoom = oldZoom * delta;
    newZoom = Math.min(Math.max(newZoom, 0.15), 3.0); // Rango ampliado de 15% a 300% para la hoja infinita

    const rect = dom.viewport.getBoundingClientRect();
    const mouseX = clientX !== undefined ? (clientX - rect.left) : (rect.width / 2);
    const mouseY = clientY !== undefined ? (clientY - rect.top) : (rect.height / 2);

    // Ajustar origen para hacer zoom exactamente hacia el puntero del mouse
    state.viewport.x = mouseX - (mouseX - state.viewport.x) * (newZoom / oldZoom);
    state.viewport.y = mouseY - (mouseY - state.viewport.y) * (newZoom / oldZoom);
    state.viewport.zoom = newZoom;

    updateViewportTransform();
  }

  function updateViewportTransform() {
    dom.world.style.transform = `translate(${state.viewport.x}px, ${state.viewport.y}px) scale(${state.viewport.zoom})`;
    dom.zoomValue.textContent = `${Math.round(state.viewport.zoom * 100)}%`;

    // Sincronizar la cuadrícula infinita con la posición y el zoom del lienzo
    const zoom = state.viewport.zoom;
    const dotSize = state.gridSize * zoom;
    const majorLineSize = (state.gridSize * 5) * zoom;
    const posX = state.viewport.x;
    const posY = state.viewport.y;
    const dotOffset = (state.gridSize / 2) * zoom;

    dom.viewport.style.backgroundPosition = `${posX - dotOffset}px ${posY - dotOffset}px, ${posX}px ${posY}px, ${posX}px ${posY}px`;
    dom.viewport.style.backgroundSize = `${dotSize}px ${dotSize}px, ${majorLineSize}px ${majorLineSize}px, ${majorLineSize}px ${majorLineSize}px`;

    if (typeof updateMinimap === 'function') {
      updateMinimap();
    }
  }

  // Centrar y encuadrar todos los equipos en la pantalla (Fit to screen)
  function fitViewToNodes() {
    if (!state.nodes || state.nodes.length === 0) {
      state.viewport.x = 80;
      state.viewport.y = 80;
      state.viewport.zoom = 1;
      updateViewportTransform();
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    state.nodes.forEach(n => {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + 104);
      maxY = Math.max(maxY, n.y + 110);
    });

    const padding = 100;
    const contentW = (maxX - minX) + padding * 2;
    const contentH = (maxY - minY) + padding * 2;
    const viewRect = dom.viewport.getBoundingClientRect();
    const viewW = viewRect.width || window.innerWidth;
    const viewH = viewRect.height || window.innerHeight;

    let targetZoom = Math.min(viewW / contentW, viewH / contentH);
    targetZoom = Math.min(Math.max(targetZoom, 0.25), 1.5);

    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;

    state.viewport.zoom = targetZoom;
    state.viewport.x = (viewW / 2) - midX * targetZoom;
    state.viewport.y = (viewH / 2) - midY * targetZoom;

    updateViewportTransform();
  }

  function screenToWorld(screenX, screenY) {
    return {
      x: (screenX - state.viewport.x) / state.viewport.zoom,
      y: (screenY - state.viewport.y) / state.viewport.zoom
    };
  }

  function getCanvasCenterWorld() {
    const rect = dom.viewport.getBoundingClientRect();
    return screenToWorld(rect.width / 2, rect.height / 2);
  }

  // ==========================================================================
  // EVENTOS DE ARRASTRE DE NODOS Y MOVIMIENTO EN BLOQUE
  // ==========================================================================
  function setupNodeDragEvents(el, node) {
    let isDragging = false;
    let dragStart = { x: 0, y: 0 };
    let hasMoved = false;

    el.addEventListener('mousedown', (e) => {
      // Si hizo clic en el conector circular (+) para tirar cable
      const handle = e.target.closest('.node-cable-handle');
      if (handle || e.target.dataset.handle) {
        e.stopPropagation();
        state.isConnecting = true;
        state.connectingSourceNodeId = node.id;
        return;
      }

      if (e.button !== 0) return; // Solo clic primario
      e.stopPropagation();

      const isMultiKey = e.shiftKey || e.ctrlKey || e.metaKey;

      if (isMultiKey) {
        // Alternar este nodo en la selección múltiple
        if (state.selectedNodeIds.has(node.id)) {
          state.selectedNodeIds.delete(node.id);
        } else {
          state.selectedNodeIds.add(node.id);
        }

        state.selection = {
          type: state.selectedNodeIds.size > 1 ? 'multi-node' : (state.selectedNodeIds.size === 1 ? 'node' : null),
          id: Array.from(state.selectedNodeIds)[0] || null,
          ids: Array.from(state.selectedNodeIds)
        };
        updateSelectionVisuals();
        renderConnections();
        renderInspector();

        // Si se deseleccionó con Shift, no iniciar arrastre
        if (!state.selectedNodeIds.has(node.id)) return;
      } else {
        // Si este nodo no estaba seleccionado, deseleccionar los demás y seleccionarlo
        if (!state.selectedNodeIds.has(node.id)) {
          state.selectedNodeIds.clear();
          if (state.selectedZoneIds) state.selectedZoneIds.clear();
          state.selectedNodeIds.add(node.id);
          state.selection = { type: 'node', id: node.id, ids: [node.id] };
          updateSelectionVisuals();
          renderConnections();
          renderInspector();
        }
        // Si ya formaba parte de la selección múltiple, mantenemos el grupo intacto para mover en bloque!
      }

      isDragging = true;
      hasMoved = false;
      dragStart = { x: e.clientX, y: e.clientY };

      // Guardar posiciones iniciales y referencias DOM de TODOS los nodos seleccionados para moverlos juntos en bloque
      const nodesToDrag = state.nodes.filter(n => state.selectedNodeIds.has(n.id));
      const initialPositions = nodesToDrag.map(n => ({
        node: n,
        x: n.x,
        y: n.y,
        el: document.getElementById(n.id)
      }));

      // Guardar posiciones iniciales y referencias DOM de TODAS las zonas seleccionadas para moverlas en conjunto
      const zonesToDrag = (state.zones || []).filter(z => state.selectedZoneIds && state.selectedZoneIds.has(z.id));
      const initialZonePositions = zonesToDrag.map(z => ({
        zone: z,
        x: z.x,
        y: z.y,
        el: document.getElementById(z.id)
      }));

      // Guardar posiciones iniciales de waypoints para cables cuyos dos extremos se están moviendo juntos en bloque
      const movingConnWaypoints = state.connections
        .filter(c => state.selectedNodeIds.has(c.fromNodeId) && state.selectedNodeIds.has(c.toNodeId) && Array.isArray(c.waypoints) && c.waypoints.length > 0)
        .map(c => ({
          conn: c,
          initialWps: c.waypoints.map(w => ({ ...w }))
        }));

      let rafId = null;
      let lastDx = 0;
      let lastDy = 0;

      const performDragUpdate = () => {
        rafId = null;
        if (!isDragging) return;

        // Mover todos los nodos seleccionados en conjunto manteniendo sus distancias relativas
        initialPositions.forEach(item => {
          let nx = item.x + lastDx;
          let ny = item.y + lastDy;
          if (state.snapToGrid) {
            const snapped = snapNodeCoordinates(nx, ny);
            nx = snapped.x;
            ny = snapped.y;
          }
          item.node.x = nx;
          item.node.y = ny;
          if (item.el) {
            item.el.style.left = `${nx}px`;
            item.el.style.top = `${ny}px`;
          }
        });

        // Mover todas las zonas seleccionadas en conjunto manteniendo sus distancias relativas
        initialZonePositions.forEach(item => {
          let zx = item.x + lastDx;
          let zy = item.y + lastDy;
          if (state.snapToGrid) {
            zx = Math.round(zx / state.gridSize) * state.gridSize;
            zy = Math.round(zy / state.gridSize) * state.gridSize;
          }
          item.zone.x = Math.round(zx);
          item.zone.y = Math.round(zy);
          if (item.el) {
            item.el.style.left = `${item.zone.x}px`;
            item.el.style.top = `${item.zone.y}px`;
          }
        });

        // Aplicar guías magnéticas inteligentes si se arrastra un solo equipo (y ninguna zona)
        if (state.smartGuidesEnabled && initialPositions.length === 1 && initialZonePositions.length === 0 && typeof drawAlignmentGuides === 'function') {
          drawAlignmentGuides(node);
          if (itemElPrimary) {
            itemElPrimary.style.left = `${node.x}px`;
            itemElPrimary.style.top = `${node.y}px`;
          }
        }

        // Trasladar waypoints de cables internos
        movingConnWaypoints.forEach(item => {
          item.conn.waypoints = item.initialWps.map(w => {
            let wx = w.x + lastDx;
            let wy = w.y + lastDy;
            if (state.snapToGrid) {
              wx = Math.round(wx / state.gridSize) * state.gridSize;
              wy = Math.round(wy / state.gridSize) * state.gridSize;
            }
            return { x: Math.round(wx), y: Math.round(wy) };
          });
        });

        // Actualizar todos los cables conectados de forma agrupada
        renderConnections();
      };

      const itemElPrimary = document.getElementById(node.id);

      const onMouseMove = (moveEvent) => {
        if (!isDragging) return;
        lastDx = (moveEvent.clientX - dragStart.x) / state.viewport.zoom;
        lastDy = (moveEvent.clientY - dragStart.y) / state.viewport.zoom;

        if (Math.abs(lastDx) > 1 || Math.abs(lastDy) > 1) {
          hasMoved = true;
        }

        if (!rafId) {
          rafId = requestAnimationFrame(performDragUpdate);
        }
      };

      const onMouseUp = () => {
        if (isDragging) {
          isDragging = false;
          if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
          }
          if (typeof clearAlignmentGuides === 'function') {
            clearAlignmentGuides();
          }
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
          if (hasMoved) {
            performDragUpdate();
            saveState();
            if (typeof updateMinimap === 'function') updateMinimap();
          }
        }
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });

    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (hasMoved) return; // Si fue un arrastre de grupo, no re-seleccionar

      const isMultiKey = e.shiftKey || e.ctrlKey || e.metaKey;
      const totalSelected = state.selectedNodeIds.size + (state.selectedZoneIds ? state.selectedZoneIds.size : 0);
      if (!isMultiKey && totalSelected > 1) {
        // Clic simple sin arrastrar sobre un nodo de un grupo grande: aislar selección a este nodo
        state.selectedNodeIds.clear();
        if (state.selectedZoneIds) state.selectedZoneIds.clear();
        state.selectedNodeIds.add(node.id);
        state.selection = { type: 'node', id: node.id, ids: [node.id] };
        updateSelectionVisuals();
        renderConnections();
        renderInspector();
      }
    });

    // Doble clic en el dispositivo: abrir panel lateral de propiedades y enfocar el nombre
    el.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      e.preventDefault();

      // Seleccionar el nodo exclusivamente
      selectElement('node', node.id);

      // Si el panel de propiedades está colapsado, desplegarlo
      if (dom.sidebarInspector && dom.sidebarInspector.classList.contains('collapsed')) {
        toggleInspector(false);
      }

      // Asegurar que las propiedades se rendericen
      renderInspector();

      // Desplazar al inicio del inspector y enfocar el campo de nombre para edición inmediata
      setTimeout(() => {
        if (dom.inspectorBody) {
          dom.inspectorBody.scrollTop = 0;
        }
        const nameInput = document.getElementById('prop-node-name') || document.getElementById('prop-node-custom-name');
        if (nameInput) {
          nameInput.focus();
          nameInput.select();
        }
      }, 50);
    });
  }

  // ==========================================================================
  // MODAL DE CONFIGURACIÓN DE CONEXIÓN Y BOCAS
  // ==========================================================================
  function openCableConfigModal(fromNodeId, toNodeId) {
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

  function closeCableModal() {
    dom.modalCable.classList.remove('open');
    pendingConnection = null;
  }

  // Normalizador intuitivo de nombres de bocas
  function normalizePortName(input, defaultPrefix = 'Boca') {
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

  function setupModalEvents() {
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

    // Toggle de campos para el Cuadro de Rotulación Técnico (Title Block)
    const chkExportTitleBlock = document.getElementById('chk-export-title-block');
    const wrapTitleBlockFields = document.getElementById('wrap-export-title-block-fields');
    if (chkExportTitleBlock && wrapTitleBlockFields) {
      chkExportTitleBlock.addEventListener('change', () => {
        wrapTitleBlockFields.style.display = chkExportTitleBlock.checked ? 'block' : 'none';
      });
    }

    document.getElementById('btn-confirm-export').addEventListener('click', () => {
      const selectedTheme = document.querySelector('input[name="export-theme"]:checked')?.value || 'monochrome';
      const includeGrid = document.getElementById('chk-export-grid')?.checked || false;
      const format = inpExportFormat?.value || 'pdf';
      const includeTitleBlock = chkExportTitleBlock?.checked || false;
      const exportScaleRes = parseInt(document.getElementById('inp-export-scale-res')?.value || '3', 10) || 3;
      const exportPaging = document.getElementById('inp-export-paging')?.value || 'single';

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

      if (format === 'svg') {
        exportDiagramSvg(selectedTheme, includeGrid, includeTitleBlock, titleBlockData);
      } else if (format === 'png') {
        exportDiagramPng(selectedTheme, includeGrid, includeTitleBlock, titleBlockData, exportScaleRes);
      } else {
        exportDiagramPdf(selectedTheme, includeGrid, includeTitleBlock, titleBlockData, exportScaleRes, exportPaging);
      }
      dom.modalExport.classList.remove('open');
    });

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

    // Modal Búsqueda Rápida (Spotlight / Ctrl + F)
    if (dom.btnCloseSearchModal) {
      dom.btnCloseSearchModal.addEventListener('click', closeQuickSearchModal);
    }
    if (dom.inputQuickSearch) {
      dom.inputQuickSearch.addEventListener('input', (e) => {
        renderSearchResults(e.target.value);
      });
      dom.inputQuickSearch.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          closeQuickSearchModal();
        } else if (e.key === 'Enter') {
          if (searchResultsData.length > 0) {
            const idx = searchActiveIndex >= 0 ? searchActiveIndex : 0;
            panAndHighlightNode(searchResultsData[idx].id);
            closeQuickSearchModal();
          }
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (searchResultsData.length > 0) {
            searchActiveIndex = (searchActiveIndex + 1) % searchResultsData.length;
            updateSearchSelectionVisuals();
          }
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (searchResultsData.length > 0) {
            searchActiveIndex = (searchActiveIndex - 1 + searchResultsData.length) % searchResultsData.length;
            updateSearchSelectionVisuals();
          }
        }
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
    [dom.modalCable, dom.modalShortcuts, dom.modalExport, dom.modalProjects, dom.modalSheetConfig, dom.modalSearch, dom.modalIpInventory].forEach(modal => {
      if (modal) {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) {
            modal.classList.remove('open');
            if (modal === dom.modalSearch) closeQuickSearchModal();
            if (modal === dom.modalIpInventory) closeIpInventoryModal();
          }
        });
      }
    });
  }

  function updateSearchSelectionVisuals() {
    if (!dom.searchResultsContainer) return;
    const items = dom.searchResultsContainer.querySelectorAll('.search-result-item');
    items.forEach((item, idx) => {
      item.classList.toggle('selected', idx === searchActiveIndex);
      if (idx === searchActiveIndex) {
        item.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  // ==========================================================================
  // PANEL INSPECTOR DE PROPIEDADES Y GESTIÓN DE SELECCIÓN
  // ==========================================================================
  function updateSelectionVisuals() {
    const totalCount = state.selectedNodeIds.size + (state.selectedZoneIds ? state.selectedZoneIds.size : 0);
    document.querySelectorAll('.network-node').forEach(el => {
      const isSel = state.selectedNodeIds.has(el.id);
      el.classList.toggle('selected', isSel);
      el.classList.toggle('multi-selected', isSel && totalCount > 1);
    });
    document.querySelectorAll('.network-zone').forEach(el => {
      const isSel = (state.selection.type === 'zone' && state.selection.id === el.id) || (state.selectedZoneIds && state.selectedZoneIds.has(el.id));
      el.classList.toggle('selected', isSel);
      el.classList.toggle('multi-selected', isSel && totalCount > 1);
    });
  }

  function selectElement(type, id, isMulti = false) {
    if (!state.selectedZoneIds) state.selectedZoneIds = new Set();

    if (type === 'node') {
      if (isMulti) {
        if (state.selectedNodeIds.has(id)) {
          state.selectedNodeIds.delete(id);
        } else {
          state.selectedNodeIds.add(id);
        }
      } else {
        state.selectedNodeIds.clear();
        state.selectedZoneIds.clear();
        state.selectedNodeIds.add(id);
      }

      const totalCount = state.selectedNodeIds.size + state.selectedZoneIds.size;
      state.selection = {
        type: totalCount > 1 ? 'multi-node' : (state.selectedNodeIds.size === 1 ? 'node' : (state.selectedZoneIds.size === 1 ? 'zone' : null)),
        id: totalCount > 0 ? (state.selectedNodeIds.has(id) ? id : (Array.from(state.selectedNodeIds)[0] || Array.from(state.selectedZoneIds)[0])) : null,
        ids: [...Array.from(state.selectedNodeIds), ...Array.from(state.selectedZoneIds)]
      };
    } else if (type === 'cable') {
      state.selectedNodeIds.clear();
      state.selectedZoneIds.clear();
      state.selection = { type: 'cable', id, ids: [] };
    } else if (type === 'zone') {
      if (isMulti) {
        if (state.selectedZoneIds.has(id)) {
          state.selectedZoneIds.delete(id);
        } else {
          state.selectedZoneIds.add(id);
        }
      } else {
        state.selectedNodeIds.clear();
        state.selectedZoneIds.clear();
        state.selectedZoneIds.add(id);
      }

      const totalCount = state.selectedNodeIds.size + state.selectedZoneIds.size;
      state.selection = {
        type: totalCount > 1 ? 'multi-node' : (state.selectedZoneIds.size === 1 ? 'zone' : (state.selectedNodeIds.size === 1 ? 'node' : null)),
        id: totalCount > 0 ? (state.selectedZoneIds.has(id) ? id : (Array.from(state.selectedZoneIds)[0] || Array.from(state.selectedNodeIds)[0])) : null,
        ids: [...Array.from(state.selectedNodeIds), ...Array.from(state.selectedZoneIds)]
      };
    }

    updateSelectionVisuals();
    renderConnections();
    renderInspector();
  }

  function deselectAll() {
    state.selectedNodeIds.clear();
    if (state.selectedZoneIds) state.selectedZoneIds.clear();
    state.selection = { type: null, id: null, ids: [] };
    updateSelectionVisuals();
    renderConnections();
    renderInspector();
  }

  function selectAllNodes() {
    const currentSheet = getCurrentSheet();
    const sheetNodes = (currentSheet && Array.isArray(currentSheet.nodes)) ? currentSheet.nodes : state.nodes;
    const sheetZones = (currentSheet && Array.isArray(currentSheet.zones)) ? currentSheet.zones : state.zones;
    if ((!sheetNodes || sheetNodes.length === 0) && (!sheetZones || sheetZones.length === 0)) return;

    state.selectedNodeIds.clear();
    if (!state.selectedZoneIds) state.selectedZoneIds = new Set();
    state.selectedZoneIds.clear();

    if (sheetNodes) sheetNodes.forEach(n => state.selectedNodeIds.add(n.id));
    if (sheetZones) sheetZones.forEach(z => state.selectedZoneIds.add(z.id));

    const totalCount = state.selectedNodeIds.size + state.selectedZoneIds.size;
    state.selection = {
      type: totalCount > 1 ? 'multi-node' : (state.selectedNodeIds.size === 1 ? 'node' : (state.selectedZoneIds.size === 1 ? 'zone' : null)),
      id: Array.from(state.selectedNodeIds)[0] || Array.from(state.selectedZoneIds)[0] || null,
      ids: [...Array.from(state.selectedNodeIds), ...Array.from(state.selectedZoneIds)]
    };

    updateSelectionVisuals();
    renderConnections();
    if (dom.sidebarInspector && dom.sidebarInspector.classList.contains('collapsed')) {
      toggleInspector(false);
    }
    renderInspector();
  }

  function detectPortType(portName) {
    const name = (portName || '').toLowerCase();
    if (name.includes('220') || name.includes('ups') || name.includes('aliment') || name.includes('potencia') || name.includes('volt') || name.includes('canal') || name.includes('salida pc') || name.includes('carga') || name.includes('borne') || name.includes('toma') || name.includes('s1') || name.includes('s2')) {
      return { type: 'power', label: '⚡ 220V' };
    }
    if (name.includes('poe')) {
      return { type: 'power', label: '⚡ PoE' };
    }
    if (name.includes('bnc')) {
      return { type: 'serial', label: 'BNC' };
    }
    if (name.includes('fibra') || name.includes('sfp') || name.includes('fiber') || name.includes('fo') || name.includes('opt') || name.includes('10g')) {
      return { type: 'fiber', label: 'Fibra' };
    }
    if (name.includes('ser') || name.includes('wan') || name.includes('t1')) {
      return { type: 'serial', label: 'WAN' };
    }
    return { type: 'copper', label: 'Boca / Eth' };
  }

  function applyPortTemplateToNode(node, templateKey) {
    let newPorts = [];
    if (templateKey === 'sw_24_4') newPorts = generateSwitchPorts(24, 4); // Boca 1-24, Fibra 1-4
    else if (templateKey === 'sw_48_4') newPorts = generateSwitchPorts(48, 4); // Boca 1-48, Fibra 1-4
    else if (templateKey === 'sw_8_2') newPorts = generateSwitchPorts(8, 2); // Boca 1-8, Fibra 1-2
    else if (templateKey === 'sw_16_2') newPorts = generateSwitchPorts(16, 2); // Boca 1-16, Fibra 1-2
    else if (templateKey === 'rtr_4_2') newPorts = generateRouterPorts(4, 2, 0); // Eth 1-4, Fibra 1-2
    else if (templateKey === 'rtr_8_2') newPorts = generateRouterPorts(8, 2, 0); // Eth 1-8, Fibra 1-2
    else if (templateKey === 'rtr_simple_4') newPorts = ['Boca 1', 'Boca 2', 'Boca 3', 'Boca 4'];
    else if (templateKey === 'nvr_8') {
      newPorts = ['LAN 1', 'LAN 2', 'PoE 1', 'PoE 2', 'PoE 3', 'PoE 4', 'PoE 5', 'PoE 6', 'PoE 7', 'PoE 8', 'HDMI', 'E 220V'];
    } else if (templateKey === 'nvr_16') {
      newPorts = ['LAN 1', 'LAN 2'];
      for (let i = 1; i <= 16; i++) newPorts.push(`PoE ${i}`);
      newPorts.push('HDMI', 'E 220V');
    } else if (templateKey === 'dvr_8') {
      newPorts = ['LAN'];
      for (let i = 1; i <= 8; i++) newPorts.push(`BNC ${i}`);
      newPorts.push('HDMI', 'E 220V');
    } else if (templateKey === 'dvr_16') {
      newPorts = ['LAN'];
      for (let i = 1; i <= 16; i++) newPorts.push(`BNC ${i}`);
      newPorts.push('HDMI', 'E 220V');
    } else if (templateKey === 'trf_standard') {
      newPorts = ['E UPS 1', 'E UPS 2', 'S PC 1', 'S PC 2', 'S PC 3', 'S PC 4', 'S Canal Tensión'];
    } else if (templateKey === 'ct_5' || templateKey === 'ct_standard') {
      newPorts = ['E 220V', 'Toma 1', 'Toma 2', 'Toma 3', 'Toma 4', 'Toma 5'];
    } else if (templateKey === 'ct_7') {
      newPorts = ['E 220V', 'Toma 1', 'Toma 2', 'Toma 3', 'Toma 4', 'Toma 5', 'Toma 6', 'Toma 7'];
    } else if (templateKey === 'ct_8') {
      newPorts = ['E 220V', 'Toma 1', 'Toma 2', 'Toma 3', 'Toma 4', 'Toma 5', 'Toma 6', 'Toma 7', 'Toma 8'];
    } else if (templateKey === 'ups_standard') {
      newPorts = ['E 220V', 'S 220V (1)', 'S 220V (2)', 'S 220V (3)', 'S 220V (4)', 'Bypass'];
    } else if (templateKey === 'ups_8') {
      newPorts = ['E 220V', 'S 220V (1)', 'S 220V (2)', 'S 220V (3)', 'S 220V (4)', 'S 220V (5)', 'S 220V (6)', 'S 220V (7)', 'S 220V (8)', 'Bypass'];
    } else if (templateKey === 'term_bipolar') {
      newPorts = ['E 220V', 'S 220V', 'Bypass'];
    } else if (templateKey === 'term_tetra') {
      newPorts = ['Entrada R', 'Entrada S', 'Entrada T', 'Entrada N', 'Salida R', 'Salida S', 'Salida T', 'Salida N'];
    } else return;

    // Preservar bocas actualmente conectadas para no romper cables existentes
    const usedPorts = state.connections
      .filter(c => c.fromNodeId === node.id || c.toNodeId === node.id)
      .map(c => c.fromNodeId === node.id ? c.fromPort : c.toPort);

    usedPorts.forEach(up => {
      if (!newPorts.includes(up)) newPorts.push(up);
    });

    node.availablePorts = newPorts;
    renderInspector();
    saveState();
  }

  function renderInspector() {
    const { type, id } = state.selection;

    if (!type || (!id && type !== 'multi-node')) {
      dom.inspectorTitle.textContent = 'Propiedades';
      dom.inspectorBody.innerHTML = `
        <div class="inspector-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 16v-4M12 8h.01"/>
          </svg>
          <p>Selecciona un dispositivo o un cable para ver y editar sus propiedades técnicas.</p>
        </div>
      `;
      return;
    }

    if (type === 'multi-node') {
      const selectedNodes = state.nodes.filter(n => state.selectedNodeIds.has(n.id));
      const selectedZones = (state.zones || []).filter(z => state.selectedZoneIds && state.selectedZoneIds.has(z.id));
      const totalCount = selectedNodes.length + selectedZones.length;
      dom.inspectorTitle.textContent = `Selección Múltiple (${totalCount})`;

      const nodesListHtml = selectedNodes.map(n => `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.35rem 0.5rem; background: var(--bg-surface-elevated); border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.75rem;">
          <span style="display: flex; align-items: center; gap: 0.4rem; overflow: hidden;">
            <span style="color: var(--accent-cyan);">●</span>
            <b style="color: var(--text-primary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${escapeHtml(n.name)}</b>
            <span style="color: var(--text-muted); font-size: 0.65rem;">(${n.type})</span>
          </span>
          <button class="btn btn-icon-only" style="width: 20px; height: 20px; padding: 0; opacity: 0.7;" data-remove-from-sel="${n.id}" title="Quitar de la selección">✕</button>
        </div>
      `).join('');

      const zonesListHtml = selectedZones.map(z => `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.35rem 0.5rem; background: var(--bg-surface-elevated); border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.75rem;">
          <span style="display: flex; align-items: center; gap: 0.4rem; overflow: hidden;">
            <span style="color: #a855f7;">🔲</span>
            <b style="color: var(--text-primary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${escapeHtml(z.name || 'Zona')}</b>
            <span style="color: var(--text-muted); font-size: 0.65rem;">(Zona / Área)</span>
          </span>
          <button class="btn btn-icon-only" style="width: 20px; height: 20px; padding: 0; opacity: 0.7;" data-remove-zone-from-sel="${z.id}" title="Quitar de la selección">✕</button>
        </div>
      `).join('');

      dom.inspectorBody.innerHTML = `
        <div style="padding: 0.75rem; background: rgba(56, 189, 248, 0.08); border-radius: 8px; border: 1px solid rgba(56, 189, 248, 0.25); display: flex; flex-direction: column; gap: 0.4rem; flex-shrink: 0 !important; width: 100% !important;">
          <div style="font-size: 0.8rem; font-weight: 700; color: var(--accent-cyan); display: flex; align-items: center; gap: 0.4rem;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            ${totalCount} Elementos Seleccionados ${selectedZones.length > 0 ? `(${selectedNodes.length} equipos, ${selectedZones.length} zonas)` : ''}
          </div>
          <div style="font-size: 0.72rem; color: var(--text-secondary);">
            Puedes arrastrar cualquiera de los equipos o la cabecera de las zonas para mover todo el bloque en conjunto manteniendo sus posiciones y conexiones.
          </div>
        </div>

        <!-- SECCIÓN: ACCIONES EN BLOQUE -->
        <div class="inspector-section" style="flex-shrink: 0 !important; width: 100% !important;">
          <div class="inspector-section-header">
            <span>⚡ Acciones en Bloque</span>
          </div>
          <div class="inspector-section-body">
            <button id="btn-dup-group" class="btn" style="width: 100%; justify-content: center; gap: 0.4rem;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              Duplicar Grupo Completo
            </button>
            <button id="btn-del-group" class="btn btn-danger" style="width: 100%; justify-content: center; gap: 0.4rem;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              Eliminar ${totalCount} Elementos
            </button>
          </div>
        </div>

        <!-- SECCIÓN: LISTA DE ELEMENTOS SELECCIONADOS -->
        <div class="inspector-section" style="flex-shrink: 0 !important; width: 100% !important; margin-bottom: 2rem !important;">
          <div class="inspector-section-header">
            <span>📋 Elementos en el Grupo (${totalCount})</span>
          </div>
          <div class="inspector-section-body" style="gap: 0.4rem; max-height: 280px; overflow-y: auto;">
            ${nodesListHtml}
            ${zonesListHtml}
          </div>
        </div>
      `;

      document.getElementById('btn-dup-group').addEventListener('click', () => {
        duplicateSelectedNodes();
      });

      document.getElementById('btn-del-group').addEventListener('click', () => {
        deleteSelectedNodes();
      });

      dom.inspectorBody.querySelectorAll('[data-remove-from-sel]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const targetId = btn.dataset.removeFromSel;
          state.selectedNodeIds.delete(targetId);
          const remainingCount = state.selectedNodeIds.size + (state.selectedZoneIds ? state.selectedZoneIds.size : 0);
          state.selection = {
            type: remainingCount > 1 ? 'multi-node' : (state.selectedNodeIds.size === 1 ? 'node' : (state.selectedZoneIds && state.selectedZoneIds.size === 1 ? 'zone' : null)),
            id: Array.from(state.selectedNodeIds)[0] || (state.selectedZoneIds && Array.from(state.selectedZoneIds)[0]) || null,
            ids: [...Array.from(state.selectedNodeIds), ...(state.selectedZoneIds ? Array.from(state.selectedZoneIds) : [])]
          };
          updateSelectionVisuals();
          renderConnections();
          renderInspector();
        });
      });

      dom.inspectorBody.querySelectorAll('[data-remove-zone-from-sel]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const targetId = btn.dataset.removeZoneFromSel;
          if (state.selectedZoneIds) state.selectedZoneIds.delete(targetId);
          const remainingCount = state.selectedNodeIds.size + (state.selectedZoneIds ? state.selectedZoneIds.size : 0);
          state.selection = {
            type: remainingCount > 1 ? 'multi-node' : (state.selectedNodeIds.size === 1 ? 'node' : (state.selectedZoneIds && state.selectedZoneIds.size === 1 ? 'zone' : null)),
            id: Array.from(state.selectedNodeIds)[0] || (state.selectedZoneIds && Array.from(state.selectedZoneIds)[0]) || null,
            ids: [...Array.from(state.selectedNodeIds), ...(state.selectedZoneIds ? Array.from(state.selectedZoneIds) : [])]
          };
          updateSelectionVisuals();
          renderConnections();
          renderInspector();
        });
      });

      return;
    }

    if (type === 'zone') {
      const zone = (state.zones || []).find(z => z.id === id);
      if (!zone) return deselectAll();

      dom.inspectorTitle.textContent = `Área / Zona: ${zone.name || 'VLAN'}`;
      dom.inspectorBody.innerHTML = `
        <div class="form-group" style="margin-bottom: 0.85rem;">
          <label>Nombre o Etiqueta de la Zona (VLAN)</label>
          <input type="text" id="insp-zone-name" class="form-control" value="${escapeHtml(zone.name || '')}" placeholder="ej. VLAN 10 - Gestión / DMZ">
        </div>

        <div class="form-group" style="margin-bottom: 0.85rem;">
          <label>Color de la Zona</label>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.4rem; margin-top: 0.35rem;">
            ${[
              { key: 'cyan', label: 'Cian', color: '#38bdf8' },
              { key: 'emerald', label: 'Esmeralda', color: '#10b981' },
              { key: 'amber', label: 'Ámbar', color: '#f59e0b' },
              { key: 'rose', label: 'Rojo', color: '#f43f5e' },
              { key: 'purple', label: 'Púrpura', color: '#a855f7' },
              { key: 'blue', label: 'Azul', color: '#3b82f6' }
            ].map(c => `
              <button type="button" class="btn btn-zone-color-pick ${zone.color === c.key ? 'active' : ''}" data-color="${c.key}" style="padding: 0.35rem 0.45rem; font-size: 0.72rem; display: flex; align-items: center; gap: 0.35rem; ${zone.color === c.key ? 'border-color: ' + c.color + '; background: rgba(255,255,255,0.08);' : ''}">
                <span style="width: 10px; height: 10px; border-radius: 50%; background: ${c.color};"></span>
                <span>${c.label}</span>
              </button>
            `).join('')}
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 0.85rem;">
          <div class="form-group">
            <label>Ancho (px)</label>
            <input type="number" id="insp-zone-w" class="form-control mono" value="${zone.width}" min="120" step="24">
          </div>
          <div class="form-group">
            <label>Alto (px)</label>
            <input type="number" id="insp-zone-h" class="form-control mono" value="${zone.height}" min="80" step="24">
          </div>
        </div>

        <div style="margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid var(--border-color); display: flex; gap: 0.5rem;">
          <button type="button" id="btn-insp-delete-zone" class="btn btn-danger" style="width: 100%; justify-content: center; gap: 0.4rem;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            Eliminar Zona
          </button>
        </div>
      `;

      document.getElementById('insp-zone-name').addEventListener('input', (e) => {
        zone.name = e.target.value.trim() || 'Zona';
        dom.inspectorTitle.textContent = `Área / Zona: ${zone.name}`;
        const zEl = document.getElementById(zone.id);
        if (zEl) {
          const txt = zEl.querySelector('.zone-name-text');
          if (txt) txt.textContent = zone.name;
        }
        saveState();
      });

      document.querySelectorAll('.btn-zone-color-pick').forEach(btn => {
        btn.addEventListener('click', () => {
          zone.color = btn.dataset.color;
          renderZones();
          renderInspector();
          saveState();
        });
      });

      document.getElementById('insp-zone-w').addEventListener('change', (e) => {
        zone.width = Math.max(120, parseInt(e.target.value, 10) || 200);
        renderZones();
        saveState();
      });

      document.getElementById('insp-zone-h').addEventListener('change', (e) => {
        zone.height = Math.max(80, parseInt(e.target.value, 10) || 160);
        renderZones();
        saveState();
      });

      document.getElementById('btn-insp-delete-zone').addEventListener('click', () => {
        deleteZone(zone.id);
      });
      return;
    }

    if (type === 'node') {
      const node = state.nodes.find(n => n.id === id);
      if (!node) return deselectAll();

      if (node.type === 'text_badge') {
        dom.inspectorTitle.textContent = 'Etiqueta / Recuadro IP';
        const badgeColor = node.badgeColor || 'emerald';
        const nodeConns = state.connections.filter(c => c.fromNodeId === node.id || c.toNodeId === node.id);

        const connsHtml = nodeConns.length === 0 ? `
          <div style="font-size: 0.72rem; color: var(--text-muted); padding: 0.5rem; text-align: center;">
            No hay cables conectados a este recuadro.
          </div>
        ` : nodeConns.map(c => {
          const isFrom = c.fromNodeId === node.id;
          const remoteNode = state.nodes.find(n => n.id === (isFrom ? c.toNodeId : c.fromNodeId));
          const cableType = CABLE_TYPES[c.cableType] || CABLE_TYPES.ethernet;
          return `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.35rem 0.5rem; background: var(--bg-surface-elevated); border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.75rem;">
              <span style="display: flex; align-items: center; gap: 0.4rem; overflow: hidden;">
                <span style="color: ${c.color || cableType.color}; font-size: 0.8rem;">●</span>
                <b style="color: var(--text-primary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${escapeHtml(remoteNode ? remoteNode.name : 'Equipo')}</b>
                <span style="color: var(--text-muted); font-size: 0.65rem;">(${cableType.name.split('/')[0].trim()})</span>
              </span>
              <button class="btn btn-icon-only" style="width: 20px; height: 20px; padding: 0; opacity: 0.7;" data-del-conn="${c.id}" title="Eliminar cable">✕</button>
            </div>
          `;
        }).join('');

        dom.inspectorBody.innerHTML = `
          <div class="inspector-section">
            <div class="inspector-section-header">
              <span>🏷️ Contenido del Recuadro</span>
            </div>
            <div class="inspector-section-body">
              <div class="form-group">
                <label>Texto / Dirección IP / Subred</label>
                <input type="text" id="prop-text-badge-val" class="form-control mono" value="${escapeHtml(node.ip || node.name || '')}" placeholder="Ej: 192.168.1.0/24, VLAN 10, Gateway..." style="font-size: 0.85rem; font-weight: 600;">
              </div>

              <div class="form-group">
                <label style="margin-bottom: 0.35rem; display: block;">Color del Recuadro</label>
                <div style="display: flex; gap: 0.35rem;">
                  <button type="button" class="btn-badge-color ${badgeColor === 'emerald' ? 'active' : ''}" data-color="emerald" title="Verde Esmeralda (IP estándar)" style="background: var(--bg-surface-elevated); color: #10b981; border: 1px solid ${badgeColor === 'emerald' ? '#10b981' : 'rgba(16, 185, 129, 0.4)'}; border-radius: 4px; padding: 4px 6px; font-size: 0.7rem; font-weight: 600; cursor: pointer; flex: 1;">Verde</button>
                  <button type="button" class="btn-badge-color ${badgeColor === 'cyan' ? 'active' : ''}" data-color="cyan" title="Azul Cyan (VLAN / Enlace)" style="background: var(--bg-surface-elevated); color: #0284c7; border: 1px solid ${badgeColor === 'cyan' ? '#0284c7' : 'rgba(2, 132, 199, 0.4)'}; border-radius: 4px; padding: 4px 6px; font-size: 0.7rem; font-weight: 600; cursor: pointer; flex: 1;">Cyan</button>
                  <button type="button" class="btn-badge-color ${badgeColor === 'amber' ? 'active' : ''}" data-color="amber" title="Ámbar / Naranja (Alerta / DMZ)" style="background: var(--bg-surface-elevated); color: #d97706; border: 1px solid ${badgeColor === 'amber' ? '#d97706' : 'rgba(217, 119, 6, 0.4)'}; border-radius: 4px; padding: 4px 6px; font-size: 0.7rem; font-weight: 600; cursor: pointer; flex: 1;">Ámbar</button>
                  <button type="button" class="btn-badge-color ${badgeColor === 'purple' ? 'active' : ''}" data-color="purple" title="Violeta (VPN / Túnel)" style="background: var(--bg-surface-elevated); color: #9333ea; border: 1px solid ${badgeColor === 'purple' ? '#9333ea' : 'rgba(147, 51, 234, 0.4)'}; border-radius: 4px; padding: 4px 6px; font-size: 0.7rem; font-weight: 600; cursor: pointer; flex: 1;">Violeta</button>
                  <button type="button" class="btn-badge-color ${badgeColor === 'neutral' ? 'active' : ''}" data-color="neutral" title="Blanco / Neutro" style="background: var(--bg-surface-elevated); color: var(--text-primary); border: 1px solid ${badgeColor === 'neutral' ? 'var(--text-primary)' : 'var(--border-color)'}; border-radius: 4px; padding: 4px 6px; font-size: 0.7rem; font-weight: 600; cursor: pointer; flex: 1;">Neutro</button>
                </div>
              </div>

              <!-- Control de Tamaño y Escala -->
              <div class="form-group" style="background: rgba(56, 189, 248, 0.05); padding: 0.5rem; border-radius: 6px; border: 1px solid rgba(56, 189, 248, 0.2); margin-bottom: 0.75rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
                  <label style="margin-bottom:0; font-size: 0.72rem; color: var(--text-primary); font-weight: 600;">📏 Escala / Zoom</label>
                  <span id="lbl-node-scale" class="mono" style="font-size: 0.75rem; color: var(--accent-cyan); font-weight: 700;">${Math.round((node.scale || 1) * 100)}%</span>
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <input type="range" id="prop-node-scale-slider" min="50" max="250" step="5" value="${Math.round((node.scale || 1) * 100)}" style="flex: 1; accent-color: var(--accent-cyan); cursor: pointer;">
                  <input type="number" id="prop-node-scale-input" class="form-control mono" min="50" max="250" step="5" value="${Math.round((node.scale || 1) * 100)}" style="width: 58px; padding: 0.2rem 0.35rem; font-size: 0.75rem; text-align: center;">
                </div>
                <div style="display: flex; gap: 0.3rem; margin-top: 0.4rem;">
                  <button type="button" class="btn-scale-preset ${Math.round((node.scale || 1) * 100) === 75 ? 'active' : ''}" data-scale="75" style="flex: 1; padding: 2px 0; font-size: 0.65rem;">75%</button>
                  <button type="button" class="btn-scale-preset ${Math.round((node.scale || 1) * 100) === 100 ? 'active' : ''}" data-scale="100" style="flex: 1; padding: 2px 0; font-size: 0.65rem;">100%</button>
                  <button type="button" class="btn-scale-preset ${Math.round((node.scale || 1) * 100) === 130 ? 'active' : ''}" data-scale="130" style="flex: 1; padding: 2px 0; font-size: 0.65rem;">130%</button>
                  <button type="button" class="btn-scale-preset ${Math.round((node.scale || 1) * 100) === 160 ? 'active' : ''}" data-scale="160" style="flex: 1; padding: 2px 0; font-size: 0.65rem;">160%</button>
                </div>
              </div>

              <div class="form-group">
                <label>Notas Técnicas</label>
                <textarea id="prop-node-notes" class="form-control" placeholder="Notas sobre esta IP o enlace...">${escapeHtml(node.notes || '')}</textarea>
              </div>
            </div>
          </div>

          <div class="inspector-section">
            <div class="inspector-section-header">
              <span>🔌 Cables Conectados (${nodeConns.length})</span>
            </div>
            <div class="inspector-section-body" style="gap: 0.35rem;">
              ${connsHtml}
            </div>
          </div>

          <div class="inspector-section" style="margin-bottom: 2rem;">
            <div class="inspector-section-body" style="display: flex; gap: 0.4rem;">
              <button id="btn-node-dup" class="btn" style="flex: 1; justify-content: center; gap: 0.3rem;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                Duplicar
              </button>
              <button id="btn-node-delete" class="btn btn-danger" style="flex: 1; justify-content: center; gap: 0.3rem;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                Eliminar
              </button>
            </div>
          </div>
        `;

        // Event listeners para text badge
        const inpVal = document.getElementById('prop-text-badge-val');
        if (inpVal) {
          inpVal.addEventListener('input', (e) => {
            const val = e.target.value.trim();
            node.ip = val;
            node.name = val;
            renderNodeElement(node);
            renderConnections();
            saveState();
          });
        }

        document.querySelectorAll('.btn-badge-color').forEach(b => {
          b.addEventListener('click', () => {
            node.badgeColor = b.dataset.color;
            renderNodeElement(node);
            renderInspector();
            saveState();
          });
        });

        const scaleSlider = document.getElementById('prop-node-scale-slider');
        const scaleInput = document.getElementById('prop-node-scale-input');
        const scaleLabel = document.getElementById('lbl-node-scale');

        const applyScale = (val) => {
          const num = Math.min(250, Math.max(50, parseInt(val, 10) || 100));
          node.scale = num / 100;
          if (scaleSlider) scaleSlider.value = num;
          if (scaleInput) scaleInput.value = num;
          if (scaleLabel) scaleLabel.textContent = `${num}%`;
          dom.inspectorBody.querySelectorAll('.btn-scale-preset').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.scale, 10) === num);
          });
          const el = document.getElementById(node.id);
          if (el) el.style.setProperty('--node-scale', node.scale);
          renderConnections();
          saveState();
        };

        if (scaleSlider) scaleSlider.addEventListener('input', (e) => applyScale(e.target.value));
        if (scaleInput) scaleInput.addEventListener('change', (e) => applyScale(e.target.value));
        dom.inspectorBody.querySelectorAll('.btn-scale-preset').forEach(btn => {
          btn.addEventListener('click', () => applyScale(btn.dataset.scale));
        });

        const notesArea = document.getElementById('prop-node-notes');
        if (notesArea) {
          notesArea.addEventListener('input', (e) => {
            node.notes = e.target.value;
            saveState();
          });
        }

        document.querySelectorAll('[data-del-conn]').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteConnection(btn.dataset.delConn);
            renderInspector();
          });
        });

        document.getElementById('btn-node-dup')?.addEventListener('click', () => {
          duplicateSelectedNodes();
        });
        document.getElementById('btn-node-delete')?.addEventListener('click', () => {
          deleteNode(node.id);
        });

        return;
      }

      dom.inspectorTitle.textContent = `Configuración: ${node.name}`;

      // Obtener conexiones activas de este nodo
      const nodeConns = state.connections.filter(c => c.fromNodeId === node.id || c.toNodeId === node.id);
      const usedPortsMap = {};
      nodeConns.forEach(c => {
        const isFrom = c.fromNodeId === node.id;
        const localPort = isFrom ? c.fromPort : c.toPort;
        const remoteNode = state.nodes.find(n => n.id === (isFrom ? c.toNodeId : c.fromNodeId));
        const remotePort = isFrom ? c.toPort : c.fromPort;
        usedPortsMap[localPort] = {
          cableId: c.id,
          remoteName: remoteNode ? remoteNode.name : 'Desconocido',
          remotePort
        };
      });

      // Renderizar lista detallada de bocas
      const portsListHtml = (node.availablePorts || []).map(portName => {
        const connInfo = usedPortsMap[portName];
        const pType = detectPortType(portName);
        const typeBadge = `<span class="port-type-badge ${pType.type}">${pType.label}</span>`;

        if (connInfo) {
          return `
            <div class="port-item-row" title="Clic para ver cable" data-cable-id="${connInfo.cableId}" style="cursor:pointer;">
              <span style="display:flex; align-items:center; gap:0.4rem; overflow:hidden;">
                <span class="port-status connected" title="Boca en uso"></span>
                ${typeBadge}
                <b>${escapeHtml(portName)}</b>
                <span style="color:var(--text-muted); font-size:0.65rem;">→ ${escapeHtml(connInfo.remoteName)} (${escapeHtml(connInfo.remotePort)})</span>
              </span>
              <button class="btn btn-icon-only btn-danger" style="width:20px;height:20px;padding:0;" data-del-cable="${connInfo.cableId}" title="Desconectar cable">✕</button>
            </div>
          `;
        } else {
          return `
            <div class="port-item-row">
              <span style="display:flex; align-items:center; gap:0.4rem;">
                <span class="port-status" title="Boca disponible"></span>
                ${typeBadge}
                <span>${escapeHtml(portName)}</span>
                <span style="color:var(--accent-emerald); font-size:0.65rem;">Libre</span>
              </span>
              <button class="btn btn-icon-only" style="width:20px;height:20px;padding:0;opacity:0.6;" data-remove-port="${escapeHtml(portName)}" title="Eliminar boca de este equipo">✕</button>
            </div>
          `;
        }
      }).join('');

      const freeCount = Math.max((node.availablePorts || []).length - Object.keys(usedPortsMap).length, 0);

      const isElectric = ['ups', 'termica', 'transfer'].includes(node.type) || (node.type && node.type.startsWith('canal_tension'));

      dom.inspectorBody.innerHTML = `
        <!-- SECCIÓN 1: CONFIGURACIÓN IP Y RED -->
        <div class="inspector-section" id="sec-node-basic">
          <div class="inspector-section-header" title="Clic para comprimir / expandir">
            <span>${isElectric ? '⚡ Parámetros Eléctricos y Datos' : '🌐 Configuración y Red'}</span>
            <svg class="section-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <div class="inspector-section-body">
            <div class="form-group">
              <label>${isElectric ? 'Identificador / Nombre' : 'Nombre del Equipo (Hostname)'}</label>
              <input type="text" id="prop-node-name" class="form-control" value="${escapeHtml(node.name)}">
            </div>

            <!-- Control de Tamaño y Escala (%) -->
            <div class="form-group" style="background: rgba(56, 189, 248, 0.05); padding: 0.5rem; border-radius: 6px; border: 1px solid rgba(56, 189, 248, 0.2); margin-bottom: 0.75rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
                <label style="margin-bottom:0; font-size: 0.72rem; color: var(--text-primary); font-weight: 600;">📏 Tamaño / Escala del Equipo</label>
                <span id="lbl-node-scale" class="mono" style="font-size: 0.75rem; color: var(--accent-cyan); font-weight: 700;">${Math.round((node.scale || 1) * 100)}%</span>
              </div>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <input type="range" id="prop-node-scale-slider" min="50" max="250" step="5" value="${Math.round((node.scale || 1) * 100)}" style="flex: 1; accent-color: var(--accent-cyan); cursor: pointer;">
                <input type="number" id="prop-node-scale-input" class="form-control mono" min="50" max="250" step="5" value="${Math.round((node.scale || 1) * 100)}" style="width: 58px; padding: 0.2rem 0.35rem; font-size: 0.75rem; text-align: center;">
              </div>
              <div style="display: flex; gap: 0.3rem; margin-top: 0.4rem;">
                <button type="button" class="btn-scale-preset ${Math.round((node.scale || 1) * 100) === 75 ? 'active' : ''}" data-scale="75" style="flex: 1; padding: 2px 0; font-size: 0.65rem;">75%</button>
                <button type="button" class="btn-scale-preset ${Math.round((node.scale || 1) * 100) === 100 ? 'active' : ''}" data-scale="100" style="flex: 1; padding: 2px 0; font-size: 0.65rem;">100%</button>
                <button type="button" class="btn-scale-preset ${Math.round((node.scale || 1) * 100) === 130 ? 'active' : ''}" data-scale="130" style="flex: 1; padding: 2px 0; font-size: 0.65rem;">130%</button>
                <button type="button" class="btn-scale-preset ${Math.round((node.scale || 1) * 100) === 160 ? 'active' : ''}" data-scale="160" style="flex: 1; padding: 2px 0; font-size: 0.65rem;">160%</button>
                <button type="button" class="btn-scale-preset ${Math.round((node.scale || 1) * 100) === 200 ? 'active' : ''}" data-scale="200" style="flex: 1; padding: 2px 0; font-size: 0.65rem;">200%</button>
              </div>
            </div>

            <div class="form-group">
              <label>${isElectric ? 'Dirección IP (Opcional - Monitoreo / SNMP)' : 'Dirección IP'}</label>
              <input type="text" id="prop-node-ip" class="form-control mono" value="${escapeHtml(node.ip)}" placeholder="${isElectric ? 'Opcional (ej: 192.168.1.50)' : 'Ej: 192.168.1.1'}">
            </div>

            <!-- Opción de Encapsular Nombre e IP dentro de la tarjeta -->
            <div class="form-group" style="background: var(--bg-surface-elevated); padding: 0.6rem 0.75rem; border-radius: 8px; border: 1px solid var(--border-color); margin-top: 0.5rem; margin-bottom: 0.75rem;">
              <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.76rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0;">
                <input type="checkbox" id="prop-node-encapsulate" ${node.encapsulatedLabels ? 'checked' : ''} style="accent-color: var(--accent-cyan); width: 15px; height: 15px; cursor: pointer;">
                <span>Encapsular Nombre e IP dentro de la tarjeta</span>
              </label>
              <p style="font-size: 0.68rem; color: var(--text-muted); margin: 0.35rem 0 0.5rem 1.45rem; line-height: 1.3;">
                Muestra el nombre y la IP integrados dentro del recuadro del equipo como una tarjeta unificada.
              </p>
              <button type="button" id="btn-apply-encapsulate-all" class="btn btn-secondary btn-sm" style="width: 100%; font-size: 0.7rem; justify-content: center; gap: 0.35rem; padding: 0.3rem 0.5rem;">
                <span>⊞</span> Aplicar este diseño a todos los equipos
              </button>
            </div>

            <div class="form-group">
              <label>${isElectric ? 'Tensión Nominal / Voltaje' : 'Máscara de Red / Prefijo CIDR'}</label>
              <input type="text" id="prop-node-mask" class="form-control mono" value="${escapeHtml(node.mask)}" placeholder="${isElectric ? 'Ej: 220V AC / 50Hz' : 'Ej: 255.255.255.0 o /24'}">
            </div>

            <div class="form-group">
              <label>${isElectric ? 'Potencia / Capacidad' : 'Puerta de Enlace (Gateway)'}</label>
              <input type="text" id="prop-node-gw" class="form-control mono" value="${escapeHtml(node.gateway)}" placeholder="${isElectric ? 'Ej: 3000 VA / 2700 W / 16A' : 'Ej: 192.168.1.254'}">
            </div>

            <div class="form-group">
              <label>Notas Técnicas / Ubicación</label>
              <textarea id="prop-node-notes" class="form-control" placeholder="${isElectric ? 'Ej: Tablero Principal, Rack Servidores, Fase R...' : 'Ej: Patch panel Rack 2, VLAN de administración...'}">${escapeHtml(node.notes)}</textarea>
            </div>
          </div>
        </div>

        <!-- SECCIÓN 2: GESTIÓN DE BOCAS E INTERFACES -->
        <div class="inspector-section" id="sec-node-ports">
          <div class="inspector-section-header" title="Clic para comprimir / expandir">
            <span>${isElectric ? '⚡ Bornes y Salidas' : '🔌 Bocas e Interfaces'} (${(node.availablePorts || []).length})</span>
            <svg class="section-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <div class="inspector-section-body">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 0.725rem; color: var(--accent-cyan); font-weight: 600;">
                ${Object.keys(usedPortsMap).length} en uso · ${freeCount} libres
              </span>
            </div>

            <!-- Selector de plantillas de puertos -->
            <div style="display: flex; gap: 0.35rem;">
              <select id="select-port-template" class="form-control" style="font-size: 0.75rem; padding: 0.35rem 0.5rem;">
                <option value="">⚙️ ${isElectric ? 'Plantillas de conexiones...' : 'Cambiar cantidad de bocas...'}</option>
                ${node.type === 'transfer' ? `
                  <option value="trf_standard">Transfer Estándar (2 UPS S1/S2 + 4 PC + Canal)</option>
                ` : (node.type && node.type.startsWith('canal_tension')) ? `
                  <option value="ct_5">Canal de Tensión (5 Tomas)</option>
                  <option value="ct_7">Canal de Tensión (7 Tomas)</option>
                  <option value="ct_8">Canal de Tensión (8 Tomas)</option>
                ` : node.type === 'ups' ? `
                  <option value="ups_standard">UPS Estándar (1 Entrada 220V + 4 Salidas UPS + Bypass)</option>
                  <option value="ups_8">UPS 8 Salidas (1 Entrada 220V + 8 Salidas UPS + Bypass)</option>
                ` : node.type === 'termica' ? `
                  <option value="term_bipolar">Térmica Bipolar (Entrada 220V + Salida Carga + Bypass)</option>
                  <option value="term_tetra">Térmica Tetrapolar (3 Fases R,S,T + Neutro N)</option>
                ` : node.type === 'nvr' ? `
                  <option value="nvr_8">NVR: 8 Puertos PoE + 2 LAN</option>
                  <option value="nvr_16">NVR: 16 Puertos PoE + 2 LAN</option>
                ` : node.type === 'dvr' ? `
                  <option value="dvr_8">DVR: 8 Canales BNC + 1 LAN</option>
                  <option value="dvr_16">DVR: 16 Canales BNC + 1 LAN</option>
                ` : (node.type && node.type.startsWith('router')) ? `
                  <option value="rtr_4_2">Router: 4 Eth + 2 Fibra</option>
                  <option value="rtr_8_2">Router: 8 Eth + 2 Fibra</option>
                  <option value="rtr_simple_4">Router: 4 Bocas Simples (Boca 1 a 4)</option>
                ` : `
                  <option value="sw_24_4">Switch: 24 Bocas + 4 Fibra</option>
                  <option value="sw_48_4">Switch: 48 Bocas + 4 Fibra</option>
                  <option value="sw_16_2">Switch: 16 Bocas + 2 Fibra</option>
                  <option value="sw_8_2">Switch: 8 Bocas + 2 Fibra</option>
                  <option value="rtr_4_2">Router: 4 Eth + 2 Fibra</option>
                `}
                <option value="custom">✏️ Personalizar cantidad a medida...</option>
              </select>
            </div>

            <!-- Personalizador numérico a medida -->
            <div id="custom-ports-box" style="display: none; background: var(--bg-main); padding: 0.65rem; border-radius: 6px; border: 1px solid var(--border-color);">
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.4rem;">
                <div>
                  <label style="font-size:0.62rem;">Bocas Cobre</label>
                  <input type="number" id="custom-copper-count" class="form-control mono" value="24" min="0" max="96" style="padding:0.25rem; font-size:0.75rem;">
                </div>
                <div>
                  <label style="font-size:0.62rem;">Bocas Fibra</label>
                  <input type="number" id="custom-fiber-count" class="form-control mono" value="4" min="0" max="32" style="padding:0.25rem; font-size:0.75rem;">
                </div>
                <div>
                  <label style="font-size:0.62rem;">Bocas WAN</label>
                  <input type="number" id="custom-serial-count" class="form-control mono" value="0" min="0" max="16" style="padding:0.25rem; font-size:0.75rem;">
                </div>
              </div>
              <button id="btn-apply-custom-ports" class="btn btn-primary" style="width: 100%; margin-top: 0.5rem; font-size: 0.75rem; padding: 0.35rem;">
                Aplicar Nuevas Bocas
              </button>
            </div>

            <!-- Agregar boca individual manual -->
            <div style="display: flex; gap: 0.4rem;">
              <input type="text" id="input-new-port" class="form-control mono" placeholder="${isElectric ? 'Ej: Salida 5 o Borne Auxiliar' : 'Ej: Boca 25 o Fibra 5 (o solo el número)'}" style="font-size: 0.75rem; padding: 0.35rem 0.5rem;">
              <button id="btn-add-port" class="btn" style="font-size: 0.75rem; padding: 0.35rem 0.65rem; white-space: nowrap;">+ ${isElectric ? 'Borne' : 'Boca'}</button>
            </div>

            <!-- Lista deslizable de bocas con estado -->
            <div class="ports-list-box" style="max-height: 180px;">${portsListHtml}</div>
          </div>
        </div>

        <!-- SECCIÓN 3: ACCIONES RÁPIDAS -->
        <div class="inspector-section" id="sec-node-actions" style="margin-bottom: 2rem !important; flex-shrink: 0 !important;">
          <div class="inspector-section-header" title="Clic para comprimir / expandir">
            <span>⚡ Acciones Rápidas</span>
            <svg class="section-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <div class="inspector-section-body">
            <div style="display: flex; gap: 0.5rem;">
              <button id="btn-dup-node" class="btn" style="flex: 1;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                Duplicar
              </button>
              <button id="btn-del-node" class="btn btn-danger" style="flex: 1;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      `;

      // Habilitar colapso en encabezados de secciones del inspector
      dom.inspectorBody.querySelectorAll('.inspector-section-header').forEach(hdr => {
        hdr.addEventListener('click', () => {
          hdr.parentElement.classList.toggle('collapsed');
        });
      });

      // Eventos de campos del nodo
      document.getElementById('prop-node-name').addEventListener('input', (e) => {
        node.name = e.target.value;
        if (node.customName !== undefined) node.customName = e.target.value;
        renderNodeElement(node);
        renderConnections();
        saveState();
      });

      // Manejadores de escala (%) del equipo
      const scaleSlider = document.getElementById('prop-node-scale-slider');
      const scaleInput = document.getElementById('prop-node-scale-input');
      const scaleLabel = document.getElementById('lbl-node-scale');

      const applyScale = (pctVal) => {
        const pct = Math.max(50, Math.min(250, parseInt(pctVal, 10) || 100));
        node.scale = pct / 100;
        if (scaleSlider) scaleSlider.value = pct;
        if (scaleInput) scaleInput.value = pct;
        if (scaleLabel) scaleLabel.textContent = `${pct}%`;

        dom.inspectorBody.querySelectorAll('.btn-scale-preset').forEach(btn => {
          btn.classList.toggle('active', parseInt(btn.dataset.scale, 10) === pct);
        });

        renderNodeElement(node);
        renderConnections();
        saveState();
      };

      if (scaleSlider) {
        scaleSlider.addEventListener('input', (e) => applyScale(e.target.value));
      }
      if (scaleInput) {
        scaleInput.addEventListener('change', (e) => applyScale(e.target.value));
      }
      dom.inspectorBody.querySelectorAll('.btn-scale-preset').forEach(btn => {
        btn.addEventListener('click', () => applyScale(btn.dataset.scale));
      });

      document.getElementById('prop-node-ip').addEventListener('input', (e) => {
        node.ip = e.target.value;
        renderNodeElement(node);
        renderConnections();
        saveState();
      });

      const chkEncapsulate = document.getElementById('prop-node-encapsulate');
      if (chkEncapsulate) {
        chkEncapsulate.addEventListener('change', (e) => {
          node.encapsulatedLabels = e.target.checked;
          renderNodeElement(node);
          renderConnections();
          saveState();
        });
      }

      const btnApplyEncapsulateAll = document.getElementById('btn-apply-encapsulate-all');
      if (btnApplyEncapsulateAll) {
        btnApplyEncapsulateAll.addEventListener('click', () => {
          const val = Boolean(node.encapsulatedLabels);
          state.nodes.forEach(n => {
            if (n.type !== 'text_badge') {
              n.encapsulatedLabels = val;
              renderNodeElement(n);
            }
          });
          renderConnections();
          saveState();
          if (typeof showToast === 'function') {
            showToast(val ? 'Diseño encapsulado aplicado a todos los equipos' : 'Diseño estándar restaurado en todos los equipos', 'success');
          }
        });
      }

      document.getElementById('prop-node-mask').addEventListener('input', (e) => {
        node.mask = e.target.value;
        saveState();
      });

      document.getElementById('prop-node-gw').addEventListener('input', (e) => {
        node.gateway = e.target.value;
        saveState();
      });

      document.getElementById('prop-node-notes').addEventListener('input', (e) => {
        node.notes = e.target.value;
        saveState();
      });

      // Manejador de plantillas de bocas
      const templateSelect = document.getElementById('select-port-template');
      const customBox = document.getElementById('custom-ports-box');

      templateSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        if (!val) return;
        if (val === 'custom') {
          customBox.style.display = 'block';
        } else {
          customBox.style.display = 'none';
          applyPortTemplateToNode(node, val);
        }
      });

      document.getElementById('btn-apply-custom-ports').addEventListener('click', () => {
        const cu = parseInt(document.getElementById('custom-copper-count').value, 10) || 0;
        const fib = parseInt(document.getElementById('custom-fiber-count').value, 10) || 0;
        const ser = parseInt(document.getElementById('custom-serial-count').value, 10) || 0;

        let newPorts = [];
        const prefix = (node.type === 'router') ? 'Eth' : 'Boca';
        for (let i = 1; i <= cu; i++) newPorts.push(`${prefix} ${i}`);
        for (let i = 1; i <= fib; i++) newPorts.push(`Fibra ${i}`);
        for (let i = 1; i <= ser; i++) newPorts.push(`WAN ${i}`);

        // Preservar bocas actualmente conectadas
        Object.keys(usedPortsMap).forEach(up => {
          if (!newPorts.includes(up)) newPorts.push(up);
        });

        node.availablePorts = newPorts;
        renderInspector();
        saveState();
      });

      // Agregar boca individual manual (con normalizador inteligente)
      const newPortInput = document.getElementById('input-new-port');
      const addPortBtn = document.getElementById('btn-add-port');

      const handleAddManualPort = () => {
        const raw = newPortInput.value.trim();
        if (!raw) return;
        const defaultPrefix = (node.type === 'router') ? 'Eth' : 'Boca';
        const pName = normalizePortName(raw, defaultPrefix);
        if (!node.availablePorts) node.availablePorts = [];
        if (!node.availablePorts.includes(pName)) {
          node.availablePorts.push(pName);
          renderInspector();
          saveState();
        } else {
          alert(`La boca "${pName}" ya existe en este equipo.`);
        }
      };

      addPortBtn.addEventListener('click', handleAddManualPort);
      newPortInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleAddManualPort();
      });

      // Eliminar boca libre
      dom.inspectorBody.querySelectorAll('[data-remove-port]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const portToRemove = btn.dataset.removePort;
          if (usedPortsMap[portToRemove]) {
            alert(`No puedes eliminar la boca "${portToRemove}" porque tiene un cable conectado.`);
            return;
          }
          node.availablePorts = node.availablePorts.filter(p => p !== portToRemove);
          renderInspector();
          saveState();
        });
      });

      document.getElementById('btn-dup-node').addEventListener('click', () => {
        duplicateNode(node.id);
      });

      document.getElementById('btn-del-node').addEventListener('click', () => {
        if (confirm(`¿Eliminar el dispositivo "${node.name}" y sus conexiones?`)) {
          deleteNode(node.id);
        }
      });

      // Clics en la lista de conexiones del inspector
      dom.inspectorBody.querySelectorAll('[data-cable-id]').forEach(row => {
        row.addEventListener('click', (e) => {
          if (e.target.dataset.delCable) return;
          selectElement('cable', row.dataset.cableId);
        });
      });

      dom.inspectorBody.querySelectorAll('[data-del-cable]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          deleteConnection(btn.dataset.delCable);
          renderInspector();
        });
      });
    } else if (type === 'cable') {
      const conn = state.connections.find(c => c.id === id);
      if (!conn) return deselectAll();

      const nodeA = state.nodes.find(n => n.id === conn.fromNodeId);
      const nodeB = state.nodes.find(n => n.id === conn.toNodeId);

      dom.inspectorTitle.textContent = 'Configuración de Enlace';

      dom.inspectorBody.innerHTML = `
        <div style="padding: 0.75rem; background: var(--bg-surface-elevated); border-radius: 8px; border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 0.4rem;">
          <div style="font-size: 0.8rem; font-weight: 600; color: var(--accent-cyan);">
            ${nodeA ? escapeHtml(nodeA.name) : 'Equipo A'} ↔ ${nodeB ? escapeHtml(nodeB.name) : 'Equipo B'}
          </div>
          <div style="font-size: 0.725rem; color: var(--text-secondary);">
            Conexión de bocas punto a punto
          </div>
        </div>

        <!-- SECCIÓN 1: BOCAS CONECTADAS -->
        <div class="inspector-section" id="sec-cable-endpoints">
          <div class="inspector-section-header" title="Clic para comprimir / expandir">
            <span>🔌 Bocas Conectadas</span>
            <svg class="section-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <div class="inspector-section-body">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
              <div class="form-group">
                <label>Boca en ${nodeA ? escapeHtml(nodeA.name) : 'A'}</label>
                <input type="text" id="prop-cable-porta" class="form-control mono" value="${escapeHtml(conn.fromPort)}">
              </div>
              <div class="form-group">
                <label>Boca en ${nodeB ? escapeHtml(nodeB.name) : 'B'}</label>
                <input type="text" id="prop-cable-portb" class="form-control mono" value="${escapeHtml(conn.toPort)}">
              </div>
            </div>
          </div>
        </div>

        <!-- SECCIÓN 2: TIPO Y MEDIO -->
        <div class="inspector-section" id="sec-cable-type">
          <div class="inspector-section-header" title="Clic para comprimir / expandir">
            <span>⚙️ Tipo de Cable y Red</span>
            <svg class="section-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <div class="inspector-section-body">
            <div class="form-group">
              <label>Tipo de Cable / Medio</label>
              <select id="prop-cable-type" class="form-control">
                <option value="ethernet" ${conn.cableType === 'ethernet' ? 'selected' : ''}>🔌 Ethernet UTP / Cat6</option>
                <option value="power" ${conn.cableType === 'power' ? 'selected' : ''}>⚡ Alimentación Eléctrica AC / 220V (Rojo)</option>
                <option value="fiber" ${conn.cableType === 'fiber' ? 'selected' : ''}>💡 Fibra Óptica</option>
                <option value="serial" ${conn.cableType === 'serial' ? 'selected' : ''}>⚡ Serial WAN</option>
                <option value="wireless" ${conn.cableType === 'wireless' ? 'selected' : ''}>📶 Enlace WiFi / Inalámbrico</option>
              </select>
            </div>

            <div class="form-group">
              <label>Etiqueta de Red / VLAN</label>
              <input type="text" id="prop-cable-tag" class="form-control mono" placeholder="Ej: 192.168.10.0/24 - VLAN 20" value="${escapeHtml(conn.networkLabel)}">
            </div>
          </div>
        </div>

        <!-- SECCIÓN 3: FORMA Y PUNTOS DE QUIEBRE -->
        <div class="inspector-section" id="sec-cable-routing">
          <div class="inspector-section-header" title="Clic para comprimir / expandir">
            <span>📐 Trazado y Puntos de Quiebre</span>
            <svg class="section-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <div class="inspector-section-body">
            <label style="font-size:0.72rem; color:var(--text-secondary); font-weight:600; margin-bottom:0.15rem;">Estilo de Unión</label>
            <div class="routing-mode-buttons">
              <button type="button" class="btn-routing-mode ${(conn.routingMode || state.defaultRoutingMode || 'orthogonal') === 'orthogonal' ? 'active' : ''}" data-routing="orthogonal" title="Ángulo recto a 90° con esquinas redondeadas técnicas">🔲 Ortogonal 90°</button>
              <button type="button" class="btn-routing-mode ${(conn.routingMode || state.defaultRoutingMode || 'orthogonal') === 'curved' ? 'active' : ''}" data-routing="curved" title="Curva suave fluida">〰️ Curvo</button>
              <button type="button" class="btn-routing-mode ${(conn.routingMode || state.defaultRoutingMode || 'orthogonal') === 'straight' ? 'active' : ''}" data-routing="straight" title="Línea recta clásica">📏 Recto</button>
            </div>

            <!-- Selector de Lado de Salida y Entrada -->
            <div class="cable-side-selectors" style="display:grid; grid-template-columns: 1fr 1fr; gap:0.5rem; margin-top:0.6rem; margin-bottom:0.5rem; background:rgba(255,255,255,0.03); padding:0.5rem; border-radius:6px; border:1px solid var(--border-color);">
              <div>
                <label style="font-size:0.68rem; color:var(--text-secondary); font-weight:600; display:block; margin-bottom:0.25rem;">Salida (${escapeHtml(nodeA ? (nodeA.customName || nodeA.name) : 'A')})</label>
                <select id="prop-cable-from-side" class="form-control form-control-sm" style="font-size:0.72rem; padding:0.25rem 0.35rem; width:100%;">
                  <option value="auto" ${(!conn.fromSide || conn.fromSide === 'auto') ? 'selected' : ''}>⚡ Automático (Cualquier lado)</option>
                  <option value="top" ${conn.fromSide === 'top' ? 'selected' : ''}>⬆️ Arriba</option>
                  <option value="bottom" ${conn.fromSide === 'bottom' ? 'selected' : ''}>⬇️ Abajo</option>
                  <option value="left" ${conn.fromSide === 'left' ? 'selected' : ''}>⬅️ Izquierda</option>
                  <option value="right" ${conn.fromSide === 'right' ? 'selected' : ''}>➡️ Derecha</option>
                </select>
              </div>
              <div>
                <label style="font-size:0.68rem; color:var(--text-secondary); font-weight:600; display:block; margin-bottom:0.25rem;">Entrada (${escapeHtml(nodeB ? (nodeB.customName || nodeB.name) : 'B')})</label>
                <select id="prop-cable-to-side" class="form-control form-control-sm" style="font-size:0.72rem; padding:0.25rem 0.35rem; width:100%;">
                  <option value="auto" ${(!conn.toSide || conn.toSide === 'auto') ? 'selected' : ''}>⚡ Automático (Cualquier lado)</option>
                  <option value="top" ${conn.toSide === 'top' ? 'selected' : ''}>⬆️ Arriba</option>
                  <option value="bottom" ${conn.toSide === 'bottom' ? 'selected' : ''}>⬇️ Abajo</option>
                  <option value="left" ${conn.toSide === 'left' ? 'selected' : ''}>⬅️ Izquierda</option>
                  <option value="right" ${conn.toSide === 'right' ? 'selected' : ''}>➡️ Derecha</option>
                </select>
              </div>
            </div>

            <div class="waypoint-info-box">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:0.75rem; color:var(--text-primary); font-weight:600;">Puntos de Inflexión:</span>
                <span class="mono" style="font-size:0.78rem; color:var(--accent-cyan); font-weight:700;">${(conn.waypoints || []).length}</span>
              </div>
              <p style="font-size:0.68rem; color:var(--text-muted); margin:0.35rem 0 0.5rem 0; line-height:1.35;">
                💡 <em>Tip:</em> Haz doble clic en el cable para agregar un punto allí. Arrástralo para moldear la línea. Doble clic o clic derecho sobre el círculo para borrarlo.
              </p>
              ${(Array.isArray(conn.waypoints) && conn.waypoints.length > 0) ? `
                <div class="waypoint-items-list">
                  ${conn.waypoints.map((wp, i) => `
                    <div class="waypoint-item-chip">
                      <span style="color:var(--accent-cyan); font-weight:700;">P${i + 1}</span>
                      <span>(${Math.round(wp.x)}, ${Math.round(wp.y)})</span>
                      <button type="button" data-del-wp="${i}" title="Eliminar punto P${i + 1}">✕</button>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
              <div style="display:flex; gap:0.4rem; margin-top:0.35rem;">
                <button type="button" id="btn-add-wp" class="btn btn-sm" style="flex:1; font-size:0.72rem; padding:0.35rem;">
                  ➕ Añadir Punto
                </button>
                <button type="button" id="btn-clear-wps" class="btn btn-sm" style="flex:1; font-size:0.72rem; padding:0.35rem;" ${(conn.waypoints || []).length === 0 ? 'disabled' : ''}>
                  ↺ Restablecer
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- SECCIÓN 4: ACCIONES -->
        <div class="inspector-section" id="sec-cable-actions" style="margin-bottom: 2rem !important; flex-shrink: 0 !important;">
          <div class="inspector-section-header" title="Clic para comprimir / expandir">
            <span>⚡ Acciones</span>
            <svg class="section-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <div class="inspector-section-body">
            <button id="btn-del-cable" class="btn btn-danger" style="width: 100%;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              Eliminar Conexión
            </button>
          </div>
        </div>
      `;

      // Habilitar colapso en encabezados de secciones del inspector
      dom.inspectorBody.querySelectorAll('.inspector-section-header').forEach(hdr => {
        hdr.addEventListener('click', () => {
          hdr.parentElement.classList.toggle('collapsed');
        });
      });

      document.getElementById('prop-cable-porta').addEventListener('input', (e) => {
        conn.fromPort = e.target.value;
        renderConnections();
        saveState();
      });

      document.getElementById('prop-cable-portb').addEventListener('input', (e) => {
        conn.toPort = e.target.value;
        renderConnections();
        saveState();
      });

      document.getElementById('prop-cable-type').addEventListener('change', (e) => {
        conn.cableType = e.target.value;
        renderConnections();
        saveState();
      });

      document.getElementById('prop-cable-tag').addEventListener('input', (e) => {
        conn.networkLabel = e.target.value;
        renderConnections();
        saveState();
      });

      // Selectores de lado de salida y entrada
      const selFromSide = document.getElementById('prop-cable-from-side');
      if (selFromSide) {
        selFromSide.addEventListener('change', (e) => {
          conn.fromSide = e.target.value;
          renderConnections();
          saveState();
        });
      }

      const selToSide = document.getElementById('prop-cable-to-side');
      if (selToSide) {
        selToSide.addEventListener('change', (e) => {
          conn.toSide = e.target.value;
          renderConnections();
          saveState();
        });
      }

      // Manejadores de modo de enrutamiento
      dom.inspectorBody.querySelectorAll('.btn-routing-mode').forEach(btn => {
        btn.addEventListener('click', () => {
          conn.routingMode = btn.dataset.routing;
          renderConnections();
          renderInspector();
          saveState();
        });
      });

      // Eliminar punto individual de waypoint desde el inspector
      dom.inspectorBody.querySelectorAll('[data-del-wp]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const wpIdx = parseInt(btn.dataset.delWp, 10);
          if (!isNaN(wpIdx) && Array.isArray(conn.waypoints)) {
            conn.waypoints.splice(wpIdx, 1);
            renderConnections();
            renderInspector();
            saveState();
          }
        });
      });

      // Añadir punto de quiebre en el centro geométrico del cable
      const btnAddWp = document.getElementById('btn-add-wp');
      if (btnAddWp) {
        btnAddWp.addEventListener('click', () => {
          const curve = computeConnectionCurve(conn, nodeA, nodeB);
          const posMid = getPointAlongCable(curve, (curve.totalLength || 100) * 0.5, false);

          let wx = posMid.x;
          let wy = posMid.y;
          if (state.snapToGrid) {
            wx = Math.round(wx / state.gridSize) * state.gridSize;
            wy = Math.round(wy / state.gridSize) * state.gridSize;
          }

          insertWaypointAtOptimalIndex(conn, { x: Math.round(wx), y: Math.round(wy) }, nodeA, nodeB);
          renderConnections();
          renderInspector();
          saveState();
        });
      }

      // Limpiar waypoints y volver al trazado automático
      const btnClearWps = document.getElementById('btn-clear-wps');
      if (btnClearWps) {
        btnClearWps.addEventListener('click', () => {
          conn.waypoints = [];
          renderConnections();
          renderInspector();
          saveState();
        });
      }

      document.getElementById('btn-del-cable').addEventListener('click', () => {
        deleteConnection(conn.id);
      });
    }
  }

  // ==========================================================================
  // GESTIÓN DE ÁREAS Y ZONAS DE RED / VLAN
  // ==========================================================================
  const ZONE_COLOR_PALETTES = {
    cyan: { border: 'rgba(56, 189, 248, 0.65)', bg: 'rgba(56, 189, 248, 0.05)', text: '#38bdf8' },
    emerald: { border: 'rgba(16, 185, 129, 0.65)', bg: 'rgba(16, 185, 129, 0.05)', text: '#10b981' },
    amber: { border: 'rgba(245, 158, 11, 0.65)', bg: 'rgba(245, 158, 11, 0.05)', text: '#f59e0b' },
    rose: { border: 'rgba(244, 63, 94, 0.65)', bg: 'rgba(244, 63, 94, 0.05)', text: '#f43f5e' },
    purple: { border: 'rgba(168, 85, 247, 0.65)', bg: 'rgba(168, 85, 247, 0.05)', text: '#a855f7' },
    blue: { border: 'rgba(59, 130, 246, 0.65)', bg: 'rgba(59, 130, 246, 0.05)', text: '#3b82f6' }
  };

  function createZone(name = 'Zona VLAN', x = 100, y = 100, width = 320, height = 220, color = 'cyan') {
    const id = 'zone_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    const snapX = state.snapToGrid ? Math.round(x / state.gridSize) * state.gridSize : Math.round(x);
    const snapY = state.snapToGrid ? Math.round(y / state.gridSize) * state.gridSize : Math.round(y);
    const newZone = {
      id,
      name,
      color,
      x: snapX,
      y: snapY,
      width: Math.max(120, width),
      height: Math.max(80, height)
    };

    if (!Array.isArray(state.zones)) state.zones = [];
    state.zones.push(newZone);
    renderZones();
    selectElement('zone', id);
    pushHistoryState();
    saveState();
    return newZone;
  }

  function deleteZone(zoneId) {
    if (!Array.isArray(state.zones)) return;
    const idx = state.zones.findIndex(z => z.id === zoneId);
    if (idx !== -1) {
      state.zones.splice(idx, 1);
      if (state.selection.type === 'zone' && state.selection.id === zoneId) {
        deselectAll();
      }
      renderZones();
      pushHistoryState();
      saveState();
    }
  }

  function renderZones() {
    if (!dom.zonesLayer) return;
    dom.zonesLayer.innerHTML = '';
    if (!Array.isArray(state.zones)) return;

    state.zones.forEach(zone => {
      const el = document.createElement('div');
      el.id = zone.id;
      el.className = 'network-zone';
      if (state.selection.type === 'zone' && state.selection.id === zone.id) {
        el.classList.add('selected');
      }

      const colors = ZONE_COLOR_PALETTES[zone.color] || ZONE_COLOR_PALETTES.cyan;
      el.style.left = `${zone.x}px`;
      el.style.top = `${zone.y}px`;
      el.style.width = `${zone.width}px`;
      el.style.height = `${zone.height}px`;
      el.style.borderColor = colors.border;
      el.style.backgroundColor = colors.bg;

      el.innerHTML = `
        <div class="zone-header" style="border-bottom-color: ${colors.border};">
          <div class="zone-title">
            <span class="zone-color-tag" style="background-color: ${colors.text};"></span>
            <span class="zone-name-text">${escapeHtml(zone.name || 'Zona')}</span>
          </div>
          <div class="zone-actions">
            <button class="zone-btn-action btn-zone-del" title="Eliminar esta zona" type="button">✕</button>
          </div>
        </div>
        <!-- 4 Lados / Bordes para redimensionar desde cualquier lado -->
        <div class="zone-edge-handle zone-edge-t" data-dir="n" title="Arrastrar para redimensionar arriba"></div>
        <div class="zone-edge-handle zone-edge-b" data-dir="s" title="Arrastrar para redimensionar abajo"></div>
        <div class="zone-edge-handle zone-edge-l" data-dir="w" title="Arrastrar para redimensionar izquierda"></div>
        <div class="zone-edge-handle zone-edge-r" data-dir="e" title="Arrastrar para redimensionar derecha"></div>
        <!-- 4 Esquinas para redimensionar -->
        <div class="zone-corner-handle zone-corner-tl" data-dir="nw" title="Redimensionar esquina sup. izquierda"></div>
        <div class="zone-corner-handle zone-corner-tr" data-dir="ne" title="Redimensionar esquina sup. derecha"></div>
        <div class="zone-corner-handle zone-corner-bl" data-dir="sw" title="Redimensionar esquina inf. izquierda"></div>
        <div class="zone-corner-handle zone-corner-br" data-dir="se" title="Redimensionar esquina inf. derecha"></div>
      `;

      // Seleccionar la zona al hacer clic en su cabecera
      const headerEl = el.querySelector('.zone-header');
      if (headerEl) {
        headerEl.addEventListener('mousedown', (e) => {
          if (e.target.closest('.btn-zone-del')) return;
          selectElement('zone', zone.id);
        });
        headerEl.addEventListener('dblclick', (e) => {
          if (e.target.closest('.btn-zone-del')) return;
          e.stopPropagation();
          selectElement('zone', zone.id);
          if (dom.sidebarInspector && dom.sidebarInspector.classList.contains('collapsed')) {
            toggleInspector(false);
          }
          setTimeout(() => {
            const zName = document.getElementById('insp-zone-name');
            if (zName) {
              zName.focus();
              zName.select();
            }
          }, 50);
        });
      }

      // Botón eliminar dentro del header de la zona
      const btnDel = el.querySelector('.btn-zone-del');
      if (btnDel) {
        btnDel.addEventListener('click', (e) => {
          e.stopPropagation();
          deleteZone(zone.id);
        });
      }

      setupZoneDrag(el, zone);
      setupZoneResize(el, zone);

      dom.zonesLayer.appendChild(el);
    });
  }

  function setupZoneDrag(el, zone) {
    const header = el.querySelector('.zone-header');
    if (!header) return;

    let isDragging = false;
    let dragStart = { x: 0, y: 0 };
    let hasMoved = false;
    let dragRafId = null;
    let lastDx = 0;
    let lastDy = 0;

    let initialZonePositions = [];
    let initialNodePositions = [];
    let movingConnWaypoints = [];

    header.addEventListener('mousedown', (e) => {
      if (e.button !== 0 || e.target.closest('.zone-btn-action')) return;
      e.stopPropagation();
      e.preventDefault();

      const isMultiKey = e.shiftKey || e.ctrlKey || e.metaKey;
      if (!state.selectedZoneIds) state.selectedZoneIds = new Set();

      if (isMultiKey) {
        if (state.selectedZoneIds.has(zone.id)) {
          state.selectedZoneIds.delete(zone.id);
        } else {
          state.selectedZoneIds.add(zone.id);
        }
        const totalCount = state.selectedNodeIds.size + state.selectedZoneIds.size;
        state.selection = {
          type: totalCount > 1 ? 'multi-node' : (state.selectedZoneIds.has(zone.id) ? 'zone' : null),
          id: zone.id,
          ids: [...Array.from(state.selectedNodeIds), ...Array.from(state.selectedZoneIds)]
        };
        updateSelectionVisuals();
        renderConnections();
        renderInspector();
        if (!state.selectedZoneIds.has(zone.id)) return;
      } else {
        if (!state.selectedZoneIds.has(zone.id)) {
          state.selectedNodeIds.clear();
          state.selectedZoneIds.clear();
          state.selectedZoneIds.add(zone.id);
          selectElement('zone', zone.id);
        }
      }

      isDragging = true;
      hasMoved = false;
      dragStart = { x: e.clientX, y: e.clientY };

      const zonesToDrag = (state.zones || []).filter(z => state.selectedZoneIds.has(z.id));
      initialZonePositions = zonesToDrag.map(z => ({
        zone: z,
        x: z.x,
        y: z.y,
        el: document.getElementById(z.id)
      }));

      const nodesToDrag = (state.nodes || []).filter(n => state.selectedNodeIds.has(n.id));
      initialNodePositions = nodesToDrag.map(n => ({
        node: n,
        x: n.x,
        y: n.y,
        el: document.getElementById(n.id)
      }));

      movingConnWaypoints = state.connections
        .filter(c => state.selectedNodeIds.has(c.fromNodeId) && state.selectedNodeIds.has(c.toNodeId) && Array.isArray(c.waypoints) && c.waypoints.length > 0)
        .map(c => ({
          conn: c,
          initialWps: c.waypoints.map(w => ({ ...w }))
        }));

      const performZoneDragUpdate = () => {
        dragRafId = null;
        if (!isDragging) return;

        // Mover todas las zonas seleccionadas
        initialZonePositions.forEach(item => {
          let nx = item.x + lastDx;
          let ny = item.y + lastDy;
          if (state.snapToGrid) {
            nx = Math.round(nx / state.gridSize) * state.gridSize;
            ny = Math.round(ny / state.gridSize) * state.gridSize;
          }
          item.zone.x = Math.round(nx);
          item.zone.y = Math.round(ny);
          if (item.el) {
            item.el.style.left = `${item.zone.x}px`;
            item.el.style.top = `${item.zone.y}px`;
          }
        });

        // Mover todos los nodos seleccionados si formaban parte de la selección en bloque
        initialNodePositions.forEach(item => {
          let nx = item.x + lastDx;
          let ny = item.y + lastDy;
          if (state.snapToGrid) {
            const snapped = snapNodeCoordinates(nx, ny);
            nx = snapped.x;
            ny = snapped.y;
          }
          item.node.x = nx;
          item.node.y = ny;
          if (item.el) {
            item.el.style.left = `${nx}px`;
            item.el.style.top = `${ny}px`;
          }
        });

        // Trasladar waypoints de cables internos
        movingConnWaypoints.forEach(item => {
          item.conn.waypoints = item.initialWps.map(w => {
            let wx = w.x + lastDx;
            let wy = w.y + lastDy;
            if (state.snapToGrid) {
              wx = Math.round(wx / state.gridSize) * state.gridSize;
              wy = Math.round(wy / state.gridSize) * state.gridSize;
            }
            return { x: Math.round(wx), y: Math.round(wy) };
          });
        });

        if (initialNodePositions.length > 0) {
          renderConnections();
        }
      };

      const onMouseMove = (moveEvent) => {
        if (!isDragging) return;
        lastDx = (moveEvent.clientX - dragStart.x) / state.viewport.zoom;
        lastDy = (moveEvent.clientY - dragStart.y) / state.viewport.zoom;

        if (Math.abs(lastDx) > 1 || Math.abs(lastDy) > 1) {
          hasMoved = true;
        }

        if (!dragRafId) {
          dragRafId = requestAnimationFrame(performZoneDragUpdate);
        }
      };

      const onMouseUp = () => {
        if (isDragging) {
          isDragging = false;
          if (dragRafId) {
            cancelAnimationFrame(dragRafId);
            dragRafId = null;
          }
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
          if (hasMoved) {
            performZoneDragUpdate();
            pushHistoryState();
            saveState();
            if (typeof updateMinimap === 'function') updateMinimap();
          }
        }
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });

    header.addEventListener('click', (e) => {
      e.stopPropagation();
      if (hasMoved) return;
      const isMultiKey = e.shiftKey || e.ctrlKey || e.metaKey;
      const totalSelected = state.selectedNodeIds.size + (state.selectedZoneIds ? state.selectedZoneIds.size : 0);
      if (!isMultiKey && totalSelected > 1) {
        state.selectedNodeIds.clear();
        state.selectedZoneIds.clear();
        state.selectedZoneIds.add(zone.id);
        selectElement('zone', zone.id);
      }
    });
  }

  function setupZoneResize(el, zone) {
    const handles = el.querySelectorAll('.zone-edge-handle, .zone-corner-handle');
    if (!handles.length) return;

    handles.forEach(handle => {
      handle.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        e.preventDefault();

        const dir = handle.dataset.dir;
        let isResizing = true;
        const startX = e.clientX;
        const startY = e.clientY;
        const origX = zone.x;
        const origY = zone.y;
        const origW = zone.width;
        const origH = zone.height;
        const origRight = origX + origW;
        const origBottom = origY + origH;
        selectElement('zone', zone.id);

        const MIN_W = 120;
        const MIN_H = 80;
        let resizeRafId = null;
        let pendingResize = null;

        const onMouseMove = (moveEvent) => {
          if (!isResizing) return;
          pendingResize = moveEvent;
          if (!resizeRafId) {
            resizeRafId = requestAnimationFrame(() => {
              if (isResizing && pendingResize) {
                const zoom = state.viewport.zoom || 1;
                const dx = (pendingResize.clientX - startX) / zoom;
                const dy = (pendingResize.clientY - startY) / zoom;

                let newX = origX;
                let newY = origY;
                let newW = origW;
                let newH = origH;

                if (dir.includes('e')) {
                  let curRight = origRight + dx;
                  if (state.snapToGrid) curRight = Math.round(curRight / state.gridSize) * state.gridSize;
                  if (curRight - origX < MIN_W) curRight = origX + MIN_W;
                  newW = curRight - origX;
                } else if (dir.includes('w')) {
                  let curX = origX + dx;
                  if (state.snapToGrid) curX = Math.round(curX / state.gridSize) * state.gridSize;
                  if (origRight - curX < MIN_W) curX = origRight - MIN_W;
                  newX = curX;
                  newW = origRight - curX;
                }

                if (dir.includes('s')) {
                  let curBottom = origBottom + dy;
                  if (state.snapToGrid) curBottom = Math.round(curBottom / state.gridSize) * state.gridSize;
                  if (curBottom - origY < MIN_H) curBottom = origY + MIN_H;
                  newH = curBottom - origY;
                } else if (dir.includes('n')) {
                  let curY = origY + dy;
                  if (state.snapToGrid) curY = Math.round(curY / state.gridSize) * state.gridSize;
                  if (origBottom - curY < MIN_H) curY = origBottom - MIN_H;
                  newY = curY;
                  newH = origBottom - curY;
                }

                zone.x = Math.round(newX);
                zone.y = Math.round(newY);
                zone.width = Math.max(MIN_W, Math.round(newW));
                zone.height = Math.max(MIN_H, Math.round(newH));

                el.style.left = `${zone.x}px`;
                el.style.top = `${zone.y}px`;
                el.style.width = `${zone.width}px`;
                el.style.height = `${zone.height}px`;

                const inspX = document.getElementById('insp-zone-x');
                const inspY = document.getElementById('insp-zone-y');
                const inspW = document.getElementById('insp-zone-w');
                const inspH = document.getElementById('insp-zone-h');
                if (inspX) inspX.value = zone.x;
                if (inspY) inspY.value = zone.y;
                if (inspW) inspW.value = zone.width;
                if (inspH) inspH.value = zone.height;
              }
              resizeRafId = null;
            });
          }
        };

        const onMouseUp = () => {
          if (resizeRafId) {
            cancelAnimationFrame(resizeRafId);
            resizeRafId = null;
          }
          if (isResizing) {
            isResizing = false;
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            pushHistoryState();
            saveState();
          }
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      });
    });
  }

  // ==========================================================================
  // BÚSQUEDA RÁPIDA / SPOTLIGHT (CTRL + F)
  // ==========================================================================
  let searchResultsData = [];
  let searchActiveIndex = -1;

  function openQuickSearchModal() {
    if (!dom.modalSearch) return;
    closeAllDropdowns();
    dom.modalSearch.classList.add('open');
    if (dom.inputQuickSearch) {
      dom.inputQuickSearch.value = '';
      setTimeout(() => dom.inputQuickSearch.focus(), 50);
    }
    renderSearchResults('');
  }

  function closeQuickSearchModal() {
    if (!dom.modalSearch) return;
    dom.modalSearch.classList.remove('open');
    searchActiveIndex = -1;
    searchResultsData = [];
  }

  function renderSearchResults(query) {
    if (!dom.searchResultsContainer) return;
    const q = (query || '').toLowerCase().trim();

    // Buscar en todos los nodos de la hoja activa
    const matches = state.nodes.filter(node => {
      if (!q) return true; // Mostrar todos si está vacío
      const nameMatch = (node.customName || node.name || '').toLowerCase().includes(q);
      const typeMatch = (node.type || '').toLowerCase().includes(q);
      const metaMatch = (DEVICE_METADATA[node.type]?.label || '').toLowerCase().includes(q);
      const ipMatch = (node.ip || '').toLowerCase().includes(q);
      const portMatch = (node.availablePorts || []).some(p => 
        p && p.toLowerCase().includes(q)
      );
      return nameMatch || typeMatch || metaMatch || ipMatch || portMatch;
    });

    searchResultsData = matches;
    searchActiveIndex = matches.length > 0 ? 0 : -1;

    if (dom.searchResultsStats) {
      dom.searchResultsStats.textContent = q
        ? `${matches.length} ${matches.length === 1 ? 'coincidencia encontrada' : 'coincidencias encontradas'}`
        : `Mostrando todos los equipos (${matches.length})`;
    }

    dom.searchResultsContainer.innerHTML = '';

    if (matches.length === 0) {
      dom.searchResultsContainer.innerHTML = `
        <div style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
          No se encontraron equipos ni direcciones IP que coincidan con "${escapeHtml(q)}".
        </div>
      `;
      return;
    }

    matches.slice(0, 30).forEach((node, idx) => {
      const item = document.createElement('div');
      item.className = `search-result-item ${idx === 0 ? 'selected' : ''}`;
      item.dataset.index = idx;

      const typeLabel = DEVICE_METADATA[node.type]?.label || node.type;
      const isLight = state.theme === 'light';
      const iconSvg = typeof getDeviceIcon === 'function' ? getDeviceIcon(node.type, isLight) : (DEVICE_ICONS[node.type] || '');

      // Información de IP
      const displayIp = (node.ip || '').trim() 
        ? `IP: ${node.ip} · Máscara: ${node.mask || '255.255.255.0'}`
        : 'Sin IP configurada';

      item.innerHTML = `
        <div class="search-result-icon">${iconSvg}</div>
        <div class="search-result-info">
          <div class="search-result-title">
            <span>${escapeHtml(node.customName || node.name)}</span>
            <span class="search-result-type-tag">${typeLabel}</span>
          </div>
          <div class="search-result-meta">${escapeHtml(displayIp)}</div>
        </div>
        <div class="search-result-action">Saltar ↵</div>
      `;

      item.addEventListener('click', () => {
        panAndHighlightNode(node.id);
        closeQuickSearchModal();
      });

      dom.searchResultsContainer.appendChild(item);
    });
  }

  function panAndHighlightNode(nodeId) {
    const node = state.nodes.find(n => n.id === nodeId);
    if (!node) return;

    // Centrar la cámara suavemente en el equipo
    const vpW = dom.viewport.clientWidth;
    const vpH = dom.viewport.clientHeight;
    state.viewport.x = (vpW / 2) - (node.x + 52) * state.viewport.zoom;
    state.viewport.y = (vpH / 2) - (node.y + 40) * state.viewport.zoom;
    updateViewportTransform();

    // Seleccionar el nodo
    selectElement('node', node.id);

    // Aplicar pulso luminoso para que el usuario lo ubique al instante
    const el = document.getElementById(node.id);
    if (el) {
      el.classList.remove('node-glow-pulse');
      void el.offsetWidth; // Forzar reflujo
      el.classList.add('node-glow-pulse');
      setTimeout(() => el.classList.remove('node-glow-pulse'), 2500);
    }
  }

  // ==========================================================================
  // INVENTARIO DE DIRECCIONAMIENTO IP Y PUERTOS
  // ==========================================================================
  function openIpInventoryModal() {
    if (!dom.modalIpInventory) return;
    closeAllDropdowns();
    dom.modalIpInventory.classList.add('open');
    if (dom.ipTableFilter) {
      dom.ipTableFilter.value = '';
      setTimeout(() => dom.ipTableFilter.focus(), 50);
    }
    renderIpInventoryTable('');
  }

  function closeIpInventoryModal() {
    if (!dom.modalIpInventory) return;
    dom.modalIpInventory.classList.remove('open');
  }

  function getIpInventoryRows() {
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

  function renderIpInventoryTable(filterQuery) {
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

  function formatCsvCell(val, delimiter = ';') {
    if (val === null || val === undefined) return '';
    const str = String(val).trim();
    if (str.includes(delimiter) || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  function exportIpInventoryCsv() {
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

  function copyIpInventoryToClipboard() {
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

  // ==========================================================================
  // MENÚS DESPLEGABLES DE LA BARRA SUPERIOR (TOPBAR)
  // ==========================================================================
  function toggleDropdown(dropdownEl) {
    if (!dropdownEl) return;
    const isOpen = dropdownEl.classList.contains('show');
    closeAllDropdowns();
    if (!isOpen) {
      dropdownEl.classList.add('show');
    }
  }

  function closeAllDropdowns() {
    document.querySelectorAll('.dropdown-menu.show').forEach(el => el.classList.remove('show'));
  }

  // ==========================================================================
  // GESTIÓN DE MÚLTIPLES HOJAS / SOLAPAS Y FORMATO DE HOJA (MULTI-SHEET)
  // ==========================================================================

  function getCurrentSheet() {
    if (!Array.isArray(state.sheets) || state.sheets.length === 0) return null;
    let sheet = state.sheets.find(s => s.id === state.activeSheetId);
    if (!sheet) {
      sheet = state.sheets[0];
      state.activeSheetId = sheet.id;
    }
    return sheet;
  }

  function normalizeProjectSheets(project) {
    if (!project) return;
    if (!Array.isArray(project.sheets) || project.sheets.length === 0) {
      project.sheets = [
        {
          id: 'sheet_1',
          name: 'Hoja 1',
          pageSize: 'infinite',
          pageWidth: 1123,
          pageHeight: 794,
          bgTheme: 'white',
          nodes: Array.isArray(project.nodes) ? project.nodes : [],
          connections: Array.isArray(project.connections) ? project.connections : [],
          zones: Array.isArray(project.zones) ? project.zones : [],
          viewport: project.viewport || { x: 80, y: 80, zoom: 1 }
        }
      ];
      project.activeSheetId = 'sheet_1';
    } else {
      if (!project.activeSheetId || !project.sheets.some(s => s.id === project.activeSheetId)) {
        project.activeSheetId = project.sheets[0].id;
      }
    }
  }

  function loadSheetData(sheet, resetView = true) {
    if (!sheet) return;

    dom.nodesLayer.innerHTML = '';
    dom.cablesGroup.innerHTML = '';
    dom.labelsLayer.innerHTML = '';
    if (dom.zonesLayer) dom.zonesLayer.innerHTML = '';

    state.nodes = sheet.nodes || [];
    state.connections = sheet.connections || [];
    state.zones = sheet.zones || [];

    // Normalizar automáticamente puertos antiguos o extensos a los nuevos estándares compactos (E 220V y S 220V)
    const convertOldPortName = (p) => {
      if (!p || typeof p !== 'string') return p;
      const t = p.trim();
      if (t === 'Alimentación 220V' || t === 'Entrada 220V' || t === 'Entrada Línea (220V)' || t === 'Cargador 220V' || t === 'Alimentación 12V/220V') return 'E 220V';
      if (t === 'Salida Carga' || t === 'Salida 220V') return 'S 220V';
      const mSal = t.match(/^Salida\s*(\d+)\s*\(UPS\)$/i);
      if (mSal) return `S 220V (${mSal[1]})`;
      const mPc = t.match(/^Salida\s*PC\s*(\d+)$/i);
      if (mPc) return `S PC ${mPc[1]}`;
      if (t === 'Salida Canal de Tensión') return 'S Canal Tensión';
      const mEntUps = t.match(/^Entrada\s*UPS\s*(\d+)(?:\s*\(S\d+\))?$/i);
      if (mEntUps) return `E UPS ${mEntUps[1]}`;
      return p;
    };

    state.nodes.forEach(n => {
      if (Array.isArray(n.availablePorts)) {
        n.availablePorts = n.availablePorts.map(convertOldPortName);
      }
    });
    state.connections.forEach(c => {
      if (c.fromPort) c.fromPort = convertOldPortName(c.fromPort);
      if (c.toPort) c.toPort = convertOldPortName(c.toPort);
    });

    if (resetView && sheet.viewport) {
      state.viewport = { ...sheet.viewport };
    }

    renderZones();
    state.nodes.forEach(node => renderNodeElement(node));
    renderConnections();
    deselectAll();
    updateViewportTransform();
    updatePaperSheetDisplay();
  }

  function switchSheet(targetSheetId) {
    if (state.activeSheetId === targetSheetId) return;

    // 1. Guardar la hoja actual en el array en memoria
    const current = getCurrentSheet();
    if (current) {
      current.nodes = state.nodes;
      current.connections = state.connections;
      current.zones = state.zones || [];
      current.viewport = { ...state.viewport };
    }

    // 2. Establecer nueva hoja activa
    state.activeSheetId = targetSheetId;

    // 3. Cargar datos de la nueva hoja
    const target = getCurrentSheet();
    if (target) {
      loadSheetData(target, true);
    }

    renderSheetsBar();
    saveState();
  }

  function addNewSheet(customName, presetKey = 'infinite') {
    const current = getCurrentSheet();
    if (current) {
      current.nodes = state.nodes;
      current.connections = state.connections;
      current.zones = state.zones || [];
      current.viewport = { ...state.viewport };
    }

    const nextNum = state.sheets.length + 1;
    const name = customName || `Hoja ${nextNum}`;
    const preset = SHEET_PRESETS[presetKey] || SHEET_PRESETS.infinite;

    const newSheet = {
      id: 'sheet_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      name: name,
      pageSize: presetKey,
      pageWidth: preset.width || 1123,
      pageHeight: preset.height || 794,
      bgTheme: 'white',
      nodes: [],
      connections: [],
      zones: [],
      viewport: { x: 80, y: 80, zoom: 1 }
    };

    state.sheets.push(newSheet);
    state.activeSheetId = newSheet.id;
    loadSheetData(newSheet, true);
    renderSheetsBar();
    saveState();
  }

  function duplicateCurrentSheet() {
    const current = getCurrentSheet();
    if (!current) return;

    current.nodes = state.nodes;
    current.connections = state.connections;
    current.zones = state.zones || [];
    current.viewport = { ...state.viewport };

    const idMap = {};
    const clonedNodes = current.nodes.map(n => {
      const newId = 'node_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
      idMap[n.id] = newId;
      return {
        ...JSON.parse(JSON.stringify(n)),
        id: newId
      };
    });

    const clonedConns = current.connections.map(c => {
      return {
        ...JSON.parse(JSON.stringify(c)),
        id: 'cable_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        fromNodeId: idMap[c.fromNodeId] || c.fromNodeId,
        toNodeId: idMap[c.toNodeId] || c.toNodeId
      };
    });

    const clonedZones = (current.zones || []).map(z => ({
      ...JSON.parse(JSON.stringify(z)),
      id: 'zone_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4)
    }));

    const newSheet = {
      id: 'sheet_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      name: `${current.name} (Copia)`,
      pageSize: current.pageSize,
      pageWidth: current.pageWidth,
      pageHeight: current.pageHeight,
      bgTheme: current.bgTheme || 'white',
      nodes: clonedNodes,
      connections: clonedConns,
      zones: clonedZones,
      viewport: { ...current.viewport }
    };

    state.sheets.push(newSheet);
    state.activeSheetId = newSheet.id;
    loadSheetData(newSheet, false);
    renderSheetsBar();
    saveState();
  }

  function deleteSheet(sheetId) {
    if (state.sheets.length <= 1) {
      alert('No puedes eliminar la única hoja del proyecto. Puedes crear otra antes de borrar esta.');
      return;
    }

    const target = state.sheets.find(s => s.id === sheetId);
    const sheetName = target ? target.name : 'esta hoja';

    if (confirm(`¿Estás seguro de eliminar "${sheetName}" y todo su diagrama?`)) {
      const idx = state.sheets.findIndex(s => s.id === sheetId);
      state.sheets = state.sheets.filter(s => s.id !== sheetId);

      if (state.activeSheetId === sheetId) {
        const nextActive = state.sheets[Math.max(0, idx - 1)] || state.sheets[0];
        state.activeSheetId = nextActive.id;
        loadSheetData(nextActive, true);
      }

      renderSheetsBar();
      saveState();
    }
  }

  function renameSheet(sheetId, newName) {
    const sheet = state.sheets.find(s => s.id === sheetId);
    if (sheet && newName && newName.trim()) {
      sheet.name = newName.trim();
      renderSheetsBar();
      updatePaperSheetDisplay();
      saveState();
    }
  }

  function updatePaperSheetDisplay() {
    const sheet = getCurrentSheet();
    if (!sheet) return;

    const isInf = sheet.pageSize === 'infinite';
    const preset = SHEET_PRESETS[sheet.pageSize] || SHEET_PRESETS.custom;
    const presetLabel = preset.label || 'Personalizado';

    if (isInf) {
      if (dom.paperSheet) dom.paperSheet.style.display = 'none';
      if (dom.viewport) dom.viewport.classList.remove('has-sheet');
      if (dom.sheetModeText) dom.sheetModeText.textContent = 'Hoja Infinita';
      if (dom.sheetCurrentFormatLabel) dom.sheetCurrentFormatLabel.textContent = 'Hoja Infinita';
      if (dom.optExportSheetBoundsWrap) dom.optExportSheetBoundsWrap.style.display = 'none';
    } else {
      if (dom.viewport) dom.viewport.classList.add('has-sheet');
      if (dom.paperSheet) {
        dom.paperSheet.style.display = 'block';
        dom.paperSheet.style.width = `${sheet.pageWidth}px`;
        dom.paperSheet.style.height = `${sheet.pageHeight}px`;
        dom.paperSheet.className = 'paper-sheet';
        if (dom.paperSheetTag) {
          dom.paperSheetTag.textContent = `${sheet.name} · ${presetLabel} (${sheet.pageWidth} × ${sheet.pageHeight} px)`;
        }
      }
      if (dom.sheetModeText) dom.sheetModeText.textContent = preset.badge || presetLabel;
      if (dom.sheetCurrentFormatLabel) dom.sheetCurrentFormatLabel.textContent = preset.badge || presetLabel;
      if (dom.optExportSheetBoundsWrap) {
        dom.optExportSheetBoundsWrap.style.display = 'block';
        if (dom.lblExportSheetName) dom.lblExportSheetName.textContent = `${sheet.name} (${presetLabel})`;
      }
    }
    updateMinimap();
  }

  function updateSheetNavArrows() {
    const container = dom.sheetsScrollContainer;
    if (!container) return;
    const hasOverflow = container.scrollWidth > container.clientWidth + 4;
    if (dom.btnSheetScrollPrev) {
      dom.btnSheetScrollPrev.style.display = hasOverflow ? 'inline-flex' : 'none';
      dom.btnSheetScrollPrev.disabled = container.scrollLeft <= 2;
    }
    if (dom.btnSheetScrollNext) {
      dom.btnSheetScrollNext.style.display = hasOverflow ? 'inline-flex' : 'none';
      const maxScroll = container.scrollWidth - container.clientWidth;
      dom.btnSheetScrollNext.disabled = container.scrollLeft >= maxScroll - 2;
    }
  }

  function renderSheetsBar() {
    if (!dom.sheetsTabsList) return;
    dom.sheetsTabsList.innerHTML = '';

    state.sheets.forEach(sheet => {
      const isActive = sheet.id === state.activeSheetId;
      const preset = SHEET_PRESETS[sheet.pageSize] || SHEET_PRESETS.custom;
      const isInf = sheet.pageSize === 'infinite';

      const tab = document.createElement('div');
      tab.className = `sheet-tab ${isActive ? 'active' : ''}`;
      tab.dataset.sheetId = sheet.id;
      tab.title = `${sheet.name} (${preset.label || (sheet.pageWidth + '×' + sheet.pageHeight)}) - Clic para ver, doble clic para renombrar`;

      tab.innerHTML = `
        <span class="sheet-tab-icon">
          ${isInf ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18.178 8c5.096 0 5.096 8 0 8-2.673 0-4.63-2.667-6.178-5.333C10.452 7.333 8.495 4.667 5.822 4.667c-5.096 0-5.096 8 0 8 2.673 0 4.63-2.667 6.178-5.333C13.548 4.667 15.505 2 18.178 2z"/></svg>' : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>'}
        </span>
        <span class="sheet-tab-name">${escapeHtml(sheet.name)}</span>
        <span class="sheet-tab-badge">${escapeHtml(preset.badge || 'A medida')}</span>
        <button class="sheet-tab-menu-btn" data-sheet-menu="${sheet.id}" title="Opciones de hoja">⋮</button>
      `;

      tab.addEventListener('click', (e) => {
        if (e.target.closest('.sheet-tab-menu-btn')) return;
        switchSheet(sheet.id);
      });

      tab.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        const newName = prompt('Nuevo nombre para la hoja:', sheet.name);
        if (newName !== null && newName.trim()) {
          renameSheet(sheet.id, newName.trim());
        }
      });

      const menuBtn = tab.querySelector('.sheet-tab-menu-btn');
      menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openSheetContextMenu(e, sheet);
      });

      dom.sheetsTabsList.appendChild(tab);
    });

    updatePaperSheetDisplay();

    // Desplazar suavemente para que la solapa activa sea visible y actualizar flechas
    requestAnimationFrame(() => {
      if (dom.sheetsTabsList && dom.sheetsScrollContainer) {
        const activeTab = dom.sheetsTabsList.querySelector('.sheet-tab.active');
        if (activeTab) {
          activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        }
      }
      updateSheetNavArrows();
    });
  }

  let activeContextMenu = null;
  function closeContextMenu() {
    if (activeContextMenu) {
      activeContextMenu.remove();
      activeContextMenu = null;
    }
  }

  window.addEventListener('click', closeContextMenu);

  function openSheetContextMenu(e, sheet) {
    closeContextMenu();

    const menu = document.createElement('div');
    menu.className = 'sheet-context-menu';
    menu.innerHTML = `
      <button class="sheet-menu-item" data-action="rename">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
        Renombrar Hoja
      </button>
      <button class="sheet-menu-item" data-action="duplicate">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Duplicar Hoja
      </button>
      <button class="sheet-menu-item" data-action="config">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
        Configurar Tamaño (${SHEET_PRESETS[sheet.pageSize]?.badge || 'Personalizado'})
      </button>
      <div style="height: 1px; background: var(--border-color); margin: 3px 0;"></div>
      <button class="sheet-menu-item item-danger" data-action="delete" ${state.sheets.length <= 1 ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        Eliminar Hoja
      </button>
    `;

    const rect = e.target.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.zIndex = '1050';

    // Determinar si abrir hacia abajo (normal, dado que la barra de solapas está arriba) o hacia arriba
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    if (spaceBelow >= 160 || spaceBelow >= spaceAbove) {
      menu.style.top = `${rect.bottom + 4}px`;
      menu.style.bottom = 'auto';
    } else {
      menu.style.bottom = `${window.innerHeight - rect.top + 4}px`;
      menu.style.top = 'auto';
    }

    const leftPos = Math.max(10, Math.min(window.innerWidth - 225, rect.left - 40));
    menu.style.left = `${leftPos}px`;

    menu.addEventListener('click', (evt) => {
      evt.stopPropagation();
      const btn = evt.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      closeContextMenu();

      if (action === 'rename') {
        const newName = prompt('Nuevo nombre para la hoja:', sheet.name);
        if (newName !== null && newName.trim()) renameSheet(sheet.id, newName.trim());
      } else if (action === 'duplicate') {
        duplicateCurrentSheet();
      } else if (action === 'config') {
        switchSheet(sheet.id);
        openSheetConfigModal();
      } else if (action === 'delete') {
        deleteSheet(sheet.id);
      }
    });

    document.body.appendChild(menu);
    activeContextMenu = menu;
  }

  function openSheetConfigModal() {
    const sheet = getCurrentSheet();
    if (!sheet) return;

    dom.cfgSheetName.value = sheet.name;
    dom.cfgSheetPreset.value = sheet.pageSize || 'infinite';
    dom.cfgCustomWidth.value = sheet.pageWidth || 1200;
    dom.cfgCustomHeight.value = sheet.pageHeight || 800;

    dom.cfgCustomDimsBox.style.display = (sheet.pageSize === 'custom') ? 'block' : 'none';
    dom.modalSheetConfig.classList.add('open');
  }

  function closeSheetConfigModal() {
    dom.modalSheetConfig.classList.remove('open');
  }

  function applySheetConfig() {
    const sheet = getCurrentSheet();
    if (!sheet) return;

    const name = dom.cfgSheetName.value.trim() || sheet.name;
    const presetKey = dom.cfgSheetPreset.value;
    const preset = SHEET_PRESETS[presetKey] || SHEET_PRESETS.custom;

    sheet.name = name;
    sheet.pageSize = presetKey;

    if (presetKey === 'custom') {
      sheet.pageWidth = parseInt(dom.cfgCustomWidth.value, 10) || 1200;
      sheet.pageHeight = parseInt(dom.cfgCustomHeight.value, 10) || 800;
    } else if (preset && !preset.isInfinite) {
      sheet.pageWidth = preset.width;
      sheet.pageHeight = preset.height;
    }

    closeSheetConfigModal();
    renderSheetsBar();
    updatePaperSheetDisplay();
    saveState();
  }

  function setupSheetEvents() {
    if (dom.btnAddSheet) {
      dom.btnAddSheet.addEventListener('click', () => addNewSheet());
    }

    if (dom.btnSheetConfigTrigger) {
      dom.btnSheetConfigTrigger.addEventListener('click', openSheetConfigModal);
    }

    if (dom.cfgSheetPreset) {
      dom.cfgSheetPreset.addEventListener('change', (e) => {
        const val = e.target.value;
        dom.cfgCustomDimsBox.style.display = (val === 'custom') ? 'block' : 'none';
        if (SHEET_PRESETS[val] && !SHEET_PRESETS[val].isInfinite) {
          dom.cfgCustomWidth.value = SHEET_PRESETS[val].width;
          dom.cfgCustomHeight.value = SHEET_PRESETS[val].height;
        }
      });
    }

    if (dom.btnCfgSwapDims) {
      dom.btnCfgSwapDims.addEventListener('click', () => {
        const w = dom.cfgCustomWidth.value;
        const h = dom.cfgCustomHeight.value;
        dom.cfgCustomWidth.value = h;
        dom.cfgCustomHeight.value = w;
      });
    }

    if (dom.btnSaveSheetConfig) {
      dom.btnSaveSheetConfig.addEventListener('click', applySheetConfig);
    }

    if (dom.btnCloseSheetConfig) {
      dom.btnCloseSheetConfig.addEventListener('click', closeSheetConfigModal);
    }

    if (dom.btnCancelSheetConfig) {
      dom.btnCancelSheetConfig.addEventListener('click', closeSheetConfigModal);
    }

    // =========================================================================
    // NAVEGACIÓN Y DESPLAZAMIENTO HORIZONTAL DE SOLAPAS (RUEDA MOUSE / TRACKPAD)
    // =========================================================================
    const scrollContainer = dom.sheetsScrollContainer;
    const sheetsBar = dom.sheetsBar;

    if (scrollContainer) {
      // 1. Desplazamiento horizontal con rueda del mouse o gestos de dos dedos de notebook
      const onSheetsWheel = (e) => {
        // En barras de solapas horizontales, la rueda del mouse suele emitir deltaY (vertical),
        // mientras que un touchpad de notebook puede emitir deltaX o deltaY con dos dedos.
        const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        if (delta !== 0) {
          if (scrollContainer.scrollWidth > scrollContainer.clientWidth) {
            e.preventDefault();
            scrollContainer.scrollLeft += delta;
            updateSheetNavArrows();
          }
        }
      };

      scrollContainer.addEventListener('wheel', onSheetsWheel, { passive: false });
      if (sheetsBar && sheetsBar !== scrollContainer) {
        sheetsBar.addEventListener('wheel', onSheetsWheel, { passive: false });
      }

      // 2. Botones de flecha izquierda / derecha
      if (dom.btnSheetScrollPrev) {
        dom.btnSheetScrollPrev.addEventListener('click', () => {
          scrollContainer.scrollBy({ left: -240, behavior: 'smooth' });
          setTimeout(updateSheetNavArrows, 250);
        });
      }

      if (dom.btnSheetScrollNext) {
        dom.btnSheetScrollNext.addEventListener('click', () => {
          scrollContainer.scrollBy({ left: 240, behavior: 'smooth' });
          setTimeout(updateSheetNavArrows, 250);
        });
      }

      // 3. Listener para actualizar estado de flechas (disabled / enable)
      scrollContainer.addEventListener('scroll', () => {
        updateSheetNavArrows();
      }, { passive: true });

      window.addEventListener('resize', () => {
        updateSheetNavArrows();
      });

      // 4. Arrastre con el botón del mouse (Click & Drag para scrolling fluido)
      let isDraggingTabs = false;
      let startMouseX = 0;
      let initialScrollLeft = 0;
      let hasDragged = false;

      scrollContainer.addEventListener('mousedown', (e) => {
        if (e.target.closest('button') || e.target.closest('.sheet-tab-menu-btn')) return;
        isDraggingTabs = true;
        hasDragged = false;
        startMouseX = e.pageX - scrollContainer.offsetLeft;
        initialScrollLeft = scrollContainer.scrollLeft;
      });

      window.addEventListener('mouseup', () => {
        if (isDraggingTabs) {
          isDraggingTabs = false;
          scrollContainer.classList.remove('is-dragging');
        }
      });

      scrollContainer.addEventListener('mousemove', (e) => {
        if (!isDraggingTabs) return;
        const currentX = e.pageX - scrollContainer.offsetLeft;
        const diff = (currentX - startMouseX) * 1.5;
        if (Math.abs(diff) > 4) {
          hasDragged = true;
          scrollContainer.classList.add('is-dragging');
          scrollContainer.scrollLeft = initialScrollLeft - diff;
          updateSheetNavArrows();
        }
      });
    }
  }

  // ==========================================================================
  // GESTOR MULTI-PROYECTO Y PERSISTENCIA (LOCALSTORAGE Y ARCHIVOS .NETDIAG)
  // ==========================================================================

  // Obtener todos los proyectos guardados
  function getAllProjects() {
    let projects = [];
    try {
      const raw = localStorage.getItem(STORAGE_PROJECTS_KEY);
      if (raw) {
        projects = JSON.parse(raw);
      }
    } catch (e) {
      console.error('Error leyendo proyectos de localStorage:', e);
    }

    // Migración desde versión anterior o inicialización por defecto
    if (!Array.isArray(projects) || projects.length === 0) {
      let legacyData = null;
      try {
        const legacyRaw = localStorage.getItem(STORAGE_LEGACY_KEY);
        if (legacyRaw) legacyData = JSON.parse(legacyRaw);
      } catch (e) {}

      const hasLegacyContent = legacyData && Array.isArray(legacyData.nodes) && legacyData.nodes.length > 0;

      const initialSheet = {
        id: 'sheet_1',
        name: 'Hoja 1',
        pageSize: 'infinite',
        pageWidth: 1123,
        pageHeight: 794,
        bgTheme: 'white',
        nodes: hasLegacyContent ? legacyData.nodes : [],
        connections: hasLegacyContent ? (legacyData.connections || []) : [],
        viewport: hasLegacyContent ? (legacyData.viewport || { x: 80, y: 80, zoom: 1 }) : { x: 80, y: 80, zoom: 1 }
      };

      const initialProject = {
        id: 'proj_' + Date.now(),
        name: hasLegacyContent ? 'Mi Topología de Red' : 'Red Corporativa Principal',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sheets: [initialSheet],
        activeSheetId: 'sheet_1',
        nodes: initialSheet.nodes,
        connections: initialSheet.connections,
        viewport: initialSheet.viewport
      };

      projects = [initialProject];
      saveAllProjects(projects);
      localStorage.setItem(STORAGE_ACTIVE_ID_KEY, initialProject.id);
    } else {
      projects.forEach(p => normalizeProjectSheets(p));
    }

    return projects;
  }

  function saveAllProjects(projects) {
    try {
      localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(projects));
    } catch (e) {
      console.error('Error guardando lista de proyectos en localStorage:', e);
    }
  }

  function getActiveProject() {
    const projects = getAllProjects();
    const activeId = localStorage.getItem(STORAGE_ACTIVE_ID_KEY);
    let current = projects.find(p => p.id === activeId);
    if (!current) {
      current = projects[0];
      localStorage.setItem(STORAGE_ACTIVE_ID_KEY, current.id);
    }
    return current;
  }

  function saveStateImmediately() {
    clearTimeout(saveTimeout);
    const currSheet = getCurrentSheet();
    if (currSheet) {
      currSheet.nodes = state.nodes;
      currSheet.connections = state.connections;
      currSheet.zones = state.zones || [];
      currSheet.viewport = { ...state.viewport };
    }

    const projects = getAllProjects();
    let idx = projects.findIndex(p => p.id === state.currentProjectId);
    if (idx !== -1) {
      projects[idx].name = state.currentProjectName;
      projects[idx].updatedAt = new Date().toISOString();
      projects[idx].sheets = state.sheets;
      projects[idx].activeSheetId = state.activeSheetId;
      projects[idx].nodes = state.nodes;
      projects[idx].connections = state.connections;
      projects[idx].zones = state.zones || [];
      projects[idx].viewport = state.viewport;
    } else {
      projects.push({
        id: state.currentProjectId || ('proj_' + Date.now()),
        name: state.currentProjectName || 'Mi Red',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sheets: state.sheets,
        activeSheetId: state.activeSheetId,
        nodes: state.nodes,
        connections: state.connections,
        zones: state.zones || [],
        viewport: state.viewport
      });
      state.currentProjectId = projects[projects.length - 1].id;
    }
    saveAllProjects(projects);
    localStorage.setItem(STORAGE_ACTIVE_ID_KEY, state.currentProjectId);
  }

  // ==========================================================================
  // HISTORIA Y MOTOR DE DESHACER / REHACER (UNDO / REDO)
  // ==========================================================================
  const MAX_HISTORY_STEPS = 60;
  let historyDebounceTimeout = null;

  function createHistorySnapshot() {
    const currSheet = getCurrentSheet();
    if (currSheet) {
      currSheet.nodes = JSON.parse(JSON.stringify(state.nodes));
      currSheet.connections = JSON.parse(JSON.stringify(state.connections));
      currSheet.zones = JSON.parse(JSON.stringify(state.zones || []));
      currSheet.viewport = { ...state.viewport };
    }
    return JSON.stringify({
      nodes: state.nodes,
      connections: state.connections,
      zones: state.zones || [],
      sheets: state.sheets,
      activeSheetId: state.activeSheetId,
      currentProjectName: state.currentProjectName
    });
  }

  function pushHistoryState(immediate = false) {
    if (!immediate) {
      clearTimeout(historyDebounceTimeout);
      historyDebounceTimeout = setTimeout(() => {
        executePushHistory();
      }, 180);
      return;
    }
    clearTimeout(historyDebounceTimeout);
    executePushHistory();
  }

  function executePushHistory() {
    try {
      const snapshot = createHistorySnapshot();
      if (state.historyIndex >= 0 && state.history[state.historyIndex] === snapshot) {
        return;
      }
      if (state.historyIndex < state.history.length - 1) {
        state.history = state.history.slice(0, state.historyIndex + 1);
      }
      state.history.push(snapshot);
      if (state.history.length > MAX_HISTORY_STEPS) {
        state.history.shift();
      }
      state.historyIndex = state.history.length - 1;
      updateUndoRedoUI();
    } catch (e) {
      console.warn('Error al registrar historia:', e);
    }
  }

  function undo() {
    if (state.historyIndex <= 0) return;
    state.historyIndex--;
    applyHistorySnapshot(state.history[state.historyIndex]);
    updateUndoRedoUI();
  }

  function redo() {
    if (state.historyIndex >= state.history.length - 1) return;
    state.historyIndex++;
    applyHistorySnapshot(state.history[state.historyIndex]);
    updateUndoRedoUI();
  }

  function applyHistorySnapshot(snapshotStr) {
    if (!snapshotStr) return;
    try {
      const data = JSON.parse(snapshotStr);
      state.sheets = data.sheets || [];
      state.activeSheetId = data.activeSheetId || (state.sheets[0] ? state.sheets[0].id : null);
      state.nodes = data.nodes || [];
      state.connections = data.connections || [];
      state.zones = data.zones || [];
      if (data.currentProjectName) {
        state.currentProjectName = data.currentProjectName;
        if (dom.projectTitleInput) {
          dom.projectTitleInput.value = state.currentProjectName;
        }
      }

      // Reconstruir elementos del lienzo
      dom.nodesLayer.innerHTML = '';
      dom.cablesGroup.innerHTML = '';
      dom.labelsLayer.innerHTML = '';
      if (dom.zonesLayer) dom.zonesLayer.innerHTML = '';

      renderZones();
      state.nodes.forEach(node => renderNodeElement(node));
      renderConnections();
      renderSheetsBar();
      updatePaperSheetDisplay();
      deselectAll();

      // Guardar en disco sin empujar nueva historia
      saveState(false);
    } catch (e) {
      console.error('Error al restaurar historia:', e);
    }
  }

  function updateUndoRedoUI() {
    const canUndo = state.historyIndex > 0;
    const canRedo = state.historyIndex < state.history.length - 1;

    if (dom.btnUndo) {
      dom.btnUndo.disabled = !canUndo;
      dom.btnUndo.classList.toggle('disabled', !canUndo);
    }
    if (dom.btnRedo) {
      dom.btnRedo.disabled = !canRedo;
      dom.btnRedo.classList.toggle('disabled', !canRedo);
    }
  }

  let saveTimeout = null;
  function saveState(recordHistory = true, immediateHistory = false) {
    if (recordHistory) {
      pushHistoryState(immediateHistory);
    }

    dom.statusDot.classList.add('saving');
    dom.statusText.textContent = 'Guardando...';
    if (dom.projectSaveIndicator) dom.projectSaveIndicator.textContent = 'Guardando...';

    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      saveStateImmediately();
      dom.statusDot.classList.remove('saving');
      dom.statusText.textContent = 'Guardado';
      if (dom.projectSaveIndicator) dom.projectSaveIndicator.textContent = 'Auto-guardado';
    }, 300);
  }

  function activateProject(project, resetView = true) {
    if (!project) return;
    normalizeProjectSheets(project);

    state.currentProjectId = project.id;
    state.currentProjectName = project.name || 'Sin Título';
    state.sheets = project.sheets;
    state.activeSheetId = project.activeSheetId || project.sheets[0].id;

    if (dom.projectTitleInput) {
      dom.projectTitleInput.value = state.currentProjectName;
    }

    const currentSheet = getCurrentSheet();
    if (currentSheet) {
      loadSheetData(currentSheet, resetView);
    }
    renderSheetsBar();
    updatePaperSheetDisplay();

    // Inicializar historia con el estado inicial del proyecto
    state.history = [createHistorySnapshot()];
    state.historyIndex = 0;
    updateUndoRedoUI();

    localStorage.setItem(STORAGE_ACTIVE_ID_KEY, project.id);
  }

  function switchProject(targetProjectId) {
    // Guardar el proyecto actual antes de cambiar
    saveStateImmediately();
    currentFileHandle = null;
    updateDiskFileBadge(null);

    const projects = getAllProjects();
    const target = projects.find(p => p.id === targetProjectId);
    if (target) {
      activateProject(target, true);
      renderProjectsList();
      closeProjectsModal();
    }
  }

  function createNewProject(name) {
    saveStateImmediately();
    currentFileHandle = null;
    updateDiskFileBadge(null);

    const projName = (name && name.trim()) ? name.trim() : `Nueva Topología ${new Date().toLocaleDateString()}`;
    const initialSheet = {
      id: 'sheet_' + Date.now() + '_1',
      name: 'Hoja 1',
      pageSize: 'infinite',
      pageWidth: 1123,
      pageHeight: 794,
      bgTheme: 'white',
      nodes: [],
      connections: [],
      zones: [],
      viewport: { x: 80, y: 80, zoom: 1 }
    };

    const newProject = {
      id: 'proj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      name: projName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sheets: [initialSheet],
      activeSheetId: initialSheet.id,
      nodes: [],
      connections: [],
      zones: [],
      viewport: { x: 80, y: 80, zoom: 1 }
    };

    const projects = getAllProjects();
    projects.unshift(newProject);
    saveAllProjects(projects);

    activateProject(newProject, true);
    renderProjectsList();
    closeProjectsModal();
  }

  function duplicateProject(projectId) {
    saveStateImmediately();

    const projects = getAllProjects();
    const source = projects.find(p => p.id === projectId);
    if (!source) return;

    const cloned = JSON.parse(JSON.stringify(source));
    cloned.id = 'proj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    cloned.name = `${source.name} (Copia)`;
    cloned.createdAt = new Date().toISOString();
    cloned.updatedAt = new Date().toISOString();

    projects.unshift(cloned);
    saveAllProjects(projects);
    renderProjectsList();
  }

  function deleteProject(projectId) {
    const projects = getAllProjects();
    if (projects.length <= 1) {
      alert('No puedes eliminar el único proyecto. Puedes crear uno nuevo o limpiarlo.');
      return;
    }

    const target = projects.find(p => p.id === projectId);
    if (!confirm(`¿Estás seguro de eliminar el proyecto "${target ? target.name : ''}"?`)) {
      return;
    }

    const filtered = projects.filter(p => p.id !== projectId);
    saveAllProjects(filtered);

    if (state.currentProjectId === projectId) {
      activateProject(filtered[0], true);
    }

    renderProjectsList();
  }

  // ==========================================================================
  // GESTIÓN DE ARCHIVOS EN DISCO (FILE SYSTEM ACCESS API & GUARDADO DIRECTO)
  // ==========================================================================
  let currentFileHandle = null;

  function showToast(message, type = 'info', duration = 3200) {
    let container = document.getElementById('net-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'net-toast-container';
      container.className = 'net-toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `net-toast net-toast-${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'netToastOut 0.25s forwards';
      setTimeout(() => toast.remove(), 250);
    }, duration);
  }

  function updateDiskFileBadge(fileName = null) {
    if (!dom.diskFileBadge) return;
    if (fileName) {
      dom.diskFileBadge.style.display = 'inline-flex';
      if (dom.diskFileName) dom.diskFileName.textContent = fileName;
      dom.diskFileBadge.title = `Archivo en disco: ${fileName}\nPresiona Ctrl+S para guardar y sobrescribir directamente. Haz clic para guardar ahora.`;
    } else {
      dom.diskFileBadge.style.display = 'none';
      if (dom.diskFileName) dom.diskFileName.textContent = '';
    }
  }

  function buildProjectPayload(project = null) {
    const p = project || {
      name: state.currentProjectName,
      sheets: state.sheets,
      activeSheetId: state.activeSheetId,
      nodes: state.nodes,
      connections: state.connections,
      zones: state.zones || [],
      viewport: state.viewport
    };

    return {
      app: 'NetTopologyStudio',
      version: '3.0',
      projectName: p.name || 'Topologia_Red',
      exportDate: new Date().toISOString(),
      sheets: (p.sheets && p.sheets.length > 0) ? p.sheets : [
        {
          id: 'sheet_1',
          name: 'Hoja 1',
          pageSize: 'infinite',
          pageWidth: 1123,
          pageHeight: 794,
          bgTheme: 'white',
          nodes: p.nodes || [],
          connections: p.connections || [],
          zones: p.zones || [],
          viewport: p.viewport || { x: 80, y: 80, zoom: 1 }
        }
      ],
      activeSheetId: p.activeSheetId || (p.sheets && p.sheets[0] ? p.sheets[0].id : 'sheet_1'),
      // Compatibilidad con versiones anteriores
      nodes: p.nodes || [],
      connections: p.connections || [],
      zones: p.zones || [],
      viewport: p.viewport || { x: 80, y: 80, zoom: 1 }
    };
  }

  async function saveProjectToFile(forceSaveAs = false) {
    saveStateImmediately();
    const payload = buildProjectPayload();
    if (!payload) return;

    const safeName = (payload.projectName || 'proyecto').replace(/[^a-zA-Z0-9_-]/g, '_');

    // 1. Usar File System Access API nativa si está disponible (Chrome, Edge, etc.)
    if ('showSaveFilePicker' in window) {
      try {
        let handle = currentFileHandle;

        // Si el usuario eligió "Guardar como..." o aún no vinculó un archivo en disco
        if (forceSaveAs || !handle) {
          const options = {
            suggestedName: `${safeName}.netdiag`,
            types: [
              {
                description: 'Diagrama de Red NetTopology (*.netdiag)',
                accept: { 'application/json': ['.netdiag', '.json'] }
              }
            ]
          };
          handle = await window.showSaveFilePicker(options);
          currentFileHandle = handle;
        }

        // Comprobar y solicitar permisos si hiciera falta
        if (handle.queryPermission) {
          const perm = await handle.queryPermission({ mode: 'readwrite' });
          if (perm !== 'granted') {
            const req = await handle.requestPermission({ mode: 'readwrite' });
            if (req !== 'granted') {
              showToast('No se otorgaron permisos para escribir en el archivo.', 'warning');
              return;
            }
          }
        }

        // Sobrescribir exactamente el archivo sin duplicar
        const writable = await handle.createWritable();
        await writable.write(JSON.stringify(payload, null, 2));
        await writable.close();

        // Actualizar título del proyecto si cambió de nombre de archivo
        const cleanName = handle.name.replace(/\.(netdiag|json)$/i, '');
        if (cleanName && state.currentProjectName !== cleanName) {
          state.currentProjectName = cleanName;
          const curr = getCurrentProject();
          if (curr) curr.name = cleanName;
          if (dom.projectTitleInput) dom.projectTitleInput.value = cleanName;
        }

        updateDiskFileBadge(handle.name);
        showToast(`💾 Guardado y sobrescrito en "${handle.name}"`, 'success');
        return;
      } catch (err) {
        if (err.name === 'AbortError') return; // Usuario canceló diálogo
        console.warn('Error con File System Access API:', err);
      }
    }

    // 2. Fallback estándar para navegadores que no soportan File System Access API (Firefox/Safari)
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeName}.netdiag`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Descargado "${safeName}.netdiag"`, 'info');
  }

  async function openProjectFilePicker() {
    if ('showOpenFilePicker' in window) {
      try {
        const [handle] = await window.showOpenFilePicker({
          types: [
            {
              description: 'Diagramas de Red NetTopology (*.netdiag, *.json)',
              accept: { 'application/json': ['.netdiag', '.json'] }
            }
          ],
          multiple: false
        });

        if (!handle) return;
        const file = await handle.getFile();
        const text = await file.text();
        const data = JSON.parse(text);

        if (!data || (!Array.isArray(data.nodes) && !Array.isArray(data.sheets))) {
          throw new Error('Formato inválido');
        }

        saveStateImmediately();

        const defaultName = file.name.replace(/\.(netdiag|json)$/i, '');
        const importedProject = {
          id: 'proj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          name: data.projectName || defaultName || 'Proyecto Importado',
          createdAt: data.exportDate || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          sheets: data.sheets || [],
          activeSheetId: data.activeSheetId || null,
          nodes: data.nodes || [],
          connections: data.connections || [],
          zones: data.zones || [],
          viewport: data.viewport || { x: 80, y: 80, zoom: 1 }
        };

        normalizeProjectSheets(importedProject);
        const projects = getAllProjects();
        projects.unshift(importedProject);
        saveAllProjects(projects);

        currentFileHandle = handle;
        activateProject(importedProject, true);
        renderProjectsList();
        closeProjectsModal();
        updateDiskFileBadge(handle.name);
        showToast(`📂 Abierto "${handle.name}". Ahora Ctrl+S sobrescribirá directamente este archivo.`, 'success', 4000);
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.warn('Fallback a selector tradicional de archivo:', err);
      }
    }

    // Fallback tradicional
    dom.fileInput.click();
  }

  function exportProjectToFile(project) {
    saveStateImmediately();
    const payload = buildProjectPayload(project);
    const safeName = (payload.projectName || 'proyecto').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeName}_${formatDateForFile(new Date())}.netdiag`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function importProjectFromFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data || (!Array.isArray(data.nodes) && !Array.isArray(data.sheets))) {
          throw new Error('Formato inválido');
        }

        saveStateImmediately();

        const defaultName = file.name.replace(/\.(netdiag|json)$/i, '');
        const importedProject = {
          id: 'proj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          name: data.projectName || defaultName || 'Proyecto Importado',
          createdAt: data.exportDate || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          sheets: data.sheets || [],
          activeSheetId: data.activeSheetId || null,
          nodes: data.nodes || [],
          connections: data.connections || [],
          zones: data.zones || [],
          viewport: data.viewport || { x: 80, y: 80, zoom: 1 }
        };

        normalizeProjectSheets(importedProject);

        const projects = getAllProjects();
        projects.unshift(importedProject);
        saveAllProjects(projects);

        currentFileHandle = null;
        activateProject(importedProject, true);
        renderProjectsList();
        closeProjectsModal();
        updateDiskFileBadge(file.name);
        showToast(`¡Proyecto "${importedProject.name}" importado con éxito!`, 'success');
      } catch (err) {
        alert('El archivo seleccionado no tiene un formato válido de NetTopology (.json / .netdiag).');
      }
    };
    reader.readAsText(file);
  }

  function renderProjectsList() {
    if (!dom.projectsListContainer) return;

    const projects = getAllProjects();
    if (dom.projectsCountBadge) {
      dom.projectsCountBadge.textContent = `${projects.length} ${projects.length === 1 ? 'proyecto' : 'proyectos'}`;
    }

    dom.projectsListContainer.innerHTML = '';

    if (projects.length === 0) {
      dom.projectsListContainer.innerHTML = '<div style="padding: 1.5rem; text-align: center; color: var(--text-muted);">No hay proyectos guardados.</div>';
      return;
    }

    projects.forEach(proj => {
      const isActive = proj.id === state.currentProjectId;
      const nodeCount = (proj.nodes || []).length;
      const connCount = (proj.connections || []).length;
      const updatedDate = new Date(proj.updatedAt || Date.now());
      const dateStr = updatedDate.toLocaleDateString() + ' ' + updatedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const card = document.createElement('div');
      card.className = `project-item-card ${isActive ? 'is-active' : ''}`;

      card.innerHTML = `
        <div class="project-item-info">
          <div class="project-item-name-row">
            <span class="project-item-title" title="${escapeHtml(proj.name)}">${escapeHtml(proj.name)}</span>
            ${isActive ? '<span class="active-pill">Actual</span>' : ''}
          </div>
          <div class="project-item-meta">
            <span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/></svg>
              ${nodeCount} ${nodeCount === 1 ? 'equipo' : 'equipos'}
            </span>
            <span>•</span>
            <span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>
              ${connCount} ${connCount === 1 ? 'cable' : 'cables'}
            </span>
            <span>•</span>
            <span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              ${dateStr}
            </span>
          </div>
        </div>

        <div class="project-item-actions">
          ${!isActive ? `
            <button class="btn btn-primary btn-open-proj" title="Cargar y abrir este proyecto en el lienzo">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><polyline points="12 5 19 12 12 19"/></svg>
              Abrir
            </button>
          ` : `
            <span style="font-size: 0.75rem; color: var(--accent-emerald); font-weight: 600; padding: 0.3rem 0.6rem;">En uso</span>
          `}
          <button class="btn btn-icon-only btn-download-proj" title="Descargar archivo .netdiag a tu PC">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>
          <button class="btn btn-icon-only btn-dup-proj" title="Duplicar proyecto">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
          <button class="btn btn-icon-only btn-del-proj" title="Eliminar proyecto" style="color: var(--accent-rose);">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      `;

      const btnOpen = card.querySelector('.btn-open-proj');
      if (btnOpen) {
        btnOpen.addEventListener('click', () => switchProject(proj.id));
      }

      card.querySelector('.btn-download-proj').addEventListener('click', () => {
        exportProjectToFile(proj);
      });

      card.querySelector('.btn-dup-proj').addEventListener('click', () => {
        duplicateProject(proj.id);
      });

      card.querySelector('.btn-del-proj').addEventListener('click', () => {
        deleteProject(proj.id);
      });

      dom.projectsListContainer.appendChild(card);
    });
  }

  function openProjectsModal() {
    renderProjectsList();
    if (dom.modalProjects) {
      dom.modalProjects.classList.add('open');
      if (dom.inputNewProjectName) {
        dom.inputNewProjectName.value = '';
        dom.inputNewProjectName.focus();
      }
    }
  }

  function closeProjectsModal() {
    if (dom.modalProjects) {
      dom.modalProjects.classList.remove('open');
    }
  }

  function initProjectsManager() {
    const projects = getAllProjects();
    const active = getActiveProject();

    if (active && Array.isArray(active.nodes) && active.nodes.length > 0) {
      activateProject(active, false);
    } else {
      // Si la lista está vacía o el proyecto activo no tiene nodos, cargamos la topología inicial de demostración
      loadDefaultTopology();
      active.nodes = state.nodes;
      active.connections = state.connections;
      active.viewport = state.viewport;
      saveAllProjects(projects);
      activateProject(active, false);
    }
  }

  // Compatibilidad con llamadas previas
  const exportProjectJson = () => exportProjectToFile();
  const openProjectJson = (file) => importProjectFromFile(file);

  // Función para transformar iconos SVG en diagramas técnicos en Blanco y Negro
  function convertToMonochromeSvg(svgString) {
    if (!svgString) return '';
    return svgString
      .replace(/fill="url\(#[^"]+\)"/g, 'fill="#ffffff"')
      .replace(/fill="#1e293b"/g, 'fill="#ffffff"')
      .replace(/fill="#0f172a"/g, 'fill="#ffffff"')
      .replace(/fill="#334155"/g, 'fill="#ffffff"')
      .replace(/fill="#0284c7"/g, 'fill="#000000"')
      .replace(/fill="#047857"/g, 'fill="#000000"')
      .replace(/fill="#6d28d9"/g, 'fill="#000000"')
      .replace(/fill="#8b5cf6"/g, 'fill="#000000"')
      .replace(/fill="#4c1d95"/g, 'fill="#000000"')
      .replace(/fill="#22c55e"/g, 'fill="#000000"')
      .replace(/fill="#38bdf8"/g, 'fill="#000000"')
      .replace(/fill="#fbbf24"/g, 'fill="#000000"')
      .replace(/fill="#f59e0b"/g, 'fill="#ffffff"')
      .replace(/fill="#f472b6"/g, 'fill="#ffffff"')
      .replace(/fill="#cbd5e1"/g, 'fill="#ffffff"')
      .replace(/fill="#e2e8f0"/g, 'fill="#000000"')
      .replace(/fill="#c4b5fd"/g, 'fill="#000000"')
      .replace(/fill="#a78bfa"/g, 'fill="#000000"')
      .replace(/stroke="#38bdf8"/g, 'stroke="#000000"')
      .replace(/stroke="#34d399"/g, 'stroke="#000000"')
      .replace(/stroke="#a78bfa"/g, 'stroke="#000000"')
      .replace(/stroke="#c4b5fd"/g, 'stroke="#000000"')
      .replace(/stroke="#60a5fa"/g, 'stroke="#000000"')
      .replace(/stroke="#f87171"/g, 'stroke="#000000"')
      .replace(/stroke="#818cf8"/g, 'stroke="#000000"')
      .replace(/stroke="#fbbf24"/g, 'stroke="#000000"')
      .replace(/stroke="#f59e0b"/g, 'stroke="#000000"')
      .replace(/stroke="#cbd5e1"/g, 'stroke="#000000"')
      .replace(/stroke="#94a3b8"/g, 'stroke="#000000"')
      .replace(/stroke="#f472b6"/g, 'stroke="#000000"')
      .replace(/stroke="#64748b"/g, 'stroke="#000000"')
      .replace(/stroke="#475569"/g, 'stroke="#000000"')
      .replace(/fill="#f97316"/g, 'fill="#000000"')
      .replace(/fill="#ef4444"/g, 'fill="#000000"')
      .replace(/fill="#e11d48"/g, 'fill="#000000"')
      .replace(/stroke="#f97316"/g, 'stroke="#000000"')
      .replace(/stroke="#fb923c"/g, 'stroke="#000000"')
      .replace(/stroke="#ef4444"/g, 'stroke="#000000"')
      .replace(/stroke="#fca5a5"/g, 'stroke="#000000"')
      .replace(/stroke="#e11d48"/g, 'stroke="#000000"')
      .replace(/stroke="#fb7185"/g, 'stroke="#000000"')
      .replace(/stroke="rgba\([^"]+\)"/g, 'stroke="#000000"')
      .replace(/stroke="#ffffff"/g, 'stroke="#000000"');
  }

  function drawFallbackRoundedRect(ctx, x, y, width, height, radius) {
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
  }

  function drawFallbackRoundedHeader(ctx, x, y, width, height, radius) {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x, y + height);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  // Utilidad para sanitizar texto dentro de nodos SVG
  function escapeXml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  // Cuadro de Rotulación Técnico de Ingeniería (Title Block) en Canvas
  function drawTitleBlockOnCanvas(ctx, canvasW, canvasH, isMono, data = {}) {
    const tbW = 340;
    const tbH = 88;
    const pad = 20;
    const x = canvasW - tbW - pad;
    const y = canvasH - tbH - pad;

    ctx.save();

    // Sombra sutil
    ctx.shadowColor = isMono ? 'rgba(0, 0, 0, 0.12)' : 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;

    // Caja principal
    ctx.fillStyle = isMono ? '#ffffff' : '#0f172a';
    ctx.strokeStyle = isMono ? '#0f172a' : '#38bdf8';
    ctx.lineWidth = 1.5;
    roundRect(ctx, x, y, tbW, tbH, 6, true, true);
    ctx.restore();

    ctx.save();
    // Líneas divisorias internas
    ctx.strokeStyle = isMono ? '#cbd5e1' : 'rgba(56, 189, 248, 0.25)';
    ctx.lineWidth = 1;

    // Línea horizontal 1
    ctx.beginPath();
    ctx.moveTo(x, y + 32);
    ctx.lineTo(x + tbW, y + 32);
    ctx.stroke();

    // Línea horizontal 2
    ctx.beginPath();
    ctx.moveTo(x, y + 60);
    ctx.lineTo(x + tbW, y + 60);
    ctx.stroke();

    // Línea vertical fila 1
    ctx.beginPath();
    ctx.moveTo(x + 210, y);
    ctx.lineTo(x + 210, y + 32);
    ctx.stroke();

    // Línea vertical fila 2
    ctx.beginPath();
    ctx.moveTo(x + 210, y + 32);
    ctx.lineTo(x + 210, y + 60);
    ctx.stroke();

    // Línea vertical fila 3
    ctx.beginPath();
    ctx.moveTo(x + 170, y + 60);
    ctx.lineTo(x + 170, y + tbH);
    ctx.stroke();

    // Estilos de texto
    const textMuted = isMono ? '#64748b' : '#94a3b8';
    const textBold = isMono ? '#0f172a' : '#f8fafc';
    const accentColor = isMono ? '#0f172a' : '#38bdf8';

    // Fila 1: PROYECTO
    ctx.fillStyle = textMuted;
    ctx.font = '600 7.5px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('PROYECTO / DIAGRAMA', x + 10, y + 5);

    ctx.fillStyle = textBold;
    ctx.font = 'bold 11.5px Inter, sans-serif';
    const projName = (data.project || 'Topología de Red').trim();
    ctx.fillText(projName.length > 24 ? projName.substring(0, 22) + '…' : projName, x + 10, y + 16);

    // Fila 1 Derecha: ORGANIZACIÓN / EMPRESA
    ctx.fillStyle = textMuted;
    ctx.font = '600 7.5px Inter, sans-serif';
    ctx.fillText('ORGANIZACIÓN', x + 218, y + 5);

    ctx.fillStyle = accentColor;
    ctx.font = 'bold 11px Inter, sans-serif';
    const compName = (data.company || 'Uinfor').trim();
    ctx.fillText(compName.length > 15 ? compName.substring(0, 14) + '…' : compName, x + 218, y + 16);

    // Fila 2 Izquierda: AUTOR / DISEÑADO POR
    ctx.fillStyle = textMuted;
    ctx.font = '600 7.5px Inter, sans-serif';
    ctx.fillText('DISEÑADO POR', x + 10, y + 36);

    ctx.fillStyle = textBold;
    ctx.font = '600 10.5px Inter, sans-serif';
    const authorName = (data.author || 'Ingeniería de Red').trim();
    ctx.fillText(authorName.length > 25 ? authorName.substring(0, 23) + '…' : authorName, x + 10, y + 46);

    // Fila 2 Derecha: FECHA
    ctx.fillStyle = textMuted;
    ctx.font = '600 7.5px Inter, sans-serif';
    ctx.fillText('FECHA', x + 218, y + 36);

    ctx.fillStyle = textBold;
    ctx.font = '600 10px "JetBrains Mono", monospace';
    ctx.fillText(data.date || new Date().toLocaleDateString('es-ES'), x + 218, y + 46);

    // Fila 3 Izquierda: HOJA
    ctx.fillStyle = textMuted;
    ctx.font = '600 7.5px Inter, sans-serif';
    ctx.fillText('HOJA', x + 10, y + 64);

    ctx.fillStyle = textBold;
    ctx.font = '600 10px Inter, sans-serif';
    ctx.fillText(data.sheet || 'Hoja 1', x + 10, y + 74);

    // Fila 3 Derecha: ESCALA & VERSIÓN
    ctx.fillStyle = textMuted;
    ctx.font = '600 7.5px Inter, sans-serif';
    ctx.fillText('VERSIÓN / ESCALA', x + 178, y + 64);

    ctx.fillStyle = textBold;
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    const scaleStr = (data.scale || '').trim();
    const verStr = (data.version || 'v1.0').trim();
    const verDisplay = scaleStr ? `${verStr} · ${scaleStr}` : verStr;
    ctx.fillText(verDisplay, x + 178, y + 74);

    ctx.restore();
  }

  // ==========================================================================
  // GENERADOR NATIVO DE DOCUMENTOS PDF 1.4 A PARTIR DE CANVAS
  // ==========================================================================
  function downloadCanvasAsPdf(canvas, fileName, sheetPresetKey = 'a4_landscape') {
    // 1. Obtener imagen JPEG de alta resolución desde el canvas (calidad máxima sin artefactos)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.98);
    const base64Data = dataUrl.split(',')[1];
    const binaryString = atob(base64Data);
    const jpegLen = binaryString.length;
    const jpegBytes = new Uint8Array(jpegLen);
    for (let i = 0; i < jpegLen; i++) {
      jpegBytes[i] = binaryString.charCodeAt(i);
    }

    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const aspect = imgWidth / imgHeight;

    // Dimensiones en puntos PDF (1 pt = 1/72 pulgada)
    let pageWidth, pageHeight;
    if (sheetPresetKey === 'a4_portrait') {
      pageWidth = 595.28;
      pageHeight = 841.89;
    } else if (sheetPresetKey === 'a3_landscape') {
      pageWidth = 1190.55;
      pageHeight = 841.89;
    } else if (sheetPresetKey === 'a3_portrait') {
      pageWidth = 841.89;
      pageHeight = 1190.55;
    } else if (sheetPresetKey === 'letter_landscape') {
      pageWidth = 792.0;
      pageHeight = 612.0;
    } else if (sheetPresetKey === 'letter_portrait') {
      pageWidth = 612.0;
      pageHeight = 792.0;
    } else if (sheetPresetKey === 'infinite' || sheetPresetKey === 'custom') {
      if (aspect >= 1) {
        pageWidth = 841.89;
        pageHeight = Math.round((841.89 / aspect) * 100) / 100;
      } else {
        pageHeight = 841.89;
        pageWidth = Math.round((841.89 * aspect) * 100) / 100;
      }
    } else {
      // A4 landscape por defecto
      pageWidth = 841.89;
      pageHeight = 595.28;
    }

    let drawW = pageWidth;
    let drawH = pageHeight;
    let drawX = 0;
    let drawY = 0;

    const pageAspect = pageWidth / pageHeight;
    if (Math.abs(aspect - pageAspect) > 0.02) {
      if (aspect > pageAspect) {
        drawW = pageWidth;
        drawH = pageWidth / aspect;
        drawX = 0;
        drawY = (pageHeight - drawH) / 2;
      } else {
        drawH = pageHeight;
        drawW = pageHeight * aspect;
        drawX = (pageWidth - drawW) / 2;
        drawY = 0;
      }
    }

    const encoder = new TextEncoder();
    const parts = [];
    let curOffset = 0;
    const offsets = [];

    function addPart(strOrBytes) {
      const bytes = (typeof strOrBytes === 'string') ? encoder.encode(strOrBytes) : strOrBytes;
      parts.push(bytes);
      curOffset += bytes.length;
    }

    // Cabecera PDF 1.4
    addPart('%PDF-1.4\n');

    // Obj 1: Catalog
    offsets.push(curOffset);
    addPart('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

    // Obj 2: Pages
    offsets.push(curOffset);
    addPart('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');

    // Obj 3: Page
    offsets.push(curOffset);
    addPart(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth.toFixed(2)} ${pageHeight.toFixed(2)}] /Resources << /XObject << /Im1 4 0 R >> /ProcSet [/PDF /ImageC] >> /Contents 5 0 R >>\nendobj\n`);

    // Obj 4: Imagen XObject
    offsets.push(curOffset);
    addPart(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imgWidth} /Height ${imgHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`);
    addPart(jpegBytes);
    addPart('\nendstream\nendobj\n');

    // Obj 5: Stream de contenido (posiciona y dibuja la imagen en el PDF)
    offsets.push(curOffset);
    const contentCmd = `q\n${drawW.toFixed(2)} 0 0 ${drawH.toFixed(2)} ${drawX.toFixed(2)} ${drawY.toFixed(2)} cm\n/Im1 Do\nQ\n`;
    const contentBytes = encoder.encode(contentCmd);
    addPart(`5 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n`);
    addPart(contentBytes);
    addPart('\nendstream\nendobj\n');

    // Tabla de referencias cruzadas (xref)
    const xrefStart = curOffset;
    let xrefStr = `xref\n0 6\n0000000000 65535 f \n`;
    for (let i = 0; i < offsets.length; i++) {
      xrefStr += offsets[i].toString().padStart(10, '0') + ' 0000 n \n';
    }
    xrefStr += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
    addPart(xrefStr);

    // Crear Blob y disparar descarga
    const pdfBlob = new Blob(parts, { type: 'application/pdf' });
    const pdfUrl = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(pdfUrl), 2000);
  }

  // ==========================================================================
  // GENERADOR NATIVO MULTI-PÁGINA PDF 1.4 (MOSAICO DE PLANOS TÉCNICOS)
  // ==========================================================================
  function downloadMultiPagePdf(slices, fileName, sheetPresetKey = 'a4_landscape') {
    if (!slices || slices.length === 0) return;

    // Dimensiones estándar A4 Landscape en puntos tipográficos (1 pt = 1/72")
    const pageWidth = 841.89;
    const pageHeight = 595.28;
    const totalPages = slices.length;

    const encoder = new TextEncoder();
    const parts = [];
    let curOffset = 0;
    const offsets = [];

    function addPart(strOrBytes) {
      const bytes = (typeof strOrBytes === 'string') ? encoder.encode(strOrBytes) : strOrBytes;
      parts.push(bytes);
      curOffset += bytes.length;
    }

    // Cabecera PDF 1.4
    addPart('%PDF-1.4\n');

    // Obj 1: Catalog
    offsets.push(curOffset);
    addPart('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

    // Obj 2: Pages container
    offsets.push(curOffset);
    const kids = [];
    for (let i = 1; i <= totalPages; i++) {
      kids.push(`${3 * i} 0 R`);
    }
    addPart(`2 0 obj\n<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${totalPages} >>\nendobj\n`);

    // Para cada página:
    // Obj 3*i: Page
    // Obj 3*i+1: Image XObject
    // Obj 3*i+2: Content stream
    for (let i = 1; i <= totalPages; i++) {
      const slice = slices[i - 1];
      const sliceCanvas = slice.canvas;
      const dataUrl = sliceCanvas.toDataURL('image/jpeg', 0.96);
      const base64Data = dataUrl.split(',')[1];
      const binaryString = atob(base64Data);
      const jpegLen = binaryString.length;
      const jpegBytes = new Uint8Array(jpegLen);
      for (let j = 0; j < jpegLen; j++) {
        jpegBytes[j] = binaryString.charCodeAt(j);
      }

      const imgW = sliceCanvas.width;
      const imgH = sliceCanvas.height;

      // Obj 3*i: Page
      offsets.push(curOffset);
      addPart(`${3 * i} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth.toFixed(2)} ${pageHeight.toFixed(2)}] /Resources << /XObject << /Im${i} ${3 * i + 1} 0 R >> /ProcSet [/PDF /ImageC] >> /Contents ${3 * i + 2} 0 R >>\nendobj\n`);

      // Obj 3*i+1: Image XObject
      offsets.push(curOffset);
      addPart(`${3 * i + 1} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`);
      addPart(jpegBytes);
      addPart('\nendstream\nendobj\n');

      // Obj 3*i+2: Stream de contenido (ajustado a pantalla completa de la página A4)
      offsets.push(curOffset);
      const contentCmd = `q\n${pageWidth.toFixed(2)} 0 0 ${pageHeight.toFixed(2)} 0 0 cm\n/Im${i} Do\nQ\n`;
      const contentBytes = encoder.encode(contentCmd);
      addPart(`${3 * i + 2} 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n`);
      addPart(contentBytes);
      addPart('\nendstream\nendobj\n');
    }

    // Tabla de referencias cruzadas (xref)
    const totalObjs = 3 * totalPages + 2;
    const xrefStart = curOffset;
    let xrefStr = `xref\n0 ${totalObjs + 1}\n0000000000 65535 f \n`;
    for (let k = 0; k < offsets.length; k++) {
      xrefStr += offsets[k].toString().padStart(10, '0') + ' 0000 n \n';
    }
    xrefStr += `trailer\n<< /Size ${totalObjs + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
    addPart(xrefStr);

    const pdfBlob = new Blob(parts, { type: 'application/pdf' });
    const pdfUrl = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(pdfUrl), 2000);
  }

  // Cálculo automático del encuadre y cuadrícula multi-página inteligente
  function calculateDiagramBoundingBox() {
    let bMinX = Infinity, bMinY = Infinity, bMaxX = -Infinity, bMaxY = -Infinity;
    if (Array.isArray(state.nodes) && state.nodes.length > 0) {
      state.nodes.forEach(n => {
        bMinX = Math.min(bMinX, n.x);
        bMinY = Math.min(bMinY, n.y);
        const nodeW = n.type === 'transfer' ? 200 : (n.type === 'canal_tension_7' ? 270 : ((n.type === 'canal_tension_5' || n.type === 'canal_tension') ? 210 : (n.encapsulatedLabels ? 120 : 104)));
        bMaxX = Math.max(bMaxX, n.x + nodeW);
        bMaxY = Math.max(bMaxY, n.y + (n.encapsulatedLabels ? 130 : 110));
      });
    }
    if (Array.isArray(state.zones) && state.zones.length > 0) {
      state.zones.forEach(z => {
        bMinX = Math.min(bMinX, z.x);
        bMinY = Math.min(z.y);
        bMaxX = Math.max(bMaxX, z.x + z.width);
        bMaxY = Math.max(bMaxY, z.y + z.height);
      });
    }
    if (!isFinite(bMinX)) {
      bMinX = 0; bMinY = 0; bMaxX = 1123; bMaxY = 794;
    }
    const padding = 80;
    const minX = bMinX - padding;
    const minY = bMinY - padding;
    const width = Math.max((bMaxX + padding) - minX, 200);
    const height = Math.max((bMaxY + padding) - minY, 200);

    const STEP_W = 1000;
    const STEP_H = 680;
    const cols = Math.max(1, Math.ceil(width / STEP_W));
    const rows = Math.max(1, Math.ceil(height / STEP_H));
    const totalPages = cols * rows;

    return { minX, minY, width, height, cols, rows, totalPages, stepW: STEP_W, stepH: STEP_H };
  }

  // Actualizar indicadores y textos del modal de exportación
  function updateExportPagingUI() {
    const inpFormat = document.getElementById('inp-export-format');
    const isPdf = (!inpFormat || inpFormat.value === 'pdf');
    const groupPaging = document.getElementById('group-export-paging');
    if (groupPaging) {
      groupPaging.style.display = isPdf ? 'block' : 'none';
    }

    const grid = calculateDiagramBoundingBox();
    const badgeGrid = document.getElementById('badge-multipage-grid');
    const hintDesc = document.getElementById('hint-multipage-desc');
    const lblMultiTitle = document.getElementById('lbl-paging-multi-title');
    const inpPaging = document.getElementById('inp-export-paging');
    const panelInfo = document.getElementById('panel-multipage-info');
    const lblConfirm = document.getElementById('lbl-confirm-export-text');

    if (badgeGrid) {
      badgeGrid.textContent = `${grid.cols} × ${grid.rows} (${grid.totalPages} Página${grid.totalPages > 1 ? 's' : ''})`;
    }
    if (hintDesc) {
      hintDesc.textContent = grid.totalPages > 1 
        ? `Divide automáticamente el diagrama en ${grid.totalPages} páginas individuales en alta resolución con solapamiento y pie de página técnico para que todo sea legible al imprimir.`
        : 'El diagrama actual cabe completamente en 1 página sin reducir escala.';
    }
    if (lblMultiTitle) {
      lblMultiTitle.textContent = `Mosaico Multi-Página (${grid.totalPages} págs)`;
    }

    const isMulti = inpPaging && inpPaging.value === 'multi';
    if (panelInfo) {
      panelInfo.style.display = isMulti ? 'block' : 'none';
    }

    if (lblConfirm) {
      if (!isPdf) {
        lblConfirm.textContent = `Descargar ${inpFormat ? inpFormat.value.toUpperCase() : 'Archivo'}`;
      } else if (isMulti) {
        lblConfirm.textContent = `Descargar PDF (${grid.totalPages} págs)`;
      } else {
        lblConfirm.textContent = 'Descargar PDF (1 pág)';
      }
    }
  }

  // Exportar el lienzo a documento PDF o imagen (Modo Impresión Blanco y Negro o Modo Oscuro)
  function exportDiagramCanvas(theme = 'monochrome', includeGrid = false, includeTitleBlock = false, titleBlockData = null, exportFormat = 'pdf', exportScale = 3, exportPaging = 'single') {
    if ((!state.nodes || state.nodes.length === 0) && (!Array.isArray(state.zones) || state.zones.length === 0)) {
      alert('El diagrama está vacío. Agrega algunos equipos o zonas antes de exportar.');
      return;
    }

    const isMono = theme === 'monochrome';
    const currSheet = getCurrentSheet();
    const useSheetBounds = currSheet && currSheet.pageSize !== 'infinite' && dom.chkExportSheetBounds && dom.chkExportSheetBounds.checked;

    let minX, minY, width, height;

    if (useSheetBounds) {
      minX = 0;
      minY = 0;
      width = currSheet.pageWidth || 1123;
      height = currSheet.pageHeight || 794;
    } else {
      let bMinX = Infinity, bMinY = Infinity, bMaxX = -Infinity, bMaxY = -Infinity;
      if (Array.isArray(state.nodes)) {
        state.nodes.forEach(n => {
          bMinX = Math.min(bMinX, n.x);
          bMinY = Math.min(bMinY, n.y);
          const nodeW = n.type === 'transfer' ? 200 : (n.type === 'canal_tension_7' ? 270 : ((n.type === 'canal_tension_5' || n.type === 'canal_tension') ? 210 : (n.encapsulatedLabels ? 120 : 104)));
          bMaxX = Math.max(bMaxX, n.x + nodeW);
          bMaxY = Math.max(bMaxY, n.y + (n.encapsulatedLabels ? 130 : 110));
        });
      }

      if (Array.isArray(state.zones)) {
        state.zones.forEach(z => {
          bMinX = Math.min(bMinX, z.x);
          bMinY = Math.min(z.y);
          bMaxX = Math.max(bMaxX, z.x + z.width);
          bMaxY = Math.max(bMaxY, z.y + z.height);
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

    // Factor de escala para resolución ultra alta (2x FHD, 3x 4K UHD, 4x Impresión 300DPI)
    const scaleFactor = Math.max(1, Math.min(Number(exportScale) || 3, 5));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scaleFactor);
    canvas.height = Math.round(height * scaleFactor);

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Configurar escalado y suavizado para que todo el renderizado sea vectorial/nítido
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.scale(scaleFactor, scaleFactor);

    if (isMono) {
      ctx.fillStyle = '#ffffff';
    } else {
      ctx.fillStyle = '#090d16';
    }
    ctx.fillRect(0, 0, width, height);

    // Cuadrícula sutil opcional
    if (includeGrid) {
      ctx.strokeStyle = isMono ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 24) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 24) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }

    // Dibujar Zonas de Red / VLANs en el canvas (debajo de cables y equipos)
    if (Array.isArray(state.zones) && state.zones.length > 0) {
      state.zones.forEach(zone => {
        const zx = zone.x - minX;
        const zy = zone.y - minY;
        const zw = zone.width;
        const zh = zone.height;
        const radius = 12;
        const headerH = 26;
        const palette = ZONE_COLOR_PALETTES[zone.color] || ZONE_COLOR_PALETTES.cyan;

        // 1. Relleno y contorno de la zona
        ctx.save();
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(zx, zy, zw, zh, radius);
        } else {
          drawFallbackRoundedRect(ctx, zx, zy, zw, zh, radius);
        }
        ctx.fillStyle = isMono ? 'rgba(0, 0, 0, 0.02)' : palette.bg;
        ctx.fill();

        ctx.strokeStyle = palette.border;
        ctx.lineWidth = 2;
        ctx.setLineDash([7, 5]);
        ctx.stroke();
        ctx.restore();

        // 2. Encabezado de la zona con nombre de la VLAN
        ctx.save();
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(zx, zy, zw, headerH, [radius, radius, 0, 0]);
        } else {
          drawFallbackRoundedHeader(ctx, zx, zy, zw, headerH, radius);
        }
        ctx.fillStyle = isMono ? '#f1f5f9' : 'rgba(15, 23, 42, 0.9)';
        ctx.fill();

        // Línea separadora inferior del encabezado
        ctx.beginPath();
        ctx.moveTo(zx, zy + headerH);
        ctx.lineTo(zx + zw, zy + headerH);
        ctx.strokeStyle = palette.border;
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        ctx.stroke();

        // Punto indicador de color de la VLAN
        const dotX = zx + 12;
        const dotY = zy + headerH / 2;
        ctx.beginPath();
        ctx.arc(dotX, dotY, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = palette.text;
        ctx.fill();

        // Nombre de la VLAN
        ctx.font = 'bold 11px Inter, -apple-system, sans-serif';
        ctx.fillStyle = isMono ? '#0f172a' : '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const zoneName = (zone.name || 'Zona VLAN').trim();
        ctx.fillText(zoneName, dotX + 9, dotY);

        ctx.restore();
      });
    }

    // Dibujar cables en el canvas
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
      ctx.beginPath();
      if (typeof curve.drawOnCanvas === 'function') {
        curve.drawOnCanvas(ctx, minX, minY);
      } else {
        ctx.moveTo(curve.x1 - minX, curve.y1 - minY);
        ctx.lineTo(curve.x2 - minX, curve.y2 - minY);
      }

      // Trazo de línea del cable (preserva colores en modo imprimible/blanco y negro para escala de grises y claridad técnica)
      ctx.strokeStyle = conn.color || cableConfig.color;
      ctx.lineWidth = Math.max(cableConfig.width || 2.5, 2.2);

      if (conn.cableType === 'serial') {
        ctx.setLineDash([8, 4]);
      } else if (conn.cableType === 'wireless') {
        ctx.setLineDash([3, 3]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Posiciones de badges a lo largo de la curva
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
      // 1. Badge vs Badge
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

      // 2. Badge vs Cajas Reales de Nodos en Export
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

    function renderAllExportBadges() {
      exportBadges.forEach(b => {
        if (b.type === 'port') {
          if (isMono) {
            drawBadge(ctx, b.text, b.x, b.y, '#ffffff', '#0284c7', '#0369a1');
          } else {
            drawBadge(ctx, b.text, b.x, b.y, '#090d16', '#38bdf8', '#38bdf8');
          }
        } else {
          if (isMono) {
            drawBadge(ctx, b.text, b.x, b.y, '#fffbeb', '#d97706', '#b45309', true);
          } else {
            drawBadge(ctx, b.text, b.x, b.y, '#78350f', '#f59e0b', '#f59e0b');
          }
        }
      });
    }

    function finishExport() {
      renderAllExportBadges();
      if (includeTitleBlock && titleBlockData) {
        drawTitleBlockOnCanvas(ctx, width, height, isMono, titleBlockData);
      }

      const dateStr = formatDateForFile(new Date());
      const themeStr = isMono ? 'impresion_bn' : 'digital';

      if (exportFormat === 'pdf' && exportPaging === 'multi') {
        const slices = [];
        const PAGE_W = 1123;
        const PAGE_H = 794;
        const FOOTER_H = 44;
        const STEP_W = 1000;
        const STEP_H = 680;

        const totalCols = Math.max(1, Math.ceil(width / STEP_W));
        const totalRows = Math.max(1, Math.ceil(height / STEP_H));
        const totalPages = totalCols * totalRows;

        let pageNum = 1;
        for (let r = 0; r < totalRows; r++) {
          for (let c = 0; c < totalCols; c++) {
            const sliceCanvas = document.createElement('canvas');
            sliceCanvas.width = Math.round(PAGE_W * scaleFactor);
            sliceCanvas.height = Math.round(PAGE_H * scaleFactor);
            const sCtx = sliceCanvas.getContext('2d', { alpha: false });
            sCtx.imageSmoothingEnabled = true;
            sCtx.imageSmoothingQuality = 'high';
            sCtx.scale(scaleFactor, scaleFactor);

            // Fondo de la página
            sCtx.fillStyle = isMono ? '#ffffff' : '#090d16';
            sCtx.fillRect(0, 0, PAGE_W, PAGE_H);

            // Recorte desde el canvas maestro
            const srcX = Math.round((c * STEP_W) * scaleFactor);
            const srcY = Math.round((r * STEP_H) * scaleFactor);
            const maxAvailW = Math.max(0, canvas.width - srcX);
            const maxAvailH = Math.max(0, canvas.height - srcY);
            const sliceW = Math.min(Math.round(PAGE_W * scaleFactor), maxAvailW);
            const sliceH = Math.min(Math.round((PAGE_H - FOOTER_H) * scaleFactor), maxAvailH);

            if (sliceW > 0 && sliceH > 0) {
              sCtx.drawImage(
                canvas,
                srcX, srcY, sliceW, sliceH,
                0, 0, sliceW / scaleFactor, sliceH / scaleFactor
              );
            }

            // Pie de página técnico para planos de ingeniería
            const footY = PAGE_H - FOOTER_H;
            sCtx.fillStyle = isMono ? '#f8fafc' : '#0f172a';
            sCtx.fillRect(0, footY, PAGE_W, FOOTER_H);
            sCtx.strokeStyle = isMono ? '#cbd5e1' : 'rgba(255, 255, 255, 0.12)';
            sCtx.lineWidth = 1;
            sCtx.beginPath();
            sCtx.moveTo(0, footY);
            sCtx.lineTo(PAGE_W, footY);
            sCtx.stroke();

            // Proyecto y Hoja a la izquierda
            sCtx.font = '600 10.5px Inter, sans-serif';
            sCtx.fillStyle = isMono ? '#0f172a' : '#f8fafc';
            sCtx.textAlign = 'left';
            sCtx.textBaseline = 'middle';
            const projName = (state.projectName || 'Topología de Red').toUpperCase();
            const currSheetName = (currSheet?.name || 'Hoja Principal');
            sCtx.fillText(`${projName}  ·  ${currSheetName}  ·  ESCALA 100%`, 24, footY + FOOTER_H / 2);

            // Cuadrante centrado
            sCtx.textAlign = 'center';
            sCtx.font = 'bold 11px "JetBrains Mono", monospace';
            sCtx.fillStyle = isMono ? '#0284c7' : '#38bdf8';
            sCtx.fillText(`[CUADRANTE: FILA ${r + 1}/${totalRows} · COLUMNA ${c + 1}/${totalCols}]`, PAGE_W / 2, footY + FOOTER_H / 2);

            // Numeración de páginas a la derecha
            sCtx.textAlign = 'right';
            sCtx.font = 'bold 11px Inter, sans-serif';
            sCtx.fillStyle = isMono ? '#0f172a' : '#f8fafc';
            sCtx.fillText(`Página ${pageNum} de ${totalPages}`, PAGE_W - 24, footY + FOOTER_H / 2);

            slices.push({
              canvas: sliceCanvas,
              pageNum,
              totalPages,
              col: c + 1,
              row: r + 1,
              totalCols,
              totalRows
            });

            pageNum++;
          }
        }

        const fileName = `plano_topologia_mosaico_${themeStr}_${dateStr}.pdf`;
        downloadMultiPagePdf(slices, fileName, 'a4_landscape');
      } else if (exportFormat === 'pdf') {
        const fileName = `plano_topologia_${themeStr}_${dateStr}.pdf`;
        const presetKey = currSheet?.pageSize || 'a4_landscape';
        downloadCanvasAsPdf(canvas, fileName, presetKey);
      } else {
        const pngUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = `topologia_${themeStr}_${dateStr}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    }

    // Dibujar nodos con su escala
    let loadedIcons = 0;
    const totalNodes = state.nodes.length;

    if (totalNodes === 0) {
      finishExport();
      return;
    }

    function drawNodeEncapsulatedOnCanvas(ctx, node, isMono, customBoxW, customBoxH) {
      const rawName = (node.customName !== undefined && node.customName !== null ? node.customName : (node.name || '')).trim();
      const displayName = rawName;
      const ipText = (node.ip || '').trim();

      const el = document.getElementById(node.id);
      const iconBox = el ? el.querySelector('.node-icon-box') : null;
      let effectiveW = customBoxW || (iconBox && iconBox.offsetWidth > 0 ? iconBox.offsetWidth : 68);
      let effectiveH = customBoxH || (iconBox && iconBox.offsetHeight > 0 ? iconBox.offsetHeight : (ipText ? 98 : (displayName ? 76 : 68)));

      let nameX = effectiveW / 2;
      let nameY = ipText ? 64 : Math.round((effectiveH + 44) / 2);
      let ipX = effectiveW / 2;
      let ipY = 82;

      if (node.type === 'transfer') {
        nameX = 100; nameY = 58;
        ipX = 100; ipY = 74;
      } else if (node.type === 'canal_tension_7') {
        nameX = 135; nameY = 58;
        ipX = 135; ipY = 74;
      } else if (node.type === 'canal_tension_5' || node.type === 'canal_tension') {
        nameX = 105; nameY = 58;
        ipX = 105; ipY = 74;
      }

      // Nombre del equipo centrado dentro de la tarjeta sin recortar
      if (displayName) {
        ctx.save();
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.fillStyle = isMono ? '#0f172a' : '#f8fafc';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(displayName, nameX, nameY);
        ctx.restore();
      }

      // Recuadro e IP del equipo centrado dentro de la tarjeta
      if (ipText) {
        ctx.save();
        ctx.font = 'bold 9.5px "JetBrains Mono", monospace';
        const ipMetrics = ctx.measureText(ipText);
        const ipW = ipMetrics.width + 14;
        const ipH = 16;

        ctx.fillStyle = isMono ? 'rgba(5, 150, 105, 0.08)' : 'rgba(16, 185, 129, 0.14)';
        ctx.strokeStyle = isMono ? 'rgba(5, 150, 105, 0.35)' : 'rgba(16, 185, 129, 0.35)';
        ctx.lineWidth = 1;
        roundRect(ctx, ipX - ipW / 2, ipY - ipH / 2, ipW, ipH, 4, true, true);

        ctx.fillStyle = isMono ? '#059669' : '#10b981';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ipText, ipX, ipY);
        ctx.restore();
      }
    }

    function drawNodeLabelsOnCanvas(ctx, node, isMono) {
      const displayName = (node.customName || node.name || 'Dispositivo').trim();
      let nameX = 52;
      let nameY = 83;
      let ipX = 52;
      let ipY = 101;

      if (node.type === 'transfer') {
        nameX = 100;
        nameY = 68;
        ipX = 100;
        ipY = 86;
      } else if (node.type === 'canal_tension_7') {
        nameX = 135;
        nameY = 68;
        ipX = 135;
        ipY = 86;
      } else if (node.type === 'canal_tension_5' || node.type === 'canal_tension') {
        nameX = 105;
        nameY = 68;
        ipX = 105;
        ipY = 86;
      }

      // 1. Recuadro y Nombre del equipo
      ctx.font = 'bold 12px Inter, sans-serif';
      const nameMetrics = ctx.measureText(displayName);
      const namePadX = 8;
      const nameW = Math.min(Math.max(nameMetrics.width + namePadX * 2, 54), 160);
      const nameH = 19;

      // Recuadro sólido del nombre que tapa completamente cualquier cable de fondo
      ctx.save();
      ctx.shadowColor = isMono ? 'rgba(0, 0, 0, 0.1)' : 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 2;
      ctx.fillStyle = isMono ? '#ffffff' : '#0f172a';
      ctx.strokeStyle = isMono ? '#0f172a' : 'rgba(255, 255, 255, 0.16)';
      ctx.lineWidth = isMono ? 1.5 : 1;
      roundRect(ctx, nameX - nameW / 2, nameY - nameH / 2, nameW, nameH, 6, true, true);
      ctx.restore();

      // Texto del nombre recortado dentro del recuadro
      ctx.save();
      ctx.beginPath();
      roundRect(ctx, nameX - nameW / 2, nameY - nameH / 2, nameW, nameH, 6, false, false);
      ctx.clip();
      ctx.fillStyle = isMono ? '#000000' : '#f8fafc';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.fillText(displayName, nameX, nameY);
      ctx.restore();

      // 2. Recuadro e IP del equipo (si está configurada)
      const ipText = (node.ip || '').trim();
      if (ipText) {
        ctx.font = 'bold 10px "JetBrains Mono", monospace';
        const ipMetrics = ctx.measureText(ipText);
        const ipPadX = 6;
        const ipW = Math.max(ipMetrics.width + ipPadX * 2, 46);
        const ipH = 16;

        // Recuadro sólido de la IP que tapa cualquier cable de fondo
        ctx.save();
        ctx.shadowColor = isMono ? 'rgba(0, 0, 0, 0.1)' : 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetY = 1;
        ctx.fillStyle = isMono ? '#ffffff' : '#09131e';
        ctx.strokeStyle = isMono ? '#059669' : 'rgba(16, 185, 129, 0.4)';
        ctx.lineWidth = 1;
        roundRect(ctx, ipX - ipW / 2, ipY - ipH / 2, ipW, ipH, 4, true, true);
        ctx.restore();

        // Texto de la IP
        ctx.fillStyle = isMono ? '#059669' : '#10b981';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = isMono ? 'bold 10px "JetBrains Mono", monospace' : '10px "JetBrains Mono", monospace';
        ctx.fillText(ipText, ipX, ipY);
      }
    }

    state.nodes.forEach(node => {
      const nx = node.x - minX;
      const ny = node.y - minY;
      const scale = node.scale || 1;

      if (node.type === 'text_badge') {
        const textVal = (node.ip || node.name || '192.168.1.0/24').trim();
        const geo = getNodeGeometry(node);
        const w = geo.hw * 2 / scale;
        const h = geo.hh * 2 / scale;
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

        ctx.save();
        ctx.translate(nx + (w * scale) / 2, ny + (h * scale) / 2);
        ctx.scale(scale, scale);
        ctx.translate(-w / 2, -h / 2);

        ctx.shadowColor = isMono ? 'rgba(0, 0, 0, 0.08)' : 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetY = 1;
        ctx.fillStyle = isMono ? '#ffffff' : '#09131e';
        ctx.strokeStyle = strokeCol;
        ctx.lineWidth = 1;
        roundRect(ctx, 0, 0, w, h, 6, true, true);

        ctx.font = 'bold 11px "JetBrains Mono", monospace';
        ctx.fillStyle = textCol;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(textVal, w / 2, h / 2);
        ctx.restore();

        loadedIcons++;
        if (loadedIcons === totalNodes) {
          finishExport();
        }
        return;
      }

      let origX = 52, origY = 40;
      let boxX = 18, boxY = 0, boxW = 68, boxH = 68, boxRx = 12;
      let imgX = 27, imgY = 9, imgW = 50, imgH = 50;

      if (node.encapsulatedLabels) {
        if (node.type === 'transfer') {
          origX = 100; origY = 44;
          boxX = 4; boxY = 2; boxW = 192; boxH = 86; boxRx = 10;
          imgX = 12; imgY = 6; imgW = 176; imgH = 42;
        } else if (node.type === 'canal_tension_7') {
          origX = 135; origY = 44;
          boxX = 4; boxY = 2; boxW = 262; boxH = 86; boxRx = 10;
          imgX = 12; imgY = 6; imgW = 246; imgH = 42;
        } else if (node.type === 'canal_tension_5' || node.type === 'canal_tension') {
          origX = 105; origY = 44;
          boxX = 4; boxY = 2; boxW = 202; boxH = 86; boxRx = 10;
          imgX = 12; imgY = 6; imgW = 186; imgH = 42;
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
          imgW = 44; imgH = 44;
          imgX = (boxW - imgW) / 2; imgY = 7;
        }
      } else if (node.type === 'transfer') {
        origX = 100; origY = 32;
        boxX = 8; boxY = 6; boxW = 184; boxH = 52; boxRx = 8;
        imgX = 12; imgY = 9; imgW = 176; imgH = 46;
      } else if (node.type === 'canal_tension_7') {
        origX = 135; origY = 32;
        boxX = 8; boxY = 6; boxW = 254; boxH = 52; boxRx = 8;
        imgX = 12; imgY = 9; imgW = 246; imgH = 46;
      } else if (node.type === 'canal_tension_5' || node.type === 'canal_tension') {
        origX = 105; origY = 32;
        boxX = 8; boxY = 6; boxW = 194; boxH = 52; boxRx = 8;
        imgX = 12; imgY = 9; imgW = 186; imgH = 46;
      }

      // Paso 1: Dibujar caja del icono y recuadros de nombre e IP de inmediato
      ctx.save();
      ctx.translate(nx + origX, ny + origY);
      ctx.scale(scale, scale);
      ctx.translate(-origX, -origY);

      // Sombra y caja del icono
      ctx.save();
      ctx.shadowColor = isMono ? 'rgba(0, 0, 0, 0.08)' : 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 3;
      ctx.fillStyle = isMono ? '#ffffff' : '#1e293b';
      ctx.strokeStyle = isMono ? '#0f172a' : 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = isMono ? 1.8 : 1.5;
      roundRect(ctx, boxX, boxY, boxW, boxH, boxRx, true, true);
      ctx.restore();

      // Recuadros de nombre e IP
      if (node.encapsulatedLabels) {
        drawNodeEncapsulatedOnCanvas(ctx, node, isMono, boxW, boxH);
      } else {
        drawNodeLabelsOnCanvas(ctx, node, isMono);
      }

      ctx.restore();

      // Paso 2: Icono SVG renderizado como imagen en alta resolución manteniendo colores auténticos para escala de grises y nitidez
      let svgString = typeof getDeviceIcon === 'function' ? getDeviceIcon(node.type, isMono || state.theme === 'light') : (DEVICE_ICONS[node.type] || DEVICE_ICONS.pc);

      // Asegurar que el navegador rasterice el vector SVG con máxima nitidez para el DPI del canvas
      const targetW = Math.round(imgW * scaleFactor * 2);
      const targetH = Math.round(imgH * scaleFactor * 2);
      svgString = svgString.replace(/<svg\b([^>]*)>/i, (match, attrs) => {
        const clean = attrs.replace(/\bwidth="[^"]*"/gi, '').replace(/\bheight="[^"]*"/gi, '');
        return `<svg${clean} width="${targetW}" height="${targetH}">`;
      });

      const img = new Image();
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      const checkFinished = () => {
        URL.revokeObjectURL(url);
        loadedIcons++;
        if (loadedIcons === totalNodes) {
          finishExport();
        }
      };

      img.onload = () => {
        ctx.save();
        ctx.translate(nx + origX, ny + origY);
        ctx.scale(scale, scale);
        ctx.translate(-origX, -origY);

        ctx.drawImage(img, imgX, imgY, imgW, imgH);

        // Volver a dibujar los recuadros de texto para máxima nitidez sobre el icono
        if (node.encapsulatedLabels) {
          drawNodeEncapsulatedOnCanvas(ctx, node, isMono, boxW, boxH);
        } else {
          drawNodeLabelsOnCanvas(ctx, node, isMono);
        }

        ctx.restore();
        checkFinished();
      };

      img.onerror = () => {
        checkFinished();
      };

      img.src = url;
    });
  }

  function exportDiagramPdf(theme = 'monochrome', includeGrid = false, includeTitleBlock = false, titleBlockData = null, exportScale = 3, exportPaging = 'single') {
    exportDiagramCanvas(theme, includeGrid, includeTitleBlock, titleBlockData, 'pdf', exportScale, exportPaging);
  }

  function exportDiagramPng(theme = 'monochrome', includeGrid = false, includeTitleBlock = false, titleBlockData = null, exportScale = 3) {
    exportDiagramCanvas(theme, includeGrid, includeTitleBlock, titleBlockData, 'png', exportScale);
  }

  // ==========================================================================
  // EXPORTACIÓN VECTORIAL NATIVA A FORMATO SVG (.svg)
  // ==========================================================================
  function exportDiagramSvg(theme = 'monochrome', includeGrid = false, includeTitleBlock = false, titleBlockData = null) {
    if ((!state.nodes || state.nodes.length === 0) && (!Array.isArray(state.zones) || state.zones.length === 0)) {
      alert('El diagrama está vacío. Agrega algunos equipos o zonas antes de exportar.');
      return;
    }

    const isMono = theme === 'monochrome';
    const currSheet = getCurrentSheet();
    const useSheetBounds = currSheet && currSheet.pageSize !== 'infinite' && dom.chkExportSheetBounds && dom.chkExportSheetBounds.checked;

    let minX, minY, width, height;

    if (useSheetBounds) {
      minX = 0;
      minY = 0;
      width = currSheet.pageWidth || 1123;
      height = currSheet.pageHeight || 794;
    } else {
      let bMinX = Infinity, bMinY = Infinity, bMaxX = -Infinity, bMaxY = -Infinity;
      if (Array.isArray(state.nodes)) {
        state.nodes.forEach(n => {
          bMinX = Math.min(bMinX, n.x);
          bMinY = Math.min(bMinY, n.y);
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
        const w = geo.hw * 2 / scale;
        const h = geo.hh * 2 / scale;
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

    // 5. Cuadro de Rotulación Técnico de Ingeniería (Title Block)
    if (includeTitleBlock && titleBlockData) {
      const tbW = 340;
      const tbH = 88;
      const pad = 20;
      const tbX = width - tbW - pad;
      const tbY = height - tbH - pad;

      const tbBg = isMono ? '#ffffff' : '#0f172a';
      const tbBorder = isMono ? '#0f172a' : '#38bdf8';
      const divStroke = isMono ? '#cbd5e1' : 'rgba(56, 189, 248, 0.25)';
      const textMuted = isMono ? '#64748b' : '#94a3b8';
      const textBold = isMono ? '#0f172a' : '#f8fafc';
      const accentColor = isMono ? '#0f172a' : '#38bdf8';

      const pName = escapeXml(titleBlockData.project || 'Topología de Red');
      const cName = escapeXml(titleBlockData.company || 'Uinfor');
      const aName = escapeXml(titleBlockData.author || 'Ingeniería de Red');
      const dDate = escapeXml(titleBlockData.date || new Date().toLocaleDateString('es-ES'));
      const sSheet = escapeXml(titleBlockData.sheet || 'Hoja 1');
      const scaleText = (titleBlockData.scale || '').trim();
      const verText = (titleBlockData.version || 'v1.0').trim();
      const vVer = escapeXml(scaleText ? `${verText} · ${scaleText}` : verText);

      svgParts.push(`<!-- Cuadro de Rotulación Técnico de Ingeniería (Title Block) -->`);
      svgParts.push(`<g class="engineering-title-block" filter="url(#svg-node-shadow)">`);
      svgParts.push(`  <rect x="${tbX}" y="${tbY}" width="${tbW}" height="${tbH}" rx="6" fill="${tbBg}" stroke="${tbBorder}" stroke-width="1.5"/>`);
      svgParts.push(`  <line x1="${tbX}" y1="${tbY + 32}" x2="${tbX + tbW}" y2="${tbY + 32}" stroke="${divStroke}" stroke-width="1"/>`);
      svgParts.push(`  <line x1="${tbX}" y1="${tbY + 60}" x2="${tbX + tbW}" y2="${tbY + 60}" stroke="${divStroke}" stroke-width="1"/>`);
      svgParts.push(`  <line x1="${tbX + 210}" y1="${tbY}" x2="${tbX + 210}" y2="${tbY + 32}" stroke="${divStroke}" stroke-width="1"/>`);
      svgParts.push(`  <line x1="${tbX + 210}" y1="${tbY + 32}" x2="${tbX + 210}" y2="${tbY + 60}" stroke="${divStroke}" stroke-width="1"/>`);
      svgParts.push(`  <line x1="${tbX + 170}" y1="${tbY + 60}" x2="${tbX + 170}" y2="${tbY + tbH}" stroke="${divStroke}" stroke-width="1"/>`);

      svgParts.push(`  <text x="${tbX + 10}" y="${tbY + 11}" font-family="Inter, -apple-system, sans-serif" font-size="7.5px" font-weight="600" fill="${textMuted}">PROYECTO / DIAGRAMA</text>`);
      svgParts.push(`  <text x="${tbX + 10}" y="${tbY + 24}" font-family="Inter, -apple-system, sans-serif" font-size="11.5px" font-weight="bold" fill="${textBold}">${pName}</text>`);

      svgParts.push(`  <text x="${tbX + 218}" y="${tbY + 11}" font-family="Inter, -apple-system, sans-serif" font-size="7.5px" font-weight="600" fill="${textMuted}">ORGANIZACIÓN</text>`);
      svgParts.push(`  <text x="${tbX + 218}" y="${tbY + 24}" font-family="Inter, -apple-system, sans-serif" font-size="11px" font-weight="bold" fill="${accentColor}">${cName}</text>`);

      svgParts.push(`  <text x="${tbX + 10}" y="${tbY + 42}" font-family="Inter, -apple-system, sans-serif" font-size="7.5px" font-weight="600" fill="${textMuted}">DISEÑADO POR</text>`);
      svgParts.push(`  <text x="${tbX + 10}" y="${tbY + 54}" font-family="Inter, -apple-system, sans-serif" font-size="10.5px" font-weight="600" fill="${textBold}">${aName}</text>`);

      svgParts.push(`  <text x="${tbX + 218}" y="${tbY + 42}" font-family="Inter, -apple-system, sans-serif" font-size="7.5px" font-weight="600" fill="${textMuted}">FECHA</text>`);
      svgParts.push(`  <text x="${tbX + 218}" y="${tbY + 54}" font-family="JetBrains Mono, monospace" font-size="10px" font-weight="600" fill="${textBold}">${dDate}</text>`);

      svgParts.push(`  <text x="${tbX + 10}" y="${tbY + 70}" font-family="Inter, -apple-system, sans-serif" font-size="7.5px" font-weight="600" fill="${textMuted}">HOJA</text>`);
      svgParts.push(`  <text x="${tbX + 10}" y="${tbY + 81}" font-family="Inter, -apple-system, sans-serif" font-size="10px" font-weight="600" fill="${textBold}">${sSheet}</text>`);

      svgParts.push(`  <text x="${tbX + 178}" y="${tbY + 70}" font-family="Inter, -apple-system, sans-serif" font-size="7.5px" font-weight="600" fill="${textMuted}">VERSIÓN / ESCALA</text>`);
      svgParts.push(`  <text x="${tbX + 178}" y="${tbY + 81}" font-family="JetBrains Mono, monospace" font-size="10px" font-weight="bold" fill="${textBold}">${vVer}</text>`);
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

  function drawBadge(ctx, text, x, y, bgColor, textColor, borderColor, isDashed = false) {
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    const textWidth = ctx.measureText(text).width;
    const padX = 6;
    const padY = 3;
    const w = textWidth + padX * 2;
    const h = 16;

    ctx.fillStyle = bgColor;
    ctx.strokeStyle = borderColor || textColor;
    ctx.lineWidth = 1;
    if (isDashed) {
      ctx.setLineDash([3, 2]);
    } else {
      ctx.setLineDash([]);
    }
    roundRect(ctx, x - w / 2, y - h / 2, w, h, 4, true, true);
    ctx.setLineDash([]);

    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y + 1);
  }

  function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
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

  // ==========================================================================
  // TOPOLOGÍA DE EJEMPLO REALISTA
  // ==========================================================================
  function loadDefaultTopology() {
    state.nodes = [];
    state.connections = [];

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
  function snapAllNodesAndConnectionsToGrid() {
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

  // ==========================================================================
  // GUÍAS MAGNÉTICAS INTELIGENTES (SMART GUIDES)
  // ==========================================================================
  function drawAlignmentGuides(primaryNode) {
    if (!state.smartGuidesEnabled || !dom.alignmentGuidesOverlay) return;
    dom.alignmentGuidesOverlay.innerHTML = '';

    const snapDist = 6;
    const stationaryNodes = state.nodes.filter(n => !state.selectedNodeIds.has(n.id));
    if (stationaryNodes.length === 0) return;

    const pw = 104;
    const ph = 70;
    const pcx = primaryNode.x + pw / 2;
    const pcy = primaryNode.y + ph / 2;

    let snappedX = primaryNode.x;
    let snappedY = primaryNode.y;
    let guideX = null;
    let guideY = null;

    for (const other of stationaryNodes) {
      const ow = 104;
      const oh = 70;
      const ocx = other.x + ow / 2;
      const ocy = other.y + oh / 2;

      // Alineación Horizontal en Centros Y o bordes Y
      if (Math.abs(pcy - ocy) <= snapDist) {
        snappedY = ocy - ph / 2;
        guideY = ocy;
      } else if (Math.abs(primaryNode.y - other.y) <= snapDist) {
        snappedY = other.y;
        guideY = other.y;
      }

      // Alineación Vertical en Centros X o bordes X
      if (Math.abs(pcx - ocx) <= snapDist) {
        snappedX = ocx - pw / 2;
        guideX = ocx;
      } else if (Math.abs(primaryNode.x - other.x) <= snapDist) {
        snappedX = other.x;
        guideX = other.x;
      }
    }

    primaryNode.x = snappedX;
    primaryNode.y = snappedY;

    if (guideY !== null) {
      const lineY = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      lineY.setAttribute('x1', '-5000');
      lineY.setAttribute('y1', guideY);
      lineY.setAttribute('x2', '10000');
      lineY.setAttribute('y2', guideY);
      lineY.setAttribute('class', 'alignment-guide-line');
      dom.alignmentGuidesOverlay.appendChild(lineY);
    }

    if (guideX !== null) {
      const lineX = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      lineX.setAttribute('x1', guideX);
      lineX.setAttribute('y1', '-5000');
      lineX.setAttribute('x2', guideX);
      lineX.setAttribute('y2', '10000');
      lineX.setAttribute('class', 'alignment-guide-line');
      dom.alignmentGuidesOverlay.appendChild(lineX);
    }
  }

  function clearAlignmentGuides() {
    if (dom.alignmentGuidesOverlay) {
      dom.alignmentGuidesOverlay.innerHTML = '';
    }
  }

  // ==========================================================================
  // GESTIÓN DEL MINIMAPA INTERACTIVO (RADAR)
  // ==========================================================================
  let isMinimapDragging = false;
  let minimapBoundsCache = null;

  function initMinimap() {
    if (!dom.canvasMinimap || !dom.minimapCanvas) return;

    try {
      const savedMinimap = localStorage.getItem('nettopology_minimap_visible');
      if (savedMinimap !== null) {
        state.minimapVisible = (savedMinimap === 'true');
      }
    } catch (e) {}

    dom.canvasMinimap.classList.toggle('is-hidden', !state.minimapVisible);
    if (dom.checkViewMinimap) {
      dom.checkViewMinimap.textContent = state.minimapVisible ? '✓' : '';
    }

    if (dom.minimapHeaderToggle) {
      dom.minimapHeaderToggle.addEventListener('click', (e) => {
        if (e.target.closest('#btn-minimize-minimap')) return;
        toggleMinimapCollapse();
      });
    }

    if (dom.btnMinimizeMinimap) {
      dom.btnMinimizeMinimap.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMinimapCollapse();
      });
    }

    const handleMinimapPointer = (e) => {
      const rect = dom.minimapCanvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      panCanvasFromMinimapCoord(clickX, clickY);
    };

    dom.minimapCanvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      isMinimapDragging = true;
      handleMinimapPointer(e);
    });

    if (dom.minimapViewport) {
      dom.minimapViewport.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        isMinimapDragging = true;
      });
    }

    window.addEventListener('mousemove', (e) => {
      if (!isMinimapDragging) return;
      handleMinimapPointer(e);
    });

    window.addEventListener('mouseup', () => {
      if (isMinimapDragging) {
        isMinimapDragging = false;
      }
    });

    updateMinimap();
  }

  function toggleMinimapCollapse() {
    if (!dom.canvasMinimap) return;
    dom.canvasMinimap.classList.toggle('is-minimized');
    if (!dom.canvasMinimap.classList.contains('is-minimized')) {
      updateMinimap();
    }
  }

  function toggleMinimapVisibility(forceState) {
    state.minimapVisible = (typeof forceState === 'boolean') ? forceState : !state.minimapVisible;
    if (dom.canvasMinimap) {
      dom.canvasMinimap.classList.toggle('is-hidden', !state.minimapVisible);
    }
    if (dom.checkViewMinimap) {
      dom.checkViewMinimap.textContent = state.minimapVisible ? '✓' : '';
    }
    try {
      localStorage.setItem('nettopology_minimap_visible', state.minimapVisible ? 'true' : 'false');
    } catch (e) {}
    if (state.minimapVisible) {
      updateMinimap();
    }
  }

  let minimapRafId = null;
  function updateMinimap() {
    if (!state.minimapVisible || !dom.minimapCanvas || !dom.viewport) return;
    if (minimapRafId) return;
    minimapRafId = requestAnimationFrame(() => {
      minimapRafId = null;
      renderMinimapDirect();
    });
  }

  function renderMinimapDirect() {
    if (!state.minimapVisible || !dom.minimapCanvas || !dom.viewport) return;
    const ctx = dom.minimapCanvas.getContext('2d');
    if (!ctx) return;

    const mw = dom.minimapCanvas.width;
    const mh = dom.minimapCanvas.height;
    ctx.clearRect(0, 0, mw, mh);

    const vpW = dom.viewport.clientWidth || 800;
    const vpH = dom.viewport.clientHeight || 600;

    const viewWorldX1 = -state.viewport.x / state.viewport.zoom;
    const viewWorldY1 = -state.viewport.y / state.viewport.zoom;
    const viewWorldX2 = viewWorldX1 + vpW / state.viewport.zoom;
    const viewWorldY2 = viewWorldY1 + vpH / state.viewport.zoom;

    let minX = Math.min(viewWorldX1, 0);
    let minY = Math.min(viewWorldY1, 0);
    let maxX = Math.max(viewWorldX2, 1200);
    let maxY = Math.max(viewWorldY2, 800);

    const currSheet = getCurrentSheet();
    if (currSheet && currSheet.pageSize !== 'infinite') {
      maxX = Math.max(maxX, currSheet.pageWidth);
      maxY = Math.max(maxY, currSheet.pageHeight);
    }

    const nodeMap = new Map();
    state.nodes.forEach(n => {
      nodeMap.set(n.id, n);
      minX = Math.min(minX, n.x - 30);
      minY = Math.min(minY, n.y - 30);
      maxX = Math.max(maxX, n.x + 130);
      maxY = Math.max(maxY, n.y + 110);
    });

    const padding = 100;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    const worldWidth = Math.max(maxX - minX, 100);
    const worldHeight = Math.max(maxY - minY, 100);

    const scale = Math.min(mw / worldWidth, mh / worldHeight);
    const offsetX = (mw - worldWidth * scale) / 2 - minX * scale;
    const offsetY = (mh - worldHeight * scale) / 2 - minY * scale;

    minimapBoundsCache = { minX, minY, maxX, maxY, scale, offsetX, offsetY };

    const isLight = document.body.getAttribute('data-theme') === 'light';

    // 1. Dibujar hoja si no es infinita
    if (currSheet && currSheet.pageSize !== 'infinite') {
      const sx = currSheet.pageWidth * scale;
      const sy = currSheet.pageHeight * scale;
      ctx.fillStyle = isLight ? '#ffffff' : '#0b1120';
      ctx.strokeStyle = isLight ? '#cbd5e1' : 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 1;
      ctx.fillRect(offsetX, offsetY, sx, sy);
      ctx.strokeRect(offsetX, offsetY, sx, sy);
    }

    // 2. Dibujar conexiones (cables)
    ctx.lineWidth = 1;
    state.connections.forEach(conn => {
      const nodeA = nodeMap.get(conn.fromNodeId);
      const nodeB = nodeMap.get(conn.toNodeId);
      if (!nodeA || !nodeB) return;

      const ax = (nodeA.x + 52) * scale + offsetX;
      const ay = (nodeA.y + 35) * scale + offsetY;
      const bx = (nodeB.x + 52) * scale + offsetX;
      const by = (nodeB.y + 35) * scale + offsetY;

      ctx.beginPath();
      ctx.moveTo(ax, ay);
      if (Array.isArray(conn.waypoints) && conn.waypoints.length > 0) {
        conn.waypoints.forEach(wp => {
          ctx.lineTo(wp.x * scale + offsetX, wp.y * scale + offsetY);
        });
      }
      ctx.lineTo(bx, by);
      ctx.strokeStyle = conn.cableType === 'fiber' ? (isLight ? '#d97706' : '#f59e0b') :
                        conn.cableType === 'power' ? (isLight ? '#dc2626' : '#ef4444') :
                        (isLight ? '#0284c7' : '#38bdf8');
      ctx.stroke();
    });

    // 3. Dibujar nodos
    state.nodes.forEach(n => {
      const nx = n.x * scale + offsetX;
      const ny = n.y * scale + offsetY;
      const nw = Math.max(104 * scale, 4);
      const nh = Math.max(70 * scale, 4);

      ctx.fillStyle = isLight ? '#0284c7' : '#38bdf8';
      if (['router', 'router_sophos', 'router_fortinet', 'firewall_fortinet', 'firewall_huawei', 'firewall_cisco'].includes(n.type)) {
        ctx.fillStyle = isLight ? '#d97706' : '#f59e0b';
      } else if (['ups', 'termica', 'pdu', 'canal_tension', 'canal_tension_5', 'canal_tension_7', 'transfer'].includes(n.type)) {
        ctx.fillStyle = isLight ? '#dc2626' : '#ef4444';
      } else if (['server', 'servidor_rack', 'servidor_torre'].includes(n.type)) {
        ctx.fillStyle = isLight ? '#059669' : '#10b981';
      }
      ctx.fillRect(nx, ny, nw, nh);
    });

    // 4. Posicionar recuadro del visor (viewport)
    if (dom.minimapViewport) {
      const vx = viewWorldX1 * scale + offsetX;
      const vy = viewWorldY1 * scale + offsetY;
      const vw = (vpW / state.viewport.zoom) * scale;
      const vh = (vpH / state.viewport.zoom) * scale;

      dom.minimapViewport.style.left = `${Math.max(0, Math.min(mw - 6, vx))}px`;
      dom.minimapViewport.style.top = `${Math.max(0, Math.min(mh - 6, vy))}px`;
      dom.minimapViewport.style.width = `${Math.max(6, Math.min(mw, vw))}px`;
      dom.minimapViewport.style.height = `${Math.max(6, Math.min(mh, vh))}px`;
    }
  }

  function panCanvasFromMinimapCoord(clickX, clickY) {
    if (!minimapBoundsCache || !dom.viewport) return;
    const { scale, offsetX, offsetY } = minimapBoundsCache;
    const targetWorldX = (clickX - offsetX) / scale;
    const targetWorldY = (clickY - offsetY) / scale;

    const vpW = dom.viewport.clientWidth || 800;
    const vpH = dom.viewport.clientHeight || 600;

    state.viewport.x = vpW / 2 - targetWorldX * state.viewport.zoom;
    state.viewport.y = vpH / 2 - targetWorldY * state.viewport.zoom;

    updateViewportTransform();
  }

  // ==========================================================================
  // MENÚ VISTA Y CONTROLES VISUALES
  // ==========================================================================
  function initViewMenu() {
    try {
      const savedGrid = localStorage.getItem('nettopology_grid_visible');
      if (savedGrid !== null) {
        state.gridVisible = (savedGrid === 'true');
      }
      const savedGuides = localStorage.getItem('nettopology_smart_guides');
      if (savedGuides !== null) {
        state.smartGuidesEnabled = (savedGuides === 'true');
      }
    } catch (e) {}

    if (dom.viewport) {
      dom.viewport.classList.toggle('hide-grid', !state.gridVisible);
    }
    if (dom.checkViewGrid) {
      dom.checkViewGrid.textContent = state.gridVisible ? '✓' : '';
    }
    if (dom.checkViewGuides) {
      dom.checkViewGuides.textContent = state.smartGuidesEnabled ? '✓' : '';
    }
  }

  function toggleGridVisibility(forceState) {
    state.gridVisible = (typeof forceState === 'boolean') ? forceState : !state.gridVisible;
    if (dom.viewport) {
      dom.viewport.classList.toggle('hide-grid', !state.gridVisible);
    }
    if (dom.checkViewGrid) {
      dom.checkViewGrid.textContent = state.gridVisible ? '✓' : '';
    }
    try {
      localStorage.setItem('nettopology_grid_visible', state.gridVisible ? 'true' : 'false');
    } catch (e) {}
  }

  function toggleSmartGuides(forceState) {
    state.smartGuidesEnabled = (typeof forceState === 'boolean') ? forceState : !state.smartGuidesEnabled;
    if (dom.checkViewGuides) {
      dom.checkViewGuides.textContent = state.smartGuidesEnabled ? '✓' : '';
    }
    try {
      localStorage.setItem('nettopology_smart_guides', state.smartGuidesEnabled ? 'true' : 'false');
    } catch (e) {}
    showToast(`Guías Magnéticas: ${state.smartGuidesEnabled ? 'Activadas' : 'Desactivadas'}`);
  }

  // ==========================================================================
  // CÓMPUTO DE MATERIALES (BOM - BILL OF MATERIALS)
  // ==========================================================================
  let activeBomTab = 'cables';
  let cachedBomData = null;

  function initBomModal() {
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

  function openBomModal() {
    if (!dom.modalBom) return;
    switchBomTab('cables');
    computeAndRenderBOM();
    dom.modalBom.classList.add('open');
  }

  function closeBomModal() {
    if (!dom.modalBom) return;
    dom.modalBom.classList.remove('open');
  }

  function switchBomTab(tabName) {
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

  function computeBOM() {
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

  function computeAndRenderBOM() {
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

  function exportBOMToCSV() {
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

  function copyBOMToClipboard() {
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

  // ==========================================================================
  // EVENTOS DE LA BARRA DE HERRAMIENTAS
  // ==========================================================================
  function setupToolbarEvents() {
    // Deshacer (Undo) / Rehacer (Redo)
    if (dom.btnUndo) {
      dom.btnUndo.addEventListener('click', () => undo());
    }
    if (dom.btnRedo) {
      dom.btnRedo.addEventListener('click', () => redo());
    }

    // Gestor de Proyectos ("Mis Proyectos")
    if (dom.btnProjectsMgr) {
      dom.btnProjectsMgr.addEventListener('click', openProjectsModal);
    }

    // Renombrar proyecto activo directamente desde la barra superior
    if (dom.projectTitleInput) {
      dom.projectTitleInput.addEventListener('input', (e) => {
        state.currentProjectName = e.target.value.trim() || 'Sin Título';
        saveState();
      });
    }

    // Nuevo Proyecto
    document.getElementById('btn-new').addEventListener('click', () => {
      const name = prompt('Ingresa el nombre para el nuevo proyecto:', 'Nueva Topología');
      if (name !== null) {
        createNewProject(name);
      }
    });

    // Abrir / Importar archivo de proyecto (.netdiag / .json) desde la PC
    const btnOpenEl = document.getElementById('btn-open');
    if (btnOpenEl) {
      btnOpenEl.addEventListener('click', () => {
        openProjectFilePicker();
      });
    }

    dom.fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        importProjectFromFile(e.target.files[0]);
        dom.fileInput.value = '';
      }
    });

    // Guardar (Pisar archivo en disco o pedir carpeta la primera vez)
    const btnSaveEl = document.getElementById('btn-save');
    if (btnSaveEl) {
      btnSaveEl.addEventListener('click', () => {
        saveProjectToFile(false);
      });
    }

    // Guardar como... (Elegir nueva carpeta o nombre en disco)
    if (dom.btnSaveAs) {
      dom.btnSaveAs.addEventListener('click', () => {
        saveProjectToFile(true);
      });
    }

    // Clic en la insignia del archivo vinculado para guardar rápidamente
    if (dom.diskFileBadge) {
      dom.diskFileBadge.addEventListener('click', () => {
        saveProjectToFile(false);
      });
    }

    // Exportar Imagen / Plano (abre modal para elegir Formato PNG/SVG, Blanco y Negro / Modo Oscuro)
    document.getElementById('btn-export-png').addEventListener('click', () => {
      const currSheet = getCurrentSheet();
      if (currSheet && currSheet.pageSize !== 'infinite') {
        if (dom.optExportSheetBoundsWrap) dom.optExportSheetBoundsWrap.style.display = 'block';
        if (dom.lblExportSheetName) {
          const presetName = (SHEET_PRESETS[currSheet.pageSize]?.name || currSheet.pageSize).toUpperCase();
          dom.lblExportSheetName.textContent = `${presetName} (${currSheet.pageWidth}×${currSheet.pageHeight}px)`;
        }
      } else {
        if (dom.optExportSheetBoundsWrap) dom.optExportSheetBoundsWrap.style.display = 'none';
      }

      // Restaurar autor, empresa y escala desde localStorage si están vacíos o migrar Uinfor Networks a Uinfor
      try {
        const savedAuthor = localStorage.getItem('nettopology_author');
        let savedCompany = localStorage.getItem('nettopology_company');
        const savedScale = localStorage.getItem('nettopology_scale');
        if (savedCompany === 'Uinfor Networks') {
          savedCompany = 'Uinfor';
          localStorage.setItem('nettopology_company', 'Uinfor');
        }
        const inpAuthor = document.getElementById('inp-export-author');
        const inpCompany = document.getElementById('inp-export-company');
        const inpScale = document.getElementById('inp-export-scale');
        if (savedAuthor && inpAuthor && !inpAuthor.value) inpAuthor.value = savedAuthor;
        if (inpCompany) {
          if (savedCompany) {
            inpCompany.value = savedCompany;
          } else if (!inpCompany.value || inpCompany.value === 'Uinfor Networks') {
            inpCompany.value = 'Uinfor';
          }
        }
        if (inpScale && savedScale) {
          inpScale.value = savedScale;
        }
      } catch (e) {}

      // Sincronizar estado visual de las tarjetas según el radio activo
      document.querySelectorAll('.export-theme-card').forEach(card => {
        const r = card.querySelector('input[name="export-theme"]');
        card.classList.toggle('selected', Boolean(r && r.checked));
      });

      updateExportPagingUI();

      dom.modalExport.classList.add('open');
    });

    // Cargar ejemplo
    document.getElementById('btn-example').addEventListener('click', () => {
      if (confirm('¿Cargar la topología corporativa de ejemplo en el proyecto actual?')) {
        loadDefaultTopology();
      }
    });

    // Zoom flotante
    document.getElementById('btn-zoom-in').addEventListener('click', () => applyZoom(1.15));
    document.getElementById('btn-zoom-out').addEventListener('click', () => applyZoom(1 / 1.15));
    // Restablecer vista a 100%
    document.getElementById('btn-zoom-reset').addEventListener('click', () => {
      state.viewport.x = 80;
      state.viewport.y = 80;
      state.viewport.zoom = 1;
      updateViewportTransform();
    });

    // Centrar y encuadrar todos los equipos en la pantalla (Hoja Infinita)
    const btnFit = document.getElementById('btn-fit-screen');
    if (btnFit) {
      btnFit.addEventListener('click', fitViewToNodes);
    }

    // Snap to grid
    dom.btnToggleSnap.addEventListener('click', () => {
      state.snapToGrid = !state.snapToGrid;
      dom.btnToggleSnap.classList.toggle('active', state.snapToGrid);
      if (state.snapToGrid) {
        snapAllNodesAndConnectionsToGrid();
      }
    });

    // Puentes en cruce de cables (Cable Jumps estilo esquemático)
    if (dom.btnToggleBridges) {
      dom.btnToggleBridges.addEventListener('click', () => {
        state.cableBridgesEnabled = !state.cableBridgesEnabled;
        dom.btnToggleBridges.classList.toggle('active', state.cableBridgesEnabled);
        try {
          localStorage.setItem('net_cable_bridges', state.cableBridgesEnabled ? 'true' : 'false');
        } catch (e) {}
        renderConnections();
      });
    }

    // Seleccionar todos los equipos
    if (dom.btnSelectAll) {
      dom.btnSelectAll.addEventListener('click', () => {
        selectAllNodes();
      });
    }

    // Botones de modo: Seleccionar vs Mover Lienzo y Herramienta Texto
    function addNewTextBadgeAtCenter() {
      const center = getCanvasCenterWorld();
      const node = createNode('text_badge', Math.round(center.x - 45), Math.round(center.y - 13), {
        name: '192.168.1.0/24',
        ip: '192.168.1.0/24',
        badgeColor: 'emerald'
      });
      saveState();
      showToast('Recuadro de texto / IP agregado. Doble clic para editar.', 'success');
      setTimeout(() => {
        const inp = document.getElementById('prop-text-badge-val');
        if (inp) {
          inp.focus();
          inp.select();
        }
      }, 60);
    }

    if (dom.btnModeSelect) {
      dom.btnModeSelect.addEventListener('click', () => setCanvasMode('select'));
    }
    if (dom.btnModePan) {
      dom.btnModePan.addEventListener('click', () => setCanvasMode('pan'));
    }
    if (dom.btnAddTextBadge) {
      dom.btnAddTextBadge.addEventListener('click', () => addNewTextBadgeAtCenter());
    }

    // Menús desplegables estilo suite en la barra superior (TopBar)
    if (dom.btnMenuFileTrigger && dom.dropdownFile) {
      dom.btnMenuFileTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdown(dom.dropdownFile);
      });
    }

    if (dom.btnMenuEditTrigger && dom.dropdownEdit) {
      dom.btnMenuEditTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdown(dom.dropdownEdit);
      });
    }

    if (dom.btnExportDropdownTrigger && dom.dropdownExport) {
      dom.btnExportDropdownTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdown(dom.dropdownExport);
      });
    }

    // Menú Vista en la cabecera
    if (dom.btnMenuViewTrigger && dom.dropdownView) {
      dom.btnMenuViewTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdown(dom.dropdownView);
      });
    }

    if (dom.menuViewThemeDark) {
      dom.menuViewThemeDark.addEventListener('click', () => {
        closeAllDropdowns();
        applyTheme('dark');
      });
    }
    if (dom.menuViewThemeLight) {
      dom.menuViewThemeLight.addEventListener('click', () => {
        closeAllDropdowns();
        applyTheme('light');
      });
    }
    if (dom.menuViewToggleMinimap) {
      dom.menuViewToggleMinimap.addEventListener('click', () => {
        closeAllDropdowns();
        toggleMinimapVisibility();
      });
    }
    if (dom.menuViewToggleGrid) {
      dom.menuViewToggleGrid.addEventListener('click', () => {
        closeAllDropdowns();
        toggleGridVisibility();
      });
    }
    if (dom.menuViewToggleGuides) {
      dom.menuViewToggleGuides.addEventListener('click', () => {
        closeAllDropdowns();
        toggleSmartGuides();
      });
    }
    if (dom.menuViewFit) {
      dom.menuViewFit.addEventListener('click', () => {
        closeAllDropdowns();
        fitViewToNodes();
      });
    }
    if (dom.menuViewResetZoom) {
      dom.menuViewResetZoom.addEventListener('click', () => {
        closeAllDropdowns();
        state.viewport.x = 80;
        state.viewport.y = 80;
        state.viewport.zoom = 1;
        updateViewportTransform();
      });
    }

    // Duplicar selección desde el menú Editar
    if (dom.menuBtnDuplicate) {
      dom.menuBtnDuplicate.addEventListener('click', () => {
        closeAllDropdowns();
        duplicateSelectedNodes();
      });
    }

    // Abrir Cómputo de Materiales (BOM) desde el menú Exportar
    if (dom.btnOpenBomMenu) {
      dom.btnOpenBomMenu.addEventListener('click', () => {
        closeAllDropdowns();
        openBomModal();
      });
    }

    // Acciones de los menús
    if (dom.menuBtnUndo) {
      dom.menuBtnUndo.addEventListener('click', () => {
        closeAllDropdowns();
        undo();
      });
    }
    if (dom.menuBtnRedo) {
      dom.menuBtnRedo.addEventListener('click', () => {
        closeAllDropdowns();
        redo();
      });
    }
    if (dom.btnExportCsvMenu) {
      dom.btnExportCsvMenu.addEventListener('click', () => {
        closeAllDropdowns();
        exportIpInventoryCsv();
      });
    }
    if (dom.btnSaveMenuCopy) {
      dom.btnSaveMenuCopy.addEventListener('click', () => {
        closeAllDropdowns();
        exportProjectToFile();
      });
    }

    // Cerrar menú al presionar cualquier item
    document.querySelectorAll('.dropdown-item').forEach(item => {
      item.addEventListener('click', () => closeAllDropdowns());
    });

    // Cerrar menús al hacer clic fuera
    window.addEventListener('click', (e) => {
      if (!e.target.closest('.nav-menu-item')) {
        closeAllDropdowns();
      }
    });

    // Botón Búsqueda Rápida (Spotlight / Ctrl + F)
    if (dom.btnQuickSearch) {
      dom.btnQuickSearch.addEventListener('click', openQuickSearchModal);
    }

    // Botón Tabla de Inventario IP
    if (dom.btnOpenIpTable) {
      dom.btnOpenIpTable.addEventListener('click', openIpInventoryModal);
    }

    // Alternar Modo Blanco / Modo Oscuro
    if (dom.btnToggleTheme) {
      dom.btnToggleTheme.addEventListener('click', () => {
        toggleTheme();
      });
    }
  }

  function applyTheme(themeName) {
    const isLight = themeName === 'light';
    if (isLight) {
      document.body.setAttribute('data-theme', 'light');
    } else {
      document.body.removeAttribute('data-theme');
    }
    state.theme = isLight ? 'light' : 'dark';
    try {
      localStorage.setItem('nettopology_theme', state.theme);
    } catch (e) {}

    if (dom.themeIconSun && dom.themeIconMoon) {
      dom.themeIconSun.style.display = isLight ? 'none' : 'block';
      dom.themeIconMoon.style.display = isLight ? 'block' : 'none';
    }
    if (dom.checkThemeDark) {
      dom.checkThemeDark.style.display = isLight ? 'none' : 'inline';
    }
    if (dom.checkThemeLight) {
      dom.checkThemeLight.style.display = isLight ? 'inline' : 'none';
    }
    if (dom.btnToggleTheme) {
      dom.btnToggleTheme.title = isLight ? 'Cambiar a Modo Oscuro' : 'Cambiar a Modo Blanco';
    }
    if (dom.tempCable) {
      dom.tempCable.setAttribute('stroke', isLight ? '#0284c7' : '#38bdf8');
    }

    // 1. Refrescar paleta de dispositivos con los iconos correspondientes al tema
    renderPalette();

    // 2. Actualizar los iconos de todos los nodos activos en el lienzo
    state.nodes.forEach(node => {
      const el = document.getElementById(node.id);
      if (!el) return;
      const iconBox = el.querySelector('.node-icon-box');
      if (iconBox && node.type !== 'text_badge') {
        const handle = iconBox.querySelector('.node-cable-handle');
        const handleHtml = handle ? handle.outerHTML : `
          <div class="node-cable-handle" title="Tirar cable hacia otro equipo" data-handle="true">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" style="pointer-events: none;">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </div>
        `;
        const newIcon = typeof getDeviceIcon === 'function' ? getDeviceIcon(node.type, isLight) : (DEVICE_ICONS[node.type] || DEVICE_ICONS.pc);
        iconBox.innerHTML = `${newIcon}${handleHtml}`;
      }
    });

    renderConnections();
    renderZones();
    updatePaperSheetDisplay();
    if (typeof renderSheetsBar === 'function') renderSheetsBar();
    if (typeof updateMinimap === 'function') updateMinimap();
    if (state.selection && state.selection.id) renderInspector();
  }

  function toggleTheme() {
    const nextTheme = state.theme === 'light' ? 'dark' : 'light';
    applyTheme(nextTheme);
  }

  // ==========================================================================
  // GESTIÓN Y ALTERNANCIA DE PANELES LATERALES (COLAPSAR / EXPANDIR)
  // ==========================================================================
  function togglePalette(forceState) {
    if (!dom.sidebarPalette) return;
    const isCurrentlyCollapsed = dom.sidebarPalette.classList.contains('collapsed');
    const newState = (typeof forceState === 'boolean') ? forceState : !isCurrentlyCollapsed;

    dom.sidebarPalette.classList.toggle('collapsed', newState);

    if (dom.btnExpandPalette) {
      dom.btnExpandPalette.style.display = newState ? 'inline-flex' : 'none';
    }
    if (dom.btnTogglePaletteTop) {
      dom.btnTogglePaletteTop.classList.toggle('active-panel', !newState);
    }
    try {
      localStorage.setItem('net_palette_collapsed', newState ? 'true' : 'false');
    } catch (e) {}
  }

  function toggleInspector(forceState) {
    if (!dom.sidebarInspector) return;
    const isCurrentlyCollapsed = dom.sidebarInspector.classList.contains('collapsed');
    const newState = (typeof forceState === 'boolean') ? forceState : !isCurrentlyCollapsed;

    dom.sidebarInspector.classList.toggle('collapsed', newState);

    if (dom.btnExpandInspector) {
      dom.btnExpandInspector.style.display = newState ? 'inline-flex' : 'none';
    }
    if (dom.btnToggleInspectorTop) {
      dom.btnToggleInspectorTop.classList.toggle('active-panel', !newState);
    }
    try {
      localStorage.setItem('net_inspector_collapsed', newState ? 'true' : 'false');
    } catch (e) {}
  }

  function setupPanelToggles() {
    // Botón colapsar en cabecera de la paleta izquierda
    if (dom.btnCollapsePalette) {
      dom.btnCollapsePalette.addEventListener('click', () => togglePalette(true));
    }
    // Pestaña flotante para reabrir paleta izquierda
    if (dom.btnExpandPalette) {
      dom.btnExpandPalette.addEventListener('click', () => togglePalette(false));
    }
    // Botón en topbar para alternar paleta
    if (dom.btnTogglePaletteTop) {
      dom.btnTogglePaletteTop.addEventListener('click', () => togglePalette());
    }

    // Botón colapsar en cabecera del inspector derecho
    if (dom.btnCollapseInspector) {
      dom.btnCollapseInspector.addEventListener('click', () => toggleInspector(true));
    }
    // Pestaña flotante para reabrir inspector derecho
    if (dom.btnExpandInspector) {
      dom.btnExpandInspector.addEventListener('click', () => toggleInspector(false));
    }
    // Botón en topbar para alternar inspector
    if (dom.btnToggleInspectorTop) {
      dom.btnToggleInspectorTop.addEventListener('click', () => toggleInspector());
    }

    // Asegurar desplazamiento fluido con rueda de ratón en el inspector de propiedades
    if (dom.sidebarInspector) {
      dom.sidebarInspector.addEventListener('wheel', (e) => {
        if (!dom.inspectorBody) return;
        const isInnerScroll = e.target.closest('.ports-list-box');
        if (isInnerScroll) return; // Permitir scroll interno en lista de puertos
        // Si el puntero está en la cabecera o bordes del panel, transferir scroll al inspectorBody
        if (!e.target.closest('#inspector-body')) {
          dom.inspectorBody.scrollTop += e.deltaY;
        }
      }, { passive: true });
    }

    // Atajos de teclado adicionales:
    // [ para alternar paleta izquierda, ] para alternar inspector derecho
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.key === '[') {
        togglePalette();
      } else if (e.key === ']') {
        toggleInspector();
      }
    });

    // Restaurar preferencias del usuario si existen
    try {
      if (localStorage.getItem('net_palette_collapsed') === 'true') {
        togglePalette(true);
      }
      if (localStorage.getItem('net_inspector_collapsed') === 'true') {
        toggleInspector(true);
      }
      const savedBridges = localStorage.getItem('net_cable_bridges');
      if (savedBridges !== null) {
        state.cableBridgesEnabled = (savedBridges === 'true');
        if (dom.btnToggleBridges) {
          dom.btnToggleBridges.classList.toggle('active', state.cableBridgesEnabled);
        }
      }
    } catch (e) {}
  }

  // ==========================================================================
  // ATAJOS DE TECLADO
  // ==========================================================================
  function setupKeyboardShortcuts() {
    let lastEscapePressTime = 0;

    window.addEventListener('keydown', (e) => {
      // Ctrl + S (Guardar / Sobrescribir en disco) y Ctrl + Shift + S (Guardar como...)
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        saveProjectToFile(e.shiftKey);
        return;
      }

      // Ctrl + O: Abrir archivo de proyecto (.netdiag / .json)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'o' || e.key === 'O')) {
        e.preventDefault();
        openProjectFilePicker();
        return;
      }

      // Si el usuario está escribiendo en un input o textarea y presiona Escape, desenfocar el campo y cerrar modales
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        if (e.key === 'Escape') {
          e.target.blur();
          closeQuickSearchModal();
          closeIpInventoryModal();
          closeBomModal();
          closeAllDropdowns();
          lastEscapePressTime = Date.now();
        }
        return;
      }

      // T: Insertar Recuadro de Texto / IP en el lienzo (sin teclas modificadoras)
      if (!e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        addNewTextBadgeAtCenter();
        return;
      }

      // Ctrl + D: Duplicar selección de equipos
      if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        duplicateSelectedNodes();
        return;
      }

      // Ctrl + 0: Zoom al 100%
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        state.viewport.x = 80;
        state.viewport.y = 80;
        state.viewport.zoom = 1;
        updateViewportTransform();
        return;
      }

      // Shift + 1: Ajustar al contenido
      if (e.shiftKey && e.key === '!') {
        e.preventDefault();
        fitViewToNodes();
        return;
      }

      // Ctrl + F: Búsqueda rápida de equipos e IPs (Spotlight)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        openQuickSearchModal();
        return;
      }

      // Ctrl + Z: Deshacer (Undo)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      // Ctrl + Y o Ctrl + Shift + Z: Rehacer (Redo)
      if ((e.ctrlKey || e.metaKey) && ((e.key === 'y' || e.key === 'Y') || (e.shiftKey && (e.key === 'z' || e.key === 'Z')))) {
        e.preventDefault();
        redo();
        return;
      }

      // Ctrl + A: Seleccionar todos los equipos de la hoja activa
      if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        selectAllNodes();
        return;
      }

      // Supr / Backspace: borrar seleccionado(s)
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const hasSelectedZones = state.selectedZoneIds && state.selectedZoneIds.size > 0;
        const totalCount = state.selectedNodeIds.size + (hasSelectedZones ? state.selectedZoneIds.size : 0);
        if (totalCount > 1) {
          deleteSelectedNodes();
        } else if (state.selection.type === 'node' && state.selection.id) {
          deleteNode(state.selection.id);
        } else if (state.selection.type === 'cable' && state.selection.id) {
          deleteConnection(state.selection.id);
        } else if (state.selection.type === 'zone' && state.selection.id) {
          deleteZone(state.selection.id);
        } else if (hasSelectedZones && state.selectedZoneIds.size === 1) {
          deleteZone(Array.from(state.selectedZoneIds)[0]);
        }
      }

      // Escape: deseleccionar y cerrar cualquier modal abierto.
      // Si se pulsa 2 veces seguidas (<= 550ms): oculta o muestra los paneles laterales (Dispositivos y Propiedades)
      if (e.key === 'Escape') {
        const now = Date.now();
        const isDoubleEscape = (now - lastEscapePressTime) <= 550;
        lastEscapePressTime = now;

        if (state.isConnecting) {
          state.isConnecting = false;
          state.connectingSourceNodeId = null;
          dom.tempCable.setAttribute('d', '');
        }

        deselectAll();
        closeCableModal();
        closeQuickSearchModal();
        closeIpInventoryModal();
        closeAllDropdowns();
        if (dom.modalShortcuts) dom.modalShortcuts.classList.remove('open');
        if (dom.modalExport) dom.modalExport.classList.remove('open');
        closeProjectsModal();
        closeSheetConfigModal();

        // 2 veces seguidas: ocultar / restaurar ambos paneles laterales (Dispositivos y Propiedades)
        if (isDoubleEscape) {
          const isPaletteOpen = dom.sidebarPalette && !dom.sidebarPalette.classList.contains('collapsed');
          const isInspectorOpen = dom.sidebarInspector && !dom.sidebarInspector.classList.contains('collapsed');

          if (isPaletteOpen || isInspectorOpen) {
            togglePalette(true);
            toggleInspector(true);
          } else {
            togglePalette(false);
            toggleInspector(false);
          }
          lastEscapePressTime = 0; // Reiniciar
        }
      }

      // Ctrl + S: Guardar / Descargar archivo
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        exportProjectToFile();
      }

      // Ctrl + D: Duplicar seleccionado(s)
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        if (state.selectedNodeIds.size > 1) {
          duplicateSelectedNodes();
        } else if (state.selection.type === 'node' && state.selection.id) {
          duplicateNode(state.selection.id);
        }
      }

      // H: Modo Mano (Pan), V: Modo Selección
      if ((e.key === 'h' || e.key === 'H') && !e.ctrlKey && !e.metaKey) {
        setCanvasMode('pan');
      } else if ((e.key === 'v' || e.key === 'V') && !e.ctrlKey && !e.metaKey) {
        setCanvasMode('select');
      }

      // F o Shift+F: Centrar y encuadrar todo en la pantalla (Fit view)
      if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey) {
        fitViewToNodes();
      }
    });
  }

  // ==========================================================================
  // UTILIDADES
  // ==========================================================================
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function incrementIp(ip) {
    if (!ip) return '192.168.1.100';
    const parts = ip.split('.');
    if (parts.length === 4 && !isNaN(parts[3])) {
      parts[3] = Math.min(parseInt(parts[3], 10) + 1, 254);
      return parts.join('.');
    }
    return ip;
  }

  function formatDateForFile(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${y}${m}${d}_${h}${min}`;
  }

  // Exponer API interna para pruebas y automatizaciones
  window.netTopology = {
    state,
    createNode,
    renderConnections,
    renderNodeElement,
    selectElement,
    deleteNode
  };

  // Iniciar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
