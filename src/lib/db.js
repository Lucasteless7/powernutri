const DB_URL = import.meta.env.VITE_NEON_DATABASE_URL;

// Extrai o hostname da string de conexão do Neon
const getHostName = (urlStr) => {
  if (!urlStr) return '';
  try {
    const match = urlStr.match(/@([^/]+)/);
    return match ? match[1] : '';
  } catch (e) {
    return '';
  }
};

const DB_HOST = getHostName(DB_URL);
const SQL_ENDPOINT = DB_HOST ? `https://${DB_HOST}/sql` : '';

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
 * Executa uma ou mais consultas SQL aplicando a sessão do usuário logado para respeitar as políticas de RLS.
 * Usa o endpoint HTTP do Neon diretamente com o padrão fetch nativo para evitar dependências do Node no navegador.
 * 
 * @param {string} userId - ID do nutricionista logado
 * @param {Array} queries - Array de chamadas SQL criadas com a tag `sql`
 * @returns {Promise<Array>} Retorna um array com os resultados mapeados como objetos chave-valor
 */
export async function runQueriesWithRLS(userId, queries) {
  if (!DB_URL) {
    throw new Error('CONFIG_ERROR: A variável de ambiente VITE_NEON_DATABASE_URL não está configurada no painel do Vercel.');
  }

  if (!userId) {
    throw new Error('ID do usuário não fornecido para RLS.');
  }

  const claims = JSON.stringify({ sub: userId });

  // Cria a query que configura a sessão do usuário no Postgres para o RLS
  const rlsQuery = sql`SELECT set_config('request.jwt.claims', ${claims}, true)`;
  const allQueries = [rlsQuery, ...queries];

  const payload = {
    queries: allQueries.map(q => ({
      query: q.query,
      params: q.params || []
    }))
  };

  const response = await fetch(SQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Neon-Connection-String': DB_URL,
      'Neon-Raw-Text-Output': 'true',
      'Neon-Array-Mode': 'true',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro na transação HTTP do Neon: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  // Mapeia os resultados ignorando o primeiro item (que é a query de set_config)
  // Converte as linhas (arrays) em objetos usando os nomes dos campos retornados
  const results = data.results.slice(1).map(result => {
    const fields = result.fields.map(f => f.name);
    return result.rows.map(row => {
      const obj = {};
      fields.forEach((field, index) => {
        obj[field] = row[index];
      });
      return obj;
    });
  });

  return results;
}
