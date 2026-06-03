const https = require('https');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Build inline keyboard for order actions (Giai đoạn 2: inline buttons)
function buildOrderInlineKeyboard(orderId) {
  return {
    inline_keyboard: [
      [
        { text: '⏱ 10 Min', callback_data: `pk_10_${orderId}` },
        { text: '⏱ 15 Min', callback_data: `pk_15_${orderId}` },
        { text: '⏱ 20 Min', callback_data: `pk_20_${orderId}` }
      ],
      [
        { text: '⏱ 25 Min', callback_data: `pk_25_${orderId}` },
        { text: '⏱ 30 Min', callback_data: `pk_30_${orderId}` },
        { text: '🔔 Bereit!', callback_data: `pk_ready_${orderId}` }
      ],
      [
        { text: '✅ Erhalten', callback_data: `st_rcv_${orderId}` },
        { text: '🍳 Bereitet vor', callback_data: `st_prep_${orderId}` },
        { text: '❌ Stornieren', callback_data: `st_canc_${orderId}` }
      ]
    ]
  };
}

function sendTelegramMessage(message, replyMarkup, customBotToken, customChatId) {
  const token = customBotToken || TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = customChatId || TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID;

  if (!token || token === 'YOUR_BOT_TOKEN_HERE' ||
    !chatId || chatId === 'YOUR_CHAT_ID_HERE') {
    console.warn('[TELEGRAM] Config missing — skipping notification');
    return Promise.resolve(null);
  }

  const payload = {
    chat_id: chatId,
    text: message,
    parse_mode: 'HTML'
  };
  if (replyMarkup) {
    payload.reply_markup = replyMarkup;
  }

  const data = JSON.stringify(payload);

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${token}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.ok) {
            console.log('[TELEGRAM] Message sent. message_id:', parsed.result.message_id);
            resolve(parsed.result.message_id);
          } else {
            console.error('[TELEGRAM] API error — code:', parsed.error_code, '| description:', parsed.description);
            resolve(null);
          }
        } catch (e) {
          console.error('[TELEGRAM] Failed to parse response:', body);
          resolve(null);
        }
      });
    });

    req.on('error', (e) => {
      console.error('[TELEGRAM] Network error:', e.message);
      resolve(null);
    });

    req.write(data);
    req.end();
  });
}

module.exports = {
  buildOrderInlineKeyboard,
  sendTelegramMessage
};
