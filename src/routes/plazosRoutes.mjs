import { Router } from 'express';
import plazosController from '../controllers/plazosController.mjs';
import { verificarRol } from '../middleware/rolMiddleware.mjs';

const router = Router();

router.post(
  '/insertarPlazoPermuta',
  verificarRol('administrador'),
  plazosController.insertarPlazoPermuta
);

export default router;