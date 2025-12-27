import axios from 'axios';
import redis from '../config/redis.js';

const TOKEN_KEY = 'oauth:token';
const LOCK_KEY = 'oauth:lock';

export async function getAccessToken() {
  const cached = await redis.get(TOKEN_KEY);
  if (cached) return cached;

  const lock = await redis.set(LOCK_KEY, '1', { NX: true, EX: 5 });

  if (!lock) {
    await new Promise(r => setTimeout(r, 100));
    return getAccessToken();
  }

  const response = await axios.post(process.env.OAUTH_URL, {
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
    grant_type: 'client_credentials'
  });

  const token = response.data.access_token || 'mock-token';

  await redis.set(TOKEN_KEY, token, { EX: 300 });
  await redis.del(LOCK_KEY);

  return token;
}
