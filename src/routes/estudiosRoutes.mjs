import { Router } from 'express';
import estudiosController from '../controllers/estudiosController.mjs';
import { verificarRol } from '../middleware/rolMiddleware.mjs';
const router = Router()
router
.post('/obtenerMiEstudioUsuario', verificarRol('estudiante'), estudiosController.obtenerMiEstudioUsuario)
.post('/obtenerEstudios', verificarRol('estudiante'), estudiosController.obtenerEstudios)

export default router;