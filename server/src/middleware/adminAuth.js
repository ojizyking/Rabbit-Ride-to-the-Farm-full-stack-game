const User = require('../models/User');

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'etizzer@gmail.com,admin@rabbitride.farm,admin@farm.com')
  .toLowerCase()
  .split(',')
  .map(e => e.trim())
  .filter(Boolean);

async function adminAuth(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please sign in.'
      });
    }

    const userEmail = (req.user.email || '').toLowerCase().trim();

    // Check if role is admin or email is in ADMIN_EMAILS whitelist
    const isWhitelisted = ADMIN_EMAILS.includes(userEmail) || userEmail === 'etizzer@gmail.com';
    const hasAdminRole = req.user.role === 'admin';

    if (hasAdminRole || isWhitelisted) {
      // If whitelisted but role was 'user', elevate role
      if (isWhitelisted && req.user.role !== 'admin') {
        req.user.role = 'admin';
        try {
          await User.findByIdAndUpdate(req.user._id, { role: 'admin' });
        } catch {
          // ignore error if save fails
        }
      }
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Access denied. Administrator privileges required.'
    });
  } catch (err) {
    console.error('AdminAuth error:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error verifying administrator privileges.'
    });
  }
}

module.exports = adminAuth;
