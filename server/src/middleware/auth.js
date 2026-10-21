const jwt = require('jsonwebtoken');
const { verifyToken } = require('@clerk/backend');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'rabbit_super_secret_jwt_key_2026_farm_ride';
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
    }

    const token = authHeader.split(' ')[1];

    let user = null;

    // 1. Try Clerk verification if Clerk Secret Key is configured
    if (CLERK_SECRET_KEY) {
      try {
        const clerkClaims = await verifyToken(token, {
          secretKey: CLERK_SECRET_KEY
        });
        if (clerkClaims && clerkClaims.sub) {
          user = await User.findOne({ clerkId: clerkClaims.sub })
            .populate('currentRabbitId')
            .populate('currentBikeId');
          if (user) {
            req.user = user;
            req.auth = clerkClaims;
            return next();
          }
        }
      } catch (clerkErr) {
        // Not a Clerk token or expired, try legacy JWT next
      }
    }

    // 2. Fallback to standard JWT verification
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded && decoded.id) {
        user = await User.findById(decoded.id)
          .populate('currentRabbitId')
          .populate('currentBikeId');

        if (user) {
          req.user = user;
          return next();
        }
      }
    } catch (jwtErr) {
      // Token not valid standard JWT
    }

    return res.status(401).json({ success: false, message: 'Invalid or expired session. Please sign in again.' });
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(401).json({ success: false, message: 'Authentication failed.' });
  }
}

module.exports = authMiddleware;
