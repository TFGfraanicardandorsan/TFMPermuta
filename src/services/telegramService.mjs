import fetch from "node-fetch";

const getTelegramApiUrl = () => `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

export const handleIncomingMessage = async (message) => {
  const chatId = message.chat.id;
  const text = message.text;

  console.log('Mensaje recibido:', text);

  if (text === '/start') {
    await sendMessage(chatId, 'Estoy aquí para ayudarte. ¿En qué puedo asistirte? ☝️');
  } else {
    await sendMessage(chatId, `Has dicho: ${text}`);
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
