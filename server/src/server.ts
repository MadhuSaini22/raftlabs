import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'
import { createServer } from 'node:http'
import mongoose from 'mongoose'
import { Server } from 'socket.io'
import { createApp } from './app.js'
import { createSocketOrderStatusPublisher, registerAdminSessionRevocation, registerOrderSocketHandlers } from './realtime/orderStatusPublisher.js'
import { createOrderService } from './services/orderService.js'
import { readCookie } from './auth/session.js'
import { DEFAULT_CLIENT_URL, DEFAULT_SERVER_PORT } from './constants/config.js'

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) })

const mongoUri = process.env.MONGODB_URI
if (!mongoUri) throw new Error('MONGODB_URI must be set before starting the server')

const port = Number(process.env.PORT ?? DEFAULT_SERVER_PORT)
mongoose.connect(mongoUri)
  .then(() => {
    const httpServer = createServer()
    const io = new Server(httpServer, { cors: { origin: process.env.CLIENT_URL ?? DEFAULT_CLIENT_URL, credentials: true } })
    io.use((socket, next) => { socket.data.adminSessionToken = readCookie(socket.handshake.headers.cookie); next() })
    registerAdminSessionRevocation(io)
    io.on('connection', registerOrderSocketHandlers)
    httpServer.on('request', createApp(createOrderService(createSocketOrderStatusPublisher(io))))
    httpServer.listen(port, () => console.log(`API listening on port ${port}`))
  })
  .catch((error: unknown) => {
    console.error('Unable to connect to MongoDB')
    console.error(error instanceof Error ? error.message : 'Unknown database error')
    process.exitCode = 1
  })
