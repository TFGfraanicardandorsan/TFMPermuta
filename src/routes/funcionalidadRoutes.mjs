import { Router } from 'express';
import funcionalidadController from '../controllers/funcionalidadController.mjs';

const router = Router()
router
.post('/insertarFuncionalidad', funcionalidadController.insertarFuncionalidad)

export default router;