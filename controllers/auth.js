const crypto = require('crypto');
const User = require('../models/User');
const { logActivity } = require('../helpers/log');

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

async function login(req, res) {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username, active: true });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Benutzer nicht gefunden' });
    }

    const hash = sha256(password);
    if (user.passwordHash !== hash) {
      return res.status(401).json({ success: false, message: 'Falsches Passwort' });
    }

    user.lastLogin = new Date();
    await user.save();
    
    const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');
    await logActivity(user.username, 'LOGIN', { role: user.role });
    
    res.json({
      success: true,
      token,
      user: { id: user.id, username: user.username, name: user.name, role: user.role }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
}

async function changePassword(req, res) {
  try {
    const { token, oldPassword, newPassword } = req.body;
    const parts = Buffer.from(token, 'base64').toString('utf8').split(':');
    const user = await User.findOne({ id: parts[0] });
    
    if (!user || user.passwordHash !== sha256(oldPassword)) {
      return res.status(403).json({ success: false, message: 'Falsches altes Passwort' });
    }

    user.passwordHash = sha256(newPassword);
    await user.save();
    
    await logActivity(user.username, 'CHANGE_PASSWORD', {});
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
}

async function verify(req, res) {
  try {
    const { token } = req.body;
    const parts = Buffer.from(token, 'base64').toString('utf8').split(':');
    const user = await User.findOne({ id: parts[0] });
    
    if (!user || !user.active) {
      return res.status(401).json({ valid: false });
    }
    
    res.json({
      valid: true,
      user: { id: user.id, username: user.username, name: user.name, role: user.role }
    });
  } catch (e) {
    res.status(401).json({ valid: false });
  }
}

module.exports = {
  login,
  changePassword,
  verify
};
