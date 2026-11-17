// Iconos vectoriales SVG 2.5D Técnico Unificado para dispositivos de red

function makeRouterSvg(p, { topA, topB, sideA, sideB, stroke, portFill, ledA, ledB }) {
  return `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="${p}-top" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${topA}"/>
          <stop offset="100%" stop-color="${topB}"/>
        </linearGradient>
        <linearGradient id="${p}-side" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${sideA}"/>
          <stop offset="100%" stop-color="${sideB}"/>
        </linearGradient>
      </defs>
      <path d="M6 19V31C6 35.4 14.1 39 24 39C33.9 39 42 35.4 42 31V19H6Z" fill="url(#${p}-side)" stroke="${stroke}" stroke-width="1.6"/>
      <ellipse cx="24" cy="19" rx="18" ry="8.5" fill="url(#${p}-top)" stroke="${stroke}" stroke-width="1.6"/>
      <path d="M20.5 17.5L15 17.3L16.5 16.2L12.5 14.2L14.5 13.2L18.5 15.2L20 14.1Z" fill="#ffffff"/>
      <path d="M27.5 20.5L33 20.7L31.5 21.8L35.5 23.8L33.5 24.8L29.5 22.8L28 23.9Z" fill="#ffffff"/>
      <path d="M34 14.2L30 16.2L31.5 17.3L26 17.5L26.5 14.1L28 15.2L32 13.2Z" fill="#ffffff"/>
      <path d="M14 23.8L18 21.8L16.5 20.7L22 20.5L21.5 23.9L20 22.8L16 24.8Z" fill="#ffffff"/>
      <circle cx="15" cy="32.5" r="1.3" fill="${ledA}"/>
      <circle cx="19.5" cy="33.1" r="1.3" fill="${ledB}"/>
      <rect x="26" y="31.5" width="8" height="2.4" rx="1.2" fill="${portFill}" stroke="${stroke}" stroke-width="0.7"/>
    </svg>
  `;
}

function makeSwitchSvg(p, { topA, topB, frontA, frontB, stroke, arrow, portFill, portStroke, accent, led }) {
  return `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="${p}-top" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${topA}"/>
          <stop offset="100%" stop-color="${topB}"/>
        </linearGradient>
        <linearGradient id="${p}-front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${frontA}"/>
          <stop offset="100%" stop-color="${frontB}"/>
        </linearGradient>
      </defs>
      <polygon points="10,12 38,12 43,17 5,17" fill="url(#${p}-top)" stroke="${stroke}" stroke-width="1.4" stroke-linejoin="round"/>
      <rect x="5" y="17" width="38" height="20" rx="2.5" fill="url(#${p}-front)" stroke="${stroke}" stroke-width="1.6"/>
      <rect x="8" y="13.6" width="9" height="2" rx="1" fill="${accent}"/>
      <path d="M11 23H22M22 23L19.5 20.8M22 23L19.5 25.2" stroke="${arrow}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M37 23H26M26 23L28.5 20.8M26 23L28.5 25.2" stroke="${arrow}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="9" y="31" width="4.5" height="2.8" rx="0.6" fill="${portFill}" stroke="${portStroke}" stroke-width="0.7"/>
      <rect x="15" y="31" width="4.5" height="2.8" rx="0.6" fill="${portFill}" stroke="${portStroke}" stroke-width="0.7"/>
      <rect x="21" y="31" width="4.5" height="2.8" rx="0.6" fill="${portFill}" stroke="${portStroke}" stroke-width="0.7"/>
      <rect x="27" y="31" width="4.5" height="2.8" rx="0.6" fill="${portFill}" stroke="${portStroke}" stroke-width="0.7"/>
      <circle cx="37" cy="32.4" r="1.4" fill="${led}"/>
    </svg>
  `;
}

function makeCanalTensionSvg(p, count, isLight = false) {
  const w = count === 7 ? 246 : 186;
  const bgA = isLight ? '#ffffff' : '#1e293b';
  const bgB = isLight ? '#e2e8f0' : '#0f172a';
  const stroke = isLight ? '#0284c7' : '#38bdf8';
  const inFill = isLight ? '#ffffff' : '#0f172a';
  const inStroke = isLight ? '#dc2626' : '#ef4444';
  const sep = isLight ? '#cbd5e1' : 'rgba(255,255,255,0.14)';
  const socketFill = isLight ? '#334155' : '#0f172a';
  const socketStroke = isLight ? '#64748b' : '#475569';
  const textFill = isLight ? '#cbd5e1' : '#94a3b8';

  const outlets = Array.from({ length: count }, (_, idx) => {
    const cx = 42 + idx * 30;
    return `
      <g transform="translate(${cx}, 23)">
        <rect x="-10" y="-12" width="20" height="24" rx="3" fill="${socketFill}" stroke="${socketStroke}" stroke-width="1"/>
        <line x1="0" y1="-8" x2="0" y2="-3" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="-5.5" y1="4" x2="-2" y2="0.5" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="5.5" y1="4" x2="2" y2="0.5" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <text x="0" y="10" font-family="'JetBrains Mono', monospace" font-size="4.5" font-weight="bold" fill="${textFill}" text-anchor="middle">T${idx + 1}</text>
      </g>
    `;
  }).join('');

  return `
    <svg viewBox="0 0 ${w} 46" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="${p}-ct${count}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${bgA}"/>
          <stop offset="100%" stop-color="${bgB}"/>
        </linearGradient>
      </defs>
      <rect x="2" y="4" width="${w - 4}" height="38" rx="5" fill="url(#${p}-ct${count})" stroke="${stroke}" stroke-width="2"/>
      <circle cx="15" cy="23" r="6" fill="${inFill}" stroke="${inStroke}" stroke-width="1.8"/>
      <circle cx="15" cy="23" r="2.5" fill="${inStroke}"/>
      <text x="15" y="38" font-family="'JetBrains Mono', monospace" font-size="4.8" font-weight="bold" fill="${inStroke}" text-anchor="middle">IN</text>
      <line x1="28" y1="8" x2="28" y2="38" stroke="${sep}" stroke-width="1"/>
      ${outlets}
    </svg>
  `;
}

