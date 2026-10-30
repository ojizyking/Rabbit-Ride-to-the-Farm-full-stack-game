const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { verifyToken } = require('@clerk/backend');

// Ensure referenced models are registered in Mongoose
require('../models/Rabbit');
require('../models/Bicycle');
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
          user = await User.findOne({ clerkId: clerkClaims.sub });
          if (user) {
            try {
              await user.populate('currentRabbitId');
              await user.populate('currentBikeId');
            } catch {
              // safe fallback
            }
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
      if (decoded && (decoded.id || decoded.email)) {
        let userQuery = null;
        if (decoded.id && mongoose.Types.ObjectId.isValid(decoded.id)) {
          userQuery = { $or: [{ _id: new mongoose.Types.ObjectId(decoded.id) }, { _id: decoded.id }] };
        } else if (decoded.id) {
          userQuery = { _id: decoded.id };
        } else if (decoded.email) {
          userQuery = { email: decoded.email.toLowerCase().trim() };
        }

        user = await User.findOne(userQuery);

        // Fallback to email lookup if id-based lookup returned null
        if (!user && decoded.email) {
          user = await User.findOne({ email: decoded.email.toLowerCase().trim() });
        }

        if (user) {
          try {
            await user.populate('currentRabbitId');
            await user.populate('currentBikeId');
          } catch {
            // safe fallback
          }
          req.user = user;
          return next();
        }
      }
    } catch (jwtErr) {
      console.warn('[AuthMiddleware] JWT verification failed:', jwtErr.message);
    }

    return res.status(401).json({ success: false, message: 'Invalid or expired session. Please sign in again.' });
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(401).json({ success: false, message: 'Authentication failed.' });
  }
}

module.exports = authMiddleware;
