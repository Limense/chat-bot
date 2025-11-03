import openai, { EMBEDDING_CONFIG } from '../config/openai.js';
import { HierarchicalNSW } from 'hnswlib-node';
import logger from '../config/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Servicio para generar embeddings y búsqueda semántica
 */

// Base de conocimiento (FAQs, productos, servicios)
const KNOWLEDGE_BASE = [
  {
    id: 'faq_001',
    text: '¿Qué es el fierro corrugado y para qué se utiliza en construcción? El fierro corrugado es una varilla de acero con relieves en su superficie que mejora la adherencia al concreto. Se usa como refuerzo estructural en columnas, vigas y losas.',
    category: 'faq_product',
    answer: 'El fierro corrugado es una varilla de acero con relieves que mejora su adherencia al concreto. Se utiliza como refuerzo estructural en columnas, vigas y losas de construcción.'
  },
  {
    id: 'faq_002',
    text: '¿Qué tipo de cemento se recomienda para estructuras resistentes? Para estructuras que requieren alta resistencia, se recomienda el Cemento Portland Tipo I, por su durabilidad y desempeño en obras generales.',
    category: 'faq_product',
    answer: 'Para estructuras resistentes recomendamos el Cemento Portland Tipo I, por su alta durabilidad y excelente desempeño en obras de construcción general.'
  },
  {
    id: 'faq_003',
    text: '¿Qué ventajas tiene usar pintura látex en interiores? La pintura látex es ideal para interiores por su bajo olor, fácil aplicación, rápido secado y posibilidad de limpieza sin dañar el acabado.',
    category: 'faq_product',
    answer: 'La pintura látex tiene varias ventajas: bajo olor, fácil aplicación, secado rápido y se puede limpiar fácilmente sin dañar el acabado. Es ideal para interiores.'
  },
  {
    id: 'faq_004',
    text: '¿Qué herramientas básicas se necesitan para trabajos domésticos? Las herramientas esenciales incluyen taladro, cinta métrica, brochas, llave ajustable, guantes de seguridad y destornilladores.',
    category: 'faq_product',
    answer: 'Para trabajos domésticos necesitas: taladro, cinta métrica, brochas, llave ajustable, guantes de seguridad y destornilladores.'
  },
  {
    id: 'faq_005',
    text: '¿Qué beneficios ofrece un foco LED frente a uno tradicional? Los focos LED consumen menos energía, duran más tiempo y generan menos calor, lo que los hace más eficientes y seguros.',
    category: 'faq_product',
    answer: 'Los focos LED consumen hasta 80% menos energía, duran mucho más tiempo (hasta 25,000 horas) y generan menos calor, haciéndolos más eficientes y seguros que los focos tradicionales.'
  },
  {
    id: 'faq_006',
    text: '¿Qué información se necesita para registrar un pedido? Para registrar un pedido se requiere nombre completo, número de celular, dirección de entrega y una descripción clara de los productos.',
    category: 'faq_service',
    answer: 'Para registrar tu pedido necesitamos: tu nombre completo, número de celular, dirección de entrega completa y la lista de productos que deseas.'
  },
  {
    id: 'faq_007',
    text: '¿La ferretería ofrece servicio de entrega a domicilio? Sí, ofrecemos servicio de entrega a domicilio.',
    category: 'faq_service',
    answer: 'Sí, ofrecemos servicio de entrega a domicilio en Lima.'
  },
  {
    id: 'faq_008',
    text: '¿Qué métodos de pago aceptan? Aceptamos transferencias bancarias, Yape y Plin.',
    category: 'faq_service',
    answer: 'Aceptamos los siguientes métodos de pago: transferencias bancarias, Yape y Plin.'
  },
  {
    id: 'faq_009',
    text: '¿Cuál es el horario de atención? Atendemos de lunes a sábado entre 8:00 a.m. y 6:00 p.m.',
    category: 'faq_schedule',
    answer: 'Nuestro horario de atención es de lunes a sábado de 8:00 AM a 6:00 PM.'
  },
  {
    id: 'faq_010',
    text: '¿Atienden los domingos o feriados? No atendemos domingos ni feriados.',
    category: 'faq_schedule',
    answer: 'No, no atendemos los domingos ni días feriados. Estamos disponibles de lunes a sábado.'
  },
  {
    id: 'faq_011',
    text: '¿Puedo dejar un pedido fuera del horario de atención? Sí, puedes dejar tu solicitud. Será atendida en el siguiente horario hábil.',
    category: 'faq_schedule',
    answer: 'Sí, puedes dejar tu pedido en cualquier momento a través del chat. Será procesado en nuestro próximo horario de atención.'
  }
];

class EmbeddingService {
  constructor() {
    this.index = null;
    this.documents = [];
    this.isInitialized = false;
    this.indexPath = path.join(__dirname, '../../data/vectordb');
  }

