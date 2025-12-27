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
        // Ignore cache errors
      }
    }

    // Try real database query if pool available
    if (pool) {
      try {
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
          const validSorts = ['name', 'price', 'category', 'stock'];
          if (validSorts.includes(sortBy)) {
            query += ` ORDER BY ${sortBy}`;
          }
        }

        query += ' LIMIT ?';
        queryParams.push(parseInt(limit));

        const [rows] = await pool.execute(query, queryParams);
        
        const response = {
          data: rows,
          cursor: null,
          total: rows.length,
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

        return res.json(response);
      } catch (dbError) {
        console.warn('Database query failed, using demo data:', dbError.message);
        // Fall through to demo data
      }
    }

    // Demo data (no DB or DB query failed)
    const allDemoProducts = [
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
      },
      { 
        id: 6, 
        name: 'Fresh Mangoes', 
        price: 150, 
        category: 'fruits', 
        stock: 50,
        description: 'Alphonso mangoes from Maharashtra'
      },
      { 
        id: 7, 
        name: 'Green Capsicum', 
        price: 60, 
        category: 'vegetables', 
        stock: 90,
        description: 'Fresh bell peppers'
      },
      { 
        id: 8, 
        name: 'Bananas', 
        price: 40, 
        category: 'fruits', 
        stock: 200,
        description: 'Ripe bananas'
      }
    ];

    // Filter demo data by category if specified
    let filteredData = allDemoProducts;
    if (category) {
      filteredData = filteredData.filter(p => p.category === category);
    }
    if (search) {
      filteredData = filteredData.filter(p => 
        p.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Apply limit
    filteredData = filteredData.slice(0, parseInt(limit));

    const demoData = {
      data: filteredData,
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

    res.json(demoData);

  } catch (error) {
    console.error('Products API Error:', error);
    res.status(500).json({ 
      error: error.message,
      message: 'Internal server error'
    });
  }
});

export default router;
