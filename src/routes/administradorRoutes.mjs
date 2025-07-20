import administradorController from '../controllers/administradorController.mjs';
import { Router } from 'express';
import { verificarRol } from '../middleware/rolMiddleware.mjs';
import importDatosController from '../controllers/importDatosController.mjs';
const router = Router();
router
.post('/permutas', verificarRol('administrador'), administradorController.obtenerEstadisticasPermutas)
.post('/solicitudes', verificarRol('administrador'), administradorController.obtenerEstadisticasSolicitudes)
.post('/obtenerEstadisticasIncidencias',verificarRol('administrador'),administradorController.obtenerEstadisticasIncidencias)
.post('/estadisticasUsuarios', verificarRol('administrador'), administradorController.obtenerEstadisticasUsuarios)
.post('/importar-asignaturas', verificarRol('administrador'), importDatosController.importarAsignaturasDesdeCSVHandler)
export default router;