import { Router } from 'express';
import funcionalidadController from '../controllers/funcionalidadController.mjs';
import { verificarRol } from '../middleware/rolMiddleware.mjs';

const router = Router()
router
.post('/insertarFuncionalidad',verificarRol('administrador'), funcionalidadController.insertarFuncionalidad)

export default router;