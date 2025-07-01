import { Request, Response } from 'express'
import prisma from '../prisma/client'
import { createInventorySchema, updateInventorySchema } from '../schemas/inventory.schema'
import { AuthRequest } from './auth.middleware'

export async function createInventory(req: AuthRequest, res: Response) {
  const result = createInventorySchema.safeParse(req.body)
  if (!result.success) return res.status(400).json({ error: result.error.format() })

  try {
    const companyId = req.user?.companyId
    if (!companyId) return res.status(401).json({ error: 'No autorizado' })
    const inventory = await prisma.inventory.create({ data: { ...result.data, companyId: BigInt(companyId) } })
    return res.status(201).json(inventory)
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export const getAllInventory = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId
    if (!companyId) return res.status(401).json({ error: 'No autorizado' })
    const inventory = await prisma.inventory.findMany({ where: { companyId: BigInt(companyId) } })
    res.json(inventory)
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener inventario' })
  }
}

export async function getInventory(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' })

  try {
    const companyId = req.user?.companyId
    if (!companyId) return res.status(401).json({ error: 'No autorizado' })
    const inventory = await prisma.inventory.findFirst({ where: { id, companyId: BigInt(companyId) } })
    if (!inventory) return res.status(404).json({ error: 'Inventory not found' })
    return res.json(inventory)
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export async function updateInventory(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' })

  const result = updateInventorySchema.safeParse(req.body)
  if (!result.success) return res.status(400).json({ error: result.error.format() })

  try {
    const companyId = req.user?.companyId
    if (!companyId) return res.status(401).json({ error: 'No autorizado' })
    const inventory = await prisma.inventory.updateMany({
      where: { id, companyId: BigInt(companyId) },
      data: result.data
    })
    if (inventory.count === 0) return res.status(404).json({ error: 'Inventory not found' })
    return res.json({ success: true })
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export async function deleteInventory(req: AuthRequest, res: Response) {
  const id = Number(req.params.id)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' })

  try {
    const companyId = req.user?.companyId
    if (!companyId) return res.status(401).json({ error: 'No autorizado' })
    const deleted = await prisma.inventory.deleteMany({ where: { id, companyId: BigInt(companyId) } })
    if (deleted.count === 0) return res.status(404).json({ error: 'Inventory not found' })
    return res.status(204).send()
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
}
