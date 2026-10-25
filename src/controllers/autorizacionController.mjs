import autorizacionService from "../services/autorizacionService.mjs";
import { extractAttributes } from "../utils/extraerAtributos.mjs";
import { ssoConfig, ssoCookies } from '../config/sso.mjs';
import { isSupportedRole } from '../utils/roles.mjs';

export const iniciarSesion = async (req, res, next) => {
  try {
    const { endpoint, base } = ssoConfig();
    endpoint.searchParams.set('ReturnTo', new URL('/api/v1/autorizacion/saml/session', base).href);
    return res.redirect(303, endpoint.href);
  } catch (error) { return next(error); }
};

export const verificarSesionUsuario = async (req, res) => {
  try {
    const { endpoint, base } = ssoConfig();
    const cookies = ssoCookies(req.headers.cookie);
    if (!cookies) return res.status(401).json({ message: 'No hay sesión SSO.' });
    // Solo consultar el SP conocido; nunca reenviar cookies a redirecciones del IdP.
    const response = await fetch(
      endpoint,
      {
        headers: { Cookie: cookies },
        redirect: 'manual',
        signal: AbortSignal.timeout(10_000),
      }
    );
    if (response.status !== 200 || !response.headers.get('content-type')?.includes('text/html')) {
      await response.body?.cancel();
      return res.status(401).json({ message: 'La sesión SSO no está autenticada.' });
    }
    let html = '';
    let bytes = 0;
    for await (const chunk of response.body) {
      bytes += chunk.length;
      if (bytes > 256 * 1024) throw new Error('Respuesta SSO demasiado grande.');
      html += Buffer.from(chunk).toString('utf8');
    }
    const userAttributes = extractAttributes(html); // Extraer atributos del usuario

    if (Object.keys(userAttributes).length === 0) {
      return res
        .status(401)
        .json({ message: "No se encontraron atributos en la sesión" });
    }

    // Obtener el identificador único del usuario
    const uvus = userAttributes.uvus;
    if (!uvus || !/^[A-Za-z0-9._-]{1,64}$/.test(uvus)) {
      return res
        .status(400)
        .json({
          message: "No se encontró el uvus en los atributos del usuario",
        });
    }

    // Verificar si el usuario está en la base de datos
    const user = await autorizacionService.verificarSiExisteUsuario(uvus);

    if (!user || !isSupportedRole(user.rol)) {
      return res.redirect(new URL('/noRegistrado', base).href);
    }

    await regenerateSession(req);
    req.session.user = user;
    await saveSession(req);

    return res.redirect(new URL('/', base).href);
  } catch (error) {
    console.error("Error al obtener la sesión del usuario:", error);
    return res
      .status(500)
      .json({ message: "Error al obtener la sesión" });
  }
};

const regenerateSession = (req) => new Promise((resolve, reject) => {
  req.session.regenerate((error) => {
    if (error) reject(error);
    else resolve();
  });
});

const saveSession = (req) => new Promise((resolve, reject) => {
  req.session.save((error) => {
    if (error) reject(error);
    else resolve();
  });
});

export const logout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.error("Error al destruir la sesión:", err);
        return res.status(500).json({ message: "Error al cerrar sesión" });
      }
      res.clearCookie("connect.sid", {
        secure: true,
        httpOnly: true,
        sameSite: "none",
        path: "/",
      });
      return res.json({
        err: false,
        redirectUrl: "https://permutas.eii.us.es/simplesaml/module.php/core/authenticate.php?as=default-sp&logout",
      });
    });
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
    return res
      .status(500)
      .json({ message: "Error al cerrar sesión" });
  }
};

export const obtenerSesion = async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ isAuthenticated: false, message: "Sesión expirada o no iniciada." });
      }      
    const { nombre_usuario:uvus, rol } = req.session.user;
    return res.status(200).send({isAuthenticated: true,user: { uvus, rol }});
  } catch (error) {
    console.error("Error al obtener la sesión:", error);
    return res.status(500).json({ message: "Error al obtener la sesión" });
  }
};
