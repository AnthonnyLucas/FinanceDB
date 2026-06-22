/* ═══════════════════════════════════════════════════════════
   server.js — FinanceDB Backend
   Express + PostgreSQL API Server
═══════════════════════════════════════════════════════════ */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { testConnection } = require('./db');

const app = express();
const PORT = parseInt(process.env.PORT || '3000');

// ─── Middleware Global ───────────────────────────────────

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

// Servir arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Logging de requisições
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const color = res.statusCode >= 400 ? '\x1b[31m' : '\x1b[32m';
    if (req.path.startsWith('/api')) {
      console.log(`  ${color}${req.method}\x1b[0m ${req.path} → ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// ─── Rotas da API ────────────────────────────────────────

app.use('/api/auth',      require('./routes/auth'));
app.use('/api/schema',    require('./routes/schema'));
app.use('/api/dml',       require('./routes/dml'));
app.use('/api/ddl',       require('./routes/ddl'));
app.use('/api/dcl',       require('./routes/dcl'));
app.use('/api/tcl',       require('./routes/tcl'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/frontend',  require('./routes/frontend'));

// ─── Rota de saúde ───────────────────────────────────────

app.get('/api/health', async (req, res) => {
  const dbOk = await testConnection();
  res.json({
    status: dbOk ? 'ok' : 'degraded',
    database: dbOk ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ─── Fallback: servir index.html para rotas não-API ──────

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
  }
});

// ─── Tratamento Global de Erros ──────────────────────────

app.use((err, req, res, _next) => {
  console.error('\x1b[31m  ✗ Erro não tratado:\x1b[0m', err.message);
  res.status(500).json({
    error: 'Erro interno do servidor.',
    detail: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ─── Iniciar Servidor ────────────────────────────────────

async function start() {
  console.log('\n═══════════════════════════════════════════');
  console.log('  FinanceDB — Backend API');
  console.log('═══════════════════════════════════════════\n');

  const dbOk = await testConnection();
  if (!dbOk) {
    console.error('\n  ✗ Não foi possível conectar ao PostgreSQL.');
    console.error('  Verifique se o serviço está rodando e as credenciais no .env estão corretas.\n');
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`\n  ✓ Servidor rodando em http://localhost:${PORT}`);
    console.log(`  ✓ API disponível em http://localhost:${PORT}/api`);
    console.log(`  ✓ Frontend em http://localhost:${PORT}\n`);
  });
}

start();
