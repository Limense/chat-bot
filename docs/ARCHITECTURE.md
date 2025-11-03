# Arquitectura del Sistema - ChatBot Ferretería

## 1. Diseño de Arquitectura (25%)

### 1.1 Diagrama de Componentes

El sistema sigue una arquitectura en capas (Clean Architecture) con los siguientes componentes principales:

#### Capa de Presentación (API Layer)
- **Express.js Server**: Servidor HTTP que expone endpoints REST
- **Webhook Routes**: Rutas específicas para recibir eventos de Meta
- **Middlewares**: Validación, autenticación, rate limiting, error handling

#### Capa de Aplicación (Business Logic Layer)
- **Controllers**: Manejan las peticiones HTTP y delegan a servicios
  - `WebhookController`: Procesa eventos de Meta
  - `MessageController`: Gestiona el flujo de mensajes
  
- **Services**: Contienen la lógica de negocio
  - `BotService`: Orquesta el flujo completo del bot
  - `IntentService`: Identifica intenciones usando OpenAI
  - `MessengerService`: Comunica con Meta API
  - `EmbeddingService`: Gestiona embeddings y búsqueda semántica
  - `StateManager`: Gestiona estados de conversación

#### Capa de Datos (Data Layer)
- **Repositories**: Abstracción de acceso a datos
  - `ProductRepository`: CRUD de productos
  - `OrderRepository`: CRUD de pedidos
  - `UserRepository`: CRUD de usuarios
  - `ConversationRepository`: CRUD de conversaciones

#### Capa de Infraestructura
- **MySQL Database**: Base de datos relacional
- **Vector Database (HNSWLib)**: Búsqueda semántica
- **OpenAI API**: Procesamiento de lenguaje natural
- **Meta Messenger API**: Comunicación con usuarios

### 1.2 Flujo de Comunicación Detallado

```
Usuario en Messenger
        │
        │ 1. Envía mensaje
        ▼
┌─────────────────────────┐
│   Meta Platform API     │
│   - Recibe mensaje      │
│   - Genera evento       │
└───────────┬─────────────┘
            │
            │ 2. POST /webhook
            │    - message event
            │    - signature header
            ▼
┌─────────────────────────┐
│  Express.js Middleware  │
│  - verifySignature      │ 3. Valida firma
│  - rateLimiter          │ 4. Verifica límites
│  - bodyParser           │ 5. Parsea JSON
└───────────┬─────────────┘
            │
            │ 6. Request validado
            ▼
┌─────────────────────────┐
│  WebhookController      │
│  - handleWebhook()      │ 7. Extrae datos del evento
└───────────┬─────────────┘
            │
            │ 8. { senderId, message, timestamp }
            ▼
┌─────────────────────────┐
│  BotService             │
│  - processMessage()     │
└───────────┬─────────────┘
            │
            │ 9. Consulta estado
            ▼
┌─────────────────────────┐
│  StateManager           │
│  - getState(senderId)   │ ◄─── MySQL (conversations)
└───────────┬─────────────┘
            │
            │ 10. Estado actual
            ▼
┌─────────────────────────┐
│  IntentService          │
│  - identifyIntent()     │ 11. Envía mensaje + contexto
└───────────┬─────────────┘           │
            │                         ▼
            │              ┌────────────────────┐
            │ 12. Intent   │   OpenAI API       │
            │     detected │   - GPT-4 Turbo    │
            │ ◄────────────┤   - Análisis NLP   │
            ▼              └────────────────────┘
┌─────────────────────────┐
│  BotService             │
│  - Enruta según intent  │
└───────────┬─────────────┘
            │
            ├─────────────┐
            │             │
            ▼             ▼
    [FAQ Intent]    [Product Intent]
            │             │
            │ 13. Busca   │ 14. Consulta DB
            ▼             ▼
┌─────────────────┐  ┌──────────────────┐
│ EmbeddingService│  │ ProductRepository│
│ - searchSimilar │  │ - findByName()   │
└────────┬────────┘  └────────┬─────────┘
         │                    │
         │ Vector DB          │ MySQL
         │ (embeddings)       │ (products)
         │                    │
         │ 15. Respuesta      │ 16. Productos
         ▼                    ▼
┌──────────────────────────────┐
│  BotService                  │
│  - Formatea respuesta        │
│  - Actualiza estado          │
└───────────┬──────────────────┘
            │
            │ 17. Guarda interacción
            ▼
┌──────────────────────────────┐
│  ConversationRepository      │
│  - saveMessage()             │ ──► MySQL
└───────────┬──────────────────┘
            │
            │ 18. Mensaje formateado
            ▼
┌──────────────────────────────┐
│  MessengerService            │
│  - sendMessage()             │
└───────────┬──────────────────┘
            │
            │ 19. POST a Send API
            ▼
┌──────────────────────────────┐
│  Meta Messenger API          │
│  - Entrega mensaje           │
└───────────┬──────────────────┘
            │
            │ 20. Usuario recibe
            ▼
      Usuario en Messenger
```

### 1.3 Estructura de Carpetas y Archivos

**Organización por responsabilidad (Domain-Driven Design + Clean Architecture)**

