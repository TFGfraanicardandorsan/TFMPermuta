import { Router } from 'express';
import grupoController from '../controllers/grupoController.mjs';
import { verificarRol } from '../middleware/rolMiddleware.mjs';

const router = Router()
router
.post('/obtenerGruposPorAsignatura',verificarRol('estudiante'), grupoController.obtenerGruposPorAsignatura)
.post('/insertarMisGrupos',verificarRol('estudiante'), grupoController.insertarMisGrupos)
.post('/obtenerMiGrupoAsignatura',verificarRol('estudiante'), grupoController.obtenerMiGrupoAsignatura)
.post('/obtenerTodosGruposMisAsignaturasUsuario',verificarRol('estudiante'), grupoController.obtenerTodosGruposMisAsignaturasUsuario)
.post('/obtenerTodosGruposMisAsignaturasSinGrupoUsuario',verificarRol('estudiante'), grupoController.obtenerTodosGruposMisAsignaturasSinGrupoUsuario)
.post('/obtenerGruposAsignaturasSinAsignaturaConGrupoUsuario',verificarRol('estudiante'),grupoController.obtenerGruposAsignaturasSinAsignaturaConGrupoUsuario);

export default router;