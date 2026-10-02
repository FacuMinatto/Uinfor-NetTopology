// Iconos vectoriales SVG limpios y nítidos para dispositivos de red
const DEVICE_ICONS = {
  router_sophos: `
    <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sph-cyl-top" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#0284c7"/>
          <stop offset="100%" stop-color="#0369a1"/>
        </linearGradient>
        <linearGradient id="sph-cyl-front" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#0369a1"/>
          <stop offset="100%" stop-color="#082f49"/>
        </linearGradient>
      </defs>
      <!-- Pared lateral curva del cilindro 3D -->
      <path d="M 5 19 V 36 A 23 11 0 0 0 51 36 V 19 A 23 11 0 0 1 5 19 Z" fill="url(#sph-cyl-front)" stroke="#38bdf8" stroke-width="1.8" stroke-linejoin="round"/>
      <!-- Tapa elíptica superior -->
      <ellipse cx="28" cy="19" rx="23" ry="11" fill="url(#sph-cyl-top)" stroke="#38bdf8" stroke-width="1.8"/>
      <!-- 4 Flechas de Routing en perspectiva isométrica (2 entran, 2 salen) -->
      <path d="M 24.1 17.1 L 17.4 17.0 L 19.2 16.1 L 13.5 13.4 L 16.3 12.0 L 22.0 14.8 L 23.8 13.9 Z" fill="#ffffff"/>
      <path d="M 41.1 12.7 L 40.7 15.9 L 39.0 15.1 L 33.3 17.8 L 30.5 16.5 L 36.1 13.7 L 34.4 12.9 Z" fill="#ffffff"/>
      <path d="M 14.9 25.3 L 15.3 22.1 L 17.0 22.9 L 22.7 20.2 L 25.5 21.5 L 19.9 24.3 L 21.6 25.1 Z" fill="#ffffff"/>
      <path d="M 31.9 20.9 L 38.6 21.0 L 36.8 21.9 L 42.5 24.6 L 39.7 26.0 L 34.0 23.2 L 32.2 24.1 Z" fill="#ffffff"/>
      <!-- Badge de marca Sophos en frontal curvo -->
      <text x="28" y="35.5" font-family="'JetBrains Mono', sans-serif" font-size="4.2" font-weight="900" fill="#38bdf8" text-anchor="middle" letter-spacing="0.8">SOPHOS</text>
    </svg>
  `,

  router_fortinet: `
    <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="fgt-cyl-top" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#16a34a"/>
          <stop offset="100%" stop-color="#15803d"/>
        </linearGradient>
        <linearGradient id="fgt-cyl-front" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#15803d"/>
          <stop offset="100%" stop-color="#052e16"/>
        </linearGradient>
      </defs>
      <!-- Pared lateral curva del cilindro 3D -->
      <path d="M 5 19 V 36 A 23 11 0 0 0 51 36 V 19 A 23 11 0 0 1 5 19 Z" fill="url(#fgt-cyl-front)" stroke="#4ade80" stroke-width="1.8" stroke-linejoin="round"/>
      <!-- Tapa elíptica superior -->
      <ellipse cx="28" cy="19" rx="23" ry="11" fill="url(#fgt-cyl-top)" stroke="#4ade80" stroke-width="1.8"/>
      <!-- 4 Flechas de Routing en perspectiva isométrica (2 entran, 2 salen) -->
      <path d="M 24.1 17.1 L 17.4 17.0 L 19.2 16.1 L 13.5 13.4 L 16.3 12.0 L 22.0 14.8 L 23.8 13.9 Z" fill="#ffffff"/>
      <path d="M 41.1 12.7 L 40.7 15.9 L 39.0 15.1 L 33.3 17.8 L 30.5 16.5 L 36.1 13.7 L 34.4 12.9 Z" fill="#ffffff"/>
      <path d="M 14.9 25.3 L 15.3 22.1 L 17.0 22.9 L 22.7 20.2 L 25.5 21.5 L 19.9 24.3 L 21.6 25.1 Z" fill="#ffffff"/>
      <path d="M 31.9 20.9 L 38.6 21.0 L 36.8 21.9 L 42.5 24.6 L 39.7 26.0 L 34.0 23.2 L 32.2 24.1 Z" fill="#ffffff"/>
      <!-- Badge de marca Fortinet en frontal curvo -->
      <text x="28" y="35.5" font-family="'JetBrains Mono', sans-serif" font-size="3.8" font-weight="900" fill="#4ade80" text-anchor="middle" letter-spacing="0.6">FORTINET</text>
    </svg>
  `,

  switch_cisco: `
    <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sw-cisco-top" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#0369a1"/>
          <stop offset="100%" stop-color="#0c4a6e"/>
        </linearGradient>
        <linearGradient id="sw-cisco-front" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#0284c7"/>
          <stop offset="100%" stop-color="#0369a1"/>
        </linearGradient>
      </defs>
      <polygon points="12,12 44,12 50,18 6,18" fill="url(#sw-cisco-top)" stroke="#38bdf8" stroke-width="1.6"/>
      <rect x="6" y="18" width="44" height="24" rx="3" fill="url(#sw-cisco-front)" stroke="#38bdf8" stroke-width="2"/>
      <!-- Flechas switching -->
      <path d="M12 25H27M27 25L23 22M27 25L23 28" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M44 25H29M29 25L33 22M29 25L33 28" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M27 31H12M12 31L16 28M12 31L16 34" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M29 31H44M44 31L40 28M44 31L40 34" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <!-- Badge CISCO -->
      <rect x="8" y="13" width="18" height="4.5" rx="1" fill="#0c4a6e" stroke="#38bdf8" stroke-width="0.7"/>
      <text x="17" y="16.5" font-family="'JetBrains Mono', sans-serif" font-size="3.5" font-weight="900" fill="#38bdf8" text-anchor="middle" letter-spacing="0.5">CISCO</text>
      <!-- Puertos y LEDs -->
      <rect x="9" y="36.5" width="5" height="3" rx="0.5" fill="#0f172a" stroke="#38bdf8" stroke-width="0.8"/>
      <rect x="16" y="36.5" width="5" height="3" rx="0.5" fill="#0f172a" stroke="#38bdf8" stroke-width="0.8"/>
      <rect x="23" y="36.5" width="5" height="3" rx="0.5" fill="#0f172a" stroke="#38bdf8" stroke-width="0.8"/>
      <rect x="30" y="36.5" width="5" height="3" rx="0.5" fill="#0f172a" stroke="#38bdf8" stroke-width="0.8"/>
      <rect x="37" y="36.5" width="5" height="3" rx="0.5" fill="#0f172a" stroke="#38bdf8" stroke-width="0.8"/>
      <circle cx="45" cy="38" r="1.5" fill="#22c55e"/>
    </svg>
  `,

  switch_hp: `
    <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sw-hp-top" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#047857"/>
          <stop offset="100%" stop-color="#064e3b"/>
        </linearGradient>
        <linearGradient id="sw-hp-front" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#10b981"/>
          <stop offset="100%" stop-color="#047857"/>
        </linearGradient>
      </defs>
      <polygon points="12,12 44,12 50,18 6,18" fill="url(#sw-hp-top)" stroke="#34d399" stroke-width="1.6"/>
      <rect x="6" y="18" width="44" height="24" rx="3" fill="url(#sw-hp-front)" stroke="#34d399" stroke-width="2"/>
      <!-- Flechas switching -->
      <path d="M12 25H27M27 25L23 22M27 25L23 28" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M44 25H29M29 25L33 22M29 25L33 28" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M27 31H12M12 31L16 28M12 31L16 34" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M29 31H44M44 31L40 28M44 31L40 34" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <!-- Badge HP -->
      <rect x="8" y="13" width="14" height="4.5" rx="1" fill="#064e3b" stroke="#34d399" stroke-width="0.7"/>
      <text x="15" y="16.5" font-family="'JetBrains Mono', sans-serif" font-size="3.5" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="0.5">HP</text>
      <!-- Puertos y LEDs -->
      <rect x="9" y="36.5" width="5" height="3" rx="0.5" fill="#0f172a" stroke="#34d399" stroke-width="0.8"/>
      <rect x="16" y="36.5" width="5" height="3" rx="0.5" fill="#0f172a" stroke="#34d399" stroke-width="0.8"/>
      <rect x="23" y="36.5" width="5" height="3" rx="0.5" fill="#0f172a" stroke="#34d399" stroke-width="0.8"/>
      <rect x="30" y="36.5" width="5" height="3" rx="0.5" fill="#0f172a" stroke="#34d399" stroke-width="0.8"/>
      <rect x="37" y="36.5" width="5" height="3" rx="0.5" fill="#0f172a" stroke="#34d399" stroke-width="0.8"/>
      <circle cx="45" cy="38" r="1.5" fill="#34d399"/>
    </svg>
  `,

  switch_huawei: `
    <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sw-hw-top" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#b91c1c"/>
          <stop offset="100%" stop-color="#7f1d1d"/>
        </linearGradient>
        <linearGradient id="sw-hw-front" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ef4444"/>
          <stop offset="100%" stop-color="#b91c1c"/>
        </linearGradient>
      </defs>
      <polygon points="12,12 44,12 50,18 6,18" fill="url(#sw-hw-top)" stroke="#f87171" stroke-width="1.6"/>
      <rect x="6" y="18" width="44" height="24" rx="3" fill="url(#sw-hw-front)" stroke="#f87171" stroke-width="2"/>
      <!-- Flechas switching -->
      <path d="M12 25H27M27 25L23 22M27 25L23 28" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M44 25H29M29 25L33 22M29 25L33 28" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M27 31H12M12 31L16 28M12 31L16 34" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M29 31H44M44 31L40 28M44 31L40 34" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <!-- Badge HUAWEI -->
      <rect x="8" y="13" width="20" height="4.5" rx="1" fill="#7f1d1d" stroke="#f87171" stroke-width="0.7"/>
      <text x="18" y="16.5" font-family="'JetBrains Mono', sans-serif" font-size="3.2" font-weight="900" fill="#fca5a5" text-anchor="middle" letter-spacing="0.4">HUAWEI</text>
      <!-- Puertos y LEDs -->
      <rect x="9" y="36.5" width="5" height="3" rx="0.5" fill="#0f172a" stroke="#f87171" stroke-width="0.8"/>
      <rect x="16" y="36.5" width="5" height="3" rx="0.5" fill="#0f172a" stroke="#f87171" stroke-width="0.8"/>
      <rect x="23" y="36.5" width="5" height="3" rx="0.5" fill="#0f172a" stroke="#f87171" stroke-width="0.8"/>
      <rect x="30" y="36.5" width="5" height="3" rx="0.5" fill="#0f172a" stroke="#f87171" stroke-width="0.8"/>
      <rect x="37" y="36.5" width="5" height="3" rx="0.5" fill="#0f172a" stroke="#f87171" stroke-width="0.8"/>
      <circle cx="45" cy="38" r="1.5" fill="#fbbf24"/>
    </svg>
  `,

  switch_aruba: `
    <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sw-aruba-top" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#c2410c"/>
          <stop offset="100%" stop-color="#7c2d12"/>
        </linearGradient>
        <linearGradient id="sw-aruba-front" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#f97316"/>
          <stop offset="100%" stop-color="#ea580c"/>
        </linearGradient>
      </defs>
      <polygon points="12,12 44,12 50,18 6,18" fill="url(#sw-aruba-top)" stroke="#fdba74" stroke-width="1.6"/>
      <rect x="6" y="18" width="44" height="24" rx="3" fill="url(#sw-aruba-front)" stroke="#fdba74" stroke-width="2"/>
      <!-- Flechas switching -->
      <path d="M12 25H27M27 25L23 22M27 25L23 28" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M44 25H29M29 25L33 22M29 25L33 28" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M27 31H12M12 31L16 28M12 31L16 34" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M29 31H44M44 31L40 28M44 31L40 34" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <!-- Badge ARUBA -->
      <rect x="8" y="13" width="18" height="4.5" rx="1" fill="#7c2d12" stroke="#fdba74" stroke-width="0.7"/>
      <text x="17" y="16.5" font-family="'JetBrains Mono', sans-serif" font-size="3.2" font-weight="900" fill="#fed7aa" text-anchor="middle" letter-spacing="0.4">ARUBA</text>
      <!-- Puertos y LEDs -->
      <rect x="9" y="36.5" width="5" height="3" rx="0.5" fill="#0f172a" stroke="#fdba74" stroke-width="0.8"/>
      <rect x="16" y="36.5" width="5" height="3" rx="0.5" fill="#0f172a" stroke="#fdba74" stroke-width="0.8"/>
      <rect x="23" y="36.5" width="5" height="3" rx="0.5" fill="#0f172a" stroke="#fdba74" stroke-width="0.8"/>
      <rect x="30" y="36.5" width="5" height="3" rx="0.5" fill="#0f172a" stroke="#fdba74" stroke-width="0.8"/>
      <rect x="37" y="36.5" width="5" height="3" rx="0.5" fill="#0f172a" stroke="#fdba74" stroke-width="0.8"/>
      <circle cx="45" cy="38" r="1.5" fill="#22c55e"/>
    </svg>
  `,

  nvr: `
    <svg viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Chasis NVR rack/desktop -->
      <rect x="6" y="12" width="40" height="28" rx="3" fill="#1e293b" stroke="#6366f1" stroke-width="2"/>
      <!-- Bahías de discos -->
      <rect x="10" y="17" width="14" height="4" rx="1" fill="#0f172a" stroke="#818cf8" stroke-width="0.8"/>
      <rect x="10" y="23" width="14" height="4" rx="1" fill="#0f172a" stroke="#818cf8" stroke-width="0.8"/>
      <circle cx="21" cy="19" r="0.8" fill="#22c55e"/>
      <circle cx="21" cy="25" r="0.8" fill="#22c55e"/>
      <!-- Texto NVR -->
      <text x="17" y="34" font-family="'JetBrains Mono', monospace" font-size="6.5" font-weight="900" fill="#a5b4fc" text-anchor="middle">NVR</text>
      <!-- Display mini matriz 4 cámaras cuadradas -->
      <rect x="28" y="16" width="14" height="14" rx="2" fill="#0f172a" stroke="#6366f1" stroke-width="1"/>
      <line x1="28" y1="23" x2="42" y2="23" stroke="#4f46e5" stroke-width="0.8"/>
      <line x1="35" y1="16" x2="35" y2="30" stroke="#4f46e5" stroke-width="0.8"/>
      <circle cx="31.5" cy="19.5" r="1.2" fill="#38bdf8"/>
      <circle cx="38.5" cy="19.5" r="1.2" fill="#38bdf8"/>
      <circle cx="31.5" cy="26.5" r="1.2" fill="#38bdf8"/>
      <circle cx="38.5" cy="26.5" r="1.2" fill="#38bdf8"/>
      <!-- LED rojo REC activo -->
      <circle cx="32" cy="34.5" r="1.8" fill="#ef4444"/>
      <text x="38" y="36" font-family="sans-serif" font-size="4" font-weight="bold" fill="#f87171">REC</text>
    </svg>
  `,

  dvr: `
    <svg viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Chasis DVR -->
      <rect x="6" y="12" width="40" height="28" rx="3" fill="#1e293b" stroke="#06b6d4" stroke-width="2"/>
      <!-- Canales BNC analógicos frontales -->
      <circle cx="12" cy="18" r="2.5" fill="#0f172a" stroke="#06b6d4" stroke-width="1"/>
      <circle cx="18" cy="18" r="2.5" fill="#0f172a" stroke="#06b6d4" stroke-width="1"/>
      <circle cx="24" cy="18" r="2.5" fill="#0f172a" stroke="#06b6d4" stroke-width="1"/>
      <circle cx="30" cy="18" r="2.5" fill="#0f172a" stroke="#06b6d4" stroke-width="1"/>
      <circle cx="12" cy="25" r="2.5" fill="#0f172a" stroke="#06b6d4" stroke-width="1"/>
      <circle cx="18" cy="25" r="2.5" fill="#0f172a" stroke="#06b6d4" stroke-width="1"/>
      <circle cx="24" cy="25" r="2.5" fill="#0f172a" stroke="#06b6d4" stroke-width="1"/>
      <circle cx="30" cy="25" r="2.5" fill="#0f172a" stroke="#06b6d4" stroke-width="1"/>
      <!-- Texto DVR -->
      <text x="39" y="24" font-family="'JetBrains Mono', monospace" font-size="7" font-weight="900" fill="#67e8f9" text-anchor="middle">DVR</text>
      <!-- Barra de estado inferior y REC -->
      <line x1="10" y1="31" x2="42" y2="31" stroke="rgba(6,182,212,0.3)" stroke-width="1"/>
      <circle cx="13" cy="35" r="1.5" fill="#ef4444"/>
      <circle cx="18" cy="35" r="1" fill="#22c55e"/>
      <circle cx="22" cy="35" r="1" fill="#06b6d4"/>
      <text x="35" y="36.5" font-family="'JetBrains Mono', monospace" font-size="4.5" fill="#94a3b8" text-anchor="middle">8 CH</text>
    </svg>
  `,

  camara: `
    <svg viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Base de montaje y brazo orientable -->
      <path d="M12 40L18 32M18 32L24 28" stroke="#64748b" stroke-width="3" stroke-linecap="round"/>
      <rect x="8" y="38" width="8" height="5" rx="1.5" fill="#334155" stroke="#94a3b8" stroke-width="1.2"/>
      <!-- Parasol superior -->
      <path d="M16 16L38 10L42 15L18 21Z" fill="#334155" stroke="#f59e0b" stroke-width="1.2"/>
      <!-- Cuerpo cilíndrico de la cámara bullet -->
      <rect x="18" y="15" width="22" height="15" rx="3" fill="#1e293b" stroke="#f59e0b" stroke-width="2" transform="rotate(-15 18 15)"/>
      <!-- Lente y aro infrarrojo frontal -->
      <ellipse cx="38" cy="18" rx="3.5" ry="6" fill="#0f172a" stroke="#f59e0b" stroke-width="1.8" transform="rotate(-15 38 18)"/>
      <circle cx="38" cy="18" r="2" fill="#38bdf8"/>
      <circle cx="38" cy="18" r="0.8" fill="#ffffff"/>
      <!-- LED de estado infrarrojo / actividad -->
      <circle cx="34" cy="13" r="1.2" fill="#ef4444"/>
    </svg>
  `,

  nas: `
    <svg viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Chasis torre NAS compacto -->
      <rect x="9" y="7" width="34" height="38" rx="4" fill="#1e293b" stroke="#10b981" stroke-width="2.2"/>
      <!-- 4 Bahías de discos duros hot-swap verticales -->
      <g transform="translate(13, 11)">
        <!-- HDD 1 -->
        <rect x="0" y="0" width="5" height="24" rx="1" fill="#0f172a" stroke="#34d399" stroke-width="1"/>
        <circle cx="2.5" cy="3" r="0.9" fill="#22c55e"/>
        <line x1="1.2" y1="12" x2="3.8" y2="12" stroke="#475569" stroke-width="1"/>
        <!-- HDD 2 -->
        <rect x="7" y="0" width="5" height="24" rx="1" fill="#0f172a" stroke="#34d399" stroke-width="1"/>
        <circle cx="9.5" cy="3" r="0.9" fill="#22c55e"/>
        <line x1="8.2" y1="12" x2="10.8" y2="12" stroke="#475569" stroke-width="1"/>
        <!-- HDD 3 -->
        <rect x="14" y="0" width="5" height="24" rx="1" fill="#0f172a" stroke="#34d399" stroke-width="1"/>
        <circle cx="16.5" cy="3" r="0.9" fill="#22c55e"/>
        <line x1="15.2" y1="12" x2="17.8" y2="12" stroke="#475569" stroke-width="1"/>
        <!-- HDD 4 -->
        <rect x="21" y="0" width="5" height="24" rx="1" fill="#0f172a" stroke="#34d399" stroke-width="1"/>
        <circle cx="23.5" cy="3" r="0.9" fill="#22c55e"/>
        <line x1="22.2" y1="12" x2="24.8" y2="12" stroke="#475569" stroke-width="1"/>
      </g>
      <!-- Panel inferior: botón power, USB y rótulo NAS -->
      <circle cx="15" cy="39" r="2" fill="#0f172a" stroke="#10b981" stroke-width="1"/>
      <rect x="20" y="38" width="3" height="2" fill="#10b981"/>
      <text x="34" y="41.5" font-family="'JetBrains Mono', monospace" font-size="7.5" font-weight="900" fill="#6ee7b7" text-anchor="middle">NAS</text>
    </svg>
  `,

  pc_backup: `
    <svg viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Monitor PC de fondo -->
      <rect x="8" y="7" width="30" height="22" rx="2.5" fill="#1e293b" stroke="#0ea5e9" stroke-width="2"/>
      <rect x="12" y="10.5" width="22" height="15" rx="1" fill="#0f172a"/>
      <!-- Flechas circulares de Backup / Sincronización en pantalla -->
      <path d="M23 15A3.5 3.5 0 0 1 26.5 18.5H28L25.5 21L23 18.5H24.5A1.5 1.5 0 0 0 23 17" stroke="#38bdf8" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M23 21A3.5 3.5 0 0 1 19.5 17.5H18L20.5 15L23 17.5H21.5A1.5 1.5 0 0 0 23 19" stroke="#38bdf8" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
      <!-- Pie monitor -->
      <path d="M23 29V33M18 33H28" stroke="#64748b" stroke-width="2" stroke-linecap="round"/>
      <!-- Disco de almacenamiento externo / Servidor Backup al lado -->
      <rect x="33" y="16" width="13" height="25" rx="2" fill="#0f172a" stroke="#38bdf8" stroke-width="1.8"/>
      <line x1="36" y1="21" x2="43" y2="21" stroke="#38bdf8" stroke-width="1"/>
      <line x1="36" y1="25" x2="43" y2="25" stroke="#38bdf8" stroke-width="1"/>
      <circle cx="39.5" cy="30" r="1.5" fill="#22c55e"/>
      <text x="39.5" y="38" font-family="'JetBrains Mono', monospace" font-size="4" font-weight="900" fill="#38bdf8" text-anchor="middle">BKP</text>
    </svg>
  `,

  server: `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Unidad superior -->
      <rect x="7" y="7" width="34" height="13" rx="3" fill="#1e293b" stroke="#60a5fa" stroke-width="2"/>
      <circle cx="13" cy="13.5" r="2" fill="#22c55e"/>
      <circle cx="19" cy="13.5" r="1.5" fill="#38bdf8"/>
      <line x1="26" y1="13.5" x2="36" y2="13.5" stroke="#60a5fa" stroke-width="2" stroke-linecap="round"/>
      
      <!-- Unidad inferior -->
      <rect x="7" y="24" width="34" height="13" rx="3" fill="#1e293b" stroke="#60a5fa" stroke-width="2"/>
      <circle cx="13" cy="30.5" r="2" fill="#22c55e"/>
      <circle cx="19" cy="30.5" r="1.5" fill="#38bdf8"/>
      <line x1="26" y1="30.5" x2="36" y2="30.5" stroke="#60a5fa" stroke-width="2" stroke-linecap="round"/>

      <!-- Patas rack -->
      <path d="M12 37V41M36 37V41" stroke="#475569" stroke-width="2.5" stroke-linecap="round"/>
    </svg>
  `,

  firewall: `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="8" width="36" height="32" rx="3" fill="#1e293b" stroke="#f87171" stroke-width="2.5"/>
      <!-- Patrón de ladrillos -->
      <line x1="6" y1="18" x2="42" y2="18" stroke="#f87171" stroke-width="2"/>
      <line x1="6" y1="28" x2="42" y2="28" stroke="#f87171" stroke-width="2"/>
      <line x1="18" y1="8" x2="18" y2="18" stroke="#f87171" stroke-width="2"/>
      <line x1="30" y1="8" x2="30" y2="18" stroke="#f87171" stroke-width="2"/>
      <line x1="24" y1="18" x2="24" y2="28" stroke="#f87171" stroke-width="2"/>
      <line x1="15" y1="28" x2="15" y2="40" stroke="#f87171" stroke-width="2"/>
      <line x1="33" y1="28" x2="33" y2="40" stroke="#f87171" stroke-width="2"/>
    </svg>
  `,

  pc: `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Monitor -->
      <rect x="6" y="8" width="36" height="24" rx="3" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
      <rect x="10" y="12" width="28" height="16" rx="1" fill="#0f172a"/>
      <!-- Pantalla interior / código -->
      <path d="M14 17L18 20L14 23" stroke="#38bdf8" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="21" y1="23" x2="26" y2="23" stroke="#34d399" stroke-width="1.5" stroke-linecap="round"/>
      <!-- Pie y base -->
      <path d="M24 32V38M16 38H32" stroke="#64748b" stroke-width="2.5" stroke-linecap="round"/>
    </svg>
  `,

  laptop: `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Pantalla abierta -->
      <rect x="10" y="10" width="28" height="20" rx="2" fill="#1e293b" stroke="#818cf8" stroke-width="2"/>
      <rect x="13" y="13" width="22" height="14" rx="1" fill="#0f172a"/>
      <!-- Base teclado -->
      <path d="M5 36H43L40 32H8L5 36Z" fill="#334155" stroke="#818cf8" stroke-width="1.5"/>
      <line x1="21" y1="34" x2="27" y2="34" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
  `,

  ap: `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Dispositivo central -->
      <ellipse cx="24" cy="30" rx="15" ry="6" fill="#1e293b" stroke="#fbbf24" stroke-width="2"/>
      <circle cx="24" cy="30" r="2" fill="#fbbf24"/>
      <!-- Ondas Wi-Fi superiores -->
      <path d="M17 21C19.2 19 21.5 18 24 18C26.5 18 28.8 19 31 21" stroke="#fbbf24" stroke-width="2" stroke-linecap="round"/>
      <path d="M12 16C15.6 13 19.6 11.5 24 11.5C28.4 11.5 32.4 13 36 16" stroke="#fbbf24" stroke-width="2" stroke-linecap="round"/>
      <path d="M7 11C11.9 7 17.7 5 24 5C30.3 5 36.1 7 41 11" stroke="#fbbf24" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `,

  cloud: `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Nube WAN / Internet limpia, proporcionada y estética -->
      <path d="M 14 34 H 34 C 38.4 34 42 30.4 42 26 C 42 22 38.8 18.7 34.8 18.2 C 34 12.5 29 8 23 8 C 17.8 8 13.5 11.2 11.8 15.8 C 8 16.5 5 19.8 5 24 C 5 29.5 9 34 14 34 Z" 
        fill="#1e293b" stroke="#38bdf8" stroke-width="2.2" stroke-linejoin="round"/>
      <!-- Símbolo WAN / Globo terráqueo simple -->
      <circle cx="23.5" cy="22.5" r="5" stroke="#38bdf8" stroke-width="1.5"/>
      <ellipse cx="23.5" cy="22.5" rx="2.2" ry="5" stroke="#38bdf8" stroke-width="1.2"/>
      <line x1="18.5" y1="22.5" x2="28.5" y2="22.5" stroke="#38bdf8" stroke-width="1.3"/>
    </svg>
  `,

  printer: `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Hoja superior -->
      <path d="M15 8H33V18H15V8Z" fill="#334155" stroke="#94a3b8" stroke-width="2"/>
      <!-- Cuerpo impresora -->
      <rect x="8" y="18" width="32" height="18" rx="3" fill="#1e293b" stroke="#cbd5e1" stroke-width="2.5"/>
      <circle cx="34" cy="23" r="1.5" fill="#22c55e"/>
      <!-- Hoja inferior de salida -->
      <rect x="14" y="27" width="20" height="13" rx="1" fill="#0f172a" stroke="#94a3b8" stroke-width="2"/>
      <line x1="18" y1="33" x2="30" y2="33" stroke="#64748b" stroke-width="1.5"/>
    </svg>
  `,

  phone: `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="8" width="28" height="32" rx="4" fill="#1e293b" stroke="#f472b6" stroke-width="2"/>
      <!-- Pantallita -->
      <rect x="15" y="12" width="18" height="9" rx="1" fill="#0f172a" stroke="#f472b6" stroke-width="1"/>
      <line x1="18" y1="16" x2="26" y2="16" stroke="#f472b6" stroke-width="1"/>
      <!-- Botones numéricos -->
      <circle cx="17" cy="26" r="1.5" fill="#e2e8f0"/>
      <circle cx="24" cy="26" r="1.5" fill="#e2e8f0"/>
      <circle cx="31" cy="26" r="1.5" fill="#e2e8f0"/>
      <circle cx="17" cy="31" r="1.5" fill="#e2e8f0"/>
      <circle cx="24" cy="31" r="1.5" fill="#e2e8f0"/>
      <circle cx="31" cy="31" r="1.5" fill="#e2e8f0"/>
    </svg>
  `,

  database: `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="24" cy="11" rx="16" ry="6" fill="#1e293b" stroke="#f59e0b" stroke-width="2"/>
      <path d="M8 11V23C8 26.3 15.2 29 24 29C32.8 29 40 26.3 40 23V11" stroke="#f59e0b" stroke-width="2"/>
      <path d="M8 23V35C8 38.3 15.2 41 24 41C32.8 41 40 38.3 40 35V23" stroke="#f59e0b" stroke-width="2"/>
    </svg>
  `,

  ups: `
    <svg viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Chasis UPS rectangular limpio y minimalista -->
      <rect x="9" y="5" width="34" height="42" rx="4" fill="#1e293b" stroke="#f97316" stroke-width="2.5"/>
      <!-- Texto UPS simple y nítido -->
      <text x="26" y="24" font-family="'JetBrains Mono', 'Segoe UI', monospace" font-size="12" font-weight="900" fill="#f8fafc" text-anchor="middle" letter-spacing="1">UPS</text>
      <!-- Línea divisoria y símbolo de batería simple -->
      <line x1="15" y1="29" x2="37" y2="29" stroke="#f97316" stroke-width="1.5" stroke-dasharray="3 2"/>
      <!-- Mini icono de batería esquemática -->
      <rect x="18" y="33.5" width="14" height="7.5" rx="1.5" fill="#0f172a" stroke="#22c55e" stroke-width="1.2"/>
      <rect x="32" y="35.5" width="1.8" height="3.5" rx="0.5" fill="#22c55e"/>
      <rect x="20" y="35" width="4.5" height="4.5" rx="0.8" fill="#22c55e"/>
      <rect x="25.5" y="35" width="4.5" height="4.5" rx="0.8" fill="#22c55e"/>
    </svg>
  `,

  termica: `
    <svg viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Módulo DIN vertical limpio y esquemático -->
      <rect x="13" y="5" width="26" height="42" rx="3" fill="#1e293b" stroke="#ef4444" stroke-width="2.5"/>
      <!-- Bornes superior e inferior -->
      <circle cx="26" cy="11" r="3" fill="#0f172a" stroke="#ef4444" stroke-width="1.5"/>
      <circle cx="26" cy="41" r="3" fill="#0f172a" stroke="#ef4444" stroke-width="1.5"/>
      <!-- Símbolo esquemático de llave interruptora termomagnética -->
      <line x1="26" y1="14" x2="26" y2="20" stroke="#f87171" stroke-width="2"/>
      <!-- Cuchilla / Palanca de corte -->
      <line x1="26" y1="20" x2="33" y2="28" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round"/>
      <!-- Disparador térmico (rectángulo) -->
      <rect x="23" y="30" width="6" height="4" rx="0.5" fill="#ef4444"/>
      <line x1="26" y1="34" x2="26" y2="38" stroke="#f87171" stroke-width="2"/>
      <!-- Etiqueta pequeña -->
      <text x="26" y="27" font-family="'JetBrains Mono', monospace" font-size="6" font-weight="bold" fill="#fca5a5" text-anchor="middle">TM</text>
    </svg>
  `,

  transfer: `
    <svg viewBox="0 0 176 46" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Chasis rectangular alargado del Transfer -->
      <rect x="2" y="3" width="172" height="40" rx="6" fill="#1e293b" stroke="#e11d48" stroke-width="2.5"/>
      
      <!-- SECCIÓN IZQUIERDA: Entradas UPS (S1 y S2) -->
      <!-- Borne S1 -->
      <circle cx="18" cy="22" r="7" fill="#0f172a" stroke="#38bdf8" stroke-width="2"/>
      <circle cx="18" cy="22" r="2.5" fill="#38bdf8"/>
      <text x="18" y="38" font-family="'JetBrains Mono', monospace" font-size="7" font-weight="900" fill="#38bdf8" text-anchor="middle">S1</text>
      
      <!-- Borne S2 -->
      <circle cx="38" cy="22" r="7" fill="#0f172a" stroke="#f59e0b" stroke-width="2"/>
      <circle cx="38" cy="22" r="2.5" fill="#f59e0b"/>
      <text x="38" y="38" font-family="'JetBrains Mono', monospace" font-size="7" font-weight="900" fill="#f59e0b" text-anchor="middle">S2</text>

      <text x="28" y="10" font-family="'JetBrains Mono', monospace" font-size="5" font-weight="bold" fill="#cbd5e1" text-anchor="middle">ENTRADAS</text>

      <line x1="52" y1="6" x2="52" y2="40" stroke="rgba(255,255,255,0.15)" stroke-width="1.2" stroke-dasharray="2 2"/>

      <!-- SECCIÓN CENTRAL: 4 Salidas Comunes (4 flechas hacia abajo) -->
      <!-- Salida PC 1 -->
      <circle cx="68" cy="18" r="3.5" fill="#0f172a" stroke="#22c55e" stroke-width="1.5"/>
      <path d="M68 22V32M65.5 29.5L68 32L70.5 29.5" stroke="#22c55e" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="68" y="40" font-family="'JetBrains Mono', monospace" font-size="5" fill="#86efac" text-anchor="middle">1</text>

      <!-- Salida PC 2 -->
      <circle cx="86" cy="18" r="3.5" fill="#0f172a" stroke="#22c55e" stroke-width="1.5"/>
      <path d="M86 22V32M83.5 29.5L86 32L88.5 29.5" stroke="#22c55e" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="86" y="40" font-family="'JetBrains Mono', monospace" font-size="5" fill="#86efac" text-anchor="middle">2</text>

      <!-- Salida PC 3 -->
      <circle cx="104" cy="18" r="3.5" fill="#0f172a" stroke="#22c55e" stroke-width="1.5"/>
      <path d="M104 22V32M101.5 29.5L104 32L106.5 29.5" stroke="#22c55e" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="104" y="40" font-family="'JetBrains Mono', monospace" font-size="5" fill="#86efac" text-anchor="middle">3</text>

      <!-- Salida PC 4 -->
      <circle cx="122" cy="18" r="3.5" fill="#0f172a" stroke="#22c55e" stroke-width="1.5"/>
      <path d="M122 22V32M119.5 29.5L122 32L124.5 29.5" stroke="#22c55e" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="122" y="40" font-family="'JetBrains Mono', monospace" font-size="5" fill="#86efac" text-anchor="middle">4</text>

      <text x="95" y="10" font-family="'JetBrains Mono', monospace" font-size="5" font-weight="bold" fill="#86efac" text-anchor="middle">SALIDAS COMUNES</text>

      <line x1="138" y1="6" x2="138" y2="40" stroke="rgba(255,255,255,0.15)" stroke-width="1.2" stroke-dasharray="2 2"/>

      <!-- SECCIÓN DERECHA: Salida grande para Canal de Tensión -->
      <rect x="144" y="9" width="26" height="28" rx="4" fill="#0f172a" stroke="#ef4444" stroke-width="2"/>
      <circle cx="157" cy="22" r="6" fill="#ef4444" opacity="0.25"/>
      <circle cx="157" cy="22" r="3" fill="#ef4444"/>
      <text x="157" y="41" font-family="'JetBrains Mono', monospace" font-size="5" font-weight="900" fill="#fca5a5" text-anchor="middle">CANAL</text>
    </svg>
  `,

  canal_tension_5: `
    <svg viewBox="0 0 186 46" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Carcasa del Canal de Tensión 5 Tomas -->
      <rect x="2" y="4" width="182" height="38" rx="5" fill="#1e293b" stroke="#38bdf8" stroke-width="2.2"/>
      
      <!-- Entrada 220V desde Transfer -->
      <circle cx="15" cy="23" r="6" fill="#0f172a" stroke="#ef4444" stroke-width="1.8"/>
      <circle cx="15" cy="23" r="2.5" fill="#ef4444"/>
      <text x="15" y="38" font-family="'JetBrains Mono', monospace" font-size="4.8" font-weight="bold" fill="#fca5a5" text-anchor="middle">IN</text>

      <line x1="28" y1="8" x2="28" y2="38" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>

      <!-- Tomas IRAM 2073 argentinas 220V (1, 2, 3, 4, 5) -->
      <!-- Toma 1 -->
      <g transform="translate(42, 23)">
        <rect x="-10" y="-12" width="20" height="24" rx="3" fill="#0f172a" stroke="#475569" stroke-width="1"/>
        <line x1="0" y1="-8" x2="0" y2="-3" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="-5.5" y1="4" x2="-2" y2="0.5" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="5.5" y1="4" x2="2" y2="0.5" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <text x="0" y="10" font-family="'JetBrains Mono', monospace" font-size="4.5" fill="#94a3b8" text-anchor="middle">T1</text>
      </g>

      <!-- Toma 2 -->
      <g transform="translate(72, 23)">
        <rect x="-10" y="-12" width="20" height="24" rx="3" fill="#0f172a" stroke="#475569" stroke-width="1"/>
        <line x1="0" y1="-8" x2="0" y2="-3" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="-5.5" y1="4" x2="-2" y2="0.5" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="5.5" y1="4" x2="2" y2="0.5" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <text x="0" y="10" font-family="'JetBrains Mono', monospace" font-size="4.5" fill="#94a3b8" text-anchor="middle">T2</text>
      </g>

      <!-- Toma 3 -->
      <g transform="translate(102, 23)">
        <rect x="-10" y="-12" width="20" height="24" rx="3" fill="#0f172a" stroke="#475569" stroke-width="1"/>
        <line x1="0" y1="-8" x2="0" y2="-3" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="-5.5" y1="4" x2="-2" y2="0.5" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="5.5" y1="4" x2="2" y2="0.5" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <text x="0" y="10" font-family="'JetBrains Mono', monospace" font-size="4.5" fill="#94a3b8" text-anchor="middle">T3</text>
      </g>

      <!-- Toma 4 -->
      <g transform="translate(132, 23)">
        <rect x="-10" y="-12" width="20" height="24" rx="3" fill="#0f172a" stroke="#475569" stroke-width="1"/>
        <line x1="0" y1="-8" x2="0" y2="-3" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="-5.5" y1="4" x2="-2" y2="0.5" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="5.5" y1="4" x2="2" y2="0.5" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <text x="0" y="10" font-family="'JetBrains Mono', monospace" font-size="4.5" fill="#94a3b8" text-anchor="middle">T4</text>
      </g>

      <!-- Toma 5 -->
      <g transform="translate(162, 23)">
        <rect x="-10" y="-12" width="20" height="24" rx="3" fill="#0f172a" stroke="#475569" stroke-width="1"/>
        <line x1="0" y1="-8" x2="0" y2="-3" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="-5.5" y1="4" x2="-2" y2="0.5" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="5.5" y1="4" x2="2" y2="0.5" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <text x="0" y="10" font-family="'JetBrains Mono', monospace" font-size="4.5" fill="#94a3b8" text-anchor="middle">T5</text>
      </g>
    </svg>
  `,

  canal_tension_7: `
    <svg viewBox="0 0 246 46" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Carcasa del Canal de Tensión 7 Tomas -->
      <rect x="2" y="4" width="242" height="38" rx="5" fill="#1e293b" stroke="#38bdf8" stroke-width="2.2"/>
      
      <!-- Entrada 220V desde Transfer -->
      <circle cx="15" cy="23" r="6" fill="#0f172a" stroke="#ef4444" stroke-width="1.8"/>
      <circle cx="15" cy="23" r="2.5" fill="#ef4444"/>
      <text x="15" y="38" font-family="'JetBrains Mono', monospace" font-size="4.8" font-weight="bold" fill="#fca5a5" text-anchor="middle">IN</text>

      <line x1="28" y1="8" x2="28" y2="38" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>

      <!-- Tomas IRAM 2073 argentinas 220V (1 a 7) -->
      <!-- Toma 1 -->
      <g transform="translate(42, 23)">
        <rect x="-10" y="-12" width="20" height="24" rx="3" fill="#0f172a" stroke="#475569" stroke-width="1"/>
        <line x1="0" y1="-8" x2="0" y2="-3" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="-5.5" y1="4" x2="-2" y2="0.5" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="5.5" y1="4" x2="2" y2="0.5" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <text x="0" y="10" font-family="'JetBrains Mono', monospace" font-size="4.5" fill="#94a3b8" text-anchor="middle">T1</text>
      </g>

      <!-- Toma 2 -->
      <g transform="translate(72, 23)">
        <rect x="-10" y="-12" width="20" height="24" rx="3" fill="#0f172a" stroke="#475569" stroke-width="1"/>
        <line x1="0" y1="-8" x2="0" y2="-3" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="-5.5" y1="4" x2="-2" y2="0.5" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="5.5" y1="4" x2="2" y2="0.5" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <text x="0" y="10" font-family="'JetBrains Mono', monospace" font-size="4.5" fill="#94a3b8" text-anchor="middle">T2</text>
      </g>

      <!-- Toma 3 -->
      <g transform="translate(102, 23)">
        <rect x="-10" y="-12" width="20" height="24" rx="3" fill="#0f172a" stroke="#475569" stroke-width="1"/>
        <line x1="0" y1="-8" x2="0" y2="-3" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="-5.5" y1="4" x2="-2" y2="0.5" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="5.5" y1="4" x2="2" y2="0.5" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <text x="0" y="10" font-family="'JetBrains Mono', monospace" font-size="4.5" fill="#94a3b8" text-anchor="middle">T3</text>
      </g>

      <!-- Toma 4 -->
      <g transform="translate(132, 23)">
        <rect x="-10" y="-12" width="20" height="24" rx="3" fill="#0f172a" stroke="#475569" stroke-width="1"/>
        <line x1="0" y1="-8" x2="0" y2="-3" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="-5.5" y1="4" x2="-2" y2="0.5" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="5.5" y1="4" x2="2" y2="0.5" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <text x="0" y="10" font-family="'JetBrains Mono', monospace" font-size="4.5" fill="#94a3b8" text-anchor="middle">T4</text>
      </g>

      <!-- Toma 5 -->
      <g transform="translate(162, 23)">
        <rect x="-10" y="-12" width="20" height="24" rx="3" fill="#0f172a" stroke="#475569" stroke-width="1"/>
        <line x1="0" y1="-8" x2="0" y2="-3" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="-5.5" y1="4" x2="-2" y2="0.5" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="5.5" y1="4" x2="2" y2="0.5" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <text x="0" y="10" font-family="'JetBrains Mono', monospace" font-size="4.5" fill="#94a3b8" text-anchor="middle">T5</text>
      </g>

      <!-- Toma 6 -->
      <g transform="translate(192, 23)">
        <rect x="-10" y="-12" width="20" height="24" rx="3" fill="#0f172a" stroke="#475569" stroke-width="1"/>
        <line x1="0" y1="-8" x2="0" y2="-3" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="-5.5" y1="4" x2="-2" y2="0.5" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="5.5" y1="4" x2="2" y2="0.5" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <text x="0" y="10" font-family="'JetBrains Mono', monospace" font-size="4.5" fill="#94a3b8" text-anchor="middle">T6</text>
      </g>

      <!-- Toma 7 -->
      <g transform="translate(222, 23)">
        <rect x="-10" y="-12" width="20" height="24" rx="3" fill="#0f172a" stroke="#475569" stroke-width="1"/>
        <line x1="0" y1="-8" x2="0" y2="-3" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="-5.5" y1="4" x2="-2" y2="0.5" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="5.5" y1="4" x2="2" y2="0.5" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <text x="0" y="10" font-family="'JetBrains Mono', monospace" font-size="4.5" fill="#94a3b8" text-anchor="middle">T7</text>
      </g>
    </svg>
  `,

  text_badge: `
    <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="14" width="48" height="28" rx="6" fill="#09131e" stroke="#10b981" stroke-width="2"/>
      <text x="28" y="32" font-family="'JetBrains Mono', monospace" font-size="12" font-weight="bold" fill="#10b981" text-anchor="middle">IP</text>
    </svg>
  `
};

