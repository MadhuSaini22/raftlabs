import type { ErrorRequestHandler } from 'express'
import { Error as MongooseError } from 'mongoose'
import { AppError } from '../errors/AppError.js'

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ error: { code: error.code, message: error.message } })
    return
  }
  if (error instanceof MongooseError.CastError) {
    res.status(400).json({ error: { code: 'INVALID_ID', message: 'Invalid resource ID' } })
    return
  }
  if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({ error: { code: 'MALFORMED_JSON', message: 'Malformed JSON request body' } })
    return
  }
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } })
}
