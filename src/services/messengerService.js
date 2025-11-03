import axios from 'axios';
import logger from '../config/logger.js';

/**
 * Servicio para comunicarse con la API de Meta Messenger
 */

const MESSENGER_API_URL = 'https://graph.facebook.com/v18.0/me/messages';
const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN;

/**
 * Enviar mensaje de texto simple
 */
export const sendTextMessage = async (recipientId, text) => {
  try {
    const response = await axios.post(
      `${MESSENGER_API_URL}?access_token=${PAGE_ACCESS_TOKEN}`,
      {
        recipient: { id: recipientId },
        message: { text }
      }
    );
    
    logger.debug(`Message sent to ${recipientId}: ${text}`);
    return response.data;
    
  } catch (error) {
    logger.error('Error sending text message:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Enviar mensaje con quick replies (respuestas rápidas)
 */
export const sendQuickReply = async (recipientId, text, quickReplies) => {
  try {
    const formattedReplies = quickReplies.map(reply => ({
      content_type: 'text',
      title: reply.title,
      payload: reply.payload
    }));

    const response = await axios.post(
      `${MESSENGER_API_URL}?access_token=${PAGE_ACCESS_TOKEN}`,
      {
        recipient: { id: recipientId },
        message: {
          text,
          quick_replies: formattedReplies
        }
      }
    );
    
    logger.debug(`Quick reply sent to ${recipientId}`);
    return response.data;
    
  } catch (error) {
    logger.error('Error sending quick reply:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Enviar mensaje con botones
 */
export const sendButtonMessage = async (recipientId, text, buttons) => {
  try {
    const formattedButtons = buttons.map(button => ({
      type: button.type || 'postback',
      title: button.title,
      payload: button.payload
    }));

    const response = await axios.post(
      `${MESSENGER_API_URL}?access_token=${PAGE_ACCESS_TOKEN}`,
      {
        recipient: { id: recipientId },
        message: {
          attachment: {
            type: 'template',
            payload: {
              template_type: 'button',
              text,
              buttons: formattedButtons
            }
          }
        }
      }
    );
    
    logger.debug(`Button message sent to ${recipientId}`);
    return response.data;
    
  } catch (error) {
    logger.error('Error sending button message:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Enviar plantilla genérica (tarjetas de productos)
 */
export const sendGenericTemplate = async (recipientId, elements) => {
  try {
    const response = await axios.post(
      `${MESSENGER_API_URL}?access_token=${PAGE_ACCESS_TOKEN}`,
      {
        recipient: { id: recipientId },
        message: {
          attachment: {
            type: 'template',
            payload: {
              template_type: 'generic',
              elements
            }
          }
        }
      }
    );
    
    logger.debug(`Generic template sent to ${recipientId}`);
    return response.data;
    
  } catch (error) {
    logger.error('Error sending generic template:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Enviar imagen
 */
export const sendImage = async (recipientId, imageUrl) => {
  try {
    const response = await axios.post(
      `${MESSENGER_API_URL}?access_token=${PAGE_ACCESS_TOKEN}`,
      {
        recipient: { id: recipientId },
        message: {
          attachment: {
            type: 'image',
            payload: {
              url: imageUrl,
              is_reusable: true
            }
          }
        }
      }
    );
    
    logger.debug(`Image sent to ${recipientId}`);
    return response.data;
    
  } catch (error) {
    logger.error('Error sending image:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Marcar como visto (typing indicator)
 */
export const sendTypingIndicator = async (recipientId, isTyping = true) => {
  try {
    const senderAction = isTyping ? 'typing_on' : 'typing_off';
    
    await axios.post(
      `${MESSENGER_API_URL}?access_token=${PAGE_ACCESS_TOKEN}`,
      {
        recipient: { id: recipientId },
        sender_action: senderAction
      }
    );
    
  } catch (error) {
    logger.error('Error sending typing indicator:', error.response?.data || error.message);
  }
};

/**
 * Marcar mensaje como leído
 */
export const markSeen = async (recipientId) => {
  try {
    await axios.post(
      `${MESSENGER_API_URL}?access_token=${PAGE_ACCESS_TOKEN}`,
      {
        recipient: { id: recipientId },
        sender_action: 'mark_seen'
      }
    );
    
  } catch (error) {
    logger.error('Error marking as seen:', error.response?.data || error.message);
  }
};

export default {
  sendTextMessage,
  sendQuickReply,
  sendButtonMessage,
  sendGenericTemplate,
  sendImage,
  sendTypingIndicator,
  markSeen
};
