import { Router } from 'express';
import solicitudPermutaController from '../controllers/solicitudPermutaController.mjs';
import { verificarRol } from '../middleware/rolMiddleware.mjs';

const router = Router()

router
.post('/solicitarPermuta',verificarRol('estudiante'), solicitudPermutaController.solicitarPermuta)
.post('/getSolicitudesPermutaInteresantes',verificarRol('estudiante'), solicitudPermutaController.getSolicitudesPermutaInteresantes)
.post('/getMisSolicitudesPermuta',verificarRol('estudiante'), solicitudPermutaController.getMisSolicitudesPermuta)
.post('/aceptarSolicitudPermuta',verificarRol('estudiante'), solicitudPermutaController.aceptarSolicitudPermuta)
.post('/verListaPermutas',verificarRol('estudiante'), solicitudPermutaController.verListaPermutas)
.post('/validarSolicitudPermuta',verificarRol('estudiante'), solicitudPermutaController.validarSolicitudPermuta)
.post('/proponerPermutas',verificarRol('estudiante'), solicitudPermutaController.proponerPermutas)
.post('/getTodasSolicitudesPermuta',verificarRol('administrador'), solicitudPermutaController.getTodasSolicitudesPermuta)
.post('/permuta/:id/aceptar', verificarRol('estudiante'), solicitudPermutaController.aceptarPermutaPropuesta)
.post('/permuta/:id/rechazar', verificarRol('estudiante'), solicitudPermutaController.rechazarPermutaPropuesta)
.post('/cancelarSolicitudPermuta', verificarRol('estudiante'), solicitudPermutaController.cancelarSolicitudPermuta)
.post('/adminCancelarSolicitudPermuta', verificarRol('administrador'), solicitudPermutaController.cancelarSolicitudPermuta)

export default router;