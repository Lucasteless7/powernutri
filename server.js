// Servidor de desenvolvimento local para simular as Vercel API Routes
// Rode com: node server.js
import express from 'express';
import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Carrega as variáveis de ambiente do .env
config();

const app = express();
app.use(express.json());

// Handler da rota /api/query
app.post('/api/query', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { userId, queries } = req.body;

  if (!userId || !Array.isArray(queries) || queries.length === 0) {
    return res.status(400).json({ error: 'userId e queries são obrigatórios.' });
  }

  const dbUrl = process.env.DATABASE_URL || process.env.VITE_NEON_DATABASE_URL;
  if (!dbUrl) {
    return res.status(500).json({ error: 'Variável DATABASE_URL não configurada.' });
  }

  try {
    const sql = neon(dbUrl);
    const claims = JSON.stringify({ sub: userId });

    const sqlQueries = [
      sql`SELECT set_config('request.jwt.claims', ${claims}, true)`,
      ...queries.map(q => sql.query(q.query, q.params || []))
    ];

    const results = await sql.transaction(sqlQueries);
    return res.json({ results: results.slice(1) });
  } catch (err) {
    console.error('[server] Erro na query:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.listen(3001, () => {
  console.log('✅ Servidor de API local rodando em http://localhost:3001');
  console.log('   Endpoints disponíveis: POST /api/query');
});
