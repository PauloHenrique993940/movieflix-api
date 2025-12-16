import express from 'express'
import { PrismaClient } from './generated/prisma'

const app = express() // ✅ Express
const prisma = new PrismaClient() // ✅ Prisma

app.use(express.json())

app.get('/movies', async (req, res) => {
    const movies = await prisma.movie.findMany()
    res.json(movies)
})

app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000')
})
