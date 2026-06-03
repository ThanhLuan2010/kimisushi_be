const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  menuItemId: { type: String, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, default: 1 },
  note: String,
  category: String,
}, { _id: false });

const tableSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  zone: { type: String, default: 'Mặc định' },
  capacity: { type: Number, default: 4 },
  status: { type: String, enum: ['empty', 'occupied', 'reserved'], default: 'empty' },
  orderItems: { type: [orderItemSchema], default: [] },
  total: { type: Number, default: 0 },
  reservedFor: String,
  reservedTime: String,
  occupiedAt: String,
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Table', tableSchema);
