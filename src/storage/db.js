/**
 * NetTopology - Módulo src/storage/db.js
 */

import { state, dom } from '../state/store.js';
import { app } from '../core/appContext.js';
import { DEVICE_ICONS, DEVICE_ICONS_LIGHT, DEVICE_METADATA, CABLE_TYPES, getDeviceIcon, generateSwitchPorts, generateRouterPorts } from '../config/icons.js';
import { STORAGE_PROJECTS_KEY, STORAGE_ACTIVE_ID_KEY, STORAGE_LEGACY_KEY, SHEET_PRESETS, ZONE_COLOR_PALETTES, MAX_HISTORY_STEPS, DEFAULT_GRID_SIZE } from '../config/constants.js';
import { escapeHtml, incrementIp, formatDateForFile, clamp, generateId } from '../utils/helpers.js';
import { runTopologyAudit } from '../core/audit.js';
import { getCurrentSheet, normalizeProjectSheets, loadSheetData, updatePaperSheetDisplay, renderSheetsBar } from '../core/sheets.js';
import { createHistorySnapshot, pushHistoryState, updateUndoRedoUI } from '../state/history.js';
import { loadDefaultTopology } from '../config/defaultTopology.js';
import localforage from 'localforage';

// Instancia de IndexedDB de alto rendimiento sin límite de 5MB
export const dbStore = localforage.createInstance({
  name: 'NetTopologyDB',
  storeName: 'projects',
  description: 'Almacenamiento persistente de proyectos de red y planos arquitectónicos'
});

let cachedProjects = null;



  // ==========================================================================
  // GESTOR MULTI-PROYECTO Y PERSISTENCIA (LOCALSTORAGE Y ARCHIVOS .NETDIAG)
  // ==========================================================================

  // Obtener todos los proyectos guardados (con caché en memoria y fallback)
export function getAllProjects() {
    if (cachedProjects && Array.isArray(cachedProjects) && cachedProjects.length > 0) {
      return cachedProjects;
    }
    let projects = [];
    try {
      const raw = localStorage.getItem(STORAGE_PROJECTS_KEY);
      if (raw) {
        projects = JSON.parse(raw);
      }
    } catch (e) {
      // Ignorar error silenciado
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

    cachedProjects = projects;
    return projects;
  }

export function saveAllProjects(projects) {
    cachedProjects = projects;

    // 1. Guardar en IndexedDB asíncronamente (sin límite de tamaño de 5MB)
    dbStore.setItem('projects_collection', projects).catch(() => {});

    // 2. Fallback sincronizado en localStorage si el tamaño lo permite
    try {
      const serialized = JSON.stringify(projects);
      // Solo escribir en localStorage si ocupa menos de ~4.5MB para evitar excepciones de cuota
      if (serialized.length < 4500000) {
        localStorage.setItem(STORAGE_PROJECTS_KEY, serialized);
      }
    } catch (e) {
      // Fallback silenciado si la cuota falla
    }
  }

export function getActiveProject() {
    const projects = getAllProjects();
    const activeId = localStorage.getItem(STORAGE_ACTIVE_ID_KEY);
    let current = projects.find(p => p.id === activeId);
    if (!current) {
      current = projects[0];
      localStorage.setItem(STORAGE_ACTIVE_ID_KEY, current.id);
    }
    return current;
  }

export function saveStateImmediately() {
    clearTimeout(saveTimeout);
    const currSheet = getCurrentSheet();
    if (currSheet) {
      currSheet.nodes = state.nodes;
      currSheet.connections = state.connections;
      currSheet.zones = state.zones || [];
      currSheet.underlay = state.underlay ? JSON.parse(JSON.stringify(state.underlay)) : null;
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
      projects[idx].underlay = state.underlay || null;
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
        underlay: state.underlay || null,
        viewport: state.viewport
      });
      state.currentProjectId = projects[projects.length - 1].id;
    }
    saveAllProjects(projects);
    localStorage.setItem(STORAGE_ACTIVE_ID_KEY, state.currentProjectId);
    runTopologyAudit();
  }

  let saveTimeout = null;
