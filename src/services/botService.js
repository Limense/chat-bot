import { INTENTS, identifyIntent, generateResponse } from './intentService.js';
import messengerService from './messengerService.js';
import embeddingService from './embeddingService.js';
import userRepository from '../repositories/userRepository.js';
import productRepository from '../repositories/productRepository.js';
import orderRepository from '../repositories/orderRepository.js';
import conversationRepository from '../repositories/conversationRepository.js';
import logger from '../config/logger.js';

/**
 * Servicio principal del bot - Orquesta toda la lógica del chatbot
 */

class BotService {
  /**
   * Procesar mensaje entrante del usuario
   */
  async processMessage(senderId, messageText) {
    try {
      logger.info(`Processing message from ${senderId}: ${messageText}`);

      // Marcar como visto y mostrar indicador de escritura
      await messengerService.markSeen(senderId);
      await messengerService.sendTypingIndicator(senderId, true);

      // Obtener o crear usuario
      const user = await userRepository.findOrCreate(senderId);

      // Guardar mensaje del usuario
      const context = await conversationRepository.getRecentContext(user.id, 5);
      
      // Identificar intención
      const { intent, confidence } = await identifyIntent(messageText, context);

      // Guardar mensaje con intención identificada
      await conversationRepository.saveMessage({
        userId: user.id,
        messageType: 'user',
        messageText,
        intent,
        confidence
      });

      // Obtener estado actual de la conversación
      const state = await conversationRepository.getState(user.id);

      // Procesar según intención y estado
      const response = await this.handleIntent(senderId, user, intent, messageText, state);

      // Guardar respuesta del bot
      if (response.text) {
        await conversationRepository.saveMessage({
          userId: user.id,
          messageType: 'bot',
          messageText: response.text
        });
      }

      // Quitar indicador de escritura
      await messengerService.sendTypingIndicator(senderId, false);

      return response;

    } catch (error) {
      logger.error('Error processing message:', error);
      await messengerService.sendTextMessage(
        senderId,
        'Disculpa, tuve un problema procesando tu mensaje. ¿Podrías intentar de nuevo?'
      );
    }
  }

  /**
   * Manejar intención identificada
   */
  async handleIntent(senderId, user, intent, messageText, state) {
    logger.debug(`Handling intent: ${intent}, state: ${state.currentState}`);

    switch (intent) {
      case INTENTS.GREETING:
        return await this.handleGreeting(senderId, user);

      case INTENTS.FAQ_PRODUCT:
      case INTENTS.FAQ_SERVICE:
      case INTENTS.FAQ_SCHEDULE:
        return await this.handleFAQ(senderId, messageText);

      case INTENTS.PRODUCT_INQUIRY:
        return await this.handleProductInquiry(senderId, user, messageText);

      case INTENTS.REQUEST_QUOTE:
        return await this.handleQuoteRequest(senderId, user, state);

      case INTENTS.PLACE_ORDER:
        return await this.handlePlaceOrder(senderId, user, state);

      case INTENTS.CONFIRM_ORDER:
        return await this.handleConfirmOrder(senderId, user, state);

      case INTENTS.CANCEL_ORDER:
        return await this.handleCancelOrder(senderId, user, state);

      case INTENTS.GOODBYE:
        return await this.handleGoodbye(senderId, user);

      default:
        return await this.handleUnknown(senderId, messageText);
    }
  }

  /**
   * Manejar saludo
   */
  async handleGreeting(senderId, user) {
    const greeting = `¡Hola${user.first_name ? ' ' + user.first_name : ''}! 👋 Bienvenido a Ferretería El Constructor.\n\n¿En qué puedo ayudarte hoy?`;

    await messengerService.sendButtonMessage(senderId, greeting, [
      { title: '🛠️ Ver Productos', payload: 'VIEW_PRODUCTS' },
      { title: '💰 Hacer Pedido', payload: 'PLACE_ORDER' },
      { title: '❓ Preguntas Frecuentes', payload: 'FAQ' }
    ]);

    await conversationRepository.setState(user.id, 'initial', {});

    return { text: greeting };
  }

