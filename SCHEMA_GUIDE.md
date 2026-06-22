# 📘 SCHEMA GUIDE — Guia de Consulta do Banco de Dados
## Sistema de Controle Financeiro Pessoal

> Este documento serve como **referência técnica completa** para qualquer desenvolvedor
> que precise entender, modificar ou realizar consultas no banco de dados.
> Não é necessário ter participado do desenvolvimento para utilizá-lo.

---

## 📋 Sumário

1. [Visão Geral das Entidades](#visão-geral-das-entidades)
2. [Dicionário de Dados](#dicionário-de-dados)
   - [usuario](#1-usuario)
   - [usuario_adicional](#2-usuario_adicional)
   - [conta](#3-conta)
   - [conta_bancaria](#4-conta_bancaria)
   - [cartao_credito](#5-cartao_credito)
   - [fatura](#6-fatura)
   - [categoria](#7-categoria)
   - [tag](#8-tag)
   - [projeto](#9-projeto)
   - [centro](#10-centro)
   - [lancamento](#11-lancamento)
   - [lancamento_tag](#12-lancamento_tag)
   - [lancamento_centro](#13-lancamento_centro)
   - [meta](#14-meta)
   - [investimento](#15-investimento)
   - [operacao_investimento](#16-operacao_investimento)
   - [lembrete](#17-lembrete)
   - [regra_classificacao](#18-regra_classificacao)
3. [Mapa de Chaves Estrangeiras](#mapa-de-chaves-estrangeiras)
4. [Regras de Negócio Embutidas](#regras-de-negócio-embutidas)
5. [Exemplos de Queries](#exemplos-de-queries)
6. [Como Adicionar Novos Dados](#como-adicionar-novos-dados)

---

## Visão Geral das Entidades

| # | Tabela | Módulo | Descrição resumida |
|:---:|---|---|---|
| 1 | `usuario` | Usuários | Usuário principal do sistema |
| 2 | `usuario_adicional` | Usuários | Compartilhamento de acesso entre usuários (N-N) |
| 3 | `conta` | Contas | Conta financeira de qualquer tipo |
| 4 | `conta_bancaria` | Contas | Dados bancários e Open Finance (extensão 1-1 de conta) |
| 5 | `cartao_credito` | Cartões | Cartão de crédito vinculado a uma conta |
| 6 | `fatura` | Cartões | Fatura mensal de um cartão |
| 7 | `categoria` | Classificação | Categoria hierárquica de lançamentos |
| 8 | `tag` | Classificação | Etiqueta livre criada pelo usuário |
| 9 | `projeto` | Classificação | Agrupamento temporário de lançamentos |
| 10 | `centro` | Classificação | Centro de custo permanente |
| 11 | `lancamento` | Lançamentos | Movimentação financeira (core do sistema) |
| 12 | `lancamento_tag` | Lançamentos | Associação N-N entre lançamento e tag |
| 13 | `lancamento_centro` | Lançamentos | Associação N-N entre lançamento e centro de custo |
| 14 | `meta` | Metas | Meta financeira com progresso |
| 15 | `investimento` | Investimentos | Ativo financeiro do usuário |
| 16 | `operacao_investimento` | Investimentos | Histórico de compras e vendas de um ativo |
| 17 | `lembrete` | Utilidades | Notificação recorrente |
| 18 | `regra_classificacao` | Utilidades | Regra automática de categorização |

---

## Dicionário de Dados

> **Legenda de restrições:**
> `PK` = Chave Primária | `FK` = Chave Estrangeira | `UK` = Único | `NN` = Not Null | `DEF` = Default

---

### 1. `usuario`

> Entidade central. Todo dado no sistema pertence direta ou indiretamente a um usuário.

| Coluna | Tipo | Restrições | Valores Permitidos | Descrição |
|---|---|---|---|---|
| `id` | UUID | PK, DEF | UUID gerado | Identificador único do usuário |
| `nome` | VARCHAR(120) | NN | Qualquer texto | Nome completo |
| `email` | VARCHAR(180) | NN, UK | E-mail válido | E-mail de login (único no sistema) |
| `senha_hash` | VARCHAR(255) | NN | Hash bcrypt | Senha criptografada (nunca texto puro) |
| `telefone` | VARCHAR(20) | — | Ex: `(11) 99999-0001` | Telefone opcional |
| `plano` | VARCHAR(30) | NN, DEF, CHECK | `free` `pro` `premium` | Plano de assinatura do usuário |
| `data_cadastro` | DATE | NN, DEF | Data atual | Data de criação da conta |
| `ativo` | BOOLEAN | NN, DEF | `TRUE` `FALSE` | Se o usuário está ativo no sistema |

**Exemplo de INSERT:**
```sql
INSERT INTO usuario (nome, email, senha_hash, telefone, plano)
VALUES ('Carlos Lima', 'carlos@email.com', '$2b$12$hash_aqui', '(21) 98888-1234', 'pro');
```

---

### 2. `usuario_adicional`

> Tabela associativa do relacionamento **N-N reflexivo** da entidade `usuario`.
> Permite que um usuário titular conceda acesso a outro usuário (convidado).

| Coluna | Tipo | Restrições | Valores Permitidos | Descrição |
|---|---|---|---|---|
| `id` | UUID | PK, DEF | UUID gerado | Identificador do vínculo |
| `usuario_titular_id` | UUID | NN, FK→usuario | UUID de usuario | Dono da conta que compartilha |
| `usuario_convidado_id` | UUID | NN, FK→usuario | UUID de usuario | Usuário que recebe o acesso |
| `permissao` | VARCHAR(20) | NN, DEF, CHECK | `leitura` `edicao` `admin` | Nível de acesso concedido |
| `ativo` | BOOLEAN | NN, DEF | `TRUE` `FALSE` | Se o compartilhamento está ativo |
| `data_convite` | DATE | NN, DEF | Data atual | Data em que o convite foi criado |

> ⚠️ **Restrições especiais:**
> - `UNIQUE(usuario_titular_id, usuario_convidado_id)` → Não pode existir dois convites iguais
> - `CHECK(usuario_titular_id <> usuario_convidado_id)` → Usuário não pode convidar a si mesmo

---

### 3. `conta`

> Representa qualquer conta financeira: bancária, digital, carteira física, criptomoeda etc.

| Coluna | Tipo | Restrições | Valores Permitidos | Descrição |
|---|---|---|---|---|
| `id` | UUID | PK, DEF | UUID gerado | Identificador da conta |
| `usuario_id` | UUID | NN, FK→usuario | UUID de usuario | Proprietário da conta |
| `nome` | VARCHAR(100) | NN | Qualquer texto | Nome descritivo da conta |
| `tipo` | VARCHAR(30) | NN, CHECK | `corrente` `poupanca` `carteira` `cripto` `exterior` `outro` | Tipo da conta |
| `instituicao` | VARCHAR(100) | — | Ex: `Itaú`, `Nubank` | Nome da instituição financeira |
| `saldo_inicial` | NUMERIC(15,2) | NN, DEF | Valor decimal | Saldo no momento do cadastro |
| `saldo_atual` | NUMERIC(15,2) | NN, DEF | Valor decimal | Saldo atual (atualizado pela aplicação) |
| `moeda` | CHAR(3) | NN, DEF | `BRL` `USD` `EUR` etc. | Código ISO 4217 da moeda |
| `sincronizada` | BOOLEAN | NN, DEF | `TRUE` `FALSE` | Se a conta usa Open Finance |
| `ativa` | BOOLEAN | NN, DEF | `TRUE` `FALSE` | Se a conta está ativa |

---

### 4. `conta_bancaria`

> Extensão **1-1** da tabela `conta`. Armazena dados bancários detalhados e token Open Finance.
> Só existe para contas do tipo bancário que têm integração.

| Coluna | Tipo | Restrições | Valores Permitidos | Descrição |
|---|---|---|---|---|
| `id` | UUID | PK, DEF | UUID gerado | Identificador do registro bancário |
| `conta_id` | UUID | NN, UK, FK→conta | UUID de conta | Referência à conta (UNIQUE garante o 1-1) |
| `banco_codigo` | VARCHAR(10) | — | Ex: `341` (Itaú) | Código BACEN/ISPB do banco |
| `agencia` | VARCHAR(10) | — | Ex: `1234` | Número da agência |
| `numero_conta` | VARCHAR(20) | — | Ex: `56789-0` | Número completo da conta com dígito |
| `token_open_finance` | TEXT | — | Token JWT/OAuth | Token de acesso ao Open Finance |
| `ultima_sincronizacao` | TIMESTAMP | — | Data e hora | Última vez que a conta foi sincronizada |
| `status_sincronizacao` | VARCHAR(20) | NN, DEF, CHECK | `pendente` `ok` `erro` | Status da última sincronização |

---

### 5. `cartao_credito`

> Cartão de crédito vinculado a uma conta. Uma conta pode ter múltiplos cartões.

| Coluna | Tipo | Restrições | Valores Permitidos | Descrição |
|---|---|---|---|---|
| `id` | UUID | PK, DEF | UUID gerado | Identificador do cartão |
| `conta_id` | UUID | NN, FK→conta | UUID de conta | Conta de débito do cartão |
| `bandeira` | VARCHAR(30) | — | `Visa` `Mastercard` `Elo` etc. | Bandeira do cartão |
| `nome` | VARCHAR(100) | — | Ex: `Itaú Visa Gold` | Nome descritivo do cartão |
| `limite` | NUMERIC(15,2) | NN, DEF | Valor decimal | Limite total do cartão |
| `limite_disponivel` | NUMERIC(15,2) | NN, DEF | Valor decimal | Limite ainda disponível para uso |
| `dia_fechamento` | SMALLINT | NN, CHECK | 1 a 31 | Dia do mês em que a fatura fecha |
| `dia_vencimento` | SMALLINT | NN, CHECK | 1 a 31 | Dia do mês em que a fatura vence |
| `ultimos_digitos` | CHAR(4) | — | Ex: `1234` | Últimos 4 dígitos do cartão |

---

### 6. `fatura`

> Fatura mensal de um cartão de crédito.
> O `UNIQUE(cartao_id, data_fechamento)` garante **1 fatura por ciclo** (comportamento 1-1 por período).

| Coluna | Tipo | Restrições | Valores Permitidos | Descrição |
|---|---|---|---|---|
| `id` | UUID | PK, DEF | UUID gerado | Identificador da fatura |
| `cartao_id` | UUID | NN, FK→cartao_credito | UUID de cartão | Cartão ao qual a fatura pertence |
| `data_fechamento` | DATE | NN | Data | Data em que a fatura fechou |
| `data_vencimento` | DATE | NN | Data | Data limite para pagamento |
| `valor_total` | NUMERIC(15,2) | NN, DEF | Valor decimal | Soma de todos os lançamentos da fatura |
| `status` | VARCHAR(20) | NN, DEF, CHECK | `aberta` `fechada` `paga` `vencida` | Status atual da fatura |
| `paga` | BOOLEAN | NN, DEF | `TRUE` `FALSE` | Confirmação de pagamento |

> **Restrição especial:** `UNIQUE(cartao_id, data_fechamento)` — implementa o relacionamento 1-1 por ciclo.

---

### 7. `categoria`

> Categoria hierárquica para classificar lançamentos.
> Uma categoria pode ter subcategorias via `categoria_pai_id` (auto-relacionamento).
> Categorias com `usuario_id = NULL` são **categorias padrão** do sistema.

| Coluna | Tipo | Restrições | Valores Permitidos | Descrição |
|---|---|---|---|---|
| `id` | UUID | PK, DEF | UUID gerado | Identificador da categoria |
| `usuario_id` | UUID | FK→usuario | UUID ou NULL | Dono da categoria (NULL = padrão global) |
| `categoria_pai_id` | UUID | FK→categoria | UUID ou NULL | Categoria pai (NULL = categoria raiz) |
| `nome` | VARCHAR(80) | NN | Qualquer texto | Nome da categoria |
| `tipo` | VARCHAR(10) | NN, CHECK | `receita` `despesa` `ambos` | Tipo de lançamento aceito |
| `cor` | VARCHAR(7) | — | Hex: `#FF6B6B` | Cor para exibição na interface |
| `icone` | VARCHAR(50) | — | Ex: `fork-knife` | Nome do ícone para a interface |
| `padrao` | BOOLEAN | NN, DEF | `TRUE` `FALSE` | Se é uma categoria padrão do sistema |

**Hierarquia de exemplo:**
```
Alimentação (pai, padrão)
  └─ Restaurante (filho, do usuário)
  └─ Delivery (filho, do usuário)
```

---

### 8. `tag`

> Etiquetas livres criadas pelo usuário para marcar lançamentos de forma flexível.
> Uma tag pertence a um único usuário e não pode ser repetida para o mesmo usuário.

| Coluna | Tipo | Restrições | Valores Permitidos | Descrição |
|---|---|---|---|---|
| `id` | UUID | PK, DEF | UUID gerado | Identificador da tag |
| `usuario_id` | UUID | NN, FK→usuario | UUID de usuario | Dono da tag |
| `nome` | VARCHAR(60) | NN | Qualquer texto | Nome da tag (ex: `essencial`, `parcelado`) |
| `cor` | VARCHAR(7) | — | Hex: `#FF0000` | Cor de exibição |

> **Restrição:** `UNIQUE(usuario_id, nome)` — o mesmo usuário não pode ter duas tags com o mesmo nome.

---

### 9. `projeto`

> Agrupamento **temporário** de lançamentos para rastrear gastos de um evento específico
> (ex: reforma de cozinha, viagem de férias, casamento).

| Coluna | Tipo | Restrições | Valores Permitidos | Descrição |
|---|---|---|---|---|
| `id` | UUID | PK, DEF | UUID gerado | Identificador do projeto |
| `usuario_id` | UUID | NN, FK→usuario | UUID de usuario | Dono do projeto |
| `nome` | VARCHAR(120) | NN | Qualquer texto | Nome descritivo do projeto |
| `orcamento` | NUMERIC(15,2) | NN, DEF | Valor decimal | Orçamento planejado |
| `gasto_total` | NUMERIC(15,2) | NN, DEF | Valor decimal | Total já gasto (atualizado pela aplicação) |
| `data_inicio` | DATE | — | Data | Início do projeto |
| `data_fim` | DATE | — | Data | Prazo de conclusão |
| `status` | VARCHAR(20) | NN, DEF, CHECK | `ativo` `pausado` `concluido` `cancelado` | Status do projeto |

---

### 10. `centro`

> Centro de custo **permanente** para rastrear gastos de uma área contínua
> (ex: carro, filho, pet, home office). Diferente do projeto, não tem prazo.

| Coluna | Tipo | Restrições | Valores Permitidos | Descrição |
|---|---|---|---|---|
| `id` | UUID | PK, DEF | UUID gerado | Identificador do centro de custo |
| `usuario_id` | UUID | NN, FK→usuario | UUID de usuario | Dono do centro |
| `nome` | VARCHAR(80) | NN | Qualquer texto | Nome do centro (ex: `Carro`, `Filho`) |
| `tipo` | VARCHAR(30) | — | Texto livre | Classificação (ex: `veiculo`, `familiar`) |
| `descricao` | TEXT | — | Texto livre | Descrição detalhada |
| `ativo` | BOOLEAN | NN, DEF | `TRUE` `FALSE` | Se o centro está ativo |

---

### 11. `lancamento`

> **Tabela principal do sistema.** Registra toda e qualquer movimentação financeira.
> Suporta auto-referência para recorrência (lançamento filho aponta para o pai).

| Coluna | Tipo | Restrições | Valores Permitidos | Descrição |
|---|---|---|---|---|
| `id` | UUID | PK, DEF | UUID gerado | Identificador do lançamento |
| `conta_id` | UUID | NN, FK→conta | UUID de conta | Conta que recebe/paga o lançamento |
| `categoria_id` | UUID | FK→categoria | UUID ou NULL | Categoria do lançamento |
| `projeto_id` | UUID | FK→projeto | UUID ou NULL | Projeto associado (opcional) |
| `fatura_id` | UUID | FK→fatura | UUID ou NULL | Fatura do cartão (se compra no crédito) |
| `lancamento_pai_id` | UUID | FK→lancamento | UUID ou NULL | Lançamento original (se for recorrência) |
| `descricao` | VARCHAR(255) | NN | Qualquer texto | Descrição da movimentação |
| `valor` | NUMERIC(15,2) | NN | Valor decimal positivo | Valor da movimentação |
| `tipo` | VARCHAR(20) | NN, CHECK | `receita` `despesa` `transferencia` | Natureza do lançamento |
| `data_lancamento` | DATE | NN, DEF | Data | Data efetiva da movimentação |
| `status` | VARCHAR(20) | NN, DEF, CHECK | `pendente` `confirmado` `cancelado` | Status do lançamento |
| `origem` | VARCHAR(30) | DEF, CHECK | `manual` `open_finance` `sms` `whatsapp` `importacao` | Como o lançamento foi criado |
| `recorrente` | BOOLEAN | NN, DEF | `TRUE` `FALSE` | Se é um lançamento que se repete |
| `concluido` | BOOLEAN | NN, DEF | `TRUE` `FALSE` | Se foi efetivado/liquidado |

---

### 12. `lancamento_tag`

> Tabela associativa do relacionamento **N-N** entre `lancamento` e `tag`.
> Um lançamento pode ter várias tags; uma tag pode estar em vários lançamentos.

| Coluna | Tipo | Restrições | Valores Permitidos | Descrição |
|---|---|---|---|---|
| `id` | UUID | PK, DEF | UUID gerado | Identificador do vínculo |
| `lancamento_id` | UUID | NN, FK→lancamento | UUID de lancamento | Lançamento marcado |
| `tag_id` | UUID | NN, FK→tag | UUID de tag | Tag aplicada |

> **Restrição:** `UNIQUE(lancamento_id, tag_id)` — a mesma tag não pode ser aplicada duas vezes ao mesmo lançamento.

---

### 13. `lancamento_centro`

> Tabela associativa do relacionamento **N-N** entre `lancamento` e `centro`.
> Permite **ratear** um lançamento entre múltiplos centros de custo via `percentual`.

| Coluna | Tipo | Restrições | Valores Permitidos | Descrição |
|---|---|---|---|---|
| `id` | UUID | PK, DEF | UUID gerado | Identificador do vínculo |
| `lancamento_id` | UUID | NN, FK→lancamento | UUID de lancamento | Lançamento rateado |
| `centro_id` | UUID | NN, FK→centro | UUID de centro | Centro que recebe parte do lançamento |
| `percentual` | NUMERIC(5,2) | NN, DEF, CHECK | 0,01 a 100,00 | Percentual alocado para este centro |

**Exemplo de rateio (50/50):**
```sql
-- Lançamento de R$ 1.000 rateado entre dois centros
INSERT INTO lancamento_centro (lancamento_id, centro_id, percentual) VALUES
  ('uuid-do-lancamento', 'uuid-centro-carro',   50.00),
  ('uuid-do-lancamento', 'uuid-centro-empresa', 50.00);
```

---

### 14. `meta`

> Meta financeira com acompanhamento de progresso. Pode estar vinculada a uma conta
> específica onde o valor será acumulado.

| Coluna | Tipo | Restrições | Valores Permitidos | Descrição |
|---|---|---|---|---|
| `id` | UUID | PK, DEF | UUID gerado | Identificador da meta |
| `usuario_id` | UUID | NN, FK→usuario | UUID de usuario | Dono da meta |
| `conta_id` | UUID | FK→conta | UUID ou NULL | Conta onde o valor é acumulado |
| `nome` | VARCHAR(120) | NN | Qualquer texto | Nome da meta |
| `valor_alvo` | NUMERIC(15,2) | NN | Valor decimal | Valor a ser atingido |
| `valor_atual` | NUMERIC(15,2) | NN, DEF | Valor decimal | Progresso atual |
| `data_inicio` | DATE | NN, DEF | Data | Início da meta |
| `data_fim` | DATE | — | Data ou NULL | Prazo (opcional) |
| `status` | VARCHAR(20) | NN, DEF, CHECK | `ativa` `pausada` `concluida` `cancelada` | Status da meta |
| `tipo` | VARCHAR(30) | NN, DEF, CHECK | `poupanca` `quitacao` `viagem` `emergencia` `outro` | Categoria da meta |

---

### 15. `investimento`

> Representa um ativo financeiro que o usuário possui. Mantém preço médio e
> quantidade atual para cálculo de rentabilidade.

| Coluna | Tipo | Restrições | Valores Permitidos | Descrição |
|---|---|---|---|---|
| `id` | UUID | PK, DEF | UUID gerado | Identificador do investimento |
| `usuario_id` | UUID | NN, FK→usuario | UUID de usuario | Dono do ativo |
| `conta_id` | UUID | NN, FK→conta | UUID de conta | Conta custodiante do ativo |
| `ticker` | VARCHAR(20) | — | Ex: `PETR4`, `BTC` | Código de negociação |
| `nome` | VARCHAR(120) | NN | Qualquer texto | Nome do ativo |
| `tipo` | VARCHAR(30) | NN, CHECK | `acao` `fii` `etf` `renda_fixa` `cripto` `outro` | Tipo do ativo |
| `classe` | VARCHAR(30) | — | Texto livre | Classe do ativo (ex: `renda_variavel`) |
| `moeda` | CHAR(3) | NN, DEF | `BRL` `USD` `BTC` etc. | Moeda do ativo |
| `preco_medio` | NUMERIC(15,4) | NN, DEF | Valor decimal | Preço médio de compra |
| `quantidade` | NUMERIC(15,6) | NN, DEF | Valor decimal | Quantidade total em carteira |
| `valor_atual` | NUMERIC(15,2) | NN, DEF | Valor decimal | Valor de mercado atual |

---

### 16. `operacao_investimento`

> Histórico completo de compras e vendas de um ativo financeiro.

| Coluna | Tipo | Restrições | Valores Permitidos | Descrição |
|---|---|---|---|---|
| `id` | UUID | PK, DEF | UUID gerado | Identificador da operação |
| `investimento_id` | UUID | NN, FK→investimento | UUID de investimento | Ativo negociado |
| `tipo` | VARCHAR(10) | NN, CHECK | `compra` `venda` | Natureza da operação |
| `quantidade` | NUMERIC(15,6) | NN | Valor decimal | Quantidade negociada |
| `preco_unitario` | NUMERIC(15,4) | NN | Valor decimal | Preço unitário na operação |
| `valor_total` | NUMERIC(15,2) | NN | Valor decimal | Valor total da operação |
| `taxas` | NUMERIC(10,2) | NN, DEF | Valor decimal | Taxas de corretagem/custódia |
| `data_operacao` | DATE | NN, DEF | Data | Data da operação |

---

### 17. `lembrete`

> Notificação configurável vinculada (ou não) a um lançamento específico.
> Suporta recorrência e múltiplos canais de notificação.

| Coluna | Tipo | Restrições | Valores Permitidos | Descrição |
|---|---|---|---|---|
| `id` | UUID | PK, DEF | UUID gerado | Identificador do lembrete |
| `usuario_id` | UUID | NN, FK→usuario | UUID de usuario | Dono do lembrete |
| `lancamento_id` | UUID | FK→lancamento | UUID ou NULL | Lançamento relacionado (opcional) |
| `descricao` | VARCHAR(255) | NN | Qualquer texto | Descrição do lembrete |
| `valor` | NUMERIC(15,2) | — | Valor ou NULL | Valor associado (ex: valor da conta) |
| `data_vencimento` | DATE | NN | Data | Data do próximo disparo |
| `frequencia` | VARCHAR(20) | NN, DEF, CHECK | `unica` `diaria` `semanal` `mensal` `anual` | Frequência de repetição |
| `notificacoes_email` | BOOLEAN | NN, DEF | `TRUE` `FALSE` | Enviar por e-mail |
| `notificacoes_push` | BOOLEAN | NN, DEF | `TRUE` `FALSE` | Enviar notificação push |
| `ativo` | BOOLEAN | NN, DEF | `TRUE` `FALSE` | Se o lembrete está ativo |

---

### 18. `regra_classificacao`

> Regra que classifica automaticamente lançamentos importados (Open Finance, SMS, WhatsApp).
> O campo `prioridade` define qual regra é aplicada primeiro em caso de múltiplas correspondências.

| Coluna | Tipo | Restrições | Valores Permitidos | Descrição |
|---|---|---|---|---|
| `id` | UUID | PK, DEF | UUID gerado | Identificador da regra |
| `usuario_id` | UUID | NN, FK→usuario | UUID de usuario | Dono da regra |
| `categoria_id` | UUID | FK→categoria | UUID ou NULL | Categoria a aplicar |
| `projeto_id` | UUID | FK→projeto | UUID ou NULL | Projeto a aplicar |
| `descricao` | VARCHAR(255) | — | Texto livre | Descrição da finalidade da regra |
| `termo_busca` | VARCHAR(100) | NN | Texto | Texto a procurar na descrição do lançamento |
| `tipo` | VARCHAR(20) | NN, DEF, CHECK | `contem` `comeca_com` `termina_com` `igual` | Método de busca |
| `ativo` | BOOLEAN | NN, DEF | `TRUE` `FALSE` | Se a regra está ativa |
| `prioridade` | SMALLINT | NN, DEF | Inteiro (0 = maior) | Ordem de aplicação das regras |

---

## Mapa de Chaves Estrangeiras

> Use esta tabela para entender rapidamente quais tabelas precisam existir antes de
> inserir dados em outra tabela.

| Tabela (filho) | Coluna FK | Referencia (pai) | Coluna | ON DELETE |
|---|---|---|---|---|
| `usuario_adicional` | `usuario_titular_id` | `usuario` | `id` | CASCADE |
| `usuario_adicional` | `usuario_convidado_id` | `usuario` | `id` | CASCADE |
| `conta` | `usuario_id` | `usuario` | `id` | CASCADE |
| `conta_bancaria` | `conta_id` | `conta` | `id` | CASCADE |
| `cartao_credito` | `conta_id` | `conta` | `id` | CASCADE |
| `categoria` | `usuario_id` | `usuario` | `id` | CASCADE |
| `categoria` | `categoria_pai_id` | `categoria` | `id` | SET NULL |
| `tag` | `usuario_id` | `usuario` | `id` | CASCADE |
| `projeto` | `usuario_id` | `usuario` | `id` | CASCADE |
| `centro` | `usuario_id` | `usuario` | `id` | CASCADE |
| `fatura` | `cartao_id` | `cartao_credito` | `id` | CASCADE |
| `lancamento` | `conta_id` | `conta` | `id` | CASCADE |
| `lancamento` | `categoria_id` | `categoria` | `id` | SET NULL |
| `lancamento` | `projeto_id` | `projeto` | `id` | SET NULL |
| `lancamento` | `fatura_id` | `fatura` | `id` | SET NULL |
| `lancamento` | `lancamento_pai_id` | `lancamento` | `id` | SET NULL |
| `lancamento_tag` | `lancamento_id` | `lancamento` | `id` | CASCADE |
| `lancamento_tag` | `tag_id` | `tag` | `id` | CASCADE |
| `lancamento_centro` | `lancamento_id` | `lancamento` | `id` | CASCADE |
| `lancamento_centro` | `centro_id` | `centro` | `id` | CASCADE |
| `meta` | `usuario_id` | `usuario` | `id` | CASCADE |
| `meta` | `conta_id` | `conta` | `id` | SET NULL |
| `investimento` | `usuario_id` | `usuario` | `id` | CASCADE |
| `investimento` | `conta_id` | `conta` | `id` | CASCADE |
| `operacao_investimento` | `investimento_id` | `investimento` | `id` | CASCADE |
| `lembrete` | `usuario_id` | `usuario` | `id` | CASCADE |
| `lembrete` | `lancamento_id` | `lancamento` | `id` | SET NULL |
| `regra_classificacao` | `usuario_id` | `usuario` | `id` | CASCADE |
| `regra_classificacao` | `categoria_id` | `categoria` | `id` | SET NULL |
| `regra_classificacao` | `projeto_id` | `projeto` | `id` | SET NULL |

> **CASCADE** = ao deletar o pai, os filhos também são deletados automaticamente.
> **SET NULL** = ao deletar o pai, o campo FK no filho vira NULL (registro filho é mantido).

---

## Regras de Negócio Embutidas

Todas as regras abaixo estão implementadas como `CHECK CONSTRAINT` diretamente no banco:

| Tabela | Coluna | Regra | Valores |
|---|---|---|---|
| `usuario` | `plano` | Plano deve ser um dos válidos | `free` \| `pro` \| `premium` |
| `usuario_adicional` | `permissao` | Permissão deve ser um dos válidos | `leitura` \| `edicao` \| `admin` |
| `usuario_adicional` | — | Usuário não pode convidar a si mesmo | `titular_id <> convidado_id` |
| `conta` | `tipo` | Tipo de conta válido | `corrente` \| `poupanca` \| `carteira` \| `cripto` \| `exterior` \| `outro` |
| `conta_bancaria` | `status_sincronizacao` | Status de sincronização válido | `pendente` \| `ok` \| `erro` |
| `cartao_credito` | `dia_fechamento` | Dia válido no mês | `1` a `31` |
| `cartao_credito` | `dia_vencimento` | Dia válido no mês | `1` a `31` |
| `fatura` | `status` | Status de fatura válido | `aberta` \| `fechada` \| `paga` \| `vencida` |
| `fatura` | — | 1 fatura por ciclo de fechamento | `UNIQUE(cartao_id, data_fechamento)` |
| `categoria` | `tipo` | Tipo de categoria válido | `receita` \| `despesa` \| `ambos` |
| `tag` | — | Tag única por usuário | `UNIQUE(usuario_id, nome)` |
| `projeto` | `status` | Status de projeto válido | `ativo` \| `pausado` \| `concluido` \| `cancelado` |
| `lancamento` | `tipo` | Tipo de lançamento válido | `receita` \| `despesa` \| `transferencia` |
| `lancamento` | `status` | Status do lançamento válido | `pendente` \| `confirmado` \| `cancelado` |
| `lancamento` | `origem` | Origem do lançamento válida | `manual` \| `open_finance` \| `sms` \| `whatsapp` \| `importacao` |
| `lancamento_centro` | `percentual` | Percentual entre 0,01 e 100 | `> 0 AND <= 100` |
| `meta` | `status` | Status de meta válido | `ativa` \| `pausada` \| `concluida` \| `cancelada` |
| `meta` | `tipo` | Tipo de meta válido | `poupanca` \| `quitacao` \| `viagem` \| `emergencia` \| `outro` |
| `investimento` | `tipo` | Tipo de ativo válido | `acao` \| `fii` \| `etf` \| `renda_fixa` \| `cripto` \| `outro` |
| `operacao_investimento` | `tipo` | Tipo de operação válido | `compra` \| `venda` |
| `lembrete` | `frequencia` | Frequência válida | `unica` \| `diaria` \| `semanal` \| `mensal` \| `anual` |
| `regra_classificacao` | `tipo` | Tipo de busca válido | `contem` \| `comeca_com` \| `termina_com` \| `igual` |

---

## Exemplos de Queries

### 🔍 Consultas Básicas

**Listar todos os usuários ativos:**
```sql
SELECT id, nome, email, plano, data_cadastro
FROM usuario
WHERE ativo = TRUE
ORDER BY nome;
```

**Listar contas de um usuário com saldo:**
```sql
SELECT nome, tipo, instituicao, saldo_atual, moeda
FROM conta
WHERE usuario_id = 'a0000000-0000-0000-0000-000000000001'
  AND ativa = TRUE
ORDER BY saldo_atual DESC;
```

---

### 📊 Extrato de Lançamentos

**Extrato completo com categoria e conta:**
```sql
SELECT
    l.data_lancamento,
    l.descricao,
    l.tipo,
    l.valor,
    c.nome   AS conta,
    cat.nome AS categoria,
    l.status
FROM lancamento l
JOIN conta    c   ON c.id   = l.conta_id
LEFT JOIN categoria cat ON cat.id = l.categoria_id
WHERE c.usuario_id = 'a0000000-0000-0000-0000-000000000001'
ORDER BY l.data_lancamento DESC;
```

**Saldo por mês (receitas vs despesas):**
```sql
SELECT
    DATE_TRUNC('month', l.data_lancamento) AS mes,
    SUM(CASE WHEN l.tipo = 'receita'  THEN l.valor ELSE 0 END) AS total_receitas,
    SUM(CASE WHEN l.tipo = 'despesa'  THEN l.valor ELSE 0 END) AS total_despesas,
    SUM(CASE WHEN l.tipo = 'receita'  THEN l.valor ELSE -l.valor END) AS saldo
FROM lancamento l
JOIN conta c ON c.id = l.conta_id
WHERE c.usuario_id = 'a0000000-0000-0000-0000-000000000001'
  AND l.status = 'confirmado'
GROUP BY mes
ORDER BY mes DESC;
```

---

### 💳 Cartões e Faturas

**Faturas em aberto com valor total:**
```sql
SELECT
    cc.nome         AS cartao,
    f.data_fechamento,
    f.data_vencimento,
    f.valor_total,
    f.status
FROM fatura f
JOIN cartao_credito cc ON cc.id = f.cartao_id
JOIN conta          c  ON c.id  = cc.conta_id
WHERE c.usuario_id = 'a0000000-0000-0000-0000-000000000001'
  AND f.status IN ('aberta', 'fechada')
ORDER BY f.data_vencimento;
```

**Lançamentos de uma fatura específica:**
```sql
SELECT l.descricao, l.valor, l.data_lancamento, cat.nome AS categoria
FROM lancamento l
LEFT JOIN categoria cat ON cat.id = l.categoria_id
WHERE l.fatura_id = 'fa000000-0000-0000-0000-000000000002'
ORDER BY l.data_lancamento;
```

---

### 🏷️ Tags e Centros de Custo

**Lançamentos com suas tags:**
```sql
SELECT
    l.descricao,
    l.valor,
    STRING_AGG(t.nome, ', ') AS tags
FROM lancamento l
JOIN lancamento_tag lt ON lt.lancamento_id = l.id
JOIN tag           t  ON t.id = lt.tag_id
JOIN conta         c  ON c.id = l.conta_id
WHERE c.usuario_id = 'a0000000-0000-0000-0000-000000000001'
GROUP BY l.id, l.descricao, l.valor
ORDER BY l.descricao;
```

**Gastos por centro de custo:**
```sql
SELECT
    ce.nome             AS centro,
    SUM(l.valor * lc.percentual / 100) AS total_gasto
FROM lancamento_centro lc
JOIN lancamento l  ON l.id  = lc.lancamento_id
JOIN centro     ce ON ce.id = lc.centro_id
JOIN conta      c  ON c.id  = l.conta_id
WHERE c.usuario_id = 'a0000000-0000-0000-0000-000000000001'
  AND l.tipo = 'despesa'
GROUP BY ce.nome
ORDER BY total_gasto DESC;
```

---

### 📈 Investimentos

**Carteira de investimentos com rentabilidade:**
```sql
SELECT
    i.ticker,
    i.nome,
    i.tipo,
    i.quantidade,
    i.preco_medio,
    i.valor_atual,
    ROUND((i.valor_atual - (i.preco_medio * i.quantidade)), 2) AS lucro_prejuizo,
    ROUND(
        ((i.valor_atual - (i.preco_medio * i.quantidade)) / (i.preco_medio * i.quantidade)) * 100,
        2
    ) AS rentabilidade_pct
FROM investimento i
WHERE i.usuario_id = 'a0000000-0000-0000-0000-000000000001'
ORDER BY i.valor_atual DESC;
```

---

### 🎯 Metas Financeiras

**Progresso das metas ativas:**
```sql
SELECT
    m.nome,
    m.valor_alvo,
    m.valor_atual,
    ROUND((m.valor_atual / m.valor_alvo * 100), 1) AS progresso_pct,
    m.data_fim,
    m.status
FROM meta m
WHERE m.usuario_id = 'a0000000-0000-0000-0000-000000000001'
  AND m.status = 'ativa'
ORDER BY progresso_pct DESC;
```

---

### 👥 Compartilhamento

**Ver quem tem acesso à conta de um usuário:**
```sql
SELECT
    u_convidado.nome     AS convidado,
    u_convidado.email    AS email_convidado,
    ua.permissao,
    ua.data_convite,
    ua.ativo
FROM usuario_adicional ua
JOIN usuario u_convidado ON u_convidado.id = ua.usuario_convidado_id
WHERE ua.usuario_titular_id = 'a0000000-0000-0000-0000-000000000001'
ORDER BY ua.data_convite DESC;
```

---

## Como Adicionar Novos Dados

### Ordem obrigatória de inserção

Sempre insira dados respeitando a hierarquia de dependências:

```
1. usuario
2. conta            (depende de: usuario)
3. conta_bancaria   (depende de: conta)
4. cartao_credito   (depende de: conta)
5. categoria        (depende de: usuario, categoria — hierarquia)
6. tag              (depende de: usuario)
7. projeto          (depende de: usuario)
8. centro           (depende de: usuario)
9. fatura           (depende de: cartao_credito)
10. lancamento      (depende de: conta, categoria, projeto, fatura)
11. lancamento_tag  (depende de: lancamento, tag)
12. lancamento_centro (depende de: lancamento, centro)
13. meta            (depende de: usuario, conta)
14. investimento    (depende de: usuario, conta)
15. operacao_investimento (depende de: investimento)
16. lembrete        (depende de: usuario, lancamento)
17. regra_classificacao (depende de: usuario, categoria, projeto)
18. usuario_adicional (depende de: usuario × usuario)
```

### Template de INSERT para novo usuário completo

```sql
-- 1. Criar usuário
INSERT INTO usuario (nome, email, senha_hash, plano)
VALUES ('Novo Usuario', 'novo@email.com', '$2b$12$seu_hash', 'free')
RETURNING id;  -- anote o UUID gerado

-- 2. Criar conta (substitua 'UUID-DO-USUARIO' pelo ID retornado)
INSERT INTO conta (usuario_id, nome, tipo, instituicao, saldo_inicial, saldo_atual)
VALUES ('UUID-DO-USUARIO', 'Minha Conta', 'corrente', 'Nubank', 0, 0)
RETURNING id;  -- anote o UUID gerado

-- 3. Criar lançamento (substitua os UUIDs)
INSERT INTO lancamento (conta_id, descricao, valor, tipo, data_lancamento)
VALUES ('UUID-DA-CONTA', 'Primeiro lançamento', 1000.00, 'receita', CURRENT_DATE);
```

### Como desativar um usuário (sem deletar dados)

```sql
-- Desativar usuário (preserva histórico completo)
UPDATE usuario SET ativo = FALSE WHERE id = 'UUID-DO-USUARIO';

-- Revogar compartilhamento
UPDATE usuario_adicional SET ativo = FALSE
WHERE usuario_titular_id = 'UUID-DO-USUARIO';
```

### Como encerrar uma conta

```sql
-- Desativar conta (não deleta lançamentos)
UPDATE conta SET ativa = FALSE WHERE id = 'UUID-DA-CONTA';
```

---

*PostgreSQL 13+ | Compatível com dbfiddle.dev | Sistema de Controle Financeiro Pessoal*
