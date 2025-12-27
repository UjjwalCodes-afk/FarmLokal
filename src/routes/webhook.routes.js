import { Router } from 'express';
import redis from '../config/redis.js';
import pool from '../config/mysql.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Handle webhook events with idempotency
router.post('/event', async (req, res, next) => {
  try {
    const { eventId, eventType, payload } = req.body;
    
    if (!eventId) {
      return res.status(400).json({ error: 'eventId is required' });
    }

    // Check if already processed (idempotency)
    const key = `webhook:event:${eventId}`;
    const alreadyProcessed = await redis.get(key);
    
    if (alreadyProcessed) {
      console.log(`⊘ Webhook already processed: ${eventId}`);
      return res.json({ status: 'already_processed' });
    }

    // Mark as processing
    await redis.set(key, 'processed', { EX: 86400 });

    // Store in database
    await pool.query(
      `INSERT INTO webhook_events (id, event_type, payload) VALUES (?, ?, ?)`,
      [eventId, eventType || 'unknown', JSON.stringify(payload || {})]
    );

    console.log(`✓ Webhook processed: ${eventId}`);
    res.json({ status: 'processed', eventId });
  } catch (err) {
    next(err);
  }
});

export default router;
