-- ============================================================
--  SISTEMA DE CONTROLE FINANCEIRO PESSOAL
--  PostgreSQL 13+ 
--
--  Autores: Anthonny Lucas Santos da Silva
--           Déborah Camilly Barbosa Leal Silva
--           Gabriel Renan Silva Martins Guimaraes
--           José Cledenor Bezerra Leite
--           José Guilherme Torres Lima
--
--  Entidades  : 18
--  Relacionamentos: 21 (3× 1-1 | 15× 1-N | 3× N-N)
-- ============================================================


-- ============================================================
--  0. LIMPEZA — garante idempotência (pode rodar múltiplas vezes)
-- ============================================================

DROP TABLE IF EXISTS regra_classificacao    CASCADE;
DROP TABLE IF EXISTS lembrete               CASCADE;
DROP TABLE IF EXISTS operacao_investimento  CASCADE;
DROP TABLE IF EXISTS investimento           CASCADE;
DROP TABLE IF EXISTS meta                   CASCADE;
DROP TABLE IF EXISTS lancamento_centro      CASCADE;
DROP TABLE IF EXISTS lancamento_tag         CASCADE;
DROP TABLE IF EXISTS lancamento             CASCADE;
DROP TABLE IF EXISTS fatura                 CASCADE;
DROP TABLE IF EXISTS cartao_credito         CASCADE;
DROP TABLE IF EXISTS projeto                CASCADE;
DROP TABLE IF EXISTS centro                 CASCADE;
DROP TABLE IF EXISTS tag                    CASCADE;
DROP TABLE IF EXISTS categoria              CASCADE;
DROP TABLE IF EXISTS conta_bancaria         CASCADE;
DROP TABLE IF EXISTS conta                  CASCADE;
DROP TABLE IF EXISTS usuario_adicional      CASCADE;
DROP TABLE IF EXISTS usuario                CASCADE;


-- ============================================================
--  1. USUARIO
--     Entidade central do sistema. Suporta planos free/pro/premium.
-- ============================================================

CREATE TABLE usuario (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    nome          VARCHAR(120) NOT NULL,
    email         VARCHAR(180) NOT NULL UNIQUE,
    senha_hash    VARCHAR(255) NOT NULL,
    telefone      VARCHAR(20),
    plano         VARCHAR(30)  NOT NULL DEFAULT 'free'
                    CHECK (plano IN ('free', 'pro', 'premium')),
    data_cadastro DATE         NOT NULL DEFAULT CURRENT_DATE,
    ativo         BOOLEAN      NOT NULL DEFAULT TRUE
);


-- ============================================================
--  2. USUARIO_ADICIONAL
--     Relacionamento N-N reflexivo entre usuários.
--     Permite compartilhamento de acesso com níveis de permissão.
--     Relacionamento: N-N (usuario × usuario)
-- ============================================================

CREATE TABLE usuario_adicional (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_titular_id   UUID        NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    usuario_convidado_id UUID        NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    permissao            VARCHAR(20) NOT NULL DEFAULT 'leitura'
                           CHECK (permissao IN ('leitura', 'edicao', 'admin')),
    ativo                BOOLEAN     NOT NULL DEFAULT TRUE,
    data_convite         DATE        NOT NULL DEFAULT CURRENT_DATE,
    CONSTRAINT uq_convite       UNIQUE (usuario_titular_id, usuario_convidado_id),
    CONSTRAINT chk_auto_convite CHECK  (usuario_titular_id <> usuario_convidado_id)
);


-- ============================================================
--  3. CONTA
--     Representa qualquer tipo de conta financeira do usuário.
--     Relacionamento: 1-N (usuario → conta)
-- ============================================================

