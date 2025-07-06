// Archivo deshabilitado: el modelo Warehouse no existe en schema.prisma
// import { Request, Response } from 'express'
// import prisma from '../prisma/client'
// import { createWarehouseSchema, updateWarehouseSchema } from '../schemas/warehouse.schema'
//
// export async function createWarehouse(req: Request, res: Response) {
//   const result = createWarehouseSchema.safeParse(req.body)
//   if (!result.success) {
//     return res.status(400).json({ error: result.error.format() })
//   }
//
//   try {
//     const warehouse = await prisma.warehouse.create({ data: result.data })
//     return res.status(201).json(warehouse)
//   } catch (error) {
//     console.error('Error creating warehouse:', error)
//     return res.status(500).json({ error: 'Internal server error' })
//   }
// }
//
// export async function getWarehouses(req: Request, res: Response) {
//   try {
//     const warehouses = await prisma.warehouse.findMany()
//     return res.json(warehouses)
//   } catch (error) {
//     console.error('Error fetching warehouses:', error)
//     return res.status(500).json({ error: 'Internal server error' })
//   }
// }
//
// export async function getWarehouse(req: Request, res: Response) {
//   const id = Number(req.params.id)
//   if (isNaN(id)) {
//     return res.status(400).json({ error: 'Invalid ID' })
//   }
//
//   try {
//     const warehouse = await prisma.warehouse.findUnique({ where: { id } })
//     if (!warehouse) {
//       return res.status(404).json({ error: 'Warehouse not found' })
//     }
//     return res.json(warehouse)
//   } catch (error) {
//     console.error('Error fetching warehouse:', error)
//     return res.status(500).json({ error: 'Internal server error' })
//   }
// }
//
// export async function updateWarehouse(req: Request, res: Response) {
//   const id = Number(req.params.id)
//   if (isNaN(id)) {
//     return res.status(400).json({ error: 'Invalid ID' })
//   }
//
//   const result = updateWarehouseSchema.safeParse(req.body)
//   if (!result.success) {
//     return res.status(400).json({ error: result.error.format() })
//   }
//
//   try {
//     const warehouse = await prisma.warehouse.update({ 
//       where: { id }, 
//       data: result.data 
//     })
//     return res.json(warehouse)
//   } catch (error) {
//     console.error('Error updating warehouse:', error)
//     return res.status(500).json({ error: 'Internal server error' })
//   }
// }
//
// export async function deleteWarehouse(req: Request, res: Response) {
//   const id = Number(req.params.id)
//   if (isNaN(id)) {
//     return res.status(400).json({ error: 'Invalid ID' })
//   }
//
//   try {
//     await prisma.warehouse.delete({ where: { id } })
//     return res.status(204).send()
//   } catch (error) {
//     console.error('Error deleting warehouse:', error)
//     return res.status(500).json({ error: 'Internal server error' })
//   }
// }