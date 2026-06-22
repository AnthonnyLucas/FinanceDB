/* ═══════════════════════════════════════════════════════════
   routes/ddl.js — Camada DDL (Data Definition Language)
   CREATE TABLE, ALTER TABLE, TRUNCATE, DROP TABLE
═══════════════════════════════════════════════════════════ */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { query } = require('../db');
const { isProtected } = require('../config/protected-tables');

/**
 * POST /api/ddl/create-table
 * Cria uma nova tabela
 * Body: { name, columns: [{ name, type, nullable, default_value, primary_key }] }
 */
router.post('/create-table', auth, async (req, res) => {
  try {
    const { name, columns } = req.body;

    if (!name || !columns || columns.length === 0) {
      return res.status(400).json({ error: 'Nome da tabela e colunas são obrigatórios.' });
    }

    // Validar nome (apenas letras, números e underscore)
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      return res.status(400).json({ error: 'Nome da tabela contém caracteres inválidos.' });
    }

    // Verificar se tabela já existe
    const exists = await query(
      `SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = $1`, [name]
    );
    if (exists.rowCount > 0) {
      return res.status(409).json({ error: `Tabela "${name}" já existe.` });
    }

    // Montar colunas
    const colDefs = columns.map(col => {
      let def = `"${col.name}" ${col.type}`;
      if (col.primary_key) def += ' PRIMARY KEY';
      if (col.nullable === false && !col.primary_key) def += ' NOT NULL';
      if (col.default_value) def += ` DEFAULT ${col.default_value}`;
      return def;
    });

    // Adicionar coluna id UUID se nenhuma PK foi definida
    const hasPK = columns.some(c => c.primary_key);
    if (!hasPK) {
      colDefs.unshift('"id" UUID PRIMARY KEY DEFAULT gen_random_uuid()');
    }

    const sql = `CREATE TABLE "${name}" (\n  ${colDefs.join(',\n  ')}\n)`;
    await query(sql);

    res.status(201).json({
      message: `Tabela "${name}" criada com sucesso.`,
      sql
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/ddl/alter-table
 * Altera estrutura de uma tabela
 * Body: { table, action, column_name, column_type, new_name, nullable, default_value }
 * action: 'add_column' | 'drop_column' | 'rename_column' | 'alter_type'
 */
router.post('/alter-table', auth, async (req, res) => {
  try {
    const { table, action, column_name, column_type, new_name, nullable, default_value } = req.body;

    if (!table || !action) {
      return res.status(400).json({ error: 'Tabela e ação são obrigatórios.' });
    }

    let sql;

    switch (action) {
      case 'add_column':
        if (!column_name || !column_type) {
          return res.status(400).json({ error: 'Nome e tipo da coluna são obrigatórios.' });
        }
        sql = `ALTER TABLE "${table}" ADD COLUMN "${column_name}" ${column_type}`;
        if (nullable === false) sql += ' NOT NULL';
        if (default_value) sql += ` DEFAULT ${default_value}`;
        break;

      case 'drop_column':
        if (!column_name) {
          return res.status(400).json({ error: 'Nome da coluna é obrigatório.' });
        }
        sql = `ALTER TABLE "${table}" DROP COLUMN "${column_name}"`;
        break;

      case 'rename_column':
        if (!column_name || !new_name) {
          return res.status(400).json({ error: 'Nome atual e novo nome são obrigatórios.' });
        }
        sql = `ALTER TABLE "${table}" RENAME COLUMN "${column_name}" TO "${new_name}"`;
        break;

      case 'alter_type':
        if (!column_name || !column_type) {
          return res.status(400).json({ error: 'Nome da coluna e novo tipo são obrigatórios.' });
        }
        sql = `ALTER TABLE "${table}" ALTER COLUMN "${column_name}" TYPE ${column_type} USING "${column_name}"::${column_type}`;
        break;

      default:
        return res.status(400).json({ error: `Ação "${action}" não reconhecida.` });
    }

    await query(sql);

    res.json({
      message: `Tabela "${table}" alterada com sucesso (${action}).`,
      sql
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/ddl/truncate/:table
 * Esvazia uma tabela (TRUNCATE)
 * BLOQUEADO para tabelas protegidas
 */
router.post('/truncate/:table', auth, async (req, res) => {
  try {
    const { table } = req.params;

    if (isProtected(table)) {
      return res.status(403).json({
        error: `A tabela "${table}" é uma tabela original do sistema e não pode ser esvaziada (TRUNCATE).`,
        protected: true
      });
    }

    await query(`TRUNCATE TABLE "${table}" CASCADE`);

    res.json({
      message: `Tabela "${table}" esvaziada com sucesso (TRUNCATE).`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/ddl/drop/:table
 * Remove uma tabela (DROP TABLE)
 * BLOQUEADO para tabelas protegidas
 */
router.delete('/drop/:table', auth, async (req, res) => {
  try {
    const { table } = req.params;

    if (isProtected(table)) {
      return res.status(403).json({
        error: `A tabela "${table}" é uma tabela original do sistema e NÃO pode ser removida (DROP). Esta restrição é permanente e não pode ser contornada.`,
        protected: true
      });
    }

    await query(`DROP TABLE IF EXISTS "${table}" CASCADE`);

    res.json({
      message: `Tabela "${table}" removida com sucesso (DROP TABLE).`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
