#!/usr/bin/env node

/**
 * Script de prueba para verificar la configuración del chatbot
 */

import { testConnection } from './src/config/database.js';
import { testOpenAI } from './src/config/openai.js';
import embeddingService from './src/services/embeddingService.js';
import logger from './src/config/logger.js';
import dotenv from 'dotenv';

dotenv.config();

console.log('\n VERIFICACIÓN DE CONFIGURACIÓN DEL CHATBOT\n');
console.log('='.repeat(50));

const tests = [];

// Test 1: Variables de entorno
console.log('\n 1. Verificando variables de entorno...');
const requiredEnvVars = [
  'META_VERIFY_TOKEN',
  'META_PAGE_ACCESS_TOKEN',
  'META_APP_SECRET',
  'OPENAI_API_KEY',
  'DB_HOST',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME'
];

let envCheck = true;
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.log(`   ✗ ${varName} no está configurada`);
    envCheck = false;
  } else {
    console.log(`   ✓ ${varName} configurada`);
  }
});

tests.push({ name: 'Variables de entorno', passed: envCheck });

// Test 2: Conexión MySQL
console.log('\n  2. Probando conexión a MySQL...');
let dbCheck = false;
try {
  await testConnection();
  console.log('   ✓ Conexión exitosa a MySQL');
  dbCheck = true;
} catch (error) {
  console.log(`   ✗ Error: ${error.message}`);
}

tests.push({ name: 'MySQL', passed: dbCheck });

// Test 3: OpenAI API
console.log('\n 3. Probando conexión a OpenAI...');
let openaiCheck = false;
try {
  await testOpenAI();
  console.log('   ✓ Conexión exitosa a OpenAI');
  openaiCheck = true;
} catch (error) {
  console.log(`   ✗ Error: ${error.message}`);
}

tests.push({ name: 'OpenAI API', passed: openaiCheck });

// Test 4: Base de datos vectorial
console.log('\n 4. Inicializando base de datos vectorial...');
let vectorCheck = false;
try {
  await embeddingService.initialize();
  console.log('   ✓ Vector DB inicializada correctamente');
  
  // Probar búsqueda
  const result = await embeddingService.getBestAnswer('¿Cuál es el horario?');
  if (result.found) {
    console.log(`   ✓ Búsqueda semántica funcionando`);
    console.log(`   → Respuesta encontrada: "${result.answer.substring(0, 50)}..."`);
    vectorCheck = true;
  } else {
    console.log('     Búsqueda no retornó resultados');
  }
} catch (error) {
  console.log(`   ✗ Error: ${error.message}`);
}

tests.push({ name: 'Vector DB', passed: vectorCheck });

// Test 5: Verificar estructura de base de datos
console.log('\n 5. Verificando estructura de base de datos...');
let tableCheck = false;
try {
  const { default: pool } = await import('./src/config/database.js');
  
  const expectedTables = [
    'users',
    'products',
    'orders',
    'order_items',
    'conversations',
    'conversation_states'
  ];
  
  const [tables] = await pool.query('SHOW TABLES');
  const tableNames = tables.map(t => Object.values(t)[0]);
  
  let allTablesExist = true;
  expectedTables.forEach(table => {
    if (tableNames.includes(table)) {
      console.log(`   ✓ Tabla "${table}" existe`);
    } else {
      console.log(`   ✗ Tabla "${table}" no existe`);
      allTablesExist = false;
    }
  });
  
  tableCheck = allTablesExist;
} catch (error) {
  console.log(`   ✗ Error: ${error.message}`);
}

tests.push({ name: 'Estructura DB', passed: tableCheck });

// Test 6: Verificar productos
console.log('\n 6. Verificando datos de productos...');
let productCheck = false;
try {
  const { default: pool } = await import('./src/config/database.js');
  const [products] = await pool.query('SELECT COUNT(*) as count FROM products');
  
  if (products[0].count > 0) {
    console.log(`   ✓ ${products[0].count} productos encontrados en la base de datos`);
    productCheck = true;
  } else {
    console.log('     No hay productos. Ejecuta: npm run seed-data');
  }
} catch (error) {
  console.log(`   ✗ Error: ${error.message}`);
}

tests.push({ name: 'Productos', passed: productCheck });

// Resumen
console.log('\n' + '='.repeat(50));
console.log('\n RESUMEN DE PRUEBAS:\n');

const passed = tests.filter(t => t.passed).length;
const total = tests.length;

tests.forEach(test => {
  const icon = test.passed ? '✓' : '✗';
  const status = test.passed ? 'PASS' : 'FAIL';
  console.log(`   ${icon} ${test.name.padEnd(25)} [${status}]`);
});

console.log(`\n   Total: ${passed}/${total} pruebas pasaron\n`);

if (passed === total) {
  console.log(' ¡Todas las pruebas pasaron! El chatbot está listo para usar.\n');
  console.log('Próximos pasos:');
  console.log('1. Iniciar servidor: npm run dev');
  console.log('2. Configurar webhook en Meta Developer Console');
  console.log('3. Probar enviando mensaje desde Messenger\n');
  process.exit(0);
} else {
  console.log('  Algunas pruebas fallaron. Revisa la configuración.\n');
  console.log('Soluciones:');
  if (!envCheck) {
    console.log('• Configura las variables en .env (copia de .env.example)');
  }
  if (!dbCheck) {
    console.log('• Verifica que MySQL esté corriendo');
    console.log('• Verifica credenciales en .env');
  }
  if (!tableCheck) {
    console.log('• Ejecuta: npm run setup-db');
  }
  if (!productCheck) {
    console.log('• Ejecuta: npm run seed-data');
  }
  if (!openaiCheck) {
    console.log('• Verifica tu OPENAI_API_KEY');
  }
  console.log();
  process.exit(1);
}
