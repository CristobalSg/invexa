import { Request, Response } from 'express'
import prisma from '../prisma/client'
import { createInventorySchema, updateInventorySchema } from '../schemas/inventory.schema'

export async function createInventory(req: Request, res: Response) {
  const result = createInventorySchema.safeParse(req.body)
  if (!result.success) return res.status(400).json({ error: result.error.format() })

  try {
    const inventory = await prisma.inventory.create({ data: result.data })
    return res.status(201).json(inventory)
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export async function getInventories(req: Request, res: Response) {
  try {
    const inventories = await prisma.inventory.findMany()
    return res.json(inventories)
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export async function getInventory(req: Request, res: Response) {
  const id = Number(req.params.id)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' })

  try {
    const inventory = await prisma.inventory.findUnique({ where: { id } })
    if (!inventory) return res.status(404).json({ error: 'Inventory not found' })
    return res.json(inventory)
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export async function updateInventory(req: Request, res: Response) {
  const id = Number(req.params.id)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' })

  const result = updateInventorySchema.safeParse(req.body)
  if (!result.success) return res.status(400).json({ error: result.error.format() })

  try {
    const inventory = await prisma.inventory.update({ where: { id }, data: result.data })
    return res.json(inventory)
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export async function deleteInventory(req: Request, res: Response) {
  const id = Number(req.params.id)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' })

  try {
    await prisma.inventory.delete({ where: { id } })
    return res.status(204).send()
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
}
