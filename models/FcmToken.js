const mongoose = require('mongoose');

const fcmTokenSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  adminUser: { type: String, default: 'admin' },
  deviceInfo: { type: String, default: 'Unknown' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

fcmTokenSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('FcmToken', fcmTokenSchema);
