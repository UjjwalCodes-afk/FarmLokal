import express from 'express';
import { getRedis } from '../config/redis.js';
import { getPool } from '../config/mysql.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { limit, cursor, category, search, sortBy } = req.query;
    
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

    // Parse limit - ensure it's a number
    let limitNum = 20;
    if (limit) {
      const parsed = Number(limit);
      if (!isNaN(parsed) && parsed > 0 && parsed <= 100) {
        limitNum = Math.floor(parsed);
      }
    }

    // Parse cursor (last ID from previous page)
    const cursorId = cursor ? parseInt(cursor) : 0;

    // Try cache first if Redis available
    if (redis) {
      const cacheKey = `products:${category || 'all'}:${search || ''}:${cursorId}:${limitNum}`;
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

    // Build database query
    const queryParams = [];
    let query = 'SELECT id, name, price, category, stock, description FROM products WHERE 1=1';

    // Add cursor condition for pagination
    if (cursorId > 0) {
      query += ' AND id > ?';
      queryParams.push(cursorId);
    }

    if (category) {
      query += ' AND category = ?';
      queryParams.push(category);
    }
    if (search) {
      query += ' AND name LIKE ?';
      queryParams.push(`%${search}%`);
    }

    // Sort by ID for cursor pagination (required)
    query += ' ORDER BY id ASC';

    // Add limit - fetch one extra to check if there's a next page
    query += ` LIMIT ${limitNum + 1}`;

    console.log('Executing query:', query, 'Params:', queryParams);

    // Execute query
    const [rows] = queryParams.length > 0 
      ? await pool.execute(query, queryParams)
      : await pool.query(query);
    
    // Check if there's a next page
    const hasMore = rows.length > limitNum;
    const products = hasMore ? rows.slice(0, limitNum) : rows;
    
    // Get next cursor (last product ID)
    const nextCursor = hasMore && products.length > 0 
      ? products[products.length - 1].id 
      : null;

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
    
    const [countResult] = countParams.length > 0
      ? await pool.execute(countQuery, countParams)
      : await pool.query(countQuery);
    
    const totalCount = countResult[0].total;

    const response = {
      data: products,
      cursor: nextCursor,
      hasMore: hasMore,
      total: totalCount,
      count: products.length,
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
        const cacheKey = `products:${category || 'all'}:${search || ''}:${cursorId}:${limitNum}`;
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
