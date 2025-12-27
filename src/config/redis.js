import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

let redisClient = null;
let connecting = false;

export async function getRedis() {
  // If no Redis config, return null (demo mode)
  if (!process.env.REDIS_HOST && process.env.NODE_ENV === 'production') {
    console.warn('⚠️  No Redis configured - running in demo mode');
    return null;
  }

  // Already connected
  if (redisClient && redisClient.isOpen) return redisClient;

  // Prevent concurrent connection attempts
  if (connecting) {
    while (!redisClient?.isOpen && connecting) {
      await new Promise(r => setTimeout(r, 100));
    }
    return redisClient;
  }

  connecting = true;

  try {
    redisClient = createClient({
      socket: {
        host: process.env.REDIS_HOST || 'redis',
        port: process.env.REDIS_PORT || 6379,
        reconnectStrategy: (retries) => Math.min(retries * 50, 500)
      }
    });

    redisClient.on('error', (err) => {
      console.warn('⚠️  Redis error:', err.message);
    });

    await redisClient.connect();
    console.log('✅ Redis connected');
    connecting = false;
    return redisClient;
  } catch (err) {
    console.warn('⚠️  Redis unavailable:', err.message);
    connecting = false;
    return null;
  }
}

export default { getRedis };
