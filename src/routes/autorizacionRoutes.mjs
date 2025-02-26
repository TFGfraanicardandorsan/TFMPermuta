import { Router } from "express";
import passport from '../middleware/passport.mjs';

const router = Router();

router.get('/saml/login', (req, res, next) => {
    passport.authenticate('saml')(req, res, next);
});

// Callback predeterminado del IdP
router.get('/saml/session', (req, res) => {    
    if (!req.user) {
        return res.status(401).json({ message: 'No hay sesión activa en SimpleSAMLphp' });
    }
    res.json({
        message: 'Sesión obtenida correctamente',
        user: req.user,
    });
});

export default router;