CREATE TABLE conta (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id    UUID          NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    nome          VARCHAR(100)  NOT NULL,
    tipo          VARCHAR(30)   NOT NULL
                    CHECK (tipo IN ('corrente', 'poupanca', 'carteira', 'cripto', 'exterior', 'outro')),
    instituicao   VARCHAR(100),
    saldo_inicial NUMERIC(15,2) NOT NULL DEFAULT 0,
    saldo_atual   NUMERIC(15,2) NOT NULL DEFAULT 0,
    moeda         CHAR(3)       NOT NULL DEFAULT 'BRL',
    sincronizada  BOOLEAN       NOT NULL DEFAULT FALSE,
    ativa         BOOLEAN       NOT NULL DEFAULT TRUE
);


-- ============================================================
--  4. CONTA_BANCARIA
--     Extensão 1-1 de CONTA com dados bancários e Open Finance.
--     Relacionamento: 1-1 (conta ↔ conta_bancaria)
-- ============================================================

CREATE TABLE conta_bancaria (
    id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    conta_id             UUID        NOT NULL UNIQUE REFERENCES conta(id) ON DELETE CASCADE,
    banco_codigo         VARCHAR(10),
    agencia              VARCHAR(10),
    numero_conta         VARCHAR(20),
    token_open_finance   TEXT,
    ultima_sincronizacao TIMESTAMP,
    status_sincronizacao VARCHAR(20) NOT NULL DEFAULT 'pendente'
                           CHECK (status_sincronizacao IN ('pendente', 'ok', 'erro'))
);


-- ============================================================
--  5. CARTAO_CREDITO
--     Cartão vinculado a uma conta. Controla limite e datas do ciclo.
--     Relacionamento: 1-N (conta → cartao_credito)
-- ============================================================

CREATE TABLE cartao_credito (
    id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    conta_id          UUID          NOT NULL REFERENCES conta(id) ON DELETE CASCADE,
    bandeira          VARCHAR(30),
    nome              VARCHAR(100),
    limite            NUMERIC(15,2) NOT NULL DEFAULT 0,
    limite_disponivel NUMERIC(15,2) NOT NULL DEFAULT 0,
    dia_fechamento    SMALLINT      NOT NULL CHECK (dia_fechamento BETWEEN 1 AND 31),
    dia_vencimento    SMALLINT      NOT NULL CHECK (dia_vencimento BETWEEN 1 AND 31),
    ultimos_digitos   CHAR(4)
);


-- ============================================================
--  6. CATEGORIA
--     Hierárquica: uma categoria pode ter subcategorias.
--     Pode ser global (padrao = TRUE) ou personalizada por usuário.
--     Relacionamentos: 1-N (usuario → categoria) + auto-relacionamento hierárquico
-- ============================================================

CREATE TABLE categoria (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id       UUID        REFERENCES usuario(id) ON DELETE CASCADE,
    categoria_pai_id UUID        REFERENCES categoria(id) ON DELETE SET NULL,
    nome             VARCHAR(80) NOT NULL,
    tipo             VARCHAR(10) NOT NULL CHECK (tipo IN ('receita', 'despesa', 'ambos')),
    cor              VARCHAR(7),
    icone            VARCHAR(50),
    padrao           BOOLEAN     NOT NULL DEFAULT FALSE
);


-- ============================================================
--  7. TAG
--     Etiquetas livres criadas por usuário para marcar lançamentos.
--     Relacionamento: 1-N (usuario → tag)
-- ============================================================

CREATE TABLE tag (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID        NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    nome       VARCHAR(60) NOT NULL,
    cor        VARCHAR(7),
    CONSTRAINT uq_tag_usuario UNIQUE (usuario_id, nome)
);


-- ============================================================
--  8. PROJETO
--     Agrupamento temporário de lançamentos (ex: reforma, viagem).
--     Relacionamento: 1-N (usuario → projeto)
-- ============================================================

