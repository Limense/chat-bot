# Guía de Configuración y Despliegue

## 📋 Requisitos Previos

### Software Necesario

1. **Node.js** >= 18.x
   ```bash
   node --version  # Verificar versión
   ```

2. **MySQL** >= 8.0
   ```bash
   mysql --version  # Verificar versión
   ```

3. **npm** o **yarn**
   ```bash
   npm --version
   ```

### Cuentas y API Keys Necesarias

1. **Meta for Developers**
   - Crear app en https://developers.facebook.com/
   - Configurar Messenger Product
   - Obtener Page Access Token
   - Generar App Secret

2. **OpenAI**
   - Cuenta en https://platform.openai.com/
   - Generar API Key
   - Tener créditos disponibles

3. **Base de Datos MySQL**
   - Servidor MySQL local o remoto
   - Credenciales de acceso

---

## 🚀 Instalación Paso a Paso

### 1. Clonar el Repositorio

```bash
git clone <repository-url>
cd chat-bot
```

### 2. Instalar Dependencias

```bash
npm install
```

Esto instalará:
- express
- mysql2
- openai
- hnswlib-node
- axios
- dotenv
- winston
- helmet
- cors
- body-parser
- express-rate-limit

### 3. Configurar Variables de Entorno

```bash
cp .env.example .env
```

Editar `.env` con tus credenciales:

```env
# Server
PORT=3000
NODE_ENV=development

# Meta/Facebook
META_VERIFY_TOKEN=tu_token_secreto_verificacion
META_PAGE_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxx
META_APP_SECRET=xxxxxxxxxxxxxxxx

# OpenAI
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxx

# MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=ferreteria_chatbot

# Vector DB
VECTOR_DB_PATH=./data/vectordb
EMBEDDING_DIMENSION=1536
```

### 4. Crear Base de Datos MySQL

**Opción A: Automática (Recomendado)**

```bash
# Crear todas las tablas
npm run setup-db

# Cargar datos de prueba
npm run seed-data
```

**Opción B: Manual**

```bash
# Conectar a MySQL
mysql -u root -p

# Crear base de datos
CREATE DATABASE ferreteria_chatbot CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Usar la base de datos
USE ferreteria_chatbot;

# Ejecutar script de setup
source src/database/setup.js
```

### 5. Verificar Configuración

```bash
# Iniciar servidor en modo desarrollo
npm run dev
```

Deberías ver:

```
✓ MySQL database connected successfully
✓ OpenAI API connected successfully
✓ Initializing embedding service...
✓ Loaded X documents from vector DB
✓ Server is running on port 3000
✓ ChatBot is ready to receive messages!
```

---

## 🔧 Configuración de Meta Messenger

### 1. Crear App de Facebook

1. Ir a https://developers.facebook.com/
2. Click en "My Apps" → "Create App"
3. Seleccionar "Business" como tipo
4. Completar información básica

### 2. Configurar Messenger

1. En el dashboard de la app, agregar "Messenger" como producto
2. En "Settings" de Messenger:
   - Generar **Page Access Token**
   - Copiar token y agregarlo a `.env`

### 3. Configurar Webhook

**Si trabajas en local, necesitas exponer el servidor:**

```bash
# Opción 1: ngrok (recomendado para desarrollo)
ngrok http 3000

# Copiar la URL HTTPS generada
# Ejemplo: https://abc123.ngrok.io
```

**Configurar webhook en Meta:**

1. En Messenger Settings → Webhooks
2. Click "Add Callback URL"
3. Ingresar:
   - **Callback URL**: `https://tu-dominio.com/webhook` o `https://abc123.ngrok.io/webhook`
   - **Verify Token**: El mismo que pusiste en `META_VERIFY_TOKEN` en `.env`
4. Click "Verify and Save"

**Suscribirse a eventos:**

5. Click "Add Subscriptions"
6. Seleccionar:
   - ☑️ messages
   - ☑️ messaging_postbacks
7. Click "Save"

### 4. Vincular Página de Facebook

1. En "Messenger Settings" → "Access Tokens"
2. Seleccionar tu página de Facebook
3. Generar token y agregarlo a `.env`

### 5. Probar el Bot

1. Ir a tu página de Facebook
2. Enviar mensaje desde Messenger
3. El bot debería responder

---

## 🧪 Testing

### Probar el Health Endpoint

```bash
curl http://localhost:3000/health
```

Respuesta esperada:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-03T...",
  "uptime": 123.45,
  "environment": "development"
}
```

### Probar Verificación de Webhook

```bash
curl "http://localhost:3000/webhook?hub.mode=subscribe&hub.verify_token=tu_token_secreto&hub.challenge=test123"
```

Debería devolver: `test123`

### Probar Base de Datos

```bash
# Conectar a MySQL
mysql -u root -p ferreteria_chatbot

