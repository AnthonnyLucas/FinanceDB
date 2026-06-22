/* ═══════════════════════════════════════════════════════════
   routes/auth.js — Autenticação Admin
═══════════════════════════════════════════════════════════ */

const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'financedb_default_secret';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'Admin_DB@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'AdminDB123';

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Retorna: { token, expiresIn }
 */
router.post('/login', (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const password = (req.body.password || '').trim();

  if (!email || !password) {
    return res.status(400).json({
      error: 'Email e senha são obrigatórios.'
    });
  }

  if (email !== ADMIN_EMAIL.toLowerCase() || password !== ADMIN_PASSWORD) {
    return res.status(401).json({
      error: 'Credenciais inválidas. Verifique o email e a senha.'
    });
  }

  const token = jwt.sign(
    { email, role: 'admin', iat: Math.floor(Date.now() / 1000) },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({
    token,
    expiresIn: '8h',
    message: 'Login realizado com sucesso.'
  });
});

/**
 * GET /api/auth/verify
 * Header: Authorization: Bearer <token>
 * Verifica se o token é válido
 */
router.get('/verify', (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ valid: false });
  }

  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    res.json({ valid: true, email: decoded.email, role: decoded.role });
  } catch {
    res.status(401).json({ valid: false });
  }
});

module.exports = router;
