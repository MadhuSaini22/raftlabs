import { Router } from 'express'
import { getMenu } from '../controllers/menuController.js'

export const menuRoutes = Router()
menuRoutes.get('/', getMenu)