export const DEVICE_ICONS = {
  router_sophos: makeRouterSvg('nt-rs', {
    topA: '#38bdf8', topB: '#0284c7',
    sideA: '#0284c7', sideB: '#0c4a6e',
    stroke: '#7dd3fc', portFill: '#082f49',
    ledA: '#4ade80', ledB: '#38bdf8'
  }),

  router_fortinet: makeRouterSvg('nt-rf', {
    topA: '#4ade80', topB: '#16a34a',
    sideA: '#15803d', sideB: '#052e16',
    stroke: '#86efac', portFill: '#052e16',
    ledA: '#4ade80', ledB: '#fde047'
  }),

  switch_cisco: makeSwitchSvg('nt-sc', {
    topA: '#38bdf8', topB: '#0369a1',
    frontA: '#0284c7', frontB: '#0c4a6e',
    stroke: '#7dd3fc', arrow: '#ffffff',
    portFill: '#082f49', portStroke: '#7dd3fc',
    accent: '#bae6fd', led: '#4ade80'
  }),

  switch_hp: makeSwitchSvg('nt-sh', {
    topA: '#2dd4bf', topB: '#0d9488',
    frontA: '#0d9488', frontB: '#134e4a',
    stroke: '#5eead4', arrow: '#ffffff',
    portFill: '#042f2e', portStroke: '#99f6e4',
    accent: '#99f6e4', led: '#4ade80'
  }),

  switch_huawei: makeSwitchSvg('nt-sw', {
    topA: '#fb7185', topB: '#be123c',
    frontA: '#e11d48', frontB: '#881337',
    stroke: '#fda4af', arrow: '#ffffff',
    portFill: '#4c0519', portStroke: '#fecdd3',
    accent: '#fecdd3', led: '#fbbf24'
  }),

  switch_aruba: makeSwitchSvg('nt-sa', {
    topA: '#fb923c', topB: '#c2410c',
    frontA: '#ea580c', frontB: '#7c2d12',
    stroke: '#fdba74', arrow: '#ffffff',
    portFill: '#431407', portStroke: '#fed7aa',
    accent: '#fed7aa', led: '#4ade80'
  }),

  nvr: `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="nt-nvr-top" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#818cf8"/><stop offset="100%" stop-color="#4f46e5"/>
        </linearGradient>
        <linearGradient id="nt-nvr-front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#4338ca"/><stop offset="100%" stop-color="#1e1b4b"/>
        </linearGradient>
      </defs>
      <polygon points="10,11 38,11 43,16 5,16" fill="url(#nt-nvr-top)" stroke="#a5b4fc" stroke-width="1.4" stroke-linejoin="round"/>
      <rect x="5" y="16" width="38" height="22" rx="2.5" fill="url(#nt-nvr-front)" stroke="#a5b4fc" stroke-width="1.6"/>
      <rect x="9" y="20" width="12" height="4" rx="1" fill="#0f172a" stroke="#818cf8" stroke-width="0.9"/>
      <circle cx="18.5" cy="22" r="0.9" fill="#4ade80"/>
      <rect x="9" y="26" width="12" height="4" rx="1" fill="#0f172a" stroke="#818cf8" stroke-width="0.9"/>
      <circle cx="18.5" cy="28" r="0.9" fill="#4ade80"/>
      <circle cx="11" cy="34" r="1.6" fill="#ef4444"/>
      <text x="17" y="35.3" font-family="'JetBrains Mono', monospace" font-size="4.8" font-weight="900" fill="#c7d2fe">NVR</text>
      <rect x="25" y="20" width="14" height="14" rx="2" fill="#0f172a" stroke="#818cf8" stroke-width="1"/>
      <line x1="25" y1="27" x2="39" y2="27" stroke="#6366f1" stroke-width="0.8"/>
      <line x1="32" y1="20" x2="32" y2="34" stroke="#6366f1" stroke-width="0.8"/>
      <circle cx="28.5" cy="23.5" r="1.2" fill="#38bdf8"/>
      <circle cx="35.5" cy="23.5" r="1.2" fill="#38bdf8"/>
      <circle cx="28.5" cy="30.5" r="1.2" fill="#38bdf8"/>
      <circle cx="35.5" cy="30.5" r="1.2" fill="#38bdf8"/>
    </svg>
  `,

  dvr: `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="nt-dvr-top" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#22d3ee"/><stop offset="100%" stop-color="#0891b2"/>
        </linearGradient>
        <linearGradient id="nt-dvr-front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0e7490"/><stop offset="100%" stop-color="#083344"/>
        </linearGradient>
      </defs>
      <polygon points="10,11 38,11 43,16 5,16" fill="url(#nt-dvr-top)" stroke="#67e8f9" stroke-width="1.4" stroke-linejoin="round"/>
      <rect x="5" y="16" width="38" height="22" rx="2.5" fill="url(#nt-dvr-front)" stroke="#67e8f9" stroke-width="1.6"/>
      <circle cx="11.5" cy="22" r="2.2" fill="#083344" stroke="#67e8f9" stroke-width="1"/>
      <circle cx="17.5" cy="22" r="2.2" fill="#083344" stroke="#67e8f9" stroke-width="1"/>
      <circle cx="23.5" cy="22" r="2.2" fill="#083344" stroke="#67e8f9" stroke-width="1"/>
      <circle cx="11.5" cy="28" r="2.2" fill="#083344" stroke="#67e8f9" stroke-width="1"/>
      <circle cx="17.5" cy="28" r="2.2" fill="#083344" stroke="#67e8f9" stroke-width="1"/>
      <circle cx="23.5" cy="28" r="2.2" fill="#083344" stroke="#67e8f9" stroke-width="1"/>
      <text x="34.5" y="27" font-family="'JetBrains Mono', monospace" font-size="6.2" font-weight="900" fill="#cffafe" text-anchor="middle">DVR</text>
      <circle cx="11.5" cy="34" r="1.4" fill="#ef4444"/>
      <circle cx="16.5" cy="34" r="1.2" fill="#4ade80"/>
      <rect x="28" y="32.8" width="11" height="2.4" rx="1.2" fill="#083344" stroke="#67e8f9" stroke-width="0.6"/>
    </svg>
  `,

  camara: `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="nt-cam-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#fbbf24"/><stop offset="100%" stop-color="#b45309"/>
        </linearGradient>
      </defs>
      <path d="M11 38L17 30L22 27" stroke="#94a3b8" stroke-width="2.8" stroke-linecap="round"/>
      <rect x="7" y="36" width="8" height="4.5" rx="1.5" fill="#334155" stroke="#cbd5e1" stroke-width="1.2"/>
      <path d="M14 15L36 9.5L40 14L16 19.5Z" fill="#fde68a" stroke="#f59e0b" stroke-width="1.2" stroke-linejoin="round"/>
      <rect x="16" y="15" width="21" height="14" rx="3" fill="url(#nt-cam-body)" stroke="#fcd34d" stroke-width="1.6" transform="rotate(-14 16 15)"/>
      <ellipse cx="36" cy="18" rx="3.4" ry="5.6" fill="#0f172a" stroke="#fcd34d" stroke-width="1.6" transform="rotate(-14 36 18)"/>
      <circle cx="36" cy="18" r="2" fill="#38bdf8"/>
      <circle cx="35.3" cy="17.2" r="0.8" fill="#ffffff"/>
      <circle cx="32" cy="13" r="1.2" fill="#ef4444"/>
    </svg>
  `,

  nas: `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="nt-nas-top" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#34d399"/><stop offset="100%" stop-color="#059669"/>
        </linearGradient>
        <linearGradient id="nt-nas-front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#059669"/><stop offset="100%" stop-color="#064e3b"/>
        </linearGradient>
      </defs>
      <polygon points="12,6 36,6 40,10.5 8,10.5" fill="url(#nt-nas-top)" stroke="#6ee7b7" stroke-width="1.3" stroke-linejoin="round"/>
      <rect x="8" y="10.5" width="32" height="31.5" rx="3" fill="url(#nt-nas-front)" stroke="#6ee7b7" stroke-width="1.6"/>
      <rect x="12" y="14" width="4.5" height="20" rx="1" fill="#022c22" stroke="#6ee7b7" stroke-width="0.8"/>
      <circle cx="14.25" cy="17" r="0.9" fill="#4ade80"/>
      <rect x="18.5" y="14" width="4.5" height="20" rx="1" fill="#022c22" stroke="#6ee7b7" stroke-width="0.8"/>
      <circle cx="20.75" cy="17" r="0.9" fill="#4ade80"/>
      <rect x="25" y="14" width="4.5" height="20" rx="1" fill="#022c22" stroke="#6ee7b7" stroke-width="0.8"/>
      <circle cx="27.25" cy="17" r="0.9" fill="#4ade80"/>
      <rect x="31.5" y="14" width="4.5" height="20" rx="1" fill="#022c22" stroke="#6ee7b7" stroke-width="0.8"/>
      <circle cx="33.75" cy="17" r="0.9" fill="#4ade80"/>
      <circle cx="14" cy="38" r="1.7" fill="#022c22" stroke="#6ee7b7" stroke-width="0.9"/>
      <text x="30" y="39.8" font-family="'JetBrains Mono', monospace" font-size="5.8" font-weight="900" fill="#d1fae5" text-anchor="middle">NAS</text>
    </svg>
  `,

  pc_backup: `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="nt-pcb-frame" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#38bdf8"/><stop offset="100%" stop-color="#0369a1"/>
        </linearGradient>
        <linearGradient id="nt-pcb-tower" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0284c7"/><stop offset="100%" stop-color="#082f49"/>
        </linearGradient>
      </defs>
      <rect x="6" y="7" width="28" height="20" rx="2.5" fill="url(#nt-pcb-frame)" stroke="#7dd3fc" stroke-width="1.5"/>
      <rect x="9" y="10" width="22" height="14" rx="1.2" fill="#082f49"/>
      <path d="M20 14A3.5 3.5 0 0 1 23.5 17.5H25L22.5 20L20 17.5H21.5A1.5 1.5 0 0 0 20 16" stroke="#38bdf8" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M20 20A3.5 3.5 0 0 1 16.5 16.5H15L17.5 14L20 16.5H18.5A1.5 1.5 0 0 0 20 18" stroke="#4ade80" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M20 27V32M14 32H26" stroke="#7dd3fc" stroke-width="2" stroke-linecap="round"/>
      <polygon points="32,14 41,14 43,17 30,17" fill="#38bdf8" stroke="#7dd3fc" stroke-width="1"/>
      <rect x="30" y="17" width="13" height="24" rx="2" fill="url(#nt-pcb-tower)" stroke="#7dd3fc" stroke-width="1.5"/>
      <line x1="33" y1="22" x2="40" y2="22" stroke="#bae6fd" stroke-width="1.2"/>
      <line x1="33" y1="26" x2="40" y2="26" stroke="#bae6fd" stroke-width="1.2"/>
      <circle cx="36.5" cy="31" r="1.4" fill="#4ade80"/>
      <text x="36.5" y="38.2" font-family="'JetBrains Mono', monospace" font-size="3.8" font-weight="900" fill="#bae6fd" text-anchor="middle">BKP</text>
    </svg>
  `,

  server: `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="nt-sv-front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#3b82f6"/><stop offset="100%" stop-color="#1e3a8a"/>
        </linearGradient>
      </defs>
      <polygon points="12,8 36,8 41,12.5 7,12.5" fill="#60a5fa" stroke="#93c5fd" stroke-width="1.3" stroke-linejoin="round"/>
      <rect x="7" y="12.5" width="34" height="11" rx="2" fill="url(#nt-sv-front)" stroke="#93c5fd" stroke-width="1.5"/>
      <circle cx="12" cy="18" r="1.5" fill="#4ade80"/>
      <rect x="17" y="16.7" width="10" height="2.5" rx="1" fill="#0f172a" opacity="0.55"/>
      <line x1="31" y1="18" x2="37" y2="18" stroke="#dbeafe" stroke-width="1.6" stroke-linecap="round"/>
      <rect x="7" y="26.5" width="34" height="11" rx="2" fill="url(#nt-sv-front)" stroke="#93c5fd" stroke-width="1.5"/>
      <circle cx="12" cy="32" r="1.5" fill="#4ade80"/>
      <rect x="17" y="30.7" width="10" height="2.5" rx="1" fill="#0f172a" opacity="0.55"/>
      <line x1="31" y1="32" x2="37" y2="32" stroke="#dbeafe" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M12 37.5V41M36 37.5V41" stroke="#60a5fa" stroke-width="2.2" stroke-linecap="round"/>
    </svg>
  `,

  database: `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="nt-db-top" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#fcd34d"/><stop offset="100%" stop-color="#f59e0b"/>
        </linearGradient>
        <linearGradient id="nt-db-side" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#d97706"/><stop offset="100%" stop-color="#78350f"/>
        </linearGradient>
      </defs>
      <path d="M9 12V35C9 38.6 15.7 41.5 24 41.5C32.3 41.5 39 38.6 39 35V12H9Z" fill="url(#nt-db-side)" stroke="#fcd34d" stroke-width="1.6"/>
      <path d="M9 21C9 24.3 15.7 27 24 27C32.3 27 39 24.3 39 21" stroke="#fde68a" stroke-width="1.4" opacity="0.8"/>
      <path d="M9 29C9 32.3 15.7 35 24 35C32.3 35 39 32.3 39 29" stroke="#fde68a" stroke-width="1.4" opacity="0.8"/>
      <ellipse cx="24" cy="12" rx="15" ry="5.5" fill="url(#nt-db-top)" stroke="#fde68a" stroke-width="1.6"/>
      <circle cx="15" cy="21" r="1.2" fill="#4ade80"/>
      <circle cx="15" cy="29" r="1.2" fill="#4ade80"/>
    </svg>
  `,

  firewall: `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="nt-fw-top" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#fb7185"/><stop offset="100%" stop-color="#e11d48"/>
        </linearGradient>
        <linearGradient id="nt-fw-front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#e11d48"/><stop offset="100%" stop-color="#881337"/>
        </linearGradient>
      </defs>
      <polygon points="11,10 37,10 42,15 6,15" fill="url(#nt-fw-top)" stroke="#fda4af" stroke-width="1.4" stroke-linejoin="round"/>
      <rect x="6" y="15" width="36" height="23" rx="2.5" fill="url(#nt-fw-front)" stroke="#fda4af" stroke-width="1.6"/>
      <line x1="6" y1="22.5" x2="42" y2="22.5" stroke="#fecdd3" stroke-width="1.2" opacity="0.65"/>
      <line x1="6" y1="30" x2="42" y2="30" stroke="#fecdd3" stroke-width="1.2" opacity="0.65"/>
      <line x1="18" y1="15" x2="18" y2="22.5" stroke="#fecdd3" stroke-width="1.2" opacity="0.65"/>
      <line x1="30" y1="15" x2="30" y2="22.5" stroke="#fecdd3" stroke-width="1.2" opacity="0.65"/>
      <line x1="24" y1="22.5" x2="24" y2="30" stroke="#fecdd3" stroke-width="1.2" opacity="0.65"/>
      <path d="M24 19C26.2 21 27.5 23.2 27.5 25.5C27.5 27.7 25.9 29.5 24 29.5C22.1 29.5 20.5 27.7 20.5 25.5C20.5 23.9 21.3 22.3 22.3 21.4C22.5 22.7 23.2 23.3 23.8 23.3C24 21.8 23.6 20.2 24 19Z" fill="#ffffff" opacity="0.95"/>
    </svg>
  `,

  pc: `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="nt-pc-frame" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#38bdf8"/><stop offset="100%" stop-color="#0284c7"/>
        </linearGradient>
      </defs>
      <polygon points="10,7 38,7 41,10 7,10" fill="#7dd3fc" opacity="0.8"/>
      <rect x="6" y="9.5" width="36" height="23" rx="2.8" fill="url(#nt-pc-frame)" stroke="#7dd3fc" stroke-width="1.5"/>
      <rect x="9.5" y="13" width="29" height="16" rx="1.2" fill="#082f49"/>
      <path d="M14 18L18 21L14 24" stroke="#38bdf8" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="21" y1="24" x2="27" y2="24" stroke="#4ade80" stroke-width="1.7" stroke-linecap="round"/>
      <path d="M24 32.5V38.5M15 39H33" stroke="#7dd3fc" stroke-width="2.4" stroke-linecap="round"/>
    </svg>
  `,

  laptop: `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="nt-lt-lid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#818cf8"/><stop offset="100%" stop-color="#4338ca"/>
        </linearGradient>
        <linearGradient id="nt-lt-base" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#6366f1"/><stop offset="100%" stop-color="#312e81"/>
        </linearGradient>
      </defs>
      <rect x="9" y="10" width="30" height="20" rx="2.4" fill="url(#nt-lt-lid)" stroke="#a5b4fc" stroke-width="1.5"/>
      <rect x="12" y="13" width="24" height="14" rx="1" fill="#1e1b4b"/>
      <circle cx="24" cy="11.5" r="0.8" fill="#c7d2fe"/>
      <path d="M5 36.5H43L39.5 31.5H8.5L5 36.5Z" fill="url(#nt-lt-base)" stroke="#a5b4fc" stroke-width="1.4" stroke-linejoin="round"/>
      <line x1="20" y1="34.2" x2="28" y2="34.2" stroke="#e0e7ff" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
  `,

  ap: `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="nt-ap-disc" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#fde047"/><stop offset="100%" stop-color="#d97706"/>
        </linearGradient>
      </defs>
      <path d="M16.5 18C18.6 16.2 21.2 15.2 24 15.2C26.8 15.2 29.4 16.2 31.5 18" stroke="#fbbf24" stroke-width="2" stroke-linecap="round"/>
      <path d="M12 13.5C15.3 10.7 19.5 9.2 24 9.2C28.5 9.2 32.7 10.7 36 13.5" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" opacity="0.75"/>
      <path d="M8 29V33C8 36.8 15.2 39.8 24 39.8C32.8 39.8 40 36.8 40 33V29H8Z" fill="#92400e" stroke="#fcd34d" stroke-width="1.5"/>
      <ellipse cx="24" cy="29" rx="16" ry="7" fill="url(#nt-ap-disc)" stroke="#fef08a" stroke-width="1.5"/>
      <ellipse cx="24" cy="29" rx="6" ry="2.4" stroke="#ffffff" stroke-width="1.3" opacity="0.85"/>
      <circle cx="24" cy="29" r="1.4" fill="#ffffff"/>
    </svg>
  `,

  cloud: `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="nt-cloud" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#38bdf8"/><stop offset="100%" stop-color="#0369a1"/>
        </linearGradient>
      </defs>
      <path d="M13.5 36.5H34.5C39.2 36.5 43 32.7 43 28C43 23.7 39.7 20.1 35.5 19.6C34.3 13.5 29 9 22.8 9C17.2 9 12.5 12.7 10.9 17.8C7.1 18.6 4.5 22 4.5 26C4.5 31.8 8.6 36.5 13.5 36.5Z" fill="url(#nt-cloud)" stroke="#7dd3fc" stroke-width="1.6"/>
      <path d="M14 34H34C37.5 34 40 31.2 40 27.8" stroke="#bae6fd" stroke-width="1" opacity="0.45" stroke-linecap="round"/>
      <circle cx="23.5" cy="24" r="6" stroke="#f0f9ff" stroke-width="1.4" opacity="0.9"/>
      <ellipse cx="23.5" cy="24" rx="2.6" ry="6" stroke="#f0f9ff" stroke-width="1.2" opacity="0.9"/>
      <line x1="17.5" y1="24" x2="29.5" y2="24" stroke="#f0f9ff" stroke-width="1.2" opacity="0.9"/>
    </svg>
  `,

  printer: `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="nt-prn-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#64748b"/><stop offset="100%" stop-color="#1e293b"/>
        </linearGradient>
      </defs>
      <path d="M15 8H33V17H15V8Z" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5"/>
      <polygon points="11,14 37,14 41,18 7,18" fill="#94a3b8" stroke="#cbd5e1" stroke-width="1.2" stroke-linejoin="round"/>
      <rect x="7" y="18" width="34" height="17" rx="3" fill="url(#nt-prn-body)" stroke="#cbd5e1" stroke-width="1.6"/>
      <circle cx="34.5" cy="22.5" r="1.6" fill="#4ade80"/>
      <rect x="14" y="28" width="20" height="12" rx="1.2" fill="#f8fafc" stroke="#94a3b8" stroke-width="1.4"/>
      <line x1="18" y1="32.5" x2="30" y2="32.5" stroke="#64748b" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="18" y1="36" x2="26" y2="36" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
  `,

  phone: `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="nt-ph-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ec4899"/><stop offset="100%" stop-color="#831843"/>
        </linearGradient>
      </defs>
      <polygon points="11,8 37,8 41,13 7,13" fill="#f472b6" stroke="#fbcfe8" stroke-width="1.3" stroke-linejoin="round"/>
      <rect x="7" y="13" width="34" height="27" rx="3.5" fill="url(#nt-ph-body)" stroke="#fbcfe8" stroke-width="1.6"/>
      <rect x="10.5" y="15.5" width="7" height="21" rx="2.5" fill="#fdf2f8" opacity="0.92"/>
      <rect x="21" y="16" width="16" height="8" rx="1.4" fill="#500724" stroke="#fbcfe8" stroke-width="0.9"/>
      <line x1="23.5" y1="20" x2="32" y2="20" stroke="#f9a8d4" stroke-width="1.2" stroke-linecap="round"/>
      <circle cx="23" cy="28" r="1.4" fill="#fce7f3"/>
      <circle cx="29" cy="28" r="1.4" fill="#fce7f3"/>
      <circle cx="35" cy="28" r="1.4" fill="#fce7f3"/>
      <circle cx="23" cy="33" r="1.4" fill="#fce7f3"/>
      <circle cx="29" cy="33" r="1.4" fill="#fce7f3"/>
      <circle cx="35" cy="33" r="1.4" fill="#fce7f3"/>
    </svg>
  `,

  ups: `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="nt-ups-top" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#fb923c"/><stop offset="100%" stop-color="#c2410c"/>
        </linearGradient>
        <linearGradient id="nt-ups-front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#1e293b"/><stop offset="100%" stop-color="#0f172a"/>
        </linearGradient>
      </defs>
      <polygon points="12,5 36,5 40,9 8,9" fill="url(#nt-ups-top)" stroke="#fdba74" stroke-width="1.3" stroke-linejoin="round"/>
      <rect x="8" y="9" width="32" height="34" rx="3.5" fill="url(#nt-ups-front)" stroke="#fb923c" stroke-width="1.8"/>
      <text x="24" y="23" font-family="'JetBrains Mono', monospace" font-size="10.5" font-weight="900" fill="#f8fafc" text-anchor="middle" letter-spacing="0.8">UPS</text>
      <line x1="14" y1="27" x2="34" y2="27" stroke="#fb923c" stroke-width="1.3" stroke-dasharray="3 2"/>
      <rect x="16" y="31" width="14" height="7" rx="1.5" fill="#020617" stroke="#4ade80" stroke-width="1.2"/>
      <rect x="30" y="33" width="1.8" height="3" rx="0.5" fill="#4ade80"/>
      <rect x="18" y="32.4" width="4.5" height="4.2" rx="0.7" fill="#22c55e"/>
      <rect x="23.5" y="32.4" width="4.5" height="4.2" rx="0.7" fill="#22c55e"/>
    </svg>
  `,

  termica: `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="nt-tm-top" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#f87171"/><stop offset="100%" stop-color="#b91c1c"/>
        </linearGradient>
        <linearGradient id="nt-tm-front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#1e293b"/><stop offset="100%" stop-color="#0f172a"/>
        </linearGradient>
      </defs>
      <polygon points="15,5 33,5 36,8.5 12,8.5" fill="url(#nt-tm-top)" stroke="#fca5a5" stroke-width="1.2" stroke-linejoin="round"/>
      <rect x="12" y="8.5" width="24" height="34.5" rx="2.5" fill="url(#nt-tm-front)" stroke="#ef4444" stroke-width="1.8"/>
      <circle cx="24" cy="13.5" r="2.6" fill="#020617" stroke="#f87171" stroke-width="1.4"/>
      <circle cx="24" cy="38" r="2.6" fill="#020617" stroke="#f87171" stroke-width="1.4"/>
      <line x1="24" y1="16" x2="24" y2="21" stroke="#f87171" stroke-width="1.8"/>
      <line x1="24" y1="21" x2="30" y2="27.5" stroke="#ef4444" stroke-width="2.4" stroke-linecap="round"/>
      <rect x="21" y="29" width="6" height="3.5" rx="0.6" fill="#ef4444"/>
      <line x1="24" y1="32.5" x2="24" y2="35.5" stroke="#f87171" stroke-width="1.8"/>
      <text x="19" y="26.5" font-family="'JetBrains Mono', monospace" font-size="5" font-weight="bold" fill="#fca5a5" text-anchor="middle">TM</text>
    </svg>
  `,

  transfer: `
    <svg viewBox="0 0 176 46" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="nt-tr-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#1e293b"/><stop offset="100%" stop-color="#0f172a"/>
        </linearGradient>
      </defs>
      <rect x="2" y="3" width="172" height="40" rx="6" fill="url(#nt-tr-bg)" stroke="#fb7185" stroke-width="2"/>
      <circle cx="18" cy="22" r="7" fill="#020617" stroke="#38bdf8" stroke-width="2"/>
      <circle cx="18" cy="22" r="2.5" fill="#38bdf8"/>
      <text x="18" y="38" font-family="'JetBrains Mono', monospace" font-size="7" font-weight="900" fill="#38bdf8" text-anchor="middle">S1</text>
      <circle cx="38" cy="22" r="7" fill="#020617" stroke="#f59e0b" stroke-width="2"/>
      <circle cx="38" cy="22" r="2.5" fill="#f59e0b"/>
      <text x="38" y="38" font-family="'JetBrains Mono', monospace" font-size="7" font-weight="900" fill="#f59e0b" text-anchor="middle">S2</text>
      <text x="28" y="10" font-family="'JetBrains Mono', monospace" font-size="5" font-weight="bold" fill="#cbd5e1" text-anchor="middle">ENTRADAS</text>
      <line x1="52" y1="6" x2="52" y2="40" stroke="rgba(255,255,255,0.15)" stroke-width="1.2" stroke-dasharray="2 2"/>
      <circle cx="68" cy="18" r="3.5" fill="#020617" stroke="#22c55e" stroke-width="1.5"/>
      <path d="M68 22V32M65.5 29.5L68 32L70.5 29.5" stroke="#22c55e" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="68" y="40" font-family="'JetBrains Mono', monospace" font-size="5" fill="#86efac" text-anchor="middle">1</text>
      <circle cx="86" cy="18" r="3.5" fill="#020617" stroke="#22c55e" stroke-width="1.5"/>
      <path d="M86 22V32M83.5 29.5L86 32L88.5 29.5" stroke="#22c55e" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="86" y="40" font-family="'JetBrains Mono', monospace" font-size="5" fill="#86efac" text-anchor="middle">2</text>
      <circle cx="104" cy="18" r="3.5" fill="#020617" stroke="#22c55e" stroke-width="1.5"/>
      <path d="M104 22V32M101.5 29.5L104 32L106.5 29.5" stroke="#22c55e" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="104" y="40" font-family="'JetBrains Mono', monospace" font-size="5" fill="#86efac" text-anchor="middle">3</text>
      <circle cx="122" cy="18" r="3.5" fill="#020617" stroke="#22c55e" stroke-width="1.5"/>
      <path d="M122 22V32M119.5 29.5L122 32L124.5 29.5" stroke="#22c55e" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="122" y="40" font-family="'JetBrains Mono', monospace" font-size="5" fill="#86efac" text-anchor="middle">4</text>
      <text x="95" y="10" font-family="'JetBrains Mono', monospace" font-size="5" font-weight="bold" fill="#86efac" text-anchor="middle">SALIDAS COMUNES</text>
      <line x1="138" y1="6" x2="138" y2="40" stroke="rgba(255,255,255,0.15)" stroke-width="1.2" stroke-dasharray="2 2"/>
      <rect x="144" y="9" width="26" height="28" rx="4" fill="#020617" stroke="#ef4444" stroke-width="2"/>
      <circle cx="157" cy="22" r="6" fill="#ef4444" opacity="0.25"/>
      <circle cx="157" cy="22" r="3" fill="#ef4444"/>
      <text x="157" y="41" font-family="'JetBrains Mono', monospace" font-size="5" font-weight="900" fill="#fca5a5" text-anchor="middle">CANAL</text>
    </svg>
  `,

  canal_tension_5: makeCanalTensionSvg('nt-d', 5, false),
  canal_tension_7: makeCanalTensionSvg('nt-d', 7, false),

  text_badge: `
    <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="14" width="48" height="28" rx="6" fill="#09131e" stroke="#10b981" stroke-width="2"/>
      <text x="28" y="32" font-family="'JetBrains Mono', monospace" font-size="12" font-weight="bold" fill="#10b981" text-anchor="middle">IP</text>
    </svg>
  `
};

