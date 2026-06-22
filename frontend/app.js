/* ═══════════════════════════════════════════════════════════
   FinanceDB — app.js
   Frontend dinâmico — consome dados do PostgreSQL via API
═══════════════════════════════════════════════════════════ */

// ────────────────────────────────────────────────────────────
//  ESTADO GLOBAL — preenchido via API
// ────────────────────────────────────────────────────────────

let APP_USER_ID = null;
let APP_USER = null;
let ALL_USERS = [];

// ────────────────────────────────────────────────────────────
//  HELPERS
// ────────────────────────────────────────────────────────────

const $ = id => document.getElementById(id);
const fmt = v => 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = d => {
  if (!d) return '—';
  const s = String(d).substring(0, 10);
  const [y, m, day] = s.split('-');
  return `${day}/${m}/${y}`;
};

/** Fetch wrapper com fallback para file:// */
async function apiFetch(path) {
  const base = (window.location.origin && window.location.origin !== 'null' && !window.location.origin.startsWith('file:'))
    ? window.location.origin
    : 'http://localhost:3000';
  try {
    const res = await fetch(base + '/api/frontend' + path);
    if (!res.ok) throw new Error(`Erro ${res.status}`);
    return res.json();
  } catch (e) {
    // API indisponível — usar dados de fallback estáticos
    console.warn('[FinanceDB] API offline, usando dados de demonstração para:', path);
    return fallbackResolve(path);
  }
}

// ────────────────────────────────────────────────────────────
//  FALLBACK DATABASE — dados estáticos para modo offline/file://
//  Espelha exatamente os dados seed do financeiro_pessoal.sql
// ────────────────────────────────────────────────────────────

const FALLBACK_DB = {
  user: {
    id:    'a0000000-0000-0000-0000-000000000001',
    nome:  'João Silva',
    email: 'joao@email.com',
    plano: 'pro'
  },
  user2: {
    id:    'a0000000-0000-0000-0000-000000000002',
    nome:  'Maria Souza',
    email: 'maria@email.com',
    plano: 'free'
  },
  contas: [
    {
      id: 'b0000000-0000-0000-0000-000000000001',
      usuario_id: 'a0000000-0000-0000-0000-000000000001',
      nome: 'Conta Corrente Itaú', tipo: 'corrente', instituicao: 'Itaú Unibanco',
      saldo_inicial: '5000.00', saldo_atual: '4350.00', moeda: 'BRL',
      sincronizada: true, ativa: true,
      // conta_bancaria join
      banco_codigo: '341', agencia: '1234', numero_conta: '56789-0',
      token_open_finance: 'eyJhbGci...██████████',
      ultima_sincronizacao: '2025-05-10T14:30:00', status_sincronizacao: 'ok'
    },
    {
      id: 'b0000000-0000-0000-0000-000000000002',
      usuario_id: 'a0000000-0000-0000-0000-000000000001',
      nome: 'Poupança Itaú', tipo: 'poupanca', instituicao: 'Itaú Unibanco',
      saldo_inicial: '1000.00', saldo_atual: '1200.00', moeda: 'BRL',
      sincronizada: false, ativa: true,
      banco_codigo: null, agencia: null, numero_conta: null,
      token_open_finance: null, ultima_sincronizacao: null, status_sincronizacao: null
    }
  ],
  categorias: [
    { id: 'c0000000-0000-0000-0000-000000000001', usuario_id: null, categoria_pai_id: null, nome: 'Alimentação', tipo: 'despesa', cor: '#FF6B6B', icone: 'utensils',   padrao: true,  pai: null },
    { id: 'c0000000-0000-0000-0000-000000000002', usuario_id: null, categoria_pai_id: null, nome: 'Transporte',  tipo: 'despesa', cor: '#4ECDC4', icone: 'car',        padrao: true,  pai: null },
    { id: 'c0000000-0000-0000-0000-000000000003', usuario_id: null, categoria_pai_id: null, nome: 'Salário',     tipo: 'receita', cor: '#45B7D1', icone: 'briefcase',  padrao: true,  pai: null },
    { id: 'c0000000-0000-0000-0000-000000000004', usuario_id: null, categoria_pai_id: null, nome: 'Lazer',       tipo: 'despesa', cor: '#96CEB4', icone: 'gamepad',    padrao: true,  pai: null },
    { id: 'c0000000-0000-0000-0000-000000000005', usuario_id: null, categoria_pai_id: null, nome: 'Saúde',       tipo: 'despesa', cor: '#FFEAA7', icone: 'heart',      padrao: true,  pai: null },
    { id: 'c0000000-0000-0000-0000-000000000006', usuario_id: 'a0000000-0000-0000-0000-000000000001', categoria_pai_id: 'c0000000-0000-0000-0000-000000000001', nome: 'Restaurante', tipo: 'despesa', cor: '#FF6B6B', icone: 'utensils',  padrao: false, pai: 'c0000000-0000-0000-0000-000000000001' },
    { id: 'c0000000-0000-0000-0000-000000000007', usuario_id: 'a0000000-0000-0000-0000-000000000001', categoria_pai_id: 'c0000000-0000-0000-0000-000000000002', nome: 'Combustível', tipo: 'despesa', cor: '#4ECDC4', icone: 'fuel',      padrao: false, pai: 'c0000000-0000-0000-0000-000000000002' }
  ],
  tags: [
    { id: 'd0000000-0000-0000-0000-000000000001', nome: 'essencial',  cor: '#FF0000' },
    { id: 'd0000000-0000-0000-0000-000000000002', nome: 'parcelado',  cor: '#0000FF' },
    { id: 'd0000000-0000-0000-0000-000000000003', nome: 'recorrente', cor: '#00AA00' }
  ],
  lancamentos: [
    {
      id: '1a000000-0000-0000-0000-000000000001',
      conta_id: 'b0000000-0000-0000-0000-000000000001',
      categoria_id: 'c0000000-0000-0000-0000-000000000003',
      descricao: 'Salário Maio', valor: '6000.00', tipo: 'receita',
      data_lancamento: '2025-05-05', status: 'confirmado', origem: 'manual',
      cat_nome: 'Salário', cat_cor: '#45B7D1', cat_icone: 'briefcase',
      conta_nome: 'Conta Corrente Itaú',
      tags: [{ id: 'd0000000-0000-0000-0000-000000000003', nome: 'recorrente', cor: '#00AA00' }],
      centros: []
    },
    {
      id: '1a000000-0000-0000-0000-000000000002',
      conta_id: 'b0000000-0000-0000-0000-000000000001',
      categoria_id: 'c0000000-0000-0000-0000-000000000006',
      descricao: 'Almoço Executivo', valor: '45.90', tipo: 'despesa',
      data_lancamento: '2025-05-06', status: 'confirmado', origem: 'manual',
      cat_nome: 'Restaurante', cat_cor: '#FF6B6B', cat_icone: 'utensils',
      conta_nome: 'Conta Corrente Itaú',
      tags: [{ id: 'd0000000-0000-0000-0000-000000000001', nome: 'essencial', cor: '#FF0000' }],
      centros: []
    },
    {
      id: '1a000000-0000-0000-0000-000000000003',
      conta_id: 'b0000000-0000-0000-0000-000000000001',
      categoria_id: 'c0000000-0000-0000-0000-000000000007',
      descricao: 'Combustível Maio', valor: '200.00', tipo: 'despesa',
      data_lancamento: '2025-05-07', status: 'confirmado', origem: 'open_finance',
      cat_nome: 'Combustível', cat_cor: '#4ECDC4', cat_icone: 'fuel',
      conta_nome: 'Conta Corrente Itaú',
      fatura_id: 'fa000000-0000-0000-0000-000000000002',
      tags: [],
      centros: [
        { centro_id: 'f0000000-0000-0000-0000-000000000001', centro_nome: 'Carro', centro_tipo: 'veiculo', percentual: '100.00' }
      ]
    },
    {
      id: '1a000000-0000-0000-0000-000000000004',
      conta_id: 'b0000000-0000-0000-0000-000000000002',
      categoria_id: 'c0000000-0000-0000-0000-000000000001',
      descricao: 'Supermercado Semana', valor: '380.00', tipo: 'despesa',
      data_lancamento: '2025-05-08', status: 'confirmado', origem: 'manual',
      cat_nome: 'Alimentação', cat_cor: '#FF6B6B', cat_icone: 'utensils',
      conta_nome: 'Poupança Itaú',
      tags: [],
      centros: []
    }
  ],
  cartoes: [
    {
      id: 'ca000000-0000-0000-0000-000000000001',
      conta_id: 'b0000000-0000-0000-0000-000000000001',
      bandeira: 'Visa', nome: 'Itaú Visa Gold',
      limite: '5000.00', limite_disponivel: '3200.00',
      dia_fechamento: 10, dia_vencimento: 15, ultimos_digitos: '1234',
      titular_nome: 'João Silva',
      faturas: [
        { id: 'fa000000-0000-0000-0000-000000000001', cartao_id: 'ca000000-0000-0000-0000-000000000001', data_fechamento: '2025-04-10', data_vencimento: '2025-04-15', valor_total: '1800.00', status: 'paga', paga: true },
        { id: 'fa000000-0000-0000-0000-000000000002', cartao_id: 'ca000000-0000-0000-0000-000000000001', data_fechamento: '2025-05-10', data_vencimento: '2025-05-15', valor_total: '950.00',  status: 'aberta', paga: false }
      ],
      lancamentos_fatura_aberta: [
        {
          id: '1a000000-0000-0000-0000-000000000003',
          descricao: 'Combustível Maio', valor: '200.00', tipo: 'despesa',
          data_lancamento: '2025-05-07', cat_nome: 'Combustível', cat_cor: '#4ECDC4', cat_icone: 'fuel'
        }
      ]
    }
  ],
  investimentos: [
    {
      id: 'ea000000-0000-0000-0000-000000000001',
      usuario_id: 'a0000000-0000-0000-0000-000000000001',
      conta_id: 'b0000000-0000-0000-0000-000000000001',
      ticker: 'PETR4', nome: 'Petrobras PN', tipo: 'acao', classe: 'renda_variavel',
      moeda: 'BRL', preco_medio: '32.5000', quantidade: '100.000000', valor_atual: '3450.00',
      conta_nome: 'Conta Corrente Itaú',
      operacoes: [
        {
          id: 'op000000-0000-0000-0000-000000000001',
          investimento_id: 'ea000000-0000-0000-0000-000000000001',
          tipo: 'compra', quantidade: '100.000000', preco_unitario: '32.5000',
          valor_total: '3250.00', taxas: '4.90', data_operacao: '2025-03-15'
        }
      ]
    }
  ],
  metas: [
    {
      id: 'da000000-0000-0000-0000-000000000001',
      usuario_id: 'a0000000-0000-0000-0000-000000000001',
      conta_id: 'b0000000-0000-0000-0000-000000000002',
      nome: 'Viagem Europa', valor_alvo: '20000.00', valor_atual: '3500.00',
      data_inicio: '2025-01-01', data_fim: '2025-12-31',
      status: 'ativa', tipo: 'viagem',
      progresso_pct: '17.5', valor_restante: '16500.00',
      conta_nome: 'Poupança Itaú', usuario_nome: 'João Silva'
    }
  ],
  regras: [
    { id: 'rg000000-0000-0000-0000-000000000001', termo_busca: 'RESTAURANTE', tipo: 'contem', ativo: true, prioridade: 1, descricao: '', cat_nome: 'Restaurante', cat_cor: '#FF6B6B', cat_icone: 'utensils' },
    { id: 'rg000000-0000-0000-0000-000000000002', termo_busca: 'POSTO',       tipo: 'contem', ativo: true, prioridade: 2, descricao: '', cat_nome: 'Combustível', cat_cor: '#4ECDC4', cat_icone: 'fuel' }
  ],
  projetos: [
    {
      id: 'e0000000-0000-0000-0000-000000000001',
      usuario_id: 'a0000000-0000-0000-0000-000000000001',
      nome: 'Reforma Cozinha', orcamento: '15000.00', gasto_total: '4200.00',
      data_inicio: '2025-01-01', data_fim: '2025-06-30', status: 'ativo'
    }
  ],
  centros: [
    {
      id: 'f0000000-0000-0000-0000-000000000001',
      usuario_id: 'a0000000-0000-0000-0000-000000000001',
      nome: 'Carro', tipo: 'veiculo', descricao: 'Gastos com combustível, manutenção e IPVA', ativo: true
    }
  ],
  lembretes: [
    {
      id: 'lb000000-0000-0000-0000-000000000001',
      usuario_id: 'a0000000-0000-0000-0000-000000000001',
      lancamento_id: null,
      descricao: 'Pagar fatura do cartão Itaú', valor: '950.00',
      data_vencimento: '2025-05-15', frequencia: 'mensal',
      notificacoes_email: true, notificacoes_push: true, ativo: true
    }
  ],
  compartilhamentos: [
    {
      usuario_titular_id: 'a0000000-0000-0000-0000-000000000001',
      usuario_convidado_id: 'a0000000-0000-0000-0000-000000000002',
      permissao: 'leitura', ativo: true, data_convite: '2025-05-01',
      titular_nome: 'João Silva', convidado_nome: 'Maria Souza'
    }
  ]
};