CREATE TABLE projeto (
    id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id  UUID          NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    nome        VARCHAR(120)  NOT NULL,
    orcamento   NUMERIC(15,2) NOT NULL DEFAULT 0,
    gasto_total NUMERIC(15,2) NOT NULL DEFAULT 0,
    data_inicio DATE,
    data_fim    DATE,
    status      VARCHAR(20)   NOT NULL DEFAULT 'ativo'
                  CHECK (status IN ('ativo', 'pausado', 'concluido', 'cancelado'))
);


-- ============================================================
--  9. CENTRO
--     Centro de custo permanente (ex: carro, filho, pet).
--     Relacionamento: 1-N (usuario → centro)
-- ============================================================

CREATE TABLE centro (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID        NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    nome       VARCHAR(80) NOT NULL,
    tipo       VARCHAR(30),
    descricao  TEXT,
    ativo      BOOLEAN     NOT NULL DEFAULT TRUE
);


-- ============================================================
-- 10. FATURA
--     Fatura mensal de um cartão de crédito.
--     UNIQUE em (cartao_id, data_fechamento) garante 1 fatura por ciclo.
--     Relacionamentos: 1-N (cartao_credito → fatura)
--                      1-1 por ciclo (cartao_credito ↔ fatura via UNIQUE)
-- ============================================================

CREATE TABLE fatura (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    cartao_id       UUID          NOT NULL REFERENCES cartao_credito(id) ON DELETE CASCADE,
    data_fechamento DATE          NOT NULL,
    data_vencimento DATE          NOT NULL,
    valor_total     NUMERIC(15,2) NOT NULL DEFAULT 0,
    status          VARCHAR(20)   NOT NULL DEFAULT 'aberta'
                      CHECK (status IN ('aberta', 'fechada', 'paga', 'vencida')),
    paga            BOOLEAN       NOT NULL DEFAULT FALSE,
    CONSTRAINT uq_fatura_ciclo UNIQUE (cartao_id, data_fechamento)
);


-- ============================================================
-- 11. LANCAMENTO
--     Núcleo do sistema: toda movimentação financeira.
--     Suporta auto-referência para lançamentos recorrentes (pai-filho).
--     Relacionamentos: 1-N (conta → lancamento)
--                      1-N (fatura → lancamento)
--                      1-1 auto-ref (lancamento ↔ lancamento_pai)
-- ============================================================

CREATE TABLE lancamento (
    id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    conta_id          UUID          NOT NULL REFERENCES conta(id)      ON DELETE CASCADE,
    categoria_id      UUID                   REFERENCES categoria(id)  ON DELETE SET NULL,
    projeto_id        UUID                   REFERENCES projeto(id)    ON DELETE SET NULL,
    fatura_id         UUID                   REFERENCES fatura(id)     ON DELETE SET NULL,
    lancamento_pai_id UUID                   REFERENCES lancamento(id) ON DELETE SET NULL,
    descricao         VARCHAR(255)  NOT NULL,
    valor             NUMERIC(15,2) NOT NULL,
    tipo              VARCHAR(20)   NOT NULL
                        CHECK (tipo IN ('receita', 'despesa', 'transferencia')),
    data_lancamento   DATE          NOT NULL DEFAULT CURRENT_DATE,
    status            VARCHAR(20)   NOT NULL DEFAULT 'confirmado'
                        CHECK (status IN ('pendente', 'confirmado', 'cancelado')),
    origem            VARCHAR(30)            DEFAULT 'manual'
                        CHECK (origem IN ('manual', 'open_finance', 'sms', 'whatsapp', 'importacao')),
    recorrente        BOOLEAN       NOT NULL DEFAULT FALSE,
    concluido         BOOLEAN       NOT NULL DEFAULT FALSE
);


-- ============================================================
-- 12. LANCAMENTO_TAG
--     Tabela associativa N-N entre LANCAMENTO e TAG.
--     Relacionamento: N-N (lancamento ↔ tag)
-- ============================================================

