# 🛠️ Guia de Instalação do Ambiente — Windows

> Passo a passo completo para instalar o **Node.js** e o **PostgreSQL**,
> configurar e preparar o ambiente para o Sistema de Controle Financeiro Pessoal.

---

## 📋 Sumário

### Node.js
0. [Instalação do Node.js](#0-instalação-do-nodejs)

### PostgreSQL
1. [Download do PostgreSQL](#1-download-do-postgresql)
2. [Instalação](#2-instalação)
3. [Verificação da Instalação](#3-verificação-da-instalação)
4. [Configuração do PATH (se necessário)](#4-configuração-do-path)
5. [Criação do Banco de Dados](#5-criação-do-banco-de-dados)
6. [Importação do Schema](#6-importação-do-schema)
7. [Verificação Final](#7-verificação-final)
8. [Dados de Conexão para o Projeto](#8-dados-de-conexão-para-o-projeto)
9. [Comandos Úteis do dia-a-dia](#9-comandos-úteis-do-dia-a-dia)
10. [Solução de Problemas](#10-solução-de-problemas)

---

## 0. Instalação do Node.js

O Node.js é necessário para rodar o backend (API Express) que conecta o frontend ao PostgreSQL.

### Passo 0.1 — Download
1. Acesse: **https://nodejs.org/pt**
2. Baixe a versão **LTS** (Long Term Support) — recomendada para produção
3. O arquivo será algo como: `node-v22.x.x-x64.msi`

### Passo 0.2 — Instalação
1. Execute o instalador `.msi`
2. Aceite os termos de licença
3. Mantenha o diretório padrão de instalação
4. Na tela de componentes, mantenha **todos** marcados:
   - ✅ Node.js runtime
   - ✅ npm package manager
   - ✅ Add to PATH
5. Se aparecer "Automatically install the necessary tools", pode **desmarcar** (não é necessário)
6. Clique em **Install** e aguarde
7. Clique em **Finish**

### Passo 0.3 — Verificação
Feche e reabra o PowerShell, depois execute:

```powershell
node --version
npm --version
```

**Resultado esperado:**
```
v22.x.x
10.x.x
```

> ⚠️ Se os comandos não forem reconhecidos, reinicie o computador e tente novamente.

---

## 1. Download do PostgreSQL

1. Acesse o site oficial: **https://www.postgresql.org/download/windows/**
2. Clique em **"Download the installer"** (link da EnterpriseDB)
3. Você será redirecionado para: **https://www.enterprisedb.com/downloads/postgres-postgresql-downloads**
4. Baixe a versão **PostgreSQL 16.x** (ou mais recente) para **Windows x86-64**
5. O arquivo será algo como: `postgresql-16.x-x-windows-x64.exe` (~300 MB)

---

## 2. Instalação

### Passo 2.1 — Iniciar o instalador
- Execute o arquivo `.exe` baixado
- Se aparecer "Controle de Conta de Usuário", clique em **Sim**

### Passo 2.2 — Diretório de instalação
- Mantenha o padrão: `C:\Program Files\PostgreSQL\16`
- Clique em **Next**

### Passo 2.3 — Componentes
Marque **TODOS** os componentes:
- ✅ PostgreSQL Server
- ✅ pgAdmin 4 (interface gráfica — muito útil)
- ✅ Stack Builder (para extensões futuras)
- ✅ Command Line Tools
- Clique em **Next**

### Passo 2.4 — Diretório de dados
- Mantenha o padrão: `C:\Program Files\PostgreSQL\16\data`
- Clique em **Next**

### Passo 2.5 — Senha do superusuário ⚠️ IMPORTANTE
- Defina a senha para o usuário `postgres` (superusuário)
- **Sugestão para o projeto:** `postgres123`
- ⚠️ **ANOTE ESSA SENHA!** Você vai precisar dela para conectar o backend
- Clique em **Next**

### Passo 2.6 — Porta
- Mantenha a porta padrão: **5432**
- Clique em **Next**

### Passo 2.7 — Locale
- Selecione: **Portuguese, Brazil** ou mantenha **[Default locale]**
- Clique em **Next**

### Passo 2.8 — Resumo e instalação
- Revise as configurações e clique em **Next**
- Aguarde a instalação (pode levar 2-5 minutos)
- Ao finalizar, desmarque "Launch Stack Builder" e clique em **Finish**

---

## 3. Verificação da Instalação

Abra o **PowerShell** (ou Prompt de Comando) e execute:

```powershell
psql --version
```

**Resultado esperado:**
```
psql (PostgreSQL) 16.x
```

Se aparecer erro "comando não reconhecido", siga a Seção 4 abaixo.

---

## 4. Configuração do PATH

> Só faça isso se o comando `psql --version` não funcionou.

### Opção A — Via PowerShell (temporário, para sessão atual)
```powershell
$env:PATH += ";C:\Program Files\PostgreSQL\16\bin"
```

### Opção B — Via configurações do Windows (permanente)
1. Pressione `Win + S` e pesquise **"Variáveis de ambiente"**
2. Clique em **"Editar as variáveis de ambiente do sistema"**
3. Clique no botão **"Variáveis de Ambiente..."**
4. Na seção **"Variáveis do sistema"**, encontre a variável **Path**
5. Clique em **Editar** → **Novo**
6. Adicione: `C:\Program Files\PostgreSQL\16\bin`
7. Clique em **OK** em todas as janelas
8. **Feche e reabra** o PowerShell
9. Teste novamente: `psql --version`

---

## 5. Criação do Banco de Dados

### Passo 5.1 — Conectar ao PostgreSQL
Abra o PowerShell e conecte como superusuário:

```powershell
psql -U postgres
```

Será pedida a senha. Digite a senha que você definiu na instalação (ex: `postgres123`).

**Resultado esperado:**
```
psql (16.x)
Type "help" for help.

postgres=#
```

### Passo 5.2 — Criar o banco de dados do projeto

No prompt `postgres=#`, execute:

```sql
CREATE DATABASE financeiro_pessoal
    ENCODING 'UTF8'
    LC_COLLATE 'Portuguese_Brazil.1252'
    LC_CTYPE 'Portuguese_Brazil.1252'
    TEMPLATE template0;
```

> **Nota:** Se der erro no locale, use este comando alternativo:
> ```sql
> CREATE DATABASE financeiro_pessoal ENCODING 'UTF8' TEMPLATE template0;
> ```

### Passo 5.3 — Criar um usuário dedicado para a aplicação (opcional mas recomendado)

```sql
CREATE USER app_user WITH PASSWORD 'app123';
GRANT ALL PRIVILEGES ON DATABASE financeiro_pessoal TO app_user;
```

### Passo 5.4 — Sair do psql

```sql
\q
```

---

## 6. Importação do Schema

### Passo 6.1 — Importar o arquivo SQL do projeto

No PowerShell, navegue até a pasta do projeto e execute:

```powershell
psql -U postgres -d financeiro_pessoal -f "c:\Users\Pichau\Desktop\Banco de Dados\Entregavel\financeiro_pessoal.sql"
```

Será pedida a senha do usuário `postgres`.

**Resultado esperado:** Várias linhas de output mostrando:
```
DROP TABLE
CREATE TABLE
INSERT 0 2
INSERT 0 1
...
```

> ⚠️ Se der erro de encoding, tente antes:
> ```powershell
> $env:PGCLIENTENCODING = "UTF8"
> psql -U postgres -d financeiro_pessoal -f "c:\Users\Pichau\Desktop\Banco de Dados\Entregavel\financeiro_pessoal.sql"
> ```

### Passo 6.2 — Conceder permissões ao app_user (se criou o usuário dedicado)

```powershell
psql -U postgres -d financeiro_pessoal
```

No prompt do psql:
```sql
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO app_user;
\q
```

---

## 7. Verificação Final

### Passo 7.1 — Conectar ao banco do projeto

```powershell
psql -U postgres -d financeiro_pessoal
```

### Passo 7.2 — Verificar se as 18 tabelas foram criadas

```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
```

**Resultado esperado (18 tabelas):**
```
      tablename
-----------------------
 cartao_credito
 categoria
 centro
 conta
 conta_bancaria
 fatura
 investimento
 lancamento
 lancamento_centro
 lancamento_tag
 lembrete
 meta
 operacao_investimento
 projeto
 regra_classificacao
 tag
 usuario
 usuario_adicional
(18 rows)
```

### Passo 7.3 — Verificar se os dados seed foram inseridos

```sql
SELECT nome, email, plano FROM usuario;
```

**Resultado esperado:**
```
    nome     |     email      | plano
-------------+----------------+-------
 João Silva  | joao@email.com | pro
 Maria Souza | maria@email.com| free
(2 rows)
```

### Passo 7.4 — Sair

```sql
\q
```

---

## 8. Dados de Conexão para o Projeto

Estas são as configurações que serão usadas no backend (arquivo `.env`):

```env
# ─── Conexão com o PostgreSQL ───
DB_HOST=localhost
DB_PORT=5432
DB_NAME=financeiro_pessoal
DB_USER=postgres
DB_PASSWORD=postgres123

# Se criou o usuário dedicado, use:
# DB_USER=app_user
# DB_PASSWORD=app123
```

> ⚠️ **IMPORTANTE:** O arquivo `.env` contém credenciais sensíveis.
> Nunca suba esse arquivo para repositórios públicos (Git).
> Adicione `.env` ao seu `.gitignore`.

---

## 9. Comandos Úteis do dia-a-dia

### Conectar ao banco
```powershell
psql -U postgres -d financeiro_pessoal
```

### Listar todos os bancos
```sql
\l
```

### Listar tabelas do banco atual
```sql
\dt
```

### Ver estrutura de uma tabela
```sql
\d usuario
```

### Ver dados de uma tabela
```sql
SELECT * FROM usuario;
```

### Sair do psql
```sql
\q
```

### Iniciar/Parar o serviço PostgreSQL (PowerShell como Admin)
```powershell
# Parar
net stop postgresql-x64-16

# Iniciar
net start postgresql-x64-16
```

### Verificar se o serviço está rodando
```powershell
Get-Service | Where-Object { $_.Name -like "*postgres*" }
```

---

## 10. Solução de Problemas

### ❌ "psql: command not found"
→ O PostgreSQL não está no PATH. Siga a [Seção 4](#4-configuração-do-path).

### ❌ "FATAL: password authentication failed"
→ A senha está incorreta. Verifique se está usando a senha definida na instalação.

### ❌ "FATAL: database does not exist"
→ O banco `financeiro_pessoal` não foi criado. Siga a [Seção 5](#5-criação-do-banco-de-dados).

### ❌ "could not connect to server: Connection refused"
→ O serviço do PostgreSQL não está rodando. Execute no PowerShell (como Admin):
```powershell
net start postgresql-x64-16
```

### ❌ Erro de locale ao criar o banco
→ Use o comando alternativo sem locale:
```sql
CREATE DATABASE financeiro_pessoal ENCODING 'UTF8' TEMPLATE template0;
```

### ❌ Erro de encoding ao importar o SQL
→ Configure o encoding do cliente:
```powershell
$env:PGCLIENTENCODING = "UTF8"
chcp 65001
```

### ❌ "permission denied for table..."
→ O usuário não tem permissão. Execute como `postgres`:
```sql
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_user;
```

### ❌ Porta 5432 em uso
→ Outro serviço está usando a porta. Verifique:
```powershell
netstat -an | findstr 5432
```
→ Ou altere a porta no arquivo `postgresql.conf`:
```
C:\Program Files\PostgreSQL\16\data\postgresql.conf
```

---

### 🎯 Usando o pgAdmin 4 (Interface Gráfica)

Se preferir uma interface visual ao invés do terminal:

1. Abra o **pgAdmin 4** (instalado junto com o PostgreSQL)
2. Ao abrir, ele pedirá uma "Master Password" — crie uma qualquer
3. No painel esquerdo, expanda **Servers** → **PostgreSQL 16**
4. Insira a senha do usuário `postgres`
5. Expanda **Databases** → você verá `financeiro_pessoal`
6. Expanda **Schemas** → **public** → **Tables** para ver as 18 tabelas
7. Clique com botão direito em qualquer tabela → **View/Edit Data** → **All Rows**

---

*PostgreSQL 16+ | Windows 10/11 | Sistema de Controle Financeiro Pessoal*
