/**
 * NetTopology - Estado Global y Referencias DOM
 */

export const state = {
  nodes: [],
  connections: [],
  selection: { type: null, id: null, ids: [] }, // type: 'node' | 'cable' | 'multi-node'
  selectedNodeIds: new Set(),
  selectedZoneIds: new Set(),
  canvasMode: 'select', // 'select' | 'pan'
  viewport: { x: 80, y: 80, zoom: 1 },
  snapToGrid: true,
  isDraggingNode: false,
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
  smartGuidesEnabled: true,
  defaultEncapsulatedLabels: false,
  underlay: null, // { src, name, x, y, width, height, scale, opacity, visible, locked }
  activeLayer: 'logical', // 'logical' (por defecto) | 'physical' | 'power' | 'all'
  
  // Estado para colaboración P2P en tiempo real
  collab: {
    active: false,
    isHost: false,
    roomId: null,
    peerId: null,
    peers: {},
    status: 'disconnected'
  }
};

export const dom = {};

export function initDom() {
  const elements = {
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
    themeIconGlass: document.getElementById('theme-icon-glass'),
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
    btnLinkDiskFile: document.getElementById('btn-link-disk-file'),
    diskFileBadge: document.getElementById('disk-file-badge'),
    diskFileName: document.getElementById('disk-file-name'),
    diskFileDot: document.getElementById('disk-file-dot'),
    diskFileStatus: document.getElementById('disk-file-status'),
    btnUnlinkDiskFile: document.getElementById('btn-unlink-disk-file'),

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

    // Exportación SVG y Modal Auditor
    btnExportSvg: document.getElementById('btn-export-svg'),
    btnOpenTopologyAudit: document.getElementById('btn-open-topology-audit'),
    modalTopologyAudit: document.getElementById('modal-topology-audit'),
    btnCloseAuditModal: document.getElementById('btn-close-audit-modal'),
    btnCloseAuditBottom: document.getElementById('btn-close-audit-bottom'),
    btnRecheckAudit: document.getElementById('btn-recheck-audit'),

    // Menú Vista y Controles de Vista
    btnMenuViewTrigger: document.getElementById('btn-menu-view-trigger'),
    dropdownView: document.getElementById('dropdown-view'),
    menuViewThemeDark: document.getElementById('menu-view-theme-dark'),
    menuViewThemeGlass: document.getElementById('menu-view-theme-glass'),
    menuViewThemeLight: document.getElementById('menu-view-theme-light'),
    checkThemeDark: document.getElementById('check-theme-dark'),
    checkThemeGlass: document.getElementById('check-theme-glass'),
    checkThemeLight: document.getElementById('check-theme-light'),
    menuViewToggleMinimap: document.getElementById('menu-view-toggle-minimap'),
    checkViewMinimap: document.getElementById('check-view-minimap'),
    menuViewToggleGrid: document.getElementById('menu-view-toggle-grid'),
    checkViewGrid: document.getElementById('check-view-grid'),
    menuViewToggleGuides: document.getElementById('menu-view-toggle-guides'),
    checkViewGuides: document.getElementById('check-view-guides'),
    menuViewToggleSnap: document.getElementById('menu-view-toggle-snap'),
    checkViewSnap: document.getElementById('check-view-snap'),
    menuViewToggleBridges: document.getElementById('menu-view-toggle-bridges'),
    checkViewBridges: document.getElementById('check-view-bridges'),
    menuViewFit: document.getElementById('menu-view-fit'),
    menuViewResetZoom: document.getElementById('menu-view-reset-zoom'),
    menuBtnDuplicate: document.getElementById('menu-btn-duplicate'),
    canvasLayersDropdownWrap: document.getElementById('canvas-layers-dropdown-wrap'),
    btnToggleLayersDropdown: document.getElementById('btn-toggle-layers-dropdown'),
    dropdownLayersMenu: document.getElementById('dropdown-layers-menu'),
    labelActiveLayerBtn: document.getElementById('label-active-layer-btn'),
    indicatorActiveLayerDot: document.getElementById('indicator-active-layer-dot'),

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
    btnCopyBom: document.getElementById('btn-copy-bom'),

    // Capa de Plano de Fondo (Underlay / Arquitectura)
    underlayLayer: document.getElementById('underlay-layer'),
    modalUnderlay: document.getElementById('modal-underlay'),
    btnCloseUnderlayModal: document.getElementById('btn-close-underlay-modal'),
    btnCloseUnderlayBottom: document.getElementById('btn-close-underlay-bottom'),
    btnBrowseUnderlay: document.getElementById('btn-browse-underlay'),
    inputUnderlayFile: document.getElementById('input-underlay-file'),
    btnChangeUnderlayFile: document.getElementById('btn-change-underlay-file'),
    btnDeleteUnderlay: document.getElementById('btn-delete-underlay'),
    underlayEmptyState: document.getElementById('underlay-empty-state'),
    underlayControlsCard: document.getElementById('underlay-controls-card'),
    lblUnderlayFilename: document.getElementById('lbl-underlay-filename'),
    lblUnderlayDims: document.getElementById('lbl-underlay-dims'),
    chkUnderlayVisible: document.getElementById('chk-underlay-visible'),
    chkUnderlayLocked: document.getElementById('chk-underlay-locked'),
    rngUnderlayOpacity: document.getElementById('rng-underlay-opacity'),
    lblUnderlayOpacity: document.getElementById('lbl-underlay-opacity'),
    rngUnderlayScale: document.getElementById('rng-underlay-scale'),
    lblUnderlayScale: document.getElementById('lbl-underlay-scale'),
    btnFitUnderlaySheet: document.getElementById('btn-fit-underlay-sheet'),
    btnResetUnderlayPos: document.getElementById('btn-reset-underlay-pos'),
    btnToggleMoveUnderlay: document.getElementById('btn-toggle-move-underlay'),
    btnToggleUnderlay: document.getElementById('btn-toggle-underlay'),
    btnImportUnderlayMenu: document.getElementById('btn-import-underlay'),
    menuViewToggleUnderlay: document.getElementById('menu-view-toggle-underlay'),
    checkViewUnderlay: document.getElementById('check-view-underlay'),
    labelUnderlayBtn: document.getElementById('label-underlay-btn')
  };
  Object.assign(dom, elements);
  return dom;
}
