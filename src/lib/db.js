/**
 * Cliente de banco de dados do PowerNutri.
 * As queries SQL são enviadas para a Vercel Serverless Function (/api/query),
 * que executa no servidor com a conexão ao Neon, respeitando as políticas de RLS.
 */

// URL da API — funciona em dev local (proxy Vite) e em produção (Vercel)
const API_URL = '/api/query';

/**
 * Função de tag template para construir consultas parametrizadas.
 * Exemplo: sql`SELECT * FROM tabela WHERE id = ${id}`
 */
export function sql(strings, ...values) {
  let query = '';
  const params = [];

  strings.forEach((str, i) => {
    query += str;
    if (i < values.length) {
      query += `$${i + 1}`;
      params.push(values[i]);
    }
  });

  return { query, params };
}

/**
 * Executa queries SQL no servidor aplicando RLS para o usuário logado.
 * @param {string} userId - ID do nutricionista logado
 * @param {Array} queries - Array de objetos { query, params } criados com a tag `sql`
 * @returns {Promise<Array>} - Resultados de cada query, em ordem
 */
export async function runQueriesWithRLS(userId, queries) {
  if (!userId) {
    throw new Error('ID do usuário não fornecido.');
  }

  const payload = {
    userId,
    queries: queries.map(q => ({
      query: q.query,
      params: q.params || []
    }))
  };

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Erro HTTP ${response.status}`);
  }

  return data.results || [];
}
