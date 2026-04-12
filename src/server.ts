import express from 'express';
import type { Request, Response } from 'express';
import 'dotenv/config';
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from './swagger.json' with { type: 'json' };

import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/index.js';

const port = 3000;
const app = express();
app.use(express.json());
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Configurando a conexão direta com o PostgreSQL (via Adapter)
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

// Agora passamos o 'adapter' no construtor do PrismaClient
const prisma = new PrismaClient({ adapter });

// Rota para buscar todos os filmes (com filtro opcional por gênero)
app.get('/movies', async (req: Request, res: Response) => {
  try {
    const { genre } = req.query;

    const movies = await prisma.movie.findMany({
      where: genre
        ? {
          genres: {
            name: {
              equals: genre as string,
              mode: 'insensitive',
            },
          },
        }
        : {},
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
    console.log('Recebendo corpo da requisição:', req.body);

    // Verificar se o corpo da requisição existe
    if (!req.body || Object.keys(req.body).length === 0) {
      console.warn('O corpo da requisição está vazio');
      res.status(400).json({ message: 'O corpo da requisição não pode estar vazio' });
      return;
    }

    const { title, genre_id, language_id, oscar_count, release_date } = req.body;
    // 1. Verificar se o título foi enviado
    if (!title) {
      console.warn('O título não foi enviado no corpo da requisição');
      res.status(400).json({ message: 'O título é obrigatório' });
      return;
    }

    // 2. Verificar se já existe um filme com este título no banco (ignorando maiúsculas/minúsculas)
    const movieWithSameTitle = await prisma.movie.findFirst({
      where: {
        title: {
          equals: title,
          mode: 'insensitive',
        },
      },
    });

    if (movieWithSameTitle) {
      console.warn(`Tentativa de cadastrar filme duplicado: ${title}`);
      res.status(409).json({ message: 'Já existe um filme cadastrado com esse título' });
      return;
    }

    // 3. Criar o filme no banco
    console.log(`Tentando salvar novo filme: ${title}`);
    const newMovie = await prisma.movie.create({
      data: {
        title,
        genre_id,
        language_id,
        oscar_count,
        release_date: release_date ? new Date(release_date) : null,
      },
    });

    console.log('Filme salvo com sucesso:', newMovie);
    res.status(201).json(newMovie);
  }
  catch (error) {
    console.error('Erro ao criar filme:', error);
    res.status(500).json({
      error: 'Erro interno no servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
});
// Atualizar um filme existente
app.put('/movies/:id', async (req: Request, res: Response) => {
  try {
    // pegar o id do registro que vai ser atualizado
    const id = Number(req.params.id);

    // pegar os dados do filme que vai ser atualizado
    const { title, genre_id, language_id, oscar_count, release_date } = req.body;

    if (isNaN(id)) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    // Verificar se o filme existe
    const movie = await prisma.movie.findUnique({
      where: { id },
    });

    if (!movie) {
      res.status(404).json({ message: 'Filme não encontrado' });
      return;
    }

    // Se o título for alterado, verificar se já existe outro filme com o mesmo título
    if (title) {
      const movieWithSameTitle = await prisma.movie.findFirst({
        where: {
          title: {
            equals: title,
            mode: 'insensitive',
          },
          id: {
            not: id,
          },
        },
      });

      if (movieWithSameTitle) {
        res.status(409).json({ message: 'Já existe um outro filme cadastrado com esse título' });
        return;
      }
    }

    const updatedMovie = await prisma.movie.update({
      where: { id },
      data: {
        title: title ?? undefined,
        genre_id: genre_id ?? undefined,
        language_id: language_id ?? undefined,
        oscar_count: oscar_count ?? undefined,
        release_date: release_date ? new Date(release_date) : undefined,
      },
    });

    // retornar o status correto informando que o filme foi atualizado
    res.status(200).json({
      message: 'Filme atualizado com sucesso!',
      movie: updatedMovie,
    });
  }
  catch (error) {
    console.error('Erro ao atualizar filme:', error);
    res.status(500).json({
      error: 'Erro interno no servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
});

// Remover um filme existente
app.delete('/movies/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    // Verificar se o filme existe antes de deletar
    const movie = await prisma.movie.findUnique({
      where: { id },
    });

    if (!movie) {
      res.status(404).json({ message: 'Filme não encontrado' });
      return;
    }

    await prisma.movie.delete({
      where: { id },
    });

    res.status(200).json({ message: 'Filme removido com sucesso!' });
  }
  catch (error) {
    console.error('Erro ao remover filme:', error);
    res.status(500).json({
      error: 'Erro interno no servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
