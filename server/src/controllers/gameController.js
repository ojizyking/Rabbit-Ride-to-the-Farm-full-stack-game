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

    // If ad reward, credit 10 Naira directly to user balance
    if (type === 'ad') {
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

    // Calculate Naira earned from coins/tokens: 1,000 coins = 100 Naira (10 coins = 1 Naira) + tier boost multiplier
    const totalCoins = Math.max(0, Number(coins));
    const baseNaira = totalCoins / 10;
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
