import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

let redisClient = null;
let connecting = false;

export async function getRedis() {

  if (process.env.NODE_ENV === 'production' && !process.env.REDIS_HOST) {
    return null;
  }


  if (redisClient && redisClient.isOpen) return redisClient;


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
        reconnectStrategy: false  // ← CRITICAL: Disable auto-reconnect
      }
    });

    redisClient.on('error', (err) => {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('⚠️  Redis error:', err.message);
      }
    });


    if (process.env.REDIS_HOST) {
      await redisClient.connect();
      console.log('✅ Redis connected');
    }
    
    connecting = false;
    return redisClient;
  } catch (err) {
    console.warn('⚠️  Redis unavailable:', err.message);
    connecting = false;
    redisClient = null;
    return null;
  }
}

export default { getRedis };