/**
 * Resolve uma rota de API usando os dados de fallback estáticos.
 * Mapeia cada path para o formato exato que o backend retornaria.
 */
function fallbackResolve(path) {
  // /default-user
  if (path === '/default-user') {
    return FALLBACK_DB.user;
  }

  // /dashboard/:userId
  if (path.startsWith('/dashboard/')) {
    const lancs = FALLBACK_DB.lancamentos;
    const receitas = lancs.filter(l => l.tipo === 'receita' && l.status === 'confirmado').reduce((s, l) => s + parseFloat(l.valor), 0);
    const despesas = lancs.filter(l => l.tipo === 'despesa' && l.status === 'confirmado').reduce((s, l) => s + parseFloat(l.valor), 0);
    const numDespesas = lancs.filter(l => l.tipo === 'despesa' && l.status === 'confirmado').length;
    const saldoTotal = FALLBACK_DB.contas.filter(c => c.ativa).reduce((s, c) => s + parseFloat(c.saldo_atual), 0);
    const totalInvestido = FALLBACK_DB.investimentos.reduce((s, i) => s + parseFloat(i.valor_atual), 0);

    return {
      kpis: {
        saldo_total: saldoTotal,
        total_contas: FALLBACK_DB.contas.filter(c => c.ativa).length,
        receitas: receitas,
        despesas: despesas,
        num_despesas: numDespesas,
        total_investido: totalInvestido
      },
      lancamentos: lancs,
      categorias_chart: [
        { categoria: 'Alimentação', cor: '#FF6B6B', total: '425.90' },
        { categoria: 'Transporte',  cor: '#4ECDC4', total: '200.00' }
      ],
      mensal_chart: [
        { label: 'Abr', mes: '2025-04', receitas: '0', despesas: '1800.00' },
        { label: 'Mai', mes: '2025-05', receitas: '6000.00', despesas: '625.90' }
      ],
      alertas: {
        faturas: [
          { valor_total: '950.00', data_vencimento: '2025-05-15', cartao_nome: 'Itaú Visa Gold' }
        ],
        metas: [
          { nome: 'Viagem Europa', valor_atual: 3500, valor_alvo: 20000, progresso_pct: 17.5 }
        ],
        investimentos: [
          { ticker: 'PETR4', nome: 'Petrobras PN', valor_atual: 3450, preco_medio: 32.50, quantidade: 100, rentabilidade_pct: '6.15' }
        ],
        compartilhamentos: [
          { convidado_nome: 'Maria Souza', permissao: 'leitura', data_convite: '2025-05-01' }
        ]
      }
    };
  }

  // /contas/:userId
  if (path.startsWith('/contas/')) {
    return { contas: FALLBACK_DB.contas };
  }

  // /lancamentos/:userId
  if (path.startsWith('/lancamentos/')) {
    return { lancamentos: FALLBACK_DB.lancamentos };
  }

  // /cartoes/:userId
  if (path.startsWith('/cartoes/')) {
    return { cartoes: FALLBACK_DB.cartoes };
  }

  // /investimentos/:userId
  if (path.startsWith('/investimentos/')) {
    return { investimentos: FALLBACK_DB.investimentos };
  }

  // /metas/:userId
  if (path.startsWith('/metas/')) {
    return { metas: FALLBACK_DB.metas };
  }

  // /categorias/:userId
  if (path.startsWith('/categorias/')) {
    return {
      categorias: FALLBACK_DB.categorias,
      tags: FALLBACK_DB.tags,
      usuario_nome: FALLBACK_DB.user.nome
    };
  }

  // /usuarios/:userId — exibe apenas titular + convidados compartilhados
  if (path.startsWith('/usuarios/')) {
    // Filtrar compartilhamentos onde o titular é o usuário logado
    const userId = path.split('/').pop();
    const compartilhamentos = FALLBACK_DB.compartilhamentos.filter(c => c.usuario_titular_id === userId);
    // Coletar IDs: titular + convidados
    const convidadoIds = compartilhamentos.map(c => c.usuario_convidado_id);
    const allUsers = [FALLBACK_DB.user, FALLBACK_DB.user2]
      .filter(u => u.id === userId || convidadoIds.includes(u.id))
      .map(u => ({ ...u, telefone: u.id === FALLBACK_DB.user.id ? '(11) 99999-0001' : '(11) 99999-0002', data_cadastro: u.id === FALLBACK_DB.user.id ? '2025-01-15' : '2025-02-20', ativo: true }));
    return {
      usuarios: allUsers,
      compartilhamentos: compartilhamentos
    };
  }

  // /regras/:userId
  if (path.startsWith('/regras/')) {
    return {
      regras: FALLBACK_DB.regras,
      projetos: FALLBACK_DB.projetos,
      centros: FALLBACK_DB.centros,
      lembretes: FALLBACK_DB.lembretes,
      lancamentos_centro: [
        {
          centro_id: 'f0000000-0000-0000-0000-000000000001',
          lancamento_id: '1a000000-0000-0000-0000-000000000003',
          percentual: '100.00',
          lanc_descricao: 'Combustível Maio',
          lanc_valor: '200.00'
        }
      ]
    };
  }

  // Fallback genérico
  console.warn('[FinanceDB] Rota de fallback não mapeada:', path);
  return {};
}

/** Mostra loading spinner numa div */
function showLoading(el) {
  if (el) el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;padding:40px;gap:10px;color:var(--t3);font-size:13px">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin">
        <circle cx="12" cy="12" r="10" stroke-dasharray="50" stroke-dashoffset="10"/>
      </svg>
      Carregando dados do banco...
    </div>`;
}

/** Mostra erro numa div */
function showError(el, msg) {
  if (el) el.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;padding:20px;color:var(--rose);font-size:13px;background:rgba(244,63,94,0.08);border-radius:10px;border:1px solid rgba(244,63,94,0.2)">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
      ${msg || 'Erro ao carregar dados. Verifique se o servidor backend está rodando.'}
    </div>`;
}

// ────────────────────────────────────────────────────────────
//  ICON SYSTEM — SVG inline, sem dependência de emoji do SO
// ────────────────────────────────────────────────────────────

