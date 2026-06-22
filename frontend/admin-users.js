/* ═══════════════════════════════════════════════════════════
   admin-users.js — Página Dados de Usuários (Raio-X)
   FinanceDB Frontend · Painel Administrativo
═══════════════════════════════════════════════════════════ */

const AdminUsers = {
  _overview: null,
  _charts: {},
  _currentView: 'list', // 'list' | 'detail'

  /* ──── RENDER PRINCIPAL ──── */
  async render() {
    const container = document.getElementById('page-admin-users');
    if (!container) return;
    this._currentView = 'list';
    this._destroyCharts();
    container.innerHTML = '<div class="au-loading"><div class="admin-spinner"></div> Carregando dados de usuários...</div>';

    try {
      const data = await API.get('/analytics/users/overview');
      this._overview = data;
      this._renderList(container);
    } catch (e) {
      container.innerHTML = `<div class="au-error">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        Erro ao carregar dados: ${e.message}
      </div>`;
    }
  },

  /* ════════════════════════════════════════════════════════════
     MODO 1 — VISÃO GERAL (lista de todos os usuários)
  ════════════════════════════════════════════════════════════ */
  _renderList(container) {
    const s = this._overview.summary;
    const users = this._overview.users;

    const scoreColor = (score) => {
      if (score >= 80) return 'var(--green)';
      if (score >= 60) return 'var(--blue)';
      if (score >= 40) return 'var(--amber)';
      if (score >= 20) return 'var(--rose)';
      return '#f43f5e';
    };

    const classColor = (cls) => {
      const map = { 'Excelente': 'badge-success', 'Bom': 'badge-info', 'Regular': 'badge-warn', 'Ruim': 'badge-rose', 'Crítico': 'badge-rose' };
      return map[cls] || 'badge-neutral';
    };

    const avatarGradients = [
      'linear-gradient(135deg, #10d9a0, #6366f1)',
      'linear-gradient(135deg, #f59e0b, #f43f5e)',
      'linear-gradient(135deg, #6366f1, #a855f7)',
      'linear-gradient(135deg, #38bdf8, #6366f1)',
      'linear-gradient(135deg, #f43f5e, #f59e0b)',
      'linear-gradient(135deg, #a855f7, #10d9a0)'
    ];

    container.innerHTML = `
      <!-- KPIs Agregados de Saúde -->
      <div class="au-kpi-grid">
        <div class="au-kpi" style="border-top:2px solid var(--green)">
          <div class="au-kpi-icon" style="background:var(--green-dim)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10d9a0" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
          </div>
          <div>
            <div class="au-kpi-value">${s.total}</div>
            <div class="au-kpi-label">Total de Usuários</div>
          </div>
        </div>
        <div class="au-kpi" style="border-top:2px solid var(--green)">
          <div class="au-kpi-icon" style="background:var(--green-dim)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10d9a0" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div>
            <div class="au-kpi-value">${s.excelente + s.bom}</div>
            <div class="au-kpi-label">Saúde OK</div>
            <div class="au-kpi-sub">${s.excelente} excelente · ${s.bom} bom</div>
          </div>
        </div>
        <div class="au-kpi" style="border-top:2px solid var(--amber)">
          <div class="au-kpi-icon" style="background:var(--amber-dim)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div>
            <div class="au-kpi-value">${s.regular}</div>
            <div class="au-kpi-label">Atenção</div>
            <div class="au-kpi-sub">saúde regular</div>
          </div>
        </div>
        <div class="au-kpi" style="border-top:2px solid var(--rose)">
          <div class="au-kpi-icon" style="background:var(--rose-dim)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
          <div>
            <div class="au-kpi-value">${s.ruim + s.critico}</div>
            <div class="au-kpi-label">Com Problemas</div>
            <div class="au-kpi-sub">${s.ruim} ruim · ${s.critico} crítico</div>
          </div>
        </div>
        <div class="au-kpi au-kpi-score" style="border-top:2px solid var(--indigo)">
          <div class="au-kpi-icon" style="background:var(--indigo-dim)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          </div>
          <div>
            <div class="au-kpi-value">${s.score_medio}<span style="font-size:13px;color:var(--t3)">/100</span></div>
            <div class="au-kpi-label">Score Médio</div>
          </div>
        </div>
      </div>

      <!-- Header -->
      <div class="au-list-header">
        <h3>Usuários Cadastrados</h3>
        <div style="display:flex;gap:8px;align-items:center">
          <div class="au-search-wrap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="au-search" class="au-search" placeholder="Buscar usuário..." />
          </div>
          <button class="btn-admin btn-admin-ghost" id="au-refresh">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
            Atualizar
          </button>
        </div>
      </div>

      <!-- Grid de Usuários -->
      <div class="au-users-grid" id="au-users-grid">
        ${users.length ? users.map((u, i) => {
          const initials = (u.nome || u.email || '??').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
          const grad = avatarGradients[i % avatarGradients.length];
          return `
            <div class="au-user-card" data-id="${u.id}" data-search="${(u.nome || '').toLowerCase()} ${(u.email || '').toLowerCase()}">
              <div class="au-user-top">
                <div class="au-user-avatar" style="background:${grad}">${initials}</div>
                <div class="au-user-info">
                  <div class="au-user-name">${u.nome || '—'}</div>
                  <div class="au-user-email">${u.email || '—'}</div>
                  <div style="display:flex;gap:6px;margin-top:6px">
                    <span class="badge ${u.plano === 'pro' ? 'badge-success' : 'badge-neutral'}">${(u.plano || 'free').toUpperCase()}</span>
                    <span class="badge ${u.ativo ? 'badge-success' : 'badge-rose'}">${u.ativo ? 'Ativo' : 'Inativo'}</span>
                  </div>
                </div>
              </div>
              <div class="au-user-score-bar">
                <div class="au-score-header">
                  <span>Saúde Financeira</span>
                  <span class="badge ${classColor(u.classification)}">${u.classification}</span>
                </div>
                <div class="au-score-track">
                  <div class="au-score-fill" style="width:${u.score}%;background:${scoreColor(u.score)}"></div>
                </div>
                <div class="au-score-val" style="color:${scoreColor(u.score)}">${u.score}/100</div>
              </div>
              <button class="au-btn-detail" data-id="${u.id}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                Ver Raio-X Completo
              </button>
            </div>`;
        }).join('') : '<div class="au-empty">Nenhum usuário encontrado.</div>'}
      </div>
    `;

    // Eventos
    document.getElementById('au-refresh')?.addEventListener('click', () => this.render());
    document.getElementById('au-search')?.addEventListener('input', (e) => this._filterUsers(e.target.value));
    container.querySelectorAll('.au-btn-detail').forEach(btn => {
      btn.addEventListener('click', () => this._renderDetail(btn.dataset.id));
    });
  },

  _filterUsers(term) {
    const cards = document.querySelectorAll('.au-user-card');
    const t = term.toLowerCase().trim();
    cards.forEach(card => {
      const search = card.dataset.search || '';
      card.style.display = !t || search.includes(t) ? '' : 'none';
    });
  },

  /* ════════════════════════════════════════════════════════════
     MODO 2 — RAIO-X INDIVIDUAL (detalhe de um usuário)
  ════════════════════════════════════════════════════════════ */
  async _renderDetail(userId) {
    const container = document.getElementById('page-admin-users');
    if (!container) return;
    this._currentView = 'detail';
    this._destroyCharts();
    container.innerHTML = '<div class="au-loading"><div class="admin-spinner"></div> Carregando raio-X do usuário...</div>';

    try {
      const [summaryR, monthlyR, categoriesR, accountsR, investmentsR, goalsR, healthR] = await Promise.allSettled([
        API.get(`/analytics/users/${userId}/summary`),
        API.get(`/analytics/users/${userId}/monthly`),
        API.get(`/analytics/users/${userId}/categories`),
        API.get(`/analytics/users/${userId}/accounts`),
        API.get(`/analytics/users/${userId}/investments`),
        API.get(`/analytics/users/${userId}/goals`),
        API.get(`/analytics/users/${userId}/health-score`)
      ]);

      const summary = summaryR.status === 'fulfilled' ? summaryR.value : null;
      const monthly = monthlyR.status === 'fulfilled' ? monthlyR.value : [];
      const categories = categoriesR.status === 'fulfilled' ? categoriesR.value : [];
      const accounts = accountsR.status === 'fulfilled' ? accountsR.value : [];
      const investments = investmentsR.status === 'fulfilled' ? investmentsR.value : [];
      const goals = goalsR.status === 'fulfilled' ? goalsR.value : [];
      const health = healthR.status === 'fulfilled' ? healthR.value : null;

      this._renderDetailContent(container, { summary, monthly, categories, accounts, investments, goals, health, userId });
    } catch (e) {
      container.innerHTML = `<div class="au-error">Erro ao carregar raio-X: ${e.message}</div>`;
    }
  },

  _renderDetailContent(container, data) {
    const { summary, monthly, categories, accounts, investments, goals, health } = data;
    const user = summary?.user || {};
    const kpis = summary?.kpis || {};
    const metas = summary?.metas || {};

    const scoreColor = health ? this._getScoreColor(health.score) : 'var(--t3)';
    const fmtMoney = (v) => 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fmtDate = (d) => {
      if (!d) return '—';
      const s = String(d).substring(0, 10).split('-');
      return s.length === 3 ? `${s[2]}/${s[1]}/${s[0]}` : d;
    };

    container.innerHTML = `
      <!-- Botão Voltar -->
      <button class="au-back-btn" id="au-back">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        Voltar para lista
      </button>

      <!-- Header do Usuário + Score de Saúde -->
      <div class="au-detail-header">
        <div class="au-detail-profile">
          <div class="au-detail-avatar">${(user.nome || '??').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}</div>
          <div>
            <h2 class="au-detail-name">${user.nome || '—'}</h2>
            <div class="au-detail-email">${user.email || '—'}</div>
            <div style="display:flex;gap:6px;margin-top:8px">
              <span class="badge ${user.plano === 'pro' ? 'badge-success' : 'badge-neutral'}">${(user.plano || 'free').toUpperCase()}</span>
              <span class="badge ${user.ativo ? 'badge-success' : 'badge-rose'}">${user.ativo ? 'Ativo' : 'Inativo'}</span>
              ${user.telefone ? `<span class="badge badge-neutral">${user.telefone}</span>` : ''}
              <span class="badge badge-neutral">Cadastro: ${fmtDate(user.data_cadastro)}</span>
            </div>
          </div>
        </div>
        <div class="au-health-gauge">
          <canvas id="au-gauge-canvas" width="140" height="140"></canvas>
          <div class="au-gauge-label">
            <span class="au-gauge-score" style="color:${scoreColor}">${health?.score ?? '—'}</span>
            <span class="au-gauge-class">${health?.classification || '—'}</span>
          </div>
        </div>
      </div>

      <!-- Fatores do Score -->
      ${health ? `
      <div class="au-factors-card">
        <h4>Fatores do Score de Saúde</h4>
        <div class="au-factors-grid">
          ${health.factors.map(f => `
            <div class="au-factor">
              <div class="au-factor-header">
                <span class="au-factor-name">${f.name}</span>
                <span class="au-factor-pts">${f.score}/${f.max}</span>
              </div>
              <div class="au-factor-bar">
                <div class="au-factor-fill" style="width:${(f.score / f.max * 100).toFixed(0)}%;background:${this._getScoreColor(f.score / f.max * 100)}"></div>
              </div>
              <div class="au-factor-detail">${f.detail}</div>
            </div>
          `).join('')}
        </div>
      </div>` : ''}

      <!-- KPIs Financeiros -->
      <div class="au-detail-kpis">
        <div class="au-dkpi" style="--accent:var(--green)">
          <div class="au-dkpi-label">Saldo Total</div>
          <div class="au-dkpi-value">${fmtMoney(kpis.saldo_total)}</div>
          <div class="au-dkpi-sub">${kpis.total_contas || 0} conta(s)</div>
        </div>
        <div class="au-dkpi" style="--accent:var(--indigo)">
          <div class="au-dkpi-label">Receitas do Mês</div>
          <div class="au-dkpi-value">${fmtMoney(kpis.receitas_mes)}</div>
          <div class="au-dkpi-sub">confirmadas</div>
        </div>
        <div class="au-dkpi" style="--accent:var(--rose)">
          <div class="au-dkpi-label">Despesas do Mês</div>
          <div class="au-dkpi-value">${fmtMoney(kpis.despesas_mes)}</div>
          <div class="au-dkpi-sub">${kpis.num_despesas || 0} lançamento(s)</div>
        </div>
        <div class="au-dkpi" style="--accent:${kpis.balanco_mes >= 0 ? 'var(--green)' : 'var(--rose)'}">
          <div class="au-dkpi-label">Balanço do Mês</div>
          <div class="au-dkpi-value" style="color:${kpis.balanco_mes >= 0 ? 'var(--green)' : 'var(--rose)'}">${fmtMoney(kpis.balanco_mes)}</div>
          <div class="au-dkpi-sub">${kpis.taxa_poupanca || 0}% poupança</div>
        </div>
        <div class="au-dkpi" style="--accent:var(--amber)">
          <div class="au-dkpi-label">Total Investido</div>
          <div class="au-dkpi-value">${fmtMoney(kpis.total_investido)}</div>
          <div class="au-dkpi-sub">${kpis.total_ativos || 0} ativo(s)</div>
        </div>
        <div class="au-dkpi" style="--accent:var(--purple)">
          <div class="au-dkpi-label">Patrimônio Líquido</div>
          <div class="au-dkpi-value">${fmtMoney(kpis.patrimonio_liquido)}</div>
          <div class="au-dkpi-sub">saldo + investimentos</div>
        </div>
      </div>

      <!-- Gráficos Row -->
      <div class="au-charts-row">
        <div class="au-chart-card au-chart-wide">
          <div class="au-chart-header">
            <h4>Receitas vs Despesas</h4>
            <span class="au-chart-sub">Últimos 6 meses</span>
          </div>
          <div class="au-chart-wrap"><canvas id="au-chart-monthly"></canvas></div>
        </div>
        <div class="au-chart-card">
          <div class="au-chart-header">
            <h4>Despesas por Categoria</h4>
          </div>
          <div class="au-chart-wrap au-chart-doughnut"><canvas id="au-chart-categories"></canvas></div>
        </div>
      </div>

      <!-- Contas + Investimentos -->
      <div class="au-tables-row">
        <div class="au-table-card">
          <div class="au-table-header">
            <h4>Contas Bancárias</h4>
            <span class="badge badge-info">${accounts.length} conta(s)</span>
          </div>
          ${accounts.length ? `
          <div class="au-table-scroll">
            <table class="au-table">
              <thead><tr>
                <th>Nome</th><th>Tipo</th><th>Moeda</th><th>Saldo</th><th>Status</th>
              </tr></thead>
              <tbody>
                ${accounts.map(a => `
                  <tr>
                    <td class="td-bold">${a.nome || '—'}</td>
                    <td><span class="badge badge-neutral">${a.tipo || '—'}</span></td>
                    <td>${a.moeda || 'BRL'}</td>
                    <td style="font-weight:700;color:${parseFloat(a.saldo_atual) >= 0 ? 'var(--green)' : 'var(--rose)'}">${fmtMoney(a.saldo_atual)}</td>
                    <td><span class="badge ${a.ativa ? 'badge-success' : 'badge-rose'}">${a.ativa ? 'Ativa' : 'Inativa'}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>` : '<div class="au-empty-sm">Nenhuma conta encontrada.</div>'}
        </div>

        <div class="au-table-card">
          <div class="au-table-header">
            <h4>Carteira de Investimentos</h4>
            <span class="badge badge-info">${investments.length} ativo(s)</span>
          </div>
          ${investments.length ? `
          <div class="au-table-scroll">
            <table class="au-table">
              <thead><tr>
                <th>Ticker</th><th>Nome</th><th>Tipo</th><th>Valor Atual</th><th>Rent. %</th>
              </tr></thead>
              <tbody>
                ${investments.map(inv => {
                  const rent = parseFloat(inv.rentabilidade_pct) || 0;
                  return `
                  <tr>
                    <td class="td-bold" style="font-family:monospace">${inv.ticker || '—'}</td>
                    <td>${inv.nome || '—'}</td>
                    <td><span class="badge badge-neutral">${inv.tipo || '—'}</span></td>
                    <td style="font-weight:700">${fmtMoney(inv.valor_atual)}</td>
                    <td style="font-weight:700;color:${rent >= 0 ? 'var(--green)' : 'var(--rose)'}">${rent >= 0 ? '+' : ''}${rent.toFixed(2)}%</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>` : '<div class="au-empty-sm">Nenhum investimento encontrado.</div>'}
        </div>
      </div>

      <!-- Metas -->
      <div class="au-section-card">
        <div class="au-table-header">
          <h4>Metas Financeiras</h4>
          <span class="badge badge-info">${goals.length} meta(s) · ${metas.ativas || 0} ativa(s)</span>
        </div>
        ${goals.length ? `
        <div class="au-goals-grid">
          ${goals.map(g => {
            const prog = parseFloat(g.progresso_pct) || 0;
            const statusBadge = g.status === 'ativa' ? 'badge-success' : g.status === 'concluida' ? 'badge-info' : 'badge-neutral';
            return `
            <div class="au-goal-card">
              <div class="au-goal-top">
                <div>
                  <div class="au-goal-name">${g.nome || '—'}</div>
                  <div class="au-goal-type">${g.tipo || '—'}</div>
                </div>
                <span class="badge ${statusBadge}">${g.status || '—'}</span>
              </div>
              <div class="au-goal-values">
                <span class="au-goal-current">${fmtMoney(g.valor_atual)}</span>
                <span class="au-goal-target">de ${fmtMoney(g.valor_alvo)}</span>
              </div>
              <div class="au-goal-progress-bar">
                <div class="au-goal-progress-fill" style="width:${Math.min(100, prog)}%"></div>
              </div>
              <div class="au-goal-footer">
                <span>${prog.toFixed(1)}% concluída</span>
                <span>Resta: ${fmtMoney(g.valor_restante)}</span>
              </div>
            </div>`;
          }).join('')}
        </div>` : '<div class="au-empty-sm">Nenhuma meta encontrada.</div>'}
      </div>

      <!-- Faturas Pendentes -->
      ${kpis.num_faturas_pendentes > 0 ? `
      <div class="au-alert-banner">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <span><strong>${kpis.num_faturas_pendentes}</strong> fatura(s) pendente(s) totalizando <strong>${fmtMoney(kpis.faturas_pendentes)}</strong></span>
      </div>` : ''}
    `;

    // Eventos
    document.getElementById('au-back')?.addEventListener('click', () => this.render());

    // Renderizar gráficos
    setTimeout(() => {
      this._renderGauge(health);
      this._renderMonthlyChart(monthly);
      this._renderCategoriesChart(categories);
    }, 80);
  },

  /* ──── GAUGE DE SAÚDE (Canvas) ──── */
  _renderGauge(health) {
    const canvas = document.getElementById('au-gauge-canvas');
    if (!canvas || !health) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const cx = w / 2, cy = h / 2;
    const r = 56;
    const lineWidth = 10;

    ctx.clearRect(0, 0, w, h);

    // Track
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0.75 * Math.PI, 0.25 * Math.PI);
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = 'rgba(99,118,180,0.15)';
    ctx.lineCap = 'round';
    ctx.stroke();

    // Fill
    const pct = health.score / 100;
    const startAngle = 0.75 * Math.PI;
    const endAngle = startAngle + pct * 1.5 * Math.PI;
    const color = this._getScoreColor(health.score);

    const gradient = ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, color + 'aa');

    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = gradient;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Glow
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(cx, cy, r, endAngle - 0.05, endAngle);
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.shadowBlur = 0;
  },

  /* ──── GRÁFICO MENSAL (barras) ──── */
  _renderMonthlyChart(monthly) {
    const canvas = document.getElementById('au-chart-monthly');
    if (!canvas || !monthly || monthly.length === 0) return;

    this._charts.monthly = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: monthly.map(d => d.label),
        datasets: [
          {
            label: 'Receitas',
            data: monthly.map(d => parseFloat(d.receitas)),
            backgroundColor: 'rgba(16,217,160,0.25)',
            borderColor: '#10d9a0',
            borderWidth: 2,
            borderRadius: 6
          },
          {
            label: 'Despesas',
            data: monthly.map(d => parseFloat(d.despesas)),
            backgroundColor: 'rgba(244,63,94,0.18)',
            borderColor: '#f43f5e',
            borderWidth: 2,
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#94a3b8', font: { size: 11, family: 'Inter' } } } },
        scales: {
          x: { grid: { color: 'rgba(99,118,180,0.08)' }, ticks: { color: '#94a3b8', font: { family: 'Inter', size: 11 } } },
          y: { grid: { color: 'rgba(99,118,180,0.08)' }, ticks: { color: '#94a3b8', font: { family: 'Inter', size: 11 }, callback: v => 'R$' + (v / 1000).toFixed(0) + 'k' } }
        }
      }
    });
  },

  /* ──── GRÁFICO CATEGORIAS (doughnut) ──── */
  _renderCategoriesChart(categories) {
    const canvas = document.getElementById('au-chart-categories');
    if (!canvas || !categories || categories.length === 0) {
      if (canvas) {
        const wrap = canvas.parentElement;
        wrap.innerHTML = '<div class="au-empty-sm" style="display:flex;align-items:center;justify-content:center;height:100%">Sem dados de categorias.</div>';
      }
      return;
    }

    this._charts.categories = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: categories.map(d => d.categoria),
        datasets: [{
          data: categories.map(d => parseFloat(d.total)),
          backgroundColor: categories.map(d => (d.cor || '#666') + 'cc'),
          borderColor: categories.map(d => d.cor || '#666'),
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 10, family: 'Inter' }, padding: 10, boxWidth: 12 } }
        }
      }
    });
  },

  /* ──── UTILITÁRIOS ──── */
  _getScoreColor(score) {
    if (score >= 80) return '#10d9a0';
    if (score >= 60) return '#38bdf8';
    if (score >= 40) return '#f59e0b';
    if (score >= 20) return '#f43f5e';
    return '#ef4444';
  },

  _destroyCharts() {
    Object.values(this._charts).forEach(c => { if (c && c.destroy) c.destroy(); });
    this._charts = {};
  }
};
