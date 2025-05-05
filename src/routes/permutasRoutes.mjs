import { Router } from 'express';
import permutasController from '../controllers/permutasController.mjs';
import { verificarRol } from '../middleware/rolMiddleware.mjs';

const router = Router()
router
.post('/crearListaPermutas', verificarRol('estudiante'), permutasController.crearListaPermutas)
.post('/listarPermutas', verificarRol('estudiante'), permutasController.listarPermutas)
.post('/aceptarPermuta', verificarRol('estudiante'), permutasController.aceptarPermuta)
.post('/rechazarSolicitudPermuta',verificarRol('estudiante'), permutasController.rechazarSolicitudPermuta)

export default router;