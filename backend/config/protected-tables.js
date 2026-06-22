/* ═══════════════════════════════════════════════════════════
   protected-tables.js — Lista Imutável das 18 Tabelas Originais
   Essas tabelas NÃO podem ser DROP ou TRUNCATE via interface admin.
═══════════════════════════════════════════════════════════ */

const PROTECTED_TABLES = Object.freeze([
  'usuario',
  'usuario_adicional',
  'conta',
  'conta_bancaria',
  'cartao_credito',
  'categoria',
  'tag',
  'projeto',
  'centro',
  'fatura',
  'lancamento',
  'lancamento_tag',
  'lancamento_centro',
  'meta',
  'investimento',
  'operacao_investimento',
  'lembrete',
  'regra_classificacao'
]);

/**
 * Verifica se uma tabela é protegida
 * @param {string} tableName
 * @returns {boolean}
 */
function isProtected(tableName) {
  return PROTECTED_TABLES.includes(tableName.toLowerCase().trim());
}

/**
 * Retorna a lista de tabelas protegidas
 * @returns {string[]}
 */
function getProtectedList() {
  return [...PROTECTED_TABLES];
}

module.exports = { PROTECTED_TABLES, isProtected, getProtectedList };
