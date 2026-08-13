import cors from 'cors'
import express from 'express'
import { errorHandler } from './middleware/errorHandler.js'
import { notFound } from './middleware/notFound.js'
import { createApi } from './routes/index.js'
import { orderService, type createOrderService } from './services/orderService.js'
import { DEFAULT_CLIENT_URL } from './constants/config.js'

export const createApp = (service: ReturnType<typeof createOrderService> = orderService) => {
  const app = express()
  // Render sits behind a proxy; this makes req.ip meaningful for login limiting.
  app.set('trust proxy', 1)
  app.use(cors({ origin: process.env.CLIENT_URL ?? DEFAULT_CLIENT_URL, credentials: true }))
  app.use(express.json())
  app.use('/api/v1', createApi(service))
  app.use(notFound)
  app.use(errorHandler)
  return app
}

export const app = createApp()
