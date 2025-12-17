import { PrismaClient } from '../generated/prisma/client'
import express from 'express'

const prisma = new PrismaClient();

const app = express()
const port = 3000

app.get('/movies', async (req, res) => {
  const movies = await prisma.movie.findMany()
  res.json(movies)
})

app.listen(port, () => {
  console.log(`Servidor em execução em http://localhost:${port}`)
})
