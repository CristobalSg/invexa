import { Router } from 'express'
import {
  getAllInventory,
  getInventory,
  createInventory,
  updateInventory,
  deleteInventory,
} from '../controllers/inventory.controller'

const router = Router()

router.get('/', getAllInventory)
router.get('/:id', getInventory)
router.post('/', createInventory)
router.put('/:id', updateInventory)
router.delete('/:id', deleteInventory)

export default router
