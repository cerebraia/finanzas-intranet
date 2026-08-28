import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import router     from './routes/index.js'
import authRouter from './routes/auth.routes.js'
import { errorHandler } from './middlewares/errorHandler.js'
import { prisma } from './lib/prisma.js'

export const app = express()

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:4173']

app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ ok: true, db: 'connected', env: process.env.NODE_ENV ?? 'development' })
  } catch {
    res.status(503).json({ ok: false, db: 'disconnected' })
  }
})

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter)
app.use('/api',      router)

app.use(errorHandler)
