/**
 * Cron job routes — protected by CRON_SECRET header
 *
 * Configure these in Render dashboard (Cron Jobs) or any cron scheduler:
 *   POST /api/cron/expire-packs   — Run hourly
 *   POST /api/cron/expire-coins   — Run daily at 01:00 WAT
 *
 * Header required: Authorization: Bearer <CRON_SECRET>
 */
const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const Transaction = require('../models/Transaction');

function cronAuth(req, res, next) {
  const secret = process.env.CRON_SECRET;
  // If no secret configured, only allow in development
  if (secret) {
    const auth = req.headers.authorization || '';
    if (auth !== `Bearer ${secret}`) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }
  } else if (process.env.NODE_ENV === 'production') {
    return res.status(401).json({ success: false, message: 'CRON_SECRET not configured.' });
  }
  next();
}

// ── POST /api/cron/expire-packs ───────────────────────────────────────────────
// Mark packs whose expiresAt has passed as 'expired'. Run hourly.
router.post('/expire-packs', cronAuth, async (req, res) => {
  try {
    const now = new Date();
    const users = await User.find({ 'activePacks.status': 'active' });
    let expiredCount = 0;

    for (const user of users) {
      let changed = false;
      (user.activePacks || []).forEach(p => {
        if (p.status === 'active' && new Date(p.expiresAt) <= now) {
          p.status  = 'expired';
          changed   = true;
          expiredCount++;
          // Log pack expiry as a transaction (non-blocking)
          Transaction.create({
            userId:      user._id,
            type:        'pack_expire',
            amount:      0,
            packId:      p.packId,
            description: `Pack expired: ${p.packName} (after ${p.durationDays || '?'} days)`,
            status:      'completed'
          }).catch(() => {});
        }
      });
      if (changed) await user.save();
    }

    console.log(`[cron/expire-packs] Expired ${expiredCount} pack(s) across ${users.length} user(s).`);
    return res.json({ success: true, expiredCount, usersChecked: users.length });
  } catch (err) {
    console.error('cron/expire-packs error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/cron/expire-coins ───────────────────────────────────────────────
// Zero play balance for users inactive for 7+ days. Run daily.
router.post('/expire-coins', cronAuth, async (req, res) => {
  try {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const staleUsers = await User.find({
      $or: [
        { coinsLastEarnedAt: { $lt: cutoff } },
        { coinsLastEarnedAt: null }
      ],
      balanceNaira: { $gt: 0 }
    });

    let expiredCount = 0;
    for (const user of staleUsers) {
      // Skip users with active packs (don't expire while pack is running)
      const hasActivePack = (user.activePacks || []).some(
        p => p.status === 'active' && new Date(p.expiresAt) > new Date()
      );
      if (hasActivePack) continue;

      const oldBal = user.balanceNaira;
      await User.findByIdAndUpdate(user._id, { $set: { balanceNaira: 0 } });
      await Transaction.create({
        userId:      user._id,
        type:        'coin_expire',
        amount:      -oldBal,
        description: `Play coins (₦${oldBal.toLocaleString()}) expired after 7 days of inactivity`,
        status:      'completed'
      });
      expiredCount++;
    }

    console.log(`[cron/expire-coins] Expired coins for ${expiredCount} user(s).`);
    return res.json({ success: true, expiredCount });
  } catch (err) {
    console.error('cron/expire-coins error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

