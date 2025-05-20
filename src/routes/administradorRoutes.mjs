import administradorController from '../controllers/administradorController.mjs';
import { Router } from 'express';
import { verificarRol } from '../middleware/rolMiddleware.mjs';

const router = Router();
router
.post('/permutas', verificarRol('administrador'), administradorController.obtenerEstadisticasPermutas)
.post('/solicitudes', verificarRol('administrador'), administradorController.obtenerEstadisticasSolicitudes)
.post('/obtenerEstadisticasIncidencias',verificarRol('administrador'),administradorController.obtenerEstadisticasIncidencias)

export default router;