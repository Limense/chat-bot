import express from 'express';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import cors from 'cors';
import helmet from 'helmet';
import logger from './config/logger.js';
import { testConnection } from './config/database.js';
import { testOpenAI } from './config/openai.js';
import embeddingService from './services/embeddingService.js';
import webhookRoutes from './routes/webhook.js';
import errorHandler from './middlewares/errorHandler.js';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * Middlewares globales
 */
app.use(helmet()); // Seguridad
app.use(cors()); // CORS
app.use(bodyParser.json()); // Parse JSON
app.use(bodyParser.urlencoded({ extended: true }));

/**
 * Logger de requests
 */
app.use((req, res, next) => {
  logger.http(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

/**
 * Rutas
 */

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Webhook de Messenger
app.use('/webhook', webhookRoutes);

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    message: 'Ferretería ChatBot API',
    version: '1.0.0',
    status: 'running'
  });
});

/**
 * Middleware de manejo de errores (debe ser el último)
 */
app.use(errorHandler);

/**
 * Inicializar servicios y arrancar servidor
 */
const startServer = async () => {
  try {
    logger.info('Starting Ferretería ChatBot...');

    // Verificar conexión a MySQL
    await testConnection();

    // Verificar conexión a OpenAI
    await testOpenAI();

    // Inicializar servicio de embeddings
    logger.info('Initializing embedding service...');
    await embeddingService.initialize();

    // Iniciar servidor
    app.listen(PORT, () => {
      logger.info(`✓ Server is running on port ${PORT}`);
      logger.info(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`✓ Webhook URL: http://localhost:${PORT}/webhook`);
      logger.info('✓ ChatBot is ready to receive messages!');
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Manejo de errores no capturados
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled Promise Rejection:', error);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

// Iniciar servidor
startServer();

export default app;
