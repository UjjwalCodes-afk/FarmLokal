import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const categories = ['Milk', 'Dairy', 'Vegetables', 'Fruits', 'Groceries', 'Organic'];
const productNames = {
  Milk: ['Full Cream Milk', 'Toned Milk', 'Buffalo Milk', 'A2 Milk', 'Raw Milk'],
  Dairy: ['Paneer', 'Curd', 'Ghee', 'Butter', 'Cheese'],
  Vegetables: ['Tomato', 'Potato', 'Onion', 'Carrot', 'Spinach', 'Cauliflower'],
  Fruits: ['Apple', 'Banana', 'Mango', 'Orange', 'Grapes', 'Papaya'],
  Groceries: ['Rice', 'Wheat Flour', 'Pulses', 'Sugar', 'Salt', 'Oil'],
  Organic: ['Organic Rice', 'Organic Wheat', 'Organic Vegetables', 'Organic Fruits']
};

async function seed() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'mysql',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'farmlokal_user',
    password: process.env.DB_PASSWORD || 'farmlokal_pass',
    database: process.env.DB_NAME || 'farmlokal'
  });

  try {
    // Check if already seeded
    const [count] = await connection.query('SELECT COUNT(*) as cnt FROM products');
    if (count[0].cnt > 0) {
      console.log(`Database already has ${count[0].cnt} products. Skipping seed.`);
      await connection.end();
      return;
    }

    console.log('🌱 Starting seed for 1,000,000 products...');
    console.time('⏱️  Seeding completed in');
    
    const batchSize = 10000;
    const totalRecords = 1000000;
    
    // Disable indexes temporarily for faster insertion
    await connection.query('ALTER TABLE products DISABLE KEYS');
    
    for (let i = 0; i < totalRecords; i += batchSize) {
      const values = [];
      
      for (let j = 0; j < batchSize && (i + j) < totalRecords; j++) {
        const category = categories[Math.floor(Math.random() * categories.length)];
        const nameArray = productNames[category];
        const baseName = nameArray[Math.floor(Math.random() * nameArray.length)];
        const name = `${baseName} #${i + j}`;
        const price = (Math.random() * 500 + 10).toFixed(2);
        const stock = Math.floor(Math.random() * 1000);
        const description = `Fresh ${baseName} directly from local FarmLokal farmers`;
        
        values.push([name, description, category, price, stock]);
      }
      
      await connection.query(
        'INSERT INTO products (name, description, category, price, stock) VALUES ?',
        [values]
      );
      
      const progress = ((i + batchSize) / totalRecords * 100).toFixed(1);
      process.stdout.write(`\r→ Progress: ${progress}% (${i + batchSize} / ${totalRecords})`);
    }
    
    // Re-enable indexes
    console.log('\n→ Rebuilding indexes...');
    await connection.query('ALTER TABLE products ENABLE KEYS');
    
    console.timeEnd('⏱️  Seeding completed in');
    console.log('✓ Successfully seeded 1,000,000 products\n');
    
  } catch (error) {
    console.error('✗ Seeding failed:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

seed()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
