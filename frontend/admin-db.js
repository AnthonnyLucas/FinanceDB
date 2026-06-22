/* ═══════════════════════════════════════════════════════════
   admin-db.js — Página Banco de Dados (DML / DDL / DCL / TCL)
   FinanceDB Frontend · Painel Administrativo
═══════════════════════════════════════════════════════════ */

const AdminDB = {
  _tables: [],
  _currentTab: 'dml',
  _dml: { table: null, data: [], columns: [], pagination: {}, search: '', orderBy: null, order: 'asc' },
  _tcl: { txId: null, status: 'idle', operations: [], startTime: null, timerInterval: null },

  /* ──── RENDER PRINCIPAL ──── */
  async render() {
    const container = document.getElementById('page-admin-db');
    if (!container) return;

    container.innerHTML = `
      <div class="admin-tabs" id="admin-db-tabs">
        <button class="admin-tab active" data-tab="dml">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          DML
        </button>
        <button class="admin-tab" data-tab="ddl">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3h7a2 2 0 012 2v14a2 2 0 01-2 2h-7m0-18H5a2 2 0 00-2 2v14a2 2 0 002 2h7m0-18v18"/></svg>
          DDL
        </button>
        <button class="admin-tab" data-tab="dcl">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          DCL
        </button>
        <button class="admin-tab" data-tab="tcl">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
          TCL
        </button>
      </div>
      <div class="admin-tab-content" id="admin-db-content"></div>
    `;

    // Tab events
    container.querySelectorAll('.admin-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        container.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this._currentTab = tab.dataset.tab;
        this._renderTab();
      });
    });

    // Load tables
    try {
      this._tables = await API.get('/schema/tables');
    } catch (e) {
      Toast.error('Erro ao carregar tabelas: ' + e.message);
    }

    this._renderTab();
  },

  _renderTab() {
    switch (this._currentTab) {
      case 'dml': this._renderDML(); break;
      case 'ddl': this._renderDDL(); break;
      case 'dcl': this._renderDCL(); break;
      case 'tcl': this._renderTCL(); break;
    }
  },

  /* ════════════════════════════════════════════════════════
     DML — DATA MANIPULATION LANGUAGE
  ════════════════════════════════════════════════════════ */
  _renderDML() {
    const el = document.getElementById('admin-db-content');
    el.innerHTML = `
      <div class="dml-toolbar">
        <div class="dml-toolbar-left">
          <select class="dml-select" id="dml-table-select">
            <option value="">Selecione uma tabela...</option>
            ${this._tables.map(t => `<option value="${t.name}" ${t.name === this._dml.table ? 'selected' : ''}>${t.name} ${t.protected ? '🔒' : '🔓'} (${t.row_count} registros)</option>`).join('')}
          </select>
          <div class="dml-search-wrap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#475569" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" class="dml-search" id="dml-search" placeholder="Buscar..." value="${this._dml.search}" />
          </div>
        </div>
        <div class="dml-toolbar-right">
          <button class="btn-admin btn-admin-primary" id="dml-btn-insert" ${!this._dml.table ? 'disabled' : ''}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Novo Registro
          </button>
          <button class="btn-admin btn-admin-ghost" id="dml-btn-refresh" ${!this._dml.table ? 'disabled' : ''}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
          </button>
        </div>
      </div>
      <div id="dml-grid-container" class="dml-grid-container">
        ${this._dml.table ? '<div class="admin-loading">Carregando...</div>' : '<div class="admin-empty-state"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2d3a5c" stroke-width="1.5"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg><p>Selecione uma tabela para visualizar os dados</p></div>'}
      </div>
      <div id="dml-pagination" class="dml-pagination"></div>
    `;

    // Events
    document.getElementById('dml-table-select').addEventListener('change', (e) => {
      this._dml.table = e.target.value || null;
      this._dml.search = '';
      this._dml.orderBy = null;
      this._dml.order = 'asc';
      document.getElementById('dml-search').value = '';
      // Atualizar estado dos botões imediatamente ao trocar de tabela
      const btnInsert = document.getElementById('dml-btn-insert');
      const btnRefresh = document.getElementById('dml-btn-refresh');
      if (btnInsert) btnInsert.disabled = !this._dml.table;
      if (btnRefresh) btnRefresh.disabled = !this._dml.table;
      if (this._dml.table) this._loadDMLData(1);
      else this._renderDML();
    });

    let searchTimeout;
    document.getElementById('dml-search').addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        this._dml.search = e.target.value;
        if (this._dml.table) this._loadDMLData(1);
      }, 400);
    });

    document.getElementById('dml-btn-refresh').addEventListener('click', () => {
      if (this._dml.table) this._loadDMLData(this._dml.pagination.page || 1);
    });

    document.getElementById('dml-btn-insert').addEventListener('click', () => {
      if (this._dml.table) this._showInsertModal();
    });

    if (this._dml.table) this._loadDMLData(this._dml.pagination.page || 1);
  },

  async _loadDMLData(page = 1) {
    const container = document.getElementById('dml-grid-container');
    if (!container) return;
    container.innerHTML = '<div class="admin-loading"><div class="admin-spinner"></div> Carregando dados...</div>';

    try {
      let path = `/dml/${this._dml.table}?page=${page}&limit=25`;
      if (this._dml.search) path += `&search=${encodeURIComponent(this._dml.search)}`;
      if (this._dml.orderBy) path += `&orderBy=${this._dml.orderBy}&order=${this._dml.order}`;

      const result = await API.get(path);
      this._dml.data = result.data;
      this._dml.columns = result.columns;
      this._dml.pagination = result.pagination;

      this._renderDMLGrid();
      this._renderDMLPagination();
    } catch (e) {
      container.innerHTML = `<div class="admin-error">Erro: ${e.message}</div>`;
    }
  },

  _renderDMLGrid() {
    const container = document.getElementById('dml-grid-container');
    if (!container) return;
    if (!this._dml.data.length) {
      container.innerHTML = '<div class="admin-empty-state"><p>Nenhum registro encontrado</p></div>';
      return;
    }
    const cols = this._dml.columns;
    container.innerHTML = `
      <div class="dml-table-scroll">
        <table class="dml-table">
          <thead><tr>
            ${cols.map(c => `
              <th class="dml-th ${this._dml.orderBy === c.column_name ? 'sorted' : ''}" data-col="${c.column_name}">
                ${c.column_name}
                <span class="dml-sort-icon">${this._dml.orderBy === c.column_name ? (this._dml.order === 'asc' ? '↑' : '↓') : ''}</span>
              </th>`).join('')}
            <th class="dml-th-actions">Ações</th>
          </tr></thead>
          <tbody>
            ${this._dml.data.map(row => `
              <tr>
                ${cols.map(c => `<td class="dml-td" title="${String(row[c.column_name] ?? '')}">${this._formatCell(row[c.column_name], c.data_type)}</td>`).join('')}
                <td class="dml-td-actions">
                  <button class="dml-action-btn dml-edit" data-id="${row.id || ''}" title="Editar">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button class="dml-action-btn dml-delete" data-id="${row.id || ''}" title="Excluir">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    // Sort headers
    container.querySelectorAll('.dml-th[data-col]').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.col;
        if (this._dml.orderBy === col) {
          this._dml.order = this._dml.order === 'asc' ? 'desc' : 'asc';
        } else {
          this._dml.orderBy = col;
          this._dml.order = 'asc';
        }
        this._loadDMLData(1);
      });
    });

    // Edit buttons
    container.querySelectorAll('.dml-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const row = this._dml.data.find(r => String(r.id) === id);
        if (row) this._showEditModal(row);
      });
    });

    // Delete buttons
    container.querySelectorAll('.dml-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        this._showDeleteConfirm(id);
      });
    });
  },

  _formatCell(val, type) {
    if (val === null || val === undefined) return '<span class="dml-null">NULL</span>';
    if (typeof val === 'boolean') return val ? '<span class="dml-bool-true">✓</span>' : '<span class="dml-bool-false">✗</span>';
    const s = String(val);
    if (s.length > 40) return s.substring(0, 37) + '…';
    return s;
  },

  _renderDMLPagination() {
    const el = document.getElementById('dml-pagination');
    if (!el) return;
    const p = this._dml.pagination;
    if (!p || p.totalPages <= 1) { el.innerHTML = ''; return; }

    el.innerHTML = `
      <span class="dml-page-info">${p.total} registros · Página ${p.page} de ${p.totalPages}</span>
      <div class="dml-page-btns">
        <button class="dml-page-btn" ${p.page <= 1 ? 'disabled' : ''} data-p="${p.page - 1}">← Anterior</button>
        ${Array.from({length: Math.min(p.totalPages, 7)}, (_, i) => {
          let pg;
          if (p.totalPages <= 7) pg = i + 1;
          else if (p.page <= 4) pg = i + 1;
          else if (p.page >= p.totalPages - 3) pg = p.totalPages - 6 + i;
          else pg = p.page - 3 + i;
          return `<button class="dml-page-btn ${pg === p.page ? 'active' : ''}" data-p="${pg}">${pg}</button>`;
        }).join('')}
        <button class="dml-page-btn" ${p.page >= p.totalPages ? 'disabled' : ''} data-p="${p.page + 1}">Próxima →</button>
      </div>
    `;

    el.querySelectorAll('.dml-page-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const pg = parseInt(btn.dataset.p);
        if (pg >= 1 && pg <= p.totalPages) this._loadDMLData(pg);
      });
    });
  },

  /* ─── DML Modais ─── */
  _showInsertModal() {
    const cols = this._dml.columns.filter(c => {
      const def = c.column_default || '';
      return !def.includes('gen_random_uuid') && !def.includes('nextval');
    });
    this._showFormModal('Novo Registro', cols, {}, async (data) => {
      await API.post(`/dml/${this._dml.table}`, data);
      Toast.success('Registro inserido com sucesso!');
      this._loadDMLData(this._dml.pagination.page || 1);
    });
  },

  _showEditModal(row) {
    const cols = this._dml.columns.filter(c => c.column_name !== 'id');
    this._showFormModal('Editar Registro', cols, row, async (data) => {
      await API.put(`/dml/${this._dml.table}/${row.id}`, data);
      Toast.success('Registro atualizado com sucesso!');
      this._loadDMLData(this._dml.pagination.page || 1);
    });
  },

  _showFormModal(title, cols, values, onSubmit) {
    this._removeModal();
    const overlay = document.createElement('div');
    overlay.className = 'admin-modal-overlay';
    overlay.id = 'admin-modal-overlay';

    overlay.innerHTML = `
      <div class="admin-modal">
        <div class="admin-modal-header">
          <h3>${title} — ${this._dml.table}</h3>
          <button class="admin-modal-close" id="modal-close-btn">✕</button>
        </div>
        <form id="admin-modal-form" class="admin-modal-body">
          ${cols.map(c => `
            <div class="admin-form-group">
              <label class="admin-form-label">
                ${c.column_name}
                <span class="admin-form-type">${c.data_type}${c.is_nullable === 'YES' ? ' · nullable' : ' · NOT NULL'}</span>
              </label>
              ${this._getInputForType(c, values[c.column_name])}
            </div>
          `).join('')}
          <div class="admin-modal-footer">
            <button type="button" class="btn-admin btn-admin-ghost" id="modal-cancel-btn">Cancelar</button>
            <button type="submit" class="btn-admin btn-admin-primary">Salvar</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('visible'));

    document.getElementById('modal-close-btn').addEventListener('click', () => this._removeModal());
    document.getElementById('modal-cancel-btn').addEventListener('click', () => this._removeModal());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) this._removeModal(); });

    document.getElementById('admin-modal-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = {};
      cols.forEach(c => {
        const input = document.getElementById(`field-${c.column_name}`);
        if (input) {
          let val = input.value;
          if (val === '' && c.is_nullable === 'YES') val = null;
          if (c.data_type === 'boolean') val = input.checked;
          if (['integer', 'numeric', 'bigint', 'smallint', 'double precision', 'real'].includes(c.data_type) && val !== null && val !== '') val = Number(val);
          formData[c.column_name] = val;
        }
      });
      try {
        await onSubmit(formData);
        this._removeModal();
      } catch (err) {
        Toast.error(err.message);
      }
    });
  },

  _getInputForType(col, value) {
    const id = `field-${col.column_name}`;
    const val = value !== undefined && value !== null ? value : '';
    if (col.data_type === 'boolean') {
      return `<label class="admin-toggle-wrap"><input type="checkbox" id="${id}" ${val ? 'checked' : ''} /><span class="admin-toggle"></span></label>`;
    }
    if (col.data_type === 'text') {
      return `<textarea id="${id}" class="admin-input" rows="3">${val}</textarea>`;
    }
    if (col.data_type === 'date') {
      return `<input type="date" id="${id}" class="admin-input" value="${val}" />`;
    }
    if (['timestamp without time zone', 'timestamp with time zone'].includes(col.data_type)) {
      return `<input type="datetime-local" id="${id}" class="admin-input" value="${val ? String(val).substring(0, 16) : ''}" />`;
    }
    if (['integer', 'bigint', 'smallint', 'numeric', 'double precision', 'real'].includes(col.data_type)) {
      return `<input type="number" id="${id}" class="admin-input" value="${val}" step="any" />`;
    }
    return `<input type="text" id="${id}" class="admin-input" value="${val}" />`;
  },

  _showDeleteConfirm(id) {
    this._removeModal();
    const overlay = document.createElement('div');
    overlay.className = 'admin-modal-overlay';
    overlay.id = 'admin-modal-overlay';
    overlay.innerHTML = `
      <div class="admin-modal admin-modal-sm">
        <div class="admin-modal-header admin-modal-header-danger">
          <h3>Confirmar Exclusão</h3>
        </div>
        <div class="admin-modal-body">
          <p style="color:var(--t2);font-size:13px;margin-bottom:16px">
            Tem certeza que deseja excluir o registro <strong style="color:var(--rose)">${id}</strong> da tabela <strong>${this._dml.table}</strong>?
          </p>
          <p style="color:var(--t3);font-size:11px">Esta ação não pode ser desfeita.</p>
        </div>
        <div class="admin-modal-footer">
          <button class="btn-admin btn-admin-ghost" id="del-cancel">Cancelar</button>
          <button class="btn-admin btn-admin-danger" id="del-confirm">Excluir</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('visible'));

    document.getElementById('del-cancel').addEventListener('click', () => this._removeModal());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) this._removeModal(); });
    document.getElementById('del-confirm').addEventListener('click', async () => {
      try {
        await API.delete(`/dml/${this._dml.table}/${id}`);
        Toast.success('Registro excluído com sucesso!');
        this._removeModal();
        this._loadDMLData(this._dml.pagination.page || 1);
      } catch (err) {
        Toast.error(err.message);
      }
    });
  },

  _removeModal() {
    const m = document.getElementById('admin-modal-overlay');
    if (m) { m.classList.remove('visible'); setTimeout(() => m.remove(), 250); }
  },

  /* ════════════════════════════════════════════════════════
     DDL — DATA DEFINITION LANGUAGE
  ════════════════════════════════════════════════════════ */
  _renderDDL() {
    const el = document.getElementById('admin-db-content');
    el.innerHTML = `
      <div class="ddl-layout">
        <div class="ddl-sidebar">
          <div class="ddl-sidebar-header">
            <h4>Tabelas do Banco</h4>
            <span class="badge badge-info">${this._tables.length}</span>
          </div>
          <div class="ddl-table-list" id="ddl-table-list">
            ${this._tables.map(t => `
              <div class="ddl-table-item" data-table="${t.name}">
                <span class="ddl-table-badge ${t.protected ? 'ddl-protected' : 'ddl-custom'}">
                  ${t.protected ? '🔒' : '🔓'}
                </span>
                <div class="ddl-table-info">
                  <span class="ddl-table-name">${t.name}</span>
                  <span class="ddl-table-meta">${t.column_count} cols · ${t.row_count} rows · ${t.size}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="ddl-main">
          <div class="ddl-actions-bar">
            <button class="btn-admin btn-admin-primary" id="ddl-create-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              CREATE TABLE
            </button>
          </div>
          <div id="ddl-detail" class="ddl-detail">
            <div class="admin-empty-state">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2d3a5c" stroke-width="1.5"><path d="M12 3h7a2 2 0 012 2v14a2 2 0 01-2 2h-7m0-18H5a2 2 0 00-2 2v14a2 2 0 002 2h7m0-18v18"/></svg>
              <p>Clique em uma tabela para ver a estrutura</p>
            </div>
          </div>
        </div>
      </div>
    `;

    // Table list click
    el.querySelectorAll('.ddl-table-item').forEach(item => {
      item.addEventListener('click', () => {
        el.querySelectorAll('.ddl-table-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        this._loadDDLDetail(item.dataset.table);
      });
    });

    document.getElementById('ddl-create-btn').addEventListener('click', () => this._showCreateTableModal());
  },

  async _loadDDLDetail(tableName) {
    const detail = document.getElementById('ddl-detail');
    detail.innerHTML = '<div class="admin-loading"><div class="admin-spinner"></div> Carregando estrutura...</div>';

    try {
      const [columns, constraints] = await Promise.all([
        API.get(`/schema/tables/${tableName}/columns`),
        API.get(`/schema/tables/${tableName}/constraints`)
      ]);
      const tableInfo = this._tables.find(t => t.name === tableName);
      const isProtected = tableInfo?.protected;

      detail.innerHTML = `
        <div class="ddl-detail-header">
          <div>
            <h3 style="display:inline-flex;align-items:center;gap:8px">
              ${tableName}
              <span class="badge ${isProtected ? 'badge-warn' : 'badge-success'}">${isProtected ? '🔒 Protegida' : '🔓 Customizada'}</span>
            </h3>
            <p style="font-size:11px;color:var(--t3);margin-top:4px">${columns.length} colunas · ${tableInfo?.row_count || 0} registros · ${tableInfo?.size || '—'}</p>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn-admin btn-admin-ghost btn-sm" id="ddl-alter-btn">ALTER TABLE</button>
            <button class="btn-admin btn-admin-ghost btn-sm" id="ddl-truncate-btn" ${isProtected ? 'disabled title="Tabela protegida"' : ''}>TRUNCATE</button>
            <button class="btn-admin btn-admin-danger btn-sm" id="ddl-drop-btn" ${isProtected ? 'disabled title="Tabela protegida"' : ''}>DROP TABLE</button>
          </div>
        </div>

        <h4 style="font-size:12px;color:var(--t3);text-transform:uppercase;letter-spacing:0.8px;margin:20px 0 10px">Colunas</h4>
        <table class="dml-table">
          <thead><tr>
            <th>Nome</th><th>Tipo</th><th>Nullable</th><th>Default</th><th>PK</th><th>FK</th>
          </tr></thead>
          <tbody>
            ${columns.map(c => `
              <tr>
                <td class="td-bold">${c.column_name}</td>
                <td><span class="badge badge-neutral">${c.udt_name}${c.character_maximum_length ? `(${c.character_maximum_length})` : ''}</span></td>
                <td>${c.is_nullable === 'YES' ? '<span class="dml-bool-true">Sim</span>' : '<span class="dml-bool-false">Não</span>'}</td>
                <td class="font-mono" style="font-size:11px;color:var(--t3)">${c.column_default ? c.column_default.substring(0, 30) : '—'}</td>
                <td>${c.is_primary_key ? '<span class="badge badge-warn">PK</span>' : ''}</td>
                <td>${c.fk_references ? `<span class="badge badge-info">→ ${c.fk_references}</span>` : ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        ${constraints.length ? `
          <h4 style="font-size:12px;color:var(--t3);text-transform:uppercase;letter-spacing:0.8px;margin:20px 0 10px">Constraints</h4>
          <div class="ddl-constraints">
            ${constraints.map(c => `
              <div class="ddl-constraint-item">
                <span class="badge ${c.constraint_type === 'PRIMARY KEY' ? 'badge-warn' : c.constraint_type === 'FOREIGN KEY' ? 'badge-info' : c.constraint_type === 'CHECK' ? 'badge-purple' : 'badge-neutral'}">${c.constraint_type}</span>
                <span style="font-size:12px;color:var(--t1);font-weight:500">${c.constraint_name}</span>
                ${c.column_name ? `<span style="font-size:11px;color:var(--t3)">· ${c.column_name}</span>` : ''}
                ${c.foreign_table ? `<span style="font-size:11px;color:var(--green)">→ ${c.foreign_table}.${c.foreign_column}</span>` : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}
      `;

      // DDL action buttons
      document.getElementById('ddl-alter-btn').addEventListener('click', () => this._showAlterTableModal(tableName));
      document.getElementById('ddl-truncate-btn').addEventListener('click', () => {
        if (!isProtected) this._confirmDDLAction('TRUNCATE', tableName);
      });
      document.getElementById('ddl-drop-btn').addEventListener('click', () => {
        if (!isProtected) this._confirmDDLAction('DROP', tableName);
      });
    } catch (e) {
      detail.innerHTML = `<div class="admin-error">Erro: ${e.message}</div>`;
    }
  },

  _showCreateTableModal() {
    this._removeModal();
    const overlay = document.createElement('div');
    overlay.className = 'admin-modal-overlay';
    overlay.id = 'admin-modal-overlay';
    overlay.innerHTML = `
      <div class="admin-modal admin-modal-lg">
        <div class="admin-modal-header"><h3>CREATE TABLE</h3><button class="admin-modal-close" id="modal-close-btn">✕</button></div>
        <div class="admin-modal-body">
          <div class="admin-form-group">
            <label class="admin-form-label">Nome da Tabela</label>
            <input type="text" id="ct-name" class="admin-input" placeholder="nome_da_tabela" pattern="[a-zA-Z_][a-zA-Z0-9_]*" required />
          </div>
          <h4 style="font-size:12px;color:var(--t3);text-transform:uppercase;letter-spacing:0.8px;margin:16px 0 8px">Colunas</h4>
          <div id="ct-columns"></div>
          <button type="button" class="btn-admin btn-admin-ghost btn-sm" id="ct-add-col" style="margin-top:8px">+ Adicionar Coluna</button>
          <div id="ct-preview" class="ddl-sql-preview" style="margin-top:16px"></div>
        </div>
        <div class="admin-modal-footer">
          <button class="btn-admin btn-admin-ghost" id="modal-cancel-btn">Cancelar</button>
          <button class="btn-admin btn-admin-primary" id="ct-submit">Criar Tabela</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('visible'));

    let colCount = 0;
    const addColumn = () => {
      colCount++;
      const colDiv = document.createElement('div');
      colDiv.className = 'ddl-col-builder';
      colDiv.innerHTML = `
        <input type="text" class="admin-input admin-input-sm ct-col-name" placeholder="nome_coluna" />
        <select class="admin-input admin-input-sm ct-col-type">
          <option>VARCHAR(255)</option><option>TEXT</option><option>INTEGER</option><option>BIGINT</option>
          <option>NUMERIC(12,2)</option><option>BOOLEAN</option><option>DATE</option>
          <option>TIMESTAMP</option><option>UUID</option>
        </select>
        <label class="admin-check-wrap"><input type="checkbox" class="ct-col-pk" /> PK</label>
        <label class="admin-check-wrap"><input type="checkbox" class="ct-col-nn" checked /> NOT NULL</label>
        <button type="button" class="dml-action-btn dml-delete ct-col-remove">✕</button>
      `;
      document.getElementById('ct-columns').appendChild(colDiv);
      colDiv.querySelector('.ct-col-remove').addEventListener('click', () => colDiv.remove());
    };
    addColumn();

    document.getElementById('ct-add-col').addEventListener('click', addColumn);
    document.getElementById('modal-close-btn').addEventListener('click', () => this._removeModal());
    document.getElementById('modal-cancel-btn').addEventListener('click', () => this._removeModal());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) this._removeModal(); });

    document.getElementById('ct-submit').addEventListener('click', async () => {
      const name = document.getElementById('ct-name').value.trim();
      if (!name) { Toast.warning('Informe o nome da tabela.'); return; }
      const columns = [];
      document.querySelectorAll('.ddl-col-builder').forEach(row => {
        const colName = row.querySelector('.ct-col-name').value.trim();
        const colType = row.querySelector('.ct-col-type').value;
        const pk = row.querySelector('.ct-col-pk').checked;
        const nn = row.querySelector('.ct-col-nn').checked;
        if (colName) columns.push({ name: colName, type: colType, primary_key: pk, nullable: !nn });
      });
      if (columns.length === 0) { Toast.warning('Adicione pelo menos uma coluna.'); return; }
      try {
        const result = await API.post('/ddl/create-table', { name, columns });
        Toast.success(result.message);
        this._removeModal();
        this._tables = await API.get('/schema/tables');
        this._renderDDL();
      } catch (err) { Toast.error(err.message); }
    });
  },

  _showAlterTableModal(tableName) {
    this._removeModal();
    const overlay = document.createElement('div');
    overlay.className = 'admin-modal-overlay';
    overlay.id = 'admin-modal-overlay';
    overlay.innerHTML = `
      <div class="admin-modal">
        <div class="admin-modal-header"><h3>ALTER TABLE — ${tableName}</h3><button class="admin-modal-close" id="modal-close-btn">✕</button></div>
        <div class="admin-modal-body">
          <div class="admin-form-group">
            <label class="admin-form-label">Ação</label>
            <select id="at-action" class="admin-input">
              <option value="add_column">ADD COLUMN</option>
              <option value="drop_column">DROP COLUMN</option>
              <option value="rename_column">RENAME COLUMN</option>
            </select>
          </div>
          <div class="admin-form-group">
            <label class="admin-form-label">Nome da Coluna</label>
            <input type="text" id="at-col-name" class="admin-input" placeholder="nome_coluna" />
          </div>
          <div class="admin-form-group" id="at-type-group">
            <label class="admin-form-label">Tipo</label>
            <select id="at-col-type" class="admin-input">
              <option>VARCHAR(255)</option><option>TEXT</option><option>INTEGER</option><option>BIGINT</option>
              <option>NUMERIC(12,2)</option><option>BOOLEAN</option><option>DATE</option><option>TIMESTAMP</option><option>UUID</option>
            </select>
          </div>
          <div class="admin-form-group" id="at-newname-group" style="display:none">
            <label class="admin-form-label">Novo Nome</label>
            <input type="text" id="at-new-name" class="admin-input" placeholder="novo_nome" />
          </div>
        </div>
        <div class="admin-modal-footer">
          <button class="btn-admin btn-admin-ghost" id="modal-cancel-btn">Cancelar</button>
          <button class="btn-admin btn-admin-primary" id="at-submit">Executar</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('visible'));

    document.getElementById('at-action').addEventListener('change', (e) => {
      const action = e.target.value;
      document.getElementById('at-type-group').style.display = action === 'add_column' ? '' : 'none';
      document.getElementById('at-newname-group').style.display = action === 'rename_column' ? '' : 'none';
    });

    document.getElementById('modal-close-btn').addEventListener('click', () => this._removeModal());
    document.getElementById('modal-cancel-btn').addEventListener('click', () => this._removeModal());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) this._removeModal(); });

    document.getElementById('at-submit').addEventListener('click', async () => {
      const action = document.getElementById('at-action').value;
      const body = { table: tableName, action, column_name: document.getElementById('at-col-name').value.trim() };
      if (action === 'add_column') body.column_type = document.getElementById('at-col-type').value;
      if (action === 'rename_column') body.new_name = document.getElementById('at-new-name').value.trim();
      try {
        const result = await API.post('/ddl/alter-table', body);
        Toast.success(result.message);
        this._removeModal();
        this._tables = await API.get('/schema/tables');
        this._loadDDLDetail(tableName);
      } catch (err) { Toast.error(err.message); }
    });
  },

  _confirmDDLAction(action, tableName) {
    this._removeModal();
    const overlay = document.createElement('div');
    overlay.className = 'admin-modal-overlay';
    overlay.id = 'admin-modal-overlay';
    const isDrop = action === 'DROP';
    overlay.innerHTML = `
      <div class="admin-modal admin-modal-sm">
        <div class="admin-modal-header admin-modal-header-danger"><h3>${action} TABLE — ${tableName}</h3></div>
        <div class="admin-modal-body">
          <p style="color:var(--rose);font-size:13px;font-weight:600;margin-bottom:8px">⚠ Ação destrutiva!</p>
          <p style="color:var(--t2);font-size:12px">${isDrop ? 'Esta tabela será permanentemente removida. Todos os dados serão perdidos.' : 'Todos os registros desta tabela serão excluídos.'}</p>
          ${isDrop ? '<p style="color:var(--t3);font-size:11px;margin-top:8px">Digite o nome da tabela para confirmar:</p><input type="text" id="ddl-confirm-name" class="admin-input" placeholder="' + tableName + '" style="margin-top:8px" />' : ''}
        </div>
        <div class="admin-modal-footer">
          <button class="btn-admin btn-admin-ghost" id="modal-cancel-btn">Cancelar</button>
          <button class="btn-admin btn-admin-danger" id="ddl-confirm-btn">${action}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('visible'));

    document.getElementById('modal-cancel-btn').addEventListener('click', () => this._removeModal());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) this._removeModal(); });

    document.getElementById('ddl-confirm-btn').addEventListener('click', async () => {
      if (isDrop) {
        const confirmName = document.getElementById('ddl-confirm-name').value.trim();
        if (confirmName !== tableName) { Toast.warning('Nome da tabela não confere.'); return; }
      }
      try {
        if (isDrop) await API.delete(`/ddl/drop/${tableName}`);
        else await API.post(`/ddl/truncate/${tableName}`);
        Toast.success(`${action} TABLE executado com sucesso!`);
        this._removeModal();
        this._tables = await API.get('/schema/tables');
        this._renderDDL();
      } catch (err) { Toast.error(err.message); }
    });
  },

  /* ════════════════════════════════════════════════════════
     DCL — DATA CONTROL LANGUAGE
  ════════════════════════════════════════════════════════ */
  async _renderDCL() {
    const el = document.getElementById('admin-db-content');
    el.innerHTML = '<div class="admin-loading"><div class="admin-spinner"></div> Carregando roles...</div>';

    try {
      const roles = await API.get('/dcl/roles');
      el.innerHTML = `
        <div class="dcl-header">
          <h3 style="font-size:14px;font-weight:600;color:var(--t1)">Roles do PostgreSQL</h3>
          <button class="btn-admin btn-admin-primary" id="dcl-create-role-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
            Novo Role
          </button>
        </div>
        <div class="dcl-roles-grid">
          ${roles.map(r => `
            <div class="dcl-role-card">
              <div class="dcl-role-header">
                <div class="dcl-role-avatar">${r.name.charAt(0).toUpperCase()}</div>
                <div>
                  <div class="dcl-role-name">${r.name}</div>
                  <div class="dcl-role-meta">
                    ${r.is_superuser ? '<span class="badge badge-warn">Superuser</span>' : ''}
                    ${r.can_login ? '<span class="badge badge-success">Login</span>' : '<span class="badge badge-neutral">No Login</span>'}
                    ${r.can_create_db ? '<span class="badge badge-info">CreateDB</span>' : ''}
                  </div>
                </div>
              </div>
              <div class="dcl-role-actions">
                <button class="btn-admin btn-admin-ghost btn-sm dcl-manage-btn" data-role="${r.name}">Gerenciar Privilégios</button>
                ${!r.is_superuser ? `<button class="dml-action-btn dml-delete dcl-drop-role" data-role="${r.name}" title="Remover role">✕</button>` : ''}
              </div>
            </div>
          `).join('')}
        </div>

        <div id="dcl-privileges-panel" class="dcl-privileges-panel" style="display:none"></div>
      `;

      document.getElementById('dcl-create-role-btn').addEventListener('click', () => this._showCreateRoleModal());

      el.querySelectorAll('.dcl-manage-btn').forEach(btn => {
        btn.addEventListener('click', () => this._loadPrivileges(btn.dataset.role));
      });

      el.querySelectorAll('.dcl-drop-role').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (confirm(`Remover role "${btn.dataset.role}"?`)) {
            try {
              await API.delete(`/dcl/drop-role/${btn.dataset.role}`);
              Toast.success('Role removido!');
              this._renderDCL();
            } catch (err) { Toast.error(err.message); }
          }
        });
      });
    } catch (e) {
      el.innerHTML = `<div class="admin-error">Erro: ${e.message}</div>`;
    }
  },

  async _loadPrivileges(roleName) {
    const panel = document.getElementById('dcl-privileges-panel');
    panel.style.display = 'block';
    panel.innerHTML = '<div class="admin-loading"><div class="admin-spinner"></div> Carregando privilégios...</div>';

    const privileges = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'];

    try {
      const html = [];
      html.push(`<h3 style="font-size:14px;font-weight:600;color:var(--t1);margin-bottom:12px">Privilégios de "${roleName}"</h3>`);
      html.push('<div class="dcl-matrix-scroll"><table class="dml-table"><thead><tr><th>Tabela</th>');
      privileges.forEach(p => html.push(`<th style="text-align:center">${p}</th>`));
      html.push('</tr></thead><tbody>');

      for (const table of this._tables) {
        const privs = await API.get(`/dcl/privileges/${table.name}`);
        const rolePrivs = privs.find(p => p.grantee === roleName);
        html.push(`<tr><td class="td-bold">${table.name}</td>`);
        privileges.forEach(p => {
          const has = rolePrivs?.privileges?.[p]?.granted;
          html.push(`<td style="text-align:center"><label class="admin-toggle-wrap"><input type="checkbox" ${has ? 'checked' : ''} class="dcl-toggle" data-role="${roleName}" data-table="${table.name}" data-priv="${p}" /><span class="admin-toggle admin-toggle-sm"></span></label></td>`);
        });
        html.push('</tr>');
      }
      html.push('</tbody></table></div>');
      panel.innerHTML = html.join('');

      panel.querySelectorAll('.dcl-toggle').forEach(toggle => {
        toggle.addEventListener('change', async (e) => {
          const { role, table, priv } = e.target.dataset;
          try {
            if (e.target.checked) {
              await API.post('/dcl/grant', { privilege: priv, table, role });
              Toast.success(`GRANT ${priv} ON ${table} TO ${role}`);
            } else {
              await API.post('/dcl/revoke', { privilege: priv, table, role });
              Toast.success(`REVOKE ${priv} ON ${table} FROM ${role}`);
            }
          } catch (err) {
            e.target.checked = !e.target.checked;
            Toast.error(err.message);
          }
        });
      });
    } catch (e) {
      panel.innerHTML = `<div class="admin-error">Erro: ${e.message}</div>`;
    }
  },

  _showCreateRoleModal() {
    this._removeModal();
    const overlay = document.createElement('div');
    overlay.className = 'admin-modal-overlay';
    overlay.id = 'admin-modal-overlay';
    overlay.innerHTML = `
      <div class="admin-modal">
        <div class="admin-modal-header"><h3>Criar Novo Role</h3><button class="admin-modal-close" id="modal-close-btn">✕</button></div>
        <div class="admin-modal-body">
          <div class="admin-form-group">
            <label class="admin-form-label">Nome do Role</label>
            <input type="text" id="cr-name" class="admin-input" placeholder="nome_role" pattern="[a-zA-Z_][a-zA-Z0-9_]*" required />
          </div>
          <div class="admin-form-group">
            <label class="admin-form-label">Senha</label>
            <input type="password" id="cr-password" class="admin-input" placeholder="senha" />
          </div>
          <div style="display:flex;gap:16px;margin-top:8px">
            <label class="admin-check-wrap"><input type="checkbox" id="cr-login" checked /> Permite Login</label>
            <label class="admin-check-wrap"><input type="checkbox" id="cr-createdb" /> Pode criar DB</label>
          </div>
        </div>
        <div class="admin-modal-footer">
          <button class="btn-admin btn-admin-ghost" id="modal-cancel-btn">Cancelar</button>
          <button class="btn-admin btn-admin-primary" id="cr-submit">Criar Role</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('visible'));

    document.getElementById('modal-close-btn').addEventListener('click', () => this._removeModal());
    document.getElementById('modal-cancel-btn').addEventListener('click', () => this._removeModal());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) this._removeModal(); });

    document.getElementById('cr-submit').addEventListener('click', async () => {
      const name = document.getElementById('cr-name').value.trim();
      if (!name) { Toast.warning('Informe o nome do role.'); return; }
      try {
        await API.post('/dcl/create-role', {
          name,
          password: document.getElementById('cr-password').value,
          can_login: document.getElementById('cr-login').checked,
          can_create_db: document.getElementById('cr-createdb').checked
        });
        Toast.success(`Role "${name}" criado!`);
        this._removeModal();
        this._renderDCL();
      } catch (err) { Toast.error(err.message); }
    });
  },

  /* ════════════════════════════════════════════════════════
     TCL — TRANSACTION CONTROL LANGUAGE
  ════════════════════════════════════════════════════════ */
  async _renderTCL() {
    const el = document.getElementById('admin-db-content');

    // Check current status
    try {
      const status = await API.get('/tcl/status');
      if (status.active) {
        this._tcl.txId = status.transactionId;
        this._tcl.status = 'active';
        this._tcl.operations = status.operations || [];
        this._tcl.startTime = Date.now() - (status.duration || 0);
      }
    } catch (e) { /* ignore */ }

    el.innerHTML = `
      <div class="tcl-status-bar" id="tcl-status-bar">
        <div class="tcl-status-left">
          <div class="tcl-status-indicator ${this._tcl.status === 'active' ? 'tcl-active' : 'tcl-idle'}">
            <span class="tcl-status-dot"></span>
            <span id="tcl-status-text">${this._tcl.status === 'active' ? `Transação ativa — ${this._tcl.txId}` : 'Nenhuma transação ativa'}</span>
          </div>
          <span id="tcl-timer" class="tcl-timer">${this._tcl.status === 'active' ? '0:00' : ''}</span>
          <span id="tcl-op-count" class="tcl-op-count">${this._tcl.operations.length ? `${this._tcl.operations.length} operações` : ''}</span>
        </div>
        <div class="tcl-status-right">
          <button class="btn-admin btn-admin-primary btn-sm" id="tcl-begin-btn" ${this._tcl.status === 'active' ? 'disabled' : ''}>BEGIN</button>
          <button class="btn-admin btn-admin-success btn-sm" id="tcl-commit-btn" ${this._tcl.status !== 'active' ? 'disabled' : ''}>COMMIT</button>
          <button class="btn-admin btn-admin-danger btn-sm" id="tcl-rollback-btn" ${this._tcl.status !== 'active' ? 'disabled' : ''}>ROLLBACK</button>
        </div>
      </div>

      <div class="tcl-body">
        <div class="tcl-editor-section">
          <h4 style="font-size:12px;color:var(--t3);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px">SQL Query</h4>
          <textarea id="tcl-sql" class="tcl-textarea" placeholder="Escreva uma query SQL para executar dentro da transação..." ${this._tcl.status !== 'active' ? 'disabled' : ''}></textarea>
          <button class="btn-admin btn-admin-primary" id="tcl-execute-btn" ${this._tcl.status !== 'active' ? 'disabled' : ''}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Executar
          </button>
        </div>

        <div class="tcl-log-section">
          <h4 style="font-size:12px;color:var(--t3);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px">Log de Operações</h4>
          <div id="tcl-log" class="tcl-log">
            ${this._tcl.operations.length ? this._tcl.operations.map((op, i) => `
              <div class="tcl-log-item">
                <span class="tcl-log-idx">#${i + 1}</span>
                <span class="tcl-log-sql">${op.sql}</span>
                <span class="tcl-log-rows">${op.rowCount} rows</span>
              </div>
            `).join('') : '<div class="admin-empty-state" style="padding:20px"><p>Nenhuma operação executada</p></div>'}
          </div>
          <div id="tcl-result" class="tcl-result"></div>
        </div>
      </div>
    `;

    // Timer
    if (this._tcl.status === 'active') this._startTCLTimer();

    // Events
    document.getElementById('tcl-begin-btn').addEventListener('click', () => this._tclBegin());
    document.getElementById('tcl-commit-btn').addEventListener('click', () => this._tclCommit());
    document.getElementById('tcl-rollback-btn').addEventListener('click', () => this._tclRollback());
    document.getElementById('tcl-execute-btn').addEventListener('click', () => this._tclExecute());

    // Ctrl+Enter to execute
    document.getElementById('tcl-sql').addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'Enter') this._tclExecute();
    });
  },

  _startTCLTimer() {
    if (this._tcl.timerInterval) clearInterval(this._tcl.timerInterval);
    this._tcl.timerInterval = setInterval(() => {
      const elapsed = Date.now() - (this._tcl.startTime || Date.now());
      const secs = Math.floor(elapsed / 1000);
      const mins = Math.floor(secs / 60);
      const timerEl = document.getElementById('tcl-timer');
      if (timerEl) {
        timerEl.textContent = `${mins}:${String(secs % 60).padStart(2, '0')}`;
        if (mins >= 2) timerEl.classList.add('tcl-timer-warn');
      }
    }, 1000);
  },

  async _tclBegin() {
    try {
      const result = await API.post('/tcl/begin');
      this._tcl.txId = result.transactionId;
      this._tcl.status = 'active';
      this._tcl.operations = [];
      this._tcl.startTime = Date.now();
      Toast.success('Transação iniciada — BEGIN');
      this._renderTCL();
    } catch (err) { Toast.error(err.message); }
  },

  async _tclCommit() {
    try {
      const result = await API.post('/tcl/commit', { transactionId: this._tcl.txId });
      this._tcl.status = 'idle';
      this._tcl.txId = null;
      this._tcl.operations = [];
      if (this._tcl.timerInterval) clearInterval(this._tcl.timerInterval);
      Toast.success(`COMMIT — ${result.operationsCount} operações confirmadas`);
      this._renderTCL();
    } catch (err) { Toast.error(err.message); }
  },

  async _tclRollback() {
    try {
      const result = await API.post('/tcl/rollback', { transactionId: this._tcl.txId });
      this._tcl.status = 'idle';
      this._tcl.txId = null;
      this._tcl.operations = [];
      if (this._tcl.timerInterval) clearInterval(this._tcl.timerInterval);
      Toast.warning(`ROLLBACK — ${result.operationsCount} operações revertidas`);
      this._renderTCL();
    } catch (err) { Toast.error(err.message); }
  },

  async _tclExecute() {
    const sqlEl = document.getElementById('tcl-sql');
    const sql = sqlEl.value.trim();
    if (!sql) { Toast.warning('Escreva uma query SQL.'); return; }

    try {
      const result = await API.post('/tcl/execute', { transactionId: this._tcl.txId, sql });
      this._tcl.operations.push({ sql: sql.substring(0, 200), rowCount: result.rowCount, timestamp: new Date().toISOString() });

      // Update log
      const logEl = document.getElementById('tcl-log');
      const idx = this._tcl.operations.length;
      logEl.innerHTML += `
        <div class="tcl-log-item tcl-log-new">
          <span class="tcl-log-idx">#${idx}</span>
          <span class="tcl-log-sql">${sql.substring(0, 100)}</span>
          <span class="tcl-log-rows">${result.rowCount} rows</span>
        </div>
      `;

      // Update op count
      const opCount = document.getElementById('tcl-op-count');
      if (opCount) opCount.textContent = `${idx} operações`;

      // Show result
      const resultEl = document.getElementById('tcl-result');
      if (result.rows && result.rows.length > 0) {
        const fields = result.fields || Object.keys(result.rows[0]).map(k => ({ name: k }));
        resultEl.innerHTML = `
          <h4 style="font-size:11px;color:var(--t3);text-transform:uppercase;letter-spacing:0.8px;margin:12px 0 6px">Resultado (${result.rows.length} linhas)</h4>
          <div class="dml-table-scroll" style="max-height:200px">
            <table class="dml-table">
              <thead><tr>${fields.map(f => `<th>${f.name}</th>`).join('')}</tr></thead>
              <tbody>${result.rows.slice(0, 20).map(row => `<tr>${fields.map(f => `<td>${row[f.name] ?? 'NULL'}</td>`).join('')}</tr>`).join('')}</tbody>
            </table>
          </div>
        `;
      } else {
        resultEl.innerHTML = `<p style="font-size:12px;color:var(--green);margin-top:12px">✓ ${result.rowCount} linha(s) afetada(s)</p>`;
      }

      sqlEl.value = '';
      Toast.success(`Query executada — ${result.rowCount} rows`);
    } catch (err) {
      Toast.error(err.message);
    }
  }
};
