import { Router } from 'express';
import usuarioAsignaturaController from '../controllers/usuarioAsignaturaController.mjs';
import { verificarRol } from '../middleware/rolMiddleware.mjs';
const router = Router()
router
    .post('/actualizarAsignaturasUsuario', verificarRol('estudiante'), usuarioAsignaturaController.actualizarAsignaturasUsuario)
    .post('/obtenerAsignaturasUsuario', verificarRol('estudiante'), usuarioAsignaturaController.obtenerAsignaturasUsuario)
    .post('/superarAsignaturasUsuario', verificarRol('estudiante'), usuarioAsignaturaController.superarAsignaturasUsuario)
    .post('/obtenerPreguntasValoracionAsignatura', verificarRol('estudiante'), usuarioAsignaturaController.obtenerPreguntasValoracionAsignatura)
    .post('/guardarValoracionAsignatura', verificarRol('estudiante'), usuarioAsignaturaController.guardarValoracionAsignatura)
    .post('/asignaturasSinGrupoUsuario', verificarRol('estudiante'), usuarioAsignaturaController.asignaturasSinGrupoUsuario)


export default router;
