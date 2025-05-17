import fetch from "node-fetch";
import incidenciaService from "./incidenciaService.mjs";
import { formatearIncidencias, avisoAdmin } from "../utils/formateadorIncidenciasBot.mjs";
import { markupAceptarRechazarUsuario } from "../utils/markupBot.mjs";
import autorizacionService from "./autorizacionService.mjs";
import notificacionService from "./notificacionService.mjs";
export const getTelegramApiUrl = () => `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

const estadosRegistro = {}; // userId => 'esperando_datos' Variables auxiliares para gestionar "estado" de usuarios en registro
export const handleIncomingMessage = async (message) => {
  const chatId = message.chat.id;
  const userId = message.from.id;
  const text = message.text;
  let usuarioExistente = null;
  let uvus = null;
  try {
    uvus = await autorizacionService?.verificarSiExisteUsuarioEnTelegram(userId, chatId);
    if (uvus) {
      usuarioExistente = await autorizacionService?.verificarSiExisteUsuario(uvus);
    }
  } catch (error) {
    console.error("Error al verificar si existe el usuario en Telegram:", error);
  }
  try {
    if (text === "/start") {
      if (usuarioExistente) {
        if (usuarioExistente.rol === "administrador") {
          const bienvenidaAdmin = `👑 ¡Hola Administrador ${uvus}! Bienvenido de nuevo al bot de Permutas ETSII. ¿Qué deseas gestionar hoy?`;
          await sendMessage(chatId, bienvenidaAdmin);
        } else {
          const bienvenida = `¡Hola de nuevo, ${uvus}! 🤖 Ya estás registrado en la aplicación de Permutas ETSII. ¿En qué puedo ayudarte hoy?`;
          await sendMessage(chatId, bienvenida);
        }
      } else {
        const bienvenida = `¡Hola ${message.from.first_name}! 🤖\n\nHas solicitado acceso a la aplicación de Permutas ETSII.\n\nPara completar tu solicitud, por favor escribe:\n\n*UVUS* seguido de tu *Nombre y Apellidos* en un solo mensaje.\n\nEjemplo:\n\`juapergar Juan Pérez García\``;
        await sendMessage(chatId, bienvenida, "Markdown");
        estadosRegistro[userId] = "esperando_datos";
      }
    } else if (text === "/misincidencias") {
      if (!usuarioExistente) {
        await sendMessage(chatId, "Debes estar registrado para ver tus incidencias. Usa /start primero.");
        return;
      }
      if (usuarioExistente.rol === "administrador") {
        const incidendiasAdmin = await incidenciaService.obtenerIncidenciasAsignadasAdmin(uvus);
        if (incidendiasAdmin.length === 0) {
          await sendMessage(chatId, "No tienes incidencias asignadas como administrador 📭");
        } else {
          await sendMessage(chatId, formatearIncidencias(incidendiasAdmin), "HTML");
        }
      } else {
      const incidenciasData = (await incidenciaService.obtenerIncidenciasAsignadasUsuario(uvus)) ?? [];
        if (incidenciasData.length === 0) {
          await sendMessage(chatId, "No tienes incidencias registradas 📭");
        } else {
        await sendMessage(chatId, formatearIncidencias(incidenciasData), "HTML");
       }
      }
    } else if (estadosRegistro[userId] === "esperando_datos") {
      const partes = text.trim().split(" ");
      const uvusEnviado = partes.shift();
      const nombreCompleto = partes.join(" ");

      if (!uvusEnviado || !nombreCompleto) {
        const aviso = `Formato incorrecto. Por favor envía: UVUS seguido de tu Nombre y Apellidos.\nEjemplo:\n\`juapergar Juan Pérez García\``;
        await sendMessage(chatId, aviso,"Markdown");
        return;
      }
      await autorizacionService?.insertarSolicitudAltaUsuario(uvusEnviado, nombreCompleto, chatId);
      await sendMessage(chatId, "✅ ¡Gracias! Tu solicitud ha sido enviada a los administradores. Pronto te darán acceso.");
      await sendMessage(process.env.ADMIN_CHAT_ID, avisoAdmin(nombreCompleto,uvusEnviado,chatId), "Markdown", markupAceptarRechazarUsuario(uvusEnviado));
      // Eliminar el estado de registro del usuario, ya que la solicitud fue procesada
      delete estadosRegistro[userId];
    } else if (text === "/vernotificaciones") {
     if (!usuarioExistente) {
        await sendMessage(chatId, "Debes estar registrado para ver las notificaciones. Usa /start primero.");
        return;
      }
      const notificaciones = await notificacionService.getNotificacionesUsuario(uvus);
      if (notificaciones.length === 0) {
        await sendMessage(chatId, "No tienes notificaciones pendientes 📭");
      } else {
        await sendMessage(chatId, notificaciones, "HTML");
      }
    }
     else {
      await sendMessage(chatId, "No entiendo ese mensaje. Usa el menú 👇");
    }
  } catch (error) {
    console.error("❌ Error procesando el mensaje:", error);
    await sendMessage(chatId, "Ocurrió un error inesperado. Por favor intenta más tarde.");
  }
};

export const sendMessage = async (chatId, text, parseMode = "HTML", markup = null) => {
  try {
    const body = { chat_id: chatId, text, parse_mode: parseMode };
    if (markup) {
      body.reply_markup = markup;
    }
    const response = await fetch(`${getTelegramApiUrl()}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Telegram API error:", error);
    }
  } catch (err) {
    console.error("Error enviando mensaje:", err);
  }
};


export const handleCallbackQuery = async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const callbackData = callbackQuery.data;
  const [accion, uvus] = callbackData.split('_');
  try {
    if (accion === 'aceptar') {
      const solicitud = await autorizacionService?.consultarSolicitudAltaUsuario(uvus);
      if (!solicitud) {
        await sendMessage(chatId, "No se encontró ninguna solicitud con ese UVUS.");
        return;
      }
      await sendMessage(solicitud.chat_id, `🎉 ¡Felicidades! Has sido aceptado en el sistema de Permutas ETSII. Bienvenido.`);
      // Eliminar la solicitud de la lista de pendientes
      await autorizacionService?.insertarUsuario(solicitud.uvus, solicitud.nombre_completo, solicitud.correo, solicitud.chat_id,);
      // Notificar al administrador que la solicitud fue aceptada
      await sendMessage(chatId, `Usuario ${uvus} aceptado correctamente.`);
      await autorizacionService?.eliminarSolicitudAltaUsuario(uvus);
    } else if (accion === 'rechazar') {
      // Rechazar la solicitud
      const solicitud = await autorizacionService?.consultarSolicitudAltaUsuario(uvus);
      if (!solicitud) {
        await sendMessage(chatId, "No se encontró ninguna solicitud con ese UVUS.");
        return;
      }
      // Notificar al usuario que ha sido rechazado
      await sendMessage(solicitud.chat_id, `❌ Lo sentimos, tu solicitud ha sido rechazada por el administrador.`);
      await autorizacionService?.eliminarSolicitudAltaUsuario(uvus);
      // Notificar al administrador que la solicitud fue rechazada
      await sendMessage(chatId, `Usuario ${uvus} rechazado correctamente.`);
    }
  } catch (error) {
    console.error("Error procesando callback:", error);
  }
};