CREATE TABLE lancamento_tag (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lancamento_id UUID NOT NULL REFERENCES lancamento(id) ON DELETE CASCADE,
    tag_id        UUID NOT NULL REFERENCES tag(id)        ON DELETE CASCADE,
    CONSTRAINT uq_lancamento_tag UNIQUE (lancamento_id, tag_id)
);


-- ============================================================
-- 13. LANCAMENTO_CENTRO
--     Tabela associativa N-N entre LANCAMENTO e CENTRO.
--     Percentual permite rateio proporcional entre centros.
--     Relacionamento: N-N (lancamento ↔ centro)
-- ============================================================

CREATE TABLE lancamento_centro (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    lancamento_id UUID          NOT NULL REFERENCES lancamento(id) ON DELETE CASCADE,
    centro_id     UUID          NOT NULL REFERENCES centro(id)     ON DELETE CASCADE,
    percentual    NUMERIC(5,2)  NOT NULL DEFAULT 100
                    CHECK (percentual > 0 AND percentual <= 100),
    CONSTRAINT uq_lancamento_centro UNIQUE (lancamento_id, centro_id)
);


-- ============================================================
-- 14. META
--     Meta financeira com acompanhamento de progresso.
--     Relacionamentos: 1-N (usuario → meta) | 1-N (conta → meta)
-- ============================================================

CREATE TABLE meta (
    id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id  UUID          NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    conta_id    UUID                   REFERENCES conta(id)   ON DELETE SET NULL,
    nome        VARCHAR(120)  NOT NULL,
    valor_alvo  NUMERIC(15,2) NOT NULL,
    valor_atual NUMERIC(15,2) NOT NULL DEFAULT 0,
    data_inicio DATE          NOT NULL DEFAULT CURRENT_DATE,
    data_fim    DATE,
    status      VARCHAR(20)   NOT NULL DEFAULT 'ativa'
                  CHECK (status IN ('ativa', 'pausada', 'concluida', 'cancelada')),
    tipo        VARCHAR(30)   NOT NULL DEFAULT 'poupanca'
                  CHECK (tipo IN ('poupanca', 'quitacao', 'viagem', 'emergencia', 'outro'))
);


-- ============================================================
-- 15. INVESTIMENTO
--     Ativo financeiro do usuário (ação, FII, cripto, renda fixa).
--     Relacionamentos: 1-N (usuario → investimento) | 1-N (conta → investimento)
-- ============================================================

CREATE TABLE investimento (
    id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id  UUID          NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    conta_id    UUID          NOT NULL REFERENCES conta(id)   ON DELETE CASCADE,
    ticker      VARCHAR(20),
    nome        VARCHAR(120)  NOT NULL,
    tipo        VARCHAR(30)   NOT NULL
                  CHECK (tipo IN ('acao', 'fii', 'etf', 'renda_fixa', 'cripto', 'outro')),
    classe      VARCHAR(30),
    moeda       CHAR(3)       NOT NULL DEFAULT 'BRL',
    preco_medio NUMERIC(15,4) NOT NULL DEFAULT 0,
    quantidade  NUMERIC(15,6) NOT NULL DEFAULT 0,
    valor_atual NUMERIC(15,2) NOT NULL DEFAULT 0
);


-- ============================================================
-- 16. OPERACAO_INVESTIMENTO
--     Histórico de compras e vendas de um ativo.
--     Relacionamento: 1-N (investimento → operacao_investimento)
-- ============================================================

CREATE TABLE operacao_investimento (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    investimento_id UUID          NOT NULL REFERENCES investimento(id) ON DELETE CASCADE,
    tipo            VARCHAR(10)   NOT NULL CHECK (tipo IN ('compra', 'venda')),
    quantidade      NUMERIC(15,6) NOT NULL,
    preco_unitario  NUMERIC(15,4) NOT NULL,
    valor_total     NUMERIC(15,2) NOT NULL,
    taxas           NUMERIC(10,2) NOT NULL DEFAULT 0,
    data_operacao   DATE          NOT NULL DEFAULT CURRENT_DATE
);


