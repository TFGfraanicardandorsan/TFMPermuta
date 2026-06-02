import { Router } from 'express';
import gestionUsuariosController from '../controllers/gestionUsuariosController.mjs';
import { verificarRol } from '../middleware/rolMiddleware.mjs';
const router = Router()

router.post('/actualizarRolUsuario', verificarRol('administrador'), gestionUsuariosController.actualizarRolUsuario);
router.get('/obtenerTodosUsuarios', verificarRol('administrador'), gestionUsuariosController.obtenerTodosUsuarios);
router.post('/desactivarUsuario', verificarRol('administrador'), gestionUsuariosController.desactivarUsuario);
router.get('/obtenerDatosUsuario', verificarRol('administrador'), gestionUsuariosController.obtenerDatosUsuario);