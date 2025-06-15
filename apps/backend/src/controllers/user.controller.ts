import { Request, Response } from 'express'
import prisma from '../prisma/client'
import { createUserSchema, updateUserSchema } from '../schemas/user.schema'

export async function createUser(req: Request, res: Response) {
  const result = createUserSchema.safeParse(req.body)
  if (!result.success) {
    return res.status(400).json({ error: result.error.format() })
  }

  try {
    const user = await prisma.user.create({ data: result.data })
    // Convertir BigInt a string para serializar correctamente
    const userSerialized = {
      ...user,
      id: user.id.toString(),
      roleId: user.roleId ? user.roleId.toString() : undefined,
    }
    return res.status(201).json(userSerialized)
  } catch (error: any) {
    console.error('Error creating user:', error)
    if (error.code === 'P2002' && error.meta?.target?.includes('username')) {
      return res.status(400).json({ error: 'El nombre de usuario ya existe' })
    }
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
      return res.status(400).json({ error: 'El email ya existe' })
    }
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export async function getUsers(req: Request, res: Response) {
  try {
    const users = await prisma.user.findMany({ include: { role: true } })
    // Serializar BigInt y roleId correctamente
    const usersSerialized = users.map(user => ({
      ...user,
      id: user.id.toString(),
      roleId: user.roleId ? user.roleId.toString() : undefined,
      role: user.role || null,
    }))
    return res.json(usersSerialized)
  } catch (error) {
    console.error('Error fetching users:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export async function getUser(req: Request, res: Response) {
  const id = Number(req.params.id)
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid ID' })
  }

  try {
    const user = await prisma.user.findUnique({ 
      where: { id }, 
      include: { role: true } 
    })
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    return res.json(user)
  } catch (error) {
    console.error('Error fetching user:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export async function updateUser(req: Request, res: Response) {
  const id = Number(req.params.id)
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid ID' })
  }

  const result = updateUserSchema.safeParse(req.body)
  if (!result.success) {
    return res.status(400).json({ error: result.error.format() })
  }

  try {
    const user = await prisma.user.update({ 
      where: { id }, 
      data: result.data 
    })
    // Convertir BigInt a string para serializar correctamente
    const userSerialized = {
      ...user,
      id: user.id.toString(),
      roleId: user.roleId ? user.roleId.toString() : undefined,
    }
    return res.json(userSerialized)
  } catch (error: any) {
    console.error('Error updating user:', error)
    if (error.code === 'P2002' && error.meta?.target?.includes('username')) {
      return res.status(400).json({ error: 'El nombre de usuario ya existe' })
    }
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
      return res.status(400).json({ error: 'El email ya existe' })
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export async function deleteUser(req: Request, res: Response) {
  const id = Number(req.params.id)
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid ID' })
  }

  try {
    await prisma.user.delete({ where: { id } })
    return res.status(204).send()
  } catch (error) {
    console.error('Error deleting user:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}