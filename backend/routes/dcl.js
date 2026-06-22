/* ═══════════════════════════════════════════════════════════
   routes/dcl.js — Camada DCL (Data Control Language)
   GRANT, REVOKE, Gerenciamento de Roles
═══════════════════════════════════════════════════════════ */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { query } = require('../db');

/**
 * GET /api/dcl/roles
 * Lista todos os roles/usuários do PostgreSQL
 */
router.get('/roles', auth, async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        r.rolname AS name,
        r.rolsuper AS is_superuser,
        r.rolcreatedb AS can_create_db,
        r.rolcreaterole AS can_create_role,
        r.rolcanlogin AS can_login,
        r.rolconnlimit AS connection_limit,
        r.rolvaliduntil AS valid_until
      FROM pg_roles r
      WHERE r.rolname NOT LIKE 'pg_%'
      ORDER BY r.rolname
    `);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/dcl/privileges/:table
 * Privilégios de cada role em uma tabela específica
 */
router.get('/privileges/:table', auth, async (req, res) => {
  try {
    const { table } = req.params;

    const result = await query(`
      SELECT 
        grantee,
        privilege_type,
        is_grantable
      FROM information_schema.table_privileges
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY grantee, privilege_type
    `, [table]);

    // Agrupar por role
    const grouped = {};
    result.rows.forEach(row => {
      if (!grouped[row.grantee]) {
        grouped[row.grantee] = { grantee: row.grantee, privileges: {} };
      }
      grouped[row.grantee].privileges[row.privilege_type] = {
        granted: true,
        is_grantable: row.is_grantable === 'YES'
      };
    });

    res.json(Object.values(grouped));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/dcl/grant
 * Concede privilégio
 * Body: { privilege, table, role }
 * privilege: SELECT | INSERT | UPDATE | DELETE | ALL PRIVILEGES
 */
router.post('/grant', auth, async (req, res) => {
  try {
    const { privilege, table, role } = req.body;

    if (!privilege || !table || !role) {
      return res.status(400).json({ error: 'Privilégio, tabela e role são obrigatórios.' });
    }

    const validPrivileges = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'ALL PRIVILEGES', 'TRUNCATE', 'REFERENCES', 'TRIGGER'];
    if (!validPrivileges.includes(privilege.toUpperCase())) {
      return res.status(400).json({ error: `Privilégio "${privilege}" não é válido.` });
    }

    const sql = `GRANT ${privilege.toUpperCase()} ON "${table}" TO "${role}"`;
    await query(sql);

    res.json({
      message: `Privilégio ${privilege} concedido em "${table}" para "${role}".`,
      sql
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/dcl/revoke
 * Revoga privilégio
 * Body: { privilege, table, role }
 */
router.post('/revoke', auth, async (req, res) => {
  try {
    const { privilege, table, role } = req.body;

    if (!privilege || !table || !role) {
      return res.status(400).json({ error: 'Privilégio, tabela e role são obrigatórios.' });
    }

    const sql = `REVOKE ${privilege.toUpperCase()} ON "${table}" FROM "${role}"`;
    await query(sql);

    res.json({
      message: `Privilégio ${privilege} revogado de "${table}" para "${role}".`,
      sql
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/dcl/create-role
 * Cria um novo role
 * Body: { name, password, can_login, can_create_db }
 */
router.post('/create-role', auth, async (req, res) => {
  try {
    const { name, password, can_login = true, can_create_db = false } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Nome do role é obrigatório.' });
    }

    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      return res.status(400).json({ error: 'Nome do role contém caracteres inválidos.' });
    }

    let sql = `CREATE ROLE "${name}"`;
    const options = [];
    if (can_login) options.push('LOGIN');
    if (can_create_db) options.push('CREATEDB');
    if (password) options.push(`PASSWORD '${password}'`);
    if (options.length) sql += ' WITH ' + options.join(' ');

    await query(sql);

    res.status(201).json({
      message: `Role "${name}" criado com sucesso.`,
      sql: sql.replace(/PASSWORD '[^']*'/, "PASSWORD '***'") // Mascarar senha no retorno
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/dcl/drop-role/:name
 * Remove um role
 */
router.delete('/drop-role/:name', auth, async (req, res) => {
  try {
    const { name } = req.params;

    // Proteger superusuários
    const roleCheck = await query(`SELECT rolsuper FROM pg_roles WHERE rolname = $1`, [name]);
    if (roleCheck.rows.length > 0 && roleCheck.rows[0].rolsuper) {
      return res.status(403).json({ error: `Não é possível remover o superusuário "${name}".` });
    }

    await query(`DROP ROLE IF EXISTS "${name}"`);

    res.json({ message: `Role "${name}" removido com sucesso.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
