# Lógica del Bot - ChatBot Ferretería

## 4. Lógica del Bot (JavaScript) (25%)

### 4.1 Manejo de Webhooks de Meta

El sistema procesa webhooks de Meta Messenger siguiendo este flujo:

#### Verificación del Webhook (GET /webhook)

```javascript
// src/controllers/webhookController.js

export const verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    // Token válido, devolver challenge
    res.status(200).send(challenge);
  } else {
    // Token inválido
    res.sendStatus(403);
  }
};
```

**Proceso:**
1. Meta envía GET request con parámetros de verificación
2. Comparamos el `verify_token` con nuestro token secreto
3. Si coincide, devolvemos el `challenge` recibido
4. Meta confirma el webhook como válido

#### Recepción de Eventos (POST /webhook)

```javascript
export const handleWebhook = async (req, res) => {
  const body = req.body;

  // Verificar que es evento de página
  if (body.object !== 'page') {
    return res.sendStatus(404);
  }

  // Responder inmediatamente a Meta (requerimiento)
  res.status(200).send('EVENT_RECEIVED');

  // Procesar eventos de forma asíncrona
  body.entry.forEach(async (entry) => {
    const event = entry.messaging[0];
    const senderId = event.sender.id;

    // Procesar según tipo de evento
    if (event.message && event.message.text) {
      await botService.processMessage(senderId, event.message.text);
    } else if (event.postback) {
      await botService.processPostback(senderId, event.postback.payload);
    }
  });
};
```

**Tipos de eventos procesados:**

1. **Mensaje de texto**: `event.message.text`
2. **Postback (botones)**: `event.postback.payload`
3. **Quick Reply**: `event.message.quick_reply.payload`
4. **Attachments**: `event.message.attachments`

#### Verificación de Firma (Seguridad)

```javascript
// src/middlewares/verifySignature.js

export const verifySignature = (req, res, next) => {
  const signature = req.headers['x-hub-signature-256'];
  const elements = signature.split('=');
  const signatureHash = elements[1];
  
  // Calcular hash esperado
  const expectedHash = crypto
    .createHmac('sha256', process.env.META_APP_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');
  
  // Validar
  if (signatureHash === expectedHash) {
    next(); // Firma válida
  } else {
    res.status(403).json({ error: 'Invalid signature' });
  }
};
```

---

### 4.2 Estructura del Código del Bot

El código sigue **Clean Architecture** con separación de responsabilidades:

```
┌─────────────────────────────────────────┐
│         Controllers Layer               │
│  - webhookController.js                 │
│    • verifyWebhook()                    │
│    • handleWebhook()                    │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         Services Layer                  │
│  - botService.js (Orquestador)          │
│    • processMessage()                   │
│    • processPostback()                  │
│    • handleIntent()                     │
│                                         │
│  - intentService.js                     │
│    • identifyIntent()                   │
│    • generateResponse()                 │
│                                         │
│  - messengerService.js                  │
│    • sendTextMessage()                  │
│    • sendButtonMessage()                │
│    • sendQuickReply()                   │
│                                         │
│  - embeddingService.js                  │
│    • searchSimilar()                    │
│    • getBestAnswer()                    │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│      Repositories Layer                 │
│  - userRepository.js                    │
│  - productRepository.js                 │
│  - orderRepository.js                   │
│  - conversationRepository.js            │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         Data Layer                      │
│  - MySQL Database                       │
│  - Vector Database                      │
└─────────────────────────────────────────┘
```

#### Separación de Responsabilidades

**1. Controllers** (Capa de Presentación)
- Manejan requests HTTP
- Validan entrada
- Delegan a servicios
- Envían respuestas HTTP

**2. Services** (Capa de Negocio)
- Contienen lógica del bot
- Orquestan flujos complejos
- Usan múltiples repositories
- Independientes de HTTP

**3. Repositories** (Capa de Datos)
- Abstracción de base de datos
- CRUD operations
- Queries especializados
- Fácil de testear con mocks

**4. Utilities** (Transversal)
- Helpers
- Validators
- Formatters

---

### 4.3 Patrones de Diseño y Código Limpio

#### Patrones Implementados

**1. Repository Pattern**

```javascript
// Abstracción de acceso a datos
class ProductRepository {
  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
    return rows[0] || null;
  }
  
  async findByCategory(category) {
    // ...
  }
}

// Beneficios:
// - Fácil cambiar de MySQL a otro DB
// - Testeable con mocks
// - Reutilizable
```

**2. Service Layer Pattern**

```javascript
// Lógica de negocio centralizada y reutilizable
class BotService {
  async processMessage(senderId, message) {
    // Orquesta múltiples operaciones
    const user = await userRepository.findOrCreate(senderId);
    const intent = await intentService.identifyIntent(message);
    const response = await this.handleIntent(intent, message);
    await conversationRepository.saveMessage(...);
    return response;
  }
}

// Beneficios:
// - Lógica desacoplada de HTTP
// - Reutilizable desde diferentes controllers
// - Testeable unitariamente
```

**3. Singleton Pattern**

