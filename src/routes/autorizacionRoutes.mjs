import { Router } from "express";
import passport from '../middleware/passport.mjs';
import { verificarSesionUsuario, logout } from '../controllers/autorizacionController.mjs';

const router = Router();

router.get('/saml/login', (req, res, next) => {
    passport.authenticate('saml')(req, res, next);
});
router.get('/saml/session', verificarSesionUsuario)
// router.get('/saml/logout', logout);
router.get('/saml/logout', (req, res, next) => {
    if (!req.user) {
        return res.redirect('/');
    }

    passport.Strategy('saml').logout(req, (err, requestUrl) => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).send('Error al cerrar sesión SAML');
        }

        // Destruye la sesión local
        req.session.destroy(() => {
            res.clearCookie('connect.sid');
            res.redirect(requestUrl); // Redirige al IDP para completar el logout
        });
    });
});

export default router;


