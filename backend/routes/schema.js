/* ═══════════════════════════════════════════════════════════
   routes/schema.js — Consulta de Esquema do Banco de Dados
═══════════════════════════════════════════════════════════ */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { query } = require('../db');
const { isProtected } = require('../config/protected-tables');

/**
 * GET /api/schema/tables
 * Lista todas as tabelas do schema public com flag de proteção
 */
router.get('/tables', auth, async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        t.tablename AS name,
        pg_size_pretty(pg_total_relation_size(quote_ident(t.tablename))) AS size,
        (SELECT count(*) FROM information_schema.columns c 
         WHERE c.table_schema = 'public' AND c.table_name = t.tablename) AS column_count,
        obj_description((quote_ident(t.tablename))::regclass, 'pg_class') AS comment
      FROM pg_tables t
      WHERE t.schemaname = 'public'
      ORDER BY t.tablename
    `);

    const tables = result.rows.map(t => ({
      ...t,
      protected: isProtected(t.name),
      column_count: parseInt(t.column_count)
    }));

    // Adicionar contagem de registros para cada tabela
    for (const table of tables) {
      try {
        const countResult = await query(`SELECT count(*) as count FROM "${table.name}"`);
        table.row_count = parseInt(countResult.rows[0].count);
      } catch {
        table.row_count = 0;
      }
    }

    res.json(tables);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/schema/tables/:name/columns
 * Colunas detalhadas de uma tabela
 */
router.get('/tables/:name/columns', auth, async (req, res) => {
  try {
    const { name } = req.params;

    const result = await query(`
      SELECT 
        c.column_name,
        c.data_type,
        c.udt_name,
        c.character_maximum_length,
        c.numeric_precision,
        c.numeric_scale,
        c.is_nullable,
        c.column_default,
        c.ordinal_position,
        -- Verificar se é PK
        EXISTS (
          SELECT 1 FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
          WHERE tc.table_name = c.table_name 
            AND tc.constraint_type = 'PRIMARY KEY'
            AND kcu.column_name = c.column_name
            AND tc.table_schema = 'public'
        ) AS is_primary_key,
        -- Verificar se é FK
        (
          SELECT ccu.table_name FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
          JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
          WHERE tc.table_name = c.table_name 
            AND tc.constraint_type = 'FOREIGN KEY'
            AND kcu.column_name = c.column_name
            AND tc.table_schema = 'public'
          LIMIT 1
        ) AS fk_references
      FROM information_schema.columns c
      WHERE c.table_schema = 'public' AND c.table_name = $1
      ORDER BY c.ordinal_position
    `, [name]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/schema/tables/:name/constraints
 * Constraints de uma tabela (CHECK, UNIQUE, FK)
 */
router.get('/tables/:name/constraints', auth, async (req, res) => {
  try {
    const { name } = req.params;

    const result = await query(`
      SELECT 
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table,
        ccu.column_name AS foreign_column,
        pg_get_constraintdef(pgc.oid) AS check_clause
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      LEFT JOIN information_schema.constraint_column_usage ccu 
        ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
      LEFT JOIN pg_constraint pgc 
        ON pgc.conname = tc.constraint_name
      WHERE tc.table_name = $1 AND tc.table_schema = 'public'
      ORDER BY tc.constraint_type, tc.constraint_name
    `, [name]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/schema/relationships
 * Mapa completo de chaves estrangeiras
 */
router.get('/relationships', auth, async (req, res) => {
  try {
    const result = await query(`
      SELECT
        tc.table_name AS source_table,
        kcu.column_name AS source_column,
        ccu.table_name AS target_table,
        ccu.column_name AS target_column,
        rc.delete_rule
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu 
        ON tc.constraint_name = ccu.constraint_name
      JOIN information_schema.referential_constraints rc 
        ON tc.constraint_name = rc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.column_name
    `);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
