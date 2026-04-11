import express from 'express';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.js';

const port = 3000;
const app = express();

// Configurando a conexão direta com o PostgreSQL (via Adapter)
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

// Agora passamos o 'adapter' no construtor do PrismaClient
const prisma = new PrismaClient({ adapter });

// Rota para buscar todos os filmes
app.get('/movies', async (req, res) => {
  try {
    const movies = await prisma.movie.findMany();
    res.json(movies);
  }
  catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar filmes no banco de dados' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