  /**
   * Manejar preguntas frecuentes usando búsqueda semántica
   */
  async handleFAQ(senderId, question) {
    const result = await embeddingService.getBestAnswer(question, 0.65);

    if (result.found) {
      await messengerService.sendTextMessage(senderId, result.answer);
      
      // Ofrecer más ayuda
      await messengerService.sendQuickReply(
        senderId,
        '¿Te puedo ayudar con algo más?',
        [
          { title: 'Ver productos', payload: 'VIEW_PRODUCTS' },
          { title: 'Hacer pedido', payload: 'PLACE_ORDER' },
          { title: 'Otra pregunta', payload: 'ASK_AGAIN' }
        ]
      );

      return { text: result.answer };
    } else {
      const response = 'No tengo esa información exacta, pero puedo ayudarte con:\n\n' +
        '• Información de productos\n' +
        '• Horarios de atención\n' +
        '• Métodos de pago y entrega\n' +
        '• Realizar pedidos\n\n' +
        '¿Sobre qué te gustaría saber?';

      await messengerService.sendTextMessage(senderId, response);
      return { text: response };
    }
  }

  /**
   * Manejar consulta de productos
   */
  async handleProductInquiry(senderId, user, messageText) {
    // Buscar productos que coincidan
    const products = await productRepository.searchByName(messageText, 5);

    if (products.length === 0) {
      const response = 'No encontré productos con ese nombre. ¿Podrías ser más específico? O puedo mostrarte nuestras categorías disponibles.';
      await messengerService.sendTextMessage(senderId, response);
      
      const categories = await productRepository.getCategories();
      if (categories.length > 0) {
        await messengerService.sendTextMessage(
          senderId,
          'Categorías disponibles:\n' + categories.map(c => `• ${c}`).join('\n')
        );
      }

      return { text: response };
    }

    // Enviar productos como tarjetas
    const elements = products.slice(0, 3).map(product => ({
      title: product.name,
      subtitle: `S/ ${product.price.toFixed(2)} - Stock: ${product.stock} ${product.unit}`,
      image_url: product.image_url || 'https://via.placeholder.com/300x200?text=Producto',
      buttons: [
        {
          type: 'postback',
          title: 'Agregar a pedido',
          payload: `ADD_PRODUCT_${product.id}`
        }
      ]
    }));

    await messengerService.sendGenericTemplate(senderId, elements);

    if (products.length > 3) {
      await messengerService.sendTextMessage(
        senderId,
        `Encontré ${products.length} productos. Te muestro los primeros 3. ¿Quieres ver más?`
      );
    }

    return { text: `Encontré ${products.length} productos` };
  }

  /**
   * Manejar solicitud de cotización
   */
  async handleQuoteRequest(senderId, user, state) {
    await messengerService.sendTextMessage(
      senderId,
      '¡Perfecto! Para cotizar, necesito que me digas qué productos te interesan.\n\n' +
      'Puedes escribir el nombre del producto o enviármelo en este formato:\n' +
      '• Cemento x 3\n' +
      '• Fierro 1/2" x 5\n' +
      '• Pintura blanca x 2'
    );

    await conversationRepository.setState(user.id, 'awaiting_products', {
      action: 'quote'
    });

    return { text: 'Esperando productos para cotización' };
  }

  /**
   * Manejar realizar pedido
   */
  async handlePlaceOrder(senderId, user, state) {
    if (state.currentState === 'initial' || !state.context.selectedProducts) {
      await messengerService.sendTextMessage(
        senderId,
        'Para hacer un pedido, primero dime qué productos necesitas.\n\n' +
        'Ejemplo:\n' +
        '• Cemento x 3\n' +
        '• Clavos x 2\n' +
        '• Pintura blanca x 1'
      );

      await conversationRepository.setState(user.id, 'awaiting_products', {
        action: 'order',
        selectedProducts: []
      });
    } else {
      // Ya tiene productos, pedir confirmación
      return await this.showOrderSummary(senderId, user, state);
    }

    return { text: 'Iniciando proceso de pedido' };
  }

