const User = require('../models/User');

async function requireAdmin(req, res, next) {
  try {
    const token = req.headers['authorization']?.split(' ')[1] || 
                  req.headers['x-admin-token'] || 
                  req.body?.token || 
                  req.query?.token;

    if (!token) {
      return res.status(401).json({ success: false, message: 'Không tìm thấy token xác thực' });
    }

    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const parts = decoded.split(':');
    if (parts.length < 2) {
      return res.status(401).json({ success: false, message: 'Token không hợp lệ' });
    }

    const userId = parts[0];
    const user = await User.findOne({ id: userId });
    if (!user || !user.active) {
      return res.status(401).json({ success: false, message: 'Tài khoản không hợp lệ hoặc bị vô hiệu hóa' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token không hợp lệ' });
  }
}

module.exports = { requireAdmin };
