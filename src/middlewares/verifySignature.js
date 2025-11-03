import crypto from 'crypto';
import logger from '../config/logger.js';

/**
 * Middleware para verificar la firma de los webhooks de Meta
 * Asegura que los requests vienen realmente de Meta
 */
export const verifySignature = (req, res, next) => {
  try {
    const signature = req.headers['x-hub-signature-256'];
    
    if (!signature) {
      logger.warn('Missing signature in webhook request');
      return res.status(401).json({ error: 'Missing signature' });
    }
    
    // Extraer el hash de la firma
    const elements = signature.split('=');
    const signatureHash = elements[1];
    
    // Calcular el hash esperado
    const expectedHash = crypto
      .createHmac('sha256', process.env.META_APP_SECRET)
      .update(JSON.stringify(req.body))
      .digest('hex');
    
    // Comparar los hashes
    if (signatureHash !== expectedHash) {
      logger.warn('Invalid signature in webhook request');
      return res.status(403).json({ error: 'Invalid signature' });
    }
    
    // Firma válida, continuar
    next();
    
  } catch (error) {
    logger.error('Error verifying signature:', error);
    return res.status(500).json({ error: 'Error verifying signature' });
  }
};

export default verifySignature;
