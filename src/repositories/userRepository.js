import pool from '../config/database.js';
import logger from '../config/logger.js';

/**
 * Repository para gestionar usuarios en la base de datos
 */

export const findByMessengerId = async (messengerId) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE messenger_id = ?',
      [messengerId]
    );
    return rows[0] || null;
  } catch (error) {
    logger.error('Error finding user by messenger ID:', error);
    throw error;
  }
};

export const findById = async (id) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  } catch (error) {
    logger.error('Error finding user by ID:', error);
    throw error;
  }
};

export const create = async (userData) => {
  try {
    const { messengerId, firstName, lastName, phone, address } = userData;
    
    const [result] = await pool.query(
      `INSERT INTO users (messenger_id, first_name, last_name, phone, address)
       VALUES (?, ?, ?, ?, ?)`,
      [messengerId, firstName, lastName, phone, address]
    );

    return await findById(result.insertId);
  } catch (error) {
    logger.error('Error creating user:', error);
    throw error;
  }
};

export const update = async (id, userData) => {
  try {
    const { firstName, lastName, phone, address } = userData;
    
    await pool.query(
      `UPDATE users 
       SET first_name = COALESCE(?, first_name),
           last_name = COALESCE(?, last_name),
           phone = COALESCE(?, phone),
           address = COALESCE(?, address)
       WHERE id = ?`,
      [firstName, lastName, phone, address, id]
    );

    return await findById(id);
  } catch (error) {
    logger.error('Error updating user:', error);
    throw error;
  }
};

export const findOrCreate = async (messengerId, firstName = null, lastName = null) => {
  try {
    let user = await findByMessengerId(messengerId);
    
    if (!user) {
      user = await create({
        messengerId,
        firstName,
        lastName,
        phone: null,
        address: null
      });
      logger.info(`New user created: ${messengerId}`);
    }
    
    return user;
  } catch (error) {
    logger.error('Error in findOrCreate:', error);
    throw error;
  }
};

export default {
  findByMessengerId,
  findById,
  create,
  update,
  findOrCreate
};
