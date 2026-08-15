import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  // CORS headers para o dev local (Vite roda em porta diferente)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, queries } = req.body;

  if (!userId || !Array.isArray(queries) || queries.length === 0) {
    return res.status(400).json({ error: 'userId e queries são obrigatórios.' });
  }

  const dbUrl = process.env.DATABASE_URL || process.env.VITE_NEON_DATABASE_URL;
  if (!dbUrl) {
    return res.status(500).json({ error: 'Variável DATABASE_URL não configurada no servidor.' });
  }

  try {
    const sql = neon(dbUrl);
    const claims = JSON.stringify({ sub: userId });

    // Monta as queries com os parâmetros enviados pelo frontend
    const sqlQueries = [
      sql`SELECT set_config('request.jwt.claims', ${claims}, true)`,
      ...queries.map(q => sql.query(q.query, q.params || []))
    ];

    const results = await sql.transaction(sqlQueries);

    // Remove o resultado do set_config (primeiro item) e retorna os demais
    return res.status(200).json({ results: results.slice(1) });
  } catch (err) {
    console.error('[api/query] Erro:', err);
    return res.status(500).json({ error: err.message });
  }
}
