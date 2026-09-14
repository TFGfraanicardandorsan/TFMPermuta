import { Router } from 'express';
import adminPermutasController from '../controllers/adminPermutasController.mjs';
import { verificarRol } from '../middleware/rolMiddleware.mjs';

const router = Router();
router.use(verificarRol('administrador'));
router
  .post('/panel', adminPermutasController.obtenerPanel)
  .post('/buscar-parejas', adminPermutasController.buscarParejasOptimas)
  .post('/generar-propuestas', adminPermutasController.generarPropuestas)
  .post('/solicitudes/:id/cancelar', adminPermutasController.cancelarSolicitud)
  .post('/permutas/:id/cancelar', adminPermutasController.cancelarPermuta)
  .post('/retirar-vigencia', adminPermutasController.retirarVigencia);

export default router;
