import { Request, Response } from 'express'
import prisma from '../prisma/client'
import { createPresentationSchema, updatePresentationSchema } from '../schemas/presentation.schema'

export async function createPresentation(req: Request, res: Response) {
  const result = createPresentationSchema.safeParse(req.body)
  if (!result.success) return res.status(400).json({ error: result.error.format() })
  try {
    const presentation = await prisma.presentation.create({ data: result.data })
    return res.status(201).json(presentation)
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export async function getPresentations(req: Request, res: Response) {
  try {
    const presentations = await prisma.presentation.findMany()
    return res.json(presentations)
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export async function getPresentation(req: Request, res: Response) {
  const id = Number(req.params.id)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' })
  try {
    const presentation = await prisma.presentation.findUnique({ where: { id } })
    if (!presentation) return res.status(404).json({ error: 'Presentation not found' })
    return res.json(presentation)
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export async function updatePresentation(req: Request, res: Response) {
  const id = Number(req.params.id)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' })
  const result = updatePresentationSchema.safeParse(req.body)
  if (!result.success) return res.status(400).json({ error: result.error.format() })
  try {
    const presentation = await prisma.presentation.update({ where: { id }, data: result.data })
    return res.json(presentation)
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export async function deletePresentation(req: Request, res: Response) {
  const id = Number(req.params.id)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' })
  try {
    await prisma.presentation.delete({ where: { id } })
    return res.status(204).send()
  } catch {
    return res.status(500).json({ error: 'Internal server error' })
  }
}
