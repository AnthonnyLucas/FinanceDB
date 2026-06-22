/* ═══════════════════════════════════════════════════════════
   admin-auth.js — Modal de Login Admin
   FinanceDB Frontend
═══════════════════════════════════════════════════════════ */

const AdminAuth = {
  _overlay: null,

  /** Cria e mostra o modal de login */
  show(callback) {
    this._callback = callback;

    if (this._overlay) {
      this._overlay.style.display = 'flex';
      requestAnimationFrame(() => this._overlay.classList.add('visible'));
      return;
    }

    this._overlay = document.createElement('div');
    this._overlay.className = 'admin-login-overlay';
    this._overlay.id = 'admin-login-overlay';

    this._overlay.innerHTML = `
      <div class="admin-login-card">
        <div class="admin-login-glow"></div>
        <div class="admin-login-header">
          <div class="admin-login-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10d9a0" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2"/>
              <path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
          </div>
          <h2 class="admin-login-title">Acesso Administrativo</h2>
          <p class="admin-login-subtitle">Insira suas credenciais para acessar o painel de administração do banco de dados.</p>
        </div>

        <form id="admin-login-form" class="admin-login-form" autocomplete="off">
          <div class="admin-input-group">
            <label class="admin-input-label">Email</label>
            <div class="admin-input-wrap">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#475569" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              <input type="email" id="admin-email" class="admin-input" placeholder="admin@email.com" required />
            </div>
          </div>

          <div class="admin-input-group">
            <label class="admin-input-label">Senha</label>
            <div class="admin-input-wrap">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#475569" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              <input type="password" id="admin-password" class="admin-input" placeholder="••••••••" required />
            </div>
          </div>

          <div id="admin-login-error" class="admin-login-error" style="display:none"></div>

          <button type="submit" class="admin-login-btn" id="admin-login-btn">
            <span class="admin-login-btn-text">Acessar Painel Admin</span>
            <span class="admin-login-btn-loading" style="display:none">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><circle cx="12" cy="12" r="10" stroke-dasharray="50" stroke-dashoffset="10"/></svg>
              Autenticando...
            </span>
          </button>
        </form>

        <button class="admin-login-close" id="admin-login-close" title="Fechar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    `;

    document.body.appendChild(this._overlay);
    requestAnimationFrame(() => this._overlay.classList.add('visible'));

    // Eventos
    document.getElementById('admin-login-form').addEventListener('submit', (e) => this._handleLogin(e));
    document.getElementById('admin-login-close').addEventListener('click', () => this.hide());
    this._overlay.addEventListener('click', (e) => {
      if (e.target === this._overlay) this.hide();
    });

    // Focus no email
    setTimeout(() => document.getElementById('admin-email').focus(), 300);
  },

  /** Esconde o modal */
  hide() {
    if (this._overlay) {
      this._overlay.classList.remove('visible');
      setTimeout(() => { if (this._overlay) this._overlay.style.display = 'none'; }, 300);
    }
  },

  /** Processa o login */
  async _handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('admin-email').value.trim();
    const password = document.getElementById('admin-password').value;
    const errorEl = document.getElementById('admin-login-error');
    const btnText = document.querySelector('.admin-login-btn-text');
    const btnLoading = document.querySelector('.admin-login-btn-loading');
    const btn = document.getElementById('admin-login-btn');

    // Loading state
    btn.disabled = true;
    btnText.style.display = 'none';
    btnLoading.style.display = 'inline-flex';
    errorEl.style.display = 'none';

    try {
      const data = await API.post('/auth/login', { email, password });
      API.setToken(data.token);
      Toast.success('Login realizado com sucesso!');
      this.hide();

      if (this._callback) {
        this._callback();
        this._callback = null;
      }
    } catch (err) {
      errorEl.textContent = err.message || 'Credenciais inválidas.';
      errorEl.style.display = 'block';
      document.getElementById('admin-password').value = '';
      document.getElementById('admin-password').focus();
    } finally {
      btn.disabled = false;
      btnText.style.display = 'inline';
      btnLoading.style.display = 'none';
    }
  },

  /** Verifica autenticação e navega se OK, senão mostra login */
  async requireAuth(callback) {
    if (API.isAuthenticated()) {
      const valid = await API.verifyToken();
      if (valid) {
        callback();
        return;
      }
      API.clearToken();
    }
    this.show(callback);
  }
};
