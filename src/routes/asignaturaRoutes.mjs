import { Router } from 'express';
import asignaturaController from '../controllers/asignaturaController.mjs';
import { verificarRol } from '../middleware/rolMiddleware.mjs';


const router = Router()
router
.post('/obtenerAsignaturasMiEstudioUsuario', verificarRol('estudiante'), asignaturaController.obtenerAsignaturasMiEstudioUsuario)

export default router;