import botService from '../services/botService.js';
import logger from '../config/logger.js';

/**
 * Controlador para manejar webhooks de Meta Messenger
 */

/**
 * Verificar webhook (GET)
 * Meta lo usa para verificar el webhook durante la configuración
 */
export const verifyWebhook = (req, res) => {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    logger.info('Webhook verification request received');

    if (mode && token) {
      if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
        logger.info('✓ Webhook verified successfully');
        res.status(200).send(challenge);
      } else {
        logger.warn('✗ Webhook verification failed - token mismatch');
        res.sendStatus(403);
      }
    } else {
      logger.warn('✗ Webhook verification failed - missing parameters');
      res.sendStatus(400);
    }
  } catch (error) {
    logger.error('Error in webhook verification:', error);
    res.sendStatus(500);
  }
};

/**
 * Recibir eventos del webhook (POST)
 * Procesa mensajes y eventos de Messenger
 */
export const handleWebhook = async (req, res) => {
  try {
    const body = req.body;

    // Verificar que es un evento de página
    if (body.object !== 'page') {
      logger.warn('Received non-page webhook event');
      return res.sendStatus(404);
    }

    // Responder rápidamente a Meta (requerimiento de Meta)
    res.status(200).send('EVENT_RECEIVED');

    // Procesar eventos de manera asíncrona
    body.entry.forEach(async (entry) => {
      const webhookEvent = entry.messaging[0];
      const senderId = webhookEvent.sender.id;

      logger.info(`Received event from ${senderId}`);

      try {
        // Manejar mensaje de texto
        if (webhookEvent.message && webhookEvent.message.text) {
          await botService.processMessage(senderId, webhookEvent.message.text);
        }
        // Manejar postback (botones)
        else if (webhookEvent.postback) {
          await botService.processPostback(senderId, webhookEvent.postback.payload);
        }
        // Manejar quick reply
        else if (webhookEvent.message && webhookEvent.message.quick_reply) {
          await botService.processPostback(senderId, webhookEvent.message.quick_reply.payload);
        }
      } catch (error) {
        logger.error(`Error processing event from ${senderId}:`, error);
      }
    });

  } catch (error) {
    logger.error('Error handling webhook:', error);
    // Ya enviamos 200 a Meta, solo logueamos el error
  }
};

export default {
  verifyWebhook,
  handleWebhook
};
