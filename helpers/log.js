const ActivityLog = require('../models/ActivityLog');

async function logActivity(user, action, details) {
  try {
    await ActivityLog.create({
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      user: user || 'system',
      action,
      details,
      ip: 'server',
      timestamp: new Date()
    });
  } catch (e) {
    console.error('[ACTIVITY_LOG] Error:', e.message);
  }
}

module.exports = { logActivity };