function iconSvg(name, size = 16, color = 'currentColor') {
  const wrap = d =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

  const p = {
    utensils:      `<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2"/><line x1="7" y1="2" x2="7" y2="22"/><path d="M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3v7"/>`,
    car:           `<path d="M5 17H3a2 2 0 01-2-2V9l2.5-5h13l2.5 5v6a2 2 0 01-2 2h-2"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="17.5" r="2.5"/>`,
    briefcase:     `<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>`,
    gamepad:       `<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h4M8 10v4"/><circle cx="15" cy="12" r="1"/><circle cx="18" cy="10" r="1"/>`,
    heart:         `<path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>`,
    fuel:          `<path d="M3 22V4a2 2 0 012-2h8a2 2 0 012 2v14h2a2 2 0 002-2v-5l-3-3"/><path d="M3 11h12M7 22V13"/>`,
    bank:          `<line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7 12 2"/>`,
    piggyBank:     `<path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.9-1-2.5V5z"/><path d="M2 9v1a2 2 0 002 2"/>`,
    wallet:        `<path d="M21 12V7a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-5"/><path d="M21 12a2 2 0 00-2-2h-4a2 2 0 100 4h4a2 2 0 002-2z"/>`,
    bitcoin:       `<path d="M9.5 2h5a3.5 3.5 0 010 7H9.5V2zm0 7h5.5a3.5 3.5 0 010 7H9.5V9z"/><line x1="6" y1="2" x2="6" y2="22"/><line x1="12" y1="2" x2="12" y2="0"/><line x1="12" y1="24" x2="12" y2="22"/>`,
    globe:         `<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>`,
    clipboard:     `<path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/>`,
    plane:         `<path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>`,
    house:         `<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>`,
    shield:        `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>`,
    target:        `<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>`,
    trendingUp:    `<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>`,
    dollarSign:    `<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>`,
    sparkles:      `<path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/><path d="M5 3l.75 2.25L8 6l-2.25.75L5 9l-.75-2.25L2 6l2.25-.75L5 3z"/><path d="M19 12l.75 2.25L22 15l-2.25.75L19 18l-.75-2.25L16 15l2.25-.75L19 12z"/>`,
    barChart:      `<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>`,
    lock:          `<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>`,
    unlock:        `<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 019.9-1"/>`,
    checkCircle:   `<path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>`,
    xCircle:       `<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>`,
    alertTriangle: `<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>`,
    refresh:       `<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>`,
    pencil:        `<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>`,
    smartphone:    `<rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>`,
    messageCircle: `<path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>`,
    folderOpen:    `<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>`,
    mail:          `<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>`,
    building:      `<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><line x1="8" y1="7" x2="8" y2="7"/><line x1="16" y1="7" x2="16" y2="7"/><line x1="8" y1="12" x2="8" y2="12"/><line x1="16" y1="12" x2="16" y2="12"/><line x1="8" y1="17" x2="10" y2="17"/><line x1="16" y1="17" x2="14" y2="17"/>`,
    folder:        `<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>`,
    database:      `<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>`,
  };

  return wrap(p[name] || p.target);
}

// ────────────────────────────────────────────────────────────
//  TROCA DE CONTA (USER SWITCHER)
// ────────────────────────────────────────────────────────────

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #10d9a0, #6366f1)',
  'linear-gradient(135deg, #f59e0b, #f43f5e)',
  'linear-gradient(135deg, #38bdf8, #a855f7)',
  'linear-gradient(135deg, #6366f1, #ec4899)',
  'linear-gradient(135deg, #14b8a6, #3b82f6)',
  'linear-gradient(135deg, #f97316, #eab308)',
];

function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

/** Carrega todos os usuários e popula o dropdown */
async function loadAllUsers() {
  try {
    const data = await apiFetch('/users');
    ALL_USERS = data.users || [];
  } catch (err) {
    // Fallback: só o usuário atual + user2 do FALLBACK_DB
    ALL_USERS = [FALLBACK_DB.user, FALLBACK_DB.user2];
  }
  renderUserSwitchList();
}

/** Renderiza a lista de usuários no dropdown */
function renderUserSwitchList() {
  const list = $('user-switch-list');
  if (!list) return;

  if (ALL_USERS.length === 0) {
    list.innerHTML = '<div style="padding:16px;text-align:center;font-size:12px;color:var(--t3)">Nenhum usuário encontrado.</div>';
    return;
  }

  list.innerHTML = ALL_USERS.map((u, i) => {
    const isActive = u.id === APP_USER_ID;
    const gradient = AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length];
    const planColor = u.plano === 'pro' ? 'background:rgba(16,217,160,0.15);color:var(--green);border:1px solid rgba(16,217,160,0.25)'
                   : u.plano === 'premium' ? 'background:rgba(168,85,247,0.15);color:var(--purple);border:1px solid rgba(168,85,247,0.25)'
                   : 'background:var(--surface3);color:var(--t2);border:1px solid var(--border)';
    return `
      <div class="user-switch-item${isActive ? ' active' : ''}" data-user-id="${u.id}">
        <div class="user-switch-avatar" style="background:${gradient}">${getInitials(u.nome)}</div>
        <div class="user-switch-info">
          <span class="user-switch-name">${u.nome}</span>
          <span class="user-switch-email">${u.email}</span>
        </div>
        <span class="user-switch-plan" style="${planColor}">${(u.plano || 'free').toUpperCase()}</span>
      </div>`;
  }).join('');

  // Event listeners nos itens
  list.querySelectorAll('.user-switch-item').forEach(item => {
    item.addEventListener('click', () => {
      const userId = item.dataset.userId;
      if (userId !== APP_USER_ID) {
        switchToUser(userId);
      }
    });
  });
}

/** Abre/fecha o dropdown */
function toggleUserSwitcher() {
  const dropdown = $('user-switch-dropdown');
  if (!dropdown) return;
  dropdown.classList.toggle('open');
}

/** Troca para outro usuário e recarrega todos os dados */
function switchToUser(userId) {
  const user = ALL_USERS.find(u => u.id === userId);
  if (!user) return;

  APP_USER_ID = user.id;
  APP_USER = user;

  // Atualizar sidebar
  updateSidebarUser(user);

  // Fechar dropdown e re-renderizar lista
  const dropdown = $('user-switch-dropdown');
  if (dropdown) dropdown.classList.remove('open');
  renderUserSwitchList();

  // Recarregar a página atual com dados do novo usuário
  renderPage(currentPage);
}

/** Atualiza os elementos visuais do usuário na sidebar */
function updateSidebarUser(user) {
  const userName = document.querySelector('.user-name');
  const userPlan = document.querySelector('.user-plan');
  const userAvatar = document.querySelector('.user-avatar');
  if (userName) userName.textContent = user.nome;
  if (userPlan) userPlan.textContent = (user.plano || 'FREE').toUpperCase();
  if (userAvatar) userAvatar.textContent = getInitials(user.nome);
}

// ────────────────────────────────────────────────────────────
//  NAVEGAÇÃO
// ────────────────────────────────────────────────────────────

const pageInfo = {
  dashboard:     { title: 'Dashboard',          subtitle: 'Visão geral das suas finanças' },
  contas:        { title: 'Contas',             subtitle: 'Contas bancárias e digitais — tabela: conta + conta_bancaria' },
  lancamentos:   { title: 'Lançamentos',        subtitle: 'Movimentações financeiras — tabela: lancamento + lancamento_tag + lancamento_centro' },
  cartoes:       { title: 'Cartões de Crédito', subtitle: 'Cartões e faturas mensais — tabela: cartao_credito + fatura' },
  investimentos: { title: 'Investimentos',      subtitle: 'Carteira de ativos — tabela: investimento + operacao_investimento' },
  metas:         { title: 'Metas Financeiras',  subtitle: 'Objetivos e progresso — tabela: meta' },
  categorias:    { title: 'Categorias & Tags',  subtitle: 'Classificação hierárquica — tabela: categoria + tag' },
  usuarios:      { title: 'Usuários',           subtitle: 'Perfis e compartilhamento — tabela: usuario + usuario_adicional' },
  regras:        { title: 'Regras & Projetos',  subtitle: 'Automação e organização — tabela: regra_classificacao + projeto + centro + lembrete' },
  'admin-db':    { title: 'Banco de Dados',     subtitle: 'Painel Administrativo — DML · DDL · DCL · TCL' },
  'admin-users': { title: 'Dados de Usuários',  subtitle: 'Painel Administrativo — Gerenciamento de Usuários' }
};

let currentPage = 'dashboard';
let charts = {};

function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const el = $('page-' + page);
  const nav = $('nav-' + page);
  if (el) el.classList.add('active');
  if (nav) nav.classList.add('active');

  const info = pageInfo[page] || {};
  $('page-title').textContent    = info.title    || page;
  $('page-subtitle').textContent = info.subtitle || '';

  currentPage = page;
  renderPage(page);
}

// ────────────────────────────────────────────────────────────
//  RENDER ROUTER — cada página busca dados frescos da API
// ────────────────────────────────────────────────────────────

function renderPage(page) {
  // Páginas admin requerem autenticação
  if (page === 'admin-db') {
    if (typeof AdminAuth !== 'undefined') {
      AdminAuth.requireAuth(() => {
        if (typeof AdminDB !== 'undefined') AdminDB.render();
      });
    }
    return;
  }
  if (page === 'admin-users') {
    if (typeof AdminAuth !== 'undefined') {
      AdminAuth.requireAuth(() => {
        if (typeof AdminUsers !== 'undefined') AdminUsers.render();
      });
    }
    return;
  }

  // Páginas públicas — sempre re-render com dados frescos
  switch(page) {
    case 'dashboard':     renderDashboard();     break;
    case 'contas':        renderContas();        break;
    case 'lancamentos':   renderLancamentos();   break;
    case 'cartoes':       renderCartoes();       break;
    case 'investimentos': renderInvestimentos(); break;
    case 'metas':         renderMetas();         break;
    case 'categorias':    renderCategorias();    break;
    case 'usuarios':      renderUsuarios();      break;
    case 'regras':        renderRegras();        break;
  }
}

// ────────────────────────────────────────────────────────────
//  DASHBOARD
// ────────────────────────────────────────────────────────────

async function renderDashboard() {
  if (!APP_USER_ID) return;
  try {
    const data = await apiFetch(`/dashboard/${APP_USER_ID}`);
    renderDashboardKPIs(data.kpis);
    renderRecentLancamentos(data.lancamentos);
    renderDashboardAlertas(data.alertas);
    setTimeout(() => {
      renderChartMensal(data.mensal_chart);
      renderChartCategorias(data.categorias_chart);
    }, 50);
  } catch (err) {
    console.error('Dashboard error:', err);
  }
}

