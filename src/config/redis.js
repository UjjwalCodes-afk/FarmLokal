import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'redis',
    port: process.env.REDIS_PORT || 6379
  }
});

redisClient.on('connect', () => {
  console.log('✓ Redis connected');
});

redisClient.on('error', (err) => {
  console.error('✗ Redis error:', err.message);
});

await redisClient.connect();

export default redisClient;
