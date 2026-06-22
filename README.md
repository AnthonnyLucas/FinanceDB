# 💰 Sistema de Controle Financeiro Pessoal — Banco de Dados

> Banco de dados relacional em **PostgreSQL** para gestão completa de finanças pessoais.
> Suporta múltiplos usuários, compartilhamento de contas, cartões de crédito, investimentos, metas, centros de custo e classificação automática de lançamentos.

---

## 📋 Sumário

1. [Visão Geral do Projeto](#visão-geral-do-projeto)
2. [Arquitetura do Banco de Dados](#arquitetura-do-banco-de-dados)
3. [Entidades e Relacionamentos](#entidades-e-relacionamentos)
4. [Pré-requisitos](#pré-requisitos)
5. [Como Rodar no dbfiddle.dev](#como-rodar-no-dbfiddledev) ← **Modo principal / Recomendado**
6. [Como Rodar no VS Code (local)](#como-rodar-no-vs-code-local)
7. [Estrutura dos Arquivos](#estrutura-dos-arquivos)
8. [Dados de Exemplo](#dados-de-exemplo)
9. [Troubleshooting](#troubleshooting)
10. [Equipe](#equipe)

---

## Visão Geral do Projeto

Este banco de dados é o núcleo de um **sistema de finanças pessoais** completo. Ele foi projetado para:

- **Registrar e categorizar** toda movimentação financeira (receitas, despesas, transferências)
- **Gerenciar cartões de crédito** com controle de faturas mensais por ciclo de fechamento
- **Acompanhar investimentos** em renda variável e fixa com histórico completo de operações
- **Definir metas financeiras** com acompanhamento de progresso em tempo real
- **Organizar lançamentos** por projetos temporários (reforma, viagem) e centros de custo permanentes (filho, carro)
- **Compartilhar contas** entre usuários com diferentes níveis de permissão (leitura, edição, admin)
- **Classificar automaticamente** lançamentos importados via Open Finance, SMS ou WhatsApp usando regras configuráveis

### Por que PostgreSQL?

| Recurso | Benefício |
|---|---|
| `gen_random_uuid()` nativo | UUIDs como chave primária sem dependências externas |
| `NUMERIC(15,2)` | Precisão monetária garantida, sem arredondamentos de ponto flutuante |
| `CHECK`, `UNIQUE`, `FK` | Integridade referencial e regras de negócio no nível do banco |
| `ON DELETE CASCADE / SET NULL` | Comportamento controlado ao remover registros pai |
| Auto-referência em tabelas | Suporte a hierarquias (categoria → subcategoria) e recorrência (lançamento → lançamento) |

---

## Arquitetura do Banco de Dados

```
USUARIO ──────────────────────────────────────────────────────┐
  │                                                            │
  ├─ USUARIO_ADICIONAL (N-N reflexivo)                        │
  │                                                            │
  ├─ CONTA ────────────────────────────────────────────────┐  │
  │     └─ CONTA_BANCARIA (1-1 via UNIQUE FK)              │  │
  │     └─ CARTAO_CREDITO ─────────┐                       │  │
  │           └─ FATURA ───────────┤ (1 por ciclo)         │  │
  │                                │                       │  │
  ├─ CATEGORIA (hierárquica)       │                       │  │
  ├─ TAG                           │                       │  │
  ├─ PROJETO                       │                       │  │
  ├─ CENTRO                        │                       │  │
  │                                │                       │  │
  │          LANCAMENTO ◄──────────┘◄──────────────────────┘  │
  │            ├─ LANCAMENTO_TAG    (N-N com TAG)              │
  │            └─ LANCAMENTO_CENTRO (N-N com CENTRO)           │
  │                                                            │
  ├─ META ────────────────────────────────────────────────────┘
  ├─ INVESTIMENTO
  │     └─ OPERACAO_INVESTIMENTO
  ├─ LEMBRETE
  └─ REGRA_CLASSIFICACAO
```

**Total: 18 entidades | 21 relacionamentos**

---

## Entidades e Relacionamentos

### Mapa de Relacionamentos

| Tipo | Tabelas Envolvidas | Descrição |
|:---:|---|---|
| **1 — 1** | `conta` ↔ `conta_bancaria` | Uma conta tem no máximo um registro bancário |
| **1 — 1** | `cartao_credito` ↔ `fatura` *(por ciclo)* | Uma fatura por período de fechamento (UNIQUE) |
| **1 — 1** | `lancamento` ↔ `lancamento` *(pai-filho)* | Lançamento recorrente aponta para seu pai |
| **1 — N** | `usuario` → `conta` | Usuário possui várias contas |
| **1 — N** | `usuario` → `categoria` | Usuário cria categorias personalizadas |
| **1 — N** | `usuario` → `tag` | Usuário gerencia suas próprias tags |
| **1 — N** | `usuario` → `projeto` | Usuário cria projetos financeiros |
| **1 — N** | `usuario` → `centro` | Usuário mantém centros de custo |
| **1 — N** | `usuario` → `meta` | Usuário define metas financeiras |
| **1 — N** | `usuario` → `investimento` | Usuário possui ativos financeiros |
| **1 — N** | `usuario` → `lembrete` | Usuário configura lembretes |
| **1 — N** | `usuario` → `regra_classificacao` | Usuário define regras automáticas |
| **1 — N** | `conta` → `lancamento` | Conta recebe movimentações |
| **1 — N** | `conta` → `cartao_credito` | Conta tem vários cartões vinculados |
| **1 — N** | `cartao_credito` → `fatura` | Cartão gera uma fatura por mês |
| **1 — N** | `fatura` → `lancamento` | Lançamentos debitados numa fatura |
| **1 — N** | `categoria` → `categoria` | Auto-relacionamento hierárquico |
| **1 — N** | `investimento` → `operacao_investimento` | Ativo tem histórico de operações |
| **N — N** | `usuario` ↔ `usuario` via `usuario_adicional` | Compartilhamento entre usuários |
| **N — N** | `lancamento` ↔ `tag` via `lancamento_tag` | Lançamento marcado com múltiplas tags |
| **N — N** | `lancamento` ↔ `centro` via `lancamento_centro` | Rateio de lançamento entre centros de custo |

> **Contagem:** 3× (1-1) + 15× (1-N) + 3× (N-N) = **21 relacionamentos**

---

## Pré-requisitos

### Para rodar no dbfiddle.dev *(recomendado para simulação e apresentação)*
- ✅ Apenas um navegador web. **Nenhuma instalação necessária.**

### Para rodar localmente no VS Code

| Ferramenta | Versão mínima | Link |
|---|---|---|
| PostgreSQL | **13+** *(obrigatório para `gen_random_uuid()` nativo)* | [postgresql.org/download](https://www.postgresql.org/download/) |
| VS Code | Qualquer versão recente | [code.visualstudio.com](https://code.visualstudio.com/) |
| Extensão SQLTools | — | VS Code Marketplace |
| SQLTools PostgreSQL Driver | — | VS Code Marketplace |
| pgAdmin 4 *(opcional)* | — | [pgadmin.org](https://www.pgadmin.org/) |

---

## Como Rodar no dbfiddle.dev

> ⭐ **Este é o modo principal de execução do projeto.** Não requer instalação de nada.

### Passo a passo

**Passo 1** — Acesse **[https://dbfiddle.dev/](https://dbfiddle.dev/)**

**Passo 2** — Selecione o banco de dados:
- No canto superior esquerdo, clique no dropdown do banco de dados
- Selecione **PostgreSQL** versão **13, 14, 15 ou 16** (qualquer uma funciona)

**Passo 3** — Abra o arquivo `financeiro_pessoal.sql` que está neste projeto

**Passo 4** — Copie todo o conteúdo do arquivo:
```
Ctrl + A  →  selecionar tudo
Ctrl + C  →  copiar
```

**Passo 5** — Cole no painel de edição do dbfiddle.dev:
```
Ctrl + V  →  colar
```

**Passo 6** — Execute o script:
- Clique no botão **▶ Run** (ou pressione `Ctrl + Enter`)

**Passo 7** — Verifique os resultados no painel direito

### O que esperar como resultado

Ao final da execução, a consulta de verificação exibirá as 18 tabelas:

```
Tabela                  | Tamanho
------------------------|----------
cartao_credito          | 8192 bytes
categoria               | 8192 bytes
centro                  | 8192 bytes
conta                   | 8192 bytes
conta_bancaria          | 8192 bytes
fatura                  | 8192 bytes
investimento            | 8192 bytes
lancamento              | 8192 bytes
lancamento_centro       | 8192 bytes
lancamento_tag          | 8192 bytes
lembrete                | 8192 bytes
meta                    | 8192 bytes
operacao_investimento   | 8192 bytes
projeto                 | 8192 bytes
regra_classificacao     | 8192 bytes
tag                     | 8192 bytes
usuario                 | 8192 bytes
usuario_adicional       | 8192 bytes
```

> Se aparecer algum erro, consulte a seção [Troubleshooting](#troubleshooting).

---

## Como Rodar no VS Code (local)

### Etapa 1 — Instalar o PostgreSQL

#### Windows
1. Acesse [https://www.postgresql.org/download/windows/](https://www.postgresql.org/download/windows/)
2. Clique em **Download the installer** (EDB installer)
3. Baixe a versão **16.x** (ou qualquer 13+)
4. Execute o instalador `.exe` com as opções padrão
5. Durante a instalação, defina uma senha para o usuário `postgres` — **anote essa senha!**
6. Porta padrão: `5432` — mantenha como está
7. Deixe marcado o **Stack Builder** ao final (pode cancelar quando abrir)

Para verificar se a instalação funcionou, abra o **Prompt de Comando** e execute:
```bash
psql --version
# Esperado: psql (PostgreSQL) 16.x
```

#### macOS (via Homebrew)
```bash
brew install postgresql@16
brew services start postgresql@16
echo 'export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

#### Linux — Ubuntu/Debian
```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

---

### Etapa 2 — Criar o Banco de Dados

Abra o **Terminal** (ou o Terminal Integrado do VS Code com `` Ctrl+` ``):

```bash
# Windows: abra o "SQL Shell (psql)" no Menu Iniciar
# Mac/Linux: abra o terminal

# Entrar no psql como superusuário
psql -U postgres

# Dentro do psql, criar o banco:
CREATE DATABASE financeiro_pessoal;

# Confirmar criação:
\l

# Sair do psql:
\q
```

---

### Etapa 3 — Instalar as Extensões no VS Code

1. Abra o VS Code
2. Acesse **Extensions** com `Ctrl + Shift + X`
3. Pesquise e instale as duas extensões abaixo:

| Extensão | ID no Marketplace |
|---|---|
| **SQLTools** | `mtxr.sqltools` |
| **SQLTools PostgreSQL/Cockroach Driver** | `mtxr.sqltools-driver-pg` |

---

### Etapa 4 — Configurar a Conexão no VS Code

1. Na barra lateral esquerda, clique no ícone do **SQLTools** (cilindro com raio ⚡)
2. Clique em **Add New Connection**
3. Selecione **PostgreSQL**
4. Preencha os campos:

| Campo | Valor |
|---|---|
| Connection Name | `Financeiro Pessoal` |
| Host | `localhost` |
| Port | `5432` |
| Database | `financeiro_pessoal` |
| Username | `postgres` |
| Password | *(a senha definida na instalação)* |
| SSL | Disabled |

5. Clique em **Test Connection** → deve aparecer ✅ **Connected**
6. Clique em **Save Connection**

---

### Etapa 5 — Executar o Script SQL

**Opção A — Pelo VS Code com SQLTools:**
1. Abra o arquivo `financeiro_pessoal.sql` no VS Code
2. Certifique-se de que a conexão `Financeiro Pessoal` está ativa no SQLTools
3. Selecione todo o conteúdo: `Ctrl + A`
4. Execute: `Ctrl + E` (atalho do SQLTools para rodar seleção)
5. Os resultados aparecem no painel inferior

**Opção B — Pelo terminal:**
```bash
psql -U postgres -d financeiro_pessoal -f "caminho\para\financeiro_pessoal.sql"
```

**Exemplo no Windows:**
```bash
psql -U postgres -d financeiro_pessoal -f "C:\Users\SeuNome\Desktop\Banco de Dados\Entregavel\financeiro_pessoal.sql"
```

---

### Etapa 6 — Verificar a Instalação

Conecte-se ao banco via terminal:
```bash
psql -U postgres -d financeiro_pessoal
```

Dentro do `psql`, execute os comandos de verificação:
```sql
-- Listar todas as tabelas (deve mostrar 18)
\dt

-- Ver estrutura de uma tabela específica
\d lancamento

-- Contar registros de cada tabela principal
SELECT COUNT(*) AS usuarios    FROM usuario;
SELECT COUNT(*) AS contas      FROM conta;
SELECT COUNT(*) AS lancamentos FROM lancamento;
SELECT COUNT(*) AS categorias  FROM categoria;

-- Sair
\q
```

---

## Estrutura dos Arquivos

```
📁 Entregavel/
├── 📄 financeiro_pessoal.sql   ← Script principal (DDL + dados de exemplo)
├── 📄 README.md                ← Este arquivo (guia de instalação e uso)
└── 📄 SCHEMA_GUIDE.md          ← Dicionário de dados e guia de consulta
```

---

## Dados de Exemplo

O script já inclui dados de seed para validação imediata após a execução:

| Entidade | Registros inseridos | Descrição |
|---|:---:|---|
| `usuario` | 2 | João (plano pro) e Maria (plano free) |
| `usuario_adicional` | 1 | João compartilha acesso de leitura com Maria |
| `conta` | 2 | Conta corrente e poupança do João |
| `conta_bancaria` | 1 | Dados Open Finance da conta corrente |
| `categoria` | 7 | 5 categorias padrão + 2 subcategorias do João |
| `tag` | 3 | essencial, parcelado, recorrente |
| `projeto` | 1 | Reforma Cozinha (R$ 15.000,00) |
| `centro` | 1 | Carro |
| `cartao_credito` | 1 | Itaú Visa Gold (limite R$ 5.000,00) |
| `fatura` | 2 | Abril (paga) e Maio (aberta) |
| `lancamento` | 4 | 1 receita (salário) e 3 despesas |
| `lancamento_tag` | 2 | Vínculos de tag nos lançamentos |
| `lancamento_centro` | 1 | Combustível alocado 100% ao centro Carro |
| `meta` | 1 | Viagem Europa — R$ 20.000,00 |
| `investimento` | 1 | PETR4 — 100 ações |
| `operacao_investimento` | 1 | Compra de PETR4 em março/2025 |
| `lembrete` | 1 | Pagar fatura mensal do cartão |
| `regra_classificacao` | 2 | RESTAURANTE → Alimentação; POSTO → Combustível |

---

## Troubleshooting

### ❌ `function gen_random_uuid() does not exist`

**Causa:** PostgreSQL versão inferior a 13 não possui `gen_random_uuid()` nativo.

**Solução no dbfiddle.dev:** Selecione PostgreSQL **13 ou superior** no dropdown.

**Solução local (PostgreSQL < 13):**
```sql
-- Adicione esta linha no início do script, antes dos CREATEs:
CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- A função gen_random_uuid() do pgcrypto é equivalente
```

---

### ❌ `duplicate key value violates unique constraint`

**Causa:** O script foi executado mais de uma vez sem limpar o banco.

**Solução:** O script já contém `DROP TABLE IF EXISTS ... CASCADE` no início — basta rodar o script **completo** novamente do início. Não execute parcialmente.

---

### ❌ `permission denied for table` ou `permission denied for schema public`

**Causa:** O usuário PostgreSQL não tem permissões suficientes.

**Solução:**
```sql
-- Execute como superusuário (postgres):
GRANT ALL PRIVILEGES ON DATABASE financeiro_pessoal TO seu_usuario;
GRANT ALL ON SCHEMA public TO seu_usuario;
```

---

### ❌ Erro de FK ao executar parcialmente

**Causa:** Executar apenas parte do script quebra a ordem de dependência das tabelas.

**Solução:** Sempre execute o script **completo** — do `DROP TABLE` inicial até o `SELECT` final de verificação. Nunca execute blocos isolados.

---

### ❌ `could not connect to server` no VS Code

**Causa:** PostgreSQL não está rodando, ou as credenciais estão incorretas.

**Solução (Windows):**
1. Abra **Serviços** (`Win + R` → `services.msc`)
2. Localize **postgresql-x64-16** (ou a versão instalada)
3. Clique com botão direito → **Iniciar**

**Solução (Linux/macOS):**
```bash
sudo systemctl start postgresql   # Linux
brew services start postgresql@16  # macOS
```

---

## Equipe

| Nome |
|---|
| Anthonny Lucas Santos da Silva |
| Déborah Camilly Barbosa Leal Silva |
| Gabriel Renan Silva Martins Guimaraes |
| José Cledenor Bezerra Leite |
| José Guilherme Torres Lima |

---

*PostgreSQL 13+ | Compatível com dbfiddle.dev | Disciplina de Banco de Dados*
