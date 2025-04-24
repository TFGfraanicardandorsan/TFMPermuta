import { Router } from 'express';
import solicitudPermutaController from '../controllers/solicitudPermutaController.mjs';
import { verificarRol } from '../middleware/rolMiddleware.mjs';
const router = Router()
router
.post('/solicitarPermuta',verificarRol('estudiante'), solicitudPermutaController.solicitarPermuta)
.post('/getSolicitudesPermutaInteresantes',verificarRol('estudiante'), solicitudPermutaController.getSolicitudesPermutaInteresantes)
.post('/getMisSolicitudesPermuta',verificarRol('estudiante'), solicitudPermutaController.getMisSolicitudesPermuta)
.post('aceptarSolicitudPermuta',verificarRol('estudiante'), solicitudPermutaController.aceptarSolicitudPermuta)
.post('/rechazarSolicitudPermuta',verificarRol('estudiante'), solicitudPermutaController.rechazarSolicitudPermuta)
.post('/verListaPermutas',verificarRol('estudiante'), solicitudPermutaController.verListaPermutas)
.post('/validarSolicitudPermuta',verificarRol('estudiante'), solicitudPermutaController.validarSolicitudPermuta)
export default router;