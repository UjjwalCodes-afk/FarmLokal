import express from 'express';
import { getRedis } from '../config/redis.js';
import { getPool } from '../config/mysql.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { limit = 20, cursor = null, category, search, sortBy = 'name' } = req.query;
    
    // Get redis and pool (both might be null)
    const redis = await getRedis();
    const pool = await getPool();

    // Try cache first if Redis available
    if (redis) {
      const cacheKey = `products:${category || 'all'}:${search || ''}:${cursor || '0'}:${limit}`;
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          console.log('✅ Cache hit');
          return res.json(JSON.parse(cached));
        }
      } catch (cacheErr) {
        console.warn('Cache read error:', cacheErr.message);
      }
    }

    // If no database, return realistic demo data
    if (!pool) {
      const demoData = {
        data: [
          { 
            id: 1, 
            name: 'Organic Tomatoes', 
            price: 50, 
            category: 'vegetables', 
            stock: 100,
            description: 'Fresh organic tomatoes from local farms'
          },
          { 
            id: 2, 
            name: 'Fresh Potatoes', 
            price: 30, 
            category: 'vegetables', 
            stock: 250,
            description: 'Red potatoes, perfect for curries'
          },
          { 
            id: 3, 
            name: 'Red Carrots', 
            price: 40, 
            category: 'vegetables', 
            stock: 180,
            description: 'Sweet and crunchy carrots'
          },
          { 
            id: 4, 
            name: 'Yellow Onions', 
            price: 35, 
            category: 'vegetables', 
            stock: 120,
            description: 'Fresh yellow onions'
          },
          { 
            id: 5, 
            name: 'Royal Gala Apples', 
            price: 120, 
            category: 'fruits', 
            stock: 75,
            description: 'Sweet and crisp apples'
          }
        ],
        cursor: null,
        total: 1000000,
        filters: {
          category: category || 'all',
          search: search || '',
          limit: parseInt(limit)
        },
        message: '📢 Running in demo mode (database unavailable)'
      };

      // Cache demo data if Redis available (5 min TTL)
      if (redis) {
        try {
          const cacheKey = `products:${category || 'all'}:${search || ''}:${cursor || '0'}:${limit}`;
          await redis.setEx(cacheKey, 300, JSON.stringify(demoData));
        } catch (cacheErr) {
          // Ignore cache write errors
        }
      }

      return res.json(demoData);
    }

    // Real database query (when DB available)
    const queryParams = [parseInt(limit)];
    let query = `
      SELECT id, name, price, category, stock, description 
      FROM products 
      WHERE 1=1
    `;

    if (category) {
      query += ' AND category = ?';
      queryParams.push(category);
    }
    if (search) {
      query += ' AND name LIKE ?';
      queryParams.push(`%${search}%`);
    }

    if (sortBy) {
      query += ` ORDER BY ${sortBy}`;
    }

    query += ' LIMIT ?';

    const [rows] = await pool.execute(query, queryParams);
    
    const response = {
      data: rows,
      cursor: null, // Add cursor pagination later
      total: 1000000,
      filters: {
        category: category || 'all',
        search: search || '',
        limit: parseInt(limit)
      },
      message: '✅ Data from database'
    };

    // Cache results if Redis available (5 min TTL)
    if (redis) {
      try {
        const cacheKey = `products:${category || 'all'}:${search || ''}:${cursor || '0'}:${limit}`;
        await redis.setEx(cacheKey, 300, JSON.stringify(response));
      } catch (cacheErr) {
        // Ignore cache write errors
      }
    }

    res.json(response);

  } catch (error) {
    console.error('Products API Error:', error);
    res.status(500).json({ 
      error: error.message,
      message: 'Internal server error'
    });
  }
});

export default router;
