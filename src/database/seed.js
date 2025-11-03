import pool from '../config/database.js';
import logger from '../config/logger.js';

/**
 * Script para cargar datos iniciales en la base de datos
 */

const seedData = async () => {
  const connection = await pool.getConnection();

  try {
    logger.info('Starting data seeding...');

    // Insertar productos
    const products = [
      {
        name: 'Cemento Portland Tipo I (Bolsa 42.5 kg)',
        description: 'Cemento de alta resistencia ideal para estructuras, muros y pisos.',
        category: 'Materiales de Construcción',
        price: 28.50,
        stock: 150,
        unit: 'Bolsa',
        image_url: 'https://example.com/images/cemento.jpg'
      },
      {
        name: 'Fierro Corrugado 1/2" x 9 m',
        description: 'Varilla de acero corrugado para refuerzo de concreto en obras de construcción.',
        category: 'Materiales de Construcción',
        price: 32.00,
        stock: 200,
        unit: 'Unidad',
        image_url: 'https://example.com/images/fierro.jpg'
      },
      {
        name: 'Clavo de acero 2" (caja x 1 kg)',
        description: 'Clavos galvanizados para carpintería y estructuras livianas.',
        category: 'Ferretería',
        price: 9.90,
        stock: 80,
        unit: 'Caja',
        image_url: 'https://example.com/images/clavos.jpg'
      },
      {
        name: 'Pintura Látex Blanca 1 galón',
        description: 'Pintura de acabado mate para interiores, de fácil aplicación y secado rápido.',
        category: 'Pinturas',
        price: 45.00,
        stock: 60,
        unit: 'Galón',
        image_url: 'https://example.com/images/pintura.jpg'
      },
      {
        name: 'Brocha de 2" de cerda sintética',
        description: 'Brocha económica y duradera, ideal para pintura en muros y superficies lisas.',
        category: 'Herramientas',
        price: 8.50,
        stock: 100,
        unit: 'Unidad',
        image_url: 'https://example.com/images/brocha.jpg'
      },
      {
        name: 'Taladro Percutor 1/2" 710W (marca Truper)',
        description: 'Taladro eléctrico de doble función (perforar y percutir) con mango auxiliar.',
        category: 'Herramientas Eléctricas',
        price: 189.00,
        stock: 25,
        unit: 'Unidad',
        image_url: 'https://example.com/images/taladro.jpg'
      },
      {
        name: 'Cinta Métrica de 5 metros',
        description: 'Cinta de acero retráctil con gancho imantado y carcasa ergonómica.',
        category: 'Herramientas',
        price: 17.00,
        stock: 75,
        unit: 'Unidad',
        image_url: 'https://example.com/images/cinta.jpg'
      },
      {
        name: 'Llave Stillson 14" (ajustable)',
        description: 'Llave ajustable para tuberías metálicas, de cuerpo robusto y dientes templados.',
        category: 'Herramientas',
        price: 46.00,
        stock: 40,
        unit: 'Unidad',
        image_url: 'https://example.com/images/llave.jpg'
      },
      {
        name: 'Guantes de Seguridad de Nitrilo (par)',
        description: 'Guantes resistentes a cortes y productos químicos, ideales para trabajos industriales.',
        category: 'Seguridad',
        price: 11.50,
        stock: 120,
        unit: 'Par',
        image_url: 'https://example.com/images/guantes.jpg'
      },
      {
        name: 'Foco LED 12W rosca E27 (luz fría)',
        description: 'Foco LED de bajo consumo y larga duración, equivalente a 100W incandescente.',
        category: 'Eléctricos',
        price: 7.90,
        stock: 200,
        unit: 'Unidad',
        image_url: 'https://example.com/images/foco.jpg'
      }
    ];

    for (const product of products) {
      await connection.query(
        `INSERT INTO products (name, description, category, price, stock, unit, image_url) 
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
         description = VALUES(description),
         price = VALUES(price),
         stock = VALUES(stock)`,
        [product.name, product.description, product.category, product.price, product.stock, product.unit, product.image_url]
      );
    }

    logger.info(`✓ Inserted ${products.length} products`);

    // Crear usuario de prueba
    const [userResult] = await connection.query(
      `INSERT INTO users (messenger_id, first_name, last_name, phone, address)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE id=id`,
      ['test_user_12345', 'Usuario', 'Prueba', '999888777', 'Av. Ejemplo 123, Lima']
    );

    logger.info('✓ Test user created');

    logger.info('✓ Data seeding completed successfully!');

  } catch (error) {
    logger.error('Error seeding data:', error);
    throw error;
  } finally {
    connection.release();
  }
};

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  seedData()
    .then(() => {
      console.log('Data seeding completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Data seeding failed:', error);
      process.exit(1);
    });
}

export default seedData;
