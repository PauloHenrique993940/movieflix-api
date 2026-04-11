import express from 'express';
import type { Request, Response } from 'express';
import 'dotenv/config';

import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.js';

const port = 3000;
const app = express();
app.use(express.json());

// Configurando a conexão direta com o PostgreSQL (via Adapter)
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

// Agora passamos o 'adapter' no construtor do PrismaClient
const prisma = new PrismaClient({ adapter });

// Rota para buscar todos os filmes
app.get('/movies', async (_req: Request, res: Response) => {
  try {
    const movies = await prisma.movie.findMany({
      orderBy: {
        title: 'asc',
      },
      include: {
        genres: true,
        languages: true,
      },
    });
    res.json(movies);
  }
  catch (error) {
    console.error('Erro ao buscar filmes:', error);
    res.status(500).json({
      error: 'Erro interno no servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
});

// Rota para criar um novo filme
app.post('/movies', async (req: Request, res: Response) => {
  try {
    const { title, genre_id, language_id, oscar_count, release_date } = req.body;

    // Criando o filme no banco
    const newMovie = await prisma.movie.create({
      data: {
        title,
        genre_id,
        language_id,
        oscar_count,
        release_date: new Date(release_date),
      },
    });

    // Retornando o objeto criado para confirmar o sucesso no Thunder Client
    res.status(201).json(newMovie);
  }
  catch (error) {
    console.error('Erro ao criar filme:', error);

    // Retorna o erro detalhado para você debugar mais rápido
    res.status(500).json({
      error: 'Erro interno no servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
