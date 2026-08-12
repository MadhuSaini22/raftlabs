import { io, type Socket } from 'socket.io-client'

const socketUrl = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:8000'

export const createOrderSocket = (): Socket => io(socketUrl, {
  transports: ['websocket'],
  reconnection: true,
  withCredentials: true,
})
