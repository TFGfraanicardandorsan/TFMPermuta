import { handleIncomingMessage } from '../services/telegramService.mjs';

export const telegramWebhookHandler = async (req, res) => {
  try {
    const message = req.body.message;
    if (message) {
      await handleIncomingMessage(message);
    }
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error en el controller:', error);
    res.status(500).send('Internal Server Error');
  }
};