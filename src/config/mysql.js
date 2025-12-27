import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

let pool;
let retries = 0;
const MAX_RETRIES = 30;

async function createPool() {
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
      keepAliveInitialDelay: 0
    });

    const conn = await pool.getConnection();
    console.log('✓ MySQL connected');
    conn.release();
    return pool;
  } catch (err) {
    retries++;
    if (retries < MAX_RETRIES) {
      console.log(`⏳ MySQL connection failed (attempt ${retries}/${MAX_RETRIES}), retrying in 2s...`);
      await new Promise(r => setTimeout(r, 2000));
      return createPool();
    } else {
      console.error('✗ MySQL connection failed after max retries');
      throw err;
    }
  }
}

pool = await createPool();

export default pool;