// ==========================================================================
// ICONOS VECTORIALES 2.5D PARA MODO BLANCO (TEMA CLARO) - DEVICE_ICONS_LIGHT
// ==========================================================================
export const DEVICE_ICONS_LIGHT = {
  router_sophos: makeRouterSvg('nt-l-rs', {
    topA: '#38bdf8', topB: '#0284c7',
    sideA: '#0284c7', sideB: '#075985',
    stroke: '#0369a1', portFill: '#0c4a6e',
    ledA: '#4ade80', ledB: '#e0f2fe'
  }),

  router_fortinet: makeRouterSvg('nt-l-rf', {
    topA: '#4ade80', topB: '#16a34a',
    sideA: '#15803d', sideB: '#14532d',
    stroke: '#15803d', portFill: '#052e16',
    ledA: '#86efac', ledB: '#fde047'
  }),

  switch_cisco: makeSwitchSvg('nt-l-sc', {
    topA: '#e0f2fe', topB: '#bae6fd',
    frontA: '#ffffff', frontB: '#e2e8f0',
    stroke: '#0284c7', arrow: '#0284c7',
    portFill: '#334155', portStroke: '#64748b',
    accent: '#0284c7', led: '#16a34a'
  }),

  switch_hp: makeSwitchSvg('nt-l-sh', {
    topA: '#ccfbf1', topB: '#99f6e4',
    frontA: '#ffffff', frontB: '#e2e8f0',
    stroke: '#0d9488', arrow: '#0d9488',
    portFill: '#334155', portStroke: '#64748b',
    accent: '#0d9488', led: '#16a34a'
  }),

  switch_huawei: makeSwitchSvg('nt-l-sw', {
    topA: '#ffe4e6', topB: '#fecdd3',
    frontA: '#ffffff', frontB: '#e2e8f0',
    stroke: '#e11d48', arrow: '#e11d48',
    portFill: '#334155', portStroke: '#64748b',
    accent: '#e11d48', led: '#f59e0b'
  }),

  switch_aruba: makeSwitchSvg('nt-l-sa', {
    topA: '#ffedd5', topB: '#fed7aa',
    frontA: '#ffffff', frontB: '#e2e8f0',
    stroke: '#ea580c', arrow: '#ea580c',
    portFill: '#334155', portStroke: '#64748b',
    accent: '#ea580c', led: '#16a34a'
  }),

  nvr: `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="nt-l-nvr-front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#e2e8f0"/>
        </linearGradient>
      </defs>
      <polygon points="10,11 38,11 43,16 5,16" fill="#e0e7ff" stroke="#4f46e5" stroke-width="1.4" stroke-linejoin="round"/>
      <rect x="5" y="16" width="38" height="22" rx="2.5" fill="url(#nt-l-nvr-front)" stroke="#4f46e5" stroke-width="1.6"/>
      <rect x="9" y="20" width="12" height="4" rx="1" fill="#f1f5f9" stroke="#64748b" stroke-width="0.9"/>
      <circle cx="18.5" cy="22" r="0.9" fill="#16a34a"/>
      <rect x="9" y="26" width="12" height="4" rx="1" fill="#f1f5f9" stroke="#64748b" stroke-width="0.9"/>
      <circle cx="18.5" cy="28" r="0.9" fill="#16a34a"/>
      <circle cx="11" cy="34" r="1.6" fill="#dc2626"/>
      <text x="17" y="35.3" font-family="'JetBrains Mono', monospace" font-size="4.8" font-weight="900" fill="#4338ca">NVR</text>
      <rect x="25" y="20" width="14" height="14" rx="2" fill="#0f172a" stroke="#4f46e5" stroke-width="1"/>
      <line x1="25" y1="27" x2="39" y2="27" stroke="#6366f1" stroke-width="0.8"/>
      <line x1="32" y1="20" x2="32" y2="34" stroke="#6366f1" stroke-width="0.8"/>
      <circle cx="28.5" cy="23.5" r="1.2" fill="#38bdf8"/>
      <circle cx="35.5" cy="23.5" r="1.2" fill="#38bdf8"/>
      <circle cx="28.5" cy="30.5" r="1.2" fill="#38bdf8"/>
      <circle cx="35.5" cy="30.5" r="1.2" fill="#38bdf8"/>
    </svg>
  `,

  dvr: `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="nt-l-dvr-front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#e2e8f0"/>
        </linearGradient>
      </defs>
      <polygon points="10,11 38,11 43,16 5,16" fill="#cffafe" stroke="#0891b2" stroke-width="1.4" stroke-linejoin="round"/>
      <rect x="5" y="16" width="38" height="22" rx="2.5" fill="url(#nt-l-dvr-front)" stroke="#0891b2" stroke-width="1.6"/>
      <circle cx="11.5" cy="22" r="2.2" fill="#f8fafc" stroke="#d97706" stroke-width="1.1"/>
      <circle cx="17.5" cy="22" r="2.2" fill="#f8fafc" stroke="#d97706" stroke-width="1.1"/>
      <circle cx="23.5" cy="22" r="2.2" fill="#f8fafc" stroke="#d97706" stroke-width="1.1"/>
      <circle cx="11.5" cy="28" r="2.2" fill="#f8fafc" stroke="#d97706" stroke-width="1.1"/>
      <circle cx="17.5" cy="28" r="2.2" fill="#f8fafc" stroke="#d97706" stroke-width="1.1"/>
      <circle cx="23.5" cy="28" r="2.2" fill="#f8fafc" stroke="#d97706" stroke-width="1.1"/>
      <text x="34.5" y="27" font-family="'JetBrains Mono', monospace" font-size="6.2" font-weight="900" fill="#0e7490" text-anchor="middle">DVR</text>
      <circle cx="11.5" cy="34" r="1.4" fill="#dc2626"/>
      <circle cx="16.5" cy="34" r="1.2" fill="#16a34a"/>
      <rect x="28" y="32.8" width="11" height="2.4" rx="1.2" fill="#cbd5e1" stroke="#64748b" stroke-width="0.6"/>
    </svg>
  `,

  camara: `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="nt-l-cam-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#e2e8f0"/>
        </linearGradient>
      </defs>
      <path d="M11 38L17 30L22 27" stroke="#64748b" stroke-width="2.8" stroke-linecap="round"/>
      <rect x="7" y="36" width="8" height="4.5" rx="1.5" fill="#cbd5e1" stroke="#475569" stroke-width="1.2"/>
      <path d="M14 15L36 9.5L40 14L16 19.5Z" fill="#fde68a" stroke="#d97706" stroke-width="1.2" stroke-linejoin="round"/>
      <rect x="16" y="15" width="21" height="14" rx="3" fill="url(#nt-l-cam-body)" stroke="#d97706" stroke-width="1.7" transform="rotate(-14 16 15)"/>
      <ellipse cx="36" cy="18" rx="3.4" ry="5.6" fill="#0f172a" stroke="#d97706" stroke-width="1.6" transform="rotate(-14 36 18)"/>
      <circle cx="36" cy="18" r="2" fill="#0284c7"/>
      <circle cx="35.3" cy="17.2" r="0.8" fill="#ffffff"/>
      <circle cx="32" cy="13" r="1.2" fill="#dc2626"/>
    </svg>
  `,

  nas: `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="nt-l-nas-front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#e2e8f0"/>
        </linearGradient>
      </defs>
      <polygon points="12,6 36,6 40,10.5 8,10.5" fill="#d1fae5" stroke="#059669" stroke-width="1.3" stroke-linejoin="round"/>
      <rect x="8" y="10.5" width="32" height="31.5" rx="3" fill="url(#nt-l-nas-front)" stroke="#059669" stroke-width="1.6"/>
      <rect x="12" y="14" width="4.5" height="20" rx="1" fill="#f8fafc" stroke="#059669" stroke-width="0.9"/>
      <circle cx="14.25" cy="17" r="0.9" fill="#16a34a"/>
      <rect x="18.5" y="14" width="4.5" height="20" rx="1" fill="#f8fafc" stroke="#059669" stroke-width="0.9"/>
      <circle cx="20.75" cy="17" r="0.9" fill="#16a34a"/>
      <rect x="25" y="14" width="4.5" height="20" rx="1" fill="#f8fafc" stroke="#059669" stroke-width="0.9"/>
      <circle cx="27.25" cy="17" r="0.9" fill="#16a34a"/>
      <rect x="31.5" y="14" width="4.5" height="20" rx="1" fill="#f8fafc" stroke="#059669" stroke-width="0.9"/>
      <circle cx="33.75" cy="17" r="0.9" fill="#16a34a"/>
      <circle cx="14" cy="38" r="1.7" fill="#ffffff" stroke="#059669" stroke-width="0.9"/>
      <text x="30" y="39.8" font-family="'JetBrains Mono', monospace" font-size="5.8" font-weight="900" fill="#059669" text-anchor="middle">NAS</text>
    </svg>
  `,

  pc_backup: `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="9,5 31,5 34,7.5 6,7.5" fill="#bae6fd"/>
      <rect x="6" y="7" width="28" height="20" rx="2.5" fill="#f8fafc" stroke="#0284c7" stroke-width="1.6"/>
      <rect x="9" y="10" width="22" height="14" rx="1.2" fill="#e0f2fe"/>
      <path d="M20 14A3.5 3.5 0 0 1 23.5 17.5H25L22.5 20L20 17.5H21.5A1.5 1.5 0 0 0 20 16" stroke="#0284c7" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M20 20A3.5 3.5 0 0 1 16.5 16.5H15L17.5 14L20 16.5H18.5A1.5 1.5 0 0 0 20 18" stroke="#16a34a" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M20 27V32M14 32H26" stroke="#64748b" stroke-width="2" stroke-linecap="round"/>
      <polygon points="32,14 41,14 43,17 30,17" fill="#bae6fd" stroke="#0284c7" stroke-width="1"/>
      <rect x="30" y="17" width="13" height="24" rx="2" fill="#ffffff" stroke="#0284c7" stroke-width="1.6"/>
      <line x1="33" y1="22" x2="40" y2="22" stroke="#0284c7" stroke-width="1.2"/>
      <line x1="33" y1="26" x2="40" y2="26" stroke="#0284c7" stroke-width="1.2"/>
      <circle cx="36.5" cy="31" r="1.4" fill="#16a34a"/>
      <text x="36.5" y="38.2" font-family="'JetBrains Mono', monospace" font-size="3.8" font-weight="900" fill="#0284c7" text-anchor="middle">BKP</text>
    </svg>
  `,

  server: `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="nt-l-sv-front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#e2e8f0"/>
        </linearGradient>
      </defs>
      <polygon points="12,8 36,8 41,12.5 7,12.5" fill="#dbeafe" stroke="#2563eb" stroke-width="1.3" stroke-linejoin="round"/>
      <rect x="7" y="12.5" width="34" height="11" rx="2" fill="url(#nt-l-sv-front)" stroke="#2563eb" stroke-width="1.5"/>
      <circle cx="12" cy="18" r="1.5" fill="#16a34a"/>
      <rect x="17" y="16.7" width="10" height="2.5" rx="1" fill="#94a3b8"/>
      <line x1="31" y1="18" x2="37" y2="18" stroke="#2563eb" stroke-width="1.6" stroke-linecap="round"/>
      <rect x="7" y="26.5" width="34" height="11" rx="2" fill="url(#nt-l-sv-front)" stroke="#2563eb" stroke-width="1.5"/>
      <circle cx="12" cy="32" r="1.5" fill="#16a34a"/>
      <rect x="17" y="30.7" width="10" height="2.5" rx="1" fill="#94a3b8"/>
      <line x1="31" y1="32" x2="37" y2="32" stroke="#2563eb" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M12 37.5V41M36 37.5V41" stroke="#64748b" stroke-width="2.2" stroke-linecap="round"/>
    </svg>
  `,

  database: `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="nt-l-db-top" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#fef3c7"/><stop offset="100%" stop-color="#fde68a"/>
        </linearGradient>
        <linearGradient id="nt-l-db-side" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#f1f5f9"/>
        </linearGradient>
      </defs>
      <path d="M9 12V35C9 38.6 15.7 41.5 24 41.5C32.3 41.5 39 38.6 39 35V12H9Z" fill="url(#nt-l-db-side)" stroke="#d97706" stroke-width="1.6"/>
      <path d="M9 21C9 24.3 15.7 27 24 27C32.3 27 39 24.3 39 21" stroke="#d97706" stroke-width="1.3"/>
      <path d="M9 29C9 32.3 15.7 35 24 35C32.3 35 39 32.3 39 29" stroke="#d97706" stroke-width="1.3"/>
      <ellipse cx="24" cy="12" rx="15" ry="5.5" fill="url(#nt-l-db-top)" stroke="#d97706" stroke-width="1.6"/>
      <circle cx="15" cy="21" r="1.2" fill="#16a34a"/>
      <circle cx="15" cy="29" r="1.2" fill="#16a34a"/>
    </svg>
  `,

  firewall: `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="nt-l-fw-top" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#fb7185"/><stop offset="100%" stop-color="#e11d48"/>
        </linearGradient>
        <linearGradient id="nt-l-fw-front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#e11d48"/><stop offset="100%" stop-color="#9f1239"/>
        </linearGradient>
      </defs>
      <polygon points="11,10 37,10 42,15 6,15" fill="url(#nt-l-fw-top)" stroke="#be123c" stroke-width="1.4" stroke-linejoin="round"/>
      <rect x="6" y="15" width="36" height="23" rx="2.5" fill="url(#nt-l-fw-front)" stroke="#be123c" stroke-width="1.6"/>
      <line x1="6" y1="22.5" x2="42" y2="22.5" stroke="#fecdd3" stroke-width="1.2" opacity="0.65"/>
      <line x1="6" y1="30" x2="42" y2="30" stroke="#fecdd3" stroke-width="1.2" opacity="0.65"/>
      <line x1="18" y1="15" x2="18" y2="22.5" stroke="#fecdd3" stroke-width="1.2" opacity="0.65"/>
      <line x1="30" y1="15" x2="30" y2="22.5" stroke="#fecdd3" stroke-width="1.2" opacity="0.65"/>
      <line x1="24" y1="22.5" x2="24" y2="30" stroke="#fecdd3" stroke-width="1.2" opacity="0.65"/>
      <path d="M24 19C26.2 21 27.5 23.2 27.5 25.5C27.5 27.7 25.9 29.5 24 29.5C22.1 29.5 20.5 27.7 20.5 25.5C20.5 23.9 21.3 22.3 22.3 21.4C22.5 22.7 23.2 23.3 23.8 23.3C24 21.8 23.6 20.2 24 19Z" fill="#ffffff"/>
    </svg>
  `,

  pc: `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="10,7 38,7 41,10 7,10" fill="#bae6fd"/>
      <rect x="6" y="9.5" width="36" height="23" rx="2.8" fill="#ffffff" stroke="#0284c7" stroke-width="1.7"/>
      <rect x="9.5" y="13" width="29" height="16" rx="1.2" fill="#e0f2fe"/>
      <path d="M14 18L18 21L14 24" stroke="#0284c7" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="21" y1="24" x2="27" y2="24" stroke="#059669" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M24 32.5V38.5M15 39H33" stroke="#64748b" stroke-width="2.4" stroke-linecap="round"/>
    </svg>
  `,

  laptop: `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="9" y="10" width="30" height="20" rx="2.4" fill="#ffffff" stroke="#4f46e5" stroke-width="1.7"/>
      <rect x="12" y="13" width="24" height="14" rx="1" fill="#e0e7ff"/>
      <circle cx="24" cy="11.5" r="0.8" fill="#6366f1"/>
      <path d="M5 36.5H43L39.5 31.5H8.5L5 36.5Z" fill="#e2e8f0" stroke="#4f46e5" stroke-width="1.5" stroke-linejoin="round"/>
      <line x1="20" y1="34.2" x2="28" y2="34.2" stroke="#4f46e5" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
  `,

  ap: `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="nt-l-ap-disc" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#f1f5f9"/>
        </linearGradient>
      </defs>
      <path d="M16.5 18C18.6 16.2 21.2 15.2 24 15.2C26.8 15.2 29.4 16.2 31.5 18" stroke="#d97706" stroke-width="2" stroke-linecap="round"/>
      <path d="M12 13.5C15.3 10.7 19.5 9.2 24 9.2C28.5 9.2 32.7 10.7 36 13.5" stroke="#d97706" stroke-width="2" stroke-linecap="round" opacity="0.75"/>
      <path d="M8 29V33C8 36.8 15.2 39.8 24 39.8C32.8 39.8 40 36.8 40 33V29H8Z" fill="#cbd5e1" stroke="#d97706" stroke-width="1.5"/>
      <ellipse cx="24" cy="29" rx="16" ry="7" fill="url(#nt-l-ap-disc)" stroke="#d97706" stroke-width="1.6"/>
      <ellipse cx="24" cy="29" rx="6" ry="2.4" stroke="#0284c7" stroke-width="1.3"/>
      <circle cx="24" cy="29" r="1.4" fill="#0284c7"/>
    </svg>
  `,

  cloud: `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="nt-l-cloud" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#bae6fd"/>
        </linearGradient>
      </defs>
      <path d="M13.5 36.5H34.5C39.2 36.5 43 32.7 43 28C43 23.7 39.7 20.1 35.5 19.6C34.3 13.5 29 9 22.8 9C17.2 9 12.5 12.7 10.9 17.8C7.1 18.6 4.5 22 4.5 26C4.5 31.8 8.6 36.5 13.5 36.5Z" fill="url(#nt-l-cloud)" stroke="#0284c7" stroke-width="1.8"/>
      <circle cx="23.5" cy="24" r="6" stroke="#0284c7" stroke-width="1.4"/>
      <ellipse cx="23.5" cy="24" rx="2.6" ry="6" stroke="#0284c7" stroke-width="1.2"/>
      <line x1="17.5" y1="24" x2="29.5" y2="24" stroke="#0284c7" stroke-width="1.2"/>
    </svg>
  `,

  printer: `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 8H33V17H15V8Z" fill="#f8fafc" stroke="#64748b" stroke-width="1.5"/>
      <polygon points="11,14 37,14 41,18 7,18" fill="#cbd5e1" stroke="#64748b" stroke-width="1.2" stroke-linejoin="round"/>
      <rect x="7" y="18" width="34" height="17" rx="3" fill="#ffffff" stroke="#475569" stroke-width="1.7"/>
      <circle cx="34.5" cy="22.5" r="1.6" fill="#16a34a"/>
      <rect x="14" y="28" width="20" height="12" rx="1.2" fill="#f8fafc" stroke="#64748b" stroke-width="1.4"/>
      <line x1="18" y1="32.5" x2="30" y2="32.5" stroke="#64748b" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="18" y1="36" x2="26" y2="36" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
  `,

  phone: `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="11,8 37,8 41,13 7,13" fill="#fce7f3" stroke="#db2777" stroke-width="1.3" stroke-linejoin="round"/>
      <rect x="7" y="13" width="34" height="27" rx="3.5" fill="#ffffff" stroke="#db2777" stroke-width="1.7"/>
      <rect x="10.5" y="15.5" width="7" height="21" rx="2.5" fill="#db2777"/>
      <rect x="21" y="16" width="16" height="8" rx="1.4" fill="#fdf2f8" stroke="#db2777" stroke-width="1"/>
      <line x1="23.5" y1="20" x2="32" y2="20" stroke="#db2777" stroke-width="1.2" stroke-linecap="round"/>
      <circle cx="23" cy="28" r="1.4" fill="#db2777"/>
      <circle cx="29" cy="28" r="1.4" fill="#db2777"/>
      <circle cx="35" cy="28" r="1.4" fill="#db2777"/>
      <circle cx="23" cy="33" r="1.4" fill="#db2777"/>
      <circle cx="29" cy="33" r="1.4" fill="#db2777"/>
      <circle cx="35" cy="33" r="1.4" fill="#db2777"/>
    </svg>
  `,

  ups: `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="nt-l-ups-front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#f1f5f9"/>
        </linearGradient>
      </defs>
      <polygon points="12,5 36,5 40,9 8,9" fill="#ffedd5" stroke="#ea580c" stroke-width="1.3" stroke-linejoin="round"/>
      <rect x="8" y="9" width="32" height="34" rx="3.5" fill="url(#nt-l-ups-front)" stroke="#ea580c" stroke-width="1.8"/>
      <text x="24" y="23" font-family="'JetBrains Mono', monospace" font-size="10.5" font-weight="900" fill="#0f172a" text-anchor="middle" letter-spacing="0.8">UPS</text>
      <line x1="14" y1="27" x2="34" y2="27" stroke="#cbd5e1" stroke-width="1.3" stroke-dasharray="3 2"/>
      <rect x="16" y="31" width="14" height="7" rx="1.5" fill="#334155" stroke="#16a34a" stroke-width="1.2"/>
      <rect x="30" y="33" width="1.8" height="3" rx="0.5" fill="#16a34a"/>
      <rect x="18" y="32.4" width="4.5" height="4.2" rx="0.7" fill="#22c55e"/>
      <rect x="23.5" y="32.4" width="4.5" height="4.2" rx="0.7" fill="#22c55e"/>
    </svg>
  `,

  termica: `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="15,5 33,5 36,8.5 12,8.5" fill="#fee2e2" stroke="#dc2626" stroke-width="1.2" stroke-linejoin="round"/>
      <rect x="12" y="8.5" width="24" height="34.5" rx="2.5" fill="#ffffff" stroke="#dc2626" stroke-width="1.8"/>
      <circle cx="24" cy="13.5" r="2.6" fill="#e2e8f0" stroke="#dc2626" stroke-width="1.4"/>
      <circle cx="24" cy="38" r="2.6" fill="#e2e8f0" stroke="#dc2626" stroke-width="1.4"/>
      <line x1="24" y1="16" x2="24" y2="21" stroke="#dc2626" stroke-width="1.8"/>
      <line x1="24" y1="21" x2="30" y2="27.5" stroke="#dc2626" stroke-width="2.4" stroke-linecap="round"/>
      <rect x="21" y="29" width="6" height="3.5" rx="0.6" fill="#dc2626"/>
      <line x1="24" y1="32.5" x2="24" y2="35.5" stroke="#dc2626" stroke-width="1.8"/>
      <text x="19" y="26.5" font-family="'JetBrains Mono', monospace" font-size="5" font-weight="bold" fill="#dc2626" text-anchor="middle">TM</text>
    </svg>
  `,

  transfer: `
    <svg viewBox="0 0 176 46" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="nt-l-tr-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#f1f5f9"/>
        </linearGradient>
      </defs>
      <rect x="2" y="3" width="172" height="40" rx="6" fill="url(#nt-l-tr-bg)" stroke="#e11d48" stroke-width="2"/>
      <circle cx="18" cy="22" r="7" fill="#ffffff" stroke="#0284c7" stroke-width="2"/>
      <circle cx="18" cy="22" r="2.5" fill="#0284c7"/>
      <text x="18" y="38" font-family="'JetBrains Mono', monospace" font-size="7" font-weight="900" fill="#0284c7" text-anchor="middle">S1</text>
      <circle cx="38" cy="22" r="7" fill="#ffffff" stroke="#d97706" stroke-width="2"/>
      <circle cx="38" cy="22" r="2.5" fill="#d97706"/>
      <text x="38" y="38" font-family="'JetBrains Mono', monospace" font-size="7" font-weight="900" fill="#d97706" text-anchor="middle">S2</text>
      <text x="28" y="10" font-family="'JetBrains Mono', monospace" font-size="5" font-weight="bold" fill="#475569" text-anchor="middle">ENTRADAS</text>
      <line x1="52" y1="6" x2="52" y2="40" stroke="#cbd5e1" stroke-width="1.2" stroke-dasharray="2 2"/>
      <circle cx="68" cy="18" r="3.5" fill="#ffffff" stroke="#16a34a" stroke-width="1.5"/>
      <path d="M68 22V32M65.5 29.5L68 32L70.5 29.5" stroke="#16a34a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="68" y="40" font-family="'JetBrains Mono', monospace" font-size="5" font-weight="bold" fill="#16a34a" text-anchor="middle">1</text>
      <circle cx="86" cy="18" r="3.5" fill="#ffffff" stroke="#16a34a" stroke-width="1.5"/>
      <path d="M86 22V32M83.5 29.5L86 32L88.5 29.5" stroke="#16a34a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="86" y="40" font-family="'JetBrains Mono', monospace" font-size="5" font-weight="bold" fill="#16a34a" text-anchor="middle">2</text>
      <circle cx="104" cy="18" r="3.5" fill="#ffffff" stroke="#16a34a" stroke-width="1.5"/>
      <path d="M104 22V32M101.5 29.5L104 32L106.5 29.5" stroke="#16a34a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="104" y="40" font-family="'JetBrains Mono', monospace" font-size="5" font-weight="bold" fill="#16a34a" text-anchor="middle">3</text>
      <circle cx="122" cy="18" r="3.5" fill="#ffffff" stroke="#16a34a" stroke-width="1.5"/>
      <path d="M122 22V32M119.5 29.5L122 32L124.5 29.5" stroke="#16a34a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="122" y="40" font-family="'JetBrains Mono', monospace" font-size="5" font-weight="bold" fill="#16a34a" text-anchor="middle">4</text>
      <text x="95" y="10" font-family="'JetBrains Mono', monospace" font-size="5" font-weight="bold" fill="#475569" text-anchor="middle">SALIDAS COMUNES</text>
      <line x1="138" y1="6" x2="138" y2="40" stroke="#cbd5e1" stroke-width="1.2" stroke-dasharray="2 2"/>
      <rect x="144" y="9" width="26" height="28" rx="4" fill="#fef2f2" stroke="#dc2626" stroke-width="2"/>
      <circle cx="157" cy="22" r="6" fill="#fecaca"/>
      <circle cx="157" cy="22" r="3" fill="#dc2626"/>
      <text x="157" y="41" font-family="'JetBrains Mono', monospace" font-size="5" font-weight="900" fill="#dc2626" text-anchor="middle">CANAL</text>
    </svg>
  `,

  canal_tension_5: makeCanalTensionSvg('nt-l', 5, true),
  canal_tension_7: makeCanalTensionSvg('nt-l', 7, true),

  text_badge: `
    <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="14" width="48" height="28" rx="6" fill="#ffffff" stroke="#059669" stroke-width="2"/>
      <text x="28" y="32" font-family="'JetBrains Mono', monospace" font-size="12" font-weight="bold" fill="#059669" text-anchor="middle">IP</text>
    </svg>
  `
};

