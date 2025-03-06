import { Router } from 'express';
import grupoController from '../controllers/grupoController.mjs';

const router = Router()
router
.post('/miGrupoAsignatura', grupoController.getMiGrupoAsignatura)

export default router;