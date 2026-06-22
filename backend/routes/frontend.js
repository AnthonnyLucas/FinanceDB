/* ═══════════════════════════════════════════════════════════
   routes/frontend.js — Rotas Públicas de Leitura para o Frontend
   Sem autenticação — servem dados do PostgreSQL para as páginas
═══════════════════════════════════════════════════════════ */

const express = require('express');
const router = express.Router();
const { query } = require('../db');

// Helper: buscar o primeiro usuário do banco (padrão)
async function getDefaultUserId() {
  const result = await query(`SELECT id FROM usuario ORDER BY data_cadastro LIMIT 1`);
  return result.rows.length > 0 ? result.rows[0].id : null;
}

/**
 * GET /api/frontend/users
 * Retorna todos os usuários cadastrados (para o seletor de conta)
 */
router.get('/users', async (req, res) => {
  try {
    const result = await query(`SELECT id, nome, email, plano FROM usuario ORDER BY data_cadastro`);
    res.json({ users: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/frontend/default-user
 * Retorna o ID e nome do usuário padrão (primeiro cadastrado)
 */
router.get('/default-user', async (req, res) => {
  try {
    const result = await query(`SELECT id, nome, email, plano FROM usuario ORDER BY data_cadastro LIMIT 1`);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Nenhum usuário encontrado.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/frontend/dashboard/:userId
 * Dados completos para a página Dashboard
 */
router.get('/dashboard/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Saldo total
    const saldoResult = await query(`
      SELECT COALESCE(SUM(saldo_atual), 0) AS saldo_total,
             COUNT(*) AS total_contas
      FROM conta WHERE usuario_id = $1 AND ativa = TRUE
    `, [userId]);

    // Receitas do mês atual (ou todas se não houver do mês)
    const receitasResult = await query(`
      SELECT COALESCE(SUM(l.valor), 0) AS total
      FROM lancamento l
      JOIN conta c ON c.id = l.conta_id
      WHERE c.usuario_id = $1 AND l.tipo = 'receita' AND l.status = 'confirmado'
    `, [userId]);

    // Despesas do mês atual (ou todas)
    const despesasResult = await query(`
      SELECT COALESCE(SUM(l.valor), 0) AS total,
             COUNT(*) AS count
      FROM lancamento l
      JOIN conta c ON c.id = l.conta_id
      WHERE c.usuario_id = $1 AND l.tipo = 'despesa' AND l.status = 'confirmado'
    `, [userId]);

    // Total investido
    const investResult = await query(`
      SELECT COALESCE(SUM(valor_atual), 0) AS total_investido
      FROM investimento WHERE usuario_id = $1
    `, [userId]);

    // Últimos lançamentos com categoria e conta resolvidas
    const lancamentosResult = await query(`
      SELECT l.*, 
             cat.nome AS cat_nome, cat.cor AS cat_cor, cat.icone AS cat_icone,
             c.nome AS conta_nome
      FROM lancamento l
      JOIN conta c ON c.id = l.conta_id
      LEFT JOIN categoria cat ON cat.id = l.categoria_id
      WHERE c.usuario_id = $1
      ORDER BY l.data_lancamento DESC
      LIMIT 10
    `, [userId]);

    // Despesas por categoria (para gráfico)
    const categoriasResult = await query(`
      SELECT COALESCE(cat.nome, 'Outros') AS categoria,
             COALESCE(cat.cor, '#666666') AS cor,
             SUM(l.valor) AS total
      FROM lancamento l
      JOIN conta c ON c.id = l.conta_id
      LEFT JOIN categoria cat ON cat.id = l.categoria_id
      WHERE c.usuario_id = $1 AND l.tipo = 'despesa' AND l.status = 'confirmado'
      GROUP BY cat.nome, cat.cor
      ORDER BY total DESC
    `, [userId]);

    // Receitas vs Despesas por mês (para gráfico de barras)
    const mensalResult = await query(`
      SELECT 
        TO_CHAR(l.data_lancamento, 'Mon') AS label,
        TO_CHAR(l.data_lancamento, 'YYYY-MM') AS mes,
        SUM(CASE WHEN l.tipo = 'receita' THEN l.valor ELSE 0 END) AS receitas,
        SUM(CASE WHEN l.tipo = 'despesa' THEN l.valor ELSE 0 END) AS despesas
      FROM lancamento l
      JOIN conta c ON c.id = l.conta_id
      WHERE c.usuario_id = $1 AND l.status = 'confirmado'
      GROUP BY TO_CHAR(l.data_lancamento, 'Mon'), TO_CHAR(l.data_lancamento, 'YYYY-MM')
      ORDER BY mes
      LIMIT 12
    `, [userId]);

    // Alertas: faturas pendentes
    const faturasAlert = await query(`
      SELECT f.valor_total, f.data_vencimento, cc.nome AS cartao_nome
      FROM fatura f
      JOIN cartao_credito cc ON cc.id = f.cartao_id
      JOIN conta c ON c.id = cc.conta_id
      WHERE c.usuario_id = $1 AND f.paga = FALSE
      ORDER BY f.data_vencimento
    `, [userId]);

    // Alertas: metas
    const metasAlert = await query(`
      SELECT nome, valor_atual, valor_alvo,
             ROUND((valor_atual / NULLIF(valor_alvo, 0) * 100), 1) AS progresso_pct
      FROM meta WHERE usuario_id = $1 AND status = 'ativa'
    `, [userId]);

    // Alertas: investimentos
    const investAlert = await query(`
      SELECT ticker, nome, valor_atual, preco_medio, quantidade,
             ROUND(((valor_atual - (preco_medio * quantidade)) / NULLIF(preco_medio * quantidade, 0) * 100), 2) AS rentabilidade_pct
      FROM investimento WHERE usuario_id = $1
    `, [userId]);

    // Alertas: compartilhamento
    const sharingAlert = await query(`
      SELECT u2.nome AS convidado_nome, ua.permissao, ua.data_convite
      FROM usuario_adicional ua
      JOIN usuario u2 ON u2.id = ua.usuario_convidado_id
      WHERE ua.usuario_titular_id = $1 AND ua.ativo = TRUE
    `, [userId]);

    res.json({
      kpis: {
        saldo_total: parseFloat(saldoResult.rows[0].saldo_total),
        total_contas: parseInt(saldoResult.rows[0].total_contas),
        receitas: parseFloat(receitasResult.rows[0].total),
        despesas: parseFloat(despesasResult.rows[0].total),
        num_despesas: parseInt(despesasResult.rows[0].count),
        total_investido: parseFloat(investResult.rows[0].total_investido)
      },
      lancamentos: lancamentosResult.rows,
      categorias_chart: categoriasResult.rows,
      mensal_chart: mensalResult.rows,
      alertas: {
        faturas: faturasAlert.rows,
        metas: metasAlert.rows,
        investimentos: investAlert.rows,
        compartilhamentos: sharingAlert.rows
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/frontend/contas/:userId
 * Contas bancárias com dados de conta_bancaria
 */
router.get('/contas/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const contasResult = await query(`
      SELECT c.*,
             cb.banco_codigo, cb.agencia, cb.numero_conta,
             cb.token_open_finance, cb.ultima_sincronizacao, cb.status_sincronizacao
      FROM conta c
      LEFT JOIN conta_bancaria cb ON cb.conta_id = c.id
      WHERE c.usuario_id = $1
      ORDER BY c.saldo_atual DESC
    `, [userId]);

    res.json({ contas: contasResult.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/frontend/lancamentos/:userId
 * Lançamentos com categoria, conta, tags e centro resolvidos
 */
router.get('/lancamentos/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const lancResult = await query(`
      SELECT l.*,
             cat.nome AS cat_nome, cat.cor AS cat_cor, cat.icone AS cat_icone,
             c.nome AS conta_nome
      FROM lancamento l
      JOIN conta c ON c.id = l.conta_id
      LEFT JOIN categoria cat ON cat.id = l.categoria_id
      WHERE c.usuario_id = $1
      ORDER BY l.data_lancamento DESC
    `, [userId]);

    // Tags por lançamento
    const tagsResult = await query(`
      SELECT lt.lancamento_id, t.id AS tag_id, t.nome AS tag_nome, t.cor AS tag_cor
      FROM lancamento_tag lt
      JOIN tag t ON t.id = lt.tag_id
      WHERE t.usuario_id = $1
    `, [userId]);

    // Centro de custo por lançamento
    const centrosResult = await query(`
      SELECT lc.lancamento_id, lc.percentual,
             ct.id AS centro_id, ct.nome AS centro_nome, ct.tipo AS centro_tipo
      FROM lancamento_centro lc
      JOIN centro ct ON ct.id = lc.centro_id
      WHERE ct.usuario_id = $1
    `, [userId]);

    // Mapear tags por lancamento_id
    const tagsByLanc = {};
    tagsResult.rows.forEach(t => {
      if (!tagsByLanc[t.lancamento_id]) tagsByLanc[t.lancamento_id] = [];
      tagsByLanc[t.lancamento_id].push({ id: t.tag_id, nome: t.tag_nome, cor: t.tag_cor });
    });

    // Mapear centros por lancamento_id
    const centrosByLanc = {};
    centrosResult.rows.forEach(c => {
      if (!centrosByLanc[c.lancamento_id]) centrosByLanc[c.lancamento_id] = [];
      centrosByLanc[c.lancamento_id].push(c);
    });

    // Enriquecer lançamentos
    const lancamentos = lancResult.rows.map(l => ({
      ...l,
      tags: tagsByLanc[l.id] || [],
      centros: centrosByLanc[l.id] || []
    }));

    res.json({ lancamentos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/frontend/cartoes/:userId
 * Cartões de crédito com faturas e lançamentos da fatura aberta
 */
router.get('/cartoes/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Cartões
    const cartoesResult = await query(`
      SELECT cc.*, u.nome AS titular_nome
      FROM cartao_credito cc
      JOIN conta c ON c.id = cc.conta_id
      JOIN usuario u ON u.id = c.usuario_id
      WHERE c.usuario_id = $1
      ORDER BY cc.nome
    `, [userId]);

    // Faturas
    const faturasResult = await query(`
      SELECT f.*
      FROM fatura f
      JOIN cartao_credito cc ON cc.id = f.cartao_id
      JOIN conta c ON c.id = cc.conta_id
      WHERE c.usuario_id = $1
      ORDER BY f.data_vencimento DESC
    `, [userId]);

    // Lançamentos nas faturas abertas
    const lancFaturaResult = await query(`
      SELECT l.*, cat.nome AS cat_nome, cat.cor AS cat_cor, cat.icone AS cat_icone
      FROM lancamento l
      LEFT JOIN categoria cat ON cat.id = l.categoria_id
      JOIN fatura f ON f.id = l.fatura_id
      JOIN cartao_credito cc ON cc.id = f.cartao_id
      JOIN conta c ON c.id = cc.conta_id
      WHERE c.usuario_id = $1 AND f.paga = FALSE
      ORDER BY l.data_lancamento DESC
    `, [userId]);

    // Agrupar faturas por cartão
    const faturasByCartao = {};
    faturasResult.rows.forEach(f => {
      if (!faturasByCartao[f.cartao_id]) faturasByCartao[f.cartao_id] = [];
      faturasByCartao[f.cartao_id].push(f);
    });

    const cartoes = cartoesResult.rows.map(cc => ({
      ...cc,
      faturas: faturasByCartao[cc.id] || [],
      lancamentos_fatura_aberta: lancFaturaResult.rows.filter(l => {
        const fat = faturasResult.rows.find(f => f.id === l.fatura_id);
        return fat && fat.cartao_id === cc.id;
      })
    }));

    res.json({ cartoes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/frontend/investimentos/:userId
 * Investimentos com operações
 */
router.get('/investimentos/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const investResult = await query(`
      SELECT i.*, c.nome AS conta_nome
      FROM investimento i
      JOIN conta c ON c.id = i.conta_id
      WHERE i.usuario_id = $1
      ORDER BY i.valor_atual DESC
    `, [userId]);

    const opsResult = await query(`
      SELECT op.*
      FROM operacao_investimento op
      JOIN investimento i ON i.id = op.investimento_id
      WHERE i.usuario_id = $1
      ORDER BY op.data_operacao DESC
    `, [userId]);

    // Agrupar operações por investimento
    const opsByInvest = {};
    opsResult.rows.forEach(op => {
      if (!opsByInvest[op.investimento_id]) opsByInvest[op.investimento_id] = [];
      opsByInvest[op.investimento_id].push(op);
    });

    const investimentos = investResult.rows.map(i => ({
      ...i,
      operacoes: opsByInvest[i.id] || []
    }));

    res.json({ investimentos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/frontend/metas/:userId
 * Metas financeiras com conta vinculada e progresso
 */
router.get('/metas/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await query(`
      SELECT m.*,
             ROUND((m.valor_atual / NULLIF(m.valor_alvo, 0) * 100), 1) AS progresso_pct,
             (m.valor_alvo - m.valor_atual) AS valor_restante,
             c.nome AS conta_nome,
             u.nome AS usuario_nome
      FROM meta m
      LEFT JOIN conta c ON c.id = m.conta_id
      LEFT JOIN usuario u ON u.id = m.usuario_id
      WHERE m.usuario_id = $1
      ORDER BY m.status, m.data_fim
    `, [userId]);

    res.json({ metas: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/frontend/categorias/:userId
 * Categorias (globais + personalizadas) e tags
 */
router.get('/categorias/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Categorias globais (padrao = sem usuario_id) + personalizadas do usuário
    const catResult = await query(`
      SELECT c.*, 
             CASE WHEN c.usuario_id IS NULL THEN true ELSE false END AS padrao
      FROM categoria c
      WHERE c.usuario_id IS NULL OR c.usuario_id = $1
      ORDER BY c.usuario_id NULLS FIRST, c.nome
    `, [userId]);

    // Tags do usuário
    const tagsResult = await query(`
      SELECT * FROM tag WHERE usuario_id = $1 ORDER BY nome
    `, [userId]);

    // Nome do usuário para o badge
    const userResult = await query(`SELECT nome FROM usuario WHERE id = $1`, [userId]);

    res.json({
      categorias: catResult.rows,
      tags: tagsResult.rows,
      usuario_nome: userResult.rows[0]?.nome || 'Usuário'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/frontend/usuarios/:userId
 * Usuário titular + convidados com acesso compartilhado (usuario_adicional)
 */
router.get('/usuarios/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Buscar IDs dos convidados que o titular compartilhou acesso
    const sharingResult = await query(`
      SELECT ua.*,
             ut.nome AS titular_nome,
             uc.nome AS convidado_nome
      FROM usuario_adicional ua
      JOIN usuario ut ON ut.id = ua.usuario_titular_id
      JOIN usuario uc ON uc.id = ua.usuario_convidado_id
      WHERE ua.usuario_titular_id = $1
      ORDER BY ua.data_convite DESC
    `, [userId]);

    // Coletar IDs: titular + todos os convidados
    const convidadoIds = sharingResult.rows.map(r => r.usuario_convidado_id);
    const allIds = [userId, ...convidadoIds];

    // Buscar apenas o titular e seus convidados
    const usersResult = await query(`
      SELECT id, nome, email, telefone, plano, data_cadastro, ativo
      FROM usuario
      WHERE id = ANY($1)
      ORDER BY CASE WHEN id = $2 THEN 0 ELSE 1 END, nome
    `, [allIds, userId]);

    res.json({
      usuarios: usersResult.rows,
      compartilhamentos: sharingResult.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/frontend/regras/:userId
 * Regras de classificação + projetos + centros de custo + lembretes
 */
router.get('/regras/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Regras com categoria resolvida
    const regrasResult = await query(`
      SELECT r.*, cat.nome AS cat_nome, cat.cor AS cat_cor, cat.icone AS cat_icone
      FROM regra_classificacao r
      LEFT JOIN categoria cat ON cat.id = r.categoria_id
      WHERE r.usuario_id = $1
      ORDER BY r.prioridade
    `, [userId]);

    // Projetos
    const projetosResult = await query(`
      SELECT * FROM projeto WHERE usuario_id = $1 ORDER BY data_inicio DESC
    `, [userId]);

    // Centros de custo
    const centrosResult = await query(`
      SELECT * FROM centro WHERE usuario_id = $1 ORDER BY nome
    `, [userId]);

    // Lembretes
    const lembretesResult = await query(`
      SELECT * FROM lembrete WHERE usuario_id = $1 ORDER BY data_vencimento
    `, [userId]);

    // Lançamentos vinculados a centros (para calcular total alocado)
    const lancCentroResult = await query(`
      SELECT lc.centro_id, lc.percentual, lc.lancamento_id,
             l.descricao AS lanc_descricao, l.valor AS lanc_valor
      FROM lancamento_centro lc
      JOIN centro ct ON ct.id = lc.centro_id
      JOIN lancamento l ON l.id = lc.lancamento_id
      WHERE ct.usuario_id = $1
    `, [userId]);

    res.json({
      regras: regrasResult.rows,
      projetos: projetosResult.rows,
      centros: centrosResult.rows,
      lembretes: lembretesResult.rows,
      lancamentos_centro: lancCentroResult.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
