import { Router } from 'express';
import usuarioAsignaturaController from '../controllers/usuarioAsignaturaController.mjs';
import { verificarRol } from '../middleware/rolMiddleware.mjs';
const router = Router()
router
    .post('/actualizarAsignaturasUsuario', verificarRol('estudiante'), usuarioAsignaturaController.actualizarAsignaturasUsuario)
    .post('/obtenerAsignaturasUsuario', verificarRol('estudiante'), usuarioAsignaturaController.obtenerAsignaturasUsuario)
    .post('/superarAsignaturasUsuario', verificarRol('estudiante'), usuarioAsignaturaController.superarAsignaturasUsuario)
    .post('/asignaturasSinGrupoUsuario', verificarRol('estudiante'), usuarioAsignaturaController.asignaturasSinGrupoUsuario)


export default router;