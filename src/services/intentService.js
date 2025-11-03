import openai, { MODELS } from '../config/openai.js';
import logger from '../config/logger.js';

/**
 * Servicio para identificar intenciones usando OpenAI
 */

// Definición de intenciones posibles
const INTENTS = {
  GREETING: 'greeting',
  FAQ_PRODUCT: 'faq_product',
  FAQ_SERVICE: 'faq_service',
  FAQ_SCHEDULE: 'faq_schedule',
  PRODUCT_INQUIRY: 'product_inquiry',
  REQUEST_QUOTE: 'request_quote',
  PLACE_ORDER: 'place_order',
  CONFIRM_ORDER: 'confirm_order',
  CANCEL_ORDER: 'cancel_order',
  CHECK_ORDER_STATUS: 'check_order_status',
  GOODBYE: 'goodbye',
  UNKNOWN: 'unknown'
};

/**
 * Identificar la intención del mensaje del usuario usando OpenAI
 */
export const identifyIntent = async (message, conversationContext = []) => {
  try {
    const systemPrompt = `Eres un asistente que identifica la intención de los mensajes de usuarios en una ferretería.

Intenciones posibles:
- greeting: Saludos iniciales (hola, buenos días, etc.)
- faq_product: Preguntas sobre características de productos
- faq_service: Preguntas sobre servicios (entrega, pagos, garantías)
- faq_schedule: Preguntas sobre horarios de atención
- product_inquiry: Consulta de productos disponibles o búsqueda
- request_quote: Solicitud de cotización
- place_order: Quiere realizar un pedido
- confirm_order: Confirma un pedido
- cancel_order: Cancela un pedido
- check_order_status: Consulta estado de pedido
- goodbye: Despedida
- unknown: No está claro

Responde SOLO con el nombre de la intención y un nivel de confianza (0.0 a 1.0) en formato JSON:
{"intent": "nombre_intención", "confidence": 0.95}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationContext.slice(-3), // Últimos 3 mensajes para contexto
      { role: 'user', content: message }
    ];

    const response = await openai.chat.completions.create({
      model: MODELS.CHAT,
      messages,
      temperature: 0.3,
      max_tokens: 100
    });

    const result = JSON.parse(response.choices[0].message.content);
    
    logger.debug(`Intent identified: ${result.intent} (confidence: ${result.confidence})`);
    
    return {
      intent: result.intent,
      confidence: result.confidence
    };

  } catch (error) {
    logger.error('Error identifying intent:', error);
    
    // Fallback: análisis simple basado en palabras clave
    return fallbackIntentDetection(message);
  }
};

/**
 * Fallback: Detección de intención simple basada en palabras clave
 */
const fallbackIntentDetection = (message) => {
  const lowerMessage = message.toLowerCase();

  if (/^(hola|buenos|buenas|hey|saludos)/i.test(lowerMessage)) {
    return { intent: INTENTS.GREETING, confidence: 0.8 };
  }

  if (/cotiza|cotización|precio|costo|cuanto.*cuesta|valor/i.test(lowerMessage)) {
    return { intent: INTENTS.REQUEST_QUOTE, confidence: 0.7 };
  }

  if (/pedido|comprar|ordenar|quiero.*llevar/i.test(lowerMessage)) {
    return { intent: INTENTS.PLACE_ORDER, confidence: 0.7 };
  }

  if (/horario|hora|cuando.*abre|cuando.*cierra|atiend/i.test(lowerMessage)) {
    return { intent: INTENTS.FAQ_SCHEDULE, confidence: 0.7 };
  }

  if (/entrega|envío|delivery|pago|transferencia/i.test(lowerMessage)) {
    return { intent: INTENTS.FAQ_SERVICE, confidence: 0.7 };
  }

  if (/producto|tienes|hay|stock|disponible|venden/i.test(lowerMessage)) {
    return { intent: INTENTS.PRODUCT_INQUIRY, confidence: 0.6 };
  }

  if (/confirm|sí|si|ok|dale|correcto/i.test(lowerMessage)) {
    return { intent: INTENTS.CONFIRM_ORDER, confidence: 0.6 };
  }

  if (/cancel|no|negativo|mejor.*no/i.test(lowerMessage)) {
    return { intent: INTENTS.CANCEL_ORDER, confidence: 0.6 };
  }

  if (/chao|adiós|adios|gracias|hasta/i.test(lowerMessage)) {
    return { intent: INTENTS.GOODBYE, confidence: 0.7 };
  }

  return { intent: INTENTS.UNKNOWN, confidence: 0.3 };
};

/**
 * Generar respuesta contextual usando GPT
 */
export const generateResponse = async (userMessage, context, systemContext = '') => {
  try {
    const systemPrompt = `Eres un asistente virtual de una ferretería en Perú. 
Eres amable, profesional y conciso. Usas soles (S/) como moneda.
${systemContext}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...context.slice(-5),
      { role: 'user', content: userMessage }
    ];

    const response = await openai.chat.completions.create({
      model: MODELS.CHAT,
      messages,
      temperature: 0.7,
      max_tokens: 300
    });

    return response.choices[0].message.content;

  } catch (error) {
    logger.error('Error generating response:', error);
    return 'Disculpa, tuve un problema procesando tu mensaje. ¿Podrías reformularlo?';
  }
};

/**
 * Extraer entidades del mensaje (productos, cantidades, etc.)
 */
export const extractEntities = async (message) => {
  try {
    const systemPrompt = `Extrae entidades del mensaje del usuario. Busca:
- Nombres de productos
- Cantidades
- Direcciones
- Números de teléfono

Responde en formato JSON:
{
  "products": ["producto1", "producto2"],
  "quantities": [2, 1],
  "address": "dirección si existe",
  "phone": "teléfono si existe"
}`;

    const response = await openai.chat.completions.create({
      model: MODELS.CHAT,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      temperature: 0.2,
      max_tokens: 200
    });

    return JSON.parse(response.choices[0].message.content);

  } catch (error) {
    logger.error('Error extracting entities:', error);
    return { products: [], quantities: [], address: null, phone: null };
  }
};

export { INTENTS };

export default {
  identifyIntent,
  generateResponse,
  extractEntities,
  INTENTS
};
