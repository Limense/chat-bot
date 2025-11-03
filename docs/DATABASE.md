# Diseño de Base de Datos - ChatBot Ferretería

## 2. Diseño de Base de Datos (25%)

### 2.1 Esquema de Base de Datos MySQL

#### Tabla: `users`

Almacena información de los usuarios que interactúan con el bot.

```sql
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    messenger_id VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_messenger_id (messenger_id)
);
```

**Campos:**
- `id`: Identificador único interno
- `messenger_id`: ID único de Meta Messenger (PSID)
- `first_name`: Nombre del usuario
- `last_name`: Apellido del usuario
- `phone`: Número de teléfono para contacto
- `address`: Dirección de entrega
- `created_at`: Fecha de primer contacto
- `updated_at`: Última actualización

#### Tabla: `products`

Catálogo de productos de la ferretería.

```sql
CREATE TABLE products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    price DECIMAL(10, 2) NOT NULL,
    stock INT DEFAULT 0,
    unit VARCHAR(50),
    image_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_category (category),
    INDEX idx_active (is_active)
);
```

**Campos:**
- `id`: Identificador único del producto
- `name`: Nombre del producto
- `description`: Descripción detallada
- `category`: Categoría (cemento, herramientas, pinturas, etc.)
- `price`: Precio en soles (S/)
- `stock`: Cantidad disponible
- `unit`: Unidad de medida (bolsa, metro, caja, etc.)
- `image_url`: URL de imagen del producto
- `is_active`: Si el producto está disponible para venta
- `created_at`: Fecha de creación
- `updated_at`: Última actualización

#### Tabla: `orders`

Pedidos realizados por los usuarios.

```sql
CREATE TABLE orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    status ENUM('pending', 'confirmed', 'processing', 'delivered', 'cancelled') DEFAULT 'pending',
    total_amount DECIMAL(10, 2) NOT NULL,
    delivery_address TEXT,
    delivery_phone VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_order_number (order_number),
    INDEX idx_created_at (created_at)
);
```

**Campos:**
- `id`: Identificador único del pedido
- `user_id`: Referencia al usuario que realizó el pedido
- `order_number`: Número de pedido único (ej: ORD-20251103-001)
- `status`: Estado del pedido
- `total_amount`: Monto total del pedido
- `delivery_address`: Dirección de entrega
- `delivery_phone`: Teléfono de contacto
- `notes`: Notas adicionales del cliente
- `created_at`: Fecha de creación del pedido
- `updated_at`: Última actualización

#### Tabla: `order_items`

Ítems individuales de cada pedido.

```sql
CREATE TABLE order_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    product_name VARCHAR(200) NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    INDEX idx_order_id (order_id),
    INDEX idx_product_id (product_id)
);
```

**Campos:**
- `id`: Identificador único del ítem
- `order_id`: Referencia al pedido
- `product_id`: Referencia al producto
- `product_name`: Nombre del producto (snapshot en caso de cambios)
- `quantity`: Cantidad solicitada
- `unit_price`: Precio unitario al momento del pedido
- `subtotal`: quantity * unit_price
- `created_at`: Fecha de creación

#### Tabla: `conversations`

Historial de conversaciones para contexto y análisis.

```sql
CREATE TABLE conversations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    message_type ENUM('user', 'bot') NOT NULL,
    message_text TEXT NOT NULL,
    intent VARCHAR(100),
    confidence DECIMAL(3, 2),
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    INDEX idx_intent (intent)
);
```

**Campos:**
- `id`: Identificador único del mensaje
- `user_id`: Referencia al usuario
- `message_type`: Si es mensaje del usuario o del bot
- `message_text`: Contenido del mensaje
- `intent`: Intención identificada (solo para mensajes de usuario)
- `confidence`: Nivel de confianza de la intención (0.00 a 1.00)
- `metadata`: Datos adicionales en JSON (attachments, quick_replies, etc.)
- `created_at`: Timestamp del mensaje

#### Tabla: `conversation_states`

Estado actual de la conversación de cada usuario.

```sql
CREATE TABLE conversation_states (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT UNIQUE NOT NULL,
    current_state VARCHAR(50) NOT NULL,
    context JSON,
    last_interaction TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_last_interaction (last_interaction)
);
```

**Campos:**
- `id`: Identificador único
- `user_id`: Referencia al usuario
- `current_state`: Estado actual (initial, awaiting_products, etc.)
- `context`: Contexto de la conversación en JSON (productos seleccionados, etc.)
- `last_interaction`: Última interacción (para timeout)
- `created_at`: Fecha de creación

### 2.2 Relaciones entre Tablas

```
users (1) ──────── (N) orders
  │                     │
  │                     │
  │                     └── (1) ──────── (N) order_items ──── (N) ─┐
  │                                                                  │
  │                                                                  │
  ├── (1) ──────── (N) conversations                                │
  │                                                                  │
  └── (1) ──────── (1) conversation_states                          │
                                                                     │
                                                                     │
products (1) ─────────────────────────────────────────────────── (N)┘
```

**Relaciones:**

