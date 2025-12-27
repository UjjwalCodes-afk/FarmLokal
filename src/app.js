import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';

import productRoutes from './routes/product.routes.js';
import externalRoutes from './routes/external.routes.js';
import webhookRoutes from './routes/webhook.routes.js';
import rateLimiter from './middleware/rateLimiter.js';
import errorMiddleware from './middleware/error.middleware.js';

dotenv.config();

const app = express();

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(rateLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Routes
app.use('/api/products', productRoutes);
app.use('/api/external', externalRoutes);
app.use('/api/webhooks', webhookRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use(errorMiddleware);

export default app;
