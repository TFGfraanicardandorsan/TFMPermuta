import { Router } from 'express';
import asignaturaController from '../controllers/asignaturaController.mjs';

const router = Router()
router
.get('/asignaturasMisEstudios', asignaturaController.obtenerAsignaturasMiEstudioUsuario)

export default router;