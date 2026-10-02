/**
 * NetTopology - Contexto de Aplicación Central (Mediador y Bus de Eventos)
 * Permite el desacoplamiento limpio entre módulos sin dependencias circulares.
 */

export const app = {
  // Event listeners
  _listeners: {},

  on(event, callback) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(callback);
    return () => this.off(event, callback);
  },

  off(event, callback) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(cb => cb !== callback);
  },

  emit(event, data) {
    if (!this._listeners[event]) return;
    this._listeners[event].forEach(cb => {
      try {
        cb(data);
      } catch (err) {
        console.error(`Error en listener de evento "${event}":`, err);
      }
    });
  }
};

export default app;
