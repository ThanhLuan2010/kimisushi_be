const FcmToken = require('../models/FcmToken');

async function registerToken(req, res) {
  try {
    const { token, deviceInfo } = req.body;
    
    if (!token) {
      return res.status(400).json({ success: false, error: 'Token is required' });
    }

    await FcmToken.findOneAndUpdate(
      { token },
      { $set: { token, deviceInfo, updatedAt: new Date() } },
      { upsert: true, new: true }
    );

    res.json({ success: true, message: 'Token registered successfully' });
  } catch (error) {
    console.error('[API] POST /api/fcm/token error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

async function removeToken(req, res) {
  try {
    const { token } = req.body;
    if (token) {
      await FcmToken.deleteOne({ token });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('[API] DELETE /api/fcm/token error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  registerToken,
  removeToken
};
