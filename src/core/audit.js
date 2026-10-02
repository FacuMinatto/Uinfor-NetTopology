/**
 * NetTopology - Módulo src/core/audit.js
 */

import { state, dom } from '../state/store.js';
import { app } from '../core/appContext.js';
import { DEVICE_ICONS, DEVICE_ICONS_LIGHT, DEVICE_METADATA, CABLE_TYPES, getDeviceIcon, generateSwitchPorts, generateRouterPorts } from '../config/icons.js';
import { STORAGE_PROJECTS_KEY, STORAGE_ACTIVE_ID_KEY, STORAGE_LEGACY_KEY, SHEET_PRESETS, ZONE_COLOR_PALETTES, MAX_HISTORY_STEPS, DEFAULT_GRID_SIZE } from '../config/constants.js';
import { escapeHtml, incrementIp, formatDateForFile, clamp, generateId } from '../utils/helpers.js';
import { selectElement } from '../ui/inspector.js';
import { panAndHighlightNode } from './search.js';
import { showToast } from '../storage/db.js';



  // ==========================================================================
  // SIMULACIÓN DE CONECTIVIDAD (PING & TRÁFICO DE PAQUETES)
  // ==========================================================================
export function simulateCablePing(conn) {
    if (!conn) return;
    const nodeA = state.nodes.find(n => n.id === conn.fromNodeId);
    const nodeB = state.nodes.find(n => n.id === conn.toNodeId);
    if (!nodeA || !nodeB) return;

    const pathEl = dom.cablesGroup ? dom.cablesGroup.querySelector(`path.network-cable[data-cable-id="${conn.id}"]`) : null;
    if (!pathEl) {
      showToast('No se encontró el trazado del cable en el lienzo.', 'warning');
      return;
    }

    const totalLen = pathEl.getTotalLength ? pathEl.getTotalLength() : 0;
    if (!totalLen || totalLen <= 0) return;

    // Crear partícula SVG animada
    const pulse = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    pulse.setAttribute('class', 'cable-packet-pulse');
    pulse.setAttribute('r', '5.5');
    dom.cablesGroup.appendChild(pulse);
    pathEl.classList.add('cable-active-pulse');

    const duration = 1200; // ms ida y vuelta
    const startTime = performance.now();

    function stepPing(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ida y vuelta (0 -> 1 -> 0)
      const t = progress < 0.5 ? (progress * 2) : ((1 - progress) * 2);
      const dist = t * totalLen;
      const pt = pathEl.getPointAtLength(dist);

      pulse.setAttribute('cx', pt.x);
      pulse.setAttribute('cy', pt.y);

      if (progress < 1) {
        requestAnimationFrame(stepPing);
      } else {
        pathEl.classList.remove('cable-active-pulse');
        pulse.remove();

        const ipA = (nodeA.ip || '').trim();
        const ipB = (nodeB.ip || '').trim();

        if (ipA && ipB) {
          const octA = ipA.split('.').slice(0, 3).join('.');
          const octB = ipB.split('.').slice(0, 3).join('.');
          const isL3 = nodeA.type === 'router' || nodeB.type === 'router' || nodeA.type === 'firewall' || nodeB.type === 'firewall';

          if (octA === octB || isL3) {
            const rtt = (0.7 + Math.random() * 1.5).toFixed(1);
            showToast(`⚡ Ping exitoso: ${nodeA.customName || nodeA.name} (${ipA}) ↔ ${nodeB.customName || nodeB.name} (${ipB}) | RTT: ${rtt} ms · TTL=64 · Enlace ${conn.cableType.toUpperCase()} OK`, 'success', 4500);
          } else {
            showToast(`⚠️ Enlace físico activo, pero subredes distintas: ${nodeA.customName || nodeA.name} (${ipA}) vs ${nodeB.customName || nodeB.name} (${ipB}) sin router intermediario`, 'warning', 5000);
          }
        } else {
          showToast(`⚡ Enlace físico verificado: ${nodeA.customName || nodeA.name} [${conn.fromPort || 'P1'}] ↔ ${nodeB.customName || nodeB.name} [${conn.toPort || 'P2'}] · Medio ${conn.cableType.toUpperCase()} UP`, 'info', 4000);
        }
      }
    }

    requestAnimationFrame(stepPing);
  }

  // ==========================================================================
  // AUDITOR Y DIAGNÓSTICO DE RED (LINTER TOPOLÓGICO)
  // ==========================================================================
  let currentAuditFilter = 'all';

