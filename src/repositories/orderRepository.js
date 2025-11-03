import pool from '../config/database.js';
import logger from '../config/logger.js';

/**
 * Repository para gestionar pedidos
 */

const generateOrderNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD-${year}${month}${day}-${random}`;
};

export const create = async (orderData) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { userId, items, deliveryAddress, deliveryPhone, notes } = orderData;
    
    // Generar número de pedido único
    const orderNumber = generateOrderNumber();
    
    // Crear el pedido
    const [orderResult] = await connection.query(
      `INSERT INTO orders (user_id, order_number, delivery_address, delivery_phone, notes, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [userId, orderNumber, deliveryAddress, deliveryPhone, notes]
    );

    const orderId = orderResult.insertId;

    // Insertar items del pedido
    for (const item of items) {
      const [product] = await connection.query(
        'SELECT name, price, stock FROM products WHERE id = ?',
        [item.productId]
      );

      if (!product || product.length === 0) {
        throw new Error(`Producto con ID ${item.productId} no encontrado`);
      }

      if (product[0].stock < item.quantity) {
        throw new Error(`Stock insuficiente para producto: ${product[0].name}`);
      }

      const unitPrice = product[0].price;
      const subtotal = unitPrice * item.quantity;

      await connection.query(
        `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, item.productId, product[0].name, item.quantity, unitPrice, subtotal]
      );

      // Actualizar stock
      await connection.query(
        'UPDATE products SET stock = stock - ? WHERE id = ?',
        [item.quantity, item.productId]
      );
    }

    await connection.commit();
    
    // Obtener el pedido completo
    const order = await findById(orderId);
    logger.info(`Order created: ${orderNumber}`);
    
    return order;

  } catch (error) {
    await connection.rollback();
    logger.error('Error creating order:', error);
    throw error;
  } finally {
    connection.release();
  }
};

export const findById = async (orderId) => {
  try {
    const [orders] = await pool.query(
      `SELECT o.*, u.first_name, u.last_name, u.phone as user_phone
       FROM orders o
       JOIN users u ON o.user_id = u.id
       WHERE o.id = ?`,
      [orderId]
    );

    if (orders.length === 0) return null;

    const order = orders[0];

    // Obtener items del pedido
    const [items] = await pool.query(
      `SELECT * FROM order_items WHERE order_id = ?`,
      [orderId]
    );

    order.items = items;
    return order;

  } catch (error) {
    logger.error('Error finding order by ID:', error);
    throw error;
  }
};

export const findByOrderNumber = async (orderNumber) => {
  try {
    const [orders] = await pool.query(
      `SELECT o.*, u.first_name, u.last_name, u.phone as user_phone
       FROM orders o
       JOIN users u ON o.user_id = u.id
       WHERE o.order_number = ?`,
      [orderNumber]
    );

    if (orders.length === 0) return null;

    const order = orders[0];

    const [items] = await pool.query(
      `SELECT * FROM order_items WHERE order_id = ?`,
      [order.id]
    );

    order.items = items;
    return order;

  } catch (error) {
    logger.error('Error finding order by number:', error);
    throw error;
  }
};

export const findByUser = async (userId, limit = 10) => {
  try {
    const [orders] = await pool.query(
      `SELECT * FROM orders 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT ?`,
      [userId, limit]
    );
    return orders;
  } catch (error) {
    logger.error('Error finding orders by user:', error);
    throw error;
  }
};

export const updateStatus = async (orderId, status) => {
  try {
    await pool.query(
      'UPDATE orders SET status = ? WHERE id = ?',
      [status, orderId]
    );
    return await findById(orderId);
  } catch (error) {
    logger.error('Error updating order status:', error);
    throw error;
  }
};

export default {
  create,
  findById,
  findByOrderNumber,
  findByUser,
  updateStatus,
  generateOrderNumber
};
