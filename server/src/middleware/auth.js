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

    // AUTH_ISOLATION_v1
    // 2. Fallback to standard JWT verification
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded && decoded.id) {
        // PRIMARY: always look up by _id from the token — never by email when id is present.
        // This prevents one user's JWT from resolving to another user's account.
        let userQuery = null;
        if (mongoose.Types.ObjectId.isValid(decoded.id)) {
          const objId = new mongoose.Types.ObjectId(decoded.id);
          userQuery = { _id: objId };
        } else {
          // Non-ObjectId id (UUID from memory store or legacy)
          userQuery = { _id: decoded.id };
        }

        user = await User.findOne(userQuery);

        // Safety: confirm the found user's email matches the token email (tamper guard)
        if (user && decoded.email && user.email !== decoded.email.toLowerCase().trim()) {
          console.warn(`[AuthMiddleware] ⚠️ Token email mismatch! token=${decoded.email} db=${user.email} — rejecting`);
          return res.status(401).json({ success: false, message: 'Invalid or expired session. Please sign in again.' });
        }

        // FALLBACK: id-less tokens (very old sessions) — only if no id in token
      } else if (decoded && decoded.email && !decoded.id) {
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