-- ============================================================
-- 17. LEMBRETE
--     Notificação recorrente vinculada (ou não) a um lançamento.
--     Relacionamentos: 1-N (usuario → lembrete) | 1-N (lancamento → lembrete)
-- ============================================================

CREATE TABLE lembrete (
    id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id         UUID          NOT NULL REFERENCES usuario(id)    ON DELETE CASCADE,
    lancamento_id      UUID                   REFERENCES lancamento(id) ON DELETE SET NULL,
    descricao          VARCHAR(255)  NOT NULL,
    valor              NUMERIC(15,2),
    data_vencimento    DATE          NOT NULL,
    frequencia         VARCHAR(20)   NOT NULL DEFAULT 'unica'
                         CHECK (frequencia IN ('unica', 'diaria', 'semanal', 'mensal', 'anual')),
    notificacoes_email BOOLEAN       NOT NULL DEFAULT TRUE,
    notificacoes_push  BOOLEAN       NOT NULL DEFAULT TRUE,
    ativo              BOOLEAN       NOT NULL DEFAULT TRUE
);


-- ============================================================
-- 18. REGRA_CLASSIFICACAO
--     Classifica automaticamente lançamentos importados por
--     Open Finance, SMS ou WhatsApp com base em termos de busca.
--     Relacionamentos: 1-N (usuario → regra_classificacao)
--                      1-N (categoria → regra_classificacao)
--                      1-N (projeto → regra_classificacao)
-- ============================================================

CREATE TABLE regra_classificacao (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id   UUID         NOT NULL REFERENCES usuario(id)    ON DELETE CASCADE,
    categoria_id UUID                  REFERENCES categoria(id)  ON DELETE SET NULL,
    projeto_id   UUID                  REFERENCES projeto(id)    ON DELETE SET NULL,
    descricao    VARCHAR(255),
    termo_busca  VARCHAR(100) NOT NULL,
    tipo         VARCHAR(20)  NOT NULL DEFAULT 'contem'
                   CHECK (tipo IN ('contem', 'comeca_com', 'termina_com', 'igual')),
    ativo        BOOLEAN      NOT NULL DEFAULT TRUE,
    prioridade   SMALLINT     NOT NULL DEFAULT 0
);


-- ============================================================
--  DADOS DE EXEMPLO (SEED)
--  IDs fixos para facilitar consultas e testes
-- ============================================================

-- ── USUÁRIOS ────────────────────────────────────────────────
INSERT INTO usuario (id, nome, email, senha_hash, telefone, plano) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'João Silva',  'joao@email.com',  '$2b$12$hash_joao_silva',  '(11) 99999-0001', 'pro'),
  ('a0000000-0000-0000-0000-000000000002', 'Maria Souza', 'maria@email.com', '$2b$12$hash_maria_souza', '(11) 99999-0002', 'free');

-- ── COMPARTILHAMENTO ─────────────────────────────────────────
INSERT INTO usuario_adicional (usuario_titular_id, usuario_convidado_id, permissao) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'leitura');

-- ── CONTAS ───────────────────────────────────────────────────
INSERT INTO conta (id, usuario_id, nome, tipo, instituicao, saldo_inicial, saldo_atual) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Conta Corrente Itaú', 'corrente', 'Itaú Unibanco', 5000.00, 4350.00),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Poupança Itaú',      'poupanca', 'Itaú Unibanco', 1000.00, 1200.00);

-- ── CONTA BANCÁRIA (1-1) ──────────────────────────────────────
INSERT INTO conta_bancaria (conta_id, banco_codigo, agencia, numero_conta, status_sincronizacao) VALUES
  ('b0000000-0000-0000-0000-000000000001', '341', '1234', '56789-0', 'ok');

