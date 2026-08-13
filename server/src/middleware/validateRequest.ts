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

export const validateQuery = (schema: ZodType): RequestHandler => (req, res, next) => {
  const result = schema.safeParse(req.query)
  if (!result.success) {
    next(new AppError('Invalid request query', 400, 'VALIDATION_ERROR'))
    return
  }
  res.locals.validatedQuery = result.data
  next()
}
