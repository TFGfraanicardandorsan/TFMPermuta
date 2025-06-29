import { Router } from "express";
import passport from '../middleware/passport.mjs';
import { verificarSesionUsuario, logout, obtenerSesion } from '../controllers/autorizacionController.mjs';

const router = Router();

router.get('/saml/login', (req, res, next) => {
    passport.authenticate('saml')(req, res, next);
});
router.get('/saml/session', verificarSesionUsuario)
router.get('/saml/logout', logout);
router.get('/obtenerSesion', obtenerSesion);
export default router;


