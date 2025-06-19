import { Router } from 'express'
import userRouter from './user.route'
import productRouter from './product.route'
import inventoryRouter from './inventory.route'
import productTypeRouter from './productType.route'
import presentationRouter from './presentation.route'
import transactionRouter from './transaction.route'

const router = Router()

router.use('/users', userRouter)
router.use('/products', productRouter)
router.use('/inventories', inventoryRouter)
router.use('/product-types', productTypeRouter)
router.use('/presentations', presentationRouter)
router.use('/transactions', transactionRouter)

export default router