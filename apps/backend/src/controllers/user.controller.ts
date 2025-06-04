import { Request, Response } from 'express'
import prisma from '../prisma/client'
import { createUserSchema } from '../schemas/user.schema'

export async function createUser(req: Request, res: Response) {
  const result = createUserSchema.safeParse(req.body)

  if (!result.success) {
    res.status(400).json({ error: result.error.format() })
  }

  const { name, email } = result.data! // Aquí le decimos a ts que se relaje, que confie

  try {
    const user = await prisma.user.create({ data: { name, email } })
    res.status(201).json(user)
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error' })
  }
}

export async function getUsers(req: Request, res: Response) {
  try {
    const users = await prisma.user.findMany()
    res.json(users)
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error' })
  }
}
