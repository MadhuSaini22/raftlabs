import { io, type Socket } from 'socket.io-client'
import { DEFAULT_SOCKET_URL } from '../constants/config'

const socketUrl = import.meta.env.VITE_SOCKET_URL ?? DEFAULT_SOCKET_URL

export const createOrderSocket = (): Socket => io(socketUrl, {
  transports: ['websocket'],
  reconnection: true,
  withCredentials: true,
})
