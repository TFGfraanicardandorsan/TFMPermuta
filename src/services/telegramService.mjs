import fetch from "node-fetch";
import incidenciaService from "./incidenciaService.mjs";
import { formatearIncidencias } from "../utils/formateadorIncidenciasBot.mjs";
export const getTelegramApiUrl = () => `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

export const handleIncomingMessage = async (message) => {
  const chatId = message.chat.id; 
  const userId = message.from.id;
  const text = message.text;
  const nombre = message.from.first_name || 'Usuario'
  console.log('Mensaje recibido:', text);
  console.log('ID del usuario:', userId);
  console.log('ID del chat:', chatId);

  if (text === '/start') {
    const bienvenida = `¡Hola ${nombre}! 🤖 Soy el bot de Permutas ETSII. Has solicitado acceso a nuestra aplicación de permutas. En breve, los administradores procesarán tu solicitud y te darán de alta. ¡Gracias por tu paciencia!`;
    await sendMessage(chatId, bienvenida);
  } else if (text === '/misincidencias') {
    try {
      const incidenciasData = await incidenciaService.obtenerIncidencias() ?? [];  
  
      if (incidenciasData.length === 0) {
        await sendMessage(chatId, 'No tienes incidencias registradas 📭');
      } else {
        const incidenciasFormateadas = formatearIncidencias(incidenciasData);
        await sendMessage(chatId, incidenciasFormateadas, 'HTML');
      }
    } catch (error) {
      await sendMessage(chatId, 'Hubo un problema al recuperar tus incidencias. Por favor, inténtalo más tarde.');
      console.error('Error al obtener incidencias:', error);
    }  
  } else {
    await sendMessage(chatId, 'No entiendo ese mensaje. Usa el menú 👇');
  }
};

const sendMessage = async (chatId, text, parseMode = 'HTML') => {
  try {
    const body = {
      chat_id: chatId,
      text,
      parse_mode: parseMode,
    };

    const response = await fetch(`${getTelegramApiUrl()}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Telegram API error:', error);
    }
  } catch (err) {
    console.error('Error enviando mensaje:', err);
  }
};