function renderDashboardKPIs(kpis) {
  const grid = document.querySelector('#page-dashboard .kpi-grid');
  if (!grid) return;

  grid.innerHTML = `
    <div class="kpi-card" style="--accent:#10d9a0">
      <div class="kpi-left">
        <span class="kpi-label">Saldo Total</span>
        <span class="kpi-value">${fmt(kpis.saldo_total)}</span>
        <span class="kpi-sub">${kpis.total_contas} conta(s) ativa(s)</span>
      </div>
      <div class="kpi-icon-wrap" style="background:rgba(16,217,160,.12)">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10d9a0" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
      </div>
    </div>
    <div class="kpi-card" style="--accent:#6366f1">
      <div class="kpi-left">
        <span class="kpi-label">Receitas</span>
        <span class="kpi-value">${fmt(kpis.receitas)}</span>
        <span class="kpi-sub kpi-up">↑ confirmadas</span>
      </div>
      <div class="kpi-icon-wrap" style="background:rgba(99,102,241,.12)">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
      </div>
    </div>
    <div class="kpi-card" style="--accent:#f43f5e">
      <div class="kpi-left">
        <span class="kpi-label">Despesas</span>
        <span class="kpi-value">${fmt(kpis.despesas)}</span>
        <span class="kpi-sub">${kpis.num_despesas} lançamento(s)</span>
      </div>
      <div class="kpi-icon-wrap" style="background:rgba(244,63,94,.12)">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
      </div>
    </div>
    <div class="kpi-card" style="--accent:#f59e0b">
      <div class="kpi-left">
        <span class="kpi-label">Carteira de Ativos</span>
        <span class="kpi-value">${fmt(kpis.total_investido)}</span>
        <span class="kpi-sub">investimentos</span>
      </div>
      <div class="kpi-icon-wrap" style="background:rgba(245,158,11,.12)">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
      </div>
    </div>`;
}

function renderRecentLancamentos(lancamentos) {
  const el = $('recent-lancamentos');
  if (!el) return;

  if (!lancamentos || lancamentos.length === 0) {
    el.innerHTML = '<div class="text-muted" style="font-size:13px;padding:12px">Nenhum lançamento encontrado.</div>';
    return;
  }

  el.innerHTML = lancamentos.map(l => {
    const isRec = l.tipo === 'receita';
    return `
      <div class="recent-item">
        <div class="recent-icon" style="background:${l.cat_cor ? l.cat_cor + '22' : '#ffffff11'}">
          ${l.cat_icone ? iconSvg(l.cat_icone, 18, l.cat_cor) : iconSvg('dollarSign', 18, '#10d9a0')}
        </div>
        <div class="recent-info">
          <div class="recent-desc">${l.descricao}</div>
          <div class="recent-cat">${l.cat_nome || '—'} · ${l.conta_nome || '—'} · ${fmtDate(l.data_lancamento)}</div>
        </div>
        <span class="recent-val ${isRec ? 'val-pos' : 'val-neg'}">
          ${isRec ? '+' : '−'}${fmt(l.valor)}
        </span>
      </div>`;
  }).join('');
}

function renderDashboardAlertas(alertas) {
  const el = document.querySelector('#page-dashboard .alerts-list');
  if (!el) return;

  let html = '';

  // Faturas pendentes
  if (alertas.faturas && alertas.faturas.length > 0) {
    alertas.faturas.forEach(f => {
      html += `
        <div class="alert-item alert-warn">
          <div class="alert-icon-wrap" style="background:rgba(245,158,11,.15)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
          </div>
          <div class="alert-content">
            <span class="alert-title">Fatura aberta — ${f.cartao_nome}</span>
            <span class="alert-sub">Vence ${fmtDate(f.data_vencimento)} · ${fmt(f.valor_total)}</span>
          </div>
          <span class="badge badge-warn">Urgente</span>
        </div>`;
    });
  }

  // Metas
  if (alertas.metas && alertas.metas.length > 0) {
    alertas.metas.forEach(m => {
      html += `
        <div class="alert-item alert-info">
          <div class="alert-icon-wrap" style="background:rgba(99,102,241,.15)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
          </div>
          <div class="alert-content">
            <span class="alert-title">Meta: ${m.nome}</span>
            <span class="alert-sub">${m.progresso_pct || 0}% concluída · ${fmt(m.valor_alvo - m.valor_atual)} restantes</span>
          </div>
          <span class="badge badge-purple">Meta</span>
        </div>`;
    });
  }

  // Investimentos
  if (alertas.investimentos && alertas.investimentos.length > 0) {
    alertas.investimentos.forEach(i => {
      const pct = parseFloat(i.rentabilidade_pct) || 0;
      html += `
        <div class="alert-item ${pct >= 0 ? 'alert-success' : 'alert-warn'}">
          <div class="alert-icon-wrap" style="background:rgba(16,217,160,.15)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10d9a0" stroke-width="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/></svg>
          </div>
          <div class="alert-content">
            <span class="alert-title">${i.ticker} ${pct >= 0 ? 'em alta' : 'em baixa'}</span>
            <span class="alert-sub">${fmt(i.valor_atual)} · ${pct >= 0 ? '+' : ''}${pct}% vs preço médio</span>
          </div>
          <span class="badge ${pct >= 0 ? 'badge-success' : 'badge-rose'}">${pct >= 0 ? '+' : ''}${pct}%</span>
        </div>`;
    });
  }

  // Compartilhamentos
  if (alertas.compartilhamentos && alertas.compartilhamentos.length > 0) {
    alertas.compartilhamentos.forEach(s => {
      html += `
        <div class="alert-item alert-info">
          <div class="alert-icon-wrap" style="background:rgba(99,102,241,.15)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          </div>
          <div class="alert-content">
            <span class="alert-title">${s.convidado_nome} tem acesso</span>
            <span class="alert-sub">Permissão: ${s.permissao} · desde ${fmtDate(s.data_convite)}</span>
          </div>
          <span class="badge badge-info">Compartilhado</span>
        </div>`;
    });
  }

  if (!html) {
    html = '<div class="text-muted" style="font-size:13px;padding:12px">Nenhum alerta no momento.</div>';
  }

  el.innerHTML = html;
}

function renderChartMensal(data) {
  const ctx = $('chart-mensal');
  if (!ctx) return;
  if (charts.mensal) charts.mensal.destroy();

  const labels = data.map(d => d.label);
  const receitas = data.map(d => parseFloat(d.receitas));
  const despesas = data.map(d => parseFloat(d.despesas));

  charts.mensal = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Receitas',
          data: receitas,
          backgroundColor: 'rgba(16,217,160,0.25)',
          borderColor: '#10d9a0',
          borderWidth: 2, borderRadius: 6
        },
        {
          label: 'Despesas',
          data: despesas,
          backgroundColor: 'rgba(244,63,94,0.18)',
          borderColor: '#f43f5e',
          borderWidth: 2, borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#94a3b8', font: { size: 11, family: 'Inter' } } } },
      scales: {
        x: { grid: { color: 'rgba(99,118,180,0.08)' }, ticks: { color: '#94a3b8', font: { family: 'Inter', size: 11 } } },
        y: { grid: { color: 'rgba(99,118,180,0.08)' }, ticks: { color: '#94a3b8', font: { family: 'Inter', size: 11 }, callback: v => 'R$' + (v/1000).toFixed(0) + 'k' } }
      }
    }
  });
}

function renderChartCategorias(data) {
  const ctx = $('chart-categorias');
  if (!ctx) return;
  if (charts.categorias) charts.categorias.destroy();

  if (!data || data.length === 0) return;

  const labels = data.map(d => d.categoria);
  const values = data.map(d => parseFloat(d.total));
  const colors = data.map(d => d.cor);

  charts.categorias = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data: values, backgroundColor: colors.map(c => c + 'cc'), borderColor: colors, borderWidth: 2 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 11, family: 'Inter' }, padding: 12 } }
      }
    }
  });
}

// ────────────────────────────────────────────────────────────
//  CONTAS
// ────────────────────────────────────────────────────────────