// ==========================================================================
// ICONOS VECTORIALES PARA MODO BLANCO (TEMA CLARO) - DEVICE_ICONS_LIGHT
// Diseñados específicamente con chasis metálicos claros, grises técnicos,
// contrastes limpios y acentos de color que se integran y destacan sobre blanco
// ==========================================================================
const DEVICE_ICONS_LIGHT = {
  router_sophos: `
    <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="l-sph-cyl-top" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#0284c7"/>
          <stop offset="100%" stop-color="#0369a1"/>
        </linearGradient>
        <linearGradient id="l-sph-cyl-front" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#0369a1"/>
          <stop offset="100%" stop-color="#075985"/>
        </linearGradient>
      </defs>
      <!-- Pared lateral curva del cilindro 3D -->
      <path d="M 5 19 V 36 A 23 11 0 0 0 51 36 V 19 A 23 11 0 0 1 5 19 Z" fill="url(#l-sph-cyl-front)" stroke="#0284c7" stroke-width="1.8" stroke-linejoin="round"/>
      <!-- Tapa elíptica superior -->
      <ellipse cx="28" cy="19" rx="23" ry="11" fill="url(#l-sph-cyl-top)" stroke="#0284c7" stroke-width="1.8"/>
      <!-- 4 Flechas de Routing en perspectiva isométrica (2 entran, 2 salen) -->
      <path d="M 24.1 17.1 L 17.4 17.0 L 19.2 16.1 L 13.5 13.4 L 16.3 12.0 L 22.0 14.8 L 23.8 13.9 Z" fill="#ffffff"/>
      <path d="M 41.1 12.7 L 40.7 15.9 L 39.0 15.1 L 33.3 17.8 L 30.5 16.5 L 36.1 13.7 L 34.4 12.9 Z" fill="#ffffff"/>
      <path d="M 14.9 25.3 L 15.3 22.1 L 17.0 22.9 L 22.7 20.2 L 25.5 21.5 L 19.9 24.3 L 21.6 25.1 Z" fill="#ffffff"/>
      <path d="M 31.9 20.9 L 38.6 21.0 L 36.8 21.9 L 42.5 24.6 L 39.7 26.0 L 34.0 23.2 L 32.2 24.1 Z" fill="#ffffff"/>
      <!-- Badge de marca Sophos en frontal curvo -->
      <text x="28" y="35.5" font-family="'JetBrains Mono', sans-serif" font-size="4.2" font-weight="900" fill="#e0f2fe" text-anchor="middle" letter-spacing="0.8">SOPHOS</text>
    </svg>
  `,

  router_fortinet: `
    <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="l-fgt-cyl-top" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#16a34a"/>
          <stop offset="100%" stop-color="#15803d"/>
        </linearGradient>
        <linearGradient id="l-fgt-cyl-front" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#15803d"/>
          <stop offset="100%" stop-color="#14532d"/>
        </linearGradient>
      </defs>
      <!-- Pared lateral curva del cilindro 3D -->
      <path d="M 5 19 V 36 A 23 11 0 0 0 51 36 V 19 A 23 11 0 0 1 5 19 Z" fill="url(#l-fgt-cyl-front)" stroke="#16a34a" stroke-width="1.8" stroke-linejoin="round"/>
      <!-- Tapa elíptica superior -->
      <ellipse cx="28" cy="19" rx="23" ry="11" fill="url(#l-fgt-cyl-top)" stroke="#16a34a" stroke-width="1.8"/>
      <!-- 4 Flechas de Routing en perspectiva isométrica (2 entran, 2 salen) -->
      <path d="M 24.1 17.1 L 17.4 17.0 L 19.2 16.1 L 13.5 13.4 L 16.3 12.0 L 22.0 14.8 L 23.8 13.9 Z" fill="#ffffff"/>
      <path d="M 41.1 12.7 L 40.7 15.9 L 39.0 15.1 L 33.3 17.8 L 30.5 16.5 L 36.1 13.7 L 34.4 12.9 Z" fill="#ffffff"/>
      <path d="M 14.9 25.3 L 15.3 22.1 L 17.0 22.9 L 22.7 20.2 L 25.5 21.5 L 19.9 24.3 L 21.6 25.1 Z" fill="#ffffff"/>
      <path d="M 31.9 20.9 L 38.6 21.0 L 36.8 21.9 L 42.5 24.6 L 39.7 26.0 L 34.0 23.2 L 32.2 24.1 Z" fill="#ffffff"/>
      <!-- Badge de marca Fortinet en frontal curvo -->
      <text x="28" y="35.5" font-family="'JetBrains Mono', sans-serif" font-size="3.8" font-weight="900" fill="#dcfce7" text-anchor="middle" letter-spacing="0.6">FORTINET</text>
    </svg>
  `,

  switch_cisco: `
    <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="l-cisco-top" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#f0f9ff"/>
          <stop offset="100%" stop-color="#e0f2fe"/>
        </linearGradient>
        <linearGradient id="l-cisco-front" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="100%" stop-color="#f1f5f9"/>
        </linearGradient>
      </defs>
      <polygon points="12,12 44,12 50,18 6,18" fill="url(#l-cisco-top)" stroke="#0284c7" stroke-width="1.6"/>
      <rect x="6" y="18" width="44" height="24" rx="3" fill="url(#l-cisco-front)" stroke="#0284c7" stroke-width="2"/>
      <!-- Flechas switching Cisco Azul -->
      <path d="M12 25H27M27 25L23 22M27 25L23 28" stroke="#0284c7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M44 25H29M29 25L33 22M29 25L33 28" stroke="#0284c7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M27 31H12M12 31L16 28M12 31L16 34" stroke="#0284c7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M29 31H44M44 31L40 28M44 31L40 34" stroke="#0284c7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <!-- Badge CISCO -->
      <rect x="8" y="13" width="18" height="4.5" rx="1" fill="#0284c7"/>
      <text x="17" y="16.5" font-family="'JetBrains Mono', sans-serif" font-size="3.5" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="0.5">CISCO</text>
      <!-- Puertos y LEDs -->
      <rect x="9" y="36.5" width="5" height="3" rx="0.5" fill="#334155" stroke="#94a3b8" stroke-width="0.8"/>
      <rect x="16" y="36.5" width="5" height="3" rx="0.5" fill="#334155" stroke="#94a3b8" stroke-width="0.8"/>
      <rect x="23" y="36.5" width="5" height="3" rx="0.5" fill="#334155" stroke="#94a3b8" stroke-width="0.8"/>
      <rect x="30" y="36.5" width="5" height="3" rx="0.5" fill="#334155" stroke="#94a3b8" stroke-width="0.8"/>
      <rect x="37" y="36.5" width="5" height="3" rx="0.5" fill="#334155" stroke="#94a3b8" stroke-width="0.8"/>
      <circle cx="45" cy="38" r="1.5" fill="#16a34a"/>
    </svg>
  `,

  switch_hp: `
    <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="l-hp-top" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ecfdf5"/>
          <stop offset="100%" stop-color="#d1fae5"/>
        </linearGradient>
        <linearGradient id="l-hp-front" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="100%" stop-color="#f1f5f9"/>
        </linearGradient>
      </defs>
      <polygon points="12,12 44,12 50,18 6,18" fill="url(#l-hp-top)" stroke="#059669" stroke-width="1.6"/>
      <rect x="6" y="18" width="44" height="24" rx="3" fill="url(#l-hp-front)" stroke="#059669" stroke-width="2"/>
      <path d="M12 25H27M27 25L23 22M27 25L23 28" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M44 25H29M29 25L33 22M29 25L33 28" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M27 31H12M12 31L16 28M12 31L16 34" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M29 31H44M44 31L40 28M44 31L40 34" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="8" y="13" width="14" height="4.5" rx="1" fill="#059669"/>
      <text x="15" y="16.5" font-family="'JetBrains Mono', sans-serif" font-size="3.5" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="0.5">HP</text>
      <rect x="9" y="36.5" width="5" height="3" rx="0.5" fill="#334155" stroke="#94a3b8" stroke-width="0.8"/>
      <rect x="16" y="36.5" width="5" height="3" rx="0.5" fill="#334155" stroke="#94a3b8" stroke-width="0.8"/>
      <rect x="23" y="36.5" width="5" height="3" rx="0.5" fill="#334155" stroke="#94a3b8" stroke-width="0.8"/>
      <rect x="30" y="36.5" width="5" height="3" rx="0.5" fill="#334155" stroke="#94a3b8" stroke-width="0.8"/>
      <rect x="37" y="36.5" width="5" height="3" rx="0.5" fill="#334155" stroke="#94a3b8" stroke-width="0.8"/>
      <circle cx="45" cy="38" r="1.5" fill="#16a34a"/>
    </svg>
  `,

  switch_huawei: `
    <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="l-hw-top" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#fef2f2"/>
          <stop offset="100%" stop-color="#fee2e2"/>
        </linearGradient>
        <linearGradient id="l-hw-front" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="100%" stop-color="#f1f5f9"/>
        </linearGradient>
      </defs>
      <polygon points="12,12 44,12 50,18 6,18" fill="url(#l-hw-top)" stroke="#dc2626" stroke-width="1.6"/>
      <rect x="6" y="18" width="44" height="24" rx="3" fill="url(#l-hw-front)" stroke="#dc2626" stroke-width="2"/>
      <path d="M12 25H27M27 25L23 22M27 25L23 28" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M44 25H29M29 25L33 22M29 25L33 28" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M27 31H12M12 31L16 28M12 31L16 34" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M29 31H44M44 31L40 28M44 31L40 34" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="8" y="13" width="20" height="4.5" rx="1" fill="#dc2626"/>
      <text x="18" y="16.5" font-family="'JetBrains Mono', sans-serif" font-size="3.2" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="0.4">HUAWEI</text>
      <rect x="9" y="36.5" width="5" height="3" rx="0.5" fill="#334155" stroke="#94a3b8" stroke-width="0.8"/>
      <rect x="16" y="36.5" width="5" height="3" rx="0.5" fill="#334155" stroke="#94a3b8" stroke-width="0.8"/>
      <rect x="23" y="36.5" width="5" height="3" rx="0.5" fill="#334155" stroke="#94a3b8" stroke-width="0.8"/>
      <rect x="30" y="36.5" width="5" height="3" rx="0.5" fill="#334155" stroke="#94a3b8" stroke-width="0.8"/>
      <rect x="37" y="36.5" width="5" height="3" rx="0.5" fill="#334155" stroke="#94a3b8" stroke-width="0.8"/>
      <circle cx="45" cy="38" r="1.5" fill="#f59e0b"/>
    </svg>
  `,

  switch_aruba: `
    <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="l-aruba-top" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#fff7ed"/>
          <stop offset="100%" stop-color="#ffedd5"/>
        </linearGradient>
        <linearGradient id="l-aruba-front" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="100%" stop-color="#f1f5f9"/>
        </linearGradient>
      </defs>
      <polygon points="12,12 44,12 50,18 6,18" fill="url(#l-aruba-top)" stroke="#ea580c" stroke-width="1.6"/>
      <rect x="6" y="18" width="44" height="24" rx="3" fill="url(#l-aruba-front)" stroke="#ea580c" stroke-width="2"/>
      <path d="M12 25H27M27 25L23 22M27 25L23 28" stroke="#ea580c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M44 25H29M29 25L33 22M29 25L33 28" stroke="#ea580c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M27 31H12M12 31L16 28M12 31L16 34" stroke="#ea580c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M29 31H44M44 31L40 28M44 31L40 34" stroke="#ea580c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="8" y="13" width="18" height="4.5" rx="1" fill="#ea580c"/>
      <text x="17" y="16.5" font-family="'JetBrains Mono', sans-serif" font-size="3.2" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="0.4">ARUBA</text>
      <rect x="9" y="36.5" width="5" height="3" rx="0.5" fill="#334155" stroke="#94a3b8" stroke-width="0.8"/>
      <rect x="16" y="36.5" width="5" height="3" rx="0.5" fill="#334155" stroke="#94a3b8" stroke-width="0.8"/>
      <rect x="23" y="36.5" width="5" height="3" rx="0.5" fill="#334155" stroke="#94a3b8" stroke-width="0.8"/>
      <rect x="30" y="36.5" width="5" height="3" rx="0.5" fill="#334155" stroke="#94a3b8" stroke-width="0.8"/>
      <rect x="37" y="36.5" width="5" height="3" rx="0.5" fill="#334155" stroke="#94a3b8" stroke-width="0.8"/>
      <circle cx="45" cy="38" r="1.5" fill="#16a34a"/>
    </svg>
  `,

  nvr: `
    <svg viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="l-nvr-bg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="100%" stop-color="#f1f5f9"/>
        </linearGradient>
      </defs>
      <!-- Chasis NVR plateado/blanco -->
      <rect x="6" y="12" width="40" height="28" rx="3" fill="url(#l-nvr-bg)" stroke="#6366f1" stroke-width="2"/>
      <!-- Bahías de discos -->
      <rect x="10" y="17" width="14" height="4" rx="1" fill="#e2e8f0" stroke="#64748b" stroke-width="0.8"/>
      <rect x="10" y="23" width="14" height="4" rx="1" fill="#e2e8f0" stroke="#64748b" stroke-width="0.8"/>
      <circle cx="21" cy="19" r="0.8" fill="#16a34a"/>
      <circle cx="21" cy="25" r="0.8" fill="#16a34a"/>
      <!-- Texto NVR -->
      <text x="17" y="34" font-family="'JetBrains Mono', monospace" font-size="6.5" font-weight="900" fill="#4338ca" text-anchor="middle">NVR</text>
      <!-- Display mini matriz 4 cámaras cuadradas -->
      <rect x="28" y="16" width="14" height="14" rx="2" fill="#0f172a" stroke="#6366f1" stroke-width="1"/>
      <line x1="28" y1="23" x2="42" y2="23" stroke="#4f46e5" stroke-width="0.8"/>
      <line x1="35" y1="16" x2="35" y2="30" stroke="#4f46e5" stroke-width="0.8"/>
      <circle cx="31.5" cy="19.5" r="1.2" fill="#38bdf8"/>
      <circle cx="38.5" cy="19.5" r="1.2" fill="#38bdf8"/>
      <circle cx="31.5" cy="26.5" r="1.2" fill="#38bdf8"/>
      <circle cx="38.5" cy="26.5" r="1.2" fill="#38bdf8"/>
      <!-- LED rojo REC activo -->
      <circle cx="32" cy="34.5" r="1.8" fill="#ef4444"/>
      <text x="38" y="36" font-family="sans-serif" font-size="4" font-weight="bold" fill="#ef4444">REC</text>
    </svg>
  `,

  dvr: `
    <svg viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="l-dvr-bg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="100%" stop-color="#f1f5f9"/>
        </linearGradient>
      </defs>
      <rect x="6" y="12" width="40" height="28" rx="3" fill="url(#l-dvr-bg)" stroke="#0891b2" stroke-width="2"/>
      <!-- Canales BNC dorados -->
      <circle cx="12" cy="18" r="2.5" fill="#f8fafc" stroke="#d97706" stroke-width="1.2"/>
      <circle cx="18" cy="18" r="2.5" fill="#f8fafc" stroke="#d97706" stroke-width="1.2"/>
      <circle cx="24" cy="18" r="2.5" fill="#f8fafc" stroke="#d97706" stroke-width="1.2"/>
      <circle cx="30" cy="18" r="2.5" fill="#f8fafc" stroke="#d97706" stroke-width="1.2"/>
      <circle cx="12" cy="25" r="2.5" fill="#f8fafc" stroke="#d97706" stroke-width="1.2"/>
      <circle cx="18" cy="25" r="2.5" fill="#f8fafc" stroke="#d97706" stroke-width="1.2"/>
      <circle cx="24" cy="25" r="2.5" fill="#f8fafc" stroke="#d97706" stroke-width="1.2"/>
      <circle cx="30" cy="25" r="2.5" fill="#f8fafc" stroke="#d97706" stroke-width="1.2"/>
      <text x="39" y="24" font-family="'JetBrains Mono', monospace" font-size="7" font-weight="900" fill="#0e7490" text-anchor="middle">DVR</text>
      <line x1="10" y1="31" x2="42" y2="31" stroke="#cbd5e1" stroke-width="1"/>
      <circle cx="13" cy="35" r="1.5" fill="#ef4444"/>
      <circle cx="18" cy="35" r="1" fill="#16a34a"/>
      <circle cx="22" cy="35" r="1" fill="#0891b2"/>
      <text x="35" y="36.5" font-family="'JetBrains Mono', monospace" font-size="4.5" font-weight="bold" fill="#64748b" text-anchor="middle">8 CH</text>
    </svg>
  `,

  camara: `
    <svg viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 40L18 32M18 32L24 28" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/>
      <rect x="8" y="38" width="8" height="5" rx="1.5" fill="#e2e8f0" stroke="#64748b" stroke-width="1.2"/>
      <path d="M16 16L38 10L42 15L18 21Z" fill="#e2e8f0" stroke="#d97706" stroke-width="1.2"/>
      <rect x="18" y="15" width="22" height="15" rx="3" fill="#ffffff" stroke="#d97706" stroke-width="2" transform="rotate(-15 18 15)"/>
      <ellipse cx="38" cy="18" rx="3.5" ry="6" fill="#0f172a" stroke="#d97706" stroke-width="1.8" transform="rotate(-15 38 18)"/>
      <circle cx="38" cy="18" r="2" fill="#0284c7"/>
      <circle cx="38" cy="18" r="0.8" fill="#ffffff"/>
      <circle cx="34" cy="13" r="1.2" fill="#ef4444"/>
    </svg>
  `,

  nas: `
    <svg viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="l-nas-bg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="100%" stop-color="#f1f5f9"/>
        </linearGradient>
      </defs>
      <rect x="9" y="7" width="34" height="38" rx="4" fill="url(#l-nas-bg)" stroke="#059669" stroke-width="2.2"/>
      <g transform="translate(13, 11)">
        <rect x="0" y="0" width="5" height="24" rx="1" fill="#f8fafc" stroke="#059669" stroke-width="1"/>
        <circle cx="2.5" cy="3" r="0.9" fill="#16a34a"/>
        <line x1="1.2" y1="12" x2="3.8" y2="12" stroke="#94a3b8" stroke-width="1"/>
        <rect x="7" y="0" width="5" height="24" rx="1" fill="#f8fafc" stroke="#059669" stroke-width="1"/>
        <circle cx="9.5" cy="3" r="0.9" fill="#16a34a"/>
        <line x1="8.2" y1="12" x2="10.8" y2="12" stroke="#94a3b8" stroke-width="1"/>
        <rect x="14" y="0" width="5" height="24" rx="1" fill="#f8fafc" stroke="#059669" stroke-width="1"/>
        <circle cx="16.5" cy="3" r="0.9" fill="#16a34a"/>
        <line x1="15.2" y1="12" x2="17.8" y2="12" stroke="#94a3b8" stroke-width="1"/>
        <rect x="21" y="0" width="5" height="24" rx="1" fill="#f8fafc" stroke="#059669" stroke-width="1"/>
        <circle cx="23.5" cy="3" r="0.9" fill="#16a34a"/>
        <line x1="22.2" y1="12" x2="24.8" y2="12" stroke="#94a3b8" stroke-width="1"/>
      </g>
      <circle cx="15" cy="39" r="2" fill="#ffffff" stroke="#059669" stroke-width="1"/>
      <rect x="20" y="38" width="3" height="2" fill="#059669"/>
      <text x="34" y="41.5" font-family="'JetBrains Mono', monospace" font-size="7.5" font-weight="900" fill="#059669" text-anchor="middle">NAS</text>
    </svg>
  `,

  pc_backup: `
    <svg viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="7" width="30" height="22" rx="2.5" fill="#f8fafc" stroke="#0284c7" stroke-width="2"/>
      <rect x="12" y="10.5" width="22" height="15" rx="1" fill="#e0f2fe"/>
      <path d="M23 15A3.5 3.5 0 0 1 26.5 18.5H28L25.5 21L23 18.5H24.5A1.5 1.5 0 0 0 23 17" stroke="#0284c7" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M23 21A3.5 3.5 0 0 1 19.5 17.5H18L20.5 15L23 17.5H21.5A1.5 1.5 0 0 0 23 19" stroke="#0284c7" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M23 29V33M18 33H28" stroke="#64748b" stroke-width="2" stroke-linecap="round"/>
      <rect x="33" y="16" width="13" height="25" rx="2" fill="#ffffff" stroke="#0284c7" stroke-width="1.8"/>
      <line x1="36" y1="21" x2="43" y2="21" stroke="#0284c7" stroke-width="1"/>
      <line x1="36" y1="25" x2="43" y2="25" stroke="#0284c7" stroke-width="1"/>
      <circle cx="39.5" cy="30" r="1.5" fill="#16a34a"/>
      <text x="39.5" y="38" font-family="'JetBrains Mono', monospace" font-size="4" font-weight="900" fill="#0284c7" text-anchor="middle">BKP</text>
    </svg>
  `,

  server: `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="l-srv-bg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="100%" stop-color="#f1f5f9"/>
        </linearGradient>
      </defs>
      <!-- Unidad superior -->
      <rect x="7" y="7" width="34" height="13" rx="3" fill="url(#l-srv-bg)" stroke="#2563eb" stroke-width="2"/>
      <circle cx="13" cy="13.5" r="2" fill="#16a34a"/>
      <circle cx="19" cy="13.5" r="1.5" fill="#0284c7"/>
      <line x1="26" y1="13.5" x2="36" y2="13.5" stroke="#2563eb" stroke-width="2" stroke-linecap="round"/>
      
      <!-- Unidad inferior -->
      <rect x="7" y="24" width="34" height="13" rx="3" fill="url(#l-srv-bg)" stroke="#2563eb" stroke-width="2"/>
      <circle cx="13" cy="30.5" r="2" fill="#16a34a"/>
      <circle cx="19" cy="30.5" r="1.5" fill="#0284c7"/>
      <line x1="26" y1="30.5" x2="36" y2="30.5" stroke="#2563eb" stroke-width="2" stroke-linecap="round"/>

      <path d="M12 37V41M36 37V41" stroke="#64748b" stroke-width="2.5" stroke-linecap="round"/>
    </svg>
  `,

  firewall: `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="8" width="36" height="32" rx="3" fill="#fef2f2" stroke="#dc2626" stroke-width="2.5"/>
      <line x1="6" y1="18" x2="42" y2="18" stroke="#dc2626" stroke-width="2"/>
      <line x1="6" y1="28" x2="42" y2="28" stroke="#dc2626" stroke-width="2"/>
      <line x1="18" y1="8" x2="18" y2="18" stroke="#dc2626" stroke-width="2"/>
      <line x1="30" y1="8" x2="30" y2="18" stroke="#dc2626" stroke-width="2"/>
      <line x1="24" y1="18" x2="24" y2="28" stroke="#dc2626" stroke-width="2"/>
      <line x1="15" y1="28" x2="15" y2="40" stroke="#dc2626" stroke-width="2"/>
      <line x1="33" y1="28" x2="33" y2="40" stroke="#dc2626" stroke-width="2"/>
    </svg>
  `,

  pc: `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="8" width="36" height="24" rx="3" fill="#ffffff" stroke="#0284c7" stroke-width="2"/>
      <rect x="10" y="12" width="28" height="16" rx="1" fill="#e0f2fe"/>
      <path d="M14 17L18 20L14 23" stroke="#0284c7" stroke-width="1.8" stroke-linecap="round"/>
      <line x1="21" y1="23" x2="26" y2="23" stroke="#059669" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M24 32V38M16 38H32" stroke="#64748b" stroke-width="2.5" stroke-linecap="round"/>
    </svg>
  `,

  laptop: `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="10" width="28" height="20" rx="2" fill="#ffffff" stroke="#6366f1" stroke-width="2"/>
      <rect x="13" y="13" width="22" height="14" rx="1" fill="#e0e7ff"/>
      <path d="M5 36H43L40 32H8L5 36Z" fill="#e2e8f0" stroke="#6366f1" stroke-width="1.5"/>
      <line x1="21" y1="34" x2="27" y2="34" stroke="#64748b" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
  `,

  ap: `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="l-ap-disc" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="100%" stop-color="#f1f5f9"/>
        </linearGradient>
      </defs>
      <ellipse cx="24" cy="30" rx="15" ry="6" fill="url(#l-ap-disc)" stroke="#d97706" stroke-width="2"/>
      <circle cx="24" cy="30" r="2.2" fill="#0284c7"/>
      <path d="M17 21C19.2 19 21.5 18 24 18C26.5 18 28.8 19 31 21" stroke="#d97706" stroke-width="2" stroke-linecap="round"/>
      <path d="M12 16C15.6 13 19.6 11.5 24 11.5C28.4 11.5 32.4 13 36 16" stroke="#d97706" stroke-width="2" stroke-linecap="round"/>
      <path d="M7 11C11.9 7 17.7 5 24 5C30.3 5 36.1 7 41 11" stroke="#d97706" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `,

  cloud: `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="l-cloud-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="100%" stop-color="#e0f2fe"/>
        </linearGradient>
      </defs>
      <path d="M 14 34 H 34 C 38.4 34 42 30.4 42 26 C 42 22 38.8 18.7 34.8 18.2 C 34 12.5 29 8 23 8 C 17.8 8 13.5 11.2 11.8 15.8 C 8 16.5 5 19.8 5 24 C 5 29.5 9 34 14 34 Z" 
        fill="url(#l-cloud-grad)" stroke="#0284c7" stroke-width="2.2" stroke-linejoin="round"/>
      <circle cx="23.5" cy="22.5" r="5" stroke="#0284c7" stroke-width="1.6"/>
      <ellipse cx="23.5" cy="22.5" rx="2.2" ry="5" stroke="#0284c7" stroke-width="1.3"/>
      <line x1="18.5" y1="22.5" x2="28.5" y2="22.5" stroke="#0284c7" stroke-width="1.4"/>
    </svg>
  `,

  printer: `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 8H33V18H15V8Z" fill="#f8fafc" stroke="#64748b" stroke-width="2"/>
      <rect x="8" y="18" width="32" height="18" rx="3" fill="#ffffff" stroke="#64748b" stroke-width="2.5"/>
      <circle cx="34" cy="23" r="1.5" fill="#16a34a"/>
      <rect x="14" y="27" width="20" height="13" rx="1" fill="#f8fafc" stroke="#64748b" stroke-width="2"/>
      <line x1="18" y1="33" x2="30" y2="33" stroke="#94a3b8" stroke-width="1.5"/>
    </svg>
  `,

  phone: `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="8" width="28" height="32" rx="4" fill="#ffffff" stroke="#db2777" stroke-width="2"/>
      <rect x="15" y="12" width="18" height="9" rx="1" fill="#fdf2f8" stroke="#db2777" stroke-width="1"/>
      <line x1="18" y1="16" x2="26" y2="16" stroke="#db2777" stroke-width="1"/>
      <circle cx="17" cy="26" r="1.5" fill="#f472b6"/>
      <circle cx="24" cy="26" r="1.5" fill="#f472b6"/>
      <circle cx="31" cy="26" r="1.5" fill="#f472b6"/>
      <circle cx="17" cy="31" r="1.5" fill="#f472b6"/>
      <circle cx="24" cy="31" r="1.5" fill="#f472b6"/>
      <circle cx="31" cy="31" r="1.5" fill="#f472b6"/>
    </svg>
  `,

  database: `
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="24" cy="11" rx="16" ry="6" fill="#f8fafc" stroke="#d97706" stroke-width="2"/>
      <path d="M8 11V23C8 26.3 15.2 29 24 29C32.8 29 40 26.3 40 23V11" fill="#f8fafc" stroke="#d97706" stroke-width="2"/>
      <path d="M8 23V35C8 38.3 15.2 41 24 41C32.8 41 40 38.3 40 35V23" fill="#f8fafc" stroke="#d97706" stroke-width="2"/>
      <ellipse cx="24" cy="23" rx="16" ry="6" fill="none" stroke="#d97706" stroke-width="1.5"/>
    </svg>
  `,

  ups: `
    <svg viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="l-ups-bg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="100%" stop-color="#f8fafc"/>
        </linearGradient>
      </defs>
      <rect x="9" y="5" width="34" height="42" rx="4" fill="url(#l-ups-bg)" stroke="#ea580c" stroke-width="2.5"/>
      <text x="26" y="24" font-family="'JetBrains Mono', 'Segoe UI', monospace" font-size="12" font-weight="900" fill="#0f172a" text-anchor="middle" letter-spacing="1">UPS</text>
      <line x1="15" y1="29" x2="37" y2="29" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="3 2"/>
      <rect x="18" y="33.5" width="14" height="7.5" rx="1.5" fill="#334155" stroke="#16a34a" stroke-width="1.2"/>
      <rect x="32" y="35.5" width="1.8" height="3.5" rx="0.5" fill="#16a34a"/>
      <rect x="20" y="35" width="4.5" height="4.5" rx="0.8" fill="#16a34a"/>
      <rect x="25.5" y="35" width="4.5" height="4.5" rx="0.8" fill="#16a34a"/>
    </svg>
  `,

  termica: `
    <svg viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="l-term-bg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="100%" stop-color="#f8fafc"/>
        </linearGradient>
      </defs>
      <rect x="13" y="5" width="26" height="42" rx="3" fill="url(#l-term-bg)" stroke="#dc2626" stroke-width="2.5"/>
      <circle cx="26" cy="11" r="3" fill="#e2e8f0" stroke="#dc2626" stroke-width="1.5"/>
      <circle cx="26" cy="41" r="3" fill="#e2e8f0" stroke="#dc2626" stroke-width="1.5"/>
      <line x1="26" y1="14" x2="26" y2="20" stroke="#dc2626" stroke-width="2"/>
      <line x1="26" y1="20" x2="33" y2="28" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round"/>
      <rect x="23" y="30" width="6" height="4" rx="0.5" fill="#dc2626"/>
      <line x1="26" y1="34" x2="26" y2="38" stroke="#dc2626" stroke-width="2"/>
      <text x="26" y="27" font-family="'JetBrains Mono', monospace" font-size="6" font-weight="bold" fill="#dc2626" text-anchor="middle">TM</text>
    </svg>
  `,

  transfer: `
    <svg viewBox="0 0 176 46" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="l-trans-bg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="100%" stop-color="#f8fafc"/>
        </linearGradient>
      </defs>
      <rect x="2" y="3" width="172" height="40" rx="6" fill="url(#l-trans-bg)" stroke="#e11d48" stroke-width="2.5"/>
      
      <!-- SECCIÓN IZQUIERDA: Entradas UPS (S1 y S2) -->
      <circle cx="18" cy="22" r="7" fill="#ffffff" stroke="#0284c7" stroke-width="2"/>
      <circle cx="18" cy="22" r="2.5" fill="#0284c7"/>
      <text x="18" y="38" font-family="'JetBrains Mono', monospace" font-size="7" font-weight="900" fill="#0284c7" text-anchor="middle">S1</text>
      
      <circle cx="38" cy="22" r="7" fill="#ffffff" stroke="#d97706" stroke-width="2"/>
      <circle cx="38" cy="22" r="2.5" fill="#d97706"/>
      <text x="38" y="38" font-family="'JetBrains Mono', monospace" font-size="7" font-weight="900" fill="#d97706" text-anchor="middle">S2</text>

      <text x="28" y="10" font-family="'JetBrains Mono', monospace" font-size="5" font-weight="bold" fill="#475569" text-anchor="middle">ENTRADAS</text>

      <line x1="52" y1="6" x2="52" y2="40" stroke="#cbd5e1" stroke-width="1.2" stroke-dasharray="2 2"/>

      <!-- SECCIÓN CENTRAL: 4 Salidas Comunes -->
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

      <!-- SECCIÓN DERECHA: Canal Tensión -->
      <rect x="144" y="9" width="26" height="28" rx="4" fill="#fef2f2" stroke="#dc2626" stroke-width="2"/>
      <circle cx="157" cy="22" r="6" fill="#fecaca"/>
      <circle cx="157" cy="22" r="3" fill="#dc2626"/>
      <text x="157" y="41" font-family="'JetBrains Mono', monospace" font-size="5" font-weight="900" fill="#dc2626" text-anchor="middle">CANAL</text>
    </svg>
  `,

  canal_tension_5: `
    <svg viewBox="0 0 186 46" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="l-ct5-bg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="100%" stop-color="#f1f5f9"/>
        </linearGradient>
      </defs>
      <rect x="2" y="4" width="182" height="38" rx="5" fill="url(#l-ct5-bg)" stroke="#0284c7" stroke-width="2.2"/>
      
      <circle cx="15" cy="23" r="6" fill="#ffffff" stroke="#dc2626" stroke-width="1.8"/>
      <circle cx="15" cy="23" r="2.5" fill="#dc2626"/>
      <text x="15" y="38" font-family="'JetBrains Mono', monospace" font-size="4.8" font-weight="bold" fill="#dc2626" text-anchor="middle">IN</text>

      <line x1="28" y1="8" x2="28" y2="38" stroke="#cbd5e1" stroke-width="1"/>

      <!-- Tomas IRAM argentinas 220V -->
      <g transform="translate(42, 23)">
        <rect x="-10" y="-12" width="20" height="24" rx="3" fill="#334155" stroke="#64748b" stroke-width="1"/>
        <line x1="0" y1="-8" x2="0" y2="-3" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="-5.5" y1="4" x2="-2" y2="0.5" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="5.5" y1="4" x2="2" y2="0.5" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <text x="0" y="10" font-family="'JetBrains Mono', monospace" font-size="4.5" font-weight="bold" fill="#94a3b8" text-anchor="middle">T1</text>
      </g>
      <g transform="translate(72, 23)">
        <rect x="-10" y="-12" width="20" height="24" rx="3" fill="#334155" stroke="#64748b" stroke-width="1"/>
        <line x1="0" y1="-8" x2="0" y2="-3" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="-5.5" y1="4" x2="-2" y2="0.5" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="5.5" y1="4" x2="2" y2="0.5" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <text x="0" y="10" font-family="'JetBrains Mono', monospace" font-size="4.5" font-weight="bold" fill="#94a3b8" text-anchor="middle">T2</text>
      </g>
      <g transform="translate(102, 23)">
        <rect x="-10" y="-12" width="20" height="24" rx="3" fill="#334155" stroke="#64748b" stroke-width="1"/>
        <line x1="0" y1="-8" x2="0" y2="-3" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="-5.5" y1="4" x2="-2" y2="0.5" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="5.5" y1="4" x2="2" y2="0.5" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <text x="0" y="10" font-family="'JetBrains Mono', monospace" font-size="4.5" font-weight="bold" fill="#94a3b8" text-anchor="middle">T3</text>
      </g>
      <g transform="translate(132, 23)">
        <rect x="-10" y="-12" width="20" height="24" rx="3" fill="#334155" stroke="#64748b" stroke-width="1"/>
        <line x1="0" y1="-8" x2="0" y2="-3" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="-5.5" y1="4" x2="-2" y2="0.5" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="5.5" y1="4" x2="2" y2="0.5" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <text x="0" y="10" font-family="'JetBrains Mono', monospace" font-size="4.5" font-weight="bold" fill="#94a3b8" text-anchor="middle">T4</text>
      </g>
      <g transform="translate(162, 23)">
        <rect x="-10" y="-12" width="20" height="24" rx="3" fill="#334155" stroke="#64748b" stroke-width="1"/>
        <line x1="0" y1="-8" x2="0" y2="-3" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="-5.5" y1="4" x2="-2" y2="0.5" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="5.5" y1="4" x2="2" y2="0.5" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <text x="0" y="10" font-family="'JetBrains Mono', monospace" font-size="4.5" font-weight="bold" fill="#94a3b8" text-anchor="middle">T5</text>
      </g>
    </svg>
  `,

  canal_tension_7: `
    <svg viewBox="0 0 246 46" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="l-ct7-bg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="100%" stop-color="#f1f5f9"/>
        </linearGradient>
      </defs>
      <rect x="2" y="4" width="242" height="38" rx="5" fill="url(#l-ct7-bg)" stroke="#0284c7" stroke-width="2.2"/>
      
      <circle cx="15" cy="23" r="6" fill="#ffffff" stroke="#dc2626" stroke-width="1.8"/>
      <circle cx="15" cy="23" r="2.5" fill="#dc2626"/>
      <text x="15" y="38" font-family="'JetBrains Mono', monospace" font-size="4.8" font-weight="bold" fill="#dc2626" text-anchor="middle">IN</text>

      <line x1="28" y1="8" x2="28" y2="38" stroke="#cbd5e1" stroke-width="1"/>

      <!-- Tomas 1 a 7 -->
      <g transform="translate(42, 23)">
        <rect x="-10" y="-12" width="20" height="24" rx="3" fill="#334155" stroke="#64748b" stroke-width="1"/>
        <line x1="0" y1="-8" x2="0" y2="-3" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="-5.5" y1="4" x2="-2" y2="0.5" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="5.5" y1="4" x2="2" y2="0.5" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <text x="0" y="10" font-family="'JetBrains Mono', monospace" font-size="4.5" font-weight="bold" fill="#94a3b8" text-anchor="middle">T1</text>
      </g>
      <g transform="translate(72, 23)">
        <rect x="-10" y="-12" width="20" height="24" rx="3" fill="#334155" stroke="#64748b" stroke-width="1"/>
        <line x1="0" y1="-8" x2="0" y2="-3" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="-5.5" y1="4" x2="-2" y2="0.5" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="5.5" y1="4" x2="2" y2="0.5" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <text x="0" y="10" font-family="'JetBrains Mono', monospace" font-size="4.5" font-weight="bold" fill="#94a3b8" text-anchor="middle">T2</text>
      </g>
      <g transform="translate(102, 23)">
        <rect x="-10" y="-12" width="20" height="24" rx="3" fill="#334155" stroke="#64748b" stroke-width="1"/>
        <line x1="0" y1="-8" x2="0" y2="-3" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="-5.5" y1="4" x2="-2" y2="0.5" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="5.5" y1="4" x2="2" y2="0.5" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <text x="0" y="10" font-family="'JetBrains Mono', monospace" font-size="4.5" font-weight="bold" fill="#94a3b8" text-anchor="middle">T3</text>
      </g>
      <g transform="translate(132, 23)">
        <rect x="-10" y="-12" width="20" height="24" rx="3" fill="#334155" stroke="#64748b" stroke-width="1"/>
        <line x1="0" y1="-8" x2="0" y2="-3" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="-5.5" y1="4" x2="-2" y2="0.5" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="5.5" y1="4" x2="2" y2="0.5" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <text x="0" y="10" font-family="'JetBrains Mono', monospace" font-size="4.5" font-weight="bold" fill="#94a3b8" text-anchor="middle">T4</text>
      </g>
      <g transform="translate(162, 23)">
        <rect x="-10" y="-12" width="20" height="24" rx="3" fill="#334155" stroke="#64748b" stroke-width="1"/>
        <line x1="0" y1="-8" x2="0" y2="-3" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="-5.5" y1="4" x2="-2" y2="0.5" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="5.5" y1="4" x2="2" y2="0.5" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <text x="0" y="10" font-family="'JetBrains Mono', monospace" font-size="4.5" font-weight="bold" fill="#94a3b8" text-anchor="middle">T5</text>
      </g>
      <g transform="translate(192, 23)">
        <rect x="-10" y="-12" width="20" height="24" rx="3" fill="#334155" stroke="#64748b" stroke-width="1"/>
        <line x1="0" y1="-8" x2="0" y2="-3" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="-5.5" y1="4" x2="-2" y2="0.5" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="5.5" y1="4" x2="2" y2="0.5" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <text x="0" y="10" font-family="'JetBrains Mono', monospace" font-size="4.5" font-weight="bold" fill="#94a3b8" text-anchor="middle">T6</text>
      </g>
      <g transform="translate(222, 23)">
        <rect x="-10" y="-12" width="20" height="24" rx="3" fill="#334155" stroke="#64748b" stroke-width="1"/>
        <line x1="0" y1="-8" x2="0" y2="-3" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="-5.5" y1="4" x2="-2" y2="0.5" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="5.5" y1="4" x2="2" y2="0.5" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>
        <text x="0" y="10" font-family="'JetBrains Mono', monospace" font-size="4.5" font-weight="bold" fill="#94a3b8" text-anchor="middle">T7</text>
      </g>
    </svg>
  `,

  text_badge: `
    <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="14" width="48" height="28" rx="6" fill="#ffffff" stroke="#059669" stroke-width="2"/>
      <text x="28" y="32" font-family="'JetBrains Mono', monospace" font-size="12" font-weight="bold" fill="#059669" text-anchor="middle">IP</text>
    </svg>
  `
};

// Helper universal para obtener el icono según el tema activo
function getDeviceIcon(type, isLight = false) {
  if (isLight && typeof DEVICE_ICONS_LIGHT !== 'undefined' && DEVICE_ICONS_LIGHT[type]) {
    return DEVICE_ICONS_LIGHT[type];
  }
  return DEVICE_ICONS[type] || DEVICE_ICONS.pc;
}

// Generadores de puertos simples y claros (Boca 1, Eth 1, Fibra 1)
function generateSwitchPorts(copperCount = 24, fiberCount = 4) {
  const ports = [];
  for (let i = 1; i <= copperCount; i++) {
    ports.push(`Boca ${i}`);
  }
  for (let i = 1; i <= fiberCount; i++) {
    ports.push(`Fibra ${i}`);
  }
  return ports;
}

function generateRouterPorts(ethCount = 4, fiberCount = 2, wanCount = 0) {
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
const DEVICE_METADATA = {
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
const CABLE_TYPES = {
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

