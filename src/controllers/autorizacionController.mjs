import autorizacionService from "../services/autorizacionService.mjs";
import { extractAttributes } from "../utils/extraerAtributos.mjs";

export const verificarSesionUsuario = async (req, res) => {
  try {
    // Hacer la petición a SimpleSAMLphp para obtener los datos del usuario autenticado
    const response = await fetch(
      "https://permutas.eii.us.es/simplesaml/module.php/core/authenticate.php?as=default-sp",
      {
        headers: { Cookie: req.headers.cookie },
      }
    );

    const html = await response.text();
    const userAttributes = extractAttributes(html); // Extraer atributos del usuario

    if (Object.keys(userAttributes).length === 0) {
      return res
        .status(401)
        .json({ message: "No se encontraron atributos en la sesión" });
    }

    // Obtener el identificador único del usuario
    const uvus = userAttributes.uvus;
    if (!uvus) {
      return res
        .status(400)
        .json({
          message: "No se encontró el uvus en los atributos del usuario",
        });
    }

    // Verificar si el usuario está en la base de datos
    const user = await autorizacionService.verificarSiExisteUsuario(uvus);

    if (!user) {
      return res.redirect(`https://permutas.eii.us.es/noRegistrado`);
    }
    // Guardar la información del usuario en la sesión (para la sesion en Express)
    req.session.user = user;
    // Redirigir al frontend con éxito
    return res.redirect(`https://permutas.eii.us.es/`);
  } catch (error) {
    console.error("Error al obtener la sesión del usuario:", error);
    return res
      .status(500)
      .json({ message: "Error al obtener la sesión", error: error.message });
  }
};

export const logout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.error("Error al destruir la sesión:", err);
        return res.status(500).json({ message: "Error al cerrar sesión" });
      }
      res.clearCookie("connect.sid");
      res.redirect(
        "https://permutas.eii.us.es/simplesaml/module.php/core/authenticate.php?as=default-sp&logout"
      );
    });
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
    return res
      .status(500)
      .json({ message: "Error al cerrar sesión", error: error.message });
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
    return res.status(500).json({ message: "Error al obtener la sesión", error: error.message });
  }
};
