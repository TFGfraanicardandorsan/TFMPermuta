import { Router } from "express";
import { iniciarSesion } from '../controllers/autorizacionController.mjs';
import { verificarSesionUsuario, logout, obtenerSesion } from '../controllers/autorizacionController.mjs';

const router = Router();

router.get('/saml/login', iniciarSesion);
router.get('/saml/session', verificarSesionUsuario)
router.post('/saml/logout', logout);
router.get('/obtenerSesion', obtenerSesion);
export default router;

