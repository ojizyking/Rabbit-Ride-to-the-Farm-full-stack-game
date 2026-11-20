const User = require('../models/User');
const Ride = require('../models/Ride');
const Transaction = require('../models/Transaction');
const {
  COINS_PER_NAIRA, BASE_DAILY_CAP_COINS, AD_DAILY_CAP_COINS,
  COINS_PER_AD, MAX_ADS_PER_DAY, ANTI_CHEAT_MAX_COINS,
  getTodayWAT, getActiveBoostPct, getPackDailyCapNaira, maybeResetDailyCounters, expireUserPacks
} = require('../lib/economy');

exports.startRide = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    expireUserPacks(user);
    maybeResetDailyCounters(user);
    const today = getTodayWAT();

    if (user.lastRideDate !== today) {
      user.lastRideDate = today;
      user.dailyRidesToday = 0;
    }

    const hasActivePack = (user.activePacks || []).some(p => p.status === 'active' && new Date(p.expiresAt) > new Date());
    const isPaid = (user.subscriptionTier && user.subscriptionTier !== 'free') || hasActivePack;

    if (!isPaid && user.dailyRidesToday >= 10) {
      return res.status(403).json({
        success: false,
        limitReached: true,
        message: 'Daily free limit of 10 rides reached! Upgrade to Basic, Growth, Pro, or Elite for unlimited rides.'
      });
    }

    user.dailyRidesToday += 1;
    await user.save();

    const remainingRides = isPaid ? 'Unlimited' : Math.max(0, 10 - user.dailyRidesToday);
    const boostPct = getActiveBoostPct(user);

    return res.json({
      success: true,
      canRide: true,
      tier: user.subscriptionTier,
      dailyRidesToday: user.dailyRidesToday,
      remainingRidesToday: remainingRides,
      boostMultiplier: 1 + (boostPct / 100)
    });
  } catch (err) {
    console.error('startRide error:', err);
    return res.status(500).json({ success: false, message: 'Server error starting ride.' });
  }
};

exports.collect = async (req, res) => {
  try {
    const { type, value = 1 } = req.body;
    let user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    expireUserPacks(user);
    maybeResetDailyCounters(user);
    const boostPct   = getActiveBoostPct(user);
    const multiplier = 1 + (boostPct / 100);

    let baseValue = Number(value);
    if (type === 'star') baseValue = typeof value === 'number' && value > 5 ? value : 25;
    else if (type === 'carrot') baseValue = typeof value === 'number' && value > 10 ? value : 50;
    else if (type === 'crate') baseValue = typeof value === 'number' && value > 50 ? value : 250;
    else if (type === 'ad') baseValue = 1000;

    const boostedValue = Math.round(baseValue * multiplier);

    // Credit all collectible types to user balance (convert coins to Naira: 1,000 coins = ₦1)
    if (type === 'ad') {
      // Check daily ad limit
      expireUserPacks(user);
      maybeResetDailyCounters(user);
      
      if ((user.dailyAdsWatched || 0) >= MAX_ADS_PER_DAY) {
        return res.status(429).json({
          success: false, limitReached: true,
          message: 'You\'ve watched 10 ads today! Come back tomorrow for more ad rewards.'
        });
      }

      const totalDailyCoins = (user.dailyCoinsEarned || 0) + (user.dailyAdCoinsEarned || 0);
      if (totalDailyCoins >= AD_DAILY_CAP_COINS) {
        return res.status(429).json({
          success: false, limitReached: true,
          message: 'Daily earning cap reached. Play again tomorrow!'
        });
      }

      const adCoins = COINS_PER_AD; // 3,500 coins per ad
      const adCreditCoins = Math.min(adCoins, AD_DAILY_CAP_COINS - totalDailyCoins);
      const adNaira = adCreditCoins / COINS_PER_NAIRA;

      await User.findByIdAndUpdate(user._id, {
        $inc: { balanceNaira: adNaira, dailyAdCoinsEarned: adCreditCoins, dailyAdsWatched: 1 },
        $set: { coinsLastEarnedAt: new Date() }
      });

      await Transaction.create({
        userId: user._id, type: 'earn_ad', amount: adNaira,
        coins: adCreditCoins, capApplied: adCreditCoins < adCoins,
        description: `Sponsor Billboard Ad View (30s) — ${adCreditCoins} coins`,
        status: 'completed'
      });

      const updatedUser = await User.findById(user._id);
      return res.json({
        success: true, type: 'ad',
        coinsEarned: adCreditCoins, nairaEarned: adNaira,
        adsWatchedToday: updatedUser?.dailyAdsWatched ?? 1,
        adsRemainingToday: Math.max(0, MAX_ADS_PER_DAY - (updatedUser?.dailyAdsWatched ?? 1)),
        newBalance: updatedUser?.balanceNaira ?? 0
      });
    } else {
      // Stars, carrots, crates: convert boosted coin value to Naira and persist
      const nairaValue = Math.round((boostedValue / COINS_PER_NAIRA) * 100) / 100;
      if (nairaValue > 0) {
        await User.findByIdAndUpdate(user._id, {
          $inc: { balanceNaira: nairaValue },
          $set: { coinsLastEarnedAt: new Date() }
        });
        user.balanceNaira = (user.balanceNaira || 0) + nairaValue;
      }
    }

    return res.json({
      success: true,
      type,
      baseValue,
      boostedValue,
      multiplier,
      newBalance: user.balanceNaira
    });
  } catch (err) {
    console.error('collect error:', err);
    return res.status(500).json({ success: false, message: 'Server error collecting item.' });
  }
};

