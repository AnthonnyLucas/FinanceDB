/* ═══════════════════════════════════════════════════════════
   routes/dml.js — Camada DML (Data Manipulation Language)
   SELECT, INSERT, UPDATE, DELETE
═══════════════════════════════════════════════════════════ */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { query } = require('../db');

// Lista de tabelas válidas (atualizada dinamicamente)
async function getValidTables() {
  const result = await query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
  );
  return result.rows.map(r => r.tablename);
}

// Validar nome da tabela contra SQL injection
async function validateTable(tableName, res) {
  const valid = await getValidTables();
  if (!valid.includes(tableName)) {
    res.status(400).json({ error: `Tabela "${tableName}" não existe.` });
    return false;
  }
  return true;
}

/**
 * GET /api/dml/:table
 * SELECT com paginação, busca e ordenação
 * Query params: page, limit, search, orderBy, order
 */
router.get('/:table', auth, async (req, res) => {
  try {
    const { table } = req.params;
    if (!(await validateTable(table, res))) return;

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
    const offset = (page - 1) * limit;
    const orderBy = req.query.orderBy || null;
    const order = req.query.order === 'desc' ? 'DESC' : 'ASC';
    const search = req.query.search || null;

    // Obter colunas da tabela
    const colsResult = await query(
      `SELECT column_name, data_type FROM information_schema.columns 
       WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
      [table]
    );
    const columns = colsResult.rows;
    const colNames = columns.map(c => c.column_name);

    // Construir query
    let sql = `SELECT * FROM "${table}"`;
    const params = [];

    // Busca em colunas texto
    if (search) {
      const textCols = columns.filter(c =>
        ['character varying', 'text', 'varchar', 'uuid'].includes(c.data_type)
      );
      if (textCols.length > 0) {
        const searchConditions = textCols.map((c, i) => {
          params.push(`%${search}%`);
          return `"${c.column_name}"::text ILIKE $${params.length}`;
        });
        sql += ` WHERE (${searchConditions.join(' OR ')})`;
      }
    }

    // Ordenação
    if (orderBy && colNames.includes(orderBy)) {
      sql += ` ORDER BY "${orderBy}" ${order}`;
    } else {
      sql += ` ORDER BY 1 ASC`;
    }

    // Contagem total (antes de paginação)
    let countSql = `SELECT count(*) as total FROM "${table}"`;
    if (search) {
      const textCols = columns.filter(c =>
        ['character varying', 'text', 'varchar', 'uuid'].includes(c.data_type)
      );
      if (textCols.length > 0) {
        const countParams = [];
        const searchConditions = textCols.map(c => {
          countParams.push(`%${search}%`);
          return `"${c.column_name}"::text ILIKE $${countParams.length}`;
        });
        countSql += ` WHERE (${searchConditions.join(' OR ')})`;
        var countResult = await query(countSql, countParams);
      } else {
        var countResult = await query(countSql);
      }
    } else {
      var countResult = await query(countSql);
    }
    const total = parseInt(countResult.rows[0].total);

    // Paginação
    params.push(limit);
    sql += ` LIMIT $${params.length}`;
    params.push(offset);
    sql += ` OFFSET $${params.length}`;

    const result = await query(sql, params);

    res.json({
      data: result.rows,
      columns: columns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/dml/:table
 * INSERT INTO
 */
router.post('/:table', auth, async (req, res) => {
  try {
    const { table } = req.params;
    if (!(await validateTable(table, res))) return;

    const data = req.body;
    if (!data || Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'Dados para inserção não fornecidos.' });
    }

    // Filtrar campos vazios e null
    const entries = Object.entries(data).filter(([, v]) => v !== '' && v !== null && v !== undefined);
    const cols = entries.map(([k]) => `"${k}"`);
    const placeholders = entries.map((_, i) => `$${i + 1}`);
    const values = entries.map(([, v]) => v);

    const sql = `INSERT INTO "${table}" (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
    const result = await query(sql, values);

    res.status(201).json({
      message: `Registro inserido com sucesso na tabela "${table}".`,
      data: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/dml/:table/:id
 * UPDATE ... WHERE id = :id
 */
router.put('/:table/:id', auth, async (req, res) => {
  try {
    const { table, id } = req.params;
    if (!(await validateTable(table, res))) return;

    const data = req.body;
    if (!data || Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'Dados para atualização não fornecidos.' });
    }

    const entries = Object.entries(data).filter(([k]) => k !== 'id');
    const setClauses = entries.map(([k], i) => `"${k}" = $${i + 1}`);
    const values = entries.map(([, v]) => v === '' ? null : v);
    values.push(id);

    const sql = `UPDATE "${table}" SET ${setClauses.join(', ')} WHERE id = $${values.length} RETURNING *`;
    const result = await query(sql, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: `Registro com id "${id}" não encontrado.` });
    }

    res.json({
      message: `Registro atualizado com sucesso na tabela "${table}".`,
      data: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/dml/:table/:id
 * DELETE FROM ... WHERE id = :id
 */
router.delete('/:table/:id', auth, async (req, res) => {
  try {
    const { table, id } = req.params;
    if (!(await validateTable(table, res))) return;

    const result = await query(`DELETE FROM "${table}" WHERE id = $1 RETURNING *`, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: `Registro com id "${id}" não encontrado.` });
    }

    res.json({
      message: `Registro excluído com sucesso da tabela "${table}".`,
      data: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
