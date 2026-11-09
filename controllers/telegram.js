const Order = require('../models/Order');
const Settings = require('../models/Settings');
const FcmToken = require('../models/FcmToken');
const { sendPushNotification } = require('../helpers/firebase');
const { sendCustomerStatusEmail } = require('../helpers/mail');
const {
  escapeHtml,
  getTelegramCredentials,
  buildOrderInlineKeyboard,
  buildCookingOrderInlineKeyboard,
  buildReservationInlineKeyboard,
  buildConfirmedReservationInlineKeyboard,
  sendTelegramMessage,
  editTelegramMessage,
  answerCallbackQuery
} = require('../helpers/telegram');

async function handleWebhook(req, res) {
  try {
    const update = req.body;
    const { token } = await getTelegramCredentials();

    // 1. Handle incoming text message (e.g. /start, /id, /setchat)
    if (update.message && update.message.text) {
      const { chat, text, from } = update.message;
      const cmd = (text || '').trim().toLowerCase();

      if (cmd.startsWith('/start') || cmd.startsWith('/id') || cmd.startsWith('/chatid')) {
        const replyText = `👋 <b>Xin chào ${escapeHtml(from?.first_name || 'bạn')}!</b>\n\n` +
          `🤖 Bot thông báo <b>Kimi Sushi</b> đã được kết nối.\n\n` +
          `🆔 <b>Chat ID của cuộc trò chuyện này là:</b>\n` +
          `<code>${chat.id}</code>\n` +
          `<i>(Loại chat: ${chat.type})</i>\n\n` +
          `👉 <b>Để nhận thông báo đặt bàn và đặt món tại đây:</b>\n` +
          `Hãy gửi lệnh <code>/setchat</code> ngay tại cuộc trò chuyện này!`;

        await sendTelegramMessage(replyText, null, token, chat.id);
        return res.status(200).json({ ok: true });
      }

      if (cmd.startsWith('/setchat')) {
        await Settings.findOneAndUpdate({}, { $set: { telegramChatId: String(chat.id), updatedAt: new Date() } }, { upsert: true });
        process.env.TELEGRAM_CHAT_ID = String(chat.id);

        const replyText = `✅ <b>ĐÃ CÀI ĐẶT THÀNH CÔNG!</b>\n\n` +
          `Kênh này (Chat ID: <code>${chat.id}</code>) đã được lưu làm nơi nhận thông báo đơn đặt món và đặt bàn của <b>Kimi Sushi</b>.\n\n` +
          `<i>Dưới đây là một tin nhắn mẫu kiểm tra định dạng hiển thị:</i>`;

        await sendTelegramMessage(replyText, null, token, chat.id);

        // Gửi ngay 1 tin nhắn test mẫu để chủ quán xem
        const sampleOrderMsg = `🍣 <b>NEUE BESTELLUNG (ĐƠN ĐẶT MÓN MẪU)</b>\n\n` +
          `━━━━━━━━━━━━━━━\n` +
          `📋 <b>MÃ ĐƠN:</b> <code>#order_demo_1234</code>\n` +
          `━━━━━━━━━━━━━━━\n` +
          `👤 <b>Khách hàng:</b> Test Customer\n` +
          `📞 <b>Điện thoại:</b> 0152 1234 5678\n` +
          `📧 <b>E-Mail:</b> customer@example.com\n` +
          `━━━━━━━━━━━━━━━\n` +
          `🏪 <b>Hình thức:</b> 🏪 Abholung (Tự lấy)\n` +
          `🗓 <b>Ngày:</b> Hôm nay\n` +
          `🕒 <b>Thời gian:</b> 20 phút\n` +
          `━━━━━━━━━━━━━━━\n` +
          `📋 <b>Món đã đặt:</b>\n` +
          `  ▸ <b>Salmon Nigiri</b> x2 — 5,80 €\n` +
          `  ▸ <b>Dragon Roll</b> x1 — 13,90 €\n` +
          `━━━━━━━━━━━━━━━\n` +
          `💰 <b>TỔNG TIỀN:</b> <b>19,70 €</b>\n` +
          `━━━━━━━━━━━━━━━\n` +
          `<b>Status:</b> NEU`;

        await sendTelegramMessage(sampleOrderMsg, buildOrderInlineKeyboard('demo_1234'), token, chat.id);
        return res.status(200).json({ ok: true });
      }
    }

    // Khi bot được thêm vào nhóm chat
    if (update.message && update.message.new_chat_members) {
      const isBotAdded = update.message.new_chat_members.some(m => m.is_bot);
      if (isBotAdded) {
        const welcomeText = `🍣 <b>Chào mừng bạn đến với Kimi Sushi Bot!</b>\n\n` +
          `Để nhóm này nhận thông báo khi có khách <b>Đặt bàn</b> hoặc <b>Đặt món</b> mới, vui lòng gửi lệnh:\n` +
          `👉 <code>/setchat</code>\n\n` +
          `<i>(Lưu ý: Bạn nên cấp quyền Quản trị viên - Admin cho Bot để hoạt động mượt mà nhất)</i>`;
        await sendTelegramMessage(welcomeText, null, token, update.message.chat.id);
        return res.status(200).json({ ok: true });
      }
    }

    // 2. Handle callback_query (Inline keyboard button clicks)
    if (update.callback_query) {
      const { id: callback_id, data: callback_data, from: user, message } = update.callback_query;
      const chatId = message?.chat?.id;
      const messageId = message?.message_id;
      const originalText = message?.text || '';

      console.log(`[TELEGRAM CB] data="${callback_data}" from=${user?.first_name} ${user?.last_name || ''} (id=${user?.id})`);

      const staffName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || (user?.username ? `@${user.username}` : 'Nhân viên');

      // Parse callback_data
      let action = '';
      let orderId = '';

      if (callback_data.startsWith('time_') || callback_data.startsWith('pk_')) {
        const parts = callback_data.split('_');
        action = parts[0] + '_' + parts[1]; // time_15 or pk_15
        orderId = parts.slice(2).join('_');
      } else if (callback_data.startsWith('res_confirm_')) {
        action = 'res_confirm';
        orderId = callback_data.replace('res_confirm_', '');
      } else if (callback_data.startsWith('res_cancel_')) {
        action = 'res_cancel';
        orderId = callback_data.replace('res_cancel_', '');
      } else if (callback_data.startsWith('st_done_')) {
        action = 'st_done';
        orderId = callback_data.replace('st_done_', '');
      } else if (callback_data.startsWith('st_canc_')) {
        action = 'st_canc';
        orderId = callback_data.replace('st_canc_', '');
      } else {
        const parts = callback_data.split('_');
        action = parts.slice(0, 2).join('_');
        orderId = parts.slice(2).join('_');
      }

      // Base text cleaning (strip previously appended status banners)
      const cleanBaseText = (originalText || '')
        .split('\n\n━━━━━━━━━━━━━━━\n✅')[0]
        .split('\n\n━━━━━━━━━━━━━━━\n🔔')[0]
        .split('\n\n━━━━━━━━━━━━━━━\n❌')[0];

      // ─── ACTION A: Choose preparation time for online order (15, 20, 25, 30 phút) ─────
      if (action.startsWith('time_') || (action.startsWith('pk_') && action !== 'pk_ready')) {
        const minsMatch = action.match(/\d+/);
        const minutes = minsMatch ? parseInt(minsMatch[0], 10) : 20;

        const order = await Order.findOne({ id: orderId });
        if (!order) {
          await answerCallbackQuery(callback_id, `❌ Không tìm thấy đơn hàng #${orderId}`, true, token);
          return res.status(200).json({ ok: true });
        }

        const now = new Date();
        const readyTime = new Date(now.getTime() + minutes * 60 * 1000);
        const formatter = new Intl.DateTimeFormat('de-DE', {
          timeZone: 'Europe/Berlin',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        const readyTimeStr = formatter.format(readyTime);

        const oldStatus = order.status;
        order.status = 'cooking';
        order.estimatedMinutes = minutes;
        order.pickupTimeDisplay = `ca. ${readyTimeStr} Uhr (in ${minutes} Minuten)`;
        order.updatedAt = new Date();
        await order.save();

        // 1. Notify Telegram button user immediately
        await answerCallbackQuery(
          callback_id,
          `✅ Đã nhận đơn! Dự kiến hoàn thành lúc: ${readyTimeStr} Uhr (${minutes} phút)`,
          false,
          token
        );

        // 2. Send customer status email
        try {
          await sendCustomerStatusEmail(order, oldStatus, 'cooking');
        } catch (err) {
          console.error('[TELEGRAM CB] Customer email error:', err.message);
        }

        // 3. Send Push Notification to mobile staff app
        try {
          const tokensDoc = await FcmToken.find({}, 'token');
          if (tokensDoc.length > 0) {
            await sendPushNotification(
              tokensDoc.map(t => t.token),
              '👨‍🍳 Đang chuẩn bị món',
              `Đơn #${order.id} chuẩn bị trong ${minutes} phút (xong lúc ${readyTimeStr} Uhr)`
            );
          }
        } catch (err) {
          console.error('[TELEGRAM CB] Push error:', err.message);
        }

        // 4. Update Telegram message with completion time
        const updatedText = `${escapeHtml(cleanBaseText)}\n\n━━━━━━━━━━━━━━━\n✅ <b>ĐÃ XÁC NHẬN CHUẨN BỊ: ${minutes} PHÚT</b>\n🕒 <b>Thời gian hoàn thành dự kiến: ca. ${readyTimeStr} Uhr</b>\n👤 <b>Nhân viên:</b> ${escapeHtml(staffName)}\n<b>Status:</b> IN BEARBEITUNG (ĐANG LÀM)`;

        await editTelegramMessage(chatId, messageId, updatedText, buildCookingOrderInlineKeyboard(order.id), token);
        return res.status(200).json({ ok: true });
      }

      // ─── ACTION B: Confirm table reservation ─────────────────────────────
      if (action === 'res_confirm') {
        const resOrder = await Order.findOne({ id: orderId });
        if (!resOrder) {
          await answerCallbackQuery(callback_id, `❌ Không tìm thấy đặt bàn #${orderId}`, true, token);
          return res.status(200).json({ ok: true });
        }

        const oldStatus = resOrder.status;
        resOrder.status = 'confirmed';
        resOrder.updatedAt = new Date();
        await resOrder.save();

        await answerCallbackQuery(callback_id, `✅ Đã xác nhận đặt bàn #${resOrder.id} thành công!`, false, token);

        // Send confirmation email to customer
        try {
          await sendCustomerStatusEmail(resOrder, oldStatus, 'confirmed');
        } catch (err) {
          console.error('[TELEGRAM CB] Reservation email error:', err.message);
        }

        // Push notification to mobile app
        try {
          const tokensDoc = await FcmToken.find({}, 'token');
          if (tokensDoc.length > 0) {
            await sendPushNotification(
              tokensDoc.map(t => t.token),
              '📅 Đặt bàn đã xác nhận',
              `Đặt bàn #${resOrder.id} của ${resOrder.customerName || '-'} đã được xác nhận`
            );
          }
        } catch (err) {
          console.error('[TELEGRAM CB] Push error:', err.message);
        }

        const confirmTimeStr = new Intl.DateTimeFormat('de-DE', {
          timeZone: 'Europe/Berlin',
          hour: '2-digit',
          minute: '2-digit',
          day: '2-digit',
          month: '2-digit',
          hour12: false
        }).format(new Date());

        const updatedText = `${escapeHtml(cleanBaseText)}\n\n━━━━━━━━━━━━━━━\n✅ <b>ĐÃ XÁC NHẬN ĐẶT BÀN THÀNH CÔNG</b>\n🕒 <b>Thời gian xác nhận:</b> ${confirmTimeStr} Uhr\n👤 <b>Nhân viên:</b> ${escapeHtml(staffName)}\n<b>Status:</b> BESTÄTIGT (ĐÃ XÁC NHẬN)`;

        await editTelegramMessage(chatId, messageId, updatedText, buildConfirmedReservationInlineKeyboard(resOrder.id), token);
        return res.status(200).json({ ok: true });
      }

      // ─── ACTION C: Order completed (Đã xong / Bereit) ────────────────────
      if (action === 'st_done' || action === 'pk_ready') {
        const order = await Order.findOne({ id: orderId });
        if (!order) {
          await answerCallbackQuery(callback_id, `❌ Không tìm thấy đơn hàng #${orderId}`, true, token);
          return res.status(200).json({ ok: true });
        }

        const oldStatus = order.status;
        order.status = 'done';
        order.updatedAt = new Date();
        await order.save();

        await answerCallbackQuery(callback_id, `🔔 Đơn hàng #${order.id} đã hoàn thành!`, false, token);

        try {
          await sendCustomerStatusEmail(order, oldStatus, 'done');
        } catch (err) {
          console.error('[TELEGRAM CB] Email error:', err.message);
        }

        try {
          const tokensDoc = await FcmToken.find({}, 'token');
          if (tokensDoc.length > 0) {
            await sendPushNotification(
              tokensDoc.map(t => t.token),
              '🔔 Đơn hàng đã sẵn sàng',
              `Đơn #${order.id} của ${order.customerName || '-'} đã sẵn sàng`
            );
          }
        } catch (err) {
          console.error('[TELEGRAM CB] Push error:', err.message);
        }

        const doneTimeStr = new Intl.DateTimeFormat('de-DE', {
          timeZone: 'Europe/Berlin',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }).format(new Date());

        const updatedText = `${escapeHtml(cleanBaseText)}\n\n━━━━━━━━━━━━━━━\n🔔 <b>ĐÃ HOÀN THÀNH - SẴN SÀNG (${doneTimeStr} Uhr)</b>\n👤 <b>Nhân viên:</b> ${escapeHtml(staffName)}\n<b>Status:</b> FERTIG / DONE`;

        await editTelegramMessage(chatId, messageId, updatedText, { inline_keyboard: [] }, token);
        return res.status(200).json({ ok: true });
      }

      // ─── ACTION D: Cancel order or reservation ───────────────────────────
      if (action === 'st_canc' || action === 'res_cancel') {
        const item = await Order.findOne({ id: orderId });
        if (!item) {
          await answerCallbackQuery(callback_id, `❌ Không tìm thấy #${orderId}`, true, token);
          return res.status(200).json({ ok: true });
        }

        const oldStatus = item.status;
        item.status = 'cancelled';
        item.updatedAt = new Date();
        await item.save();

        await answerCallbackQuery(callback_id, `❌ Đã huỷ #${item.id}`, false, token);

        try {
          await sendCustomerStatusEmail(item, oldStatus, 'cancelled');
        } catch (err) {
          console.error('[TELEGRAM CB] Cancel email error:', err.message);
        }

        const cancelTimeStr = new Intl.DateTimeFormat('de-DE', {
          timeZone: 'Europe/Berlin',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }).format(new Date());

        const updatedText = `${escapeHtml(cleanBaseText)}\n\n━━━━━━━━━━━━━━━\n❌ <b>ĐÃ HUỶ / TỪ CHỐI (${cancelTimeStr} Uhr)</b>\n👤 <b>Nhân viên:</b> ${escapeHtml(staffName)}\n<b>Status:</b> STORNIERT / CANCELLED`;

        await editTelegramMessage(chatId, messageId, updatedText, { inline_keyboard: [] }, token);
        return res.status(200).json({ ok: true });
      }

      // Default callback handler
      await answerCallbackQuery(callback_id, `Đã nhận thao tác: ${action}`, false, token);
      return res.status(200).json({ ok: true });
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[TELEGRAM WEBHOOK] Error:', e);
    res.status(500).json({ error: e.message });
  }
}

async function testTelegram(req, res) {
  try {
    const { token, chatId } = await getTelegramCredentials();
    if (!token || !chatId) {
      return res.status(400).json({
        success: false,
        message: 'Chưa cấu hình Telegram Bot Token hoặc Chat ID trong Cài đặt.'
      });
    }

    if (String(chatId).toLowerCase() === '@kimisushichat_bot') {
      return res.status(400).json({
        success: false,
        message: 'Telegram Chat ID không thể là username của bot (@kimisushichat_bot). Hãy thêm bot vào nhóm hoặc chat với bot và gõ /start để lấy Chat ID số!'
      });
    }

    const testMsg = `🍣 <b>Kimi Sushi - Test Thông Báo Telegram</b>\n\n` +
      `✅ Kết nối Telegram Bot thành công!\n` +
      `🕒 Thời gian: ${new Date().toLocaleString('vi-VN')}\n` +
      `💬 Chat ID: <code>${chatId}</code>`;

    const teleRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: testMsg,
        parse_mode: 'HTML'
      })
    });

    const teleData = await teleRes.json();
    if (teleData.ok) {
      return res.json({
        success: true,
        message: 'Đã gửi tin nhắn test thành công!',
        messageId: teleData.result?.message_id
      });
    } else {
      return res.status(400).json({
        success: false,
        message: `Telegram API error (${teleData.error_code}): ${teleData.description}`,
        usedBotTokenSuffix: token.slice(-8),
        usedChatId: chatId
      });
    }
  } catch (err) {
    console.error('[TEST TELEGRAM] Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function setupWebhook(req, res) {
  try {
    const { token } = await getTelegramCredentials();
    if (!token) {
      return res.status(400).json({ success: false, message: 'Chưa cấu hình Bot Token.' });
    }

    const host = req.get('host');
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const baseUrl = process.env.BASE_URL || (host ? `${protocol}://${host}` : 'https://kimisushi-be.vercel.app');
    const webhookUrl = `${baseUrl}/api/telegram-webhook`;

    const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}`);
    const data = await response.json();

    return res.json({ success: data.ok, webhookUrl, telegramResponse: data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function getWebhookInfo(req, res) {
  try {
    const { token } = await getTelegramCredentials();
    if (!token) {
      return res.status(400).json({ success: false, message: 'Chưa cấu hình Bot Token.' });
    }
    const response = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    const data = await response.json();
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  handleWebhook,
  testTelegram,
  setupWebhook,
  getWebhookInfo
};
