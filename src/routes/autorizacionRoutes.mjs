import { Router } from "express";
import passport from '../middleware/passport.mjs';
import { extractAttributes } from "../utils/extraerAtributos.mjs";

const router = Router();

router.get('/saml/login', (req, res, next) => {
    passport.authenticate('saml')(req, res, next);
});

router.get('/saml/session', async (req, res) => {
    try {
        const response = await fetch('https://permutas.eii.us.es/simplesaml/module.php/core/authenticate.php?as=default-sp',{
        headers: { Cookie: req.headers.cookie }
        });

        const html = await response.text();
        const userAttributes = extractAttributes(html);

        if (Object.keys(userAttributes).length === 0) {
            throw new Error("No se encontraron atributos en la sesión.");
        }

        res.json({ message: 'Sesión activa', user: userAttributes });
    } catch (error) {
        console.error('Error obteniendo sesión:', error);
        res.status(500).json({ message: 'Error al obtener la sesión de SimpleSAMLphp' });
    }
});

export default router;


