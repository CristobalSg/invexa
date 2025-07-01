import { Router } from 'express'
import userRouter from './user.route'
import productRouter from './product.route'
import inventoryRouter from './inventory.route'
import productTypeRouter from './productType.route'
import presentationRouter from './presentation.route'
import transactionRouter from './transaction.route'
import authRoutes from './auth.route'
import { authenticateJWT } from '../controllers/auth.middleware'

const router = Router()

router.use('/users', userRouter)
router.use('/products', authenticateJWT, productRouter)
router.use('/inventories', authenticateJWT, inventoryRouter)
router.use('/product-types', productTypeRouter)
router.use('/presentations', presentationRouter)
router.use('/transactions', authenticateJWT, transactionRouter)
router.use('/auth', authRoutes)

export default router