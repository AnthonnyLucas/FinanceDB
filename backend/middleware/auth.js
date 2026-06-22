/* ═══════════════════════════════════════════════════════════
   auth.js — Middleware de Autenticação Admin (JWT)
═══════════════════════════════════════════════════════════ */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'financedb_default_secret';

/**
 * Middleware que verifica o token JWT no header Authorization.
 * Uso: router.get('/rota-protegida', authMiddleware, handler)
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Token de autenticação não fornecido.',
      code: 'NO_TOKEN'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Sessão expirada. Faça login novamente.',
        code: 'TOKEN_EXPIRED'
      });
    }
    return res.status(401).json({
      error: 'Token inválido.',
      code: 'INVALID_TOKEN'
    });
  }
}

module.exports = authMiddleware;
