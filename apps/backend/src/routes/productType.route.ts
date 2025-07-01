import { Router } from 'express'
import {
  getProductTypes,
  getProductType,
  createProductType,
  updateProductType,
  deleteProductType,
} from '../controllers/productType.controller'

const router = Router()

router.get('/', getProductTypes)
router.get('/:id', getProductType)
router.post('/', createProductType)
router.put('/:id', updateProductType)
router.delete('/:id', deleteProductType)

export default router
