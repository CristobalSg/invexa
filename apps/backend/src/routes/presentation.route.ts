import { Router } from 'express'
import {
  getPresentations,
  getPresentation,
  createPresentation,
  updatePresentation,
  deletePresentation,
} from '../controllers/presentation.controller'

const router = Router()

router.get('/', getPresentations)
router.get('/:id', getPresentation)
router.post('/', createPresentation)
router.put('/:id', updatePresentation)
router.delete('/:id', deletePresentation)

export default router
