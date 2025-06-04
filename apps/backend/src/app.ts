import express from 'express'
import helmet from 'helmet'
import apiRouter from './routes'

const app = express()

app.use(helmet())
app.use(express.json())

app.use('/api', apiRouter)

export default app
