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

    // Check if database is available
    if (!pool) {
      return res.status(503).json({
        error: 'Database unavailable',
        message: 'Please check database connection'
      });
    }

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
        // Ignore cache errors
      }
    }

    // Parse limit properly
    const limitNum = Math.min(Math.max(parseInt(limit) || 20, 1), 100); // Between 1-100

    // Build database query
    const queryParams = [];
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
      const validSorts = ['name', 'price', 'category', 'stock', 'id'];
      if (validSorts.includes(sortBy)) {
        query += ` ORDER BY ${sortBy}`;
      }
    }

    query += ' LIMIT ?';
    queryParams.push(limitNum); // ← Use limitNum (guaranteed number)

    // Execute query
    const [rows] = await pool.execute(query, queryParams);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM products WHERE 1=1';
    const countParams = [];
    if (category) {
      countQuery += ' AND category = ?';
      countParams.push(category);
    }
    if (search) {
      countQuery += ' AND name LIKE ?';
      countParams.push(`%${search}%`);
    }
    
    const [countResult] = await pool.execute(countQuery, countParams);
    const totalCount = countResult[0].total;

    const response = {
      data: rows,
      cursor: null,
      total: totalCount,
      count: rows.length,
      filters: {
        category: category || 'all',
        search: search || '',
        limit: limitNum
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
      message: 'Error fetching products from database'
    });
  }
});


export default router;
