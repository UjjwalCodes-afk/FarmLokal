import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

let pool = null;
let connecting = false;

export async function getPool() {

  if (!process.env.DB_HOST && process.env.NODE_ENV === 'production') {
    console.warn('⚠️  No database configured - running in demo mode');
    return null;
  }


  if (pool) return pool;


  if (connecting) {
    while (!pool && connecting) {
      await new Promise(r => setTimeout(r, 100));
    }
    return pool;
  }

  connecting = true;

  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: {
        rejectUnauthorized: true
      },
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
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
