import { Router } from 'express';
import solicitudesPermutaController from '../controllers/solicitudesPermutaController.mjs';

const router = Router()
router
.get('/solicitudesPermutas', solicitudesPermutaController.obtenerSolicitudesPermutas)

export default router;