/**
 * NetTopology Studio - Punto de Entrada Mínimo (Login Gate + Carga Diferida)
 */

import './styles/styles.css';
import './styles/glass.css';
import { state, dom, initDom } from './state/store.js';
import { app } from './core/appContext.js';
import { initAuthGate } from './auth/firebase.js';

const VALID_STYLES = ['default', 'glass', 'obsidian'];
let bootstrapModule = null;

function restoreInitialAppearance() {
  try {
    const searchParams = new URLSearchParams(window.location.search);
    const urlStyle = searchParams.get('style');
    const urlTheme = searchParams.get('theme');
    let savedStyle = urlStyle || localStorage.getItem('nettopology_style');
    let savedTheme = urlTheme || localStorage.getItem('nettopology_theme') || 'dark';

    if (!savedStyle && (savedTheme === 'glass' || savedTheme === 'obsidian')) {
      savedStyle = savedTheme;
      savedTheme = 'dark';
    }

    state.style = VALID_STYLES.includes(savedStyle) ? savedStyle : 'default';
    state.theme = (savedTheme === 'light') ? 'light' : 'dark';

    document.body.dataset.style = state.style;
    if (state.theme === 'light') {
      document.body.dataset.theme = 'light';
    } else {
      delete document.body.dataset.theme;
    }

    const savedEnc = localStorage.getItem('nettopology_default_encapsulated');
    if (savedEnc !== null) {
      state.defaultEncapsulatedLabels = (savedEnc === 'true');
    }
  } catch (e) {
    console.warn('Error inicializando tema:', e);
  }
}

export async function init() {
  initDom();
  restoreInitialAppearance();

  initAuthGate({
    onAuthenticated: async () => {
      bootstrapModule = await import('./workspace/bootstrap.js');
      await bootstrapModule.mountAndInitWorkspace();
    },
    onSignedOut: () => {
      if (bootstrapModule && typeof bootstrapModule.unmountWorkspace === 'function') {
        bootstrapModule.unmountWorkspace();
      }
    }
  });
}

app.init = init;

if (import.meta.env.DEV) {
  window.netTopology = app;
  window.netTopology.state = state;
  window.netTopology.dom = dom;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { init(); });
} else {
  init();
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    const hadController = Boolean(navigator.serviceWorker.controller);
    let refreshing = false;

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    navigator.serviceWorker
      .register('./sw.js?v=6', { scope: './', updateViaCache: 'none' })
      .then((reg) => {
        reg.update().catch(() => {});
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            reg.update().catch(() => {});
          }
        });
      })
      .catch(() => {});
  });
}

export default app;
