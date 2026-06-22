/* ═══════════════════════════════════════════════════════════
   api.js — Cliente HTTP Centralizado para a API Backend
   FinanceDB Frontend
═══════════════════════════════════════════════════════════ */

const API = {
  BASE: (function() {
    const origin = window.location.origin;
    // Se aberto via file:// o origin é 'null' ou 'file://' — fallback para localhost
    if (!origin || origin === 'null' || origin.startsWith('file:')) {
      return 'http://localhost:3000/api';
    }
    return origin + '/api';
  })(),

  /** Retorna o token JWT armazenado */
  getToken() {
    return localStorage.getItem('financedb_admin_token');
  },

  /** Salva o token JWT */
  setToken(token) {
    localStorage.setItem('financedb_admin_token', token);
  },

  /** Remove o token JWT */
  clearToken() {
    localStorage.removeItem('financedb_admin_token');
  },

  /** Verifica se há token salvo */
  isAuthenticated() {
    return !!this.getToken();
  },

  /** Headers padrão com Authorization */
  _headers() {
    const h = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  },

  /** GET request */
  async get(path) {
    const res = await fetch(this.BASE + path, { headers: this._headers() });
    if (res.status === 401) {
      this.clearToken();
      if (typeof AdminAuth !== 'undefined') AdminAuth.show();
      throw new Error('Sessão expirada');
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
    return data;
  },

  /** POST request */
  async post(path, body) {
    const res = await fetch(this.BASE + path, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify(body)
    });
    if (res.status === 401) {
      this.clearToken();
      if (typeof AdminAuth !== 'undefined') AdminAuth.show();
      throw new Error('Sessão expirada');
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
    return data;
  },

  /** PUT request */
  async put(path, body) {
    const res = await fetch(this.BASE + path, {
      method: 'PUT',
      headers: this._headers(),
      body: JSON.stringify(body)
    });
    if (res.status === 401) {
      this.clearToken();
      throw new Error('Sessão expirada');
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
    return data;
  },

  /** DELETE request */
  async delete(path) {
    const res = await fetch(this.BASE + path, {
      method: 'DELETE',
      headers: this._headers()
    });
    if (res.status === 401) {
      this.clearToken();
      throw new Error('Sessão expirada');
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
    return data;
  },

  /** Verifica se o token atual é válido */
  async verifyToken() {
    try {
      const data = await this.get('/auth/verify');
      return data.valid === true;
    } catch {
      return false;
    }
  }
};

/* ─── Toast Notifications ──────────────────────────────── */

const Toast = {
  _container: null,

  _getContainer() {
    if (!this._container) {
      this._container = document.createElement('div');
      this._container.className = 'toast-container';
      document.body.appendChild(this._container);
    }
    return this._container;
  },

  show(message, type = 'info', duration = 4000) {
    const container = this._getContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = {
      success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
      error: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      warning: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };

    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <span class="toast-msg">${message}</span>
    `;

    container.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('toast-show'));

    setTimeout(() => {
      toast.classList.remove('toast-show');
      toast.classList.add('toast-hide');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  success(msg) { this.show(msg, 'success'); },
  error(msg)   { this.show(msg, 'error', 6000); },
  warning(msg) { this.show(msg, 'warning'); },
  info(msg)    { this.show(msg, 'info'); }
};
