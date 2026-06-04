require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

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

// ==================== SOCKET.IO ====================
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});
// Attach Socket.IO instance to app so routers/controllers can access it
app.set('io', io);

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

// ==================== SOCKET.IO HANDLERS ====================
const { buildOrderInlineKeyboard, sendTelegramMessage } = require('./helpers/telegram');

io.on('connection', (socket) => {
  console.log('[SOCKET] Client connected:', socket.id);

  socket.on('submit_order', async (order) => {
    console.log('[SOCKET] New order received:', order.id);

    order.id = order.id || 'order_' + Date.now();
    order.createdAt = new Date();
    order.updatedAt = new Date();
    
    // Save to MongoDB if connected (fails silently if DB not connected)
    try {
      await Order.findOneAndUpdate({ id: order.id }, { $set: order }, { upsert: true, new: true });
    } catch (e) {
      console.warn('[SOCKET] Failed to save order to MongoDB:', e.message);
    }

    io.emit('admin_new_order', order);

    const customerName = order.customerName || order.name || '-';
    const phone = order.customerPhone || order.phone || '-';
    const email = order.customerEmail || order.email || '-';
    const orderId = order.id || '-';
    const pickupDate = order.pickupDate || '-';
    const pickupTime = order.pickupTime || order.pickupTimeDisplay || '-';
    const pickupDisplay = pickupTime === 'asap' ? 'So schnell wie möglich' : pickupTime;
    const method = order.method === 'delivery' ? '🚴 Lieferung' : '🏪 Abholung';
    const address = order.address && order.address !== 'Abholung / Vor Ort' ? order.address : null;
    const notes = (order.notes || '').trim();
    const total = order.total ? `${order.total.replace('.', ',')} €` : '-';
    const itemCount = order.itemCount || '-';
    const itemsSource = order.items || order.cart || [];
    
    let itemsDetail = '';
    if (itemsSource.length > 0) {
      itemsSource.forEach(i => {
        const qty = parseInt(i.quantity) || 1;
        const price = i.price ? ` — ${i.price}` : '';
        itemsDetail += `\n  ▸ ${i.name || '-'} x${qty}${price}`;
      });
    } else {
      itemsDetail = '\n  (keine Details)';
    }
    const formattedDate = pickupDate !== '-' ? pickupDate.split('-').reverse().join('.') : '-';

    const telegramMsg = `🍣 NEUE BESTELLUNG\n\n━━━━━━━━━━━━━━━\n📋 BESTELL-NR.: ${orderId}\n━━━━━━━━━━━━━━━\n👤 Kunde: ${customerName}\n📞 Telefon: ${phone}\n📧 E-Mail: ${email}\n━━━━━━━━━━━━━━━\n🏪 Bestellart: ${method}\n${address ? `📍 Adresse: ${address}\n` : ''}━━━━━━━━━━━━━━━\n🗓 Datum: ${formattedDate}\n🕒 Abholzeit: ${pickupDisplay}\n━━━━━━━━━━━━━━━\n${notes ? `⚠️ ALLERGIEN / WÜNSCHE:\n  ${notes}\n━━━━━━━━━━━━━━━\n` : ''}📋 Bestellte Artikel:${itemsDetail}\n━━━━━━━━━━━━━━━\n🛒 Anzahl: ${itemCount} Gerichte\n━━━━━━━━━━━━━━━\n💰 Gesamtbetrag: ${total}\n━━━━━━━━━━━━━━━\nStatus: NEU`;

    sendTelegramMessage(telegramMsg, buildOrderInlineKeyboard(orderId));
  });

  socket.on('submit_reservation', async (resv) => {
    console.log('[SOCKET] New reservation received:', resv.name);
    resv.id = resv.id || 'res_' + Date.now();
    resv.createdAt = new Date();
    
    try {
      await Order.findOneAndUpdate({ id: resv.id }, { $set: resv }, { upsert: true, new: true });
    } catch (e) {
      console.warn('[SOCKET] Failed to save reservation to MongoDB:', e.message);
    }
    
    io.emit('admin_new_reservation', resv);
  });

  socket.on('disconnect', () => {
    console.log('[SOCKET] Client disconnected:', socket.id);
  });
});

// ==================== STATIC FILES ====================
app.use(express.static('.'));

app.get('*', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 3010;

if (!process.env.VERCEL) {
  async function start() {
    await connectDB();

    server.listen(PORT, () => {
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
