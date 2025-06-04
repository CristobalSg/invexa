import { Router } from 'express'
import userRouter from './user.route'
import warehouseRouter from './warehouse.route'
import productRouter from './product.route'
import inventoryRouter from './inventory.route'

const router = Router()

router.use('/users', userRouter)
router.use('/warehouses', warehouseRouter)
router.use('/products', productRouter)
router.use('/inventories', inventoryRouter)

export default router