```
src/
├── index.js                    # Bootstrap de aplicación
│   - Inicializa servidor
│   - Configura middlewares
│   - Conecta a bases de datos
│
├── config/                     # Configuraciones centralizadas
│   ├── database.js             # Pool de conexiones MySQL
│   ├── openai.js               # Cliente OpenAI configurado
│   └── logger.js               # Winston logger setup
│
├── routes/                     # Definición de rutas HTTP
│   └── webhook.js              # Rutas de webhook Meta
│
├── middlewares/                # Middlewares de Express
│   ├── verifySignature.js      # Validación de firma Meta
│   ├── errorHandler.js         # Manejo global de errores
│   └── rateLimiter.js          # Protección contra spam
│
├── controllers/                # Controladores (capa de presentación)
│   ├── webhookController.js    # Maneja eventos de webhook
│   └── messageController.js    # Procesa mensajes entrantes
│
├── services/                   # Lógica de negocio (capa de aplicación)
│   ├── botService.js           # Orquestador principal del bot
│   ├── intentService.js        # Clasificación de intenciones
│   ├── messengerService.js     # Comunicación con Meta API
│   ├── embeddingService.js     # Embeddings y búsqueda vectorial
│   └── stateManager.js         # Gestión de estados de conversación
│
├── repositories/               # Acceso a datos (capa de persistencia)
│   ├── productRepository.js    # CRUD productos
│   ├── orderRepository.js      # CRUD pedidos
│   ├── userRepository.js       # CRUD usuarios
│   └── conversationRepository.js # CRUD conversaciones
│
├── models/                     # Modelos de dominio
│   ├── Product.js              # Entidad Producto
│   ├── Order.js                # Entidad Pedido
│   ├── User.js                 # Entidad Usuario
│   └── Conversation.js         # Entidad Conversación
│
├── database/                   # Scripts de base de datos
│   ├── setup.js                # Creación de tablas
│   └── seed.js                 # Datos iniciales
│
└── utils/                      # Utilidades compartidas
    ├── validators.js           # Validadores de datos
    └── helpers.js              # Funciones auxiliares
```

**Justificación de decisiones:**

1. **Separación por capas**: Facilita testing y mantenimiento
2. **config/**: Configuraciones centralizadas evitan duplicación
3. **services/**: Lógica de negocio reutilizable y testeable
4. **repositories/**: Abstracción de persistencia, fácil cambiar DB
5. **models/**: Entidades de dominio, independientes de infraestructura
6. **middlewares/**: Concerns transversales (seguridad, logging)

### 1.4 Consideraciones de Escalabilidad

#### Escalabilidad Horizontal

**Implementado:**
- **Stateless API**: Estado en DB, no en memoria del servidor
- **Connection pooling**: MySQL optimizado para múltiples instancias
- **Load balancer ready**: Múltiples instancias pueden correr en paralelo

**Mejoras futuras:**
- **Redis para sesiones**: Compartir estado entre instancias
- **Message queue**: Bull/RabbitMQ para procesamiento asíncrono
- **Microservicios**: Separar intent service, messenger service

#### Escalabilidad Vertical

- **Índices en DB**: Queries optimizadas
- **Caché de consultas frecuentes**: En memoria con TTL
- **Lazy loading**: Cargar solo lo necesario
- **Batch processing**: Procesar múltiples mensajes si es necesario

#### Límites y Throttling

- **Rate limiting**: 100 requests/minuto por IP
- **Message queue**: Evitar sobrecarga de OpenAI API
- **Timeout en requests**: 30 segundos máximo
- **Circuit breaker**: Para servicios externos

### 1.5 Consideraciones de Seguridad

#### Autenticación y Autorización

1. **Verificación de firma Meta**: Validar que webhooks vienen de Meta
   ```javascript
   crypto.createHmac('sha256', APP_SECRET)
         .update(payload)
         .digest('hex') === signature
   ```

2. **Verify Token**: Token secreto para verificación de webhook

3. **Environment variables**: Credenciales fuera del código

#### Protección de Datos

1. **Helmet.js**: Headers de seguridad HTTP
   - X-Frame-Options
   - X-Content-Type-Options
   - Strict-Transport-Security

2. **Input validation**: Sanitización de entrada de usuario
   - Escapar caracteres especiales
   - Validar tipos de datos
   - Límite de longitud de mensajes

3. **SQL Injection prevention**: Prepared statements en MySQL

4. **Rate limiting**: Prevenir ataques de fuerza bruta

#### Seguridad de Datos Personales

1. **Encriptación en tránsito**: HTTPS obligatorio
2. **Logs sin datos sensibles**: No loguear tokens ni contraseñas
3. **Retención de datos**: Política de borrado después de X días
4. **GDPR compliance**: Usuario puede solicitar borrado de datos

#### Manejo de Errores Seguro

- No exponer stack traces en producción
- Mensajes de error genéricos al usuario
- Logging detallado solo en servidor

## Patrones de Diseño Utilizados

1. **Repository Pattern**: Abstracción de acceso a datos
2. **Service Layer Pattern**: Lógica de negocio centralizada
3. **Dependency Injection**: Inyección de dependencias en constructores
4. **Factory Pattern**: Creación de respuestas según tipo
5. **Strategy Pattern**: Diferentes estrategias según intención
6. **Singleton**: Conexión a DB, logger
7. **Observer Pattern**: Eventos de webhook