```javascript
// Una única instancia compartida
class EmbeddingService {
  constructor() {
    this.index = null;
    this.initialized = false;
  }
  
  async initialize() {
    if (this.initialized) return;
    // Inicializar solo una vez
    this.initialized = true;
  }
}

const embeddingService = new EmbeddingService();
export default embeddingService; // Única instancia

// Beneficios:
// - Compartir estado (índice vectorial)
// - Evitar reinicialización costosa
// - Uso eficiente de memoria
```

**4. Strategy Pattern**

```javascript
// Diferentes estrategias según intención
async handleIntent(senderId, user, intent, message, state) {
  switch (intent) {
    case INTENTS.GREETING:
      return await this.handleGreeting(senderId, user);
    
    case INTENTS.FAQ_PRODUCT:
      return await this.handleFAQ(senderId, message);
    
    case INTENTS.PLACE_ORDER:
      return await this.handlePlaceOrder(senderId, user, state);
    
    // ... más estrategias
  }
}

// Beneficios:
// - Fácil agregar nuevas intenciones
// - Cada handler es independiente
// - Código organizado
```

**5. Dependency Injection**

```javascript
// Inyectar dependencias en lugar de crearlas
class BotService {
  constructor(intentService, messengerService, userRepo) {
    this.intentService = intentService;
    this.messengerService = messengerService;
    this.userRepo = userRepo;
  }
  
  async processMessage(senderId, message) {
    const intent = await this.intentService.identifyIntent(message);
    const user = await this.userRepo.findById(senderId);
    // ...
  }
}

// Beneficios:
// - Fácil de testear (mock dependencies)
// - Desacoplamiento
// - Flexibilidad
```

#### Principios de Código Limpio Aplicados

**1. Single Responsibility Principle (SRP)**

```javascript
// ❌ Mal - Hace demasiadas cosas
class Bot {
  async process(senderId, message) {
    // Identifica intención
    // Consulta base de datos
    // Envía mensaje a Meta
    // Loguea
  }
}

// ✅ Bien - Una responsabilidad por clase
class IntentService {
  async identifyIntent(message) { /* ... */ }
}

class MessengerService {
  async sendMessage(recipientId, text) { /* ... */ }
}

class BotService {
  async processMessage(senderId, message) {
    const intent = await intentService.identifyIntent(message);
    await messengerService.sendMessage(senderId, response);
  }
}
```

