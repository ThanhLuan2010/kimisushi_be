const Table = require('../models/Table');
const { logActivity } = require('../helpers/log');

// GET /api/tables — lấy tất cả bàn
async function getTables(req, res) {
  try {
    const tables = await Table.find({}).sort({ zone: 1, name: 1 });
    res.json(tables);
  } catch (e) {
    console.error('[API] GET /api/tables error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
}

// GET /api/tables/:id — lấy 1 bàn
async function getTable(req, res) {
  try {
    const table = await Table.findOne({ id: req.params.id });
    if (!table) return res.status(404).json({ success: false, message: 'Không tìm thấy bàn' });
    res.json(table);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
}

// POST /api/tables/create — tạo mới 1 bàn
async function createTable(req, res) {
  try {
    const { id, name, zone, capacity, status } = req.body;
    const existing = await Table.findOne({ id });
    if (existing) return res.status(409).json({ success: false, message: 'ID bàn đã tồn tại' });

    const table = new Table({
      id: id || `T${Date.now()}`,
      name,
      zone: zone || 'Mặc định',
      capacity: capacity || 4,
      status: status || 'empty',
      orderItems: [],
      total: 0,
    });
    await table.save();

    await logActivity(req.body._adminUser || 'admin', 'TABLE_CREATE', `Tạo bàn ${name} (${zone})`);
    res.status(201).json({ success: true, table });
  } catch (e) {
    console.error('[API] POST /api/tables/create error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
}

// PUT /api/tables/:id — cập nhật 1 bàn
async function updateTable(req, res) {
  try {
    const { id } = req.params;
    const updateData = { ...req.body, updatedAt: new Date() };
    delete updateData._id;
    delete updateData._adminUser;

    const table = await Table.findOneAndUpdate(
      { id },
      { $set: updateData },
      { new: true, runValidators: true }
    );
    if (!table) return res.status(404).json({ success: false, message: 'Không tìm thấy bàn' });

    // Broadcast to admin clients
    const io = req.app.get('io');
    if (io) io.emit('table_updated', { id, ...updateData });

    await logActivity(req.body._adminUser || 'system', 'TABLE_UPDATE', `Cập nhật bàn ${id}`);
    res.json({ success: true, table });
  } catch (e) {
    console.error('[API] PUT /api/tables/:id error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
}

// DELETE /api/tables/:id — xóa 1 bàn
async function deleteTable(req, res) {
  try {
    const { id } = req.params;
    const table = await Table.findOneAndDelete({ id });
    if (!table) return res.status(404).json({ success: false, message: 'Không tìm thấy bàn' });

    await logActivity(req.body._adminUser || 'admin', 'TABLE_DELETE', `Xóa bàn ${table.name}`);
    res.json({ success: true, message: `Đã xóa bàn ${table.name}` });
  } catch (e) {
    console.error('[API] DELETE /api/tables/:id error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
}

// POST /api/tables — cập nhật toàn bộ bàn (legacy bulk replace - giữ lại cho CMS)
async function updateTables(req, res) {
  try {
    const tables = req.body;
    if (!Array.isArray(tables)) {
      return res.status(400).json({ success: false, message: 'Dữ liệu phải là mảng' });
    }

    await Table.deleteMany({});
    if (tables.length > 0) {
      await Table.insertMany(tables.map(t => ({ ...t, updatedAt: new Date() })));
    }

    const adminUser = req.body?._adminUser || 'admin';
    await logActivity(adminUser, 'TABLES_BULK_UPDATE', `Cập nhật ${tables.length} bàn`);

    const saved = await Table.find({});
    res.json({ success: true, count: saved.length, items: saved });
  } catch (e) {
    console.error('[API] POST /api/tables (bulk) error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
}

module.exports = {
  getTables,
  getTable,
  createTable,
  updateTable,
  deleteTable,
  updateTables,
};
