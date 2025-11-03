import pool from '../config/database.js';
import logger from '../config/logger.js';

/**
 * Repository para gestionar productos
 */

export const findAll = async () => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM products WHERE is_active = TRUE ORDER BY name'
    );
    return rows;
  } catch (error) {
    logger.error('Error finding all products:', error);
    throw error;
  }
};

export const findById = async (id) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM products WHERE id = ? AND is_active = TRUE',
      [id]
    );
    return rows[0] || null;
  } catch (error) {
    logger.error('Error finding product by ID:', error);
    throw error;
  }
};

export const findByIds = async (ids) => {
  try {
    if (!ids || ids.length === 0) return [];
    
    const placeholders = ids.map(() => '?').join(',');
    const [rows] = await pool.query(
      `SELECT * FROM products WHERE id IN (${placeholders}) AND is_active = TRUE`,
      ids
    );
    return rows;
  } catch (error) {
    logger.error('Error finding products by IDs:', error);
    throw error;
  }
};

export const findByCategory = async (category) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM products WHERE category = ? AND is_active = TRUE ORDER BY name',
      [category]
    );
    return rows;
  } catch (error) {
    logger.error('Error finding products by category:', error);
    throw error;
  }
};

export const searchByName = async (searchTerm, limit = 10) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM products 
       WHERE (name LIKE ? OR description LIKE ?) 
       AND is_active = TRUE 
       ORDER BY name 
       LIMIT ?`,
      [`%${searchTerm}%`, `%${searchTerm}%`, limit]
    );
    return rows;
  } catch (error) {
    logger.error('Error searching products:', error);
    throw error;
  }
};

export const checkStock = async (productId, quantity) => {
  try {
    const [rows] = await pool.query(
      'SELECT stock FROM products WHERE id = ? AND is_active = TRUE',
      [productId]
    );
    
    if (rows.length === 0) {
      return { available: false, stock: 0 };
    }
    
    const stock = rows[0].stock;
    return {
      available: stock >= quantity,
      stock
    };
  } catch (error) {
    logger.error('Error checking stock:', error);
    throw error;
  }
};

export const updateStock = async (productId, quantity) => {
  try {
    await pool.query(
      'UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?',
      [quantity, productId, quantity]
    );
    return true;
  } catch (error) {
    logger.error('Error updating stock:', error);
    throw error;
  }
};

export const getCategories = async () => {
  try {
    const [rows] = await pool.query(
      'SELECT DISTINCT category FROM products WHERE is_active = TRUE ORDER BY category'
    );
    return rows.map(row => row.category);
  } catch (error) {
    logger.error('Error getting categories:', error);
    throw error;
  }
};

export default {
  findAll,
  findById,
  findByIds,
  findByCategory,
  searchByName,
  checkStock,
  updateStock,
  getCategories
};
