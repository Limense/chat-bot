# Documentación de API - ChatBot Ferretería

## 3. Diseño de API (Express.js) (25%)

### 3.1 Endpoints del Backend

#### Base URL
```
http://localhost:3000
```

En producción:
```
https://tu-dominio.com
```

---

### 3.2 Endpoints REST

#### 1. Verificación de Webhook (GET)

**Endpoint:** `GET /webhook`

**Descripción:** Meta usa este endpoint para verificar el webhook durante la configuración inicial.

**Query Parameters:**
- `hub.mode` (string, required): Debe ser "subscribe"
- `hub.verify_token` (string, required): Token de verificación configurado
- `hub.challenge` (string, required): Desafío enviado por Meta

**Response Success (200):**
```
{challenge_value}
```

**Response Error (403):**
```json
{
  "error": "Verification token mismatch"
}
```

**Ejemplo de Request:**
```bash
GET /webhook?hub.mode=subscribe&hub.verify_token=mi_token_secreto&hub.challenge=1234567890
```

**Código de implementación:**
```javascript
// Verificar token y devolver challenge
if (mode === 'subscribe' && token === VERIFY_TOKEN) {
  res.status(200).send(challenge);
} else {
  res.sendStatus(403);
}
```

---

#### 2. Recepción de Eventos (POST)

**Endpoint:** `POST /webhook`

**Descripción:** Recibe eventos de mensajes desde Meta Messenger.

**Headers:**
- `X-Hub-Signature-256` (string, required): Firma SHA256 del payload
- `Content-Type: application/json`

**Request Body:**
```json
{
  "object": "page",
  "entry": [
    {
      "id": "PAGE_ID",
      "time": 1699999999999,
      "messaging": [
        {
          "sender": {
            "id": "USER_PSID"
          },
          "recipient": {
            "id": "PAGE_ID"
          },
          "timestamp": 1699999999999,
          "message": {
            "mid": "MESSAGE_ID",
            "text": "Hola, quiero información sobre productos"
          }
        }
      ]
    }
  ]
}
```

**Response Success (200):**
```json
{
  "status": "EVENT_RECEIVED"
}
```

**Response Error (400):**
```json
{
  "error": "Invalid signature"
}
```

**Tipos de eventos soportados:**

1. **Mensaje de texto:**
```json
{
  "message": {
    "mid": "m_xxx",
    "text": "¿Cuánto cuesta el cemento?"
  }
}
```

2. **Postback (botones):**
```json
{
  "postback": {
    "title": "Confirmar Pedido",
    "payload": "CONFIRM_ORDER_123"
  }
}
```

3. **Quick Reply:**
```json
{
  "message": {
    "text": "Sí",
    "quick_reply": {
      "payload": "CONFIRM_YES"
    }
  }
}
```

---

#### 3. Envío de Mensajes (Interno)

**Endpoint:** `POST /api/messages/send`

**Descripción:** Endpoint interno para testing manual de envío de mensajes.

**Headers:**
- `Content-Type: application/json`
- `Authorization: Bearer {API_KEY}` (opcional, para seguridad)

**Request Body:**
```json
{
  "recipient_id": "USER_PSID",
  "message_type": "text",
  "message": {
    "text": "Hola, ¿en qué puedo ayudarte?"
  }
}
```

**Response Success (200):**
```json
{
  "success": true,
  "message_id": "m_xxx",
  "recipient_id": "USER_PSID"
}
```

---

#### 4. Consulta de Productos

**Endpoint:** `POST /api/products/search`

**Descripción:** Buscar productos por nombre o categoría (para testing).

**Request Body:**
```json
{
  "query": "cemento",
  "category": "Materiales de Construcción",
  "limit": 5
}
```

**Response Success (200):**
```json
{
  "success": true,
  "products": [
    {
      "id": 1,
      "name": "Cemento Portland Tipo I",
      "description": "Cemento de alta resistencia...",
      "price": 28.50,
      "stock": 100,
      "unit": "Bolsa 42.5 kg",
      "image_url": "https://..."
    }
  ],
  "count": 1
}
```

---

#### 5. Crear Pedido

**Endpoint:** `POST /api/orders`

**Descripción:** Crear un nuevo pedido (usado internamente por el bot).

**Request Body:**
```json
{
  "user_id": 1,
  "items": [
    {
      "product_id": 1,
      "quantity": 3
    },
    {
      "product_id": 4,
      "quantity": 2
    }
  ],
  "delivery_address": "Av. Principal 123",
  "delivery_phone": "987654321",
  "notes": "Entrega en la mañana"
}
```