export function saveState(recordHistory = true, immediateHistory = false) {
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

      // Auto-guardado continuo en PC si hay archivo vinculado
      if (currentFileHandle) {
        scheduleDiskAutoSave();
      }
    }, 300);
  }

export function activateProject(project, resetView = true) {
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

export function switchProject(targetProjectId) {
    // Guardar el proyecto actual antes de cambiar
    saveStateImmediately();
    clearTimeout(diskAutoSaveTimeout);
    currentFileHandle = null;
    updateDiskFileBadge(null);

    const projects = getAllProjects();
    const target = projects.find(p => p.id === targetProjectId);
    if (target) {
      activateProject(target, true);
      restoreDiskFileHandle(target.id);
      renderProjectsList();
      closeProjectsModal();
    }
  }

export function createNewProject(name) {
    saveStateImmediately();
    clearTimeout(diskAutoSaveTimeout);
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

export function duplicateProject(projectId) {
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

export function deleteProject(projectId) {
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
    persistCurrentFileHandle(projectId, null);

    if (state.currentProjectId === projectId) {
      clearTimeout(diskAutoSaveTimeout);
      currentFileHandle = null;
      updateDiskFileBadge(null);
      activateProject(filtered[0], true);
      restoreDiskFileHandle(filtered[0].id);
    }

    renderProjectsList();
  }

  // ==========================================================================
  // GESTIÓN DE ARCHIVOS EN DISCO (FILE SYSTEM ACCESS API & AUTO-GUARDADO CONTINUO EN PC)
  // ==========================================================================
  let currentFileHandle = null;
  let diskAutoSaveTimeout = null;
  let isSavingToDisk = false;
  let diskSavePending = false;
  let currentDiskStatus = 'idle'; // 'idle' | 'saving' | 'synced' | 'needs-permission' | 'error'

  export function getDiskFileHandle() {
    return currentFileHandle;
  }

  export function getDiskFileStatus() {
    return currentDiskStatus;
  }

export function showToast(message, type = 'info', duration = 3200) {
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

export function updateDiskFileBadge(fileName = null, status = 'synced', customMsg = '') {
    if (!dom.diskFileBadge) return;
    if (!fileName) {
      dom.diskFileBadge.style.display = 'none';
      dom.diskFileBadge.classList.remove('status-saving', 'status-warning', 'status-error', 'status-synced');
      if (dom.diskFileName) dom.diskFileName.textContent = '';
      if (dom.diskFileStatus) dom.diskFileStatus.textContent = '';
      currentDiskStatus = 'idle';
      return;
    }

    currentDiskStatus = status;
    dom.diskFileBadge.style.display = 'inline-flex';
    dom.diskFileBadge.classList.remove('status-saving', 'status-warning', 'status-error', 'status-synced');
    dom.diskFileBadge.classList.add(`status-${status}`);

    if (dom.diskFileName) {
      dom.diskFileName.textContent = fileName;
    }

    if (dom.diskFileStatus) {
      if (status === 'saving') {
        dom.diskFileStatus.textContent = 'Guardando...';
      } else if (status === 'needs-permission') {
        dom.diskFileStatus.textContent = 'Autorizar';
      } else if (status === 'error') {
        dom.diskFileStatus.textContent = 'Error';
      } else {
        dom.diskFileStatus.textContent = 'Auto';
      }
    }

    if (status === 'saving') {
      dom.diskFileBadge.title = `Guardando automáticamente cambios en "${fileName}" en tu PC...`;
    } else if (status === 'needs-permission') {
      dom.diskFileBadge.title = `Se requiere permiso de escritura en "${fileName}".\nHaz clic aquí para autorizar el auto-guardado continuo en PC.`;
    } else if (status === 'error') {
      dom.diskFileBadge.title = `Error al guardar en "${fileName}".\nHaz clic para reintentar o volver a vincular.`;
    } else {
      dom.diskFileBadge.title = `Archivo en PC: ${fileName}\nAuto-guardado continuo activo: cada cambio se guarda automáticamente en tu disco.\nHaz clic para guardar ahora manualmente.`;
    }
  }

export async function persistCurrentFileHandle(projectId, handle) {
    if (!projectId) return;
    try {
      if (handle) {
        await dbStore.setItem(`disk_handle_${projectId}`, handle);
      } else {
        await dbStore.removeItem(`disk_handle_${projectId}`);
      }
    } catch (e) {
      // Ignorar si el navegador no permite serializar el FileSystemFileHandle en IDB
    }
  }

export async function restoreDiskFileHandle(projectId) {
    if (!('showSaveFilePicker' in window) || !projectId) {
      currentFileHandle = null;
      updateDiskFileBadge(null);
      return null;
    }

    try {
      const handle = await dbStore.getItem(`disk_handle_${projectId}`);
      if (handle && handle.name) {
        currentFileHandle = handle;
        if (handle.queryPermission) {
          const perm = await handle.queryPermission({ mode: 'readwrite' });
          if (perm === 'granted') {
            updateDiskFileBadge(handle.name, 'synced');
          } else {
            updateDiskFileBadge(handle.name, 'needs-permission');
          }
        } else {
          updateDiskFileBadge(handle.name, 'synced');
        }
        return handle;
      }
    } catch (e) {
      // Silencioso
    }

    currentFileHandle = null;
    updateDiskFileBadge(null);
    return null;
  }

export async function unlinkDiskFile() {
    const oldName = currentFileHandle ? currentFileHandle.name : 'archivo';
    const projId = state.currentProjectId;
    currentFileHandle = null;
    currentDiskStatus = 'idle';
    updateDiskFileBadge(null);
    if (projId) {
      await persistCurrentFileHandle(projId, null);
    }
    showToast(`Archivo "${oldName}" desvinculado. El diagrama seguirá guardándose en este navegador.`, 'info');
  }

export async function linkProjectToDiskFile() {
    if (!('showSaveFilePicker' in window)) {
      showToast('Tu navegador no soporta File System Access API para vincular archivos en PC. Te recomendamos usar Google Chrome o Microsoft Edge.', 'warning', 5000);
      return;
    }
    await saveProjectToFile(true);
  }

export function scheduleDiskAutoSave() {
    if (!currentFileHandle) return;
    clearTimeout(diskAutoSaveTimeout);
    diskAutoSaveTimeout = setTimeout(() => {
      performDiskAutoSave(false);
    }, 800);
  }

export async function performDiskAutoSave(isUserInitiated = false) {
    if (!currentFileHandle) return false;

    if (isSavingToDisk) {
      diskSavePending = true;
      return false;
    }

    try {
      isSavingToDisk = true;
      updateDiskFileBadge(currentFileHandle.name, 'saving');

      // Comprobar y solicitar permisos si es necesario
      if (currentFileHandle.queryPermission) {
        let perm = await currentFileHandle.queryPermission({ mode: 'readwrite' });
        if (perm !== 'granted') {
          if (isUserInitiated && currentFileHandle.requestPermission) {
            perm = await currentFileHandle.requestPermission({ mode: 'readwrite' });
          }
          if (perm !== 'granted') {
            updateDiskFileBadge(currentFileHandle.name, 'needs-permission');
            isSavingToDisk = false;
            return false;
          }
        }
      }

      const payload = buildProjectPayload();
      const writable = await currentFileHandle.createWritable();
      await writable.write(JSON.stringify(payload, null, 2));
      await writable.close();

      updateDiskFileBadge(currentFileHandle.name, 'synced');
      return true;
    } catch (err) {
      console.warn('Auto-guardado en PC:', err);
      if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
        updateDiskFileBadge(currentFileHandle.name, 'needs-permission');
      } else {
        updateDiskFileBadge(currentFileHandle.name, 'error');
      }
      return false;
    } finally {
      isSavingToDisk = false;
      if (diskSavePending) {
        diskSavePending = false;
        scheduleDiskAutoSave();
      }
    }
  }

export function buildProjectPayload(project = null) {
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

export async function saveProjectToFile(forceSaveAs = false) {
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

        // Persistir el handle en IndexedDB para este proyecto
        await persistCurrentFileHandle(state.currentProjectId, handle);

        // Actualizar título del proyecto si cambió de nombre de archivo
        const cleanName = handle.name.replace(/\.(netdiag|json)$/i, '');
        if (cleanName && state.currentProjectName !== cleanName) {
          state.currentProjectName = cleanName;
          const curr = getActiveProject();
          if (curr) curr.name = cleanName;
          if (dom.projectTitleInput) dom.projectTitleInput.value = cleanName;
        }

        updateDiskFileBadge(handle.name, 'synced');
        showToast(`💾 Guardado y sincronizado con "${handle.name}". Ahora cada cambio se guardará automáticamente en tu PC.`, 'success', 4500);
        return;
      } catch (err) {
        if (err.name === 'AbortError') return; // Usuario canceló diálogo
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

export async function openProjectFilePicker() {
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
        await persistCurrentFileHandle(importedProject.id, handle);

        activateProject(importedProject, true);
        renderProjectsList();
        closeProjectsModal();
        updateDiskFileBadge(handle.name, 'synced');
        showToast(`📂 Abierto "${handle.name}". Auto-guardado continuo en PC activado.`, 'success', 4500);
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }

    // Fallback tradicional
    dom.fileInput.click();
  }

export function exportProjectToFile(project) {
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

export function importProjectFromFile(file) {
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

export function renderProjectsList() {
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

export function openProjectsModal() {
    renderProjectsList();
    if (dom.modalProjects) {
      dom.modalProjects.classList.add('open');
      if (dom.inputNewProjectName) {
        dom.inputNewProjectName.value = '';
        dom.inputNewProjectName.focus();
      }
    }
  }

export function closeProjectsModal() {
    if (dom.modalProjects) {
      dom.modalProjects.classList.remove('open');
    }
  }

export async function initProjectsManager() {
    try {
      const idbProjects = await dbStore.getItem('projects_collection');
      if (Array.isArray(idbProjects) && idbProjects.length > 0) {
        cachedProjects = idbProjects;
      } else {
        // Migración automática transparente desde localStorage hacia IndexedDB
        const legacyProjects = getAllProjects();
        if (Array.isArray(legacyProjects) && legacyProjects.length > 0) {
          cachedProjects = legacyProjects;
          await dbStore.setItem('projects_collection', legacyProjects);
        }
      }
    } catch (err) {
      // Fallback silencioso en caso de error de IndexedDB
    }

    const projects = getAllProjects();
    const active = getActiveProject();

    if (active) {
      activateProject(active, false);
      restoreDiskFileHandle(active.id);
    }

    // Si el proyecto activo no tiene nodos, cargamos la topología inicial de demostración
    if (!state.nodes || state.nodes.length === 0) {
      loadDefaultTopology();
    }
  }

  // Compatibilidad con llamadas previas
  const exportProjectJson = () => exportProjectToFile();
  const openProjectJson = (file) => importProjectFromFile(file);

  // Función para transformar iconos SVG en diagramas técnicos en Blanco y Negro

// Registrar métodos en el contexto global de aplicación
app.getAllProjects = getAllProjects;
app.saveAllProjects = saveAllProjects;
app.getActiveProject = getActiveProject;
app.saveStateImmediately = saveStateImmediately;
app.saveState = saveState;
app.activateProject = activateProject;
app.switchProject = switchProject;
app.createNewProject = createNewProject;
app.duplicateProject = duplicateProject;
app.deleteProject = deleteProject;
app.showToast = showToast;
app.updateDiskFileBadge = updateDiskFileBadge;
app.getDiskFileHandle = getDiskFileHandle;
app.getDiskFileStatus = getDiskFileStatus;
app.scheduleDiskAutoSave = scheduleDiskAutoSave;
app.performDiskAutoSave = performDiskAutoSave;
app.persistCurrentFileHandle = persistCurrentFileHandle;
app.restoreDiskFileHandle = restoreDiskFileHandle;
app.unlinkDiskFile = unlinkDiskFile;
app.linkProjectToDiskFile = linkProjectToDiskFile;
app.buildProjectPayload = buildProjectPayload;
app.saveProjectToFile = saveProjectToFile;
app.openProjectFilePicker = openProjectFilePicker;
app.exportProjectToFile = exportProjectToFile;
app.importProjectFromFile = importProjectFromFile;
app.renderProjectsList = renderProjectsList;
app.openProjectsModal = openProjectsModal;
app.closeProjectsModal = closeProjectsModal;
app.initProjectsManager = initProjectsManager;
