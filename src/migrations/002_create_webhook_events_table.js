export const up = async (connection) => {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS webhook_events (
        id VARCHAR(255) PRIMARY KEY,
        event_type VARCHAR(100) NOT NULL,
        payload JSON,
        processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        INDEX idx_event_type (event_type),
        INDEX idx_created (created_at)
      ) ENGINE=InnoDB
    `);
    
    console.log('✓ Created webhook_events table for idempotency');
  };
  
  export const down = async (connection) => {
    await connection.query('DROP TABLE IF EXISTS webhook_events');
  };
  