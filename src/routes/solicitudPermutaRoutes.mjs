import { Router } from 'express';
import solicitudPermutaController from '../controllers/solicitudPermutaController.mjs';
import { verificarRol } from '../middleware/rolMiddleware.mjs';
const router = Router()
router
.post('/solicitarPermuta',verificarRol('estudiante'), solicitudPermutaController.solicitarPermuta)
.post('/getSolicitudesPermutaInteresantes',verificarRol('estudiante'), solicitudPermutaController.getSolicitudesPermutaInteresantes)
export default router;