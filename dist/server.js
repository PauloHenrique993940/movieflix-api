import express from 'express';
import 'dotenv/config';
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from './swagger.json' with { type: 'json' };
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
const port = 3000;
const app = express();
app.use(express.json());
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
/* =========================
  DATABASE
========================= */
const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
/* =========================
  GET MOVIES (filtros + paginação)
========================= */
app.get('/movies', async (req, res) => {
    try {
        const { genre, title, page = '1', limit = '10' } = req.query;
        const movies = await prisma.movie.findMany({
            where: {
                ...(genre && {
                    genres: {
                        name: {
                            equals: genre,
                            mode: 'insensitive',
                        },
                    },
                }),
                ...(title && {
                    title: {
                        contains: title,
                        mode: 'insensitive',
                    },
                }),
            },
            include: {
                genres: true,
                languages: true,
            },
            orderBy: { title: 'asc' },
            skip: (Number(page) - 1) * Number(limit),
            take: Number(limit),
        });
        res.status(200).json(movies);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar filmes' });
    }
});
/* =========================
  GET MOVIE BY ID
========================= */
app.get('/movies/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ message: 'ID inválido' });
        }
        const movie = await prisma.movie.findUnique({
            where: { id },
            include: {
                genres: true,
                languages: true,
            },
        });
        if (!movie) {
            return res.status(404).json({ message: 'Filme não encontrado' });
        }
        res.status(200).json(movie);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar filme' });
    }
});
/* =========================
  CREATE MOVIE
========================= */
app.post('/movies', async (req, res) => {
    try {
        const { title, genre_id, language_id, oscar_count, release_date } = req.body;
        if (!title || !genre_id || !language_id || oscar_count == null || !release_date) {
            return res.status(400).json({ message: 'Todos os campos são obrigatórios' });
        }
        const exists = await prisma.movie.findFirst({
            where: {
                title: { equals: title, mode: 'insensitive' },
            },
        });
        if (exists) {
            return res.status(409).json({ message: 'Filme já existe' });
        }
        const genre = await prisma.genre.findUnique({ where: { id: genre_id } });
        const language = await prisma.language.findUnique({ where: { id: language_id } });
        if (!genre || !language) {
            return res.status(400).json({ message: 'Genre ou Language inválido' });
        }
        const movie = await prisma.movie.create({
            data: {
                title,
                oscar_count,
                release_date: new Date(release_date),
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
  UPDATE MOVIE (FIX PRISMA)
========================= */
app.put('/movies/:id', async (req, res) => {
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
        // objeto seguro (SEM undefined)
        const data = {};
        if (title !== undefined)
            data.title = title;
        if (oscar_count !== undefined)
            data.oscar_count = oscar_count;
        if (release_date !== undefined) {
            data.release_date = new Date(release_date);
        }
        if (genre_id !== undefined) {
            const genre = await prisma.genre.findUnique({ where: { id: genre_id } });
            if (!genre) {
                return res.status(400).json({ message: 'Gênero inválido' });
            }
            data.genres = { connect: { id: genre_id } };
        }
        if (language_id !== undefined) {
            const language = await prisma.language.findUnique({ where: { id: language_id } });
            if (!language) {
                return res.status(400).json({ message: 'Idioma inválido' });
            }
            data.languages = { connect: { id: language_id } };
        }
        const updatedMovie = await prisma.movie.update({
            where: { id },
            data,
        });
        res.status(200).json(updatedMovie);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao atualizar filme' });
    }
});
/* =========================
  DELETE MOVIE
========================= */
app.delete('/movies/:id', async (req, res) => {
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
        res.status(204).send();
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao deletar filme' });
    }
});
/* =========================
  START SERVER
========================= */
app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
    console.log(`📄 Swagger: http://localhost:${port}/docs`);
});
//# sourceMappingURL=server.js.map