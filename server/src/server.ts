import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'
import { createServer } from 'node:http'
import mongoose from 'mongoose'
import { Server } from 'socket.io'
import { createApp } from './app.js'
import { createSocketOrderStatusPublisher, registerOrderSocketHandlers } from './realtime/orderStatusPublisher.js'
import { createOrderService } from './services/orderService.js'
import { hasAdminSession, readCookie } from './auth/session.js'

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) })

const mongoUri = process.env.MONGODB_URI
if (!mongoUri) throw new Error('MONGODB_URI must be set before starting the server')

const port = Number(process.env.PORT ?? 8000)
mongoose.connect(mongoUri)
  .then(() => {
    const httpServer = createServer()
    const io = new Server(httpServer, { cors: { origin: process.env.CLIENT_URL ?? 'http://localhost:5173', credentials: true } })
    io.use((socket, next) => { socket.data.isAdmin = hasAdminSession(readCookie(socket.handshake.headers.cookie)); next() })
    io.on('connection', registerOrderSocketHandlers)
    httpServer.on('request', createApp(createOrderService(createSocketOrderStatusPublisher(io))))
    httpServer.listen(port, () => console.log(`API listening on port ${port}`))
  })
  .catch((error: unknown) => {
    console.error('Unable to connect to MongoDB')
    console.error(error instanceof Error ? error.message : 'Unknown database error')
    process.exitCode = 1
  })
