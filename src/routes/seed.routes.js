import express from 'express';
import { getPool } from '../config/mysql.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { secret, records = 100000 } = req.body;

    // Simple security - set this in Render env
    if (secret !== process.env.SEED_SECRET) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const pool = await getPool();
    
    if (!pool) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    // Create table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255),
        price DECIMAL(10,2),
        category VARCHAR(100),
        stock INT,
        description TEXT,
        INDEX idx_category (category),
        INDEX idx_name (name)
      )
    `);

    // Clear existing
    await pool.execute('TRUNCATE TABLE products');

    const categories = ['vegetables', 'fruits', 'grains', 'dairy'];
    const batchSize = 1000;
    let inserted = 0;

    res.writeHead(200, {
      'Content-Type': 'text/plain',
      'Transfer-Encoding': 'chunked'
    });

    for (let i = 0; i < records; i += batchSize) {
      const values = [];
      for (let j = 0; j < batchSize && (i + j) < records; j++) {
        const id = i + j + 1;
        const category = categories[id % categories.length];
        values.push([
          `Product ${id}`,
          (Math.floor(Math.random() * 200) + 20).toFixed(2),
          category,
          Math.floor(Math.random() * 500) + 10,
          `Description for product ${id}`
        ]);
      }

      const placeholders = values.map(() => '(?,?,?,?,?)').join(',');
      const flatValues = values.flat();
      
      await pool.execute(
        `INSERT INTO products (name, price, category, stock, description) VALUES ${placeholders}`,
        flatValues
      );

      inserted += values.length;
      res.write(`Inserted ${inserted} / ${records}\n`);
    }

    res.write(`\n✅ Seeding complete! ${inserted} products created.\n`);
    res.end();

  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
