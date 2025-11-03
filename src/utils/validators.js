/**
 * Validadores de datos
 */

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone) => {
  // Formato: 9 dígitos para Perú
  const phoneRegex = /^9\d{8}$/;
  return phoneRegex.test(phone.replace(/\s+/g, ''));
};

export const validateOrderData = (data) => {
  const errors = [];

  if (!data.userId) {
    errors.push('user_id is required');
  }

  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    errors.push('items array is required and must not be empty');
  }

  if (!data.deliveryAddress) {
    errors.push('delivery_address is required');
  }

  if (!data.deliveryPhone) {
    errors.push('delivery_phone is required');
  }

  if (errors.length > 0) {
    throw new Error(errors.join(', '));
  }

  return true;
};

export const validateProductData = (data) => {
  const errors = [];

  if (!data.name) {
    errors.push('name is required');
  }

  if (!data.price || data.price <= 0) {
    errors.push('valid price is required');
  }

  if (errors.length > 0) {
    throw new Error(errors.join(', '));
  }

  return true;
};

export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  // Remover caracteres potencialmente peligrosos
  return input
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
};

export default {
  validateEmail,
  validatePhone,
  validateOrderData,
  validateProductData,
  sanitizeInput
};
