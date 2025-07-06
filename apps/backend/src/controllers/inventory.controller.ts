import { Request, Response } from 'express'
import { z } from "zod";
import prisma from '../prisma/client'
import { createInventorySchema, updateInventorySchema } from '../schemas/inventory.schema'
import { AuthRequest } from './auth.middleware'

export async function createInventory(req: AuthRequest, res: Response) {
  const result = createInventorySchema.safeParse(req.body)
  if (!result.success) return res.status(400).json({ error: result.error.format() })

  try {
    const companyId = req.user?.companyId
    if (!companyId) return res.status(401).json({ error: 'No autorizado' })
    const inventory = await prisma.inventory.create({ data: { ...result.data, companyId: companyId } })
    return res.status(201).json(inventory)
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export const getAllInventory = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId
    if (!companyId) return res.status(401).json({ error: 'No autorizado' })
    const inventory = await prisma.inventory.findMany({ where: { companyId: companyId } })
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
    const inventory = await prisma.inventory.findFirst({ where: { id, companyId: companyId } })
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
      where: { id, companyId: companyId },
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
    const deleted = await prisma.inventory.deleteMany({ where: { id, companyId: companyId } })
    if (deleted.count === 0) return res.status(404).json({ error: 'Inventory not found' })
    return res.status(204).send()
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
}

const registerSaleSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.number(),
        quantity: z.number().positive(),
      })
    )
    .nonempty(),
});

export async function registerSale(req: AuthRequest, res: Response) {
  console.log("Body recibido:", req.body);
  const parsed = registerSaleSchema.safeParse(req.body);

  if (!parsed.success) {
    console.error("Error en schema:", parsed.error.format());
    return res.status(400).json({ error: parsed.error.format() });
}

  const companyId = Number(req.user?.companyId);

  if (!companyId) {
    return res.status(401).json({ error: "No autorizado" });
  }

  try {
    const { items } = parsed.data;

    const updatedItems = await prisma.$transaction(
      items.map(({ productId, quantity }) =>
        prisma.inventory.updateMany({
          where: { productId, companyId },
          data: {
            quantity: {
              decrement: quantity,
            },
          },
        })
      )
    );

    // Crear transacciones de tipo "SALE"
    await prisma.transaction.createMany({
      data: items.map(({ productId, quantity }) => ({
        type: "SALE",
        quantity,
        productId,
      })),
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error al registrar venta:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}