1. **users → orders** (1:N)
   - Un usuario puede tener múltiples pedidos
   - ON DELETE CASCADE: Si se elimina un usuario, se eliminan sus pedidos

2. **orders → order_items** (1:N)
   - Un pedido contiene múltiples ítems
   - ON DELETE CASCADE: Si se elimina un pedido, se eliminan sus ítems

3. **products → order_items** (1:N)
   - Un producto puede estar en múltiples pedidos
   - ON DELETE RESTRICT: No se puede eliminar un producto referenciado

4. **users → conversations** (1:N)
   - Un usuario tiene múltiples mensajes en el historial
   - ON DELETE CASCADE: Si se elimina un usuario, se elimina su historial

5. **users → conversation_states** (1:1)
   - Cada usuario tiene un único estado actual
   - ON DELETE CASCADE: Si se elimina un usuario, se elimina su estado

### 2.3 Consultas SQL - Ejemplos CRUD

#### CREATE - Crear nuevo pedido

```sql
-- Crear usuario si no existe
INSERT INTO users (messenger_id, first_name, phone, address)
VALUES ('1234567890', 'Juan Pérez', '987654321', 'Av. Principal 123')
ON DUPLICATE KEY UPDATE 
    first_name = VALUES(first_name),
    phone = VALUES(phone),
    address = VALUES(address);

-- Crear pedido
INSERT INTO orders (user_id, order_number, total_amount, delivery_address, delivery_phone, notes)
VALUES (1, 'ORD-20251103-001', 150.50, 'Av. Principal 123', '987654321', 'Entrega urgente');

-- Crear ítems del pedido
INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal)
VALUES 
    (1, 1, 'Cemento Portland Tipo I', 3, 28.50, 85.50),
    (2, 4, 'Pintura Látex Blanca 1 galón', 2, 45.00, 90.00);

-- Registrar conversación
INSERT INTO conversations (user_id, message_type, message_text, intent, confidence)
VALUES (1, 'user', 'Quiero hacer un pedido', 'place_order', 0.95);
```

#### READ - Leer datos

```sql
-- Obtener productos disponibles por categoría
SELECT id, name, description, price, stock, unit
FROM products
WHERE category = 'Herramientas' AND is_active = TRUE AND stock > 0
ORDER BY name;

-- Obtener historial de conversación de un usuario
SELECT message_type, message_text, intent, created_at
FROM conversations
WHERE user_id = 1
ORDER BY created_at DESC
LIMIT 10;

-- Obtener detalles de un pedido
SELECT 
    o.order_number,
    o.status,
    o.total_amount,
    o.created_at,
    u.first_name,
    u.last_name,
    u.phone,
    o.delivery_address
FROM orders o
INNER JOIN users u ON o.user_id = u.id
WHERE o.id = 1;

-- Obtener ítems de un pedido con información de producto
SELECT 
    oi.quantity,
    oi.product_name,
    oi.unit_price,
    oi.subtotal,
    p.image_url
FROM order_items oi
INNER JOIN products p ON oi.product_id = p.id
WHERE oi.order_id = 1;

-- Buscar productos por nombre (búsqueda parcial)
SELECT id, name, description, price, stock
FROM products
WHERE name LIKE '%cemento%' AND is_active = TRUE
LIMIT 5;
```

#### UPDATE - Actualizar datos

```sql
-- Actualizar estado de pedido
UPDATE orders
SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP
WHERE id = 1;

-- Actualizar stock de producto después de pedido
UPDATE products
SET stock = stock - 3
WHERE id = 1 AND stock >= 3;

-- Actualizar información de usuario
UPDATE users
SET phone = '987654321', address = 'Nueva dirección 456'
WHERE id = 1;

-- Actualizar estado de conversación
UPDATE conversation_states
SET current_state = 'awaiting_confirmation',
    context = JSON_SET(context, '$.selected_products', '[1, 4]'),
    last_interaction = CURRENT_TIMESTAMP
WHERE user_id = 1;
```

#### DELETE - Eliminar datos

```sql
-- Eliminar pedido (también elimina order_items por CASCADE)
DELETE FROM orders WHERE id = 1;

-- Limpiar conversaciones antiguas (más de 30 días)
DELETE FROM conversations
WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);

-- Desactivar producto en lugar de eliminarlo
UPDATE products SET is_active = FALSE WHERE id = 1;

-- Eliminar sesiones inactivas (más de 30 minutos)
DELETE FROM conversation_states
WHERE last_interaction < DATE_SUB(NOW(), INTERVAL 30 MINUTE);
```

### 2.4 Base de Datos Vectorial

#### Tecnología: HNSWLib (Hierarchical Navigable Small World)

**¿Qué se almacena?**

1. **FAQs (Preguntas Frecuentes)**
   - Texto: Pregunta + respuesta
   - Embedding: Vector de 1536 dimensiones (OpenAI text-embedding-3-small)
   - Metadata: categoría, keywords, id

2. **Descripciones de Productos**
   - Texto: Nombre + descripción + características
   - Embedding: Vector de 1536 dimensiones
   - Metadata: product_id, category, price

