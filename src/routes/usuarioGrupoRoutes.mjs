import { Router } from 'express';
import usuarioGrupoController from '../controllers/usuarioGrupoController.mjs';
import { verificarRol } from '../middleware/rolMiddleware.mjs';
const router = Router()
router
.post('/registrarGrupoAsignatura',verificarRol('estudiante'), usuarioGrupoController.añadirGrupoAsignatura)

export default router;