// Helper universal para obtener el icono según el tema activo
export function getDeviceIcon(type, isLight = false) {
  if (isLight && typeof DEVICE_ICONS_LIGHT !== 'undefined' && DEVICE_ICONS_LIGHT[type]) {
    return DEVICE_ICONS_LIGHT[type];
  }
  return DEVICE_ICONS[type] || DEVICE_ICONS.pc;
}

// Generadores de puertos simples y claros (Boca 1, Eth 1, Fibra 1)
export function generateSwitchPorts(copperCount = 24, fiberCount = 4) {
  const ports = [];
  for (let i = 1; i <= copperCount; i++) {
    ports.push(`Boca ${i}`);
  }
  for (let i = 1; i <= fiberCount; i++) {
    ports.push(`Fibra ${i}`);
  }
  return ports;
}

export function generateRouterPorts(ethCount = 4, fiberCount = 2, wanCount = 0) {
  const ports = [];
  for (let i = 1; i <= ethCount; i++) {
    ports.push(`Eth ${i}`);
  }
  for (let i = 1; i <= fiberCount; i++) {
    ports.push(`Fibra ${i}`);
  }
  for (let i = 1; i <= wanCount; i++) {
    ports.push(`WAN ${i}`);
  }
  return ports;
}

// Metadatos y configuración por defecto de cada tipo de equipo
export const DEVICE_METADATA = {
  router_sophos: {
    label: "Router Sophos",
    defaultNamePrefix: "SOPHOS",
    category: "network",
    ports: ["WAN 1", "WAN 2", "Port 1 (LAN)", "Port 2 (LAN)", "Port 3 (DMZ)", "Port 4", "Fibra 1", "Fibra 2"],
    defaultIp: "192.168.1.1",
    color: "#0284c7"
  },
  router_fortinet: {
    label: "Router Fortinet",
    defaultNamePrefix: "FORTINET",
    category: "network",
    ports: ["WAN 1", "WAN 2", "DMZ", "Port 1 (LAN)", "Port 2 (LAN)", "Port 3", "Port 4", "SFP 1", "SFP 2"],
    defaultIp: "192.168.1.99",
    color: "#16a34a"
  },
  switch_cisco: {
    label: "Switch Cisco",
    defaultNamePrefix: "CISCO",
    category: "network",
    ports: generateSwitchPorts(24, 4),
    defaultIp: "192.168.1.2",
    color: "#0284c7"
  },
  switch_hp: {
    label: "Switch HP",
    defaultNamePrefix: "HP",
    category: "network",
    ports: generateSwitchPorts(24, 4),
    defaultIp: "192.168.1.3",
    color: "#10b981"
  },
  switch_huawei: {
    label: "Switch Huawei",
    defaultNamePrefix: "HUAWEI",
    category: "network",
    ports: generateSwitchPorts(24, 4),
    defaultIp: "192.168.1.4",
    color: "#ef4444"
  },
  switch_aruba: {
    label: "Switch Aruba",
    defaultNamePrefix: "ARUBA",
    category: "network",
    ports: generateSwitchPorts(24, 4),
    defaultIp: "192.168.1.5",
    color: "#f97316"
  },
  nvr: {
    label: "NVR",
    defaultNamePrefix: "NVR",
    category: "cameras",
    ports: ["LAN 1", "LAN 2", "PoE 1", "PoE 2", "PoE 3", "PoE 4", "PoE 5", "PoE 6", "PoE 7", "PoE 8", "HDMI", "E 220V"],
    defaultIp: "192.168.1.210",
    color: "#6366f1"
  },
  dvr: {
    label: "DVR",
    defaultNamePrefix: "DVR",
    category: "cameras",
    ports: ["LAN", "BNC 1", "BNC 2", "BNC 3", "BNC 4", "BNC 5", "BNC 6", "BNC 7", "BNC 8", "HDMI", "E 220V"],
    defaultIp: "192.168.1.215",
    color: "#06b6d4"
  },
  camara: {
    label: "Cámara",
    defaultNamePrefix: "Cámara",
    category: "cameras",
    ports: ["PoE / Eth 1", "E 12V", "E 220V"],
    defaultIp: "192.168.1.220",
    color: "#f59e0b"
  },
  nas: {
    label: "NAS",
    defaultNamePrefix: "NAS",
    category: "servers",
    ports: ["LAN 1 (10G)", "LAN 2 (10G)", "LAN 3", "LAN 4", "Gestión", "E 220V"],
    defaultIp: "192.168.1.20",
    color: "#10b981"
  },
  pc_backup: {
    label: "PC Backup",
    defaultNamePrefix: "PC-Backup",
    category: "servers",
    ports: ["Eth 1", "Eth 2", "E 220V"],
    defaultIp: "192.168.1.55",
    color: "#0ea5e9"
  },
  server: {
    label: "Servidor",
    defaultNamePrefix: "SRV",
    category: "endpoint",
    ports: ["Eth 1", "Eth 2", "iDRAC", "E 220V"],
    defaultIp: "192.168.1.10",
    color: "#3b82f6"
  },
  database: {
    label: "Servidor DB",
    defaultNamePrefix: "SRV-DB",
    category: "endpoint",
    ports: ["Eth 1", "Eth 2", "E 220V"],
    defaultIp: "192.168.1.15",
    color: "#f59e0b"
  },
  firewall: {
    label: "Firewall",
    defaultNamePrefix: "FW",
    category: "security",
    ports: ["WAN 1", "LAN 1", "LAN 2", "DMZ"],
    defaultIp: "192.168.1.254",
    color: "#ef4444"
  },
  pc: {
    label: "PC de Escritorio",
    defaultNamePrefix: "PC",
    category: "endpoint",
    ports: ["Eth 1", "E 220V"],
    defaultIp: "192.168.1.50",
    color: "#0ea5e9"
  },
  laptop: {
    label: "Laptop",
    defaultNamePrefix: "LAPTOP",
    category: "endpoint",
    ports: ["Wi-Fi", "Eth 1", "E 220V"],
    defaultIp: "192.168.1.60",
    color: "#6366f1"
  },
  ap: {
    label: "Access Point",
    defaultNamePrefix: "AP",
    category: "wireless",
    ports: ["PoE-In", "SSID-Corp", "SSID-Guest"],
    defaultIp: "192.168.1.5",
    color: "#eab308"
  },
  cloud: {
    label: "Internet / ISP",
    defaultNamePrefix: "WAN-ISP",
    category: "network",
    ports: ["Internet", "Fibra 1"],
    defaultIp: "200.45.12.1",
    color: "#38bdf8"
  },
  printer: {
    label: "Impresora Red",
    defaultNamePrefix: "PRN",
    category: "endpoint",
    ports: ["Eth 1", "E 220V"],
    defaultIp: "192.168.1.200",
    color: "#94a3b8"
  },
  phone: {
    label: "Teléfono VoIP",
    defaultNamePrefix: "VOIP",
    category: "endpoint",
    ports: ["Boca Red", "PC"],
    defaultIp: "192.168.1.120",
    color: "#ec4899"
  },

  // Dispositivos de Electricidad, Energía y Potencia
  ups: {
    label: "UPS",
    defaultNamePrefix: "UPS",
    category: "power",
    ports: [
      "E 220V",
      "S 220V (1)",
      "S 220V (2)",
      "S 220V (3)",
      "S 220V (4)",
      "Bypass"
    ],
    defaultIp: "",
    color: "#f97316"
  },
  termica: {
    label: "Térmica",
    defaultNamePrefix: "Térmica",
    category: "power",
    ports: [
      "E 220V",
      "S 220V",
      "Bypass"
    ],
    defaultIp: "",
    color: "#ef4444"
  },
  transfer: {
    label: "Transfer",
    defaultNamePrefix: "Transfer",
    category: "power",
    ports: [
      "E UPS 1",
      "E UPS 2",
      "S PC 1",
      "S PC 2",
      "S PC 3",
      "S PC 4",
      "S Canal Tensión"
    ],
    defaultIp: "",
    color: "#e11d48"
  },
  canal_tension_5: {
    label: "Canal de Tensión (5 Salidas)",
    defaultNamePrefix: "CT-5",
    category: "power",
    ports: [
      "E 220V",
      "Toma 1",
      "Toma 2",
      "Toma 3",
      "Toma 4",
      "Toma 5"
    ],
    defaultIp: "",
    color: "#38bdf8"
  },
  canal_tension_7: {
    label: "Canal de Tensión (7 Salidas)",
    defaultNamePrefix: "CT-7",
    category: "power",
    ports: [
      "E 220V",
      "Toma 1",
      "Toma 2",
      "Toma 3",
      "Toma 4",
      "Toma 5",
      "Toma 6",
      "Toma 7"
    ],
    defaultIp: "",
    color: "#38bdf8"
  },
  text_badge: {
    label: "Recuadro de Texto / IP",
    defaultNamePrefix: "IP",
    category: "annotation",
    ports: ["Link 1", "Link 2", "Link 3", "Link 4", "Link 5", "Link 6", "Link 7", "Link 8"],
    defaultIp: "192.168.1.0/24",
    color: "#10b981"
  }
};

