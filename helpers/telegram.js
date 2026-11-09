const Settings = require('../models/Settings');

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function isValidChatId(id) {
  if (!id) return false;
  const s = String(id).trim();
  if (!s || s === 'YOUR_CHAT_ID_HERE') return false;
  // Bot không thể gửi tin nhắn cho chính nó hoặc chuỗi username @bot
  if (s.toLowerCase().includes('bot') || s.startsWith('@')) return false;
  return true;
}

async function getTelegramCredentials() {
  let token = process.env.TELEGRAM_BOT_TOKEN;
  let chatId = process.env.TELEGRAM_CHAT_ID;

  if (!isValidChatId(chatId)) {
    chatId = null;
  }

  try {
    const settings = await Settings.findOne({});
    if (settings) {
      if (!token && settings.telegramBotToken) {
        token = settings.telegramBotToken;
      }
      if (!chatId && isValidChatId(settings.telegramChatId)) {
        chatId = settings.telegramChatId;
      }
    }
  } catch (err) {
    console.warn('[TELEGRAM] Error getting credentials from Settings:', err.message);
  }

  return { token, chatId };
}

// Inline keyboard for NEW online order
function buildOrderInlineKeyboard(orderId) {
  return {
    inline_keyboard: [
      [
        { text: '⏱ 15 phút', callback_data: `time_15_${orderId}` },
        { text: '⏱ 20 phút', callback_data: `time_20_${orderId}` }
      ],
      [
        { text: '⏱ 25 phút', callback_data: `time_25_${orderId}` },
        { text: '⏱ 30 phút', callback_data: `time_30_${orderId}` }
      ],
      [
        { text: '🔔 Đã xong (Bereit)', callback_data: `st_done_${orderId}` },
        { text: '❌ Huỷ đơn (Storno)', callback_data: `st_canc_${orderId}` }
      ]
    ]
  };
}

// Inline keyboard for order IN COOKING state
function buildCookingOrderInlineKeyboard(orderId) {
  return {
    inline_keyboard: [
      [
        { text: '🔔 Hoàn thành (Bereit)', callback_data: `st_done_${orderId}` },
        { text: '❌ Huỷ đơn', callback_data: `st_canc_${orderId}` }
      ]
    ]
  };
}

// Inline keyboard for NEW table reservation
function buildReservationInlineKeyboard(orderId) {
  return {
    inline_keyboard: [
      [
        { text: '✅ Xác nhận đặt bàn', callback_data: `res_confirm_${orderId}` },
        { text: '❌ Từ chối', callback_data: `res_cancel_${orderId}` }
      ]
    ]
  };
}

// Inline keyboard for CONFIRMED table reservation
function buildConfirmedReservationInlineKeyboard(orderId) {
  return {
    inline_keyboard: [
      [
        { text: '❌ Huỷ đặt bàn', callback_data: `res_cancel_${orderId}` }
      ]
    ]
  };
}

async function sendTelegramMessage(message, replyMarkup, customBotToken, customChatId) {
  try {
    let token = customBotToken;
    let chatId = customChatId;

    if (!token || !isValidChatId(chatId)) {
      const creds = await getTelegramCredentials();
      if (!token) token = creds.token;
      if (!isValidChatId(chatId)) chatId = creds.chatId;
    }

    if (!token || !isValidChatId(chatId)) {
      console.warn(`[TELEGRAM] Config missing or invalid (token: ${token ? 'OK' : 'MISSING'}, chatId: ${chatId || 'MISSING'}) — skipping notification`);
      return null;
    }

    const payload = {
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML'
    };
    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.ok) {
      console.log('[TELEGRAM] Message sent successfully. message_id:', data.result.message_id);
      return data.result.message_id;
    } else {
      console.error('[TELEGRAM] API error:', data.error_code, data.description);
      return null;
    }
  } catch (e) {
    console.error('[TELEGRAM] Network error in sendTelegramMessage:', e.message);
    return null;
  }
}

async function editTelegramMessage(chatId, messageId, newText, newReplyMarkup, customBotToken) {
  try {
    let token = customBotToken || process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      const creds = await getTelegramCredentials();
      token = creds.token;
    }
    if (!token || !chatId || !messageId) return false;

    const payload = {
      chat_id: chatId,
      message_id: messageId,
      text: newText,
      parse_mode: 'HTML'
    };
    if (newReplyMarkup !== undefined) {
      payload.reply_markup = newReplyMarkup;
    }

    const res = await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.ok) {
      console.log('[TELEGRAM] Message edited successfully. message_id:', messageId);
      return true;
    } else {
      console.warn('[TELEGRAM] editMessageText API response:', data.description);
      return false;
    }
  } catch (e) {
    console.error('[TELEGRAM] Error in editTelegramMessage:', e.message);
    return false;
  }
}

async function answerCallbackQuery(callbackQueryId, text, showAlert = false, customBotToken) {
  try {
    let token = customBotToken || process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      const creds = await getTelegramCredentials();
      token = creds.token;
    }
    if (!token || !callbackQueryId) return;

    await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text || '',
        show_alert: !!showAlert
      })
    });
  } catch (e) {
    console.error('[TELEGRAM] Error in answerCallbackQuery:', e.message);
  }
}

module.exports = {
  escapeHtml,
  isValidChatId,
  getTelegramCredentials,
  buildOrderInlineKeyboard,
  buildCookingOrderInlineKeyboard,
  buildReservationInlineKeyboard,
  buildConfirmedReservationInlineKeyboard,
  sendTelegramMessage,
  editTelegramMessage,
  answerCallbackQuery
};
