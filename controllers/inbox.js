const Order = require('../models/Order');
const Settings = require('../models/Settings');
const { resolveAsapPickup } = require('../helpers/dateUtils');
const { sendGmailNotification } = require('../helpers/mail');
const { buildOrderInlineKeyboard, sendTelegramMessage } = require('../helpers/telegram');
const FcmToken = require('../models/FcmToken');
const { sendPushNotification } = require('../helpers/firebase');

async function getSettingsObj() {
  try {
    let settings = await Settings.findOne({});
    if (!settings) {
      settings = await Settings.create({
        brandName: 'Kimi Sushi',
        seoTitle: 'Kimi Sushi | Frisches Sushi & Authentische Japanische Küche',
        seoDescription: 'Genießen Sie frisches, hochwertiges Sushi bei Kimi Sushi in Filderstadt.',
        hoursSummary: 'Mo-Sa: 11:00-15:00 & 17:00-22:00 | So: 17:00-22:00',
        hoursMon1: '11:00 - 15:00', hoursMon2: '17:00 - 22:00',
        hoursTue1: '11:00 - 15:00', hoursTue2: '17:00 - 22:00',
        hoursWed1: '11:00 - 15:00', hoursWed2: '17:00 - 22:00',
        hoursThu1: '11:00 - 15:00', hoursThu2: '17:00 - 22:00',
        hoursFri1: '11:00 - 15:00', hoursFri2: '17:00 - 22:00',
        hoursSat1: '11:00 - 15:00', hoursSat2: '17:00 - 22:00',
        hoursSun1: '17:00 - 22:00', hoursSun2: '',
        deliveryEnabled: false,
        taxRate1: '19', taxRate2: '7'
      });
    }
    return settings.toObject();
  } catch (e) {
    console.error('[SETTINGS] getSettingsObj error:', e);
    return {};
  }
}

