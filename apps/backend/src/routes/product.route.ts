import { Router } from 'express'
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductByBarcode,
  createFullProductFlow,
} 
from '../controllers/product.controller'

const router = Router()

router.get('/', (req, res, next) => {
  if (req.query.barcode) return getProductByBarcode(req, res)
  return getProducts(req, res)
})
router.get('/:id', getProduct)
router.post('/', createProduct)
router.post('/full', createFullProductFlow)
router.put('/:id', updateProduct)
router.delete('/:id', deleteProduct)

export default router
