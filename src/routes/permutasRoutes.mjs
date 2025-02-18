import { Router } from 'express';
import permutasController from '../controllers/premutasController.mjs';

const router = Router()
router
.get('/permutas', permutasController.obtenerPermutas)

export default router;