async function getInbox(req, res) {
  try {
    const { type, status, limit = 50 } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;

    const items = await Order.find(filter).sort({ createdAt: -1 }).limit(parseInt(limit));
    res.json({ success: true, count: items.length, items });
  } catch (e) {
    console.error('[API] GET /api/inbox error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
}

async function updateInboxStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { tableId } = req.body;

    const existingOrder = await Order.findOne({ id });
    if (!existingOrder) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });

    const oldStatus = existingOrder.status;
    const isStatusChanged = oldStatus !== status;

    const updateData = { status, updatedAt: new Date() };
    if (tableId) updateData.tableId = tableId;

    const order = await Order.findOneAndUpdate(
      { id },
      { $set: updateData },
      { new: true }
    );

    if (status === 'confirmed' && tableId) {
      const Table = require('../models/Table');
      await Table.findOneAndUpdate(
        { id: tableId },
        { $set: { status: 'reserved', reservedFor: order.customerName || order.name, reservedTime: order.time, updatedAt: new Date() } }
      );
    }

    if (isStatusChanged) {
      const { sendCustomerStatusEmail } = require('../helpers/mail');
      const settings = await getSettingsObj();
      const gmailCfg = {
        gmailEnabled: settings.gmailEnabled || process.env.GMAIL_ENABLED === 'true',
        gmailUser: settings.gmailUser || process.env.GMAIL_USER,
        gmailPassword: settings.gmailPassword || process.env.GMAIL_APP_PASSWORD,
        phone: settings.phone
      };

      sendCustomerStatusEmail(order, oldStatus, status, gmailCfg).catch(err => {
        console.error('[GMAIL-CUSTOMER] Error sending status change email:', err);
      });
    }

    res.json({ success: true, order });
  } catch (e) {
    console.error('[API] PUT /api/inbox/:id/status error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
}

async function createInboxItem(req, res) {
  try {
    const item = req.body;

    if (!item.id) {
      item.id = (item.type === 'reservation' ? 'res_' : 'order_') + Date.now();
    }
    item.createdAt = new Date();
    item.updatedAt = new Date();

    // Map fields for Mongoose Schema strict mode
    if (item.name) item.customerName = item.name;
    if (item.phone) item.customerPhone = item.phone;
    if (item.email) item.customerEmail = item.email;
    if (item.message) item.notes = item.message;

    // ASAP resolution — using shared dateUtils for consistent Europe/Berlin timezone
    if (item.type !== 'reservation' && item.pickupTime === 'asap') {
      const settings = await getSettingsObj();
      const resolved = resolveAsapPickup(settings);
      item.pickupDate = resolved.pickupDate;
      item.pickupTime = resolved.pickupTime;
      item.pickupTimeDisplay = resolved.pickupTimeDisplay;
    }

    // Upsert: update if exists, create if not
    const savedOrder = await Order.findOneAndUpdate(
      { id: item.id },
      { $set: item },
      { upsert: true, new: true }
    );

    // Gmail notification
    const gmailCfg = {
      gmailEnabled: item.gmailEnabled || process.env.GMAIL_ENABLED === 'true',
      gmailUser: item.gmailUser || process.env.GMAIL_USER,
      gmailPassword: item.gmailPassword || process.env.GMAIL_APP_PASSWORD,
      gmailNotifyEmail: item.gmailNotifyEmail || process.env.GMAIL_NOTIFY_EMAIL || process.env.GMAIL_USER
    };
    
    if (gmailCfg.gmailEnabled && gmailCfg.gmailUser && gmailCfg.gmailPassword) {
      sendGmailNotification(item, gmailCfg).catch(err => {
        console.error('[AUTO-GMAIL] Error:', err);
      });
    }

    // Telegram notification
    const isReservation = item.type === 'reservation';
    const customerName = item.name || item.customerName || '-';
    const phone = item.phone || item.customerPhone || '-';
    const customerEmail = item.email || item.customerEmail || '-';
    const status = item.status || 'neu';

    let telegramMsg;
    if (isReservation) {
      const guests = item.guests || item.persons || '-';
      const notes = item.notes || item.remark || '-';
      const resDate = item.date || '-';
      const resTime = item.time || '-';
      const fmtDate = resDate !== '-' ? resDate.split('-').reverse().join('.') : '-';
      const fmtTime = resTime !== '-' ? `${resTime} Uhr` : '-';

      telegramMsg = `📅 NEUE TISCHRESERVIERUNG\n\n━━━━━━━━━━━━━━━\n🔖 Nr.: ${item.id || '-'}\n👤 Kunde: ${customerName}\n📞 Telefon: ${phone}\n📧 E-Mail: ${customerEmail}\n━━━━━━━━━━━━━━━\n🗓 Datum: ${fmtDate}\n🕒 Uhrzeit: ${fmtTime}\n👥 Personen: ${guests}\n━━━━━━━━━━━━━━━\n📝 Anmerkung: ${notes}\n━━━━━━━━━━━━━━━\nStatus: ${status.toUpperCase()}`;
    } else {
      const total = item.total ? `${item.total.replace('.', ',')} €` : '-';
      const method = item.method === 'delivery' ? '🚴 Lieferung' : '🏪 Abholung';
      const address = item.address && item.address !== 'Abholung / Vor Ort' ? item.address : '-';
      const orderDate = item.date || item.pickupDate || '-';
      const orderTime = item.time || item.pickupTime || item.pickupTimeDisplay || '-';
      const timeDisplay = orderTime === 'asap' ? 'So schnell wie möglich' : orderTime;

      let itemsDetail = '';
      const src = item.items || item.cart || [];
      if (src.length > 0) {
        src.forEach(i => {
          const qty = i.quantity || 1;
          const price = i.price ? ` — ${i.price}` : '';
          itemsDetail += `\n  ▸ ${i.name || '-'} x${qty}${price}`;
        });
      }

      telegramMsg = `🍣 NEUE BESTELLUNG\n\n━━━━━━━━━━━━━━━\n📋 BESTELL-NR.: ${item.id || '-'}\n━━━━━━━━━━━━━━━\n👤 Kunde: ${customerName}\n📞 Telefon: ${phone}\n📧 E-Mail: ${customerEmail}\n━━━━━━━━━━━━━━━\n🏪 Bestellart: ${method}\n${item.method === 'delivery' ? `📍 Adresse: ${address}\n` : ''}━━━━━━━━━━━━━━━\n🗓 Datum: ${orderDate !== '-' ? orderDate.split('-').reverse().join('.') : '-'}\n🕒 Abholzeit: ${timeDisplay}\n━━━━━━━━━━━━━━━\n${item.notes && item.notes.trim() ? `⚠️ ALLERGIEN / WÜNSCHE:\n  ${item.notes.trim()}\n━━━━━━━━━━━━━━━\n` : ''}📋 Bestellte Artikel:${itemsDetail || '\n  (keine Details)'}\n━━━━━━━━━━━━━━━\n💰 Gesamtbetrag: ${total}\n━━━━━━━━━━━━━━━\nStatus: ${status.toUpperCase()}`;
    }

    // Only orders get inline action buttons
    const replyMarkup = isReservation ? undefined : buildOrderInlineKeyboard(item.id);
    sendTelegramMessage(telegramMsg, replyMarkup);

    // Send Firebase Push Notification
    const tokensDoc = await FcmToken.find({}, 'token');
    if (tokensDoc.length > 0) {
      const tokens = tokensDoc.map(t => t.token);
      if (isReservation) {
        await sendPushNotification(tokens, '📅 Neue Reservierung!', `Tischreservierung von ${customerName || '-'}`);
      } else {
        const total = item.total ? `${item.total.replace('.', ',')} €` : '-';
        await sendPushNotification(tokens, '🍣 Neue Bestellung!', `Bestellung #${item.id || '-'} von ${customerName || '-'} (${total})`);
      }
    }

    res.json({ success: true, id: item.id });
  } catch (e) {
    console.error('[API] POST /api/inbox error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
}

module.exports = {
  getInbox,
  createInboxItem,
  updateInboxStatus,
  getSettingsObj
};
