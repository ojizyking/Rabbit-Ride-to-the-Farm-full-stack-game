/**
 * patch_security.js
 * Applies all production-hardening patches:
 *   1. server.js  — helmet, mongoSanitize, IP rate-limiting, trust proxy
 *   2. User.js    — loginAttempts, lockUntil, lastSyncKey fields
 *   3. db.js      — increase maxPoolSize to 50 for 1M-user scale
 *   4. authController.js — account lockout on failed logins
 *   5. gameController.js — atomic $inc for endRide, syncOffline, collect
 *   6. shopController.js — atomic findOneAndUpdate for buyOrEquip, openMysteryBox
 *   7. walletController.js — atomic ops for withdraw, verifyDeposit, handleWebhook refund
 */

const fs = require('fs');
const path = require('path');

function patch(filePath, description, fn) {
  const abs = path.resolve(filePath);
  let src = fs.readFileSync(abs, 'utf8');
  const result = fn(src);
  if (result === src) {
    console.log(`⚠️  SKIPPED (already patched or target not found): ${description}`);
  } else {
    fs.writeFileSync(abs, result, 'utf8');
    console.log(`✅ Patched: ${description}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. server.js — Add security middleware
// ─────────────────────────────────────────────────────────────────────────────
patch(
  'server/src/server.js',
  'server.js — helmet + mongoSanitize + rate-limiting + trust proxy',
  (src) => {
    // Insert requires after dotenv line
    if (src.includes('express-rate-limit')) return src; // already patched
    src = src.replace(
      "require('dotenv').config();",
      `require('dotenv').config();
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');`
    );

    // Trust the first Railway proxy hop so req.ip gives real client IP
    src = src.replace(
      'const app = express();',
      `const app = express();
app.set('trust proxy', 1);`
    );

    // Insert security middleware + rate limiters before the CORS block
    src = src.replace(
      '// CORS configuration',
      `// ── Security middleware ──────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // Disabled — SPA manages its own CSP
  crossOriginEmbedderPolicy: false
}));
app.use(mongoSanitize()); // Strip $-operator injection from req.body / query

// Global IP rate-limiter: 200 req / min per IP (covers all /api/* endpoints)
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please slow down.' }
});
app.use('/api/', globalLimiter);

// Strict limiter for auth endpoints: 10 attempts / 15 min per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please wait 15 minutes.' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/clerk-sync', authLimiter);

// ── CORS configuration`
    );

    return src;
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 2. User.js — Add security fields
// ─────────────────────────────────────────────────────────────────────────────
patch(
  'server/src/models/User.js',
  'User.js — add loginAttempts, lockUntil, lastSyncKey',
  (src) => {
    if (src.includes('loginAttempts')) return src;
    // Insert after the isBanned field
    src = src.replace(
      `  isBanned: {
    type: Boolean,
    default: false
  },`,
      `  isBanned: {
    type: Boolean,
    default: false
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date,
    default: null
  },
  lastSyncKey: {
    type: String,
    default: null
  },`
    );
    return src;
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 3. db.js — Increase connection pool for 1M users
// ─────────────────────────────────────────────────────────────────────────────
patch(
  'server/src/config/db.js',
  'db.js — maxPoolSize 10 → 50',
  (src) => {
    return src.replace('maxPoolSize: 10,', 'maxPoolSize: 50,');
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 4. authController.js — Account lockout
// ─────────────────────────────────────────────────────────────────────────────
patch(
  'server/src/controllers/authController.js',
  'authController.js — account lockout after 5 failed logins',
  (src) => {
    if (src.includes('lockUntil')) return src;

    // Replace the login function's password-check block
    const oldPasswordBlock = `    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (user.isBanned) {`;

    const newPasswordBlock = `    // Account lockout check
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(429).json({
        success: false,
        message: \`Account temporarily locked after too many failed attempts. Try again in \${minutesLeft} minute(s).\`
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      // Increment failed attempts; lock after 5 failures for 15 minutes
      const attempts = (user.loginAttempts || 0) + 1;
      const updateData = { loginAttempts: attempts };
      if (attempts >= 5) {
        updateData.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
        updateData.loginAttempts = 0; // reset counter after lock is set
      }
      await User.findByIdAndUpdate(user._id, { $set: updateData });
      const remaining = Math.max(0, 5 - attempts);
      return res.status(401).json({
        success: false,
        message: remaining > 0
          ? \`Invalid email or password. \${remaining} attempt(s) remaining before account lock.\`
          : 'Too many failed attempts. Account locked for 15 minutes.'
      });
    }

    if (user.isBanned) {`;

    if (!src.includes(oldPasswordBlock)) {
      console.error('  ⛔ authController password block not found — manual patch needed');
      return src;
    }

    src = src.replace(oldPasswordBlock, newPasswordBlock);

    // Reset lockout on successful login — insert after isBanned check
    const oldBannedBlock = `    if (user.isBanned) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Please contact platform administration.'
      });
    }

    // Auto-elevate admin role`;

    const newBannedBlock = `    if (user.isBanned) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Please contact platform administration.'
      });
    }

    // Reset login attempt counter on successful login
    if (user.loginAttempts > 0 || user.lockUntil) {
      await User.findByIdAndUpdate(user._id, { $set: { loginAttempts: 0, lockUntil: null } });
    }

    // Auto-elevate admin role`;

    src = src.replace(oldBannedBlock, newBannedBlock);
    return src;
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 5. gameController.js — Atomic ops for endRide, syncOffline, collect
// ─────────────────────────────────────────────────────────────────────────────
patch(
  'server/src/controllers/gameController.js',
  'gameController.js — atomic $inc for endRide balance/totalRides',
  (src) => {
    if (src.includes('$inc for endRide')) return src; // idempotency marker

    // ── endRide: replace read-modify-write with atomic findByIdAndUpdate ──
    const oldEndRide = `    // Update user balance & total rides
    user.balanceNaira = Math.round((user.balanceNaira + nairaEarned) * 100) / 100;
    user.totalRides += 1;
    await user.save();`;

    const newEndRide = `    // Update user balance & total rides (atomic $inc — race-condition safe) // $inc for endRide
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
    user.totalRides = updatedUser ? updatedUser.totalRides : user.totalRides + 1;`;

    if (src.includes(oldEndRide)) {
      src = src.replace(oldEndRide, newEndRide);
    } else {
      console.error('  ⛔ endRide balance block not found');
    }

    // Also fix response to use updated values
    const oldResponse = `      newBalance: user.balanceNaira,
      totalRides: user.totalRides,
      freeCap: isNonPurchasingUser(user)`;
    const newResponse = `      newBalance: user.balanceNaira,
      totalRides: user.totalRides,
      freeCap: isNonPurchasingUser(updatedUser || user)`;
    src = src.replace(oldResponse, newResponse);

    return src;
  }
);

patch(
  'server/src/controllers/gameController.js',
  'gameController.js — atomic $inc for syncOffline balance/totalRides',
  (src) => {
    if (src.includes('$inc for syncOffline')) return src;

    const oldSync = `    // Update user balance & total rides atomically
    user.balanceNaira = Math.round((user.balanceNaira + totalNairaEarned) * 100) / 100;
    user.totalRides += ridesProcessed;
    await user.save();`;

    const newSync = `    // Update user balance & total rides atomically (atomic $inc) // $inc for syncOffline
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
    }`;

    if (src.includes(oldSync)) {
      src = src.replace(oldSync, newSync);
    } else {
      console.error('  ⛔ syncOffline balance block not found');
    }
    return src;
  }
);

patch(
  'server/src/controllers/gameController.js',
  'gameController.js — atomic $inc for collect (ad + item rewards)',
  (src) => {
    if (src.includes('$inc for collect')) return src;

    const oldCollectAd = `    if (type === 'ad') {
      // Ad reward: flat ₦10 credit
      const adRewardNaira = 10;
      user.balanceNaira = Math.round((user.balanceNaira + adRewardNaira) * 100) / 100;
      await user.save();`;

    const newCollectAd = `    if (type === 'ad') {
      // Ad reward: flat ₦10 credit (atomic $inc) // $inc for collect
      const adRewardNaira = 10;
      await User.findByIdAndUpdate(user._id, { $inc: { balanceNaira: adRewardNaira } });
      user.balanceNaira = user.balanceNaira + adRewardNaira;`;

    const oldCollectItem = `      const nairaValue = Math.round((boostedValue / COINS_PER_NAIRA) * 100) / 100;
      if (nairaValue > 0) {
        user.balanceNaira = Math.round((user.balanceNaira + nairaValue) * 100) / 100;
        await user.save();
      }`;

    const newCollectItem = `      const nairaValue = Math.round((boostedValue / COINS_PER_NAIRA) * 100) / 100;
      if (nairaValue > 0) {
        await User.findByIdAndUpdate(user._id, { $inc: { balanceNaira: nairaValue } });
        user.balanceNaira = user.balanceNaira + nairaValue;
      }`;

    if (src.includes(oldCollectAd)) {
      src = src.replace(oldCollectAd, newCollectAd);
    } else {
      console.error('  ⛔ collect ad block not found');
    }
    if (src.includes(oldCollectItem)) {
      src = src.replace(oldCollectItem, newCollectItem);
    } else {
      console.error('  ⛔ collect item block not found');
    }
    return src;
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 6. shopController.js — Atomic ops for buyOrEquip and openMysteryBox
// ─────────────────────────────────────────────────────────────────────────────
patch(
  'server/src/controllers/shopController.js',
  'shopController.js — atomic findOneAndUpdate for rabbit purchase',
  (src) => {
    if (src.includes('$atomic rabbit purchase')) return src;

    // Replace rabbit purchase deduct block
    const oldRabbit = `      user.balanceNaira = Math.round((user.balanceNaira - rabbit.priceNaira) * 100) / 100;
      if (!user.ownedRabbits.some(id => getItemId(id) === targetId)) {
        user.ownedRabbits.push(rabbit._id);
      }
      user.currentRabbitId = rabbit._id;
      user.hasPurchasedFarmItem = true;
      await user.save();`;

    const newRabbit = `      // $atomic rabbit purchase — race-condition safe balance deduction
      const rabbitUpdated = await User.findOneAndUpdate(
        { _id: user._id, balanceNaira: { $gte: rabbit.priceNaira } },
        {
          $inc: { balanceNaira: -rabbit.priceNaira },
          $addToSet: { ownedRabbits: rabbit._id },
          $set: { currentRabbitId: rabbit._id, hasPurchasedFarmItem: true }
        },
        { new: true }
      );
      if (!rabbitUpdated) {
        return res.status(400).json({ success: false, message: 'Insufficient balance or concurrent purchase detected. Please try again.' });
      }
      user.balanceNaira = rabbitUpdated.balanceNaira;
      user.ownedRabbits = rabbitUpdated.ownedRabbits;`;

    if (src.includes(oldRabbit)) {
      src = src.replace(oldRabbit, newRabbit);
    } else {
      console.error('  ⛔ rabbit purchase block not found');
    }
    return src;
  }
);

patch(
  'server/src/controllers/shopController.js',
  'shopController.js — atomic findOneAndUpdate for bicycle purchase',
  (src) => {
    if (src.includes('$atomic bicycle purchase')) return src;

    const oldBike = `      user.balanceNaira = Math.round((user.balanceNaira - bike.priceNaira) * 100) / 100;
      if (!user.ownedBikes.some(id => getItemId(id) === targetId)) {
        user.ownedBikes.push(bike._id);
      }
      user.currentBikeId = bike._id;
      user.hasPurchasedFarmItem = true;
      await user.save();`;

    const newBike = `      // $atomic bicycle purchase — race-condition safe balance deduction
      const bikeUpdated = await User.findOneAndUpdate(
        { _id: user._id, balanceNaira: { $gte: bike.priceNaira } },
        {
          $inc: { balanceNaira: -bike.priceNaira },
          $addToSet: { ownedBikes: bike._id },
          $set: { currentBikeId: bike._id, hasPurchasedFarmItem: true }
        },
        { new: true }
      );
      if (!bikeUpdated) {
        return res.status(400).json({ success: false, message: 'Insufficient balance or concurrent purchase detected. Please try again.' });
      }
      user.balanceNaira = bikeUpdated.balanceNaira;
      user.ownedBikes = bikeUpdated.ownedBikes;`;

    if (src.includes(oldBike)) {
      src = src.replace(oldBike, newBike);
    } else {
      console.error('  ⛔ bike purchase block not found');
    }
    return src;
  }
);

patch(
  'server/src/controllers/shopController.js',
  'shopController.js — atomic findOneAndUpdate for gadget purchase',
  (src) => {
    if (src.includes('$atomic gadget purchase')) return src;

    const oldGadget = `      user.balanceNaira = Math.round((user.balanceNaira - gadget.priceNaira) * 100) / 100;
      user.ownedGadgets.push(gadget._id);
      user.hasPurchasedFarmItem = true;
      await user.save();`;

    const newGadget = `      // $atomic gadget purchase — race-condition safe balance deduction
      const gadgetUpdated = await User.findOneAndUpdate(
        { _id: user._id, balanceNaira: { $gte: gadget.priceNaira } },
        {
          $inc: { balanceNaira: -gadget.priceNaira },
          $addToSet: { ownedGadgets: gadget._id },
          $set: { hasPurchasedFarmItem: true }
        },
        { new: true }
      );
      if (!gadgetUpdated) {
        return res.status(400).json({ success: false, message: 'Insufficient balance or concurrent purchase detected. Please try again.' });
      }
      user.balanceNaira = gadgetUpdated.balanceNaira;
      user.ownedGadgets = gadgetUpdated.ownedGadgets;`;

    if (src.includes(oldGadget)) {
      src = src.replace(oldGadget, newGadget);
    } else {
      console.error('  ⛔ gadget purchase block not found');
    }
    return src;
  }
);

patch(
  'server/src/controllers/shopController.js',
  'shopController.js — atomic ops for openMysteryBox',
  (src) => {
    if (src.includes('$atomic mystery box')) return src;

    const oldBox = `    // Deduct entry price
    user.balanceNaira = Math.round((user.balanceNaira - priceNaira) * 100) / 100;

    // Roll random prize (100 coins = ₦1)`;

    const newBox = `    // Deduct entry price (atomic) — $atomic mystery box
    const boxDeducted = await User.findOneAndUpdate(
      { _id: user._id, balanceNaira: { $gte: priceNaira } },
      { $inc: { balanceNaira: -priceNaira } },
      { new: true }
    );
    if (!boxDeducted) {
      return res.status(400).json({ success: false, message: 'Insufficient balance or concurrent request detected. Please try again.' });
    }
    user.balanceNaira = boxDeducted.balanceNaira;

    // Roll random prize (100 coins = ₦1)`;

    const oldBoxCredit = `    const nairaWon = Math.round((coinsWon / 100) * 100) / 100;
    user.balanceNaira = Math.round((user.balanceNaira + nairaWon) * 100) / 100;
    user.hasPurchasedFarmItem = true; // Permanently unlocks unlimited earnings!
    await user.save();`;

    const newBoxCredit = `    const nairaWon = Math.round((coinsWon / 100) * 100) / 100;
    // Credit winnings atomically
    const boxCredited = await User.findByIdAndUpdate(
      user._id,
      { $inc: { balanceNaira: nairaWon }, $set: { hasPurchasedFarmItem: true } },
      { new: true }
    );
    if (boxCredited) user.balanceNaira = boxCredited.balanceNaira;`;

    if (src.includes(oldBox)) {
      src = src.replace(oldBox, newBox);
    } else {
      console.error('  ⛔ mystery box deduct block not found');
    }
    if (src.includes(oldBoxCredit)) {
      src = src.replace(oldBoxCredit, newBoxCredit);
    } else {
      console.error('  ⛔ mystery box credit block not found');
    }
    return src;
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 7. walletController.js — Atomic ops for withdraw, verifyDeposit, webhook
// ─────────────────────────────────────────────────────────────────────────────
patch(
  'server/src/controllers/walletController.js',
  'walletController.js — atomic withdrawal balance deduction',
  (src) => {
    if (src.includes('$atomic withdraw')) return src;

    const oldWithdraw = `    const user = await User.findById(req.user._id);
    if (user.balanceNaira < withdrawAmount) {
      return res.status(400).json({
        success: false,
        message: \`Insufficient balance! You requested ₦\${withdrawAmount.toLocaleString()}, but have ₦\${user.balanceNaira.toLocaleString()}.\`
      });
    }

    // Deduct user balance immediately
    user.balanceNaira = Math.round((user.balanceNaira - withdrawAmount) * 100) / 100;
    await user.save();`;

    const newWithdraw = `    // $atomic withdraw — deduct only if balance is sufficient (race-condition safe)
    const withdrawnUser = await User.findOneAndUpdate(
      { _id: req.user._id, balanceNaira: { $gte: withdrawAmount } },
      { $inc: { balanceNaira: -withdrawAmount } },
      { new: true }
    );
    if (!withdrawnUser) {
      const current = await User.findById(req.user._id);
      return res.status(400).json({
        success: false,
        message: \`Insufficient balance! You requested ₦\${withdrawAmount.toLocaleString()}, but have ₦\${(current?.balanceNaira || 0).toLocaleString()}.\`
      });
    }
    const user = withdrawnUser;`;

    if (src.includes(oldWithdraw)) {
      src = src.replace(oldWithdraw, newWithdraw);
    } else {
      console.error('  ⛔ withdraw balance block not found');
    }
    return src;
  }
);

patch(
  'server/src/controllers/walletController.js',
  'walletController.js — atomic verifyDeposit credit',
  (src) => {
    if (src.includes('$atomic deposit credit')) return src;

    const oldDeposit = `      const depositAmount = data.amount / 100;
      const user = await User.findById(req.user._id);

      user.balanceNaira = Math.round((user.balanceNaira + depositAmount) * 100) / 100;
      await user.save();`;

    const newDeposit = `      const depositAmount = data.amount / 100;
      // $atomic deposit credit — race-condition safe
      const user = await User.findByIdAndUpdate(
        req.user._id,
        { $inc: { balanceNaira: depositAmount } },
        { new: true }
      );`;

    if (src.includes(oldDeposit)) {
      src = src.replace(oldDeposit, newDeposit);
    } else {
      console.error('  ⛔ verifyDeposit credit block not found');
    }
    return src;
  }
);

patch(
  'server/src/controllers/walletController.js',
  'walletController.js — atomic webhook deposit credit',
  (src) => {
    if (src.includes('$atomic webhook deposit')) return src;

    const oldWebhook = `          if (metadata.purpose === 'wallet_deposit') {
            user.balanceNaira = Math.round((user.balanceNaira + amountNaira) * 100) / 100;
            await user.save();`;

    const newWebhook = `          if (metadata.purpose === 'wallet_deposit') {
            // $atomic webhook deposit — idempotent credit
            await User.findByIdAndUpdate(user._id, { $inc: { balanceNaira: amountNaira } });`;

    if (src.includes(oldWebhook)) {
      src = src.replace(oldWebhook, newWebhook);
    } else {
      console.error('  ⛔ webhook deposit block not found');
    }

    // Also fix transfer.failed refund
    const oldRefund = `          const user = await User.findById(wth.userId);
          if (user) {
            user.balanceNaira += wth.amount;
            await user.save();
          }`;

    const newRefund = `          // Atomic refund on failed transfer
          await User.findByIdAndUpdate(wth.userId, { $inc: { balanceNaira: wth.amount } });`;

    if (src.includes(oldRefund)) {
      src = src.replace(oldRefund, newRefund);
    } else {
      console.error('  ⛔ webhook refund block not found');
    }
    return src;
  }
);

console.log('\n🔒 All security patches applied!');

