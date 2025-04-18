import { Router } from "express";
import passport from '../middleware/passport.mjs';
import { verificarSesionUsuario, logout } from '../controllers/autorizacionController.mjs';

const router = Router();

router.get('/saml/login', (req, res, next) => {
    passport.authenticate('saml')(req, res, next);
});
router.get('/saml/session', verificarSesionUsuario)
// router.get('/saml/logout', logout);
router.get('/saml/logout', (req, res) => {
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      // Se envía una página HTML intermedia que redirige inmediatamente
      res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <title>Cerrando sesión...</title>
          <!-- Redirección automática inmediata con meta refresh -->
          <meta http-equiv="refresh" content="0;url=https://permutas.eii.us.es/simplesaml/module.php/core/authenticate.php?as=default-sp&logout&ReturnTo=https://permutas.eii.us.es">
        </head>
        <body>
          <p>Cerrando sesión, por favor espere...</p>
          <script>
            // Redirección de respaldo con JavaScript
            window.location.href = "https://permutas.eii.us.es/simplesaml/module.php/core/authenticate.php?as=default-sp&logout&ReturnTo=https://permutas.eii.us.es";
          </script>
        </body>
        </html>
      `);
    });
  });
export default router;


