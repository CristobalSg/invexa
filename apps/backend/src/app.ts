import cors from "cors";
import helmet from 'helmet'
import express from 'express'
import apiRouter from './routes'

const app = express()


app.use(cors({
  origin: ["http://localhost:5173", "https://invexa-five.vercel.app", "https://invexa.inf.uct.cl"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}));

app.use(helmet())
app.use(express.json())

app.use('/api', apiRouter)

export default app
