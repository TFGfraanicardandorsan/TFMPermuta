import { Router } from 'express';
import permutasController from '../controllers/permutasController.mjs';
import { verificarRol } from '../middleware/rolMiddleware.mjs';

const router = Router()
router
.post('/crearListaPermutas', verificarRol('estudiante'), permutasController.crearListaPermutas)

export default router;