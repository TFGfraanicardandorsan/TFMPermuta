import { Router } from 'express';
import { handleWebhook } from '../controllers/telegramController.mjs';

const router = Router();

router.post('/webhook', handleWebhook);

export default router;
