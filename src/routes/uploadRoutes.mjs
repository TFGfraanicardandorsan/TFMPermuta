import { Router } from 'express';
import upload from '../middleware/almacenamiento.mjs';
import uploadController from '../controllers/uploadController.mjs';
import { requireSession } from '../middleware/security.mjs';
import { rateLimit } from 'express-rate-limit';

const uploadLimit = rateLimit({ windowMs: 60_000, limit: 10, keyGenerator: req => req.session.user.nombre_usuario,
  standardHeaders: 'draft-8', legacyHeaders: false });

const router = Router()
router
.post('/upload', requireSession, uploadLimit, upload.single('file'), uploadController.subirArchivo)
.get('/uploads/:tipo/:fileId', requireSession, uploadController.servirArchivo)
.get('/plantillaPermuta', requireSession, uploadController.obtenerPlantillaPermuta)

export default router
