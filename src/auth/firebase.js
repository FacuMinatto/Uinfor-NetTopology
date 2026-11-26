/**
 * NetTopology - Módulo de Autenticación con Firebase (Email / Password Gate)
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { state, dom } from '../state/store.js';
import { app } from '../core/appContext.js';

const PLACEHOLDER_VALUES = new Set([
  'TU_API_KEY_AQUI',
  'tu-proyecto.firebaseapp.com',
  'tu-proyecto-id',
  'tu-proyecto.firebasestorage.app',
  '000000000000',
  '1:000000000000:web:abcdef123456'
]);

const AUTH_ERROR_MESSAGES = {
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/user-not-found': 'No existe un usuario registrado con ese correo.',
  'auth/wrong-password': 'La contraseña ingresada es incorrecta.',
  'auth/invalid-email': 'El formato del correo electrónico no es válido.',
  'auth/user-disabled': 'Esta cuenta fue deshabilitada por el administrador.',
  'auth/too-many-requests': 'Demasiados intentos fallidos. Espera unos minutos e intenta de nuevo.',
  'auth/network-request-failed': 'Sin conexión de red. Verifica tu acceso a internet.'
};

let authInstance = null;
let authInitialized = false;
let authUiEventsBound = false;
let wasAuthenticated = false;
let authUnsubscribe = null;

function isConfiguredValue(val) {
  return typeof val === 'string' && val.trim().length > 0 && !PLACEHOLDER_VALUES.has(val.trim());
}

function getFirebaseConfig() {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
  };
}

function isFirebaseConfigured(cfg) {
  return (
    isConfiguredValue(cfg.apiKey) &&
    isConfiguredValue(cfg.authDomain) &&
    isConfiguredValue(cfg.projectId) &&
    isConfiguredValue(cfg.appId)
  );
}

function setAuthError(message) {
  if (!dom.authErrorBox) return;
  if (!message) {
    dom.authErrorBox.textContent = '';
    dom.authErrorBox.style.display = 'none';
    return;
  }
  dom.authErrorBox.textContent = message;
  dom.authErrorBox.style.display = 'block';
}

function setLoadingState(isLoading) {
  if (dom.authLoadingState) {
    dom.authLoadingState.style.display = isLoading ? 'flex' : 'none';
  }
  if (dom.authLoginForm) {
    dom.authLoginForm.style.display = isLoading ? 'none' : 'flex';
  }
}

function setWorkspaceLocked(locked) {
  document.body.classList.toggle('auth-locked', locked);
  if (dom.authGateOverlay) {
    dom.authGateOverlay.style.display = locked ? 'flex' : 'none';
  }
}

export async function clearOfflineCaches() {
  try {
    if (typeof window !== 'undefined' && 'caches' in window && window.caches) {
      const keys = await window.caches.keys();
      await Promise.all(keys.map((key) => window.caches.delete(key)));
    }
    if (typeof navigator !== 'undefined' && navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
    }
  } catch (e) {
    console.warn('[Auth] No se pudieron limpiar cachés offline:', e);
  }
}

export function bindLogoutButton() {
  const btn = dom.btnAuthLogout || (typeof document !== 'undefined' ? document.getElementById('btn-auth-logout') : null);
  if (!btn || btn.dataset.logoutBound === 'true') return;
  btn.dataset.logoutBound = 'true';

  btn.addEventListener('click', async () => {
    if (!authInstance) return;
    try {
      await signOut(authInstance);
      await clearOfflineCaches();
      app.showToast?.('Sesión cerrada correctamente', 'info');
    } catch (err) {
      app.showToast?.('No se pudo cerrar sesión', 'error');
    }
  });
}

function bindAuthUIEvents() {
  if (authUiEventsBound) {
    bindLogoutButton();
    return;
  }
  authUiEventsBound = true;

  if (dom.authTogglePasswordBtn && dom.authPasswordInput) {
    dom.authTogglePasswordBtn.addEventListener('click', () => {
      const show = dom.authPasswordInput.type === 'password';
      dom.authPasswordInput.type = show ? 'text' : 'password';
      dom.authTogglePasswordBtn.setAttribute('aria-pressed', show ? 'true' : 'false');
      dom.authTogglePasswordBtn.title = show ? 'Ocultar contraseña' : 'Mostrar contraseña';
      dom.authTogglePasswordBtn.classList.toggle('is-visible', show);
    });
  }

  if (dom.authLoginForm) {
    dom.authLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      setAuthError('');

      if (!authInstance) {
        setAuthError('Firebase Authentication no está configurado. Completa el archivo .env con las credenciales del proyecto.');
        return;
      }

      const email = (dom.authEmailInput?.value || '').trim();
      const password = dom.authPasswordInput?.value || '';

      if (!email || !password) {
        setAuthError('Ingresa tu correo electrónico y contraseña.');
        return;
      }

      if (dom.authSubmitBtn) {
        dom.authSubmitBtn.disabled = true;
        dom.authSubmitBtn.textContent = 'Ingresando...';
      }

      try {
        await signInWithEmailAndPassword(authInstance, email, password);
      } catch (err) {
        const msg = AUTH_ERROR_MESSAGES[err?.code] || 'No se pudo iniciar sesión. Verifica tus credenciales.';
        setAuthError(msg);
      } finally {
        if (dom.authSubmitBtn) {
          dom.authSubmitBtn.disabled = false;
          dom.authSubmitBtn.textContent = 'Iniciar sesión';
        }
      }
    });
  }

  bindLogoutButton();
}

/**
 * Inicializa la compuerta de autenticación Firebase y ejecuta onAuthenticated cuando hay sesión activa.
 */
