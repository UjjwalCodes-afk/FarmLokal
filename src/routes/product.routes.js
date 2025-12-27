import { Router } from 'express';
import pool from '../config/mysql.js';
import redis from '../config/redis.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    let { cursor = '0', limit = '20', category, minPrice, maxPrice, search, sortBy = 'created_at' } = req.query;
    
    // Parse and validate limit
    limit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    cursor = parseInt(cursor) || 0;
    
    const cacheKey = `products:${category || 'all'}:${minPrice || 0}:${maxPrice || 'max'}:${search || ''}:${sortBy}:${cursor}:${limit}`;

    // Check cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log(`📦 Cache HIT: ${cacheKey}`);
      return res.json(JSON.parse(cached));
    }

    // Build query
    let query = 'SELECT * FROM products WHERE id > ?';
    const params = [cursor];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (minPrice) {
      query += ' AND price >= ?';
      params.push(parseFloat(minPrice));
    }

    if (maxPrice) {
      query += ' AND price <= ?';
      params.push(parseFloat(maxPrice));
    }

    if (search) {
      query += ' AND (name LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // Validate sortBy
    const validSortColumns = ['created_at', 'price', 'name'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    
    query += ` ORDER BY ${sortColumn} ASC, id ASC LIMIT ?`;
    params.push(limit + 1); // Fetch one extra to check if there's next page

    const [rows] = await pool.query(query, params);

    // Check if there's a next page
    const hasNextPage = rows.length > limit;
    const products = hasNextPage ? rows.slice(0, limit) : rows;
    const nextCursor = hasNextPage ? products[products.length - 1].id : null;

    const response = {
      data: products,
      pagination: {
        nextCursor,
        hasNextPage,
        limit,
        count: products.length
      }
    };

    // Cache for 5 minutes
    await redis.set(cacheKey, JSON.stringify(response), { EX: 300 });
    console.log(`💾 Cache SET: ${cacheKey}`);

    res.json(response);
  } catch (err) {
    console.error('Product route error:', err);
    next(err);
  }
});

export default router;
