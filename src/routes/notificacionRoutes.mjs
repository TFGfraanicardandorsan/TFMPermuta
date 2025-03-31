import { Router } from 'express';
import notificacionController from '../controllers/notificacionController.mjs';
import { verificarRol } from '../middleware/rolMiddleware.mjs';
const router = Router()
router
.post('/notificaciones', notificacionController.getNotificacionesUsuario)


export default router;