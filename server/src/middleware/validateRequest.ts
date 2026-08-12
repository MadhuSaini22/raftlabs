import type { RequestHandler } from 'express'
import type { ZodType } from 'zod'
import { AppError } from '../errors/AppError.js'

export const validateBody = (schema: ZodType): RequestHandler => (req, _res, next) => {
  const result = schema.safeParse(req.body)
  if (!result.success) {
    next(new AppError('Invalid request data', 400, 'VALIDATION_ERROR'))
    return
  }
  req.body = result.data
  next()
}
