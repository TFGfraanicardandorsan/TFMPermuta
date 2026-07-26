import usuarioService from "../services/usuarioService.mjs";
import GenericValidators from "../utils/genericValidators.mjs";
import { mensajeCorreoActualizado } from "../utils/mensajesTelegram.mjs";
import { sendMessage } from "../services/telegramService.mjs";
import { isSupportedRole, toCanonicalRole } from "../utils/roles.mjs";


const obtenerDatosUsuario = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        res.json({ err: false, result: await usuarioService.obtenerDatosUsuario(uvus) });
    } catch (err) {
        console.error("API obtenerDatosUsuario ha tenido una excepción", err);
        res.sendStatus(500);
    }
};


const actualizarEstudiosUsuario = async (req,res) => {
    try{
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        const { estudio } = req.body;
        const validEstudio = GenericValidators.isString(estudio, "Estudio", 100);
        if (!validEstudio.valido) {
            return res.status(400).json({ err: true, message: validEstudio.mensaje });
        }
        res.send({err:false, result:await usuarioService.actualizarEstudiosUsuario(uvus, estudio)})
        } catch (err){
            console.log('api actualizarEstudiosUsuario ha tenido una excepción')
            res.sendStatus(500)
        }
    }

    const obtenerDatosUsuarioAdmin = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        res.json({ err: false, result: await usuarioService.obtenerDatosUsuarioAdmin(uvus) });
    } catch (err) {
        console.error("API obtenerDatosUsuario ha tenido una excepción", err);
        res.sendStatus(500);
    }
};

const actualizarCorreoUsuario = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
    }
    const uvus = req.session.user.nombre_usuario;
    const { correo } = req.body;
    const validCorreo = GenericValidators.isString(correo, "Correo", 100);
    if (!validCorreo.valido) {
      return res.status(400).json({ err: true, message: validCorreo.mensaje });
    }
    await usuarioService.actualizarCorreoUsuario(uvus, correo);

    // Obtener chatId y enviar mensaje por Telegram
    try {
      const chatId = await autorizacionService.obtenerChatIdUsuario(uvus);
      await sendMessage(chatId, mensajeCorreoActualizado(correo), "HTML");
    } catch (error) {
      console.error("Error enviando mensaje de correo actualizado por Telegram:", error);
    }

    res.send({ err: false, result: "Correo actualizado correctamente" });
  } catch (err) {
    console.log('api actualizarCorreoUsuario ha tenido una excepción');
    res.sendStatus(500);
  }
};

const obtenerTodosUsuarios = async (req, res) => {
  try {
    // Solo admin
    if (!req.session.user) {
      return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
    }
    res.json({ err: false, result: await usuarioService.obtenerTodosUsuarios() });
  } catch (err) {
    console.error("API obtenerTodosUsuarios ha tenido una excepción", err);
    res.sendStatus(500);
  }
};

const actualizarUsuario = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
    }
    const { uvus, nombre_completo, correo, rol } = req.body;
    if (!uvus) {
      return res.status(400).json({ err: true, message: "Falta el uvus del usuario" });
    }
    const campos = [
      GenericValidators.isString(uvus, "UVUS", 64),
      GenericValidators.isString(nombre_completo, "Nombre completo", 255),
      GenericValidators.isString(correo, "Correo", 255),
    ];
    const campoInvalido = campos.find((validacion) => !validacion.valido);
    if (campoInvalido) {
      return res.status(400).json({ err: true, message: campoInvalido.mensaje });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      return res.status(400).json({ err: true, message: "El correo no tiene un formato válido" });
    }
    if (!isSupportedRole(rol)) {
      return res.status(400).json({ err: true, message: "El rol debe ser estudiante, administrador o delegacion" });
    }
    const result = await usuarioService.actualizarUsuario(uvus, {
      nombre_completo,
      correo,
      rol: toCanonicalRole(rol),
    });
    res.json({ err: false, result });
  } catch (err) {
    console.error("API actualizarUsuario ha tenido una excepción", err);
    if (err.code === "USUARIO_NO_ENCONTRADO") {
      return res.status(404).json({ err: true, message: err.message });
    }
    if (err.code === "23505") {
      return res.status(409).json({ err: true, message: "El correo ya está asociado a otro usuario" });
    }
    if (err.code === "22001") {
      return res.status(400).json({ err: true, message: "Alguno de los campos supera la longitud permitida" });
    }
    res.status(500).json({ err: true, message: "No se pudo actualizar el usuario" });
  }
};

export default {
    obtenerDatosUsuario,
    actualizarEstudiosUsuario,
    obtenerDatosUsuarioAdmin,
    actualizarCorreoUsuario,
    obtenerTodosUsuarios,
    actualizarUsuario
}
