import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`\n🚀 FarmLokal API running on http://localhost:${PORT}`);
  console.log(`📊 Health: http://localhost:${PORT}/health`);
  console.log(`📦 Products: http://localhost:${PORT}/api/products`);
  console.log(`🔗 External API: http://localhost:${PORT}/api/external`);
  console.log(`🪝 Webhooks: http://localhost:${PORT}/api/webhooks\n`);
});