**2. DRY (Don't Repeat Yourself)**

```javascript
// ❌ Mal - Código duplicado
async sendWelcome(senderId) {
  await axios.post(`${API_URL}?access_token=${TOKEN}`, {
    recipient: { id: senderId },
    message: { text: 'Bienvenido' }
  });
}

async sendGoodbye(senderId) {
  await axios.post(`${API_URL}?access_token=${TOKEN}`, {
    recipient: { id: senderId },
    message: { text: 'Adiós' }
  });
}

// ✅ Bien - Función reutilizable
async sendTextMessage(senderId, text) {
  await axios.post(`${API_URL}?access_token=${TOKEN}`, {
    recipient: { id: senderId },
    message: { text }
  });
}

// Uso
await sendTextMessage(senderId, 'Bienvenido');
await sendTextMessage(senderId, 'Adiós');
```

**3. Naming Conventions (Nombres Descriptivos)**

```javascript
// ❌ Mal
async p(sid, msg) {
  const i = await getI(msg);
  const r = await getR(i);
  return r;
}

// ✅ Bien
async processMessage(senderId, messageText) {
  const intent = await identifyIntent(messageText);
  const response = await generateResponse(intent);
  return response;
}
```

**4. Error Handling**

```javascript
// ✅ Try-catch en cada operación crítica
async processMessage(senderId, message) {
  try {
    const user = await userRepository.findOrCreate(senderId);
    const intent = await intentService.identifyIntent(message);
    // ...
  } catch (error) {
    logger.error('Error processing message:', error);
    await messengerService.sendTextMessage(
      senderId,
      'Disculpa, tuve un problema. ¿Podrías intentar de nuevo?'
    );
  }
}
```

**5. Async/Await**

```javascript
// ✅ Código moderno y legible
async processMessage(senderId, message) {
  await messengerService.markSeen(senderId);
  await messengerService.sendTypingIndicator(senderId, true);
  
  const user = await userRepository.findOrCreate(senderId);
  const intent = await intentService.identifyIntent(message);
  const response = await this.handleIntent(intent, message);
  
  await messengerService.sendTextMessage(senderId, response);
  await messengerService.sendTypingIndicator(senderId, false);
}
```

**6. Code Comments (Documentación)**

```javascript
/**
 * Identificar la intención del mensaje del usuario
 * 
 * @param {string} message - Mensaje del usuario
 * @param {Array} context - Contexto de conversación
 * @returns {Object} { intent, confidence }
 */
async identifyIntent(message, context = []) {
  // Usar OpenAI para análisis avanzado
  const result = await openai.chat.completions.create({...});
  
  // Retornar intención y nivel de confianza
  return {
    intent: result.intent,
    confidence: result.confidence
  };
}
```

---

### 4.4 Manejo de Estados de Conversación

#### Diagrama de Estados

```
┌──────────┐
│ initial  │ ────┐
└──────────┘     │
       │         │
       │ user starts conversation
       ▼         │
┌─────────────────────┐
│ awaiting_products   │
└──────────┬──────────┘
           │
           │ products selected
           ▼
┌─────────────────────────┐
│ awaiting_confirmation   │
└──────────┬──────────────┘
           │
           ├─── confirm ───►┌──────────────────────┐
           │                │ collecting_user_data │
           │                └──────────┬───────────┘
           │                           │
           │                           │ data collected
           │                           ▼
           │                ┌─────────────────┐
           │                │ order_confirmed │
           │                └─────────────────┘
           │
           └─── cancel ────►┌──────────┐
                            │ initial  │
                            └──────────┘
```

#### Implementación de Estados

**1. Almacenamiento de Estado**

```javascript
// Base de datos
CREATE TABLE conversation_states (
  user_id INT UNIQUE,
  current_state VARCHAR(50),
  context JSON,
  last_interaction TIMESTAMP
);

// Ejemplo de context JSON
{
  "selectedProducts": [
    { "id": 1, "quantity": 3 },
    { "id": 4, "quantity": 2 }
  ],
  "total": 175.50,
  "notes": "Entrega urgente"
}
```

**2. Gestión de Estado**

```javascript
// src/repositories/conversationRepository.js

export const getState = async (userId) => {
  const [rows] = await pool.query(
    'SELECT * FROM conversation_states WHERE user_id = ?',
    [userId]
  );
  
  if (rows.length === 0) {
    return {
      currentState: 'initial',
      context: {}
    };
  }
  
  return {
    currentState: rows[0].current_state,
    context: JSON.parse(rows[0].context)
  };
};

export const setState = async (userId, state, context) => {
  await pool.query(
    `INSERT INTO conversation_states (user_id, current_state, context)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE
       current_state = VALUES(current_state),
       context = VALUES(context),
       last_interaction = CURRENT_TIMESTAMP`,
    [userId, state, JSON.stringify(context)]
  );
};
```

**3. Transiciones de Estado**

```javascript
// src/services/botService.js

async handlePlaceOrder(senderId, user, state) {
  if (state.currentState === 'initial') {
    // Pedir productos
    await messengerService.sendTextMessage(
      senderId,
      'Para hacer un pedido, dime qué productos necesitas.'
    );
    
    // Cambiar a estado awaiting_products
    await conversationRepository.setState(user.id, 'awaiting_products', {
      action: 'order',
      selectedProducts: []
    });
  }
  else if (state.currentState === 'awaiting_products') {
    // Ya tiene productos, mostrar resumen
    await this.showOrderSummary(senderId, user, state);
    
    // Cambiar a awaiting_confirmation
    await conversationRepository.setState(user.id, 'awaiting_confirmation', {
      ...state.context
    });
  }
}
```

**4. Timeout de Sesión**

```javascript
// Limpiar sesiones inactivas (ejecutar periódicamente)
export const cleanupInactiveSessions = async (timeoutMinutes = 30) => {
  const [result] = await pool.query(
    `DELETE FROM conversation_states 
     WHERE last_interaction < DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
    [timeoutMinutes]
  );
  
  logger.info(`Cleaned up ${result.affectedRows} inactive sessions`);
};

// Programar limpieza cada hora
setInterval(async () => {
  await cleanupInactiveSessions(30);
}, 60 * 60 * 1000); // 1 hora
```

**5. Context Accumulation**

```javascript
// Agregar información al contexto sin perder lo anterior
export const updateContext = async (userId, contextUpdate) => {
  const currentState = await getState(userId);
  const newContext = {
    ...currentState.context,
    ...contextUpdate
  };
  
  await setState(userId, currentState.currentState, newContext);
  return newContext;
};

// Uso
await updateContext(user.id, {
  selectedProducts: [...existingProducts, newProduct]
});
```

---

### 4.5 Flujo Completo de Ejemplo

**Usuario quiere hacer un pedido:**

```
1. Usuario: "Quiero hacer un pedido"
   
2. Bot:
   - Identifica intent: PLACE_ORDER
   - Estado actual: initial
   - Acción: Solicitar productos
   - Nuevo estado: awaiting_products
   
3. Usuario: "3 cemento y 2 pintura blanca"
   
4. Bot:
   - Estado: awaiting_products
   - Extrae: ["cemento", "pintura blanca"]
   - Busca productos en DB
   - Agrega al context.selectedProducts
   - Muestra resumen
   - Nuevo estado: awaiting_confirmation
   
5. Usuario: "Sí, confirmar"
   
6. Bot:
   - Estado: awaiting_confirmation
   - Identifica intent: CONFIRM_ORDER
   - Verifica datos de usuario (phone, address)
   - Si faltan → solicita datos (collecting_user_data)
   - Si completos → crea pedido
   - Nuevo estado: order_confirmed
   
7. Bot: "✅ Pedido ORD-20251103-001 confirmado!"
```

Este diseño permite conversaciones naturales y contextuales, manteniendo el estado entre mensajes.
