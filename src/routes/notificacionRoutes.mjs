import { Router } from 'express';
import notificacionController from '../controllers/notificacionController.mjs';
import { verificarRol } from '../middleware/rolMiddleware.mjs';
const router = Router()
router
.post('/notificaciones', notificacionController.getNotificacionesUsuario)
.post('/insertarNotificacion',verificarRol('administrador'), notificacionController.insertarNotificacion)

export default router;