import { Request, Response } from 'express'
import prisma from '../prisma/client'
import { createProductTypeSchema, updateProductTypeSchema } from '../schemas/productType.schema'

export async function createProductType(req: Request, res: Response) {
  const result = createProductTypeSchema.safeParse(req.body)
  if (!result.success) return res.status(400).json({ error: result.error.format() })
  try {
    const productType = await prisma.productType.create({ data: result.data })
    return res.status(201).json(productType)
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export async function getProductTypes(req: Request, res: Response) {
  try {
    const productTypes = await prisma.productType.findMany()
    return res.json(productTypes)
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export async function getProductType(req: Request, res: Response) {
  const id = Number(req.params.id)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' })
  try {
    const productType = await prisma.productType.findUnique({ where: { id } })
    if (!productType) return res.status(404).json({ error: 'ProductType not found' })
    return res.json(productType)
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export async function updateProductType(req: Request, res: Response) {
  const id = Number(req.params.id)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' })
  const result = updateProductTypeSchema.safeParse(req.body)
  if (!result.success) return res.status(400).json({ error: result.error.format() })
  try {
    const productType = await prisma.productType.update({ where: { id }, data: result.data })
    return res.json(productType)
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export async function deleteProductType(req: Request, res: Response) {
  const id = Number(req.params.id)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' })
  try {
    await prisma.productType.delete({ where: { id } })
    return res.status(204).send()
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
}
