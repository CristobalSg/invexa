import { RequestHandler } from 'express'
import prisma from '../prisma/client'
import { createUserSchema } from '../schemas/user.schema'

export const createUser: RequestHandler = async (req, res) => {
  const result = createUserSchema.safeParse(req.body)

  if (!result.success) {
    res.status(400).json({ error: result.error.format() })
    return
  }

  const { username, password, name, email, roleId } = result.data

  try {
    const user = await prisma.user.create({
      data: {
        username,
        password,
        name,
        email,
        roleId,
      },
    })
    res.status(201).json(user)
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const getUsers: RequestHandler = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: { role: true },
    })
    res.json(users)
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error' })
  }
}
