import rateLimit from 'express-rate-limit';

/**
 * Rate limiter para prevenir abuso de la API
 */

// Rate limiter para webhooks (más permisivo)
export const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 100, // máximo 100 requests por minuto
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  // No aplicar rate limit si viene de Meta (opcional)
  skip: (req) => {
    // Aquí podrías verificar si el request viene de IPs de Meta
    return false;
  }
});

// Rate limiter para API general (más restrictivo)
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por 15 minutos
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter estricto para endpoints sensibles
export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // máximo 10 requests por hora
  message: 'Too many attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

export default {
  webhookLimiter,
  apiLimiter,
  strictLimiter
};
