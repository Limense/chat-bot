import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// Configuración del cliente de OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Configuración de modelos
export const MODELS = {
  CHAT: 'gpt-4-turbo-preview',
  EMBEDDING: 'text-embedding-3-small'
};

// Configuración de embeddings
export const EMBEDDING_CONFIG = {
  dimension: parseInt(process.env.EMBEDDING_DIMENSION) || 1536,
  model: MODELS.EMBEDDING
};

// Función para verificar API key
export const testOpenAI = async () => {
  try {
    await openai.models.list();
    console.log('✓ OpenAI API connected successfully');
    return true;
  } catch (error) {
    console.error('✗ Error connecting to OpenAI API:', error.message);
    throw error;
  }
};

export default openai;
