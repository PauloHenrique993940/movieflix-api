/* eslint-disable @typescript-eslint/no-unused-vars */
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

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/* =========================
  GET MOVIES
========================= */
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
      orderBy: { title: 'asc' },
      include: {
        genres: true,
        languages: true,
      },
    });

    res.json(movies);
  }
  catch (error) {
    res.status(500).json({ error: 'Erro ao buscar filmes' });
  }
});

/* =========================
  CREATE MOVIE
========================= */
app.post('/movies', async (req: Request, res: Response) => {
  try {
    const { title, genre_id, language_id, oscar_count, release_date } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Título é obrigatório' });
    }

    // verificar duplicado
    const exists = await prisma.movie.findFirst({
      where: {
        title: { equals: title, mode: 'insensitive' },
      },
    });

    if (exists) {
      return res.status(409).json({ message: 'Filme já existe' });
    }

    // validar FK
    const genre = await prisma.genre.findUnique({
      where: { id: genre_id },
    });

    const language = await prisma.language.findUnique({
      where: { id: language_id },
    });

    if (!genre || !language) {
      return res.status(400).json({
        message: 'Genre ou Language inválido',
      });
    }

    const movie = await prisma.movie.create({
      data: {
        title,
        oscar_count,
        release_date: release_date ? new Date(release_date) : null,
        genres: { connect: { id: genre_id } },
        languages: { connect: { id: language_id } },
      },
    });

    res.status(201).json(movie);
  }
  catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar filme' });
  }
});

/* =========================
  UPDATE MOVIE
========================= */
app.put('/movies/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { title, genre_id, language_id, oscar_count, release_date } = req.body;

    if (isNaN(id)) {
      return res.status(400).json({ message: 'ID inválido' });
    }

    const movie = await prisma.movie.findUnique({ where: { id } });

    if (!movie) {
      return res.status(404).json({ message: 'Filme não encontrado' });
    }

    // validar título duplicado
    if (title) {
      const exists = await prisma.movie.findFirst({
        where: {
          title: { equals: title, mode: 'insensitive' },
          id: { not: id },
        },
      });

      if (exists) {
        return res.status(409).json({ message: 'Título já existe' });
      }
    }

    // validar FK (só se vier)
    if (genre_id) {
      const genre = await prisma.genre.findUnique({
        where: { id: genre_id },
      });
      if (!genre) {
        return res.status(400).json({ message: 'Gênero inválido' });
      }
    }

    if (language_id) {
      const language = await prisma.language.findUnique({
        where: { id: language_id },
      });
      if (!language) {
        return res.status(400).json({ message: 'Idioma inválido' });
      }
    }

    const updatedMovie = await prisma.movie.update({
      where: { id },
      data: {
        title: title ?? undefined,
        oscar_count: oscar_count ?? undefined,
        release_date: release_date ? new Date(release_date) : undefined,

        genres: genre_id
          ? { connect: { id: genre_id } }
          : undefined,

        languages: language_id
          ? { connect: { id: language_id } }
          : undefined,
      },
    });

    res.json(updatedMovie);
  }
  catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar filme' });
  }
});

/* =========================
  DELETE MOVIE
========================= */
app.delete('/movies/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ message: 'ID inválido' });
    }

    const movie = await prisma.movie.findUnique({ where: { id } });

    if (!movie) {
      return res.status(404).json({ message: 'Filme não encontrado' });
    }

    await prisma.movie.delete({ where: { id } });

    res.json({ message: 'Filme deletado com sucesso' });
  }
  catch (error) {
    res.status(500).json({ error: 'Erro ao deletar filme' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
