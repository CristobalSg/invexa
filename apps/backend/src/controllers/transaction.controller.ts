import { Request, Response } from 'express'
import prisma from '../prisma/client'
import { createTransactionSchema, updateTransactionSchema } from '../schemas/transaction.schema'

export async function createTransaction(req: Request, res: Response) {
  const result = createTransactionSchema.safeParse(req.body)
  if (!result.success) return res.status(400).json({ error: result.error.format() })
  try {
    const transaction = await prisma.transaction.create({ data: result.data })
    return res.status(201).json(transaction)
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export async function getTransactions(req: Request, res: Response) {
  try {
    const { from, to } = req.query
    let where = {}
    if (from || to) {
      where = {
        date: {
          ...(from ? { gte: new Date(from as string) } : {}),
          ...(to ? { lte: new Date(to as string) } : {})
        }
      }
    }
    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        product: {
          include: {
            presentations: true, // para obtener el precio
          },
        },
      },
    });
    return res.json(transactions)
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export async function getTransaction(req: Request, res: Response) {
  const id = Number(req.params.id)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' })
  try {
    const transaction = await prisma.transaction.findUnique({ where: { id } })
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' })
    return res.json(transaction)
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export async function updateTransaction(req: Request, res: Response) {
  const id = Number(req.params.id)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' })
  const result = updateTransactionSchema.safeParse(req.body)
  if (!result.success) return res.status(400).json({ error: result.error.format() })
  try {
    const transaction = await prisma.transaction.update({ where: { id }, data: result.data })
    return res.json(transaction)
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export async function deleteTransaction(req: Request, res: Response) {
  const id = Number(req.params.id)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' })
  try {
    await prisma.transaction.delete({ where: { id } })
    return res.status(204).send()
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
}
