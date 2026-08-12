import 'dotenv/config'; import { createServer } from 'node:http'; import mongoose from 'mongoose'; import { Server } from 'socket.io'; import { app } from './app.js'
const http = createServer(app); const io = new Server(http, { cors: { origin: process.env.CLIENT_URL ?? 'http://localhost:5173' } }); io.on('connection', socket => socket.on('order:subscribe', (id: string) => socket.join(`order:${id}`)))
mongoose.connect(process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/table-co').then(() => http.listen(process.env.PORT ?? 3000, () => console.log('API listening'))).catch(console.error)
