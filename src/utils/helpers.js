/**
 * Funciones auxiliares útiles
 */

/**
 * Formatear precio en soles peruanos
 */
export const formatPrice = (price) => {
  return `S/ ${parseFloat(price).toFixed(2)}`;
};

/**
 * Formatear fecha en español
 */
export const formatDate = (date) => {
  const d = new Date(date);
  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  return d.toLocaleDateString('es-PE', options);
};

/**
 * Generar número de pedido único
 */
export const generateOrderNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD-${year}${month}${day}-${random}`;
};

/**
 * Esperar X milisegundos (útil para delays)
 */
export const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Truncar texto a cierta longitud
 */
export const truncate = (text, maxLength = 100) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

/**
 * Capitalizar primera letra
 */
export const capitalize = (text) => {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

/**
 * Extraer números de un texto
 */
export const extractNumbers = (text) => {
  const numbers = text.match(/\d+/g);
  return numbers ? numbers.map(Number) : [];
};

/**
 * Calcular similitud entre dos strings (distancia de Levenshtein normalizada)
 */
export const stringSimilarity = (str1, str2) => {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
};

const levenshteinDistance = (str1, str2) => {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
};

/**
 * Dividir array en chunks
 */
export const chunkArray = (array, size) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

/**
 * Remover duplicados de array
 */
export const uniqueArray = (array) => {
  return [...new Set(array)];
};

/**
 * Verificar si un objeto está vacío
 */
export const isEmpty = (obj) => {
  return Object.keys(obj).length === 0;
};

export default {
  formatPrice,
  formatDate,
  generateOrderNumber,
  sleep,
  truncate,
  capitalize,
  extractNumbers,
  stringSimilarity,
  chunkArray,
  uniqueArray,
  isEmpty
};