async function renderContas() {
  if (!APP_USER_ID) return;
  const grid = $('accounts-grid');
  const detalhe = $('conta-bancaria-detail');

  try {
    const data = await apiFetch(`/contas/${APP_USER_ID}`);
    const contas = data.contas;

    const tipoIcon = { corrente: 'bank', poupanca: 'piggyBank', carteira: 'wallet', cripto: 'bitcoin', exterior: 'globe', outro: 'clipboard' };

    if (grid) {
      grid.innerHTML = contas.map(c => {
        const variacao = parseFloat(c.saldo_atual) - parseFloat(c.saldo_inicial);
        const varPct = ((variacao / parseFloat(c.saldo_inicial)) * 100).toFixed(2);
        return `
          <div class="account-card">
            <div class="account-card-top">
              <div class="account-type-icon">${iconSvg(tipoIcon[c.tipo] || 'clipboard', 24, '#10d9a0')}</div>
              <div>
                <div class="account-name">${c.nome}</div>
                <div class="account-inst">${c.instituicao || '—'}</div>
                <span class="badge ${c.tipo === 'corrente' ? 'badge-success' : 'badge-info'}" style="margin-top:6px">
                  ${c.tipo.charAt(0).toUpperCase() + c.tipo.slice(1)}
                </span>
              </div>
            </div>
            <div class="account-balance-label">Saldo Atual</div>
            <div class="account-balance">${fmt(c.saldo_atual)}</div>
            <div class="account-currency" style="display:inline-flex;align-items:center;gap:5px">
              ${c.moeda} ·
              ${c.sincronizada ? iconSvg('refresh', 13, '#10d9a0') + ' Open Finance ativo' : iconSvg('clipboard', 13, '#94a3b8') + ' Manual'}
            </div>
            <hr class="account-divider">
            <div class="account-meta">
              <div class="account-meta-item">
                <span class="account-meta-label">Saldo Inicial</span>
                <span class="account-meta-val">${fmt(c.saldo_inicial)}</span>
              </div>
              <div class="account-meta-item">
                <span class="account-meta-label">Variação</span>
                <span class="account-meta-val ${variacao >= 0 ? 'text-green' : 'text-rose'}">
                  ${variacao >= 0 ? '+' : ''}${fmt(variacao)} (${varPct}%)
                </span>
              </div>
              <div class="account-meta-item">
                <span class="account-meta-label">Status</span>
                <span class="account-meta-val" style="display:inline-flex;align-items:center;gap:5px">
                  ${c.ativa ? iconSvg('checkCircle', 14, '#10d9a0') + '<span>Ativa</span>' : iconSvg('xCircle', 14, '#f43f5e') + '<span>Inativa</span>'}
                </span>
              </div>
            </div>
          </div>`;
      }).join('');
    }

    // Conta bancária detail — primeiro que tiver dados de Open Finance
    const cb = contas.find(c => c.banco_codigo);
    if (detalhe && cb) {
      detalhe.innerHTML = `
        <div class="bancaria-grid">
          <div class="bancaria-item"><span class="bancaria-label">Banco (BACEN)</span><span class="bancaria-val">${cb.banco_codigo} — ${cb.nome}</span></div>
          <div class="bancaria-item"><span class="bancaria-label">Agência</span><span class="bancaria-val">${cb.agencia || '—'}</span></div>
          <div class="bancaria-item"><span class="bancaria-label">Conta</span><span class="bancaria-val">${cb.numero_conta || '—'}</span></div>
          <div class="bancaria-item"><span class="bancaria-label">Status Sincronização</span><span class="badge badge-success" style="display:inline-flex;align-items:center;gap:4px">${iconSvg('checkCircle', 11, '#10d9a0')} ${cb.status_sincronizacao || '—'}</span></div>
          <div class="bancaria-item" style="grid-column:span 2"><span class="bancaria-label">Última Sincronização</span><span class="bancaria-val">${cb.ultima_sincronizacao || '—'}</span></div>
          <div class="bancaria-item" style="grid-column:span 2"><span class="bancaria-label">Token Open Finance (mascarado)</span><span class="bancaria-val font-mono" style="font-size:11px;color:#475569">eyJhbGci...██████████</span></div>
        </div>`;
    } else if (detalhe) {
      detalhe.innerHTML = '<div class="text-muted" style="font-size:13px;padding:12px">Nenhuma conta bancária com dados Open Finance.</div>';
    }
  } catch (err) {
    showError(grid, 'Erro ao carregar contas.');
  }
}

// ────────────────────────────────────────────────────────────
//  LANÇAMENTOS
// ────────────────────────────────────────────────────────────

let lancamentosData = null;

async function renderLancamentos() {
  if (!APP_USER_ID) return;
  try {
    const data = await apiFetch(`/lancamentos/${APP_USER_ID}`);
    lancamentosData = data.lancamentos;
    renderLancamentosTable('todos');

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
      // Remove old listeners by cloning
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      newBtn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        newBtn.classList.add('active');
        renderLancamentosTable(newBtn.dataset.filter);
      });
    });

    renderCentroRateio(lancamentosData);
  } catch (err) {
    showError($('lancamentos-tbody')?.parentElement, 'Erro ao carregar lançamentos.');
  }
}

function renderLancamentosTable(filter) {
  const tbody = $('lancamentos-tbody');
  if (!tbody || !lancamentosData) return;

  let items = lancamentosData;
  if (filter === 'receita') items = items.filter(l => l.tipo === 'receita');
  if (filter === 'despesa') items = items.filter(l => l.tipo === 'despesa');

  const receita = items.filter(l => l.tipo === 'receita').reduce((s, l) => s + parseFloat(l.valor), 0);
  const despesa = items.filter(l => l.tipo === 'despesa').reduce((s, l) => s + parseFloat(l.valor), 0);

  const stats = $('filter-stats');
  if (stats) {
    stats.innerHTML = `
      <span class="text-green">↑ ${fmt(receita)}</span> &nbsp;
      <span class="text-rose">↓ ${fmt(despesa)}</span> &nbsp;
      <span class="text-muted">Saldo: </span>
      <span class="${receita - despesa >= 0 ? 'text-green' : 'text-rose'}">${fmt(receita - despesa)}</span>`;
  }

  const originIcon = {
    manual:       iconSvg('pencil',        13, '#94a3b8'),
    open_finance: iconSvg('refresh',       13, '#10d9a0'),
    sms:          iconSvg('smartphone',    13, '#6366f1'),
    whatsapp:     iconSvg('messageCircle', 13, '#10d9a0'),
    importacao:   iconSvg('folderOpen',    13, '#f59e0b')
  };

  tbody.innerHTML = items.map(l => {
    const isRec = l.tipo === 'receita';
    const tagHtml = (l.tags || []).map(t => `
      <span class="tag-chip" style="background:${t.cor}22;color:${t.cor};border:1px solid ${t.cor}44">${t.nome}</span>
    `).join('');

    return `
      <tr>
        <td class="text-muted">${fmtDate(l.data_lancamento)}</td>
        <td class="td-bold">${l.descricao}</td>
        <td>
          ${l.cat_nome ? `<span style="display:inline-flex;align-items:center;gap:6px">
            <span style="width:8px;height:8px;background:${l.cat_cor};border-radius:50%;display:inline-block"></span>
            ${l.cat_nome}
          </span>` : '—'}
        </td>
        <td>${tagHtml || '<span class="text-muted">—</span>'}</td>
        <td class="text-muted">${l.conta_nome || '—'}</td>
        <td>
          <span class="origin-badge">${originIcon[l.origem] || ''} ${l.origem}</span>
        </td>
        <td class="${isRec ? 'val-pos' : 'val-neg'}" style="font-weight:700;white-space:nowrap">
          ${isRec ? '+' : '−'}${fmt(l.valor)}
        </td>
        <td>
          <span class="badge status-${l.status}">${l.status}</span>
        </td>
      </tr>`;
  }).join('');
}

function renderCentroRateio(lancamentos) {
  const el = $('centro-rateio');
  if (!el) return;

  const comCentro = (lancamentos || []).filter(l => l.centros && l.centros.length > 0);
  if (comCentro.length === 0) {
    el.innerHTML = '<div class="text-muted" style="font-size:13px;padding:12px">Nenhum rateio registrado.</div>';
    return;
  }

  el.innerHTML = comCentro.flatMap(l =>
    l.centros.map(c => `
      <div class="rateio-item">
        <div>
          <div style="font-size:13px;font-weight:600;color:var(--t1)">${l.descricao}</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px">
            Centro: <strong style="color:var(--amber)">${c.centro_nome}</strong> · 
            Valor: ${fmt(parseFloat(l.valor) * parseFloat(c.percentual) / 100)}
          </div>
        </div>
        <div class="rateio-bar"><div class="rateio-fill" style="width:${c.percentual}%"></div></div>
        <div style="font-size:14px;font-weight:800;color:var(--amber);white-space:nowrap">${c.percentual}%</div>
      </div>`)
  ).join('');
}

// ────────────────────────────────────────────────────────────
//  CARTÕES
// ────────────────────────────────────────────────────────────