**Response Success (201):**
```json
{
  "success": true,
  "order": {
    "id": 1,
    "order_number": "ORD-20251103-001",
    "status": "pending",
    "total_amount": 175.50,
    "items": [
      {
        "product_name": "Cemento Portland Tipo I",
        "quantity": 3,
        "unit_price": 28.50,
        "subtotal": 85.50
      },
      {
        "product_name": "Pintura Látex Blanca 1 galón",
        "quantity": 2,
        "unit_price": 45.00,
        "subtotal": 90.00
      }
    ],
    "created_at": "2025-11-03T10:30:00Z"
  }
}
```

**Response Error (400):**
```json
{
  "success": false,
  "error": "Stock insuficiente para producto: Cemento Portland Tipo I"
}
```

---

#### 6. Consultar Estado de Pedido

**Endpoint:** `GET /api/orders/:orderNumber`

**Descripción:** Obtener información de un pedido.

**Response Success (200):**
```json
{
  "success": true,
  "order": {
    "order_number": "ORD-20251103-001",
    "status": "confirmed",
    "total_amount": 175.50,
    "created_at": "2025-11-03T10:30:00Z",
    "items": [...]
  }
}
```

---

#### 7. Health Check

**Endpoint:** `GET /health`

**Descripción:** Verificar estado del servidor.

**Response Success (200):**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-03T10:30:00Z",
  "uptime": 3600,
  "database": "connected",
  "vector_db": "connected"
}
```

---

### 3.3 Manejo de Errores

#### Estrategia de Manejo de Errores

**1. Middleware Global de Errores**

```javascript
// src/middlewares/errorHandler.js
export const errorHandler = (err, req, res, next) => {
  // Log del error
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  // No exponer detalles en producción
  const isProduction = process.env.NODE_ENV === 'production';
  
  const response = {
    success: false,
    error: isProduction ? 'Internal server error' : err.message,
    ...(isProduction ? {} : { stack: err.stack })
  };

  // Determinar código de estado
  const statusCode = err.statusCode || 500;
  
  res.status(statusCode).json(response);
};
```

**2. Errores Personalizados**

```javascript
// src/utils/errors.js
export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
  }
}

export class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

export class UnauthorizedError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnauthorizedError';
    this.statusCode = 401;
  }
}

export class DatabaseError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DatabaseError';
    this.statusCode = 500;
  }
}
```

**3. Try-Catch en Controladores**

```javascript
// src/controllers/webhookController.js
export const handleWebhook = async (req, res, next) => {
  try {
    const { body } = req;
    
    // Validar entrada
    if (!body.object || body.object !== 'page') {
      throw new ValidationError('Invalid webhook object');
    }
    
    // Procesar eventos
    await processEvents(body);
    
    res.status(200).json({ status: 'EVENT_RECEIVED' });
  } catch (error) {
    // Pasar al middleware de errores
    next(error);
  }
};
```

**4. Validación de Entrada**

```javascript
// src/utils/validators.js
export const validateOrderData = (data) => {
  const errors = [];
  
  if (!data.user_id) {
    errors.push('user_id is required');
  }
  
  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    errors.push('items array is required and must not be empty');
  }
  
  if (!data.delivery_address) {
    errors.push('delivery_address is required');
  }
  
  if (errors.length > 0) {
    throw new ValidationError(errors.join(', '));
  }
  
  return true;
};
```

**5. Manejo de Errores de Base de Datos**

```javascript
// src/repositories/productRepository.js
export const findById = async (id) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM products WHERE id = ?',
      [id]
    );
    
    if (rows.length === 0) {
      throw new NotFoundError(`Product with id ${id} not found`);
    }
    
    return rows[0];
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    
    logger.error('Database error in findById:', error);
    throw new DatabaseError('Error fetching product from database');
  }
};
```

**6. Manejo de Errores de API Externa (OpenAI, Meta)**

```javascript
// src/services/intentService.js
export const identifyIntent = async (message) => {
  try {
    const response = await openai.chat.completions.create({...});
    return response;
  } catch (error) {
    if (error.response?.status === 429) {
      // Rate limit exceeded
      logger.warn('OpenAI rate limit exceeded, using fallback');
      return fallbackIntent(message);
    }
    
    if (error.response?.status === 401) {
      logger.error('OpenAI authentication failed');
      throw new UnauthorizedError('OpenAI API authentication failed');
    }
    
    // Otros errores
    logger.error('OpenAI API error:', error);
    throw new Error('Failed to process message with AI');
  }
};
```

**7. Timeout en Requests**

```javascript
// src/config/axios.js
import axios from 'axios';

