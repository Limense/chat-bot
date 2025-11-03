# ChatBot Inteligente para Ferretería - Meta Messenger

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18-blue.svg)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-orange.svg)](https://www.mysql.com/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4-purple.svg)](https://openai.com/)

## Descripción General

**Sistema de chatbot conversacional inteligente** para atención al cliente en ferretería, integrado con **Meta Messenger**, **OpenAI** y bases de datos relacionales y vectoriales.

Desarrollado como parte del **Examen Técnico - Nov 2025** para demostrar habilidades en:
- Desarrollo de APIs con Node.js y Express.js
- Integración con Meta Messenger Platform
- Procesamiento de lenguaje natural con OpenAI
- Diseño de bases de datos (MySQL + Vector DB)
- Arquitectura limpia y buenas prácticas

## Arquitectura del Sistema

### Diagrama de Componentes

```
┌─────────────────┐
│   Usuario en    │
│   Messenger     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│        Meta Platform (Facebook)          │
│  - Messenger API                         │
│  - Webhook Events                        │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│         Express.js Backend               │
│  ┌─────────────────────────────────┐   │
│  │   Controllers                    │   │
│  │   - WebhookController            │   │
│  │   - MessageController            │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │   Services                       │   │
│  │   - BotService                   │   │
│  │   - IntentService (OpenAI)       │   │
│  │   - MessengerService             │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │   Repositories                   │   │
│  │   - ProductRepository            │   │
│  │   - OrderRepository              │   │
│  │   - UserRepository               │   │
│  │   - ConversationRepository       │   │
│  └─────────────────────────────────┘   │
└────┬─────────────────────┬──────────────┘
     │                     │
     ▼                     ▼
┌──────────────┐    ┌──────────────────┐
│   MySQL DB   │    │  Vector DB       │
│              │    │  (HNSWLib)       │
│  - users     │    │                  │
│  - products  │    │  - FAQs          │
│  - orders    │    │  - Product Info  │
│  - order_    │    │  - Embeddings    │
│    items     │    │                  │
│  - conver-   │    │                  │
│    sations   │    │                  │
└──────────────┘    └──────────────────┘
         │
         ▼
    ┌──────────────┐
    │  OpenAI API  │
    │              │
    │  - GPT-4     │
    │  - Embeddings│
    └──────────────┘
```

### Flujo de Comunicación

1. **Usuario envía mensaje** → Messenger
2. **Meta envía webhook** → Express Backend (`/webhook` endpoint)
3. **Webhook Controller** valida y procesa evento
4. **Bot Service** analiza mensaje:
   - Consulta estado de conversación (MySQL)
   - Envía mensaje a OpenAI para identificar intención
   - Busca información relevante en Vector DB (embeddings)
5. **Procesamiento según intención**:
   - **FAQ**: Recupera respuesta de Vector DB
   - **Consulta de producto**: Query a MySQL + detalles
   - **Cotización**: Calcula precios, genera cotización
   - **Pedido**: Valida datos, guarda en MySQL
6. **Messenger Service** envía respuesta al usuario
7. **Conversation Repository** registra interacción en MySQL

## Estructura del Proyecto

```
ferreteria-chatbot/
├── src/
│   ├── index.js                      # Punto de entrada principal
│   ├── config/
│   │   ├── database.js               # Configuración MySQL
│   │   ├── openai.js                 # Configuración OpenAI
│   │   └── logger.js                 # Configuración Winston
│   ├── controllers/
│   │   ├── webhookController.js      # Manejo de webhooks Meta
│   │   └── messageController.js      # Procesamiento de mensajes
│   ├── services/
│   │   ├── botService.js             # Lógica principal del bot
│   │   ├── intentService.js          # Identificación de intenciones (OpenAI)
│   │   ├── messengerService.js       # Envío de mensajes a Meta
│   │   ├── embeddingService.js       # Generación y búsqueda de embeddings
│   │   └── stateManager.js           # Gestión de estados de conversación
│   ├── repositories/
│   │   ├── productRepository.js      # CRUD productos
│   │   ├── orderRepository.js        # CRUD pedidos
│   │   ├── userRepository.js         # CRUD usuarios
│   │   └── conversationRepository.js # CRUD conversaciones
│   ├── models/
│   │   ├── Product.js                # Modelo de producto
│   │   ├── Order.js                  # Modelo de pedido
│   │   ├── User.js                   # Modelo de usuario
│   │   └── Conversation.js           # Modelo de conversación
│   ├── database/
│   │   ├── setup.js                  # Script de creación de tablas
│   │   ├── seed.js                   # Script de datos iniciales
│   │   └── migrations/               # Migraciones
│   ├── routes/
│   │   └── webhook.js                # Rutas de webhook
│   ├── middlewares/
│   │   ├── verifySignature.js        # Verificación de firma Meta
│   │   ├── errorHandler.js           # Manejo global de errores
│   │   └── rateLimiter.js            # Límite de solicitudes
│   └── utils/
│       ├── validators.js             # Validadores de datos
│       └── helpers.js                # Funciones auxiliares
├── data/
│   └── vectordb/                     # Base de datos vectorial
├── logs/                             # Archivos de log
├── docs/
│   ├── ARCHITECTURE.md               # Documentación de arquitectura
│   ├── DATABASE.md                   # Diseño de base de datos
│   └── API.md                        # Documentación de API
├── .env.example                      # Variables de entorno ejemplo
├── .gitignore
├── package.json
└── README.md
```

### Justificación de la Estructura

- **Separación por capas**: Controllers → Services → Repositories (Clean Architecture)
- **Modularidad**: Cada componente tiene una responsabilidad única
- **Escalabilidad**: Fácil agregar nuevos servicios o intenciones
- **Mantenibilidad**: Código organizado y fácil de ubicar
- **Testabilidad**: Componentes desacoplados permiten testing unitario

## 🗄️ Base de Datos

### MySQL - Schema Relacional

Ver documentación completa en [docs/DATABASE.md](docs/DATABASE.md)

**Tablas principales:**
- `users`: Información de usuarios
- `products`: Catálogo de productos
- `orders`: Pedidos realizados
- `order_items`: Ítems de cada pedido
- `conversations`: Historial de conversaciones

### Vector Database (HNSWLib)

**Contenido almacenado:**
- FAQs con embeddings para búsqueda semántica
- Descripciones de productos con embeddings
- Información de servicios y horarios

**Justificación:** Permite recuperación de información basada en similitud semántica, mejorando la capacidad del bot para responder preguntas en lenguaje natural.

## API Endpoints

Ver documentación completa en [docs/API.md](docs/API.md)

### Principales Endpoints

- `GET /webhook` - Verificación de webhook Meta
- `POST /webhook` - Recepción de eventos de Messenger
- `POST /api/messages` - Envío manual de mensajes (testing)

## Lógica del Bot

### Intenciones Soportadas

1. **greeting** - Saludo inicial
2. **faq_product** - Preguntas sobre productos
3. **faq_service** - Preguntas sobre servicios
4. **faq_schedule** - Preguntas sobre horarios
5. **product_inquiry** - Consulta de productos disponibles
6. **request_quote** - Solicitud de cotización
7. **place_order** - Realizar pedido
8. **confirm_order** - Confirmar pedido

### Gestión de Estado

El sistema mantiene el contexto de conversación usando:
- **Session storage** en memoria para acceso rápido
- **MySQL** para persistencia del estado
- **Timeout**: 30 minutos de inactividad

Estados posibles:
- `initial` - Inicio de conversación
- `awaiting_products` - Esperando lista de productos
- `awaiting_confirmation` - Esperando confirmación
- `collecting_user_data` - Recolectando datos del usuario
- `order_confirmed` - Pedido confirmado

## 🔧 Instalación y Configuración

### Requisitos Previos

- Node.js >= 18.x
- MySQL >= 8.0
- Cuenta de Meta Developer
- API Key de OpenAI

### Instalación

```bash
# Clonar el repositorio
git clone <repository-url>
cd ferreteria-chatbot

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# Crear base de datos
npm run setup-db

# Cargar datos iniciales
npm run seed-data

# Iniciar servidor
npm run dev
```

### Configuración de Meta Messenger

1. Crear app en [Meta for Developers](https://developers.facebook.com/)
2. Configurar Messenger Product
3. Generar Page Access Token
4. Configurar webhook URL: `https://tu-dominio.com/webhook`
5. Suscribirse a eventos: `messages`, `messaging_postbacks`

### Configuración de OpenAI

1. Obtener API Key de [OpenAI](https://platform.openai.com/)
2. Agregar a `.env`: `OPENAI_API_KEY=tu_key`

## Seguridad

- **Verificación de firma** de webhooks Meta
- **Helmet.js** para headers de seguridad
- **Rate limiting** para prevenir abuso
- **Variables de entorno** para credenciales
- **Validación de entrada** en todos los endpoints
- **Sanitización** de datos de usuario

## Escalabilidad

### Consideraciones Implementadas

1. **Arquitectura modular**: Fácil horizontal scaling
2. **Caché en memoria**: Reducir consultas a DB
3. **Connection pooling**: MySQL optimizado
4. **Índices en DB**: Queries optimizadas
5. **Rate limiting**: Protección contra sobrecarga

### Mejoras Futuras

- Redis para session storage distribuido
- Queue system (Bull/RabbitMQ) para procesamiento asíncrono
- Microservicios separados por dominio
- CDN para multimedia
- Kubernetes para orquestación

## Testing

```bash
# Tests unitarios
npm test

# Tests de integración
npm run test:integration

# Coverage
npm run test:coverage
```

## Monitoreo y Logs

- **Winston** para logging estructurado
- Logs en archivo rotativo
- Niveles: error, warn, info, debug
- Tracking de errores y métricas

## Buenas Prácticas Aplicadas

1. **Clean Architecture**: Separación de capas
2. **SOLID Principles**: Código mantenible
3. **DRY**: No repetir lógica
4. **Async/Await**: Manejo moderno de asincronía
5. **Error handling**: Try-catch y middleware global
6. **Code comments**: Documentación en código
7. **ESM modules**: Import/export modernos
8. **Environment variables**: Configuración externa
