import { sendMessage } from '../services/telegramService.mjs';

export const handleWebhook = async (req, res) => {
  try {
    const message = req.body.message;
    if (message?.text) {
      const chatId = message.chat.id;
      const text = message.text;
      console.log('Mensaje recibido:', text);
      await sendMessage(chatId, `Hola! Me escribiste: "${text}"`);
    }
    res.sendStatus(200);
  } catch (error) {
    console.error('Error en webhook de Telegram:', error);
    res.sendStatus(500);
  }
};
