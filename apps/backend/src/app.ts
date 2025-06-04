import express from 'express'
import helmet from 'helmet'
import userRouter from './routes/user.route'

const app = express()

app.use(helmet())
app.use(express.json())

app.use('/api/users', userRouter)

export default app