-- ── CATEGORIAS (5 padrão + 2 subcategorias do usuário) ───────
INSERT INTO categoria (id, usuario_id, nome, tipo, cor, icone, padrao) VALUES
  ('c0000000-0000-0000-0000-000000000001', NULL, 'Alimentação', 'despesa', '#FF6B6B', 'fork-knife',  TRUE),
  ('c0000000-0000-0000-0000-000000000002', NULL, 'Transporte',  'despesa', '#4ECDC4', 'car',         TRUE),
  ('c0000000-0000-0000-0000-000000000003', NULL, 'Salário',     'receita', '#45B7D1', 'briefcase',   TRUE),
  ('c0000000-0000-0000-0000-000000000004', NULL, 'Lazer',       'despesa', '#96CEB4', 'gamepad',     TRUE),
  ('c0000000-0000-0000-0000-000000000005', NULL, 'Saúde',       'despesa', '#FFEAA7', 'heart',       TRUE),
  -- Subcategorias personalizadas do usuário
  ('c0000000-0000-0000-0000-000000000006',
   'a0000000-0000-0000-0000-000000000001',
   'Restaurante', 'despesa', '#FF6B6B', 'utensils', FALSE),
  ('c0000000-0000-0000-0000-000000000007',
   'a0000000-0000-0000-0000-000000000001',
   'Combustível', 'despesa', '#4ECDC4', 'gas-pump',  FALSE);

-- Vinculação hierárquica das subcategorias
UPDATE categoria SET categoria_pai_id = 'c0000000-0000-0000-0000-000000000001'
  WHERE id = 'c0000000-0000-0000-0000-000000000006';
UPDATE categoria SET categoria_pai_id = 'c0000000-0000-0000-0000-000000000002'
  WHERE id = 'c0000000-0000-0000-0000-000000000007';

-- ── TAGS ─────────────────────────────────────────────────────
INSERT INTO tag (id, usuario_id, nome, cor) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'essencial',  '#FF0000'),
  ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'parcelado',  '#0000FF'),
  ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'recorrente', '#00AA00');

-- ── PROJETO ───────────────────────────────────────────────────
INSERT INTO projeto (id, usuario_id, nome, orcamento, gasto_total, data_inicio, data_fim, status) VALUES
  ('e0000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000001',
   'Reforma Cozinha', 15000.00, 4200.00, '2025-01-01', '2025-06-30', 'ativo');

-- ── CENTRO DE CUSTO ───────────────────────────────────────────
INSERT INTO centro (id, usuario_id, nome, tipo, descricao) VALUES
  ('f0000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000001',
   'Carro', 'veiculo', 'Gastos com combustível, manutenção e IPVA');

-- ── CARTÃO DE CRÉDITO ─────────────────────────────────────────
INSERT INTO cartao_credito (id, conta_id, bandeira, nome, limite, limite_disponivel, dia_fechamento, dia_vencimento, ultimos_digitos) VALUES
  ('ca000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001',
   'Visa', 'Itaú Visa Gold', 5000.00, 3200.00, 10, 15, '1234');

-- ── FATURAS ───────────────────────────────────────────────────
INSERT INTO fatura (id, cartao_id, data_fechamento, data_vencimento, valor_total, status, paga) VALUES
  ('fa000000-0000-0000-0000-000000000001',
   'ca000000-0000-0000-0000-000000000001',
   '2025-04-10', '2025-04-15', 1800.00, 'paga', TRUE),
  ('fa000000-0000-0000-0000-000000000002',
   'ca000000-0000-0000-0000-000000000001',
   '2025-05-10', '2025-05-15',  950.00, 'aberta', FALSE);

