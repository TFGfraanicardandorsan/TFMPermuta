import { Router } from 'express';
import usuarioController from '../controllers/usuarioController.mjs';
import { verificarRol } from '../middleware/rolMiddleware.mjs';
const router = Router()
router
.post('/obtenerDatosUsuario',verificarRol('estudiante'), usuarioController.obtenerDatosUsuario)
.post('/actualizarEstudiosUsuario',verificarRol('estudiante'),usuarioController.actualizarEstudiosUsuario)
.post('/actualizarCorreoUsuario', verificarRol('estudiante'), usuarioController.actualizarCorreoUsuario)
.post('/obtenerDatosUsuarioAdmin',verificarRol('administrador'), usuarioController.obtenerDatosUsuarioAdmin)

export default router;