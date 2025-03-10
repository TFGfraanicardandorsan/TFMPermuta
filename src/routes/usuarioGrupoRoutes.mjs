import { Router } from 'express';
import usuarioGrupoController from '../controllers/usuarioGrupoController.mjs';
import { verificarRol } from '../middleware/rolMiddleware.mjs';
const router = Router()
router
.post('/insertarGrupoAsignatura',verificarRol('estudiante'), usuarioGrupoController.insertarGrupoAsignatura)

export default router;