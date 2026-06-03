const Combo = require('../models/Combo');
const { logActivity } = require('../helpers/log');

async function getCombos(req, res) {
  try {
    const combos = await Combo.find({ isVisible: true }).sort({ name: 1 });
    res.json(combos);
  } catch (e) {
    console.error('[API] GET /api/combos error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
}

async function updateCombos(req, res) {
  try {
    const combos = req.body;
    
    await Combo.deleteMany({});
    if (combos && combos.length > 0) {
      await Combo.insertMany(combos.map(c => ({
        ...c,
        updatedAt: new Date()
      })));
    }
    
    const adminUser = req.body?._adminUser || 'admin';
    await logActivity(adminUser, 'COMBOS_UPDATE', `Updated ${combos?.length || 0} combos`);
    
    const saved = await Combo.find({ isVisible: true });
    res.json({ success: true, count: saved.length, items: saved });
  } catch (e) {
    console.error('[API] POST /api/combos error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
}

module.exports = {
  getCombos,
  updateCombos
};
