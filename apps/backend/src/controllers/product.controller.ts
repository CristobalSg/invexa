import { Request, Response } from 'express'
import prisma from '../prisma/client'
import { createProductSchema, updateProductSchema } from '../schemas/product.schema'

export async function createProduct(req: Request, res: Response) {
  const result = createProductSchema.safeParse(req.body)
  if (!result.success) return res.status(400).json({ error: result.error.format() })

  try {
    const product = await prisma.product.create({ data: result.data })
    // Convertir id a string
    return res.status(201).json({ ...product, id: product.id.toString() })
  } catch (e: any) {
    if (e.code === 'P2002' && e.meta?.target?.includes('barcode')) {
      return res.status(400).json({ error: 'El código de barra ya existe' })
    }
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export async function getProducts(req: Request, res: Response) {
  try {
    const products = await prisma.product.findMany()
    // Convertir id a string para cada producto
    const productsWithStringId = products.map((p) => ({ ...p, id: p.id.toString() }))
    return res.json(productsWithStringId)
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export async function getProduct(req: Request, res: Response) {
  const id = Number(req.params.id)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' })

  try {
    const product = await prisma.product.findUnique({ where: { id } })
    if (!product) return res.status(404).json({ error: 'Product not found' })
    // Convertir id a string
    return res.json({ ...product, id: product.id.toString() })
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export async function updateProduct(req: Request, res: Response) {
  const id = Number(req.params.id)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' })

  const result = updateProductSchema.safeParse(req.body)
  if (!result.success) return res.status(400).json({ error: result.error.format() })

  try {
    const product = await prisma.product.update({ where: { id }, data: result.data })
    // Convertir id a string
    return res.json({ ...product, id: product.id.toString() })
  } catch (e: any) {
    if (e.code === 'P2002' && e.meta?.target?.includes('barcode')) {
      return res.status(400).json({ error: 'El código de barra ya existe' })
    }
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export async function deleteProduct(req: Request, res: Response) {
  const id = Number(req.params.id)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' })

  try {
    await prisma.product.delete({ where: { id } })
    return res.status(204).send()
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export async function getProductByBarcode(req: Request, res: Response) {
  const barcode = req.query.barcode as string
  if (!barcode) return res.status(400).json({ error: 'Barcode is required' })

  try {
    const product = await prisma.product.findUnique({ where: { barcode } })
    if (!product) return res.status(404).json({ error: 'Product not found' })
    return res.json({ ...product, id: product.id.toString() })
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
}
