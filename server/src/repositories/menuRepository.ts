import { MenuItem } from '../models/MenuItem.js'

export const menuRepository = {
  findAvailable: () => MenuItem.find({ available: true }).lean(),
  findByIds: (ids: string[]) => MenuItem.find({ _id: { $in: ids } }).lean(),
  findById: (id: string) => MenuItem.findById(id).lean(),
  findAll: () => MenuItem.find().lean(),
}
