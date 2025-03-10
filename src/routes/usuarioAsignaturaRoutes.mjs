import { Router } from 'express';
import usuarioAsignaturaController from '../controllers/usuarioAsignaturaController.mjs';
import { verificarRol } from '../middleware/rolMiddleware.mjs';
const router = Router()
router
.post('/registrarAsignatura',verificarRol('estudiante'), usuarioAsignaturaController.actualizarAsignaturasUsuario)

export default router;