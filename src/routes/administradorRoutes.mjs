import administradorController from '../controllers/administradorController.mjs';
import { Router } from 'express';
import { verificarRol } from '../middleware/rolMiddleware.mjs';

const router = Router();

// Ruta para obtener estadísticas de permutas
router.post('/permutas', verificarRol('administrador'), administradorController.obtenerEstadisticasPermutas);
// Ruta para obtener estadísticas de solicitudes
router.post('/solicitudes', verificarRol('administrador'), administradorController.obtenerEstadisticasSolicitudes);

export default router;