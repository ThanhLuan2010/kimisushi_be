require('dotenv').config();
const { connectDB, mongoose } = require('./db');
const FcmToken = require('./models/FcmToken');

async function checkTokens() {
  await connectDB();
  const tokens = await FcmToken.find({});
  console.log('Total tokens:', tokens.length);
  tokens.forEach((t, i) => {
    console.log(`Token ${i + 1}:`, {
      token: t.token,
      deviceInfo: t.deviceInfo,
      updatedAt: t.updatedAt
    });
  });
  process.exit(0);
}

checkTokens().catch(err => {
  console.error(err);
  process.exit(1);
});