  /**
   * Mostrar resumen del pedido
   */
  async showOrderSummary(senderId, user, state) {
    const { selectedProducts } = state.context;

    if (!selectedProducts || selectedProducts.length === 0) {
      await messengerService.sendTextMessage(senderId, 'No has seleccionado productos aún.');
      return { text: 'Sin productos' };
    }

    const products = await productRepository.findByIds(selectedProducts.map(p => p.id));
    let total = 0;
    let summary = '📋 *Resumen de tu pedido:*\n\n';

    selectedProducts.forEach((item, index) => {
      const product = products.find(p => p.id === item.id);
      if (product) {
        const subtotal = product.price * item.quantity;
        total += subtotal;
        summary += `${index + 1}. ${product.name}\n`;
        summary += `   Cantidad: ${item.quantity} ${product.unit}\n`;
        summary += `   Precio: S/ ${product.price.toFixed(2)} c/u\n`;
        summary += `   Subtotal: S/ ${subtotal.toFixed(2)}\n\n`;
      }
    });

    summary += `💰 *Total: S/ ${total.toFixed(2)}*\n\n`;
    summary += '¿Deseas confirmar este pedido?';

    await messengerService.sendTextMessage(senderId, summary);
    await messengerService.sendQuickReply(senderId, 'Confirmar pedido:', [
      { title: '✅ Sí, confirmar', payload: 'CONFIRM_ORDER' },
      { title: '❌ No, cancelar', payload: 'CANCEL_ORDER' }
    ]);

    await conversationRepository.setState(user.id, 'awaiting_confirmation', {
      ...state.context,
      total
    });

    return { text: summary };
  }

  /**
   * Confirmar pedido
   */
  async handleConfirmOrder(senderId, user, state) {
    if (state.currentState !== 'awaiting_confirmation') {
      await messengerService.sendTextMessage(
        senderId,
        'No hay ningún pedido pendiente de confirmar. ¿Quieres hacer un pedido nuevo?'
      );
      return { text: 'Sin pedido pendiente' };
    }

    // Pedir datos de entrega si no los tiene
    if (!user.phone || !user.address) {
      await messengerService.sendTextMessage(
        senderId,
        'Para confirmar tu pedido, necesito algunos datos:\n\n' +
        'Por favor envíame:\n' +
        '• Tu nombre completo\n' +
        '• Número de celular\n' +
        '• Dirección de entrega completa\n\n' +
        'Ejemplo:\n' +
        'Juan Pérez\n' +
        '987654321\n' +
        'Av. Principal 123, San Isidro'
      );

      await conversationRepository.setState(user.id, 'collecting_user_data', state.context);
      return { text: 'Solicitando datos de usuario' };
    }

    // Crear pedido
    try {
      const order = await orderRepository.create({
        userId: user.id,
        items: state.context.selectedProducts.map(p => ({
          productId: p.id,
          quantity: p.quantity
        })),
        deliveryAddress: user.address,
        deliveryPhone: user.phone,
        notes: state.context.notes || ''
      });

      const confirmMessage = `✅ *¡Pedido confirmado!*\n\n` +
        `📦 Número de pedido: *${order.order_number}*\n` +
        `💰 Total: S/ ${order.total_amount.toFixed(2)}\n\n` +
        `📍 Entrega en: ${order.delivery_address}\n` +
        `📞 Contacto: ${order.delivery_phone}\n\n` +
        `Procesaremos tu pedido pronto. ¡Gracias por tu compra! 🎉`;

      await messengerService.sendTextMessage(senderId, confirmMessage);
      await conversationRepository.setState(user.id, 'order_confirmed', { orderId: order.id });

      return { text: confirmMessage };

    } catch (error) {
      logger.error('Error creating order:', error);
      await messengerService.sendTextMessage(
        senderId,
        'Hubo un error al procesar tu pedido. Por favor intenta nuevamente o contáctanos directamente.'
      );
      return { text: 'Error creando pedido' };
    }
  }

