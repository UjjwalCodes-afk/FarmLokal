import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// Create migrations tracking table
await connection.query(`
  CREATE TABLE IF NOT EXISTS migrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) UNIQUE,
    run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

async function runMigration(file) {
  const { up } = await import(`./${file}`);

  console.log(`→ Running migration: ${file}`);
  await up(connection);

  await connection.query(
    `INSERT INTO migrations (name) VALUES (?)`,
    [file]
  );
}

const [rows] = await connection.query(`SELECT name FROM migrations`);
const executed = rows.map(r => r.name);

const migrations = [
  '001_create_products_table.js',
  '002_create_webhook_events_table.js',
  '003_create_oauth_tokens_table.js'
];

for (const file of migrations) {
  if (!executed.includes(file)) {
    await runMigration(file);
  } else {
    console.log(`⊘ Skipping ${file} (already executed)`);
  }
}

console.log('✓ Migrations complete');
await connection.end();
process.exit(0);
