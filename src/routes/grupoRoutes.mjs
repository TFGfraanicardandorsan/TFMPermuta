import { Router } from 'express';
import grupoController from '../controllers/grupoController.mjs';
import { verificarRol } from '../middleware/rolMiddleware.mjs';

const router = Router()
router
.post('/obtenerGruposPorAsignatura',verificarRol('estudiante'), grupoController.obtenerGruposPorAsignatura)
.post('/añadirMisGrupos',verificarRol('estudiante'), grupoController.añadirMisGrupos)
.post('/obtenerMiGrupoAsignatura',verificarRol('estudiante'), grupoController.obtenerMiGrupoAsignatura)

export default router;