import express from 'express';
import { verifyWebhook, handleWebhook } from '../controllers/webhookController.js';
import verifySignature from '../middlewares/verifySignature.js';
import { webhookLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

/**
 * GET /webhook
 * Verificación del webhook por parte de Meta
 */
router.get('/', verifyWebhook);

/**
 * POST /webhook
 * Recepción de eventos de Messenger
 * Aplica verificación de firma y rate limiting
 */
router.post('/', webhookLimiter, verifySignature, handleWebhook);

export default router;
