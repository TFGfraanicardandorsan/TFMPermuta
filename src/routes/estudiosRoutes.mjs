import { Router } from 'express';
import estudiosController from '../controllers/estudiosController.mjs';

const router = Router()
router
.get('/misEstudios', estudiosController.obtenerMiEstudioUsuario)

export default router;