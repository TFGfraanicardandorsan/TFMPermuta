import { handleIncomingMessage, handleCallbackQuery } from '../services/telegramService.mjs';

export const telegramWebhookHandler = async (req, res) => {
  try {
    const message = req.body.message;
    if (message) {
      await handleIncomingMessage(message);
    }

    const callbackQuery = req.body.callback_query;
    if (callbackQuery) {
      await handleCallbackQuery(callbackQuery);
    }

    res.status(200).send('OK'); 
  } catch (error) {
    console.error('Error en el controller:', error);
    res.status(500).send('Internal Server Error');
  }
};