-- ── LANÇAMENTOS ───────────────────────────────────────────────
INSERT INTO lancamento (id, conta_id, categoria_id, projeto_id, fatura_id, descricao, valor, tipo, data_lancamento, status, origem) VALUES
  ('1a000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001',
   'c0000000-0000-0000-0000-000000000003', NULL, NULL,
   'Salário Maio', 6000.00, 'receita', '2025-05-05', 'confirmado', 'manual'),

  ('1a000000-0000-0000-0000-000000000002',
   'b0000000-0000-0000-0000-000000000001',
   'c0000000-0000-0000-0000-000000000006',
   'e0000000-0000-0000-0000-000000000001', NULL,
   'Almoço Executivo', 45.90, 'despesa', '2025-05-06', 'confirmado', 'manual'),

  ('1a000000-0000-0000-0000-000000000003',
   'b0000000-0000-0000-0000-000000000001',
   'c0000000-0000-0000-0000-000000000007', NULL,
   'fa000000-0000-0000-0000-000000000002',
   'Combustível Maio', 200.00, 'despesa', '2025-05-07', 'confirmado', 'open_finance'),

  ('1a000000-0000-0000-0000-000000000004',
   'b0000000-0000-0000-0000-000000000002',
   'c0000000-0000-0000-0000-000000000001', NULL, NULL,
   'Supermercado Semana', 380.00, 'despesa', '2025-05-08', 'confirmado', 'manual');

-- ── LANCAMENTO × TAG (N-N) ────────────────────────────────────
INSERT INTO lancamento_tag (lancamento_id, tag_id) VALUES
  ('1a000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003'),
  ('1a000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001');

-- ── LANCAMENTO × CENTRO (N-N com rateio) ─────────────────────
INSERT INTO lancamento_centro (lancamento_id, centro_id, percentual) VALUES
  ('1a000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000001', 100.00);

-- ── META ──────────────────────────────────────────────────────
INSERT INTO meta (id, usuario_id, conta_id, nome, valor_alvo, valor_atual, data_inicio, data_fim, status, tipo) VALUES
  ('da000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000002',
   'Viagem Europa', 20000.00, 3500.00, '2025-01-01', '2025-12-31', 'ativa', 'viagem');

-- ── INVESTIMENTO ──────────────────────────────────────────────
INSERT INTO investimento (id, usuario_id, conta_id, ticker, nome, tipo, classe, preco_medio, quantidade, valor_atual) VALUES
  ('ea000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001',
   'PETR4', 'Petrobras PN', 'acao', 'renda_variavel', 32.50, 100.000000, 3450.00);

-- ── OPERAÇÃO DE INVESTIMENTO ──────────────────────────────────
INSERT INTO operacao_investimento (investimento_id, tipo, quantidade, preco_unitario, valor_total, taxas, data_operacao) VALUES
  ('ea000000-0000-0000-0000-000000000001', 'compra', 100.000000, 32.50, 3250.00, 4.90, '2025-03-15');

-- ── LEMBRETE ──────────────────────────────────────────────────
INSERT INTO lembrete (usuario_id, lancamento_id, descricao, valor, data_vencimento, frequencia) VALUES
  ('a0000000-0000-0000-0000-000000000001', NULL,
   'Pagar fatura do cartão Itaú', 950.00, '2025-05-15', 'mensal');

-- ── REGRAS DE CLASSIFICAÇÃO AUTOMÁTICA ───────────────────────
INSERT INTO regra_classificacao (usuario_id, categoria_id, termo_busca, tipo, prioridade) VALUES
  ('a0000000-0000-0000-0000-000000000001',
   'c0000000-0000-0000-0000-000000000006', 'RESTAURANTE', 'contem', 1),
  ('a0000000-0000-0000-0000-000000000001',
   'c0000000-0000-0000-0000-000000000007', 'POSTO',       'contem', 2);


-- ============================================================
--  VERIFICAÇÃO FINAL
--  Deve exibir as 18 tabelas criadas com seus tamanhos
-- ============================================================

SELECT
    tablename                                                          AS "Tabela",
    pg_size_pretty(pg_total_relation_size(quote_ident(tablename)))     AS "Tamanho"
FROM   pg_tables
WHERE  schemaname = 'public'
ORDER  BY tablename;
