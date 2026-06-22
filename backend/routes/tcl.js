/* ═══════════════════════════════════════════════════════════
   routes/tcl.js — Camada TCL (Transaction Control Language)
   BEGIN, COMMIT, ROLLBACK, SAVEPOINT
═══════════════════════════════════════════════════════════ */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getClient } = require('../db');

// Armazena transações ativas: Map<transactionId, { client, createdAt, operations }>
const activeTransactions = new Map();

// Auto-timeout: rollback transações abandonadas após 5 minutos
const TRANSACTION_TIMEOUT = 5 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [id, tx] of activeTransactions) {
    if (now - tx.createdAt > TRANSACTION_TIMEOUT) {
      console.warn(`  ⚠ Transação ${id} expirada — auto-ROLLBACK`);
      tx.client.query('ROLLBACK').catch(() => {});
      tx.client.release();
      activeTransactions.delete(id);
    }
  }
}, 30000);

// Gerar ID simples para transação
function generateTxId() {
  return 'tx_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
}

/**
 * POST /api/tcl/begin
 * Inicia uma nova transação
 */
router.post('/begin', auth, async (req, res) => {
  try {
    // Verificar se já existe transação ativa
    if (activeTransactions.size > 0) {
      const existingId = activeTransactions.keys().next().value;
      return res.status(409).json({
        error: 'Já existe uma transação ativa.',
        transactionId: existingId
      });
    }

    const client = await getClient();
    await client.query('BEGIN');

    const txId = generateTxId();
    activeTransactions.set(txId, {
      client,
      createdAt: Date.now(),
      operations: []
    });

    res.json({
      message: 'Transação iniciada com sucesso.',
      transactionId: txId,
      status: 'active'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/tcl/execute
 * Executa uma query dentro da transação ativa
 * Body: { transactionId, sql, params? }
 */
router.post('/execute', auth, async (req, res) => {
  try {
    const { transactionId, sql, params = [] } = req.body;

    if (!transactionId || !sql) {
      return res.status(400).json({ error: 'transactionId e sql são obrigatórios.' });
    }

    const tx = activeTransactions.get(transactionId);
    if (!tx) {
      return res.status(404).json({ error: 'Transação não encontrada ou expirada.' });
    }

    // Bloquear comandos perigosos dentro da transação
    const upperSql = sql.trim().toUpperCase();
    if (upperSql.startsWith('DROP DATABASE') || upperSql.startsWith('CREATE DATABASE')) {
      return res.status(403).json({ error: 'Comandos de banco de dados não são permitidos dentro de transações.' });
    }

    const result = await tx.client.query(sql, params);

    tx.operations.push({
      sql: sql.substring(0, 200),
      rowCount: result.rowCount,
      timestamp: new Date().toISOString()
    });

    res.json({
      message: 'Query executada com sucesso dentro da transação.',
      rowCount: result.rowCount,
      rows: result.rows ? result.rows.slice(0, 100) : [],
      fields: result.fields ? result.fields.map(f => ({ name: f.name, dataTypeID: f.dataTypeID })) : [],
      operationIndex: tx.operations.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message, hint: 'A transação ainda está ativa. Use ROLLBACK se necessário.' });
  }
});

/**
 * POST /api/tcl/commit
 * Confirma a transação (COMMIT)
 * Body: { transactionId }
 */
router.post('/commit', auth, async (req, res) => {
  try {
    const { transactionId } = req.body;

    const tx = activeTransactions.get(transactionId);
    if (!tx) {
      return res.status(404).json({ error: 'Transação não encontrada ou expirada.' });
    }

    await tx.client.query('COMMIT');
    tx.client.release();

    const summary = {
      transactionId,
      status: 'committed',
      duration: Date.now() - tx.createdAt,
      operationsCount: tx.operations.length,
      operations: tx.operations
    };

    activeTransactions.delete(transactionId);

    res.json({
      message: 'Transação confirmada com sucesso (COMMIT).',
      ...summary
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/tcl/rollback
 * Reverte a transação (ROLLBACK)
 * Body: { transactionId }
 */
router.post('/rollback', auth, async (req, res) => {
  try {
    const { transactionId } = req.body;

    const tx = activeTransactions.get(transactionId);
    if (!tx) {
      return res.status(404).json({ error: 'Transação não encontrada ou expirada.' });
    }

    await tx.client.query('ROLLBACK');
    tx.client.release();

    const summary = {
      transactionId,
      status: 'rolled_back',
      duration: Date.now() - tx.createdAt,
      operationsCount: tx.operations.length,
      operations: tx.operations
    };

    activeTransactions.delete(transactionId);

    res.json({
      message: 'Transação revertida com sucesso (ROLLBACK). Nenhuma alteração foi salva.',
      ...summary
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/tcl/status
 * Status da transação ativa (se existe)
 */
router.get('/status', auth, (req, res) => {
  if (activeTransactions.size === 0) {
    return res.json({
      active: false,
      message: 'Nenhuma transação ativa.'
    });
  }

  const [txId, tx] = activeTransactions.entries().next().value;
  res.json({
    active: true,
    transactionId: txId,
    duration: Date.now() - tx.createdAt,
    operationsCount: tx.operations.length,
    operations: tx.operations
  });
});

module.exports = router;