# Ver tablas
SHOW TABLES;

# Ver productos
SELECT * FROM products;

# Ver usuarios
SELECT * FROM users;
```

---

## 🌐 Despliegue en Producción

### Opción 1: VPS (DigitalOcean, AWS EC2, etc.)

**1. Preparar servidor:**

```bash
# Conectar por SSH
ssh user@tu-servidor.com

# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar MySQL
sudo apt-get install mysql-server

# Instalar PM2 (gestor de procesos)
sudo npm install -g pm2
```

**2. Clonar y configurar:**

```bash
git clone <repository-url>
cd chat-bot
npm install --production
cp .env.example .env
nano .env  # Editar con credenciales
```

**3. Iniciar con PM2:**

```bash
pm2 start src/index.js --name "ferreteria-chatbot"
pm2 save
pm2 startup  # Configurar inicio automático
```

**4. Configurar Nginx (opcional):**

```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**5. Configurar SSL con Let's Encrypt:**

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d tu-dominio.com
```

### Opción 2: Heroku

**1. Crear app:**

```bash
heroku create ferreteria-chatbot
```

**2. Agregar addon de MySQL:**

```bash
heroku addons:create cleardb:ignite
```

**3. Configurar variables:**

```bash
heroku config:set META_PAGE_ACCESS_TOKEN=xxx
heroku config:set META_VERIFY_TOKEN=xxx
heroku config:set META_APP_SECRET=xxx
heroku config:set OPENAI_API_KEY=xxx
heroku config:set NODE_ENV=production
```

**4. Desplegar:**

```bash
git push heroku main
```

**5. Ejecutar setup de DB:**

```bash
heroku run npm run setup-db
heroku run npm run seed-data
```

### Opción 3: Docker

**Crear `Dockerfile`:**

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

EXPOSE 3000

CMD ["node", "src/index.js"]
```

**Crear `docker-compose.yml`:**

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    depends_on:
      - mysql

  mysql:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=root_password
      - MYSQL_DATABASE=ferreteria_chatbot
    volumes:
      - mysql_data:/var/lib/mysql

volumes:
  mysql_data:
```

**Ejecutar:**

```bash
docker-compose up -d
```

---

## 📊 Monitoreo y Mantenimiento

### Logs

```bash
# Ver logs en tiempo real
pm2 logs ferreteria-chatbot

# Ver logs guardados
tail -f logs/combined.log
tail -f logs/error.log
```

### Backups de Base de Datos

```bash
# Backup manual
mysqldump -u root -p ferreteria_chatbot > backup_$(date +%Y%m%d).sql

# Backup automático (cron)
crontab -e

# Agregar línea para backup diario a las 2 AM
0 2 * * * mysqldump -u root -p ferreteria_chatbot > /backups/db_$(date +\%Y\%m\%d).sql
```

### Limpieza de Datos Antiguos

```javascript
// Ejecutar periódicamente
await conversationRepository.deleteOldMessages(30); // Eliminar mensajes > 30 días
await conversationRepository.cleanupInactiveSessions(30); // Limpiar sesiones > 30 min
```

---

## ❓ Troubleshooting

### Error: Cannot connect to MySQL

```bash
# Verificar que MySQL está corriendo
sudo systemctl status mysql

# Iniciar MySQL
sudo systemctl start mysql

# Verificar credenciales
mysql -u root -p
```

### Error: OpenAI API authentication failed

- Verificar que `OPENAI_API_KEY` en `.env` es correcta
- Verificar que tienes créditos en OpenAI
- Probar la key manualmente:

```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### Error: Webhook verification failed

- Verificar que `META_VERIFY_TOKEN` coincide en `.env` y en Meta
- Verificar que el servidor está accesible públicamente
- Revisar logs: `tail -f logs/error.log`

### Bot no responde a mensajes

1. Verificar que webhook está configurado correctamente
2. Verificar que la página está vinculada
3. Revisar logs del servidor
4. Probar endpoint manualmente:

```bash
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{"object":"page","entry":[{"messaging":[{"sender":{"id":"123"},"message":{"text":"test"}}]}]}'
```

---

## 📞 Soporte

Para más ayuda, revisar:
- [Documentación de Meta Messenger](https://developers.facebook.com/docs/messenger-platform)
- [Documentación de OpenAI](https://platform.openai.com/docs)
- Logs del sistema: `logs/combined.log`

---

## ✅ Checklist de Deployment

- [ ] Variables de entorno configuradas
- [ ] Base de datos creada y poblada
- [ ] Webhook de Meta configurado
- [ ] SSL/HTTPS configurado
- [ ] PM2 configurado para auto-restart
- [ ] Backups automáticos configurados
- [ ] Monitoreo de logs configurado
- [ ] Página de Facebook vinculada
- [ ] Bot probado en Messenger
- [ ] Documentación revisada
