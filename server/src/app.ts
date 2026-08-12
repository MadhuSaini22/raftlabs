import cors from 'cors'
import express from 'express'
import { errorHandler } from './middleware/errorHandler.js'
import { notFound } from './middleware/notFound.js'
import { createApi } from './routes/index.js'
import { orderService, type createOrderService } from './services/orderService.js'

export const createApp = (service: ReturnType<typeof createOrderService> = orderService) => {
  const app = express()
  app.use(cors({ origin: process.env.CLIENT_URL ?? 'http://localhost:5173', credentials: true }))
  app.use(express.json())
  app.use('/api/v1', createApi(service))
  app.use(notFound)
  app.use(errorHandler)
  return app
}

export const app = createApp()
