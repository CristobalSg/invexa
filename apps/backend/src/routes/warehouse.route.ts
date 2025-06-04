import { Router } from 'express'
import {
  getWarehouses,
  getWarehouse,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
} from '../controllers/warehouse.controller'

const router = Router()

router.get('/', getWarehouses)
router.get('/:id', getWarehouse)
router.post('/', createWarehouse)
router.put('/:id', updateWarehouse)
router.delete('/:id', deleteWarehouse)

export default router