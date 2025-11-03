import logger from '../config/logger.js';

/**
 * Middleware global para manejo de errores
 */
export const errorHandler = (err, req, res, next) => {
  // Log del error con detalles
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    body: req.body
  });

  // Determinar código de estado
  const statusCode = err.statusCode || 500;
  
  // No exponer detalles internos en producción
  const isProduction = process.env.NODE_ENV === 'production';
  
  const response = {
    success: false,
    error: isProduction ? 'Internal server error' : err.message,
    ...(isProduction ? {} : { stack: err.stack })
  };

  res.status(statusCode).json(response);
};

// Clases de errores personalizados
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

export default errorHandler;
