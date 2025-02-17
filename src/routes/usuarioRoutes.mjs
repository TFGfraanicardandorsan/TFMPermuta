import { Router } from 'express';
import usuarioController from '../controllers/usuarioController.mjs';

const router = Router()
router
.get('/obtenerDatosUsuario', usuarioController.obtenerDatosUsuario)

export default router;