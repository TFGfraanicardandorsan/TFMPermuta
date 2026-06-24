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
.post('/obtenerGruposAsignaturasSinAsignaturaConGrupoUsuario',verificarRol('estudiante'),grupoController.obtenerGruposAsignaturasSinAsignaturaConGrupoUsuario)
.post('/actualizarProyectoDocente', verificarRol('administrador'), grupoController.actualizarProyectoDocente)
.post('/crearGrupoAsignatura', verificarRol('administrador'), grupoController.crearGrupoAsignatura)
.post('/crearGruposCursoGrado', verificarRol('administrador'), grupoController.crearGruposCursoGrado)
.post('/eliminarUltimoGrupoAsignatura', verificarRol('administrador'), grupoController.eliminarUltimoGrupoAsignatura)
.post('/eliminarUltimosGruposAsignaturas', verificarRol('administrador'), grupoController.eliminarUltimosGruposAsignaturas)
.post('/eliminarUltimosGruposCursoGrado', verificarRol('administrador'), grupoController.eliminarUltimosGruposCursoGrado)
export default router;
