import express from 'express'
import { Error as MongooseError } from 'mongoose'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { AppError } from '../src/errors/AppError.js'
import { errorHandler } from '../src/middleware/errorHandler.js'

const appFor = (error: Error) => {
  const app = express()
  app.get('/error', (_req, _res, next) => next(error))
  app.use(errorHandler)
  return app
}

describe('errorHandler', () => {
  it('serializes AppError values without extra internal fields', async () => {
    await request(appFor(new AppError('Conflict', 409, 'CONFLICT'))).get('/error').expect(409, {
      error: { code: 'CONFLICT', message: 'Conflict' },
    })
  })

  it('normalizes Mongoose cast errors', async () => {
    await request(appFor(new MongooseError.CastError('ObjectId', 'bad', '_id'))).get('/error').expect(400, {
      error: { code: 'INVALID_ID', message: 'Invalid resource ID' },
    })
  })

  it('hides unexpected error internals', async () => {
    await request(appFor(new Error('mongodb password=secret'))).get('/error').expect(500, {
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
    })
  })
})
