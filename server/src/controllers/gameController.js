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

// Conversion Math: 10,000 coins = 100 Naira → 100 coins = 1 Naira (1 coin = 0.01 Naira / 1 Kobo)
const COINS_PER_NAIRA = 100;

// Anti-cheat bounds
const MAX_COINS_PER_RIDE = 50000; // 50,000 coins = ₦500
const MAX_RIDES_PER_SYNC = 20;

// Free-user (non-purchasing) carrot coin cap per ride run:
// ₦50 max → at 100 coins = ₦1 that's 5,000 coins worth of carrot earnings per run.
const FREE_USER_MAX_NAIRA_PER_RIDE = 50;
const FREE_USER_MAX_COINS_PER_RIDE = FREE_USER_MAX_NAIRA_PER_RIDE * COINS_PER_NAIRA; // 5,000 coins

/**
 * Returns true when the user has never purchased anything (free tier, no farm shop items or subscriptions).
 * Purchasing any rabbit, bike, or subscription removes the ₦50 cap.
 */
function isNonPurchasingUser(user) {
  const hasPaidTier = user.subscriptionTier && user.subscriptionTier !== 'free';
  const hasPurchasedRabbit = Array.isArray(user.ownedRabbits) && user.ownedRabbits.length > 1;
  const hasPurchasedBike = Array.isArray(user.ownedBikes) && user.ownedBikes.length > 1;
  return !hasPaidTier && !hasPurchasedRabbit && !hasPurchasedBike;
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
    if (type === 'star') baseValue = typeof value === 'number' && value > 5 ? value : 25;
    else if (type === 'carrot') baseValue = typeof value === 'number' && value > 10 ? value : 50;
    else if (type === 'crate') baseValue = typeof value === 'number' && value > 50 ? value : 250;
    else if (type === 'ad') baseValue = 1000;

    const boostedValue = Math.round(baseValue * multiplier);

    // Credit all collectible types to user balance (convert coins to Naira: 100 coins = ₦1)
    if (type === 'ad') {
      // Ad reward: flat ₦10 credit (atomic $inc) // $inc for collect
      const adRewardNaira = 10;
      await User.findByIdAndUpdate(user._id, { $inc: { balanceNaira: adRewardNaira } });
      user.balanceNaira = user.balanceNaira + adRewardNaira;
      await Transaction.create({
        userId: user._id,
        type: 'earn',
        amount: adRewardNaira,
        description: 'Sponsor Billboard Ad View (30s)',
        status: 'completed'
      });
    } else {
      // Stars, carrots, crates: convert boosted coin value to Naira and persist
      const nairaValue = Math.round((boostedValue / COINS_PER_NAIRA) * 100) / 100;
      if (nairaValue > 0) {
        await User.findByIdAndUpdate(user._id, { $inc: { balanceNaira: nairaValue } });
        user.balanceNaira = user.balanceNaira + nairaValue;
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

    // Calculate Naira earned from coins/tokens: 10,000 coins = 100 Naira (100 coins = 1 Naira) + tier boost multiplier
    // Apply free-user carrot coin cap: non-purchasing users earn at most ₦50 per ride run (5,000 coins).
    const rawCoins = Math.max(0, Number(coins));
    const coinCap = isNonPurchasingUser(user) ? FREE_USER_MAX_COINS_PER_RIDE : MAX_COINS_PER_RIDE;
    const totalCoins = Math.min(rawCoins, coinCap);
    const baseNaira = totalCoins / COINS_PER_NAIRA;
    // For free users, cap nairaEarned at FREE_USER_MAX_NAIRA_PER_RIDE (regardless of multiplier — free users have 1.0x anyway)
    const nairaEarned = isNonPurchasingUser(user)
      ? Math.min(Math.round(baseNaira * multiplier * 100) / 100, FREE_USER_MAX_NAIRA_PER_RIDE)
      : Math.round(baseNaira * multiplier * 100) / 100;
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

    // Update user balance & total rides (atomic $inc — race-condition safe) // $inc for endRide
    if (nairaEarned > 0) {
      await User.findByIdAndUpdate(user._id, {
        $inc: { balanceNaira: nairaEarned, totalRides: 1 }
      });
    } else {
      await User.findByIdAndUpdate(user._id, { $inc: { totalRides: 1 } });
    }
    // Re-fetch for accurate response balance
    const updatedUser = await User.findById(user._id);
    user.balanceNaira = updatedUser ? updatedUser.balanceNaira : user.balanceNaira + nairaEarned;
    user.totalRides = updatedUser ? updatedUser.totalRides : user.totalRides + 1;

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
      totalRides: user.totalRides,
      freeCap: isNonPurchasingUser(updatedUser || user) ? { applied: true, maxNaira: FREE_USER_MAX_NAIRA_PER_RIDE } : { applied: false }
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

      // Apply free-user cap (₦50 per ride run = 5,000 coins) during offline sync too
      const cappedCoins = isNonPurchasingUser(user) ? Math.min(totalCoins, FREE_USER_MAX_COINS_PER_RIDE) : totalCoins;
      const baseNaira = cappedCoins / COINS_PER_NAIRA;
      const nairaEarned = isNonPurchasingUser(user)
        ? Math.min(Math.round(baseNaira * multiplier * 100) / 100, FREE_USER_MAX_NAIRA_PER_RIDE)
        : Math.round(baseNaira * multiplier * 100) / 100;
      const distanceKm = Number((Number(ride.distance || 0) / 1000).toFixed(2)) || 0.5;

      // Create Ride record
      const rideRecord = new Ride({
        userId: user._id,
        coins: cappedCoins,
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

    // Update user balance & total rides atomically (atomic $inc) // $inc for syncOffline
    if (ridesProcessed > 0) {
      await User.findByIdAndUpdate(user._id, {
        $inc: {
          balanceNaira: totalNairaEarned,
          totalRides: ridesProcessed
        }
      });
    }
    const syncedUser = await User.findById(user._id);
    if (syncedUser) {
      user.balanceNaira = syncedUser.balanceNaira;
      user.totalRides = syncedUser.totalRides;
    }

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
 * Live YouTube song / video search without requiring external API keys.
 * Includes resilient fallbacks and recursive renderer parsing.
 */
exports.searchYouTube = async (req, res) => {
  const query = String(req.query.q || '').trim();
  const lowerQuery = query.toLowerCase();

  // If query is empty or requesting trending/default hits
  if (!query || lowerQuery === 'trending' || lowerQuery === 'popular' || lowerQuery === 'top' || lowerQuery === 'hits') {
    return res.json({ success: true, results: CURATED_FALLBACK_TRACKS.slice(0, 8) });
  }

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
      return res.json({ success: true, results });
    }

    // Fallback: match curated tracks by artist / title keywords
    const fallbackMatches = CURATED_FALLBACK_TRACKS.filter(t =>
      t.title.toLowerCase().includes(lowerQuery) ||
      t.channel.toLowerCase().includes(lowerQuery)
    );

    return res.json({
      success: true,
      results: fallbackMatches.length > 0 ? fallbackMatches : CURATED_FALLBACK_TRACKS.slice(0, 6)
    });
  } catch (err) {
    console.error('searchYouTube error:', err.message);
    // Even on network error, return curated fallback matches so UI never fails
    const fallbackMatches = CURATED_FALLBACK_TRACKS.filter(t =>
      t.title.toLowerCase().includes(lowerQuery) ||
      t.channel.toLowerCase().includes(lowerQuery)
    );
    return res.json({
      success: true,
      results: fallbackMatches.length > 0 ? fallbackMatches : CURATED_FALLBACK_TRACKS.slice(0, 6)
    });
  }
};
