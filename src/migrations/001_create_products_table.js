export const up = async (connection) => {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS products (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        stock INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_category_price_created (category, price, created_at),
        INDEX idx_name_created (name, created_at),
        INDEX idx_price_created (price, created_at),
        INDEX idx_created_cursor (created_at, id),
        FULLTEXT INDEX idx_name_search (name, description)
      ) ENGINE=InnoDB
    `);
    
    console.log('✓ Created products table with performance indexes');
  };
  
  export const down = async (connection) => {
    await connection.query('DROP TABLE IF EXISTS products');
  };
  