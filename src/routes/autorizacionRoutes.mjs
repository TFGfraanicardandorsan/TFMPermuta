import { Router } from "express";
import passport from '../middleware/passport.mjs';

const router = Router();

// Iniciar la autenticación SAML
router.get('/saml/login', passport.authenticate('saml', { failureRedirect: '/', failureFlash: true }));

// Callback de autenticación SAML
router.post('/saml/callback', passport.authenticate('saml', { failureRedirect: '/', failureFlash: true }), (req, res) => {
    console.log('Usuario autenticado', req.user);
    res.json({message: 'Autenticación correcta', user: req.user});
});

// Cerrar sesión
router.get('/logout', (req, res) => {
    req.logout((err) => {
        if(err) {
            return next(err);
        }
        req.session.destroy(()=> {
            res.redirect('/');
        })
    })
})

// Ver perfil del usuario
router.get('/profile', (req, res) => {
    if(!req.isAuthenticated()) {
        return res.status(401).json({message: 'No autenticado'});
    }
    res.json(req.user);
})
export default router;