export function runTopologyAudit() {
    const issues = [];
    const activeNodes = state.nodes || [];
    const activeConns = state.connections || [];

    // 1. IPs Duplicadas
    const ipMap = {};
    activeNodes.forEach(n => {
      const ip = (n.ip || '').trim();
      if (!ip) return;
      if (!ipMap[ip]) ipMap[ip] = [];
      ipMap[ip].push(n);
    });

    Object.keys(ipMap).forEach(ip => {
      const list = ipMap[ip];
      if (list.length > 1) {
        issues.push({
          id: `dup-ip-${ip}`,
          severity: 'error',
          badge: 'IP Duplicada',
          title: `Conflicto de IP: ${ip}`,
          desc: `Asignada simultáneamente a ${list.map(n => n.customName || n.name).join(' y ')}. Esto causará colisión ARP y corte de tráfico.`,
          targetType: 'node',
          targetId: list[0].id
        });
      }
    });

    // 2. Colisión de bocas físicas en un mismo equipo
    activeNodes.forEach(node => {
      const portsUsed = {};
      activeConns.forEach(c => {
        let pName = null;
        if (c.fromNodeId === node.id) pName = (c.fromPort || '').trim();
        else if (c.toNodeId === node.id) pName = (c.toPort || '').trim();
        if (pName) {
          if (!portsUsed[pName]) portsUsed[pName] = [];
          portsUsed[pName].push(c);
        }
      });

      Object.keys(portsUsed).forEach(pName => {
        if (portsUsed[pName].length > 1) {
          issues.push({
            id: `port-conflict-${node.id}-${pName}`,
            severity: 'error',
            badge: 'Boca Sobreasignada',
            title: `Boca "${pName}" con múltiples cables en ${node.customName || node.name}`,
            desc: `Existen ${portsUsed[pName].length} cables conectados a la misma boca física.`,
            targetType: 'node',
            targetId: node.id
          });
        }
      });
    });

    // 3. Subredes incompatibles en cable directo
    activeConns.forEach(conn => {
      const nA = activeNodes.find(n => n.id === conn.fromNodeId);
      const nB = activeNodes.find(n => n.id === conn.toNodeId);
      if (nA && nB && nA.ip && nB.ip) {
        const ipA = nA.ip.trim();
        const ipB = nB.ip.trim();
        const octA = ipA.split('.').slice(0, 3).join('.');
        const octB = ipB.split('.').slice(0, 3).join('.');
        const isL3 = nA.type === 'router' || nB.type === 'router' || nA.type === 'firewall' || nB.type === 'firewall';
        if (octA !== octB && !isL3 && octA.length >= 5 && octB.length >= 5) {
          issues.push({
            id: `subnet-mismatch-${conn.id}`,
            severity: 'warning',
            badge: 'Subred Cruzada',
            title: `Subredes distintas en enlace directo`,
            desc: `${nA.customName || nA.name} (${ipA}) y ${nB.customName || nB.name} (${ipB}) no podrán comunicarse sin enrutador L3.`,
            targetType: 'cable',
            targetId: conn.id
          });
        }
      }
    });

    // 4. Equipos aislados sin conexión
    activeNodes.forEach(node => {
      const hasConn = activeConns.some(c => c.fromNodeId === node.id || c.toNodeId === node.id);
      if (!hasConn) {
        issues.push({
          id: `isolated-${node.id}`,
          severity: 'info',
          badge: 'Equipo Aislado',
          title: `Dispositivo sin conexión: ${node.customName || node.name}`,
          desc: `Este equipo no posee ningún cable de red vinculado en la hoja activa.`,
          targetType: 'node',
          targetId: node.id
        });
      }
    });

    // Actualizar badge en la topbar
    const badgeEl = document.getElementById('badge-audit-count');
    if (badgeEl) {
      const errorCount = issues.filter(i => i.severity === 'error').length;
      const warnCount = issues.filter(i => i.severity === 'warning').length;
      const totalProblems = errorCount + warnCount;
      if (totalProblems > 0) {
        badgeEl.textContent = totalProblems;
        badgeEl.style.display = 'inline-flex';
        badgeEl.style.background = errorCount > 0 ? '#f43f5e' : '#f59e0b';
      } else {
        badgeEl.style.display = 'none';
      }
    }

    return issues;
  }

