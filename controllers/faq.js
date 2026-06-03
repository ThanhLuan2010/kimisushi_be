const FAQ = require('../models/FAQ');
const { logActivity } = require('../helpers/log');

async function getFaq(req, res) {
  try {
    const faqs = await FAQ.find({ isVisible: true }).sort({ order: 1 });
    res.json(faqs);
  } catch (e) {
    console.error('[API] GET /api/faq error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
}

async function getAllFaq(req, res) {
  try {
    const faqs = await FAQ.find({}).sort({ order: 1 });
    res.json(faqs);
  } catch (e) {
    console.error('[API] GET /api/faq/all error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
}

async function updateFaq(req, res) {
  try {
    const faqs = req.body;
    
    await FAQ.deleteMany({});
    if (faqs && faqs.length > 0) {
      await FAQ.insertMany(faqs.map(f => ({
        ...f,
        updatedAt: new Date()
      })));
    }
    
    const adminUser = req.body?._adminUser || 'admin';
    await logActivity(adminUser, 'FAQ_UPDATE', `Updated ${faqs?.length || 0} FAQ items`);
    
    const saved = await FAQ.find({}).sort({ order: 1 });
    res.json({ success: true, count: saved.length, items: saved });
  } catch (e) {
    console.error('[API] POST /api/faq error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
}

module.exports = {
  getFaq,
  getAllFaq,
  updateFaq
};
