import fetch from "node-fetch";

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
    const bienvenida = `Hola ${nombre}, soy el bot de Permutas. Estoy aquí para ayudarte con tus incidencias y dudas. Usa el menú para navegar por las opciones 👇`;
    await sendMessage(chatId, bienvenida);
  } else if(text === '/misincidencias'){
    await sendMessage(chatId, 'Aquí tienes un resumen de tus incidencias: \n\n- Incidencia 1: Pendiente\n- Incidencia 2: Resuelta\n- Incidencia 3: En progreso');
  } else {
    await sendMessage(chatId, 'No entiendo ese mensaje. Usa el menú 👇');
  }
};

const sendMessage = async (chatId, text) => {
  try {
    const response = await fetch(`${getTelegramApiUrl()}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Telegram API error:', error);
    }
  } catch (err) {
    console.error('Error enviando mensaje:', err);
  }
};
