import { Router } from 'express';
import { telegramWebhookHandler } from '../controllers/telegramController.mjs';

const router = Router();

router.post('/webhook', telegramWebhookHandler);

export default router;
