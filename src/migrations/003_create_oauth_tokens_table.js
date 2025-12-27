export const up = async (connection) => {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS oauth_tokens (
        provider VARCHAR(100) PRIMARY KEY,
        access_token TEXT NOT NULL,
        token_type VARCHAR(50) DEFAULT 'Bearer',
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB
    `);
    
    console.log('✓ Created oauth_tokens table');
  };
  
  export const down = async (connection) => {
    await connection.query('DROP TABLE IF EXISTS oauth_tokens');
  };
  