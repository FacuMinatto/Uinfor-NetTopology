# Auditoría Técnica y Plan de Mejoras - NetTopology

**Fecha:** 15 de Octubre de 2026  
**Proyecto:** NetTopology (Uinfor)  
**Objetivo:** Auditoría integral de vulnerabilidades, bugs, rendimiento y plan de optimizaciones recomendadas (sin modificaciones directas al código fuente).

---

## 1. Resumen Ejecutivo

NetTopology es una plataforma de diseño y mapeo de topologías de red que incluye colaboración en tiempo real mediante WebRTC (PeerJS), persistencia local con IndexedDB y exportaciones a PDF/JSON. 

El análisis del código identifica fortalezas en modularidad, pero detecta áreas críticas que comprometen la estabilidad en sesiones prolongadas, seguridad ante entradas arbitrarias y rendimiento al escalar la cantidad de nodos y zonas.

---

## 2. Vulnerabilidades de Seguridad

### 2.1. Sanitización Inconsistente de Entradas (Riesgo XSS)
* **Ubicación:** `src/ui/modals.js`, `src/ui/inspector.js`, `src/ui/bom.js`, `src/export/exportPdf.js`.
* **Detalle:** Aunque existe una función utilitaria `escapeHtml()`, su aplicación no es homogénea en todas las interpolaciones de strings que terminan en el DOM. Si un usuario importa un archivo de topología manipulado (JSON) o recibe datos de un peer remoto con nombres de nodos o atributos maliciosos (`<script>` o `onerror=`), puede ejecutarse código arbitrario en el navegador del cliente.
* **Impacto:** Robo de estado local, inyección de scripts en sesiones compartidas.

### 2.2. Uso Extensivo de `innerHTML`
* **Ubicación:** `src/core/nodes.js`, `src/core/zones.js`, `src/core/sheets.js`, `src/collab/peer.js`.
* **Detalle:** La construcción dinámica de elementos SVG y HTML mediante asignación directa a `innerHTML` aumenta la superficie de ataque y obliga al navegador a parsear cadenas completas en cada cambio de estado.

---

## 3. Bugs Potenciales y Manejo de Estado

### 3.1. Condiciones de Carrera en la Persistencia (`src/storage/db.js`)
* **Detalle:** El guardado automático implementa un `saveTimeout` que debouncea las escrituras a IndexedDB. Si el usuario cierra la pestaña o realiza múltiples cambios rápidos mientras una transacción previa está en curso, pueden ocurrir escrituras solapadas o pérdida del último delta de cambios.
* **Riesgo:** Inconsistencia o corrupción en el almacenamiento local del proyecto.

### 3.2. Fugas de Memoria en Colaboración en Tiempo Real (`src/collab/peer.js`)
* **Detalle:** Se instancian múltiples temporizadores concurrentes (`cursorThrottleTimeout`, `remoteMoveDebounceTimer`, `saveTimeout`). Si un colaborador se desconecta abruptamente o la sesión WebRTC se reinicia, varios callbacks y referencias a peers no se destruyen formalmente.
* **Riesgo:** Pérdida de rendimiento progresiva tras horas de uso continuo o con múltiples conexiones entrantes/salientes.

### 3.3. Acumulación de Listeners en Arrastre (`src/core/nodes.js`)
* **Detalle:** En la lógica de `setupNodeDragEvents`, la suscripción a eventos `pointermove` y `pointerup` en `window` debe asegurar que bajo excepciones o deselecciones forzadas, los listeners se desechen siempre en el ciclo de limpieza.

### 3.4. Bucles de Retransmisión en Topología Mesh (`src/collab/peer.js`)
* **Detalle:** En `relayToOtherPeers`, si dos peers actúan simultáneamente como retransmisores y un paquete de mensaje no cuenta con un identificador único (nonce/UUID) con historial de deduplicación estricto, existe riesgo de tormenta de broadcast o duplicación de acciones en el canvas.

---

## 4. Rendimiento y Optimización

### 4.1. Sobrecarga del DOM en Renderizado Masivo
* **Detalle:** Cada actualización de nodos y enlaces recalcula y reinyecta elementos en el SVG/DOM sin técnicas de renderizado por lotes o virtualización de objetos fuera del viewport visible (culling).
* **Impacto:** Caída significativa de FPS al superar ~100 dispositivos o conexiones activas en pantalla.

### 4.2. Uso Excesivo de `setTimeout` vs `requestAnimationFrame`
* **Detalle:** Se utilizan temporizadores arbitrarios (`setTimeout(..., 50)`) para actualizar posiciones del cursor y movimientos remotos en lugar de sincronizarlos con la tasa de refresco del monitor mediante `requestAnimationFrame`.
* **Impacto:** Jittering visual (micro-tirones) y consumo innecesario de CPU en el hilo principal.

### 4.3. Historial Completo sin Deltas (`src/state/history.js`)
* **Detalle:** Cada acción almacena un snapshot completo del estado de la topología en la pila de deshacer/rehacer en lugar de guardar únicamente las operaciones diferenciales (patches).
* **Impacto:** Crecimiento exponencial del consumo de memoria RAM en proyectos extensos con cientos de acciones registradas.

### 4.4. Carga y Caché de Imágenes de Fondo (`src/core/underlay.js`)
* **Detalle:** Los planos y diagramas de fondo en alta resolución se mantienen en memoria sin liberación de URLs de blob (`URL.revokeObjectURL`) ni compresión previa en canvas.

---

## 5. Plan de Acción y Mejoras Recomendadas

### Fase 1: Blindaje de Seguridad (Prioridad Alta)
1. **Sanitizador Centralizado:** Crear un pipeline estricto donde todo texto recibido de usuarios o peers pase obligatoriamente por una función de escape antes de tocar el DOM.
2. **Validación de Esquema en Colaboración:** Validar los mensajes WebRTC entrantes contra un esquema estricto (rechazar mensajes con tipos o propiedades desconocidas).

### Fase 2: Estabilidad y Memoria (Prioridad Alta)
1. **Gestor Centralizado de Temporizadores:** Envolver `setTimeout` e `setInterval` en un registry descartable (`cleanup()`) al cerrar componentes o sesiones colaborativas.
2. **Flush sincrónico en cierre:** Escuchar el evento `beforeunload` para forzar un guardado inmediato y sincrónico en IndexedDB si hay cambios pendientes en `saveTimeout`.

### Fase 3: Optimización del Motor Gráfico (Prioridad Media)
1. **Adopción de `requestAnimationFrame`:** Migrar los throttles de movimiento de mouse, cursores remotos y arrastre de nodos a rAF.
2. **Historial basado en deltas:** Migrar el stack de deshacer/rehacer a mutaciones estructurales o limitar la profundidad máxima a un número controlado (ej. 30 estados).
3. **Viewport Culling:** Evitar recalcular nodos y cables que se encuentren completamente fuera del área visible actual del zoom/paneo.
