import { Router } from 'express';
import estudiosController from '../controllers/estudiosController.mjs';
import { verificarRol } from '../middleware/rolMiddleware.mjs';
const router = Router()
router
.post('/obtenerMiEstudioUsuario', verificarRol('estudiante'), estudiosController.obtenerMiEstudioUsuario)
.post('/obtenerEstudios', estudiosController.obtenerEstudios)
.post('/crearEstudio', verificarRol('administrador'), estudiosController.insertarEstudio)

export default router;