export const messengerAPI = axios.create({
  baseURL: 'https://graph.facebook.com/v18.0',
  timeout: 10000, // 10 segundos
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para manejar errores
messengerAPI.interceptors.response.use(
  response => response,
  error => {
    if (error.code === 'ECONNABORTED') {
      logger.error('Request timeout to Messenger API');
      throw new Error('Request timeout');
    }
    throw error;
  }
);
```

**8. Respuestas de Error Estandarizadas**

```javascript
// Formato estándar de respuesta de error
{
  "success": false,
  "error": "Mensaje descriptivo del error",
  "code": "ERROR_CODE", // opcional
  "details": {...}, // opcional, solo en desarrollo
  "timestamp": "2025-11-03T10:30:00Z"
}
```

**9. Códigos de Estado HTTP**

- `200 OK` - Operación exitosa
- `201 Created` - Recurso creado exitosamente
- `400 Bad Request` - Datos de entrada inválidos
- `401 Unauthorized` - Autenticación fallida
- `403 Forbidden` - Sin permisos para la operación
- `404 Not Found` - Recurso no encontrado
- `429 Too Many Requests` - Rate limit excedido
- `500 Internal Server Error` - Error del servidor
- `503 Service Unavailable` - Servicio temporalmente no disponible

**10. Logging de Errores**

```javascript
// src/config/logger.js
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // Errores a archivo separado
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    // Todos los logs
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    }),
    // Console en desarrollo
    ...(process.env.NODE_ENV !== 'production' ? [
      new winston.transports.Console({
        format: winston.format.simple()
      })
    ] : [])
  ]
});

export default logger;
```

---

### 3.4 Seguridad en API

#### Verificación de Firma de Meta

```javascript
// src/middlewares/verifySignature.js
import crypto from 'crypto';

export const verifySignature = (req, res, next) => {
  const signature = req.headers['x-hub-signature-256'];
  
  if (!signature) {
    return res.status(401).json({ error: 'Missing signature' });
  }
  
  const elements = signature.split('=');
  const signatureHash = elements[1];
  
  const expectedHash = crypto
    .createHmac('sha256', process.env.META_APP_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');
  
  if (signatureHash !== expectedHash) {
    return res.status(403).json({ error: 'Invalid signature' });
  }
  
  next();
};
```

#### Rate Limiting

```javascript
// src/middlewares/rateLimiter.js
import rateLimit from 'express-rate-limit';

export const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 100, // límite de 100 requests por minuto
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});
```

#### Headers de Seguridad

```javascript
// src/index.js
import helmet from 'helmet';

app.use(helmet()); // Agrega headers de seguridad
```

---

### 3.5 Documentación de Respuestas del Bot

#### Formato de Mensajes Enviados

**1. Mensaje de Texto Simple:**
```json
{
  "recipient": {
    "id": "USER_PSID"
  },
  "message": {
    "text": "Hola, ¿en qué puedo ayudarte hoy?"
  }
}
```

**2. Mensaje con Quick Replies:**
```json
{
  "recipient": {
    "id": "USER_PSID"
  },
  "message": {
    "text": "¿Deseas confirmar tu pedido?",
    "quick_replies": [
      {
        "content_type": "text",
        "title": "Sí, confirmar",
        "payload": "CONFIRM_YES"
      },
      {
        "content_type": "text",
        "title": "No, cancelar",
        "payload": "CONFIRM_NO"
      }
    ]
  }
}
```

**3. Mensaje con Botones:**
```json
{
  "recipient": {
    "id": "USER_PSID"
  },
  "message": {
    "attachment": {
      "type": "template",
      "payload": {
        "template_type": "button",
        "text": "¿Qué te gustaría hacer?",
        "buttons": [
          {
            "type": "postback",
            "title": "Ver Productos",
            "payload": "VIEW_PRODUCTS"
          },
          {
            "type": "postback",
            "title": "Hacer Pedido",
            "payload": "PLACE_ORDER"
          }
        ]
      }
    }
  }
}
```

**4. Mensaje con Imagen:**
```json
{
  "recipient": {
    "id": "USER_PSID"
  },
  "message": {
    "attachment": {
      "type": "image",
      "payload": {
        "url": "https://ejemplo.com/producto.jpg",
        "is_reusable": true
      }
    }
  }
}
```

**5. Lista de Productos (Generic Template):**
```json
{
  "recipient": {
    "id": "USER_PSID"
  },
  "message": {
    "attachment": {
      "type": "template",
      "payload": {
        "template_type": "generic",
        "elements": [
          {
            "title": "Cemento Portland Tipo I",
            "subtitle": "S/ 28.50 - Bolsa 42.5 kg",
            "image_url": "https://...",
            "buttons": [
              {
                "type": "postback",
                "title": "Agregar al pedido",
                "payload": "ADD_PRODUCT_1"
              }
            ]
          }
        ]
      }
    }
  }
}
```
