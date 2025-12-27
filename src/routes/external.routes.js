import { Router } from 'express';
import axios from 'axios';
import { getAccessToken, retry } from '../services/oauth.service.js';

const router = Router();


router.get('/data', async (req, res, next) => {
  try {
    const token = await getAccessToken();

    const fetchData = async () => {
      return axios.get('https://jsonplaceholder.typicode.com/posts?_limit=10', {
        timeout: 5000,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    };

    const response = await retry(fetchData, 3, 100);

    res.json({
      source: 'API A (Synchronous)',
      data: response.data,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
});

export default router;
