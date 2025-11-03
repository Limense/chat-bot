import pool from '../config/database.js';
import logger from '../config/logger.js';

/**
 * Repository para gestionar el historial de conversaciones
 */

export const saveMessage = async (messageData) => {
  try {
    const { userId, messageType, messageText, intent, confidence, metadata } = messageData;
    
    const [result] = await pool.query(
      `INSERT INTO conversations (user_id, message_type, message_text, intent, confidence, metadata)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId, 
        messageType, 
        messageText, 
        intent || null, 
        confidence || null, 
        metadata ? JSON.stringify(metadata) : null
      ]
    );

    return result.insertId;
  } catch (error) {
    logger.error('Error saving message:', error);
    throw error;
  }
};

export const getHistory = async (userId, limit = 10) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM conversations 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT ?`,
      [userId, limit]
    );
    
    return rows.reverse(); // Retornar en orden cronológico
  } catch (error) {
    logger.error('Error getting conversation history:', error);
    throw error;
  }
};

export const getRecentContext = async (userId, limit = 5) => {
  try {
    const messages = await getHistory(userId, limit);
    
    // Formatear para contexto de IA
    return messages.map(msg => ({
      role: msg.message_type === 'user' ? 'user' : 'assistant',
      content: msg.message_text
    }));
  } catch (error) {
    logger.error('Error getting recent context:', error);
    throw error;
  }
};

export const deleteOldMessages = async (daysOld = 30) => {
  try {
    const [result] = await pool.query(
      `DELETE FROM conversations 
       WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [daysOld]
    );
    
    logger.info(`Deleted ${result.affectedRows} old messages`);
    return result.affectedRows;
  } catch (error) {
    logger.error('Error deleting old messages:', error);
    throw error;
  }
};

export const getIntentStats = async (userId) => {
  try {
    const [rows] = await pool.query(
      `SELECT intent, COUNT(*) as count 
       FROM conversations 
       WHERE user_id = ? AND intent IS NOT NULL 
       GROUP BY intent 
       ORDER BY count DESC`,
      [userId]
    );
    return rows;
  } catch (error) {
    logger.error('Error getting intent stats:', error);
    throw error;
  }
};

// Gestión de estados de conversación
export const getState = async (userId) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM conversation_states WHERE user_id = ?',
      [userId]
    );
    
    if (rows.length === 0) {
      return {
        currentState: 'initial',
        context: {}
      };
    }
    
    const state = rows[0];
    return {
      currentState: state.current_state,
      context: state.context ? JSON.parse(state.context) : {}
    };
  } catch (error) {
    logger.error('Error getting conversation state:', error);
    throw error;
  }
};

export const setState = async (userId, currentState, context = {}) => {
  try {
    await pool.query(
      `INSERT INTO conversation_states (user_id, current_state, context)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
         current_state = VALUES(current_state),
         context = VALUES(context),
         last_interaction = CURRENT_TIMESTAMP`,
      [userId, currentState, JSON.stringify(context)]
    );
    
    return { currentState, context };
  } catch (error) {
    logger.error('Error setting conversation state:', error);
    throw error;
  }
};

export const updateContext = async (userId, contextUpdate) => {
  try {
    const currentState = await getState(userId);
    const newContext = { ...currentState.context, ...contextUpdate };
    
    await setState(userId, currentState.currentState, newContext);
    return newContext;
  } catch (error) {
    logger.error('Error updating context:', error);
    throw error;
  }
};

export const clearState = async (userId) => {
  try {
    await setState(userId, 'initial', {});
    logger.info(`Cleared state for user ${userId}`);
  } catch (error) {
    logger.error('Error clearing state:', error);
    throw error;
  }
};

export const cleanupInactiveSessions = async (timeoutMinutes = 30) => {
  try {
    const [result] = await pool.query(
      `DELETE FROM conversation_states 
       WHERE last_interaction < DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
      [timeoutMinutes]
    );
    
    logger.info(`Cleaned up ${result.affectedRows} inactive sessions`);
    return result.affectedRows;
  } catch (error) {
    logger.error('Error cleaning up inactive sessions:', error);
    throw error;
  }
};

export default {
  saveMessage,
  getHistory,
  getRecentContext,
  deleteOldMessages,
  getIntentStats,
  getState,
  setState,
  updateContext,
  clearState,
  cleanupInactiveSessions
};
