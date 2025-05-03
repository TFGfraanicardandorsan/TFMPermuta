import administradorController from '../controllers/administradorController.mjs';
import { Router } from 'express';
import { verificarRol } from '../middleware/rolMiddleware.mjs';

const router = Router();

// Ruta para obtener estadísticas de permutas
router.post('/estadisticas/permutas', verificarRol('admin'), administradorController.obtenerEstadisticasPermutas);

// Ruta para obtener estadísticas de solicitudes
router.post('/estadisticas/solicitudes', verificarRol('admin'), administradorController.obtenerEstadisticasSolicitudes);

export default router;