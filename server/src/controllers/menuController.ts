import type { RequestHandler } from 'express'
import { menuService } from '../services/menuService.js'

export const getMenu: RequestHandler = async (_req, res) => {
  const menu = await menuService.getAvailableMenu()
  res.status(200).json({ data: menu })
}
