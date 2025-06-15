import { Router } from 'express';
import asignaturaController from '../controllers/asignaturaController.mjs';
import { verificarRol } from '../middleware/rolMiddleware.mjs';


const router = Router()
router
.post('/obtenerAsignaturasMiEstudioUsuario', verificarRol('estudiante'), asignaturaController.obtenerAsignaturasMiEstudioUsuario)
.post('/asignaturasPermutables', verificarRol('estudiante'), asignaturaController.asignaturaPermutable)
.post('/asigaturasPermutablesUsuario', verificarRol('estudiante'), asignaturaController.asignaturaPermutableUsuario)
.post('/obtenerAsignaturasNoMatriculadas',verificarRol('estudiante'),asignaturaController.obtenerAsignaturasNoMatriculadas)
.post('/crearAsignatura', verificarRol('administrador'), asignaturaController.crearAsignatura)
.post('/verAsignatura', verificarRol('delegacion'), asignaturaController.verAsignatura);
export default router;