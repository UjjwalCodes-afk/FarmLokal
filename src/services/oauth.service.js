import axios from 'axios';
import redis from '../config/redis.js';

const TOKEN_KEY = 'oauth:token';
const LOCK_KEY = 'oauth:lock';

export async function getAccessToken() {
  try {
    console.log('🔍 OAuth: Checking cache...');
    
    const cached = await redis.get(TOKEN_KEY);
    if (cached) {
      console.log('✅ OAuth: Token cache HIT');
      return cached;
    }

    console.log('❌ OAuth: Cache MISS - fetching from provider');

    // Set lock to prevent concurrent fetches
    const lockSet = await redis.set(LOCK_KEY, '1', {
      NX: true,
      EX: 5
    });

    if (!lockSet) {
      console.log('⏳ OAuth: Waiting for concurrent token fetch...');
      await new Promise(r => setTimeout(r, 100));
      return getAccessToken();
    }

    console.log('🔐 OAuth: Lock acquired, fetching token...');

    try {
      const response = await axios.post(
        process.env.OAUTH_TOKEN_URL || 'https://jsonplaceholder.typicode.com/posts/1',
        {
          client_id: process.env.OAUTH_CLIENT_ID || 'mock_client_id',
          client_secret: process.env.OAUTH_CLIENT_SECRET || 'mock_client_secret',
          grant_type: 'client_credentials'
        },
        { timeout: 5000 }
      );

      const token = response.data.access_token || 'mock-token-' + Date.now();
      const expiresIn = response.data.expires_in || 300;

      console.log(`🎯 OAuth: Token fetched, expires in ${expiresIn}s`);

      // Store in Redis with TTL
      const ttl = Math.max(expiresIn - 30, 60);
      await redis.set(TOKEN_KEY, token, { EX: ttl });
      
      console.log(`💾 OAuth: Token stored in Redis (TTL: ${ttl}s)`);

      // Release lock
      await redis.del(LOCK_KEY);
      console.log('🔓 OAuth: Lock released');

      return token;

    } catch (error) {
      console.error('❌ OAuth: Provider error:', error.message);
      await redis.del(LOCK_KEY);
      
      const fallback = 'mock-token-' + Date.now();
      await redis.set('oauth:token', fallback, { EX: 300 });
      return fallback;
    }

  } catch (error) {
    console.error('❌ OAuth: Unexpected error:', error.message);
    return 'mock-token-' + Date.now();
  }
}

export async function retry(fn, retries = 3, delay = 100) {
  try {
    return await fn();
  } catch (err) {
    if (retries === 0) throw err;
    await new Promise(r => setTimeout(r, delay));
    return retry(fn, retries - 1, delay * 2);
  }
}
