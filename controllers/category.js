const Category = require('../models/Category');
const { logActivity } = require('../helpers/log');

async function getCategories(req, res) {
  try {
    const categories = await Category.find({ isVisible: true }).sort({ order: 1 });
    res.json(categories);
  } catch (e) {
    console.error('[API] GET /api/categories error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
}

async function updateCategories(req, res) {
  try {
    const categories = req.body;
    
    await Category.deleteMany({});
    if (categories && categories.length > 0) {
      await Category.insertMany(categories.map((c, idx) => ({
        ...c,
        order: idx, // Ensure the order matches the array index from the frontend
        updatedAt: new Date()
      })));
    }
    
    const adminUser = req.body?._adminUser || 'admin';
    await logActivity(adminUser, 'CATEGORIES_UPDATE', `Updated ${categories?.length || 0} categories`);
    
    const saved = await Category.find({ isVisible: true }).sort({ order: 1 });
    res.json({ success: true, count: saved.length, items: saved });
  } catch (e) {
    console.error('[API] POST /api/categories error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
}

module.exports = {
  getCategories,
  updateCategories
};