export function renderTopologyAuditModal(filter = 'all') {
    currentAuditFilter = filter;
    const listEl = document.getElementById('audit-results-list');
    if (!listEl) return;

    const issues = runTopologyAudit();
    const errorCount = issues.filter(i => i.severity === 'error').length;
    const warnCount = issues.filter(i => i.severity === 'warning').length;
    const infoCount = issues.filter(i => i.severity === 'info').length;
    const passedCount = Math.max(0, (state.nodes.length + state.connections.length) - issues.length);

    const elErr = document.getElementById('cnt-audit-errors');
    const elWarn = document.getElementById('cnt-audit-warnings');
    const elInfo = document.getElementById('cnt-audit-info');
    const elPass = document.getElementById('cnt-audit-passed');

    if (elErr) elErr.textContent = errorCount;
    if (elWarn) elWarn.textContent = warnCount;
    if (elInfo) elInfo.textContent = infoCount;
    if (elPass) elPass.textContent = passedCount;

    // Actualizar botones de filtro
    document.querySelectorAll('.btn-audit-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.auditFilter === filter);
    });

    const filtered = issues.filter(item => {
      if (filter === 'all') return true;
      return item.severity === filter;
    });

    listEl.innerHTML = '';

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div class="audit-card-item severity-success" style="padding: 1.5rem; text-align: center; justify-content: center;">
          <div>
            <div style="font-size: 1.1rem; font-weight: 700; color: #10b981; margin-bottom: 0.35rem;">✓ Sin incidencias en esta categoría</div>
            <div style="font-size: 0.8rem; color: var(--text-secondary);">El diagrama cumple con las reglas de coherencia y direccionamiento.</div>
          </div>
        </div>
      `;
      return;
    }

    filtered.forEach(issue => {
      const card = document.createElement('div');
      card.className = `audit-card-item severity-${issue.severity}`;
      card.innerHTML = `
        <div class="audit-item-main">
          <span class="audit-item-badge">${escapeHtml(issue.badge)}</span>
          <div>
            <div class="audit-item-title">${escapeHtml(issue.title)}</div>
            <div class="audit-item-desc">${escapeHtml(issue.desc)}</div>
          </div>
        </div>
        <button type="button" class="btn-locate-issue" data-target-type="${issue.targetType}" data-target-id="${issue.targetId}" title="Enfocar y seleccionar en el plano">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
          Localizar
        </button>
      `;

      card.querySelector('.btn-locate-issue').addEventListener('click', () => {
        closeTopologyAuditModal();
        selectElement(issue.targetType, issue.targetId);
        if (issue.targetType === 'node') {
          panAndHighlightNode(issue.targetId);
        } else if (issue.targetType === 'cable') {
          const c = state.connections.find(conn => conn.id === issue.targetId);
          if (c) panAndHighlightNode(c.fromNodeId);
        }
      });

      listEl.appendChild(card);
    });
  }

export function openTopologyAuditModal() {
    const modal = document.getElementById('modal-topology-audit');
    if (!modal) return;
    renderTopologyAuditModal(currentAuditFilter);
    modal.classList.add('open');
  }

export function closeTopologyAuditModal() {
    const modal = document.getElementById('modal-topology-audit');
    if (modal) modal.classList.remove('open');
  }


export function setAuditFilter(val) { currentAuditFilter = val; }
export function getAuditFilter() { return currentAuditFilter; }


// Registrar métodos en el contexto global de aplicación
app.simulateCablePing = simulateCablePing;
app.runTopologyAudit = runTopologyAudit;
app.renderTopologyAuditModal = renderTopologyAuditModal;
app.openTopologyAuditModal = openTopologyAuditModal;
app.closeTopologyAuditModal = closeTopologyAuditModal;
