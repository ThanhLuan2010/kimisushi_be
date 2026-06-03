const MenuItem = require('../models/MenuItem');
const { logActivity } = require('../helpers/log');

async function getMenu(req, res) {
  try {
    const items = await MenuItem.find({ isVisible: true }).sort({ category: 1, name: 1 });
    res.json(items);
  } catch (e) {
    console.error('[API] GET /api/menu error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
}

async function updateMenu(req, res) {
  try {
    const items = req.body;
    
    // Perform transactional bulk replacement
    await MenuItem.deleteMany({});
    if (items && items.length > 0) {
      await MenuItem.insertMany(items.map(item => ({
        ...item,
        updatedAt: new Date()
      })));
    }
    
    const adminUser = req.body?._adminUser || 'admin';
    await logActivity(adminUser, 'MENU_UPDATE', `Updated ${items?.length || 0} menu items`);
    
    const saved = await MenuItem.find({ isVisible: true });
    res.json({ success: true, count: saved.length, items: saved });
  } catch (e) {
    console.error('[API] POST /api/menu error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
}

module.exports = {
  getMenu,
  updateMenu
};