// Tipos de cables y estilos visuales
export const CABLE_TYPES = {
  ethernet: {
    id: "ethernet",
    name: "Ethernet UTP / Cat6",
    color: "#38bdf8",
    dash: "none",
    width: 2.5,
    icon: "🔌"
  },
  power: {
    id: "power",
    name: "Alimentación Eléctrica / 220V (Rojo)",
    color: "#ef4444",
    dash: "none",
    width: 2.8,
    icon: "⚡"
  },
  fiber: {
    id: "fiber",
    name: "Fibra Óptica",
    color: "#f59e0b",
    dash: "none",
    width: 2.5,
    icon: "💡"
  },
  serial: {
    id: "serial",
    name: "Serial WAN",
    color: "#ef4444",
    dash: "8, 4",
    width: 2.5,
    icon: "⚡"
  },
  wireless: {
    id: "wireless",
    name: "Enlace Inalámbrico / WiFi",
    color: "#a855f7",
    dash: "4, 4",
    width: 2,
    icon: "📶"
  }
};

// Alias de compatibilidad retroactiva para proyectos guardados previamente
if (typeof DEVICE_ICONS !== 'undefined') {
  DEVICE_ICONS.router = DEVICE_ICONS.router_sophos;
  DEVICE_ICONS.switch = DEVICE_ICONS.switch_cisco;
  DEVICE_ICONS.canal_tension = DEVICE_ICONS.canal_tension_5;
}

if (typeof DEVICE_ICONS_LIGHT !== 'undefined') {
  DEVICE_ICONS_LIGHT.router = DEVICE_ICONS_LIGHT.router_sophos;
  DEVICE_ICONS_LIGHT.switch = DEVICE_ICONS_LIGHT.switch_cisco;
  DEVICE_ICONS_LIGHT.canal_tension = DEVICE_ICONS_LIGHT.canal_tension_5;
}

if (typeof DEVICE_METADATA !== 'undefined') {
  DEVICE_METADATA.router = DEVICE_METADATA.router_sophos;
  DEVICE_METADATA.switch = DEVICE_METADATA.switch_cisco;
  DEVICE_METADATA.canal_tension = DEVICE_METADATA.canal_tension_5;
}


export default { DEVICE_ICONS, DEVICE_ICONS_LIGHT, DEVICE_METADATA, CABLE_TYPES };
