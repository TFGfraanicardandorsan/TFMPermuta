import { Router } from 'express';
import { telegramWebhookHandler } from '../controllers/telegramController.mjs';
import { verifyTelegramWebhook } from '../middleware/security.mjs';

const router = Router();

router.post('/webhook', verifyTelegramWebhook, telegramWebhookHandler);

export default router;
