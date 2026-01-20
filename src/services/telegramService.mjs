import fetch from "node-fetch";
import incidenciaService from "./incidenciaService.mjs";
import { formatearIncidencias, avisoAdmin, formatearNotificaciones, formatearPerfilAdmin, formatearPerfilEstudiante, formatearAyuda } from "../utils/formateadorIncidenciasBot.mjs";
import { markupAceptarRechazarUsuario } from "../utils/markupBot.mjs";
import notificacionService from "./notificacionService.mjs";
import usuarioService from "./usuarioService.mjs";
import { mensajeCorreoActualizado } from "../utils/mensajesTelegram.mjs";
import autorizacionService from "./autorizacionService.mjs";

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
      delete estadosRegistro[userId];
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
        const bienvenida = `¡Hola ${message.from.first_name}! 🤖

Has solicitado acceso a la aplicación de Permutas ETSII.

Para completar tu solicitud, por favor escribe:

*UVUS* seguido de tu *Nombre y Apellidos* en un solo mensaje en el caso de que tu uvus y tu correo coincidan.

Ejemplo 1:
\`juapergar Juan Pérez García\`

En el caso de que no coincidan tu uvus y tu correo, escribe tu *UVUS* (3 letras mayúsculas seguidas de 4 números), tu *Correo* y tu *Nombre y Apellidos*.

Ejemplo 2:
\`ABC1234 juanpergar@alum.us.es Juan Pérez García\`

Es muy importante que las mayúsculas y minúsculas sean las mismas que tu uvus, en caso contrario no podrás iniciar sesión en el sistema aunque te aceptemos.`;
        await sendMessage(chatId, bienvenida, "Markdown");
        estadosRegistro[userId] = "esperando_datos";
      }
    } 
    
    else if (estadosRegistro[userId] === "esperando_datos") {
      const partes = text.trim().split(" ");
      let uvusEnviado = partes.shift();
      let correo = null;
      let nombreCompleto = null;

      // Caso 1: UVUS y Nombre y Apellidos (ejemplo 1)
      if (
        /^[a-z]{9}\d*$/.test(uvusEnviado) && // 9 letras minúsculas (opcionalmente seguido de números)
        partes.length >= 2
      ) {
        nombreCompleto = partes.join(" ");
      }
      // Caso 2: UVUS, correo y Nombre y Apellidos (ejemplo 2)
      else if (
        /^[A-Z]{3}\d{4}$/.test(uvusEnviado) && // 3 mayúsculas y 4 números
        partes.length >= 3 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(partes[0])
      ) {
        correo = partes.shift();
        nombreCompleto = partes.join(" ");
      } else {
        const aviso = `Formato incorrecto. 
Para completar tu solicitud, por favor escribe:

*UVUS* seguido de tu *Nombre y Apellidos* en un solo mensaje en el caso de que tu uvus y tu correo coincidan.

Ejemplo 1:
\`juapergar Juan Pérez García\`

En el caso de que no coincidan tu uvus y tu correo, escribe tu *UVUS* (3 letras mayúsculas seguidas de 4 números), tu *Correo* y tu *Nombre y Apellidos*.

Ejemplo 2:
\`ABC1234 juanpergar@alum.us.es Juan Pérez García\``;
        await sendMessage(chatId, aviso, "Markdown");
        return;
      }

      if (!uvusEnviado || !nombreCompleto) {
        await sendMessage(chatId, "Por favor, revisa el formato e inténtalo de nuevo.", "Markdown");
        return;
      }

      await autorizacionService?.insertarSolicitudAltaUsuario(uvusEnviado, nombreCompleto, chatId, correo);
      await sendMessage(chatId, "✅ ¡Gracias! Tu solicitud ha sido enviada a los administradores. Pronto te darán acceso.");
      await sendMessage(
        process.env.ADMIN_CHAT_ID,
        avisoAdmin(nombreCompleto, uvusEnviado, chatId),
        "Markdown",
        markupAceptarRechazarUsuario(uvusEnviado)
      );
      delete estadosRegistro[userId];
    } 
    // Si el usuario está esperando introducir el nuevo correo
    else if (estadosRegistro[userId] === "esperando_correo") {
      const nuevoCorreo = text && text.trim();
      await handleEmailUpdate(chatId, userId, uvus, usuarioExistente, nuevoCorreo);
      return; // <-- Este return es necesario para evitar el mensaje de menú
    } 
    // Comando para iniciar la actualización del correo
    else if (text.startsWith("/actualizarcorreo")) {
      const partes = text.split(" ");
      const nuevoCorreo = partes[1]?.trim();
      await handleEmailUpdate(chatId, userId, uvus, usuarioExistente, nuevoCorreo);
      return;
    }
    // Solo se procesa el registro si está esperando datos
    else if (text === "/misincidencias") {
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
    } else if (text === "/vernotificaciones") {
      if (!usuarioExistente) {
        await sendMessage(chatId, "Debes estar registrado para ver las notificaciones. Usa /start primero.");
        return;
      }
      const notificaciones = await notificacionService.getNotificacionesUsuarioTelegram(uvus);
      if (notificaciones.length === 0) {
        await sendMessage(chatId, "No tienes notificaciones pendientes 📭");
      } else {
        await sendMessage(chatId, formatearNotificaciones(notificaciones), "HTML");
      }
    } else if (text === "/perfil") {
      if (!usuarioExistente) {
        await sendMessage(chatId, "Debes estar registrado para ver tu perfil. Usa /start primero.");
        return;
      }
      if (usuarioExistente.rol === "administrador") {
        const perfilAdmin = await usuarioService.obtenerDatosUsuarioAdmin(uvus);
        await sendMessage(chatId, formatearPerfilAdmin(perfilAdmin), "HTML");
        }
       else {
        const perfilEstudiante = await usuarioService.obtenerDatosUsuario(uvus);
        await sendMessage(chatId, formatearPerfilEstudiante(perfilEstudiante), "HTML");
        }
      } else if (text === "/ayuda") {
        await sendMessage(chatId, formatearAyuda(), "Markdown");
      } 
    else if (text && text.startsWith("/notificar")) {
      if (!usuarioExistente || usuarioExistente.rol !== "administrador") {
        await sendMessage(chatId, "Solo los administradores pueden enviar notificaciones.");
        return;
      }

      // Sintaxis: /notificar receptor mensaje
      const partes = text.split(" ");
      if (partes.length < 3) {
        await sendMessage(chatId, "Uso: /notificar [estudiante|administrador|all] [mensaje]");
        return;
      }
      const receptor = partes[1].toLowerCase();
      let receptorDb;
      if (receptor === "estudiante") receptorDb = "estudiante";
      else if (receptor === "administrador") receptorDb = "administrador";
      else if (receptor === "all" || receptor === "todos") receptorDb = "all";
      else {
        await sendMessage(chatId, "Receptor no válido. Usa estudiante, administrador o all.");
        return;
      }
      const contenido = text.split(" ").slice(2).join(" ");
      if (!contenido) {
        await sendMessage(chatId, "Debes escribir un mensaje para la notificación.");
        return;
      }
      try {
        await notificacionService.crearNotificacionesUsuario(
          usuarioExistente.uvus,
          contenido,
          receptorDb
        );
        await sendMessage(chatId, `✅ Notificación enviada a ${receptorDb}.`);
      } catch (error) {
        await sendMessage(chatId, "❌ Error al enviar la notificación.");
      }
      return;
    } else {
      await sendMessage(chatId, "No entiendo ese mensaje. Usa el menú 👇");
    }
  } catch (error) {
    console.error("❌ Error procesando el mensaje:", error);
    await sendMessage(chatId, "Ocurrió un error inesperado. Por favor intenta más tarde.");
  }
};