export function initAuthGate(onAuthenticatedOrCallbacks, maybeOnSignedOut) {
  if (authInitialized) return;
  authInitialized = true;

  const onAuthenticated = typeof onAuthenticatedOrCallbacks === 'function'
    ? onAuthenticatedOrCallbacks
    : onAuthenticatedOrCallbacks?.onAuthenticated;
  const onSignedOut = typeof maybeOnSignedOut === 'function'
    ? maybeOnSignedOut
    : onAuthenticatedOrCallbacks?.onSignedOut;

  bindAuthUIEvents();
  setWorkspaceLocked(true);

  const config = getFirebaseConfig();
  if (!isFirebaseConfigured(config)) {
    setLoadingState(false);
    if (dom.authConfigNotice) {
      dom.authConfigNotice.style.display = 'block';
    }
    if (dom.authSubmitBtn) {
      dom.authSubmitBtn.disabled = true;
    }
    return;
  }

  setLoadingState(true);
  const firebaseApp = initializeApp(config);
  authInstance = getAuth(firebaseApp);

  if (authUnsubscribe) {
    authUnsubscribe();
    authUnsubscribe = null;
  }
  authUnsubscribe = onAuthStateChanged(authInstance, async (user) => {
    if (user) {
      wasAuthenticated = true;
      state.user = { uid: user.uid, email: user.email || '' };

      if (typeof onAuthenticated === 'function') {
        await onAuthenticated(state.user);
      }

      if (dom.authUserEmail) {
        dom.authUserEmail.textContent = state.user.email;
      }
      if (dom.authUserPill) {
        dom.authUserPill.style.display = 'inline-flex';
      }
      if (dom.authPasswordInput) {
        dom.authPasswordInput.value = '';
      }
      setAuthError('');
      setWorkspaceLocked(false);
      return;
    }

    const hadActiveSession = wasAuthenticated;
    wasAuthenticated = false;
    state.user = null;
    if (state.collab && (state.collab.active || state.collab.status === 'connecting')) {
      if (typeof app.leaveCollabSession === 'function') {
        app.leaveCollabSession(false);
      }
    }
    if (dom.authUserPill) {
      dom.authUserPill.style.display = 'none';
    }
    if (dom.authUserEmail) {
      dom.authUserEmail.textContent = '';
    }
    if (hadActiveSession) {
      await clearOfflineCaches();
    }
    if (typeof onSignedOut === 'function') {
      await onSignedOut();
    }
    setLoadingState(false);
    setWorkspaceLocked(true);
    setTimeout(() => dom.authEmailInput?.focus(), 40);
  });
}
