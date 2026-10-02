/**
 * NetTopology - Módulo src/export/exportPdf.js
 */

import { state, dom } from '../state/store.js';
import { app } from '../core/appContext.js';
import { DEVICE_ICONS, DEVICE_ICONS_LIGHT, DEVICE_METADATA, CABLE_TYPES, getDeviceIcon, generateSwitchPorts, generateRouterPorts } from '../config/icons.js';
import { STORAGE_PROJECTS_KEY, STORAGE_ACTIVE_ID_KEY, STORAGE_LEGACY_KEY, SHEET_PRESETS, ZONE_COLOR_PALETTES, MAX_HISTORY_STEPS, DEFAULT_GRID_SIZE } from '../config/constants.js';
import { escapeHtml, incrementIp, formatDateForFile, clamp, generateId } from '../utils/helpers.js';
import { getNodeGeometry } from '../core/nodes.js';
import { computeConnectionCurve, getPointAlongCable, applyCableBridgesToCurves } from '../core/cables.js';
import { getCurrentSheet } from '../core/sheets.js';
import { drawBadge, roundRect } from './exportSvg.js';



export function convertToMonochromeSvg(svgString) {
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

export function drawFallbackRoundedRect(ctx, x, y, width, height, radius) {
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

export function drawFallbackRoundedHeader(ctx, x, y, width, height, radius) {
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
export function escapeXml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  // Cuadro de Rotulación Técnico de Ingeniería (Title Block) en Canvas
export function drawTitleBlockOnCanvas(ctx, canvasW, canvasH, isMono, data = {}) {
    const pad = 16;
    const footerY = canvasH - 20;

    ctx.save();
    // Línea divisoria sutil al pie
    ctx.strokeStyle = isMono ? '#cbd5e1' : 'rgba(56, 189, 248, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, footerY);
    ctx.lineTo(canvasW - pad, footerY);
    ctx.stroke();

    // Texto técnico en una sola línea
    ctx.font = '600 8.5px "JetBrains Mono", Inter, monospace';
    ctx.fillStyle = isMono ? '#334155' : '#94a3b8';
    ctx.textBaseline = 'middle';

    const projName = (data.project || 'Topología de Red').trim();
    const sheetName = (data.sheet || 'Hoja 1').trim();
    const authorVal = (data.author || 'Ingeniería de Red').trim();
    const compVal = (data.company || 'Uinfor').trim();
    const dateVal = data.date || new Date().toLocaleDateString('es-ES');
    const verVal = (data.version || 'v1.0').trim();
    const scaleVal = (data.scale || '1:1').trim();

    ctx.textAlign = 'left';
    ctx.fillText(`${projName} › ${sheetName}  |  AUTOR: ${authorVal}  |  ORG: ${compVal}`, pad + 4, footerY + 10);

    ctx.textAlign = 'right';
    ctx.fillText(`FECHA: ${dateVal}  |  ${verVal} (${scaleVal})`, canvasW - pad - 4, footerY + 10);

    ctx.restore();
  }

  // ==========================================================================
  // GENERADOR NATIVO DE DOCUMENTOS PDF 1.4 A PARTIR DE CANVAS (ULTRARRÁPIDO Y ASÍNCRONO)
  // ==========================================================================
export async function downloadCanvasAsPdf(canvas, fileName, sheetPresetKey = 'a4_landscape') {
    // Conversión nativa directa sin atob() ni cadenas pesadas
    const jpegBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.96));
    const arrayBuffer = await jpegBlob.arrayBuffer();
    const jpegBytes = new Uint8Array(arrayBuffer);

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
  // GENERADOR NATIVO MULTI-PÁGINA PDF 1.4 (ASÍNCRONO, SIN BLOQUEO DE PANTALLA)
  // ==========================================================================
export async function downloadMultiPagePdf(slices, fileName, sheetPresetKey = 'a4_landscape', onProgress = null) {
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
      if (typeof onProgress === 'function') {
        onProgress(i, totalPages);
      }
      // Ceder el hilo para permitir que el navegador pinte el progreso sin trabarse
      await new Promise(r => setTimeout(r, 0));

      const slice = slices[i - 1];
      const sliceCanvas = slice.canvas;

      // Conversión asíncrona nativa ultrarrápida (en C++)
      const jpegBlob = await new Promise(resolve => sliceCanvas.toBlob(resolve, 'image/jpeg', 0.96));
      const arrayBuffer = await jpegBlob.arrayBuffer();
      const jpegBytes = new Uint8Array(arrayBuffer);

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

  // Cálculo automático del encuadre y cuadrícula multi-página inteligente basado en Zoom
export function calculateDiagramBoundingBox(mosaicChoice = 'auto', zoomFactor = null) {
    let bMinX = Infinity, bMinY = Infinity, bMaxX = -Infinity, bMaxY = -Infinity;
    if (Array.isArray(state.nodes) && state.nodes.length > 0) {
      state.nodes.forEach(n => {
        bMinX = Math.min(bMinX, n.x);
        bMinY = Math.min(bMinY, n.y - (n.encapsulatedLabels ? 25 : 35));
        const nodeW = n.type === 'transfer' ? 200 : (n.type === 'canal_tension_7' ? 270 : ((n.type === 'canal_tension_5' || n.type === 'canal_tension') ? 210 : (n.encapsulatedLabels ? 120 : 104)));
        bMaxX = Math.max(bMaxX, n.x + nodeW);
        bMaxY = Math.max(bMaxY, n.y + (n.encapsulatedLabels ? 130 : 110));
      });
    }
    if (Array.isArray(state.zones) && state.zones.length > 0) {
      state.zones.forEach(z => {
        bMinX = Math.min(bMinX, z.x);
        bMinY = Math.min(bMinY, z.y);
        bMaxX = Math.max(bMaxX, z.x + z.width);
        bMaxY = Math.max(bMaxY, z.y + z.height);
      });
    }
    if (Array.isArray(state.connections) && state.connections.length > 0) {
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
      bMinX = 0; bMinY = 0; bMaxX = 1123; bMaxY = 794;
    }
    // Margen perimetral limpio para encuadre
    const padding = 35;
    const minX = bMinX - padding;
    const minY = bMinY - padding;
    const width = Math.max((bMaxX + padding) - minX, 400);
    const height = Math.max((bMaxY + padding) - minY, 300);

    const aspect = width / height;
    const currSheet = getCurrentSheet();
    const isInfinite = !currSheet || currSheet.pageSize === 'infinite';
    const sheetW = currSheet?.pageWidth || 1123;
    const sheetH = currSheet?.pageHeight || 794;

    const zoom = (typeof zoomFactor === 'number' && zoomFactor > 0)
      ? zoomFactor
      : (parseFloat(document.getElementById('inp-export-elem-scale')?.value || '1.25') || 1.25);

    let cols = 1, rows = 1;

    if (mosaicChoice === '1x1') {
      cols = 1; rows = 1;
    } else if (mosaicChoice === '2x1') {
      cols = 2; rows = 1;
    } else if (mosaicChoice === '1x2') {
      cols = 1; rows = 2;
    } else if (mosaicChoice === '2x2') {
      cols = 2; rows = 2;
    } else if (mosaicChoice === '2x3') {
      cols = 2; rows = 3;
    } else if (mosaicChoice === '3x2') {
      cols = 3; rows = 2;
    } else if (mosaicChoice === '3x3') {
      cols = 3; rows = 3;
      // Detección automática en base al tamaño escalado por el zoom:
      // Capacidad de 1 hoja A4 con márgenes y línea de rótulo:
      const sheetCapW = 1080;
      const sheetCapH = 740;

      const targetW = width * zoom;
      const targetH = height * zoom;

      // Calcular cantidad de hojas limitando estrictamente a un máximo de 3 columnas y 3 filas (máx 9 hojas)
      cols = Math.max(1, Math.min(Math.ceil(targetW / sheetCapW), 3));
      rows = Math.max(1, Math.min(Math.ceil(targetH / sheetCapH), 3));

      // Si cols x rows es 1 pero el diagrama o zoom son amplios, equilibrar a 2 hojas según la orientación
      if (cols === 1 && rows === 1 && (targetW > 1050 || targetH > 720)) {
        if (aspect >= 1.2) {
          cols = 2; rows = 1;
        } else if (aspect <= 0.8) {
          cols = 1; rows = 2;
        } else {
          cols = 2; rows = 2;
        }
      }
    }

    const totalPages = cols * rows;
    return { minX, minY, width, height, cols, rows, totalPages, aspect, isInfinite, sheetW, sheetH, zoom };
  }

  // Actualizar indicadores y textos del modal de exportación
export function updateExportPagingUI() {
    const inpFormat = document.getElementById('inp-export-format');
    const isPdf = (!inpFormat || inpFormat.value === 'pdf');
    const groupPaging = document.getElementById('group-export-paging');
    if (groupPaging) {
      groupPaging.style.display = isPdf ? 'block' : 'none';
    }

    const inpPaging = document.getElementById('inp-export-paging');
    const pagingMode = inpPaging ? inpPaging.value : 'single';
    const selMosaicGrid = document.getElementById('sel-mosaic-grid');
    const mosaicChoice = selMosaicGrid ? selMosaicGrid.value : 'auto';
    const wrapMosaicSelect = document.getElementById('wrap-mosaic-grid-select');

    if (wrapMosaicSelect) {
      wrapMosaicSelect.style.display = (isPdf && pagingMode === 'multi') ? 'block' : 'none';
    }

    const currentZoom = parseFloat(document.getElementById('inp-export-elem-scale')?.value || '1.25') || 1.25;
    const grid = calculateDiagramBoundingBox(mosaicChoice, currentZoom);
    const badgeGrid = document.getElementById('badge-multipage-grid');
    const hintDesc = document.getElementById('hint-multipage-desc');
    const lblMultiTitle = document.getElementById('lbl-paging-multi-title');
    const lblAllSheetsTitle = document.getElementById('lbl-paging-all-sheets-title');
    const panelInfo = document.getElementById('panel-multipage-info');
    const lblConfirm = document.getElementById('lbl-confirm-export-text');
    const lblHeadline = document.getElementById('lbl-paging-info-headline');

    const totalSheets = (Array.isArray(state.sheets) && state.sheets.length > 0) ? state.sheets.length : 1;
    if (lblAllSheetsTitle) {
      lblAllSheetsTitle.textContent = `Todas las Hojas (${totalSheets} pág${totalSheets > 1 ? 's' : ''})`;
    }
    if (lblMultiTitle) {
      lblMultiTitle.textContent = `Mosaico Extenso`;
    }

    if (badgeGrid) {
      if (pagingMode === 'all-sheets') {
        badgeGrid.textContent = `${totalSheets} Hoja${totalSheets > 1 ? 's' : ''}`;
      } else if (pagingMode === 'multi') {
        if (grid.totalPages === 1) {
          badgeGrid.textContent = '1 Hoja (Completo)';
        } else {
          badgeGrid.textContent = `${grid.totalPages} Hojas (${grid.cols}×${grid.rows})`;
        }
      } else {
        badgeGrid.textContent = '1 Página';
      }
    }

    if (lblHeadline) {
      if (pagingMode === 'all-sheets') {
        lblHeadline.textContent = 'Exportación de solapas completas';
      } else if (pagingMode === 'multi') {
        if (grid.totalPages === 1) {
          lblHeadline.textContent = grid.isInfinite ? 'Diagrama cabe en 1 hoja A4' : 'Diagrama cabe en la hoja actual';
        } else {
          lblHeadline.textContent = `Mosaico Continuo al 100% de Hoja (Zoom ${Math.round(grid.zoom * 100)}%)`;
        }
      } else {
        lblHeadline.textContent = 'Encuadre exacto de hoja activa';
      }
    }

    if (hintDesc) {
      if (pagingMode === 'all-sheets') {
        hintDesc.textContent = `Genera un único documento PDF con ${totalSheets} página${totalSheets > 1 ? 's' : ''}, una por cada hoja o solapa de este proyecto.`;
      } else if (pagingMode === 'multi') {
        if (grid.totalPages === 1) {
          hintDesc.textContent = grid.isInfinite
            ? `Tu diagrama cabe óptimamente en 1 sola hoja (${Math.round(grid.width)}×${Math.round(grid.height)}px). Se exporta en 1 página completa sin dividirlo innecesariamente. Si deseas forzar un mosaico, selecciona otra distribución en la lista.`
            : `La hoja activa tiene tamaño fijo y el diagrama está contenido en ella (${Math.round(grid.width)}×${Math.round(grid.height)}px). Se exporta en 1 página limpia sin divisiones innecesarias.`;
        } else {
          hintDesc.textContent = `El diagrama se proyecta en ${grid.cols}×${grid.rows} (${grid.totalPages} hojas A4) con zoom ${Math.round(grid.zoom * 100)}% de forma continua para unión limpia. Incluye vista general tenue en la esquina superior derecha y cajetín de rotulación en la última hoja.`;
        }
      } else {
        hintDesc.textContent = 'Exporta la hoja actualmente seleccionada en 1 sola página nítida de alta resolución, perfectamente encuadrada.';
      }
    }

    if (panelInfo) {
      panelInfo.style.display = isPdf ? 'block' : 'none';
    }

    if (lblConfirm) {
      if (!isPdf) {
        lblConfirm.textContent = `Descargar ${inpFormat ? inpFormat.value.toUpperCase() : 'Archivo'}`;
      } else if (pagingMode === 'all-sheets') {
        lblConfirm.textContent = `Descargar PDF (${totalSheets} pág${totalSheets > 1 ? 's' : ''})`;
      } else if (pagingMode === 'multi') {
        if (grid.totalPages === 1) {
          lblConfirm.textContent = 'Descargar PDF (1 pág)';
        } else {
          lblConfirm.textContent = `Descargar PDF (${grid.totalPages} Hojas Mosaico)`;
        }
      } else {
        lblConfirm.textContent = 'Descargar PDF (1 pág)';
      }
    }
  }

  // Exportar el lienzo a documento PDF o imagen (Modo Impresión Blanco y Negro o Modo Oscuro)
export function exportDiagramCanvas(theme = 'monochrome', includeGrid = false, includeTitleBlock = false, titleBlockData = null, exportFormat = 'pdf', exportScale = 3, exportPaging = 'single', onCanvasReady = null, mosaicGridChoice = 'auto', elemScale = 1.25, onProgress = null) {
    if ((!state.nodes || state.nodes.length === 0) && (!Array.isArray(state.zones) || state.zones.length === 0)) {
      alert('El diagrama está vacío. Agrega algunos equipos o zonas antes de exportar.');
      return;
    }

    const isMono = theme === 'monochrome';
    const currSheet = getCurrentSheet();
    const useSheetBounds = currSheet && currSheet.pageSize !== 'infinite' && dom.chkExportSheetBounds && dom.chkExportSheetBounds.checked && exportPaging !== 'multi';

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

      const padding = (exportPaging === 'multi') ? 35 : 55;
      minX = bMinX - padding;
      minY = bMinY - padding;
      width = (bMaxX + padding) - minX;
      height = (bMaxY + padding) - minY;

      if (includeTitleBlock && exportPaging !== 'multi') {
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

    // Dibujar Plano Arquitectónico / Imagen de Fondo (Underlay)
    if (state.underlay && state.underlay.src && state.underlay.visible !== false) {
      try {
        const u = state.underlay;
        const uImg = new Image();
        uImg.src = u.src;
        if (uImg.complete && uImg.naturalWidth > 0) {
          const uScale = (u.scale || 100) / 100;
          const ux = (u.x || 0) - minX;
          const uy = (u.y || 0) - minY;
          const uw = Math.round((u.width || uImg.naturalWidth) * uScale);
          const uh = Math.round((u.height || uImg.naturalHeight) * uScale);
          ctx.save();
          ctx.globalAlpha = (typeof u.opacity === 'number' ? u.opacity : 40) / 100;
          ctx.drawImage(uImg, ux, uy, uw, uh);
          ctx.restore();
        }
      } catch (err) {
        console.warn('Error al exportar underlay en canvas:', err);
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
            drawBadge(ctx, b.text, b.x, b.y, '#ffffff', '#0284c7', '#0369a1', false, 1);
          } else {
            drawBadge(ctx, b.text, b.x, b.y, '#090d16', '#38bdf8', '#38bdf8', false, 1);
          }
        } else {
          if (isMono) {
            drawBadge(ctx, b.text, b.x, b.y, '#fffbeb', '#d97706', '#b45309', true, 1);
          } else {
            drawBadge(ctx, b.text, b.x, b.y, '#78350f', '#f59e0b', '#f59e0b', false, 1);
          }
        }
      });
    }

    async function finishExport() {
      renderAllExportBadges();
      if (includeTitleBlock && titleBlockData && exportPaging !== 'multi') {
        drawTitleBlockOnCanvas(ctx, width, height, isMono, titleBlockData);
      }

      if (typeof onCanvasReady === 'function') {
        onCanvasReady(canvas);
        if (typeof onExportComplete === 'function') onExportComplete();
        return;
      }

      const dateStr = formatDateForFile(new Date());
      const themeStr = isMono ? 'impresion_bn' : 'digital';

      if (exportFormat === 'pdf' && exportPaging === 'multi') {
        const zoom = Number(elemScale) || 1.25;
        const grid = calculateDiagramBoundingBox(mosaicGridChoice, zoom);
        const cols = grid.cols;
        const rows = grid.rows;

        const PAGE_W = 1123;
        const PAGE_H = 794;
        const OUTER_PAD = 16; // Margen exterior limpio únicamente en el perímetro del plano armado

        // Dimensiones totales del plano armado continuo
        const totalBlueprintW = cols * PAGE_W;
        const totalBlueprintH = rows * PAGE_H;

        const printableTotalW = totalBlueprintW - (OUTER_PAD * 2);
        const printableTotalH = totalBlueprintH - (OUTER_PAD * 2);

        // Escala uniforme para todo el plano (mismo tamaño en todas las hojas para continuidad matemática perfecta)
        const baseFitScale = Math.min(printableTotalW / width, printableTotalH / height);
        const fitScale = baseFitScale;
        const renderedW = width * fitScale;
        const renderedH = height * fitScale;

        // Centrado del diagrama dentro del plano total armado
        const blueprintOriginX = OUTER_PAD + (printableTotalW - renderedW) / 2;
        const blueprintOriginY = OUTER_PAD + (printableTotalH - renderedH) / 2;

        const projTitle = (state.projectName || titleBlockData?.project || 'Topología de Red').trim();
        const sheetTitle = (currSheet?.name || titleBlockData?.sheet || 'Hoja 1').trim();
        const authorName = (titleBlockData?.author || 'Ingeniería de Red').trim();
        const compName = (titleBlockData?.company || 'Uinfor').trim();
        const dateStrVal = titleBlockData?.date || new Date().toLocaleDateString('es-ES');
        const verVal = titleBlockData?.version || 'v1.0';
        const scaleVal = titleBlockData?.scale || '1:1';

        // 1. Matriz de detección de contenido para cada cuadrante (r, c)
        const quadrantMatrix = [];
        for (let r = 0; r < rows; r++) {
          quadrantMatrix[r] = [];
          for (let c = 0; c < cols; c++) {
            const sheetBlueprintX0 = c * PAGE_W;
            const sheetBlueprintY0 = r * PAGE_H;
            const sheetBlueprintX1 = (c + 1) * PAGE_W;
            const sheetBlueprintY1 = (r + 1) * PAGE_H;

            // Rango en coordenadas del canvas de diagrama
            const canvasX0 = (sheetBlueprintX0 - blueprintOriginX) / fitScale;
            const canvasY0 = (sheetBlueprintY0 - blueprintOriginY) / fitScale;
            const canvasX1 = (sheetBlueprintX1 - blueprintOriginX) / fitScale;
            const canvasY1 = (sheetBlueprintY1 - blueprintOriginY) / fitScale;

            const cellWorldX0 = minX + canvasX0;
            const cellWorldY0 = minY + canvasY0;
            const cellWorldX1 = minX + canvasX1;
            const cellWorldY1 = minY + canvasY1;

            const qPad = 40;
            const hasNode = (state.nodes || []).some(n => {
              const nw = n.type === 'transfer' ? 200 : (n.type === 'canal_tension_7' ? 270 : ((n.type === 'canal_tension_5' || n.type === 'canal_tension') ? 210 : 130));
              const nh = 130;
              return (n.x + nw >= cellWorldX0 - qPad && n.x <= cellWorldX1 + qPad && n.y + nh >= cellWorldY0 - qPad && n.y <= cellWorldY1 + qPad);
            });

            const hasZone = (state.zones || []).some(z => {
              return (z.x + (z.width || 200) >= cellWorldX0 - qPad && z.x <= cellWorldX1 + qPad && z.y + (z.height || 150) >= cellWorldY0 - qPad && z.y <= cellWorldY1 + qPad);
            });

            const hasConn = (state.connections || []).some(conn => {
              const na = state.nodes.find(n => n.id === conn.fromNodeId);
              const nb = state.nodes.find(n => n.id === conn.toNodeId);
              if (!na || !nb) return false;
              if ((na.x + 130 >= cellWorldX0 && na.x <= cellWorldX1 && na.y + 130 >= cellWorldY0 && na.y <= cellWorldY1) ||
                  (nb.x + 130 >= cellWorldX0 && nb.x <= cellWorldX1 && nb.y + 130 >= cellWorldY0 && nb.y <= cellWorldY1)) {
                return true;
              }
              for (let t = 0; t <= 1; t += 0.08) {
                const px = na.x + (nb.x - na.x) * t + 50;
                const py = na.y + (nb.y - na.y) * t + 40;
                if (px >= cellWorldX0 && px <= cellWorldX1 && py >= cellWorldY0 && py <= cellWorldY1) {
                  return true;
                }
              }
              return false;
            });

            const hasBadge = (exportBadges || []).some(b => {
              const bx = minX + b.x;
              const by = minY + b.y;
              return (bx >= cellWorldX0 && bx <= cellWorldX1 && by >= cellWorldY0 && by <= cellWorldY1);
            });

            const isLastQuadrantCell = (r === rows - 1 && c === cols - 1);
            const hasContent = (cols === 1 && rows === 1) || (cols * rows <= 4) || (mosaicGridChoice !== 'auto') || (isLastQuadrantCell && includeTitleBlock) || hasNode || hasZone || hasConn || hasBadge;
            quadrantMatrix[r][c] = {
              r, c,
              sheetBlueprintX0, sheetBlueprintY0,
              sheetBlueprintX1, sheetBlueprintY1,
              hasContent
            };
          }
        }

        // 2. Páginas a exportar (omitiendo cuadrantes vacíos si la cuadrícula es muy extensa)
        const pagesToExport = [];
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (quadrantMatrix[r][c].hasContent) {
              pagesToExport.push(quadrantMatrix[r][c]);
            }
          }
        }
        if (pagesToExport.length === 0) {
          pagesToExport.push(quadrantMatrix[0][0]);
        }

        const totalPages = pagesToExport.length;
        const slices = [];

        for (let idx = 0; idx < pagesToExport.length; idx++) {
          if (idx > 0 && idx % 2 === 0) {
            await new Promise(r => setTimeout(r, 10));
          }
          const q = pagesToExport[idx];
          const curPage = idx + 1;
          const { r, c } = q;

          const isTopEdge = (r === 0);
          const isBottomEdge = (r === rows - 1);
          const isLeftEdge = (c === 0);
          const isRightEdge = (c === cols - 1);

          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = Math.round(PAGE_W * scaleFactor);
          sliceCanvas.height = Math.round(PAGE_H * scaleFactor);
          const sCtx = sliceCanvas.getContext('2d', { alpha: false });
          sCtx.imageSmoothingEnabled = true;
          sCtx.imageSmoothingQuality = 'high';
          sCtx.scale(scaleFactor, scaleFactor);

          // Fondo
          sCtx.fillStyle = isMono ? '#ffffff' : '#090d16';
          sCtx.fillRect(0, 0, PAGE_W, PAGE_H);

          // Recorte continuo: margen OUTER_PAD únicamente en el perímetro exterior del plano total; uniones interiores continuas
          const clipLeft = isLeftEdge ? OUTER_PAD : 0;
          const clipRight = isRightEdge ? (PAGE_W - OUTER_PAD) : PAGE_W;
          const clipTop = isTopEdge ? OUTER_PAD : 0;
          const clipBottom = isBottomEdge ? (PAGE_H - OUTER_PAD) : PAGE_H;

          // Dibujo continuo del diagrama a 100% de la hoja para ensamble perfecto
          sCtx.save();
          sCtx.beginPath();
          sCtx.rect(clipLeft, clipTop, clipRight - clipLeft, clipBottom - clipTop);
          sCtx.clip();

          const destX = blueprintOriginX - (c * PAGE_W);
          const destY = blueprintOriginY - (r * PAGE_H);
          const destW = renderedW;
          const destH = renderedH;

          sCtx.drawImage(
            canvas,
            0, 0, canvas.width, canvas.height,
            Math.round(destX), Math.round(destY), Math.round(destW), Math.round(destH)
          );
          sCtx.restore();

          // Marco técnico perimetral (solo en bordes exteriores reales del plano total armado)
          const frameBorderCol = isMono ? '#0f172a' : '#38bdf8';
          sCtx.save();
          sCtx.strokeStyle = frameBorderCol;
          sCtx.lineWidth = 1.5;

          if (isTopEdge) {
            sCtx.beginPath();
            sCtx.moveTo(clipLeft, OUTER_PAD);
            sCtx.lineTo(clipRight, OUTER_PAD);
            sCtx.stroke();
          }
          if (isBottomEdge) {
            sCtx.beginPath();
            sCtx.moveTo(clipLeft, PAGE_H - OUTER_PAD);
            sCtx.lineTo(clipRight, PAGE_H - OUTER_PAD);
            sCtx.stroke();
          }
          if (isLeftEdge) {
            sCtx.beginPath();
            sCtx.moveTo(OUTER_PAD, clipTop);
            sCtx.lineTo(OUTER_PAD, clipBottom);
            sCtx.stroke();
          }
          if (isRightEdge) {
            sCtx.beginPath();
            sCtx.moveTo(PAGE_W - OUTER_PAD, clipTop);
            sCtx.lineTo(PAGE_W - OUTER_PAD, clipBottom);
            sCtx.stroke();
          }
          sCtx.restore();

          // VISTA GENERAL (MINIMAPA SUTIL SIN TEXTO EN ESQUINA SUPERIOR DERECHA)
          if (cols > 1 || rows > 1) {
            const cellW = 12;
            const cellH = 8.5;
            const pad = 3;
            const mmW = (cols * cellW) + (pad * 2);
            const mmH = (rows * cellH) + (pad * 2);

            const mmRight = isRightEdge ? (PAGE_W - OUTER_PAD - 4) : (PAGE_W - 10);
            const mmTop = isTopEdge ? (OUTER_PAD + 4) : 10;
            const mmX = mmRight - mmW;
            const mmY = mmTop;

            sCtx.save();
            // Recuadro tenue de fondo
            sCtx.fillStyle = isMono ? 'rgba(255, 255, 255, 0.75)' : 'rgba(15, 23, 42, 0.75)';
            sCtx.strokeStyle = isMono ? 'rgba(203, 213, 225, 0.5)' : 'rgba(56, 189, 248, 0.2)';
            sCtx.lineWidth = 0.75;
            roundRect(sCtx, mmX, mmY, mmW, mmH, 3, true, true);

            for (let mr = 0; mr < rows; mr++) {
              for (let mc = 0; mc < cols; mc++) {
                const cx = mmX + pad + (mc * cellW);
                const cy = mmY + pad + (mr * cellH);
                const isCurrentSheet = (mr === r && mc === c);

                if (isCurrentSheet) {
                  // Hoja activa resaltada sutilmente sin texto
                  sCtx.fillStyle = isMono ? 'rgba(71, 85, 105, 0.4)' : 'rgba(56, 189, 248, 0.35)';
                  sCtx.fillRect(cx + 1, cy + 1, cellW - 2, cellH - 2);
                  sCtx.strokeStyle = isMono ? 'rgba(51, 65, 85, 0.65)' : 'rgba(56, 189, 248, 0.7)';
                  sCtx.lineWidth = 1;
                  sCtx.strokeRect(cx + 1, cy + 1, cellW - 2, cellH - 2);
                } else {
                  // Otras hojas en tono muy tenue
                  sCtx.fillStyle = isMono ? 'rgba(241, 245, 249, 0.3)' : 'rgba(255, 255, 255, 0.03)';
                  sCtx.fillRect(cx + 1, cy + 1, cellW - 2, cellH - 2);
                  sCtx.strokeStyle = isMono ? 'rgba(203, 213, 225, 0.55)' : 'rgba(255, 255, 255, 0.12)';
                  sCtx.lineWidth = 0.6;
                  sCtx.strokeRect(cx + 1, cy + 1, cellW - 2, cellH - 2);
                }
              }
            }
            sCtx.restore();
          }

          // RÓTULO TÉCNICO EN LA ÚLTIMA HOJA DE ABAJO A LA DERECHA (UN SOLO CUADRADITO)
          const isLastQuadrant = (r === rows - 1 && c === cols - 1);
          if (isLastQuadrant && includeTitleBlock) {
            const boxW = 270;
            const boxH = 64;
            const boxX = PAGE_W - OUTER_PAD - boxW;
            const boxY = PAGE_H - OUTER_PAD - boxH;

            sCtx.save();
            // Fondo opaco para evitar interferencia con elementos de fondo
            sCtx.fillStyle = isMono ? '#ffffff' : '#090d16';
            sCtx.fillRect(boxX, boxY, boxW, boxH);

            // Borde exterior del cajetín
            sCtx.strokeStyle = isMono ? '#0f172a' : '#38bdf8';
            sCtx.lineWidth = 1.25;
            sCtx.strokeRect(boxX, boxY, boxW, boxH);

            // Líneas divisorias internas
            sCtx.strokeStyle = isMono ? '#cbd5e1' : 'rgba(56, 189, 248, 0.3)';
            sCtx.lineWidth = 1;

            sCtx.beginPath();
            sCtx.moveTo(boxX, boxY + 24);
            sCtx.lineTo(boxX + boxW, boxY + 24);
            sCtx.stroke();

            sCtx.beginPath();
            sCtx.moveTo(boxX, boxY + 44);
            sCtx.lineTo(boxX + boxW, boxY + 44);
            sCtx.stroke();

            // Fila 1: Título del Proyecto y Organización
            sCtx.font = 'bold 9.5px Inter, -apple-system, sans-serif';
            sCtx.fillStyle = isMono ? '#0f172a' : '#f8fafc';
            sCtx.textAlign = 'left';
            sCtx.textBaseline = 'middle';
            const displayTitle = projTitle.length > 26 ? projTitle.substring(0, 24) + '…' : projTitle;
            sCtx.fillText(displayTitle, boxX + 8, boxY + 12);

            sCtx.font = 'bold 8.5px "JetBrains Mono", monospace';
            sCtx.fillStyle = isMono ? '#0284c7' : '#38bdf8';
            sCtx.textAlign = 'right';
            const displayComp = compName.length > 14 ? compName.substring(0, 12) + '…' : compName;
            sCtx.fillText(displayComp, boxX + boxW - 8, boxY + 12);

            // Fila 2: Autor y Versión / Escala
            sCtx.font = '500 7.5px "JetBrains Mono", monospace';
            sCtx.fillStyle = isMono ? '#334155' : '#94a3b8';
            sCtx.textAlign = 'left';
            sCtx.fillText(`AUTOR: ${authorName}`, boxX + 8, boxY + 34);

            sCtx.textAlign = 'right';
            sCtx.fillText(`VER: ${verVal}  |  ESC: ${scaleVal}`, boxX + boxW - 8, boxY + 34);

            // Fila 3: Fecha y Formato de Mosaico
            sCtx.font = '500 7px "JetBrains Mono", monospace';
            sCtx.fillStyle = isMono ? '#64748b' : '#64748b';
            sCtx.textAlign = 'left';
            sCtx.fillText(`FECHA: ${dateStrVal}`, boxX + 8, boxY + 54);

            sCtx.textAlign = 'right';
            const sheetDesc = (totalPages > 1)
              ? `PLANO MOSAICO (${cols}×${rows} • ${totalPages} HOJAS)`
              : `HOJA ${sheetTitle}`;
            sCtx.fillText(sheetDesc, boxX + boxW - 8, boxY + 54);

            sCtx.restore();
          }

          slices.push({
            canvas: sliceCanvas,
            pageNum: curPage,
            totalPages
          });
        }

        const fileName = (totalPages === 1)
          ? `plano_topologia_${themeStr}_${dateStr}.pdf`
          : `plano_mosaico_${cols}x${rows}_${themeStr}_${dateStr}.pdf`;
        await downloadMultiPagePdf(slices, fileName, 'a4_landscape', onProgress);
      } else if (exportFormat === 'pdf') {
        const fileName = `plano_topologia_${themeStr}_${dateStr}.pdf`;
        const presetKey = currSheet?.pageSize || 'a4_landscape';
        await downloadCanvasAsPdf(canvas, fileName, presetKey);
      } else {
        canvas.toBlob((blob) => {
          if (!blob) return;
          const pngUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = pngUrl;
          a.download = `topologia_${themeStr}_${dateStr}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(pngUrl), 2000);
        }, 'image/png');
      }

      if (typeof onExportComplete === 'function') {
        onExportComplete();
      }
    }

    // Dibujar nodos con escala configurable y pre-carga ultra-rápida de iconos únicos
    const totalNodes = state.nodes.length;

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

    // Pre-carga paralela ultra-rápida de iconos únicos para evitar congelamiento de pantalla
    const nonBadgeNodes = state.nodes.filter(n => n.type !== 'text_badge');
    const uniqueTypes = [...new Set(nonBadgeNodes.map(n => n.type))];
    const iconImages = new Map();

    async function preloadUniqueIcons() {
      const promises = uniqueTypes.map(type => {
        return new Promise(resolve => {
          let svgString = typeof getDeviceIcon === 'function' ? getDeviceIcon(type, isMono || state.theme === 'light') : (DEVICE_ICONS[type] || DEVICE_ICONS.pc);
          const targetW = Math.round(50 * scaleFactor * 2);
          const targetH = Math.round(50 * scaleFactor * 2);
          svgString = svgString.replace(/<svg\b([^>]*)>/i, (match, attrs) => {
            const clean = attrs.replace(/\bwidth="[^"]*"/gi, '').replace(/\bheight="[^"]*"/gi, '');
            return `<svg${clean} width="${targetW}" height="${targetH}">`;
          });
          const img = new Image();
          const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
          const url = URL.createObjectURL(svgBlob);
          img.onload = () => {
            iconImages.set(type, img);
            URL.revokeObjectURL(url);
            resolve();
          };
          img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve();
          };
          img.src = url;
        });
      });
      await Promise.all(promises);
    }

    function renderAllNodesOnCanvas() {
      state.nodes.forEach(node => {
        const nx = node.x - minX;
        const ny = node.y - minY;
        const scale = node.scale || 1;

        if (node.type === 'text_badge') {
          const textVal = (node.ip || node.name || '192.168.1.0/24').trim();
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

        // Sombra y caja del icono
        ctx.save();
        ctx.translate(nx + origX, ny + origY);
        ctx.scale(scale, scale);
        ctx.translate(-origX, -origY);

        ctx.save();
        ctx.shadowColor = isMono ? 'rgba(0, 0, 0, 0.08)' : 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 3;
        ctx.fillStyle = isMono ? '#ffffff' : '#1e293b';
        ctx.strokeStyle = isMono ? '#0f172a' : 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = isMono ? 1.8 : 1.5;
        roundRect(ctx, boxX, boxY, boxW, boxH, boxRx, true, true);
        ctx.restore();

        // Icono pre-cargado
        const cachedImg = iconImages.get(node.type);
        if (cachedImg) {
          ctx.drawImage(cachedImg, imgX, imgY, imgW, imgH);
        }

        // Recuadros de nombre e IP
        if (node.encapsulatedLabels) {
          drawNodeEncapsulatedOnCanvas(ctx, node, isMono, boxW, boxH);
        } else {
          drawNodeLabelsOnCanvas(ctx, node, isMono);
        }

        ctx.restore();
      });
    }

    if (totalNodes === 0) {
      finishExport();
    } else {
      preloadUniqueIcons().then(() => {
        renderAllNodesOnCanvas();
        finishExport();
      });
    }
  }

export function exportAllProjectSheetsPdf(theme = 'monochrome', includeGrid = false, includeTitleBlock = false, titleBlockData = null, exportScale = 3, elemScale = 1.25, onProgress = null) {
    const origSheet = getCurrentSheet();
    if (origSheet) {
      origSheet.nodes = state.nodes;
      origSheet.connections = state.connections;
      origSheet.zones = state.zones || [];
      origSheet.viewport = { ...state.viewport };
    }

    const sheets = (Array.isArray(state.sheets) && state.sheets.length > 0) ? state.sheets : [origSheet || { name: 'Hoja 1', nodes: state.nodes, connections: state.connections, zones: state.zones }];
    const isMono = theme === 'monochrome';
    const dateStr = formatDateForFile(new Date());
    const themeStr = isMono ? 'impresion_bn' : 'digital';
    const slices = [];
    let idx = 0;

    const savedActiveId = state.activeSheetId;
    const savedNodes = state.nodes;
    const savedConns = state.connections;
    const savedZones = state.zones;

    function renderNextSheet() {
      if (idx >= sheets.length) {
        // Restaurar estado activo original
        state.activeSheetId = savedActiveId;
        state.nodes = savedNodes;
        state.connections = savedConns;
        state.zones = savedZones;

        if (slices.length === 0) {
          alert('El proyecto no contiene elementos en sus hojas para exportar.');
          return;
        }

        // Actualizar numeración real tras descartar hojas vacías
        slices.forEach((s, i) => {
          s.pageNum = i + 1;
          s.totalPages = slices.length;
        });

        const projName = (state.projectName || 'topologia').replace(/\s+/g, '_');
        const fileName = `proyecto_${projName}_todas_hojas_${themeStr}_${dateStr}.pdf`;
        downloadMultiPagePdf(slices, fileName, 'a4_landscape', onProgress);
        return;
      }

      const s = sheets[idx];
      state.activeSheetId = s.id;
      state.nodes = s.nodes || [];
      state.connections = s.connections || [];
      state.zones = s.zones || [];

      // Si una hoja está vacía, no imprimir hojas vacías de más
      if (state.nodes.length === 0 && state.zones.length === 0) {
        idx++;
        renderNextSheet();
        return;
      }

      const sheetData = { ...titleBlockData, sheet: s.name || `Hoja ${idx + 1}` };

      exportDiagramCanvas(theme, includeGrid, includeTitleBlock, sheetData, 'custom_callback', exportScale, 'single', (sheetCanvas) => {
        slices.push({
          canvas: sheetCanvas,
          pageNum: idx + 1,
          totalPages: sheets.length
        });
        idx++;
        if (typeof onProgress === 'function') {
          onProgress(idx, sheets.length);
        }
        renderNextSheet();
      }, 'auto', elemScale);
    }

    renderNextSheet();
  }

export function exportDiagramPdf(theme = 'monochrome', includeGrid = false, includeTitleBlock = false, titleBlockData = null, exportScale = 3, exportPaging = 'single', mosaicGridChoice = 'auto', elemScale = 1.25, onProgress = null) {
    if (exportPaging === 'all-sheets') {
      exportAllProjectSheetsPdf(theme, includeGrid, includeTitleBlock, titleBlockData, exportScale, elemScale, onProgress);
      return;
    }
    exportDiagramCanvas(theme, includeGrid, includeTitleBlock, titleBlockData, 'pdf', exportScale, exportPaging, null, mosaicGridChoice, elemScale, onProgress);
  }

export function exportDiagramPng(theme = 'monochrome', includeGrid = false, includeTitleBlock = false, titleBlockData = null, exportScale = 3, elemScale = 1.25) {
    exportDiagramCanvas(theme, includeGrid, includeTitleBlock, titleBlockData, 'png', exportScale, 'single', null, 'auto', elemScale);
  }


// Registrar métodos en el contexto global de aplicación
app.convertToMonochromeSvg = convertToMonochromeSvg;
app.drawFallbackRoundedRect = drawFallbackRoundedRect;
app.drawFallbackRoundedHeader = drawFallbackRoundedHeader;
app.escapeXml = escapeXml;
app.drawTitleBlockOnCanvas = drawTitleBlockOnCanvas;
app.downloadCanvasAsPdf = downloadCanvasAsPdf;
app.downloadMultiPagePdf = downloadMultiPagePdf;
app.calculateDiagramBoundingBox = calculateDiagramBoundingBox;
app.updateExportPagingUI = updateExportPagingUI;
app.exportDiagramCanvas = exportDiagramCanvas;
app.exportAllProjectSheetsPdf = exportAllProjectSheetsPdf;
app.exportDiagramPdf = exportDiagramPdf;
app.exportDiagramPng = exportDiagramPng;
