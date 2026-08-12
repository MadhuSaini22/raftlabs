import express from 'express'; import cors from 'cors'; import { api, errorHandler } from './routes/index.js'
export const app = express(); app.use(cors()); app.use(express.json()); app.use('/api/v1', api); app.use(errorHandler)
