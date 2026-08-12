import { menuRepository } from '../repositories/menuRepository.js'

export const menuService = {
  getAvailableMenu: () => menuRepository.findAvailable(),
}
