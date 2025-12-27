import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

let pool = null;
let connecting = false;

export async function getPool() {
  // If no DB config, return null (demo mode)
  if (!process.env.DB_HOST && process.env.NODE_ENV === 'production') {
    console.warn('⚠️  No database configured - running in demo mode');
    return null;
  }

  // Already connected
  if (pool) return pool;

  // Prevent concurrent connection attempts
  if (connecting) {
    while (!pool && connecting) {
      await new Promise(r => setTimeout(r, 100));
    }
    return pool;
  }

  connecting = true;

  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'mysql',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'farmlokal_user',
      password: process.env.DB_PASSWORD || 'farmlokal_pass',
      database: process.env.DB_NAME || 'farmlokal',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelayMs: 0
    });

    const conn = await pool.getConnection();
    console.log('✅ MySQL connected');
    conn.release();
    connecting = false;
    return pool;
  } catch (err) {
    console.warn('⚠️  MySQL unavailable:', err.message);
    connecting = false;
    return null;
  }
}

export default { getPool };
