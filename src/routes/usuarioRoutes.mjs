import { Router } from 'express';
import usuarioController from '../controllers/usuarioController.mjs';

const router = Router()
router
.get('/obtenerDatosUsuario', usuarioController.obtenerDatosUsuario)
.post('/actualizarEstudiosUsuario',usuarioController.actualizarEstudiosUsuario)

export default router;