exports.endRide = async (req, res) => {
  try {
    const { coins = 0, distance = 0, stars = 0, carrots = 0, boxes = 0, adViews = 0 } = req.body;

    let user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    // Expire stale packs, reset daily counters if new WAT day
    expireUserPacks(user);
    const wasReset = maybeResetDailyCounters(user);

    // Anti-cheat: hard ceiling per ride
    const rawCoins = Math.max(0, Math.min(Number(coins), ANTI_CHEAT_MAX_COINS));

    // Boost from highest active pack (not additive)
    const boostPct   = getActiveBoostPct(user);
    const multiplier = 1 + (boostPct / 100);
    const boostedCoins = Math.round(rawCoins * multiplier);

    // ── Free-tier gameplay daily cap ──────────────────────────────────────────
    const gameCapRemaining = Math.max(0, BASE_DAILY_CAP_COINS - (user.dailyCoinsEarned || 0));
    const creditGameCoins  = Math.min(boostedCoins, gameCapRemaining);
    const capApplied       = creditGameCoins < boostedCoins;

    // ── Pack extra earning (Naira on top of base cap) ─────────────────────────
    const packDailyCapNaira    = getPackDailyCapNaira(user);
    // Sum today's pack_earn transactions to know what's already been credited
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const packEarnedToday = await Transaction.aggregate([
      { $match: { userId: user._id, type: 'pack_earn', createdAt: { $gte: today } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const packEarnedTodayNaira = packEarnedToday[0]?.total || 0;
    const packRemainingNaira   = Math.max(0, packDailyCapNaira - packEarnedTodayNaira);

    // Pack withdrawable credit (convert game coins earned → Naira, capped by pack allowance)
    const gameNairaValue    = creditGameCoins / COINS_PER_NAIRA;
    let packNairaToCredit   = Math.min(packRemainingNaira, gameNairaValue);

    // Lifetime cap check per pack — reduce packNairaToCredit if any pack would overflow
    if (packNairaToCredit > 0) {
      let availableLifetime = 0;
      (user.activePacks || []).filter(p => p.status === 'active').forEach(p => {
        availableLifetime += Math.max(0, (p.lifetimeMaxNaira || 0) - (p.lifetimeEarnedNaira || 0));
      });
      packNairaToCredit = Math.min(packNairaToCredit, availableLifetime);
    }
    packNairaToCredit = Math.round(packNairaToCredit * 100) / 100;

    const distanceKm = Number((Number(distance) / 1000).toFixed(2)) || 0.5;

    // ── Save Ride record ──────────────────────────────────────────────────────
    const ride = new Ride({
      userId: user._id,
      coins: creditGameCoins,
      stars: Number(stars),
      carrots: Number(carrots),
      boxes: Number(boxes),
      adViews: Number(adViews),
      nairaEarned: gameNairaValue,
      distanceKm
    });
    await ride.save();

    // ── Atomic user update ────────────────────────────────────────────────────
    const incOp = {
      dailyCoinsEarned: creditGameCoins,
      totalRides: 1
    };
    if (gameNairaValue > 0) incOp.balanceNaira = gameNairaValue;
    if (packNairaToCredit > 0) incOp.withdrawableNaira = packNairaToCredit;

    const setOp = { coinsLastEarnedAt: new Date() };
    if (wasReset) {
      setOp.dailyEarningDate   = user.dailyEarningDate;
      setOp.dailyCoinsEarned   = creditGameCoins;
      setOp.dailyAdCoinsEarned = 0;
      setOp.dailyAdsWatched    = 0;
    }

    // Update pack lifetimeEarnedNaira in-place
    if (packNairaToCredit > 0) {
      let remaining = packNairaToCredit;
      (user.activePacks || []).filter(p => p.status === 'active').forEach(p => {
        if (remaining <= 0) return;
        const space = Math.max(0, (p.lifetimeMaxNaira || 0) - (p.lifetimeEarnedNaira || 0));
        const credit = Math.min(remaining, space);
        p.lifetimeEarnedNaira = (p.lifetimeEarnedNaira || 0) + credit;
        remaining -= credit;
      });
      setOp.activePacks = user.activePacks;
    }

    await User.findByIdAndUpdate(user._id, { $inc: incOp, $set: setOp });

    // ── Log transactions ──────────────────────────────────────────────────────
    await Transaction.create({
      userId: user._id, type: 'earn', amount: gameNairaValue,
      coins: creditGameCoins, capApplied,
      description: `Ride earnings (${distanceKm} km, ${creditGameCoins} coins)`,
      status: 'completed'
    });
    if (packNairaToCredit > 0) {
      await Transaction.create({
        userId: user._id, type: 'pack_earn', amount: packNairaToCredit,
        description: `Pack bonus earning (ride, ${boostPct}% boost)`, status: 'completed'
      });
    }

    const updatedUser = await User.findById(user._id);
    return res.json({
      success: true,
      message: 'Ride saved successfully!',
      rideId: ride._id,
      coins: creditGameCoins,
      nairaEarned: gameNairaValue,
      packNairaEarned: packNairaToCredit,
      boostPct,
      capApplied,
      distanceKm,
      newBalance: updatedUser?.balanceNaira ?? 0,
      withdrawableNaira: updatedUser?.withdrawableNaira ?? 0,
      totalRides: updatedUser?.totalRides ?? 0,
      dailyCoinsEarned: updatedUser?.dailyCoinsEarned ?? creditGameCoins,
      dailyCapCoins: BASE_DAILY_CAP_COINS
    });
  } catch (err) {
    console.error('endRide error:', err);
    return res.status(500).json({ success: false, message: 'Server error saving ride.' });
  }
};

exports.syncOffline = async (req, res) => {
  try {
    const { rides } = req.body;
    if (!Array.isArray(rides) || rides.length === 0) {
      return res.status(400).json({ success: false, message: 'No rides to sync.' });
    }

    if (rides.length > 20) {
      return res.status(400).json({ success: false, message: 'Too many rides. Max 20 per sync.' });
    }

    let user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    expireUserPacks(user);
    const wasReset = maybeResetDailyCounters(user);

    const boostPct = getActiveBoostPct(user);
    const multiplier = 1 + (boostPct / 100);
    const packDailyCapNaira = getPackDailyCapNaira(user);

    const todayDate = new Date(); todayDate.setHours(0, 0, 0, 0);
    const packEarnedToday = await Transaction.aggregate([
      { $match: { userId: user._id, type: 'pack_earn', createdAt: { $gte: todayDate } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    let packEarnedTodayNaira = packEarnedToday[0]?.total || 0;

    let totalNairaEarned = 0;
    let totalPackNairaEarned = 0;
    let totalCoinsEarned = 0;
    let ridesProcessed = 0;
    const rideResults = [];

    for (const ride of rides) {
      const rawCoins = Math.min(Math.max(0, Number(ride.coins) || 0), ANTI_CHEAT_MAX_COINS);

      // Anti-cheat: skip suspicious rides
      if ((Number(ride.coins) || 0) > ANTI_CHEAT_MAX_COINS) {
        rideResults.push({ skipped: true, reason: 'Suspicious coin count' });
        continue;
      }

      // Idempotency: if this syncKey was already processed, skip it silently
      // (handles network retries / double-submit without double-crediting)
      const syncKey = ride.syncKey ? String(ride.syncKey).slice(0, 64) : null;
      if (syncKey) {
        const existing = await Ride.findOne({ syncKey });
        if (existing) {
          rideResults.push({ skipped: true, reason: 'Already synced', syncKey });
          continue;
        }
      }

      const boostedCoins = Math.round(rawCoins * multiplier);
      const currentDailyCoins = (user.dailyCoinsEarned || 0) + totalCoinsEarned;
      const gameCapRemaining = Math.max(0, BASE_DAILY_CAP_COINS - currentDailyCoins);
      const creditGameCoins = Math.min(boostedCoins, gameCapRemaining);
      const capApplied = creditGameCoins < boostedCoins;
      const gameNairaValue = creditGameCoins / COINS_PER_NAIRA;

      const packRemainingNaira = Math.max(0, packDailyCapNaira - packEarnedTodayNaira);
      let packNairaToCredit = Math.min(packRemainingNaira, gameNairaValue);
      if (packNairaToCredit > 0) {
        let availableLifetime = 0;
        (user.activePacks || []).filter(p => p.status === 'active').forEach(p => {
          availableLifetime += Math.max(0, (p.lifetimeMaxNaira || 0) - (p.lifetimeEarnedNaira || 0));
        });
        packNairaToCredit = Math.min(packNairaToCredit, availableLifetime);
      }
      packNairaToCredit = Math.round(packNairaToCredit * 100) / 100;
      packEarnedTodayNaira += packNairaToCredit;

      if (packNairaToCredit > 0) {
        let remaining = packNairaToCredit;
        (user.activePacks || []).filter(p => p.status === 'active').forEach(p => {
          if (remaining <= 0) return;
          const space = Math.max(0, (p.lifetimeMaxNaira || 0) - (p.lifetimeEarnedNaira || 0));
          const credit = Math.min(remaining, space);
          p.lifetimeEarnedNaira = (p.lifetimeEarnedNaira || 0) + credit;
          remaining -= credit;
        });
      }

      const distanceKm = Number((Number(ride.distance || 0) / 1000).toFixed(2)) || 0.5;

      // Create Ride record (syncKey stored for idempotency — unique sparse index enforces once-only)
      const rideRecord = new Ride({
        userId: user._id,
        coins: creditGameCoins,
        stars: Number(ride.stars) || 0,
        carrots: Number(ride.carrots) || 0,
        boxes: Number(ride.boxes) || 0,
        adViews: Number(ride.adViews) || 0,
        nairaEarned: gameNairaValue,
        distanceKm,
        ...(syncKey ? { syncKey } : {})
      });
      await rideRecord.save();

      // Create Transaction record
      if (gameNairaValue > 0) {
        await Transaction.create({
          userId: user._id,
          type: 'earn',
          amount: gameNairaValue,
          coins: creditGameCoins,
          capApplied,
          description: `Offline ride sync (${distanceKm} km, ${creditGameCoins} coins)`,
          status: 'completed'
        });
      }

      if (packNairaToCredit > 0) {
        await Transaction.create({
          userId: user._id,
          type: 'pack_earn',
          amount: packNairaToCredit,
          description: `Pack bonus earning (offline ride, ${boostPct}% boost)`,
          status: 'completed'
        });
      }

      totalNairaEarned += gameNairaValue;
      totalPackNairaEarned += packNairaToCredit;
      totalCoinsEarned += creditGameCoins;
      ridesProcessed++;
      rideResults.push({ coins: creditGameCoins, nairaEarned: gameNairaValue, packNairaEarned: packNairaToCredit, distanceKm, capApplied });
    }

    // Update user balance & total rides atomically
    if (ridesProcessed > 0) {
      const incOp = {
        dailyCoinsEarned: totalCoinsEarned,
        totalRides: ridesProcessed
      };
      if (totalNairaEarned > 0) incOp.balanceNaira = totalNairaEarned;
      if (totalPackNairaEarned > 0) incOp.withdrawableNaira = totalPackNairaEarned;

      const setOp = {
        coinsLastEarnedAt: new Date(),
        activePacks: user.activePacks
      };
      if (wasReset) {
        setOp.dailyEarningDate = user.dailyEarningDate;
        setOp.dailyCoinsEarned = totalCoinsEarned;
        setOp.dailyAdCoinsEarned = 0;
        setOp.dailyAdsWatched = 0;
      }

      await User.findByIdAndUpdate(user._id, {
        $inc: incOp,
        $set: setOp
      });
    }

    const syncedUser = await User.findById(user._id);

    return res.json({
      success: true,
      message: `${ridesProcessed} offline ride(s) synced successfully!`,
      ridesProcessed,
      totalNairaEarned,
      totalPackNairaEarned,
      newBalance: syncedUser ? syncedUser.balanceNaira : user.balanceNaira,
      withdrawableNaira: syncedUser ? syncedUser.withdrawableNaira : user.withdrawableNaira,
      totalRides: syncedUser ? syncedUser.totalRides : user.totalRides,
      dailyCoinsEarned: syncedUser ? syncedUser.dailyCoinsEarned : user.dailyCoinsEarned,
      dailyCapCoins: BASE_DAILY_CAP_COINS,
      rideResults
    });
  } catch (err) {
    console.error('syncOffline error:', err);
    return res.status(500).json({ success: false, message: 'Server error syncing offline rides.' });
  }
};

exports.dailyStatus = async (req, res) => {
  try {
    let user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    expireUserPacks(user);
    maybeResetDailyCounters(user);
    await user.save();

    const boostPct         = getActiveBoostPct(user);
    const packDailyCapNaira= getPackDailyCapNaira(user);
    const totalDailyCoins  = (user.dailyCoinsEarned || 0) + (user.dailyAdCoinsEarned || 0);
    const adsWatched       = user.dailyAdsWatched || 0;

    // Coin expiry
    let coinExpiresAt = null;
    if (user.coinsLastEarnedAt) {
      const exp = new Date(user.coinsLastEarnedAt);
      exp.setDate(exp.getDate() + 7);
      coinExpiresAt = exp.toISOString();
    }

    return res.json({
      success: true,
      dailyCoinsEarned:    user.dailyCoinsEarned || 0,
      dailyAdCoinsEarned:  user.dailyAdCoinsEarned || 0,
      dailyAdsWatched:     adsWatched,
      adsRemainingToday:   Math.max(0, MAX_ADS_PER_DAY - adsWatched),
      gameCapCoins:        BASE_DAILY_CAP_COINS,
      adCapCoins:          AD_DAILY_CAP_COINS,
      totalDailyCoins,
      boostPct,
      packDailyCapNaira,
      activePacks:  (user.activePacks || []).filter(p => p.status === 'active').map(p => ({
        packId:        p.packId,
        packName:      p.packName,
        boostPct:      p.boostPct,
        dailyCapNaira: p.dailyCapNaira,
        lifetimeMaxNaira:    p.lifetimeMaxNaira,
        lifetimeEarnedNaira: p.lifetimeEarnedNaira,
        expiresAt:     p.expiresAt,
        daysLeft:      Math.max(0, Math.ceil((new Date(p.expiresAt) - new Date()) / 86400000))
      })),
      balanceNaira:      user.balanceNaira || 0,
      withdrawableNaira: user.withdrawableNaira || 0,
      coinExpiresAt
    });
  } catch (err) {
    console.error('dailyStatus error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// Curated fallback songs for instant offline / search fallback
const CURATED_FALLBACK_TRACKS = [
  { videoId: '421w1j87fEM', title: 'Burna Boy - Last Last (Official Video)', channel: 'Burna Boy', thumbnail: 'https://i.ytimg.com/vi/421w1j87fEM/hqdefault.jpg' },
  { videoId: 'hLDQ88vAhIs', title: 'Burna Boy - City Boys (Official Video)', channel: 'Burna Boy', thumbnail: 'https://i.ytimg.com/vi/hLDQ88vAhIs/hqdefault.jpg' },
  { videoId: 'lPe09eE6Xio', title: 'Burna Boy - Ye (Official Video)', channel: 'Burna Boy', thumbnail: 'https://i.ytimg.com/vi/lPe09eE6Xio/hqdefault.jpg' },
  { videoId: 'G_b-z_7vj74', title: 'Asake - Lonely At The Top (Official Video)', channel: 'Asake', thumbnail: 'https://i.ytimg.com/vi/G_b-z_7vj74/hqdefault.jpg' },
  { videoId: '7j61A-k4J2c', title: 'Asake - Basquiat (Official Video)', channel: 'Asake', thumbnail: 'https://i.ytimg.com/vi/7j61A-k4J2c/hqdefault.jpg' },
  { videoId: 'gVbfE_uA3Z8', title: 'Davido ft. Musa Keys - UNAVAILABLE (Official Video)', channel: 'Davido', thumbnail: 'https://i.ytimg.com/vi/gVbfE_uA3Z8/hqdefault.jpg' },
  { videoId: 'm7bc3yCG604', title: 'Wizkid ft. Tems - Essence (Official Video)', channel: 'Starboy TV', thumbnail: 'https://i.ytimg.com/vi/m7bc3yCG604/hqdefault.jpg' },
  { videoId: 'WcIcVapfqXw', title: 'Rema - Calm Down (Official Music Video)', channel: 'Rema', thumbnail: 'https://i.ytimg.com/vi/WcIcVapfqXw/hqdefault.jpg' },
  { videoId: 'c8v13S8jFss', title: 'Ayra Starr - Rush (Official Music Video)', channel: 'Ayra Starr', thumbnail: 'https://i.ytimg.com/vi/c8v13S8jFss/hqdefault.jpg' },
  { videoId: 'oXb1yE8gQ64', title: 'Omah Lay - soso (Official Music Video)', channel: 'Omah Lay', thumbnail: 'https://i.ytimg.com/vi/oXb1yE8gQ64/hqdefault.jpg' },
  { videoId: 'jfKfPfyJRdk', title: 'Lofi Girl - Relaxing Beats to Study & Chill', channel: 'Lofi Girl', thumbnail: 'https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg' },
  { videoId: '5qap5aO4i9A', title: 'Lofi Girl - Peaceful Instrumental Farm Beats', channel: 'Lofi Girl', thumbnail: 'https://i.ytimg.com/vi/5qap5aO4i9A/hqdefault.jpg' },
  { videoId: '4xDzrJKXOOY', title: 'Synthwave Turbo Ride - 80s Retro Electro', channel: 'Synthwave Radio', thumbnail: 'https://i.ytimg.com/vi/4xDzrJKXOOY/hqdefault.jpg' },
  { videoId: '1fueZCTYkpA', title: 'Sunny Country Acoustic Farm Hop', channel: 'Farm Sounds', thumbnail: 'https://i.ytimg.com/vi/1fueZCTYkpA/hqdefault.jpg' },
  { videoId: 'WPni755-Krg', title: 'Peaceful Piano & Acoustic Meadow Relax', channel: 'Relaxing Piano', thumbnail: 'https://i.ytimg.com/vi/WPni755-Krg/hqdefault.jpg' }
];

function extractVideoRenderers(obj, results, max = 10) {
  if (!obj || typeof obj !== 'object' || results.length >= max) return;
  if (obj.videoRenderer) {
    const v = obj.videoRenderer;
    const videoId = v.videoId;
    const title = v.title?.runs?.[0]?.text || v.title?.simpleText || '';
    const channel = v.ownerText?.runs?.[0]?.text || v.shortBylineText?.runs?.[0]?.text || '';
    const thumbs = v.thumbnail?.thumbnails || [];
    const thumbnail = thumbs[thumbs.length - 1]?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    if (videoId && title && !results.some(r => r.videoId === videoId)) {
      results.push({ videoId, title, channel, thumbnail });
    }
    return;
  }
  for (const key of Object.keys(obj)) {
    if (results.length >= max) break;
    extractVideoRenderers(obj[key], results, max);
  }
}

/**
 * GET /api/game/yt-search?q=query
 * GET /api/game/music-search?q=query
 * Live YouTube song / video search.
 * Priority: YouTube Data API v3 (if YOUTUBE_API_KEY set) → HTML scraping → curated fallback.
 */
exports.searchYouTube = async (req, res) => {
  const query = String(req.query.q || '').trim();
  const lowerQuery = query.toLowerCase();

  // If query is empty or requesting trending/default hits
  if (!query || lowerQuery === 'trending' || lowerQuery === 'popular' || lowerQuery === 'top' || lowerQuery === 'hits') {
    return res.json({ success: true, results: CURATED_FALLBACK_TRACKS.slice(0, 8) });
  }

  // ── Strategy 1: YouTube Data API v3 (quota-free for small traffic, reliable) ──
  const ytApiKey = process.env.YOUTUBE_API_KEY;
  if (ytApiKey) {
    try {
      const ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=10&q=${encodeURIComponent(query)}&key=${ytApiKey}`;
      const ytResp = await fetch(ytUrl, { signal: AbortSignal.timeout(6000) });
      if (ytResp.ok) {
        const ytData = await ytResp.json();
        const results = (ytData.items || []).map(item => ({
          videoId: item.id.videoId,
          title: item.snippet.title,
          channel: item.snippet.channelTitle,
          thumbnail: item.snippet.thumbnails?.medium?.url || `https://i.ytimg.com/vi/${item.id.videoId}/hqdefault.jpg`
        })).filter(r => r.videoId);
        if (results.length > 0) {
          return res.json({ success: true, results, source: 'yt-api-v3' });
        }
      }
    } catch (err) {
      console.warn('YouTube Data API v3 failed, falling back to scraping:', err.message);
    }
  }

  // ── Strategy 2: HTML scraping (no key required, may break if YT changes HTML) ──
  try {
    const response = await fetch('https://www.youtube.com/results?search_query=' + encodeURIComponent(query), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      signal: AbortSignal.timeout(6500)
    });

    const html = await response.text();
    const match =
      html.match(/var ytInitialData = ({.*?});<\/script>/s) ||
      html.match(/ytInitialData\s*=\s*({.+?});/) ||
      html.match(/window\["ytInitialData"\]\s*=\s*({.+?});/);

    const results = [];
    if (match) {
      try {
        const data = JSON.parse(match[1]);
        extractVideoRenderers(data, results, 10);
      } catch (err) {
        console.warn('Error parsing ytInitialData:', err.message);
      }
    }

    // If live search returned results, send them
    if (results.length > 0) {
      return res.json({ success: true, results, source: 'yt-scrape' });
    }
  } catch (err) {
    console.error('YouTube scrape failed:', err.message);
  }

  // ── Strategy 3: Curated fallback — always works ──
  const fallbackMatches = CURATED_FALLBACK_TRACKS.filter(t =>
    t.title.toLowerCase().includes(lowerQuery) ||
    t.channel.toLowerCase().includes(lowerQuery)
  );
  return res.json({
    success: true,
    results: fallbackMatches.length > 0 ? fallbackMatches : CURATED_FALLBACK_TRACKS.slice(0, 6),
    source: 'curated'
  });
};