  /**
   * Inicializar el índice vectorial
   */
  async initialize() {
    try {
      // Crear directorio si no existe
      if (!fs.existsSync(this.indexPath)) {
        fs.mkdirSync(this.indexPath, { recursive: true });
      }

      // Crear índice HNSW
      this.index = new HierarchicalNSW('cosine', EMBEDDING_CONFIG.dimension);
      
      // Intentar cargar índice existente
      const indexFile = path.join(this.indexPath, 'index.bin');
      const docsFile = path.join(this.indexPath, 'documents.json');

      if (fs.existsSync(indexFile) && fs.existsSync(docsFile)) {
        logger.info('Loading existing vector index...');
        this.index.readIndex(indexFile);
        this.documents = JSON.parse(fs.readFileSync(docsFile, 'utf8'));
        logger.info(`✓ Loaded ${this.documents.length} documents from vector DB`);
      } else {
        logger.info('Creating new vector index...');
        await this.buildIndex();
      }

      this.isInitialized = true;
      logger.info('✓ Vector database initialized successfully');

    } catch (error) {
      logger.error('Error initializing embedding service:', error);
      throw error;
    }
  }

  /**
   * Construir índice desde cero
   */
  async buildIndex() {
    try {
      logger.info('Building vector index from knowledge base...');

      // Inicializar índice con el número máximo de elementos
      this.index.initIndex(KNOWLEDGE_BASE.length);

      // Generar embeddings para cada documento
      for (let i = 0; i < KNOWLEDGE_BASE.length; i++) {
        const doc = KNOWLEDGE_BASE[i];
        const embedding = await this.generateEmbedding(doc.text);
        
        this.index.addPoint(embedding, i);
        this.documents.push(doc);
        
        logger.debug(`Added document ${i + 1}/${KNOWLEDGE_BASE.length}`);
      }

      // Guardar índice y documentos
      await this.saveIndex();
      
      logger.info(`✓ Built index with ${this.documents.length} documents`);

    } catch (error) {
      logger.error('Error building index:', error);
      throw error;
    }
  }

  /**
   * Generar embedding para un texto
   */
  async generateEmbedding(text) {
    try {
      const response = await openai.embeddings.create({
        model: EMBEDDING_CONFIG.model,
        input: text,
      });

      return response.data[0].embedding;

    } catch (error) {
      logger.error('Error generating embedding:', error);
      throw error;
    }
  }

  /**
   * Buscar documentos similares
   */
  async searchSimilar(query, k = 3) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Generar embedding de la consulta
      const queryEmbedding = await this.generateEmbedding(query);

      // Buscar k vecinos más cercanos
      const result = this.index.searchKnn(queryEmbedding, k);

      // Retornar documentos con sus scores
      const results = [];
      for (let i = 0; i < result.neighbors.length; i++) {
        const docIndex = result.neighbors[i];
        const distance = result.distances[i];
        const similarity = 1 - distance; // Convertir distancia a similitud

        results.push({
          ...this.documents[docIndex],
          similarity,
          score: similarity
        });
      }

      logger.debug(`Found ${results.length} similar documents for query: "${query}"`);
      return results;

    } catch (error) {
      logger.error('Error searching similar documents:', error);
      return [];
    }
  }

  /**
   * Obtener mejor respuesta para una pregunta
   */
  async getBestAnswer(question, threshold = 0.7) {
    try {
      const results = await this.searchSimilar(question, 1);

      if (results.length > 0 && results[0].similarity >= threshold) {
        return {
          found: true,
          answer: results[0].answer,
          confidence: results[0].similarity,
          source: results[0].id
        };
      }

      return {
        found: false,
        answer: null,
        confidence: 0
      };

    } catch (error) {
      logger.error('Error getting best answer:', error);
      return { found: false, answer: null, confidence: 0 };
    }
  }

  /**
   * Guardar índice en disco
   */
  async saveIndex() {
    try {
      const indexFile = path.join(this.indexPath, 'index.bin');
      const docsFile = path.join(this.indexPath, 'documents.json');

      this.index.writeIndex(indexFile);
      fs.writeFileSync(docsFile, JSON.stringify(this.documents, null, 2));

      logger.info('✓ Vector index saved to disk');

    } catch (error) {
      logger.error('Error saving index:', error);
      throw error;
    }
  }

  /**
   * Agregar nuevo documento al índice
   */
  async addDocument(doc) {
    try {
      const embedding = await this.generateEmbedding(doc.text);
      const newIndex = this.documents.length;
      
      this.documents.push(doc);
      this.index.addPoint(embedding, newIndex);
      
      await this.saveIndex();
      
      logger.info(`Added new document: ${doc.id}`);
      return true;

    } catch (error) {
      logger.error('Error adding document:', error);
      return false;
    }
  }
}

// Exportar instancia única (Singleton)
const embeddingService = new EmbeddingService();

export default embeddingService;
export { EmbeddingService };
