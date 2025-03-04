import { Router } from 'express';
import usuarioController from '../controllers/usuarioController.mjs';
import { verificarRol } from '../middleware/rolMiddleware.mjs';
const router = Router()
router
// .post('/obtenerDatosUsuario', usuarioController.obtenerDatosUsuario)
.post('/obtenerDatosUsuario',verificarRol('administrador'), usuarioController.obtenerDatosUsuario)
.post('/actualizarEstudiosUsuario',usuarioController.actualizarEstudiosUsuario)

export default router;