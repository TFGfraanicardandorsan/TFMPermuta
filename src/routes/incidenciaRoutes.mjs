import { Router } from 'express';
import incidenciaController from '../controllers/incidenciaController.mjs';

const router = Router()
router
.get('/incidencias', incidenciaController.obtenerIncidencias)

export default router;