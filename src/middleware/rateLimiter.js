import rateLimit from 'express-rate-limit';

export default rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 100,              // 100 requests per minute
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});
