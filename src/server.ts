import express from 'express'
import { PrismaClient } from '@prisma/client'

const port = 3000;
const app = express();
const prisma = new PrismaClient();
//get, post, put, patch, delete
app.get('/movies', async (req, res) => {
  const movies = await prisma.movies.findMany();
  res.json(prisma)
});

app.listen(port, () => {
  console.log(`Servidor em execução em http://localhost:${port}`)
});
