import { Router } from 'express';
import pool from '../config/mysql.js';
import redis from '../config/redis.js';

const router = Router();

// Replace the ENTIRE GET '/' handler (around line 18) with this:
router.get('/', async (req, res) => {
  try {
    const { limit = 20, cursor = null, category, search, sortBy = 'name' } = req.query;
    
    // Get redis and pool (both might be null)
    const redis = await getRedis();
    const pool = await getPool();

    // Try cache first if Redis available
    if (redis) {
      const cacheKey = `products:${category || 'all'}:${search || ''}:${cursor || '0'}`;
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          console.log('✅ Cache hit');
          return res.json(JSON.parse(cached));
        }
      } catch (cacheErr) {
        console.warn('Cache error:', cacheErr.message);
      }
    }

    // If no database, return demo data
    if (!pool) {
      const demoData = {
        data: [
          { id: 1, name: 'Tomatoes', price: 50, category: 'vegetables' },
          { id: 2, name: 'Potatoes', price: 30, category: 'vegetables' },
          { id: 3, name: 'Carrots', price: 40, category: 'vegetables' },
          { id: 4, name: 'Onions', price: 35, category: 'vegetables' },
          { id: 5, name: 'Apples', price: 120, category: 'fruits' }
        ],
        cursor: null,
        total: 1000000,
        message: '📢 Running in demo mode (database unavailable)'
      };

      // Cache demo data if Redis available
      if (redis) {
        try {
          const cacheKey = `products:${category || 'all'}:${search || ''}:${cursor || '0'}`;
          await redis.setEx(cacheKey, 300, JSON.stringify(demoData));
        } catch (cacheErr) {
          // Ignore cache errors
        }
      }

      return res.json(demoData);
    }

    // TODO: Real database query when DB is available
    const response = {
      data: [],
      cursor: null,
      message: '✅ Database connected - add your query here'
    };

    res.json(response);

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      error: error.message,
      message: 'Internal server error'
    });
  }
});


export default router;
