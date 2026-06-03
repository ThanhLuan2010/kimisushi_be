const ActivityLog = require('../models/ActivityLog');

async function getActivityLog(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 200;
    const logs = await ActivityLog.find({}).sort({ timestamp: -1 }).limit(limit);

    // Normalize for mobile app: map details→detail, timestamp→createdAt
    const items = logs.map(l => ({
      _id: l._id,
      user: l.user,
      action: l.action,
      detail: typeof l.details === 'string' ? l.details : JSON.stringify(l.details ?? ''),
      createdAt: l.timestamp || l.createdAt,
    }));

    res.json({ success: true, count: items.length, items });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
}

module.exports = {
  getActivityLog
};
