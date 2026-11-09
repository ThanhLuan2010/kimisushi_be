#!/usr/bin/env node

/**
 * Script kiểm tra và test gửi thông báo Telegram cho Backend Kimi Sushi
 * Chạy:
 *   node test-telegram.js
 * hoặc:
 *   node test-telegram.js <CHAT_ID>
 */

require('dotenv').config();
const mongoose = require('mongoose');
const {
  getTelegramCredentials,
  sendTelegramMessage,
  buildOrderInlineKeyboard,
  buildReservationInlineKeyboard
} = require('./helpers/telegram');

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🍣 KIMI SUSHI - BACKEND TELEGRAM NOTIFICATION TEST');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (process.env.MONGODB_URL) {
    try {
      await mongoose.connect(process.env.MONGODB_URL);
      console.log('✅ Đã kết nối MongoDB thành công.');
    } catch (e) {
      console.warn('⚠️ Không thể kết nối MongoDB:', e.message);
    }
  }

  const customChatId = process.argv[2];
  const { token, chatId } = await getTelegramCredentials();
  const targetChatId = customChatId || chatId;

  console.log(`🔑 Bot Token: ${token ? 'Đã có' : 'CHƯA CÓ'}`);
  console.log(`💬 Chat ID:   ${targetChatId ? targetChatId : 'CHƯA CÓ'}\n`);

  if (!token) {
    console.error('❌ Thiếu TELEGRAM_BOT_TOKEN trong file .env hoặc MongoDB Settings!');
    process.exit(1);
  }

  // 1. Kiểm tra thông tin Bot qua API
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await res.json();
    if (data.ok) {
      console.log(`🤖 Bot kết nối thành công: "${data.result.first_name}" (@${data.result.username})`);
    } else {
      console.error('❌ Token không hợp lệ:', data.description);
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Lỗi kết nối Telegram API:', err.message);
    process.exit(1);
  }

  if (!targetChatId) {
    console.log('\n⚠️ CHƯA CÓ CHAT ID ĐỂ GỬI TIN NHẮN TEST!');
    console.log('👉 Hướng dẫn:');
    console.log('  1. Mở Telegram, thêm bot của bạn vào nhóm chat hoặc nhắn tin riêng với bot.');
    console.log('  2. Gửi lệnh /setchat vào cuộc trò chuyện đó để bot tự lưu Chat ID.');
    console.log('  3. Hoặc chạy: node test-telegram.js <CHAT_ID>');
    if (mongoose.connection.readyState === 1) await mongoose.disconnect();
    return;
  }

  // 2. Gửi tin nhắn test Đặt bàn
  console.log(`\n📤 Đang gửi thông báo test [ĐẶT BÀN] tới Chat ID ${targetChatId}...`);
  const resMsg = `📅 <b>NEUE TISCHRESERVIERUNG (ĐẶT BÀN MỚI - TEST)</b>\n\n` +
    `━━━━━━━━━━━━━━━\n` +
    `🔖 <b>Mã đặt bàn:</b> <code>#res_test_123456</code>\n` +
    `👤 <b>Khách hàng:</b> Nguyễn Văn A\n` +
    `📞 <b>Điện thoại:</b> 0152 1234 5678\n` +
    `📧 <b>E-Mail:</b> test@kimisushi.de\n` +
    `━━━━━━━━━━━━━━━\n` +
    `🗓 <b>Ngày:</b> 15.11.2026\n` +
    `🕒 <b>Giờ đến:</b> 19:00 Uhr\n` +
    `👥 <b>Số khách:</b> 4 Personen\n` +
    `━━━━━━━━━━━━━━━\n` +
    `📝 <b>Ghi chú:</b> Bàn gần cửa sổ, sinh nhật\n` +
    `━━━━━━━━━━━━━━━\n` +
    `<b>Status:</b> NEU`;

  const resMsgId = await sendTelegramMessage(resMsg, buildReservationInlineKeyboard('test_123456'), token, targetChatId);
  if (resMsgId) {
    console.log('✅ Gửi thông báo đặt bàn thành công! Message ID:', resMsgId);
  } else {
    console.error('❌ Gửi thông báo đặt bàn thất bại.');
  }

  // 3. Gửi tin nhắn test Đặt món
  console.log(`\n📤 Đang gửi thông báo test [ĐẶT MÓN] tới Chat ID ${targetChatId}...`);
  const orderMsg = `🍣 <b>NEUE BESTELLUNG (ĐƠN ĐẶT MÓN MỚI - TEST)</b>\n\n` +
    `━━━━━━━━━━━━━━━\n` +
    `📋 <b>MÃ ĐƠN:</b> <code>#order_test_987654</code>\n` +
    `━━━━━━━━━━━━━━━\n` +
    `👤 <b>Khách hàng:</b> Trần Thị B\n` +
    `📞 <b>Điện thoại:</b> 0176 9876 5432\n` +
    `📧 <b>E-Mail:</b> customer@example.com\n` +
    `━━━━━━━━━━━━━━━\n` +
    `🏪 <b>Hình thức:</b> 🚴 Lieferung (Giao hàng)\n` +
    `📍 <b>Địa chỉ:</b> Hauptstraße 10, 70794 Filderstadt\n` +
    `━━━━━━━━━━━━━━━\n` +
    `🗓 <b>Ngày:</b> 15.11.2026\n` +
    `🕒 <b>Thời gian yêu cầu:</b> So schnell wie möglich\n` +
    `━━━━━━━━━━━━━━━\n` +
    `⚠️ <b>GHI CHÚ / ALLERGIEN:</b>\n` +
    `  <i>Không wasabi, nhiều gừng</i>\n` +
    `━━━━━━━━━━━━━━━\n` +
    `📋 <b>Món đã đặt:</b>\n` +
    `  ▸ <b>Salmon Nigiri</b> x2 — 5,80 €\n` +
    `  ▸ <b>Dragon Roll</b> x1 — 13,90 €\n` +
    `━━━━━━━━━━━━━━━\n` +
    `💰 <b>TỔNG TIỀN:</b> <b>19,70 €</b>\n` +
    `━━━━━━━━━━━━━━━\n` +
    `<b>Status:</b> NEU`;

  const orderMsgId = await sendTelegramMessage(orderMsg, buildOrderInlineKeyboard('test_987654'), token, targetChatId);
  if (orderMsgId) {
    console.log('✅ Gửi thông báo đơn món thành công! Message ID:', orderMsgId);
  } else {
    console.error('❌ Gửi thông báo đơn món thất bại.');
  }

  console.log('\n🎉 KIỂM TRA HOÀN TẤT!');
  if (mongoose.connection.readyState === 1) await mongoose.disconnect();
}

main().catch(err => {
  console.error('Lỗi thực thi:', err);
  process.exit(1);
});

