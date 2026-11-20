/**
 * economy.js — Rabbit Ride shared economy engine.
 * Single source of truth for all earning caps, boosts, and daily resets.
 * Import this everywhere — never duplicate cap logic.
 */

const WAT_OFFSET_MS = 60 * 60 * 1000; // WAT = UTC+1

// ── Caps & Limits ─────────────────────────────────────────────────────────────
const COINS_PER_NAIRA        = 1000;   // 1,000 coins = ₦1
const BASE_DAILY_CAP_COINS   = 15000;  // free player gameplay only
const AD_DAILY_CAP_COINS     = 50000;  // free player gameplay + ads combined
const COINS_PER_AD           = 3500;   // one 30-sec rewarded ad
const MAX_ADS_PER_DAY        = 10;
const MAX_PACKS_PER_USER     = 3;
const PACK_DAILY_CAP_CEILING = 150;    // ₦150 max extra from all packs/day
const COIN_EXPIRY_DAYS       = 7;
const ANTI_CHEAT_MAX_COINS   = 50000;  // hard per-ride ceiling (server-side)

// ── Helpers ───────────────────────────────────────────────────────────────────
function getTodayWAT() {
  return new Date(Date.now() + WAT_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * Returns the user's active boost % (highest single pack — boosts do NOT add).
 */
function getActiveBoostPct(user) {
  const now = new Date();
  const active = (user.activePacks || []).filter(p =>
    p.status === 'active' && new Date(p.expiresAt) > now
  );
  if (!active.length) return 0;
  return Math.max(...active.map(p => Number(p.boostPct) || 0));
}

/**
 * Returns extra daily earning cap in Naira from all active packs (ceiling ₦150).
 */
function getPackDailyCapNaira(user) {
  const now = new Date();
  const active = (user.activePacks || []).filter(p =>
    p.status === 'active' && new Date(p.expiresAt) > now
  );
  const total = active.reduce((sum, p) => sum + (Number(p.dailyCapNaira) || 0), 0);
  return Math.min(total, PACK_DAILY_CAP_CEILING);
}

/**
 * Lazy daily reset: call at the start of every earning request.
 * Resets daily counters if the WAT date has changed. Returns true if reset.
 */
function maybeResetDailyCounters(user) {
  const today = getTodayWAT();
  if (user.dailyEarningDate !== today) {
    user.dailyEarningDate    = today;
    user.dailyCoinsEarned    = 0;
    user.dailyAdCoinsEarned  = 0;
    user.dailyAdsWatched     = 0;
    return true;
  }
  return false;
}

/**
 * Expire any packs on the user whose expiresAt has passed.
 * Mutates user.activePacks in-place. Returns true if any were expired.
 */
function expireUserPacks(user) {
  const now = new Date();
  let changed = false;
  (user.activePacks || []).forEach(p => {
    if (p.status === 'active' && new Date(p.expiresAt) <= now) {
      p.status = 'expired';
      changed = true;
    }
  });
  return changed;
}

module.exports = {
  COINS_PER_NAIRA,
  BASE_DAILY_CAP_COINS,
  AD_DAILY_CAP_COINS,
  COINS_PER_AD,
  MAX_ADS_PER_DAY,
  MAX_PACKS_PER_USER,
  PACK_DAILY_CAP_CEILING,
  COIN_EXPIRY_DAYS,
  ANTI_CHEAT_MAX_COINS,
  getTodayWAT,
  getActiveBoostPct,
  getPackDailyCapNaira,
  maybeResetDailyCounters,
  expireUserPacks,
};