export const sendMessage = async (chatId, text, parseMode = "HTML", markup = null) => {
  try {
    if (!chatId || chatId === null || chatId === undefined || chatId === '') {
      console.error("Error: chatId es requerido para enviar un mensaje");
      return;
    }
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
      // Validar que tenemos todos los datos necesarios
      if (!solicitud.uvus || !solicitud.nombre_completo) {
        await sendMessage(chatId, `❌ Error: La solicitud no tiene datos completos. UVUS: ${solicitud.uvus}, Nombre: ${solicitud.nombre_completo}`);
        return;
      }
      await sendMessage(solicitud.chat_id, `🎉 ¡Felicidades! Has sido aceptado en el sistema de Permutas ETSII. Bienvenido.\n Recuerda que debes completar los datos de tu perfil:\n 1. Marcar qué estudios estás cursando.\n2. Una vez que has puesto el estudio añadir las asignaturas.\n3. Añadir los grupos EN LOS QUE ESTÁS MATRICULADO de las asignaturas marcadas (se te redirigirá después de marcar las asignaturas).\nSi no haces todo esto NO podrás solicitar ni aceptar las permutas.\nRecuerda que el enlace de tu perfil es: https://permutas.eii.us.es/miPerfil`);
      // Eliminar la solicitud de la lista de pendientes
      try {
        await autorizacionService?.insertarUsuario(solicitud.uvus, solicitud.nombre_completo, solicitud.correo || '', solicitud.chat_id);
      } catch (insertError) {
        console.error("Error al insertar usuario en callback aceptar:", insertError);
        await sendMessage(chatId, `❌ Error al insertar usuario: ${insertError.message}`);
        return;
      }
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
    await sendMessage(chatId, `Error procesando tu solicitud: ${error.message}`);
  }
};

async function handleEmailUpdate(chatId, userId, uvus, usuarioExistente, nuevoCorreo) {
  if (!nuevoCorreo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nuevoCorreo)) {
    await sendMessage(chatId, "Por favor, introduce un correo electrónico válido.");
    return false;
  }
  if (!usuarioExistente) {
    await sendMessage(chatId, "Debes estar registrado para actualizar tu correo. Usa /start primero.");
    delete estadosRegistro[userId];
    return false;
  }
  await usuarioService.actualizarCorreoUsuario(uvus, nuevoCorreo);
  await sendMessage(chatId, mensajeCorreoActualizado(nuevoCorreo), "HTML");
  delete estadosRegistro[userId];
  return true;
}