async function renderCartoes() {
  if (!APP_USER_ID) return;
  const el = $('cartoes-content');
  if (!el) return;

  try {
    const data = await apiFetch(`/cartoes/${APP_USER_ID}`);
    const cartoes = data.cartoes;
    if (!cartoes || cartoes.length === 0) {
      el.innerHTML = '<div class="text-muted" style="font-size:13px;padding:12px">Nenhum cartão encontrado.</div>';
      return;
    }

    const c = cartoes[0]; // Primeiro cartão
    const statusBadge = { paga: 'badge-success', aberta: 'badge-warn', fechada: 'badge-info', vencida: 'badge-rose' };
    const statusLabel = {
      paga:    iconSvg('checkCircle',   13, '#10d9a0') + ' Paga',
      aberta:  iconSvg('unlock',        13, '#f59e0b') + ' Aberta',
      fechada: iconSvg('lock',          13, '#38bdf8') + ' Fechada',
      vencida: iconSvg('alertTriangle', 13, '#f43f5e') + ' Vencida'
    };

    const faturas = c.faturas || [];
    const lancFatura = c.lancamentos_fatura_aberta || [];
    const limite = parseFloat(c.limite) || 0;
    const limiteDisp = parseFloat(c.limite_disponivel) || 0;
    const usado = limite - limiteDisp;
    const usoPct = limite > 0 ? (usado / limite * 100).toFixed(1) : 0;
    const titularNome = (c.titular_nome || 'TITULAR').toUpperCase();

    el.innerHTML = `
    <div style="display:flex;gap:28px;align-items:flex-start;flex-wrap:wrap">
      <div>
        <div class="card-visual">
          <div class="card-chip"></div>
          <div class="card-number">•••• •••• •••• ${c.ultimos_digitos || '****'}</div>
          <div class="card-bottom">
            <div>
              <div class="card-holder-label">Titular</div>
              <div class="card-holder-name">${titularNome}</div>
            </div>
            <div class="card-bandeira">${(c.bandeira || 'CARD').toUpperCase()}</div>
          </div>
        </div>
        <div class="card-info-row">
          <div class="card-info-item"><span class="card-info-label">Limite Total</span><span class="card-info-val">${fmt(limite)}</span></div>
          <div class="card-info-item"><span class="card-info-label">Disponível</span><span class="card-info-val text-green">${fmt(limiteDisp)}</span></div>
          <div class="card-info-item"><span class="card-info-label">Utilizado</span><span class="card-info-val text-rose">${fmt(usado)}</span></div>
          <div class="card-info-item"><span class="card-info-label">Fecha Dia</span><span class="card-info-val">${c.dia_fechamento}</span></div>
          <div class="card-info-item"><span class="card-info-label">Vence Dia</span><span class="card-info-val">${c.dia_vencimento}</span></div>
          <div class="card-info-item"><span class="card-info-label">Bandeira</span><span class="card-info-val">${c.bandeira}</span></div>
        </div>
      </div>
      <div style="flex:1;min-width:280px">
        <div class="section-card">
          <div class="section-header"><h3>Faturas</h3><span class="badge badge-info">${faturas.length} fatura(s)</span></div>
          <div class="fatura-row">
            ${faturas.map(f => `
              <div class="fatura-item">
                <div>
                  <div class="fatura-cycle">Ciclo: ${fmtDate(f.data_fechamento)} → ${fmtDate(f.data_vencimento)}</div>
                  <div class="fatura-dates">Fecha: ${fmtDate(f.data_fechamento)} · Vence: ${fmtDate(f.data_vencimento)}</div>
                </div>
                <div class="fatura-val">${fmt(f.valor_total)}</div>
                <span class="badge ${statusBadge[f.status] || 'badge-neutral'}">${statusLabel[f.status] || f.status}</span>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="section-card" style="margin-top:16px">
          <div class="section-header"><h3>Lançamentos na Fatura Aberta</h3></div>
          ${lancFatura.length ? lancFatura.map(l => `
            <div class="lanc-fatura-item">
              <span style="display:flex;align-items:center">${l.cat_icone ? iconSvg(l.cat_icone, 18, l.cat_cor) : iconSvg('dollarSign', 18, '#94a3b8')}</span>
              <div style="flex:1">
                <div style="font-size:13px;font-weight:600;color:var(--t1)">${l.descricao}</div>
                <div style="font-size:11px;color:var(--t3)">${fmtDate(l.data_lancamento)} · ${l.cat_nome || '—'}</div>
              </div>
              <span style="font-weight:700;color:var(--rose)">${fmt(l.valor)}</span>
            </div>`).join('') : '<div class="text-muted" style="font-size:13px;padding:8px">Nenhum lançamento na fatura aberta.</div>'}
        </div>
      </div>
    </div>
    <div class="section-card" style="margin-top:20px">
      <div class="section-header"><h3>Utilização do Limite</h3></div>
      <div style="display:flex;align-items:center;gap:14px">
        <div style="flex:1">
          <div class="progress-bar" style="height:12px">
            <div class="progress-fill" style="width:${usoPct}%;background:linear-gradient(90deg,#f59e0b,#f43f5e)"></div>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:6px">
            <span style="font-size:11px;color:var(--t3)">Utilizado: ${fmt(usado)}</span>
            <span style="font-size:11px;color:var(--t3)">${usoPct}% do limite</span>
          </div>
        </div>
        <span style="font-size:20px;font-weight:800;color:var(--amber);white-space:nowrap">${fmt(limite)}</span>
      </div>
    </div>`;
  } catch (err) {
    showError(el, 'Erro ao carregar cartões.');
  }
}

// ────────────────────────────────────────────────────────────
//  INVESTIMENTOS
// ────────────────────────────────────────────────────────────

async function renderInvestimentos() {
  if (!APP_USER_ID) return;
  try {
    const data = await apiFetch(`/investimentos/${APP_USER_ID}`);
    const investimentos = data.investimentos;

    if (!investimentos || investimentos.length === 0) {
      const kpiEl = $('invest-kpi');
      if (kpiEl) kpiEl.innerHTML = '<div class="text-muted" style="padding:12px">Nenhum investimento encontrado.</div>';
      return;
    }

    // Calcular totais
    let totalMercado = 0, totalInvestido = 0, totalLucro = 0;
    investimentos.forEach(inv => {
      const custo = parseFloat(inv.preco_medio) * parseFloat(inv.quantidade);
      totalMercado += parseFloat(inv.valor_atual);
      totalInvestido += custo;
      totalLucro += parseFloat(inv.valor_atual) - custo;
    });
    const totalTaxas = investimentos.reduce((s, inv) => s + (inv.operacoes || []).reduce((ss, op) => ss + parseFloat(op.taxas || 0), 0), 0);
    const pctTotal = totalInvestido > 0 ? ((totalLucro / totalInvestido) * 100).toFixed(2) : '0.00';

    // KPIs
    const kpiEl = $('invest-kpi');
    if (kpiEl) {
      kpiEl.innerHTML = `
        <div class="kpi-card" style="--accent:#f59e0b">
          <div class="kpi-left">
            <span class="kpi-label">Valor de Mercado</span>
            <span class="kpi-value">${fmt(totalMercado)}</span>
            <span class="kpi-sub">${investimentos.length} ativo(s)</span>
          </div>
          <div class="kpi-icon-wrap" style="background:rgba(245,158,11,.12)">${iconSvg('trendingUp', 22, '#f59e0b')}</div>
        </div>
        <div class="kpi-card" style="--accent:#6366f1">
          <div class="kpi-left">
            <span class="kpi-label">Valor Investido</span>
            <span class="kpi-value">${fmt(totalInvestido)}</span>
            <span class="kpi-sub">+ ${fmt(totalTaxas)} em taxas</span>
          </div>
          <div class="kpi-icon-wrap" style="background:rgba(99,102,241,.12)">${iconSvg('briefcase', 22, '#6366f1')}</div>
        </div>
        <div class="kpi-card" style="--accent:#10d9a0">
          <div class="kpi-left">
            <span class="kpi-label">Lucro / Prejuízo</span>
            <span class="kpi-value ${totalLucro >= 0 ? 'text-green' : 'text-rose'}">${totalLucro >= 0 ? '+' : ''}${fmt(totalLucro)}</span>
            <span class="kpi-sub ${totalLucro >= 0 ? 'kpi-up' : ''}">${totalLucro >= 0 ? '↑' : '↓'} ${pctTotal}% de rentabilidade</span>
          </div>
          <div class="kpi-icon-wrap" style="background:rgba(16,217,160,.12)">${iconSvg('sparkles', 22, '#10d9a0')}</div>
        </div>
        <div class="kpi-card" style="--accent:#38bdf8">
          <div class="kpi-left">
            <span class="kpi-label">Preço Médio (primeiro)</span>
            <span class="kpi-value">R$ ${parseFloat(investimentos[0].preco_medio).toFixed(2)}</span>
            <span class="kpi-sub">Preço atual: R$ ${(parseFloat(investimentos[0].valor_atual) / parseFloat(investimentos[0].quantidade)).toFixed(2)}</span>
          </div>
          <div class="kpi-icon-wrap" style="background:rgba(56,189,248,.12)">${iconSvg('barChart', 22, '#38bdf8')}</div>
        </div>`;
    }

    // Table
    const tblEl = $('invest-table-wrap');
    if (tblEl) {
      tblEl.innerHTML = investimentos.map(inv => {
        const custo = parseFloat(inv.preco_medio) * parseFloat(inv.quantidade);
        const lucro = parseFloat(inv.valor_atual) - custo;
        const pct = custo > 0 ? ((lucro / custo) * 100).toFixed(2) : '0.00';
        return `
          <div class="invest-row">
            <div class="invest-ticker">${inv.ticker}</div>
            <div class="invest-info">
              <div class="invest-name">${inv.nome}</div>
              <div class="invest-type">${(inv.tipo || '').toUpperCase()} · ${inv.classe || ''} · ${inv.moeda || ''}</div>
              <div style="margin-top:6px;display:flex;gap:10px">
                <span class="badge badge-neutral">Qtd: ${inv.quantidade}</span>
                <span class="badge badge-neutral">PM: R$ ${parseFloat(inv.preco_medio).toFixed(2)}</span>
                <span class="badge badge-neutral">Conta: ${inv.conta_nome || '—'}</span>
              </div>
            </div>
            <div class="invest-values">
              <div class="invest-current">${fmt(inv.valor_atual)}</div>
              <div class="invest-pct ${lucro >= 0 ? 'pct-pos' : 'pct-neg'}">${lucro >= 0 ? '↑ +' : '↓ '}${pct}%</div>
            </div>
          </div>`;
      }).join('');
    }

    // Chart
    setTimeout(() => {
      const ctx = $('chart-invest');
      if (!ctx) return;
      if (charts.invest) charts.invest.destroy();
      charts.invest = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: investimentos.map(i => `${i.ticker} (${(i.tipo || '').charAt(0).toUpperCase() + (i.tipo || '').slice(1)})`),
          datasets: [{
            data: investimentos.map(i => parseFloat(i.valor_atual)),
            backgroundColor: ['rgba(245,158,11,0.6)', 'rgba(99,102,241,0.6)', 'rgba(16,217,160,0.6)', 'rgba(244,63,94,0.6)'],
            borderColor: ['#f59e0b', '#6366f1', '#10d9a0', '#f43f5e'],
            borderWidth: 2
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '65%',
          plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 11, family: 'Inter' } } } }
        }
      });
    }, 50);

    // Operações
    const opEl = $('operacoes-list');
    if (opEl) {
      const allOps = investimentos.flatMap(inv =>
        (inv.operacoes || []).map(op => ({ ...op, ticker: inv.ticker, inv_nome: inv.nome }))
      );
      if (allOps.length === 0) {
        opEl.innerHTML = '<div class="text-muted" style="font-size:13px;padding:12px">Nenhuma operação registrada.</div>';
      } else {
        opEl.innerHTML = allOps.map(op => `
          <div class="op-item">
            <span class="op-type ${op.tipo === 'compra' ? 'op-compra' : 'op-venda'}">${(op.tipo || '').charAt(0).toUpperCase() + (op.tipo || '').slice(1)}</span>
            <div style="flex:1">
              <div style="font-size:13px;font-weight:600;color:var(--t1)">${op.ticker} — ${op.inv_nome}</div>
              <div style="font-size:11px;color:var(--t3);margin-top:2px">
                Data: ${fmtDate(op.data_operacao)} · Qtd: ${op.quantidade} · Preço unitário: R$ ${parseFloat(op.preco_unitario).toFixed(2)}
              </div>
            </div>
            <div style="text-align:right">
              <div style="font-size:15px;font-weight:800;color:var(--t1)">${fmt(op.valor_total)}</div>
              <div style="font-size:11px;color:var(--t3)">Taxas: ${fmt(op.taxas || 0)}</div>
            </div>
          </div>`).join('');
      }
    }
  } catch (err) {
    showError($('invest-kpi'), 'Erro ao carregar investimentos.');
  }
}

// ────────────────────────────────────────────────────────────
//  METAS
// ────────────────────────────────────────────────────────────

async function renderMetas() {
  if (!APP_USER_ID) return;
  const grid = $('metas-grid');
  if (!grid) return;

  try {
    const data = await apiFetch(`/metas/${APP_USER_ID}`);
    const metas = data.metas;

    if (!metas || metas.length === 0) {
      grid.innerHTML = '<div class="text-muted" style="font-size:13px;padding:12px">Nenhuma meta encontrada.</div>';
      return;
    }

    const tipoIconName = { viagem: 'plane', poupanca: 'piggyBank', quitacao: 'house', emergencia: 'shield', outro: 'target' };
    const tipoIconColor = { viagem: '#6366f1', poupanca: '#10d9a0', quitacao: '#f59e0b', emergencia: '#38bdf8', outro: '#94a3b8' };

    grid.innerHTML = metas.map(m => {
      const pct = parseFloat(m.progresso_pct) || 0;
      const rest = parseFloat(m.valor_restante) || 0;
      const iName = tipoIconName[m.tipo] || 'target';
      const iColor = tipoIconColor[m.tipo] || '#94a3b8';

      return `
        <div class="meta-card">
          <div class="meta-top">
            <div>
              <div class="meta-name">${m.nome}</div>
              <div class="meta-type" style="display:inline-flex;align-items:center;gap:5px">
                ${iconSvg(iName, 14, iColor)}
                ${(m.tipo || '').charAt(0).toUpperCase() + (m.tipo || '').slice(1)} · Conta: ${m.conta_nome || '—'}
              </div>
            </div>
            <span class="badge badge-success">${m.status}</span>
          </div>
          <div class="meta-values">
            <div>
              <div style="font-size:11px;color:var(--t3);margin-bottom:4px">Acumulado</div>
              <div class="meta-current">${fmt(m.valor_atual)}</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:11px;color:var(--t3);margin-bottom:4px">Meta</div>
              <div class="meta-target-val">${fmt(m.valor_alvo)}</div>
            </div>
          </div>
          <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
          <div class="meta-footer">
            <span class="meta-pct">${pct}% concluído</span>
            <span class="meta-deadline">Prazo: ${fmtDate(m.data_fim)} · Faltam: ${fmt(rest)}</span>
          </div>
        </div>
        <div class="meta-card">
          <div class="meta-top">
            <div>
              <div class="meta-name">Detalhes da Meta</div>
              <div class="meta-type" style="display:inline-flex;align-items:center;gap:5px">${iconSvg('database', 14, '#94a3b8')} Dados do banco de dados</div>
            </div>
            <span class="badge badge-info">meta</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:12px;margin-top:8px">
            ${[
              ['ID (UUID)', (m.id || '').substring(0, 20) + '…'],
              ['Início', fmtDate(m.data_inicio)],
              ['Prazo final', fmtDate(m.data_fim)],
              ['Tipo', m.tipo],
              ['Conta vinculada', m.conta_nome || '—'],
              ['Usuário', m.usuario_nome || '—']
            ].map(([k, v]) => `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--surface2);border-radius:8px;border:1px solid var(--border)">
                <span style="font-size:11.5px;color:var(--t3)">${k}</span>
                <span style="font-size:12.5px;font-weight:600;color:var(--t1)">${v}</span>
              </div>`).join('')}
          </div>
        </div>`;
    }).join('');
  } catch (err) {
    showError(grid, 'Erro ao carregar metas.');
  }
}

// ────────────────────────────────────────────────────────────
//  CATEGORIAS
// ────────────────────────────────────────────────────────────

async function renderCategorias() {
  if (!APP_USER_ID) return;
  try {
    const data = await apiFetch(`/categorias/${APP_USER_ID}`);
    const categorias = data.categorias;
    const tags = data.tags;
    const usuarioNome = data.usuario_nome;

    // Atualizar badge no HTML
    const badgePurple = document.querySelector('#page-categorias .badge-purple');
    if (badgePurple) badgePurple.textContent = usuarioNome;

    const padrao = categorias.filter(c => c.padrao);
    const custom = categorias.filter(c => !c.padrao);

    const renderCat = (cat, showChildren) => {
      const filhos = categorias.filter(c => c.pai === cat.id);
      return `
        <div class="cat-item">
          <div class="cat-color" style="background:${cat.cor}"></div>
          <div class="cat-icon" style="background:${cat.cor}22">${iconSvg(cat.icone || 'target', 16, cat.cor)}</div>
          <div>
            <div class="cat-name">${cat.nome}</div>
            <div class="cat-sub">${cat.tipo} · ${cat.padrao ? 'Global' : 'Personalizada'}</div>
          </div>
          <div class="spacer"></div>
          <span class="badge ${cat.tipo === 'receita' ? 'badge-success' : cat.tipo === 'despesa' ? 'badge-rose' : 'badge-neutral'}">${cat.tipo}</span>
        </div>
        ${showChildren && filhos.length ? `
          <div class="cat-children">
            ${filhos.map(f => `
              <div class="cat-item" style="margin-bottom:6px">
                <div class="cat-color" style="background:${f.cor}"></div>
                <div class="cat-icon" style="background:${f.cor}22">${iconSvg(f.icone || 'target', 16, f.cor)}</div>
                <div>
                  <div class="cat-name">${f.nome}</div>
                  <div class="cat-sub">Subcategoria de <strong>${cat.nome}</strong></div>
                </div>
                <div class="spacer"></div>
                <span class="badge badge-purple">Personalizada</span>
              </div>`).join('')}
          </div>` : ''}`;
    };

    const padraoEl = $('cat-padrao');
    if (padraoEl) padraoEl.innerHTML = padrao.map(c => renderCat(c, true)).join('');

    const customEl = $('cat-custom');
    if (customEl) {
      customEl.innerHTML = custom.map(c => {
        const pai = categorias.find(p => p.id === c.pai);
        return `
          <div class="cat-item">
            <div class="cat-color" style="background:${c.cor}"></div>
            <div class="cat-icon" style="background:${c.cor}22">${iconSvg(c.icone || 'target', 16, c.cor)}</div>
            <div>
              <div class="cat-name">${c.nome}</div>
              <div class="cat-sub">Subcategoria de <strong style="color:var(--t1)">${pai ? pai.nome : '—'}</strong></div>
            </div>
            <div class="spacer"></div>
            <span class="badge ${c.tipo === 'receita' ? 'badge-success' : 'badge-rose'}">${c.tipo}</span>
          </div>`;
      }).join('');
    }

    // Tags
    const tagsEl = $('tags-list');
    if (tagsEl) {
      tagsEl.innerHTML = `
        <div class="tag-wrap">
          ${tags.map(t => `
            <div class="tag-item">
              <span class="tag-dot" style="background:${t.cor}"></span>
              ${t.nome}
            </div>`).join('')}
        </div>`;
    }
  } catch (err) {
    showError($('cat-padrao'), 'Erro ao carregar categorias.');
  }
}

// ────────────────────────────────────────────────────────────
//  USUÁRIOS
// ────────────────────────────────────────────────────────────

async function renderUsuarios() {
  const el = $('usuarios-layout');
  if (!el) return;

  try {
    if (!APP_USER_ID) return;
    const data = await apiFetch(`/usuarios/${APP_USER_ID}`);
    const usuarios = data.usuarios;
    const compartilhamentos = data.compartilhamentos;

    const avatarColors = ['linear-gradient(135deg,#10d9a0,#6366f1)', 'linear-gradient(135deg,#f59e0b,#f43f5e)', 'linear-gradient(135deg,#38bdf8,#a855f7)', 'linear-gradient(135deg,#f43f5e,#f59e0b)'];

    const userCards = usuarios.map((u, i) => `
      <div class="user-card">
        <div class="user-card-top">
          <div class="user-big-avatar" style="background:${avatarColors[i % avatarColors.length]}">
            ${u.nome.split(' ').map(n => n[0]).join('').substring(0, 2)}
          </div>
          <div>
            <div class="user-card-name">${u.nome}</div>
            <div class="user-card-email">${u.email}</div>
            <div style="margin-top:6px;display:flex;gap:6px">
              <span class="badge ${u.plano === 'pro' ? 'badge-success' : 'badge-neutral'}">${(u.plano || '').toUpperCase()}</span>
              <span class="badge ${u.ativo ? 'badge-success' : 'badge-rose'}">${u.ativo ? 'Ativo' : 'Inativo'}</span>
            </div>
          </div>
        </div>
        <div class="user-card-meta">
          <div class="user-card-field"><span class="ucf-label">Telefone</span><span class="ucf-val">${u.telefone || '—'}</span></div>
          <div class="user-card-field"><span class="ucf-label">Cadastro</span><span class="ucf-val">${fmtDate(u.data_cadastro)}</span></div>
        </div>
        <div style="margin-top:8px;padding:10px 12px;background:var(--surface2);border-radius:8px;border:1px solid var(--border)">
          <div style="font-size:10px;color:var(--t3);margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px">UUID</div>
          <div class="font-mono" style="font-size:10.5px;color:var(--t3);word-break:break-all">${u.id}</div>
        </div>
      </div>`).join('');

    const permBadge = { leitura: 'badge-info', edicao: 'badge-warn', admin: 'badge-rose' };

    el.innerHTML = `
      <div class="usuarios-grid">${userCards}</div>
      <div class="section-card">
        <div class="section-header">
          <h3>Compartilhamento de Acesso — usuario_adicional</h3>
          <span class="badge badge-info">N-N reflexivo</span>
        </div>
        <table class="sharing-table">
          <thead>
            <tr><th>Titular</th><th>Convidado</th><th>Permissão</th><th>Data do Convite</th><th>Status</th></tr>
          </thead>
          <tbody>
            ${compartilhamentos.map(ua => `
              <tr>
                <td><strong style="color:var(--t1)">${ua.titular_nome || '—'}</strong></td>
                <td>${ua.convidado_nome || '—'}</td>
                <td><span class="badge ${permBadge[ua.permissao] || 'badge-neutral'}">${ua.permissao}</span></td>
                <td>${fmtDate(ua.data_convite)}</td>
                <td><span class="badge ${ua.ativo ? 'badge-success' : 'badge-neutral'}">${ua.ativo ? 'Ativo' : 'Inativo'}</span></td>
              </tr>`).join('')}
          </tbody>
        </table>
        <div style="margin-top:16px;padding:12px;background:var(--surface2);border-radius:8px;border:1px solid var(--border)">
          <div style="font-size:12px;color:var(--t2);display:flex;align-items:flex-start;gap:7px">
            ${iconSvg('lock', 14, '#6366f1')}
            <div><strong>Regras de negócio:</strong> 
            <span style="color:var(--t3)">Um usuário não pode convidar a si mesmo (CHECK) · Cada par titular-convidado é único (UNIQUE)</span></div>
          </div>
        </div>
      </div>`;
  } catch (err) {
    showError(el, 'Erro ao carregar usuários.');
  }
}

// ────────────────────────────────────────────────────────────
//  REGRAS & PROJETOS
// ────────────────────────────────────────────────────────────

async function renderRegras() {
  if (!APP_USER_ID) return;
  try {
    const data = await apiFetch(`/regras/${APP_USER_ID}`);

    // Regras
    const regrasEl = $('regras-list');
    if (regrasEl) {
      if (data.regras.length === 0) {
        regrasEl.innerHTML = '<div class="text-muted" style="font-size:13px;padding:12px">Nenhuma regra cadastrada.</div>';
      } else {
        // Atualizar badge com contagem
        const regrasHeader = regrasEl.closest('.section-card')?.querySelector('.badge');
        if (regrasHeader) regrasHeader.textContent = `${data.regras.filter(r => r.ativo).length} ativas`;

        regrasEl.innerHTML = data.regras.map(r => `
          <div class="regra-item">
            <div class="regra-priority">${r.prioridade}</div>
            <div style="flex:1">
              <div class="regra-term">"${r.termo_busca}"</div>
              <div class="regra-desc">${r.descricao || ''}</div>
              <div style="margin-top:6px;display:flex;gap:6px">
                <span class="badge badge-neutral">tipo: ${r.tipo}</span>
                <span class="badge ${r.ativo ? 'badge-success' : 'badge-neutral'}">${r.ativo ? 'ativa' : 'inativa'}</span>
              </div>
            </div>
            <div class="regra-arrow">→</div>
            <div style="text-align:right">
              <div class="regra-cat" style="display:inline-flex;align-items:center;gap:5px">${r.cat_icone ? iconSvg(r.cat_icone, 14, '#10d9a0') + ' ' + r.cat_nome : '—'}</div>
              <div style="font-size:11px;color:var(--t3);margin-top:2px">categoria</div>
            </div>
          </div>`).join('');
      }
    }

    // Projetos
    const projEl = $('projetos-list');
    if (projEl) {
      if (data.projetos.length === 0) {
        projEl.innerHTML = '<div class="text-muted" style="font-size:13px;padding:12px">Nenhum projeto cadastrado.</div>';
      } else {
        projEl.innerHTML = data.projetos.map(p => {
          const pct = parseFloat(p.orcamento) > 0 ? (parseFloat(p.gasto_total) / parseFloat(p.orcamento) * 100).toFixed(1) : 0;
          return `
            <div class="projeto-card">
              <div class="projeto-name" style="display:inline-flex;align-items:center;gap:8px">${iconSvg('building', 18, '#f59e0b')} ${p.nome}</div>
              <div class="projeto-meta">
                <div class="account-meta-item"><span class="account-meta-label">Orçamento</span><span class="account-meta-val">${fmt(p.orcamento)}</span></div>
                <div class="account-meta-item"><span class="account-meta-label">Gasto</span><span class="account-meta-val text-rose">${fmt(p.gasto_total)}</span></div>
                <div class="account-meta-item"><span class="account-meta-label">Restante</span><span class="account-meta-val text-green">${fmt(parseFloat(p.orcamento) - parseFloat(p.gasto_total))}</span></div>
              </div>
              <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:linear-gradient(90deg,var(--amber),var(--rose))"></div></div>
              <div style="display:flex;justify-content:space-between;margin-top:8px">
                <span style="font-size:12px;color:var(--amber)">${pct}% do orçamento utilizado</span>
                <span class="badge badge-success">${p.status}</span>
              </div>
              <div style="margin-top:8px;font-size:11px;color:var(--t3)">${fmtDate(p.data_inicio)} → ${fmtDate(p.data_fim)}</div>
            </div>`;
        }).join('');
      }
    }

    // Centros de custo
    const centroEl = $('centros-list');
    if (centroEl) {
      if (data.centros.length === 0) {
        centroEl.innerHTML = '<div class="text-muted" style="font-size:13px;padding:12px">Nenhum centro de custo.</div>';
      } else {
        centroEl.innerHTML = data.centros.map(ct => {
          const lancCentro = data.lancamentos_centro.filter(lc => lc.centro_id === ct.id);
          const totalCentro = lancCentro.reduce((s, lc) => s + (parseFloat(lc.lanc_valor) * parseFloat(lc.percentual) / 100), 0);

          return `
            <div class="centro-card">
              <div class="centro-icon">${iconSvg('car', 20, '#f59e0b')}</div>
              <div style="flex:1">
                <div style="font-size:14px;font-weight:700;color:var(--t1)">${ct.nome}</div>
                <div style="font-size:11.5px;color:var(--t3);margin-top:2px">${ct.descricao || ''}</div>
                <div style="margin-top:6px;display:flex;gap:8px">
                  <span class="badge badge-neutral">tipo: ${ct.tipo}</span>
                  <span class="badge ${ct.ativo ? 'badge-success' : 'badge-neutral'}">${ct.ativo ? 'ativo' : 'inativo'}</span>
                </div>
              </div>
              <div style="text-align:right">
                <div style="font-size:11px;color:var(--t3)">Total alocado</div>
                <div style="font-size:18px;font-weight:800;color:var(--rose)">${fmt(totalCentro)}</div>
              </div>
            </div>`;
        }).join('');
      }
    }

    // Lembretes
    const lembreteEl = $('lembretes-list');
    if (lembreteEl) {
      if (data.lembretes.length === 0) {
        lembreteEl.innerHTML = '<div class="text-muted" style="font-size:13px;padding:12px">Nenhum lembrete ativo.</div>';
      } else {
        lembreteEl.innerHTML = data.lembretes.map(l => `
          <div class="lembrete-card">
            <div class="lembrete-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
            </div>
            <div style="flex:1">
              <div style="font-size:14px;font-weight:600;color:var(--t1)">${l.descricao}</div>
              <div style="font-size:11.5px;color:var(--t3);margin-top:2px">
                Frequência: <strong style="color:var(--t2)">${l.frequencia}</strong> · 
                Vence: <strong style="color:var(--amber)">${fmtDate(l.data_vencimento)}</strong>
              </div>
              <div style="margin-top:6px;display:flex;gap:6px">
                ${l.notificacoes_email ? `<span class="badge badge-info" style="display:inline-flex;align-items:center;gap:4px">${iconSvg('mail', 11, '#38bdf8')} E-mail</span>` : ''}
                ${l.notificacoes_push ? `<span class="badge badge-purple" style="display:inline-flex;align-items:center;gap:4px">${iconSvg('smartphone', 11, '#a855f7')} Push</span>` : ''}
                <span class="badge ${l.ativo ? 'badge-success' : 'badge-neutral'}">${l.ativo ? 'ativo' : 'inativo'}</span>
              </div>
            </div>
            <div style="text-align:right">
              <div style="font-size:11px;color:var(--t3)">Valor</div>
              <div style="font-size:18px;font-weight:800;color:var(--rose)">${fmt(l.valor)}</div>
            </div>
          </div>`).join('');
      }
    }
  } catch (err) {
    showError($('regras-list'), 'Erro ao carregar regras.');
  }
}

// ────────────────────────────────────────────────────────────
//  INICIALIZAÇÃO — carrega usuário padrão e inicia
// ────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  // Nav items
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      navigate(item.dataset.page);
    });
  });

  // btn-link (dashboard "Ver todos" buttons)
  document.querySelectorAll('.btn-link').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.page) navigate(btn.dataset.page);
    });
  });

  // User Switcher — botão de alternar conta
  const switchBtn = $('user-switch-btn');
  if (switchBtn) {
    switchBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleUserSwitcher();
    });
  }

  // User Switcher — botão fechar
  const switchClose = $('user-switch-close');
  if (switchClose) {
    switchClose.addEventListener('click', () => {
      const dropdown = $('user-switch-dropdown');
      if (dropdown) dropdown.classList.remove('open');
    });
  }

  // Fechar dropdown ao clicar fora
  document.addEventListener('click', (e) => {
    const dropdown = $('user-switch-dropdown');
    const btn = $('user-switch-btn');
    if (dropdown && dropdown.classList.contains('open')) {
      if (!dropdown.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
        dropdown.classList.remove('open');
      }
    }
  });

  // Carregar usuário padrão do banco de dados
  try {
    const user = await apiFetch('/default-user');
    APP_USER_ID = user.id;
    APP_USER = user;
    updateSidebarUser(user);
  } catch (err) {
    console.error('Erro ao carregar usuário padrão:', err);
    APP_USER_ID = FALLBACK_DB.user.id;
    APP_USER = FALLBACK_DB.user;
    updateSidebarUser(FALLBACK_DB.user);
  }

  // Carregar lista de todos os usuários para o switcher
  await loadAllUsers();

  // Renderizar página inicial
  navigate('dashboard');
});