3. **Información de Servicios**
   - Texto: Descripción de servicios (entrega, pagos, garantías)
   - Embedding: Vector de 1536 dimensiones
   - Metadata: service_type, availability

4. **Horarios y Políticas**
   - Texto: Información sobre horarios, días de atención
   - Embedding: Vector de 1536 dimensiones
   - Metadata: info_type

**Justificación:**

1. **Búsqueda Semántica**: Permite encontrar respuestas relevantes aunque el usuario use palabras diferentes
   - Usuario: "¿A qué hora cierran?" → Encuentra: "Horario de atención hasta las 6:00 p.m."
   
2. **Mejor que búsqueda por palabras clave**: Entiende contexto y sinónimos
   - "herramienta para atornillar" → Encuentra "destornillador"

3. **Eficiencia**: Búsqueda en O(log n) en lugar de O(n) en texto completo

4. **Escalabilidad**: Puede manejar miles de documentos sin degradación

**Estructura de datos en Vector DB:**

```javascript
{
  id: "faq_001",
  text: "¿Qué es el fierro corrugado y para qué se utiliza?",
  embedding: [0.023, -0.014, 0.087, ...], // 1536 dimensiones
  metadata: {
    category: "faq_product",
    answer: "El fierro corrugado es una varilla de acero...",
    keywords: ["fierro", "corrugado", "construcción", "refuerzo"]
  }
}
```

**Proceso de búsqueda:**

1. Usuario envía pregunta: "¿Para qué sirve el fierro?"
2. Se genera embedding de la pregunta
3. Se buscan los k=3 vectores más similares
4. Se retornan las respuestas asociadas
5. Se ordenan por similitud (cosine similarity)

### 2.5 Índices para Optimización

```sql
-- Índices ya incluidos en las definiciones de tablas
-- Adicionales para queries frecuentes:

-- Índice compuesto para búsqueda de productos activos por categoría
CREATE INDEX idx_products_active_category ON products(is_active, category);

-- Índice para búsqueda full-text en productos
CREATE FULLTEXT INDEX idx_products_fulltext ON products(name, description);

-- Índice para análisis de intenciones
CREATE INDEX idx_conversations_user_intent ON conversations(user_id, intent, created_at);

-- Índice para reportes de pedidos por fecha
CREATE INDEX idx_orders_date_status ON orders(created_at, status);
```

### 2.6 Triggers para Integridad

```sql
-- Trigger para calcular total del pedido automáticamente
DELIMITER $$
CREATE TRIGGER calculate_order_total 
AFTER INSERT ON order_items
FOR EACH ROW
BEGIN
    UPDATE orders 
    SET total_amount = (
        SELECT SUM(subtotal) 
        FROM order_items 
        WHERE order_id = NEW.order_id
    )
    WHERE id = NEW.order_id;
END$$
DELIMITER ;

-- Trigger para validar stock antes de crear pedido
DELIMITER $$
CREATE TRIGGER check_stock_before_order
BEFORE INSERT ON order_items
FOR EACH ROW
BEGIN
    DECLARE available_stock INT;
    SELECT stock INTO available_stock FROM products WHERE id = NEW.product_id;
    
    IF available_stock < NEW.quantity THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Stock insuficiente para este producto';
    END IF;
END$$
DELIMITER ;
```

## Diagrama ER (Entity-Relationship)

```
┌─────────────────────┐
│       users         │
├─────────────────────┤
│ PK id               │
│ UK messenger_id     │
│    first_name       │
│    last_name        │
│    phone            │
│    address          │
│    created_at       │
│    updated_at       │
└──────────┬──────────┘
           │
           │ 1:N
           ├────────────────────┐
           │                    │
           │                    │
┌──────────▼──────────┐  ┌──────▼──────────────┐
│  conversations      │  │ conversation_states │
├─────────────────────┤  ├─────────────────────┤
│ PK id               │  │ PK id               │
│ FK user_id          │  │ FK user_id (UNIQUE) │
│    message_type     │  │    current_state    │
│    message_text     │  │    context (JSON)   │
│    intent           │  │    last_interaction │
│    confidence       │  │    created_at       │
│    metadata (JSON)  │  └─────────────────────┘
│    created_at       │
└─────────────────────┘

┌──────────▼──────────┐
│       orders        │
├─────────────────────┤
│ PK id               │
│ FK user_id          │
│ UK order_number     │
│    status           │
│    total_amount     │
│    delivery_address │
│    delivery_phone   │
│    notes            │
│    created_at       │
│    updated_at       │
└──────────┬──────────┘
           │
           │ 1:N
           │
┌──────────▼──────────┐      N:1     ┌─────────────────────┐
│    order_items      │◄─────────────┤      products       │
├─────────────────────┤              ├─────────────────────┤
│ PK id               │              │ PK id               │
│ FK order_id         │              │    name             │
│ FK product_id       │              │    description      │
│    product_name     │              │    category         │
│    quantity         │              │    price            │
│    unit_price       │              │    stock            │
│    subtotal         │              │    unit             │
│    created_at       │              │    image_url        │
└─────────────────────┘              │    is_active        │
                                     │    created_at       │
                                     │    updated_at       │
                                     └─────────────────────┘
```
