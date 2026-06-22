/* ═══════════════════════════════════════════════════════════
   db.js — Pool de Conexão PostgreSQL
   FinanceDB Backend
═══════════════════════════════════════════════════════════ */

const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'financeiro_pessoal',
  user:     process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres123',
  max:      15,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Testar conexão ao iniciar
pool.on('connect', () => {
  console.log('  ✓ Nova conexão ao PostgreSQL estabelecida');
});

pool.on('error', (err) => {
  console.error('  ✗ Erro inesperado no pool PostgreSQL:', err.message);
});

/**
 * Executa uma query parametrizada
 * @param {string} text - SQL query com placeholders $1, $2, ...
 * @param {Array} params - Valores dos parâmetros
 * @returns {Promise<import('pg').QueryResult>}
 */
async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;

  if (duration > 1000) {
    console.warn(`  ⚠ Query lenta (${duration}ms):`, text.substring(0, 80));
  }

  return result;
}

/**
 * Obtém um client dedicado do pool (para transações)
 * Lembre-se de chamar client.release() quando terminar
 */
async function getClient() {
  const client = await pool.connect();
  return client;
}

/**
 * Verifica se a conexão com o banco está funcionando
 */
async function testConnection() {
  try {
    const result = await query('SELECT NOW() as now, current_database() as db');
    const { now, db } = result.rows[0];
    console.log(`  ✓ Conectado ao PostgreSQL — banco: ${db} — ${new Date(now).toLocaleString('pt-BR')}`);
    return true;
  } catch (err) {
    console.error('  ✗ Falha ao conectar ao PostgreSQL:', err.message);
    return false;
  }
}

module.exports = { pool, query, getClient, testConnection };
