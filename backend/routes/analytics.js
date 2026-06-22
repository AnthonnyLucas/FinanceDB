/* ═══════════════════════════════════════════════════════════
   routes/analytics.js — Dados Analíticos por Usuário
   Score de saúde financeira, métricas, dados para gráficos
═══════════════════════════════════════════════════════════ */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { query } = require('../db');

/**
 * GET /api/analytics/users
 * Lista todos os usuários (para o seletor)
 */
router.get('/users', auth, async (req, res) => {
  try {
    const result = await query(`
      SELECT id, nome, email, plano, data_cadastro, ativo, telefone
      FROM usuario ORDER BY nome
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/analytics/users/overview
 * Métricas agregadas de saúde de todos os usuários
 */
router.get('/users/overview', auth, async (req, res) => {
  try {
    // Todos os usuários
    const usersResult = await query(`SELECT id, nome, email, plano, ativo FROM usuario ORDER BY nome`);
    const users = usersResult.rows;

    const overview = [];
    let excelente = 0, bom = 0, regular = 0, ruim = 0, critico = 0;
    let totalScore = 0;

    for (const u of users) {
      let score = 0;

      // 1. Saldo positivo (até 20 pts)
      const saldo = await query(`SELECT COALESCE(SUM(saldo_atual), 0) AS t FROM conta WHERE usuario_id = $1 AND ativa = TRUE`, [u.id]);
      const saldoVal = parseFloat(saldo.rows[0].t);
      score += Math.min(20, saldoVal > 0 ? Math.round(saldoVal / 500) : 0);

      // 2. Receita > Despesa (até 25 pts)
      const rvd = await query(`
        SELECT COALESCE(SUM(CASE WHEN l.tipo = 'receita' THEN l.valor ELSE 0 END), 0) AS rec,
               COALESCE(SUM(CASE WHEN l.tipo = 'despesa' THEN l.valor ELSE 0 END), 0) AS desp
        FROM lancamento l JOIN conta c ON c.id = l.conta_id
        WHERE c.usuario_id = $1 AND l.status = 'confirmado'
      `, [u.id]);
      const rec = parseFloat(rvd.rows[0].rec);
      const desp = parseFloat(rvd.rows[0].desp);
      if (rec > 0) {
        score += Math.max(0, Math.min(25, Math.round(((rec - desp) / rec) * 50)));
      }

      // 3. Metas (até 15 pts)
      const metas = await query(`
        SELECT COALESCE(AVG(valor_atual / NULLIF(valor_alvo, 0) * 100) FILTER (WHERE status = 'ativa'), 0) AS prog
        FROM meta WHERE usuario_id = $1
      `, [u.id]);
      score += Math.min(15, Math.round(parseFloat(metas.rows[0].prog) / 100 * 15));

      // 4. Investimentos (até 20 pts)
      const inv = await query(`SELECT COUNT(*) AS c, COALESCE(SUM(valor_atual), 0) AS v FROM investimento WHERE usuario_id = $1`, [u.id]);
      score += Math.min(20, parseInt(inv.rows[0].c) * 5 + (parseFloat(inv.rows[0].v) > 0 ? 5 : 0));

      // 5. Faturas em dia (até 20 pts)
      const fat = await query(`
        SELECT COUNT(*) AS t, COUNT(*) FILTER (WHERE paga = TRUE) AS p
        FROM fatura f JOIN cartao_credito cc ON cc.id = f.cartao_id JOIN conta c ON c.id = cc.conta_id
        WHERE c.usuario_id = $1
      `, [u.id]);
      const totalFat = parseInt(fat.rows[0].t);
      const pagasFat = parseInt(fat.rows[0].p);
      score += totalFat > 0 ? Math.round((pagasFat / totalFat) * 20) : 20;

      score = Math.min(100, score);
      totalScore += score;

      let classification;
      if (score >= 80) { classification = 'Excelente'; excelente++; }
      else if (score >= 60) { classification = 'Bom'; bom++; }
      else if (score >= 40) { classification = 'Regular'; regular++; }
      else if (score >= 20) { classification = 'Ruim'; ruim++; }
      else { classification = 'Crítico'; critico++; }

      overview.push({ id: u.id, nome: u.nome, email: u.email, plano: u.plano, ativo: u.ativo, score, classification });
    }

    res.json({
      users: overview,
      summary: {
        total: users.length,
        excelente, bom, regular, ruim, critico,
        score_medio: users.length > 0 ? Math.round(totalScore / users.length) : 0
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/analytics/users/:id/summary
 * Resumo financeiro completo de um usuário
 */
router.get('/users/:id/summary', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Dados do usuário
    const userResult = await query(`SELECT * FROM usuario WHERE id = $1`, [id]);
    if (userResult.rowCount === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    const user = userResult.rows[0];

    // Saldo total de contas
    const saldoResult = await query(`
      SELECT COALESCE(SUM(saldo_atual), 0) AS saldo_total,
             COUNT(*) AS total_contas
      FROM conta WHERE usuario_id = $1 AND ativa = TRUE
    `, [id]);

    // Receitas do mês atual
    const receitasResult = await query(`
      SELECT COALESCE(SUM(l.valor), 0) AS total
      FROM lancamento l
      JOIN conta c ON c.id = l.conta_id
      WHERE c.usuario_id = $1 
        AND l.tipo = 'receita' 
        AND l.status = 'confirmado'
        AND DATE_TRUNC('month', l.data_lancamento) = DATE_TRUNC('month', CURRENT_DATE)
    `, [id]);

    // Despesas do mês atual
    const despesasResult = await query(`
      SELECT COALESCE(SUM(l.valor), 0) AS total,
             COUNT(*) AS count
      FROM lancamento l
      JOIN conta c ON c.id = l.conta_id
      WHERE c.usuario_id = $1 
        AND l.tipo = 'despesa' 
        AND l.status = 'confirmado'
        AND DATE_TRUNC('month', l.data_lancamento) = DATE_TRUNC('month', CURRENT_DATE)
    `, [id]);

    // Total investido
    const investResult = await query(`
      SELECT COALESCE(SUM(valor_atual), 0) AS total_investido,
             COUNT(*) AS total_ativos
      FROM investimento WHERE usuario_id = $1
    `, [id]);

    // Metas
    const metasResult = await query(`
      SELECT COUNT(*) AS total,
             COUNT(*) FILTER (WHERE status = 'ativa') AS ativas,
             COALESCE(AVG(valor_atual / NULLIF(valor_alvo, 0) * 100), 0) AS progresso_medio
      FROM meta WHERE usuario_id = $1
    `, [id]);

    // Faturas pendentes
    const faturasResult = await query(`
      SELECT COALESCE(SUM(f.valor_total), 0) AS total_pendente,
             COUNT(*) AS count
      FROM fatura f
      JOIN cartao_credito cc ON cc.id = f.cartao_id
      JOIN conta c ON c.id = cc.conta_id
      WHERE c.usuario_id = $1 AND f.paga = FALSE
    `, [id]);

    const saldo = parseFloat(saldoResult.rows[0].saldo_total);
    const receitas = parseFloat(receitasResult.rows[0].total);
    const despesas = parseFloat(despesasResult.rows[0].total);
    const investimentos = parseFloat(investResult.rows[0].total_investido);
    const patrimonio = saldo + investimentos;
    const balanco = receitas - despesas;
    const taxaPoupanca = receitas > 0 ? ((balanco / receitas) * 100) : 0;

    res.json({
      user: { id: user.id, nome: user.nome, email: user.email, plano: user.plano, telefone: user.telefone, data_cadastro: user.data_cadastro, ativo: user.ativo },
      kpis: {
        saldo_total: saldo,
        total_contas: parseInt(saldoResult.rows[0].total_contas),
        receitas_mes: receitas,
        despesas_mes: despesas,
        num_despesas: parseInt(despesasResult.rows[0].count),
        balanco_mes: balanco,
        total_investido: investimentos,
        total_ativos: parseInt(investResult.rows[0].total_ativos),
        patrimonio_liquido: patrimonio,
        taxa_poupanca: Math.round(taxaPoupanca * 100) / 100,
        faturas_pendentes: parseFloat(faturasResult.rows[0].total_pendente),
        num_faturas_pendentes: parseInt(faturasResult.rows[0].count)
      },
      metas: {
        total: parseInt(metasResult.rows[0].total),
        ativas: parseInt(metasResult.rows[0].ativas),
        progresso_medio: Math.round(parseFloat(metasResult.rows[0].progresso_medio) * 100) / 100
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/analytics/users/:id/monthly
 * Receitas vs Despesas por mês (últimos 6 meses)
 */
router.get('/users/:id/monthly', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', l.data_lancamento), 'YYYY-MM') AS mes,
        TO_CHAR(DATE_TRUNC('month', l.data_lancamento), 'Mon/YY') AS label,
        SUM(CASE WHEN l.tipo = 'receita' THEN l.valor ELSE 0 END) AS receitas,
        SUM(CASE WHEN l.tipo = 'despesa' THEN l.valor ELSE 0 END) AS despesas
      FROM lancamento l
      JOIN conta c ON c.id = l.conta_id
      WHERE c.usuario_id = $1 AND l.status = 'confirmado'
      GROUP BY DATE_TRUNC('month', l.data_lancamento)
      ORDER BY mes DESC
      LIMIT 6
    `, [id]);

    res.json(result.rows.reverse());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/analytics/users/:id/categories
 * Gastos por categoria
 */
router.get('/users/:id/categories', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT 
        COALESCE(cat.nome, 'Sem categoria') AS categoria,
        COALESCE(cat.cor, '#666666') AS cor,
        SUM(l.valor) AS total,
        COUNT(*) AS count
      FROM lancamento l
      JOIN conta c ON c.id = l.conta_id
      LEFT JOIN categoria cat ON cat.id = l.categoria_id
      WHERE c.usuario_id = $1 AND l.tipo = 'despesa' AND l.status = 'confirmado'
      GROUP BY cat.nome, cat.cor
      ORDER BY total DESC
    `, [id]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/analytics/users/:id/accounts
 * Contas com saldos
 */
router.get('/users/:id/accounts', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(`
      SELECT c.*, cb.banco_codigo, cb.agencia, cb.numero_conta, cb.status_sincronizacao
      FROM conta c
      LEFT JOIN conta_bancaria cb ON cb.conta_id = c.id
      WHERE c.usuario_id = $1
      ORDER BY c.saldo_atual DESC
    `, [id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/analytics/users/:id/investments
 * Carteira de investimentos
 */
router.get('/users/:id/investments', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(`
      SELECT i.*, 
             (i.valor_atual - (i.preco_medio * i.quantidade)) AS lucro_prejuizo,
             CASE WHEN (i.preco_medio * i.quantidade) > 0 
                  THEN ROUND(((i.valor_atual - (i.preco_medio * i.quantidade)) / (i.preco_medio * i.quantidade)) * 100, 2)
                  ELSE 0 END AS rentabilidade_pct
      FROM investimento i
      WHERE i.usuario_id = $1
      ORDER BY i.valor_atual DESC
    `, [id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/analytics/users/:id/goals
 * Metas com progresso
 */
router.get('/users/:id/goals', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(`
      SELECT m.*,
             ROUND((m.valor_atual / NULLIF(m.valor_alvo, 0) * 100), 1) AS progresso_pct,
             (m.valor_alvo - m.valor_atual) AS valor_restante
      FROM meta m
      WHERE m.usuario_id = $1
      ORDER BY m.status, m.data_fim
    `, [id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/analytics/users/:id/health-score
 * Score de saúde financeira (0-100)
 */
router.get('/users/:id/health-score', auth, async (req, res) => {
  try {
    const { id } = req.params;
    let score = 0;
    const factors = [];

    // 1. Saldo positivo? (até 20 pontos)
    const saldo = await query(`SELECT COALESCE(SUM(saldo_atual), 0) AS total FROM conta WHERE usuario_id = $1 AND ativa = TRUE`, [id]);
    const saldoTotal = parseFloat(saldo.rows[0].total);
    if (saldoTotal > 0) {
      const saldoPts = Math.min(20, Math.round(saldoTotal / 500));
      score += saldoPts;
      factors.push({ name: 'Saldo positivo', score: saldoPts, max: 20, detail: `R$ ${saldoTotal.toFixed(2)}` });
    } else {
      factors.push({ name: 'Saldo positivo', score: 0, max: 20, detail: 'Saldo negativo ou zerado' });
    }

    // 2. Receitas > Despesas? (até 25 pontos)
    const rvd = await query(`
      SELECT 
        COALESCE(SUM(CASE WHEN l.tipo = 'receita' THEN l.valor ELSE 0 END), 0) AS rec,
        COALESCE(SUM(CASE WHEN l.tipo = 'despesa' THEN l.valor ELSE 0 END), 0) AS desp
      FROM lancamento l JOIN conta c ON c.id = l.conta_id
      WHERE c.usuario_id = $1 AND l.status = 'confirmado'
    `, [id]);
    const rec = parseFloat(rvd.rows[0].rec);
    const desp = parseFloat(rvd.rows[0].desp);
    if (rec > 0) {
      const ratio = (rec - desp) / rec;
      const rvdPts = Math.max(0, Math.min(25, Math.round(ratio * 50)));
      score += rvdPts;
      factors.push({ name: 'Relação receita/despesa', score: rvdPts, max: 25, detail: `${(ratio * 100).toFixed(1)}% de margem` });
    } else {
      factors.push({ name: 'Relação receita/despesa', score: 0, max: 25, detail: 'Sem receitas registradas' });
    }

    // 3. Metas em andamento (até 15 pontos)
    const metas = await query(`
      SELECT COUNT(*) FILTER (WHERE status = 'ativa') AS ativas,
             COALESCE(AVG(valor_atual / NULLIF(valor_alvo, 0) * 100) FILTER (WHERE status = 'ativa'), 0) AS prog
      FROM meta WHERE usuario_id = $1
    `, [id]);
    const metaProg = parseFloat(metas.rows[0].prog);
    const metaPts = Math.min(15, Math.round(metaProg / 100 * 15));
    score += metaPts;
    factors.push({ name: 'Progresso de metas', score: metaPts, max: 15, detail: `${metaProg.toFixed(1)}% de progresso médio` });

    // 4. Investimentos diversificados (até 20 pontos)
    const inv = await query(`
      SELECT COUNT(*) AS total, COALESCE(SUM(valor_atual), 0) AS valor
      FROM investimento WHERE usuario_id = $1
    `, [id]);
    const numInv = parseInt(inv.rows[0].total);
    const invPts = Math.min(20, numInv * 5 + (parseFloat(inv.rows[0].valor) > 0 ? 5 : 0));
    score += invPts;
    factors.push({ name: 'Investimentos', score: invPts, max: 20, detail: `${numInv} ativo(s)` });

    // 5. Faturas em dia (até 20 pontos)
    const fat = await query(`
      SELECT COUNT(*) AS total,
             COUNT(*) FILTER (WHERE paga = TRUE) AS pagas
      FROM fatura f
      JOIN cartao_credito cc ON cc.id = f.cartao_id
      JOIN conta c ON c.id = cc.conta_id
      WHERE c.usuario_id = $1
    `, [id]);
    const totalFat = parseInt(fat.rows[0].total);
    const pagasFat = parseInt(fat.rows[0].pagas);
    const fatPts = totalFat > 0 ? Math.round((pagasFat / totalFat) * 20) : 20;
    score += fatPts;
    factors.push({ name: 'Faturas em dia', score: fatPts, max: 20, detail: totalFat > 0 ? `${pagasFat}/${totalFat} pagas` : 'Sem faturas' });

    // Classificação
    let classification;
    if (score >= 80) classification = 'Excelente';
    else if (score >= 60) classification = 'Bom';
    else if (score >= 40) classification = 'Regular';
    else if (score >= 20) classification = 'Ruim';
    else classification = 'Crítico';

    res.json({ score: Math.min(100, score), classification, factors });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
