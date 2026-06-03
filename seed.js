/**
 * Seed script: Tạo user admin mặc định trong MongoDB
 * Chạy: node seed.js
 * 
 * Mặc định:
 *   username: admin
 *   password: kimisushi123
 */
require('dotenv').config();
const mongoose = require('mongoose');
const crypto = require('crypto');

const sha256 = (str) => crypto.createHash('sha256').update(str).digest('hex');

async function main() {
  const mongoUrl = process.env.MONGODB_URL;
  if (!mongoUrl) {
    console.error('❌ MONGODB_URL chưa được cấu hình trong .env');
    process.exit(1);
  }

  console.log('🔌 Đang kết nối MongoDB...');
  await mongoose.connect(mongoUrl, { serverSelectionTimeoutMS: 10000 });
  console.log('✅ Kết nối thành công\n');

  const User = require('./models/User');

  // ─── Tạo admin user ─────────────────────────────────────────────────────────
  const adminUsername = process.env.SEED_USERNAME || 'admin';
  const adminPassword = process.env.SEED_PASSWORD || 'kimisushi123';
  const adminName     = process.env.SEED_NAME     || 'Quản trị viên';

  const existing = await User.findOne({ username: adminUsername });
  if (existing) {
    console.log(`⚠️  User "${adminUsername}" đã tồn tại. Bỏ qua.`);
    console.log(`   ID: ${existing.id}`);
    console.log(`   Role: ${existing.role}`);
  } else {
    const user = new User({
      id: 'admin_' + Date.now(),
      username: adminUsername,
      passwordHash: sha256(adminPassword),
      name: adminName,
      role: 'super_admin',
      active: true,
    });
    await user.save();
    console.log(`✅ Đã tạo user "${adminUsername}" (role: super_admin)`);
    console.log(`   Mật khẩu: ${adminPassword}`);
    console.log(`   ID: ${user.id}`);
  }

  console.log('\n🎉 Seed hoàn tất!');
  console.log('\n📱 Thông tin đăng nhập app:');
  console.log(`   Tên đăng nhập : ${adminUsername}`);
  console.log(`   Mật khẩu      : ${process.env.SEED_PASSWORD || 'kimisushi123'}`);
  console.log('\n💡 Đổi mật khẩu sau khi đăng nhập lần đầu!\n');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Seed thất bại:', err);
  process.exit(1);
});
