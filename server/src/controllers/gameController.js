const User = require('../models/User');
const Ride = require('../models/Ride');
const Transaction = require('../models/Transaction');

function getTierMultiplier(tier) {
  switch (tier) {
    case 'elite': return 1.50; // +50%
    case 'pro': return 1.25;   // +25%
    case 'growth': return 1.10; // +10%
    case 'basic': return 1.05;  // +5%
    case 'free':
    default:
      return 1.0;
  }
}

function getTodayString() {
  return new Date().toISOString().slice(0, 10);
}

// Anti-cheat bounds
const MAX_COINS_PER_RIDE = 10000;
const MAX_RIDES_PER_SYNC = 20;

exports.startRide = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const today = getTodayString();

    if (user.lastRideDate !== today) {
      user.lastRideDate = today;
      user.dailyRidesToday = 0;
    }

    const isPaid = user.subscriptionTier && user.subscriptionTier !== 'free';

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

    return res.json({
      success: true,
      canRide: true,
      tier: user.subscriptionTier,
      dailyRidesToday: user.dailyRidesToday,
      remainingRidesToday: remainingRides,
      boostMultiplier: getTierMultiplier(user.subscriptionTier)
    });
  } catch (err) {
    console.error('startRide error:', err);
    return res.status(500).json({ success: false, message: 'Server error starting ride.' });
  }
};

exports.collect = async (req, res) => {
  try {
    const { type, value = 1 } = req.body;
    const user = await User.findById(req.user._id);

    const multiplier = getTierMultiplier(user.subscriptionTier);

    let baseValue = Number(value);
    if (type === 'star') baseValue = 5;
    else if (type === 'carrot') baseValue = 10;
    else if (type === 'crate') baseValue = typeof value === 'number' && value > 10 ? value : 50;
    else if (type === 'ad') baseValue = 100;

    const boostedValue = Math.round(baseValue * multiplier);

    // Credit all collectible types to user balance (convert coins to Naira: 20 coins = ₦1)
    if (type === 'ad') {
      // Ad reward: flat ₦10 credit
      const adRewardNaira = 10;
      user.balanceNaira = Math.round((user.balanceNaira + adRewardNaira) * 100) / 100;
      await user.save();
      await Transaction.create({
        userId: user._id,
        type: 'earn',
        amount: adRewardNaira,
        description: 'Sponsor Billboard Ad View (30s)',
        status: 'completed'
      });
    } else {
      // Stars, carrots, crates: convert boosted coin value to Naira and persist
      const nairaValue = Math.round((boostedValue / 20) * 100) / 100;
      if (nairaValue > 0) {
        user.balanceNaira = Math.round((user.balanceNaira + nairaValue) * 100) / 100;
        await user.save();
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
    const {
      coins = 0,
      distance = 0,
      stars = 0,
      carrots = 0,
      boxes = 0,
      adViews = 0
    } = req.body;

    const user = await User.findById(req.user._id);
    const multiplier = getTierMultiplier(user.subscriptionTier);

    // Calculate Naira earned from coins/tokens: 1,000 coins = 50 Naira (20 coins = 1 Naira) + tier boost multiplier
    const totalCoins = Math.min(Math.max(0, Number(coins)), MAX_COINS_PER_RIDE);
    const baseNaira = totalCoins / 20;
    const nairaEarned = Math.round(baseNaira * multiplier * 100) / 100;
    const distanceKm = Number((Number(distance) / 1000).toFixed(2)) || 0.5;

    // Create Ride record
    const ride = new Ride({
      userId: user._id,
      coins: totalCoins,
      stars: Number(stars),
      carrots: Number(carrots),
      boxes: Number(boxes),
      adViews: Number(adViews),
      nairaEarned,
      distanceKm
    });
    await ride.save();

    // Update user balance & total rides
    user.balanceNaira = Math.round((user.balanceNaira + nairaEarned) * 100) / 100;
    user.totalRides += 1;
    await user.save();

    // Create Transaction record
    if (nairaEarned > 0) {
      await Transaction.create({
        userId: user._id,
        type: 'earn',
        amount: nairaEarned,
        description: `Ride earnings (${distanceKm} km, ${totalCoins} tokens)`,
        status: 'completed'
      });
    }

    return res.json({
      success: true,
      message: 'Ride saved successfully!',
      rideId: ride._id,
      coins: totalCoins,
      nairaEarned,
      distanceKm,
      newBalance: user.balanceNaira,
      totalRides: user.totalRides
    });
  } catch (err) {
    console.error('endRide error:', err);
    return res.status(500).json({ success: false, message: 'Server error saving ride.' });
  }
};

/**
 * POST /api/game/sync-offline
 * Accepts an array of buffered offline rides and processes them server-side.
 * Ensures no coin earnings are ever lost due to network failures.
 */
exports.syncOffline = async (req, res) => {
  try {
    const { rides } = req.body;
    if (!Array.isArray(rides) || rides.length === 0) {
      return res.status(400).json({ success: false, message: 'No rides to sync.' });
    }

    if (rides.length > MAX_RIDES_PER_SYNC) {
      return res.status(400).json({ success: false, message: `Too many rides. Max ${MAX_RIDES_PER_SYNC} per sync.` });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const multiplier = getTierMultiplier(user.subscriptionTier);
    let totalNairaEarned = 0;
    let ridesProcessed = 0;
    const rideResults = [];

    for (const ride of rides) {
      const totalCoins = Math.min(Math.max(0, Number(ride.coins) || 0), MAX_COINS_PER_RIDE);

      // Anti-cheat: skip suspicious rides
      if (totalCoins > MAX_COINS_PER_RIDE) {
        rideResults.push({ skipped: true, reason: 'Suspicious coin count' });
        continue;
      }

      const baseNaira = totalCoins / 20;
      const nairaEarned = Math.round(baseNaira * multiplier * 100) / 100;
      const distanceKm = Number((Number(ride.distance || 0) / 1000).toFixed(2)) || 0.5;

      // Create Ride record
      const rideRecord = new Ride({
        userId: user._id,
        coins: totalCoins,
        stars: Number(ride.stars) || 0,
        carrots: Number(ride.carrots) || 0,
        boxes: Number(ride.boxes) || 0,
        adViews: Number(ride.adViews) || 0,
        nairaEarned,
        distanceKm
      });
      await rideRecord.save();

      // Create Transaction record
      if (nairaEarned > 0) {
        await Transaction.create({
          userId: user._id,
          type: 'earn',
          amount: nairaEarned,
          description: `Offline ride sync (${distanceKm} km, ${totalCoins} tokens)`,
          status: 'completed'
        });
      }

      totalNairaEarned += nairaEarned;
      ridesProcessed++;
      rideResults.push({ coins: totalCoins, nairaEarned, distanceKm });
    }

    // Update user balance & total rides atomically
    user.balanceNaira = Math.round((user.balanceNaira + totalNairaEarned) * 100) / 100;
    user.totalRides += ridesProcessed;
    await user.save();

    return res.json({
      success: true,
      message: `${ridesProcessed} offline ride(s) synced successfully!`,
      ridesProcessed,
      totalNairaEarned,
      newBalance: user.balanceNaira,
      totalRides: user.totalRides,
      rideResults
    });
  } catch (err) {
    console.error('syncOffline error:', err);
    return res.status(500).json({ success: false, message: 'Server error syncing offline rides.' });
  }
};
