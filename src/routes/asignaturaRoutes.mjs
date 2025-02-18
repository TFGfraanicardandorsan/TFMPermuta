import { Router } from 'express';
import asignaturaController from '../controllers/asignaturaController.mjs';

const router = Router()
router
.get('/misAsignaturas', asignaturaController.obtenerAsignaturasMiEstudioUsuario)

export default router;