  /**
   * Cancelar pedido
   */
  async handleCancelOrder(senderId, user, state) {
    await messengerService.sendTextMessage(
      senderId,
      'Pedido cancelado. ¿Hay algo más en lo que pueda ayudarte?'
    );

    await conversationRepository.setState(user.id, 'initial', {});
    return { text: 'Pedido cancelado' };
  }

  /**
   * Manejar despedida
   */
  async handleGoodbye(senderId, user) {
    const message = '¡Hasta pronto! Fue un gusto ayudarte. Estamos disponibles cuando nos necesites. 👋';
    await messengerService.sendTextMessage(senderId, message);
    await conversationRepository.clearState(user.id);
    return { text: message };
  }

  /**
   * Manejar intención desconocida
   */
  async handleUnknown(senderId, messageText) {
    // Intentar buscar en la base de conocimiento
    const faqResult = await embeddingService.getBestAnswer(messageText, 0.6);

    if (faqResult.found) {
      await messengerService.sendTextMessage(senderId, faqResult.answer);
      return { text: faqResult.answer };
    }

    const message = 'No estoy seguro de entender. Puedo ayudarte con:\n\n' +
      '• Información de productos\n' +
      '• Realizar cotizaciones\n' +
      '• Hacer pedidos\n' +
      '• Horarios y servicios\n\n' +
      '¿Qué necesitas?';

    await messengerService.sendTextMessage(senderId, message);
    return { text: message };
  }

  /**
   * Manejar postback (botones)
   */
  async processPostback(senderId, payload) {
    logger.info(`Processing postback from ${senderId}: ${payload}`);

    const user = await userRepository.findOrCreate(senderId);

    if (payload === 'VIEW_PRODUCTS') {
      const categories = await productRepository.getCategories();
      await messengerService.sendTextMessage(
        senderId,
        'Nuestras categorías:\n\n' + categories.map(c => `• ${c}`).join('\n') +
        '\n\n¿Qué categoría te interesa?'
      );
    } else if (payload === 'PLACE_ORDER') {
      await this.handlePlaceOrder(senderId, user, await conversationRepository.getState(user.id));
    } else if (payload === 'FAQ') {
      await messengerService.sendTextMessage(
        senderId,
        '¿Qué te gustaría saber? Puedo ayudarte con información sobre productos, servicios, horarios, etc.'
      );
    } else if (payload === 'CONFIRM_ORDER') {
      const state = await conversationRepository.getState(user.id);
      await this.handleConfirmOrder(senderId, user, state);
    } else if (payload === 'CANCEL_ORDER') {
      const state = await conversationRepository.getState(user.id);
      await this.handleCancelOrder(senderId, user, state);
    } else if (payload.startsWith('ADD_PRODUCT_')) {
      const productId = parseInt(payload.replace('ADD_PRODUCT_', ''));
      await this.addProductToCart(senderId, user, productId);
    }

    return { success: true };
  }

  /**
   * Agregar producto al carrito
   */
  async addProductToCart(senderId, user, productId) {
    const product = await productRepository.findById(productId);

    if (!product) {
      await messengerService.sendTextMessage(senderId, 'Producto no encontrado.');
      return;
    }

    const state = await conversationRepository.getState(user.id);
    const selectedProducts = state.context.selectedProducts || [];
    
    selectedProducts.push({ id: productId, quantity: 1 });

    await conversationRepository.updateContext(user.id, { selectedProducts });

    await messengerService.sendTextMessage(
      senderId,
      `✅ ${product.name} agregado a tu pedido.\n\n¿Quieres agregar más productos o proceder con el pedido?`
    );

    await messengerService.sendQuickReply(senderId, 'Opciones:', [
      { title: 'Agregar más', payload: 'ADD_MORE' },
      { title: 'Ver resumen', payload: 'VIEW_SUMMARY' },
      { title: 'Confirmar pedido', payload: 'CONFIRM_ORDER' }
    ]);
  }
}

// Exportar instancia única (Singleton)
const botService = new BotService();

export default botService;
export { BotService };
