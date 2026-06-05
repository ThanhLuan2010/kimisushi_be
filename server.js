require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// ==================== DATABASE ====================
const { connectDB, mongoose } = require('./db');
const Order = require('./models/Order');

// ==================== MIDDLEWARE ====================
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Ensure DB connection before processing requests on Vercel
app.use(async (req, res, next) => {
  if (process.env.VERCEL) {
    try {
      await connectDB();
      if (mongoose.connection.readyState !== 1) {
        return res.status(500).json({ 
          success: false, 
          error: 'Lỗi kết nối Database trên Vercel. Hãy kiểm tra biến môi trường MONGODB_URL trong Vercel Settings và đảm bảo Network Access của MongoDB Atlas đã cho phép IP 0.0.0.0/0 (Allow Access from Anywhere).' 
        });
      }
    } catch (e) {
      console.error('[MongoDB] Vercel auto-connect failed:', e.message);
      return res.status(500).json({ success: false, error: 'Database connection failed: ' + e.message });
    }
  }
  next();
});


// ==================== ROUTERS ====================
const authRouter = require('./routes/auth');
const logRouter = require('./routes/log');
const settingsRouter = require('./routes/settings');
const menuRouter = require('./routes/menu');
const comboRouter = require('./routes/combo');
const tableRouter = require('./routes/table');
const inboxRouter = require('./routes/inbox');
const faqRouter = require('./routes/faq');
const analyticsRouter = require('./routes/analytics');
const telegramRouter = require('./routes/telegram');
const mailRouter = require('./routes/mail');
const fcmRouter = require('./routes/fcm');
// Health endpoint
app.get('/api/health', async (req, res) => {
  res.json({
    status: 'ok',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    gmail: {
      enabled: process.env.GMAIL_ENABLED === 'true',
      user: process.env.GMAIL_USER ? '***' + process.env.GMAIL_USER.slice(-10) : null,
    },
    timestamp: new Date().toISOString()
  });
});

// Mounting routers
app.use('/api/admin', authRouter);
app.use('/api/admin', logRouter);
app.use('/api/admin/settings', settingsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/menu', menuRouter);
app.use('/api/combos', comboRouter);
app.use('/api/tables', tableRouter);
app.use('/api/inbox', inboxRouter);
app.use('/api/faq', faqRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/fcm', fcmRouter);
app.use('/api', telegramRouter);
app.use('/api', mailRouter);

// ==================== SEO FILES ====================
app.get('/sitemap.xml', (req, res) => {
  const baseUrl = process.env.VPS_DOMAIN || 'https://kimisushi.de';
  const today = new Date().toISOString().split('T')[0];
  let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
  sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  sitemap += `  <url><loc>${baseUrl}/</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>\n`;
  sitemap += `  <url><loc>${baseUrl}/#menu</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>\n`;
  sitemap += `  <url><loc>${baseUrl}/#about</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>\n`;
  sitemap += `  <url><loc>${baseUrl}/#contact</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.5</priority></url>\n`;
  sitemap += '</urlset>';
  res.type('application/xml').send(sitemap);
});

app.get('/robots.txt', (req, res) => {
  const baseUrl = process.env.VPS_DOMAIN || 'https://kimisushi.de';
  res.type('text').send(`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin\nSitemap: ${baseUrl}/sitemap.xml\n`);
});


// ==================== STATIC FILES ====================
app.use(express.static('.'));

// Root endpoint for easy verification
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🍣 Kimi Sushi API is running successfully!',
    environment: process.env.VERCEL ? 'vercel' : 'local',
    timestamp: new Date().toISOString()
  });
});

app.get('*', (req, res) => {
  res.sendFile(__dirname + '/index.html', (err) => {
    if (err) {
      res.status(404).send('Not Found');
    }
  });
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 3010;

if (!process.env.VERCEL) {
  async function start() {
    await connectDB();

    app.listen(PORT, () => {
      console.log('');
      console.log('===========================================');
      console.log('🍣 Kimi Sushi Server đang chạy!');
      console.log(`🌐 http://localhost:${PORT}`);
      console.log(`📊 MongoDB: ${mongoose.connection.readyState === 1 ? '✅ Connected' : '⚠️ Disconnected (offline mode)'}`);
      console.log('===========================================');
      console.log('');
      console.log('[CONFIG] Gmail Settings:');
      console.log(`  GMAIL_ENABLED: ${process.env.GMAIL_ENABLED === 'true' ? '✅ Bật' : '❌ Tắt'}`);
      console.log(`  GMAIL_USER: ${process.env.GMAIL_USER || '❌ Chưa cấu hình'}`);
      console.log(`  GMAIL_APP_PASSWORD: ${process.env.GMAIL_APP_PASSWORD ? '✅ Đã cấu hình' : '❌ Chưa cấu hình'}`);
    });
  }

  start();
} else {
  // On Vercel, DB connection is handled by the middleware
}

// Export the app for Vercel Serverless
module.exports = app;
