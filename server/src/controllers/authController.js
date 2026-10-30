const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Rabbit = require('../models/Rabbit');
const Bicycle = require('../models/Bicycle');
const Transaction = require('../models/Transaction');
const { generatePlayerId } = require('../models/modelAdapter');

const JWT_SECRET = process.env.JWT_SECRET || 'rabbit_super_secret_jwt_key_2026_farm_ride';
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'etizzer@gmail.com,admin@rabbitride.farm,admin@farm.com')
  .toLowerCase()
  .split(',')
  .map(e => e.trim())
  .filter(Boolean);

function resolveUserRole(email, existingRole) {
  if (existingRole === 'admin') return 'admin';
  const clean = (email || '').toLowerCase().trim();
  if (clean && (ADMIN_EMAILS.includes(clean) || clean === 'etizzer@gmail.com')) return 'admin';
  return 'user';
}

function generateToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role || 'user' },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

const DIVERSE_PREFIXES = [
  'RIDER', 'SWIFT', 'TURBO', 'CHAMP', 'DASH', 'FARM',
  'HOP', 'CARROT', 'ACE', 'SPEEDY', 'FLASH', 'VELO',
  'TRAIL', 'SPARK', 'BLAZE', 'STAR', 'ZOOM', 'HERO', 'BUNNY', 'SPRINT'
];

function generateCandidateReferralCode(hint) {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const getRandomChars = (len) => {
    let res = '';
    for (let i = 0; i < len; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };

  // Strategy 1: Personalized prefix from user's name or email if valid
  if (hint && typeof hint === 'string') {
    const rawName = hint.includes('@') ? hint.split('@')[0] : hint;
    const cleanName = rawName.replace(/[^a-zA-Z]/g, '').toUpperCase();
    const disallowed = ['ADMIN', 'USER', 'TEST', 'MAIL', 'GUEST', 'RABBIT'];
    if (cleanName.length >= 3 && !disallowed.includes(cleanName)) {
      const prefix = cleanName.slice(0, 5);
      return `${prefix}-${getRandomChars(3)}`;
    }
  }

  // Strategy 2: 80% themed diverse prefixes, 20% sleek 6-char alphanumeric
  if (Math.random() < 0.8) {
    const prefix = DIVERSE_PREFIXES[Math.floor(Math.random() * DIVERSE_PREFIXES.length)];
    return `${prefix}-${getRandomChars(3)}`;
  } else {
    return `${getRandomChars(3)}${getRandomChars(3)}`;
  }
}

async function getUniqueReferralCode(hint = '') {
  let code = generateCandidateReferralCode(hint);
  let existing = await User.findOne({ referralCode: code });
  let attempts = 0;
  while (existing && attempts < 15) {
    code = generateCandidateReferralCode(attempts > 3 ? '' : hint);
    existing = await User.findOne({ referralCode: code });
    attempts++;
  }

  // Guaranteed fallback
  if (existing) {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let extra = '';
    for (let i = 0; i < 4; i++) extra += chars.charAt(Math.floor(Math.random() * chars.length));
    code = `RIDER-${Date.now().toString(36).toUpperCase().slice(-3)}${extra.slice(0, 2)}`;
  }
  return code;
}

async function processReferralReward(newUserId, newUserEmail, referralCode) {
  if (!referralCode) return { referrerBonus: 0, refereeBonus: 0, referrerId: null };
  const cleanCode = String(referralCode).trim().toUpperCase();
  const referrer = await User.findOne({ referralCode: cleanCode });

  if (!referrer || referrer._id.toString() === newUserId.toString()) {
    return { referrerBonus: 0, refereeBonus: 0, referrerId: null };
  }

  // Credit Referrer ₦100 Reward
  referrer.balanceNaira = Math.round((referrer.balanceNaira + 100) * 100) / 100;
  referrer.referralsCount = (referrer.referralsCount || 0) + 1;
  referrer.referralEarnings = (referrer.referralEarnings || 0) + 100;
  await referrer.save();

  // Log transaction for referrer
  try {
    await Transaction.create({
      userId: referrer._id,
      type: 'referral',
      amount: 100,
      description: `Referral Bonus: Invited ${newUserEmail}`,
      status: 'completed'
    });
  } catch (err) {
    console.warn('Referral tx logging error (referrer):', err);
  }

  // Log transaction for referee
  try {
    await Transaction.create({
      userId: newUserId,
      type: 'referral',
      amount: 50,
      description: `Welcome Bonus: Invited by ${referrer.referralCode || cleanCode}`,
      status: 'completed'
    });
  } catch (err) {
    console.warn('Referral tx logging error (referee):', err);
  }

  console.log(`🎉 Referral credited! Referrer: ${referrer.email} (+₦100), Referee: ${newUserEmail} (+₦50)`);

  return { referrerBonus: 100, refereeBonus: 50, referrerId: referrer._id };
}

exports.register = async (req, res) => {
  try {
    const { email, password, referralCode } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Find default starter rabbit and bike
    const defaultRabbit = await Rabbit.findOne({ priceNaira: 0 });
    const defaultBike = await Bicycle.findOne({ priceNaira: 0 });

    const userReferralCode = await getUniqueReferralCode(cleanEmail);
    const playerId = generatePlayerId();

    const newUser = new User({
      playerId,
      email: cleanEmail,
      password: hashedPassword,
      balanceNaira: 50, // Standard welcome bonus!
      totalRides: 0,
      currentRabbitId: defaultRabbit ? defaultRabbit._id : null,
      currentBikeId: defaultBike ? defaultBike._id : null,
      ownedRabbits: defaultRabbit ? [defaultRabbit._id] : [],
      ownedBikes: defaultBike ? [defaultBike._id] : [],
      subscriptionTier: 'free',
      referralCode: userReferralCode,
      referralsCount: 0,
      referralEarnings: 0,
      role: resolveUserRole(cleanEmail, 'user')
    });

    // Check & credit referral bonus if invite code provided
    if (referralCode) {
      const refResult = await processReferralReward(newUser._id, cleanEmail, referralCode);
      if (refResult.referrerId) {
        newUser.referredBy = refResult.referrerId;
        newUser.balanceNaira += refResult.refereeBonus; // +₦50 referee welcome perk (starts with ₦100)
      }
    }

    await newUser.save();

    const populatedUser = await User.findById(newUser._id)
      .populate('currentRabbitId')
      .populate('currentBikeId')
      .populate('ownedRabbits')
      .populate('ownedBikes');

    const token = generateToken(newUser);

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully!',
      token,
      user: {
        id: populatedUser._id,
        playerId: populatedUser.playerId,
        email: populatedUser.email,
        role: populatedUser.role || 'user',
        balanceNaira: populatedUser.balanceNaira,
        totalRides: populatedUser.totalRides,
        subscriptionTier: populatedUser.subscriptionTier,
        subscriptionExpiresAt: populatedUser.subscriptionExpiresAt,
        referralCode: populatedUser.referralCode,
        referralsCount: populatedUser.referralsCount || 0,
        referralEarnings: populatedUser.referralEarnings || 0,
        currentRabbit: populatedUser.currentRabbitId,
        currentBike: populatedUser.currentBikeId,
        ownedRabbits: populatedUser.ownedRabbits,
        ownedBikes: populatedUser.ownedBikes
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Clerk-only accounts have no password — guide the user to sign in via Clerk
    if (!user.password) {
      return res.status(401).json({
        success: false,
        message: 'This account was created with Google/Clerk sign-in. Please use the "Sign in with Google" option instead.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (user.isBanned) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Please contact platform administration.'
      });
    }

    // Auto-elevate admin role if matching ADMIN_EMAILS
    const calculatedRole = resolveUserRole(user.email, user.role);
    if (calculatedRole !== user.role) {
      user.role = calculatedRole;
      await user.save();
    }

    // Auto-generate referral code if user doesn't have one
    if (!user.referralCode) {
      user.referralCode = await getUniqueReferralCode(user.firstName || user.email);
      await user.save();
    }

    // Auto-backfill playerId for existing users
    if (!user.playerId) {
      user.playerId = generatePlayerId();
      await user.save();
    }

    user.lastSeenAt = new Date();
    await user.save();

    const populatedUser = await User.findById(user._id)
      .populate('currentRabbitId')
      .populate('currentBikeId')
      .populate('ownedRabbits')
      .populate('ownedBikes');

    const token = generateToken(user);

    return res.json({
      success: true,
      message: 'Login successful!',
      token,
      user: {
        id: populatedUser._id,
        playerId: populatedUser.playerId,
        email: populatedUser.email,
        role: populatedUser.role || 'user',
        balanceNaira: populatedUser.balanceNaira,
        totalRides: populatedUser.totalRides,
        subscriptionTier: populatedUser.subscriptionTier,
        subscriptionExpiresAt: populatedUser.subscriptionExpiresAt,
        referralCode: populatedUser.referralCode,
        referralsCount: populatedUser.referralsCount || 0,
        referralEarnings: populatedUser.referralEarnings || 0,
        currentRabbit: populatedUser.currentRabbitId,
        currentBike: populatedUser.currentBikeId,
        ownedRabbits: populatedUser.ownedRabbits,
        ownedBikes: populatedUser.ownedBikes
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Server error during login.' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('currentRabbitId')
      .populate('currentBikeId')
      .populate('ownedRabbits')
      .populate('ownedBikes');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Auto-elevate admin role if matching ADMIN_EMAILS
    const calculatedRole = resolveUserRole(user.email, user.role);
    if (calculatedRole !== user.role) {
      user.role = calculatedRole;
      await user.save();
    }

    // Auto-generate referral code if missing
    if (!user.referralCode) {
      user.referralCode = await getUniqueReferralCode(user.firstName || user.email);
      await user.save();
    }

    // Auto-backfill playerId for existing users
    if (!user.playerId) {
      user.playerId = generatePlayerId();
      await user.save();
    }

    return res.json({
      success: true,
      user: {
        id: user._id,
        playerId: user.playerId,
        email: user.email,
        role: user.role || 'user',
        firstName: user.firstName || '',
        avatarUrl: user.avatarUrl || '',
        balanceNaira: user.balanceNaira,
        totalRides: user.totalRides,
        subscriptionTier: user.subscriptionTier,
        subscriptionExpiresAt: user.subscriptionExpiresAt,
        dailyRidesToday: user.dailyRidesToday,
        referralCode: user.referralCode,
        referralsCount: user.referralsCount || 0,
        referralEarnings: user.referralEarnings || 0,
        currentRabbit: user.currentRabbitId,
        currentBike: user.currentBikeId,
        ownedRabbits: user.ownedRabbits,
        ownedBikes: user.ownedBikes
      }
    });
  } catch (err) {
    console.error('getMe error:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching user profile.' });
  }
};

exports.clerkSync = async (req, res) => {
  try {
    const { clerkId, email, firstName, avatarUrl, guestBalance, referralCode } = req.body;
    if (!clerkId || !email) {
      return res.status(400).json({ success: false, message: 'clerkId and email are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    let user = await User.findOne({
      $or: [{ clerkId }, { email: cleanEmail }]
    });

    const defaultRabbit = await Rabbit.findOne({ priceNaira: 0 });
    const defaultBike = await Bicycle.findOne({ priceNaira: 0 });
    const guestBonus = Math.max(0, Number(guestBalance) || 0);

    if (!user) {
      // Brand-new Clerk user: award ₦50 welcome bonus + any guest coins earned before sign-up
      const userReferralCode = await getUniqueReferralCode(firstName || cleanEmail);
      const playerId = generatePlayerId();
      const startingBal = 50 + guestBonus; // guest bonus ONLY for new accounts

      user = new User({
        playerId,
        clerkId,
        email: cleanEmail,
        firstName: firstName || '',
        avatarUrl: avatarUrl || '',
        balanceNaira: startingBal,
        totalRides: 0,
        currentRabbitId: defaultRabbit ? defaultRabbit._id : null,
        currentBikeId: defaultBike ? defaultBike._id : null,
        ownedRabbits: defaultRabbit ? [defaultRabbit._id] : [],
        ownedBikes: defaultBike ? [defaultBike._id] : [],
        subscriptionTier: 'free',
        referralCode: userReferralCode,
        referralsCount: 0,
        referralEarnings: 0,
        role: resolveUserRole(cleanEmail, 'user')
      });

      // Check referral bonus for new Clerk signup
      if (referralCode) {
        const refResult = await processReferralReward(user._id, cleanEmail, referralCode);
        if (refResult.referrerId) {
          user.referredBy = refResult.referrerId;
          user.balanceNaira += refResult.refereeBonus; // +₦50 referee welcome perk
        }
      }

      await user.save();
      console.log(`[ClerkSync] New user: ${cleanEmail}, role: ${user.role}, starting balance: ₦${user.balanceNaira}`);
    } else {
      // Returning user — NEVER modify balance from guestBonus (prevents balance inheritance)
      user.clerkId = clerkId;
      if (firstName && !user.firstName) user.firstName = firstName;
      if (avatarUrl) user.avatarUrl = avatarUrl; // always refresh avatar
      // Auto-elevate admin role if matching ADMIN_EMAILS
      const calculatedRole = resolveUserRole(cleanEmail, user.role);
      if (calculatedRole !== user.role) {
        user.role = calculatedRole;
      }
      // guestBonus is intentionally ignored for returning users
      if (!user.referralCode) {
        user.referralCode = await getUniqueReferralCode(user.firstName || user.email);
      }
      if (!user.playerId) {
        user.playerId = generatePlayerId();
      }
      if (!user.currentRabbitId && defaultRabbit) user.currentRabbitId = defaultRabbit._id;
      if (!user.currentBikeId && defaultBike) user.currentBikeId = defaultBike._id;
      user.lastSeenAt = new Date();
      await user.save();
      console.log(`[ClerkSync] Returning user: ${cleanEmail}, role: ${user.role}, balance: ₦${user.balanceNaira}`);
    }

    const populatedUser = await User.findById(user._id)
      .populate('currentRabbitId')
      .populate('currentBikeId')
      .populate('ownedRabbits')
      .populate('ownedBikes');

    const token = generateToken(user);

    return res.json({
      success: true,
      message: 'User synced with Clerk successfully',
      token,
      user: {
        id: populatedUser._id,
        playerId: populatedUser.playerId,
        email: populatedUser.email,
        role: populatedUser.role || 'user',
        firstName: populatedUser.firstName,
        avatarUrl: populatedUser.avatarUrl,
        balanceNaira: populatedUser.balanceNaira,
        totalRides: populatedUser.totalRides,
        subscriptionTier: populatedUser.subscriptionTier,
        subscriptionExpiresAt: populatedUser.subscriptionExpiresAt,
        dailyRidesToday: populatedUser.dailyRidesToday,
        referralCode: populatedUser.referralCode,
        referralsCount: populatedUser.referralsCount || 0,
        referralEarnings: populatedUser.referralEarnings || 0,
        currentRabbit: populatedUser.currentRabbitId,
        currentBike: populatedUser.currentBikeId,
        ownedRabbits: populatedUser.ownedRabbits,
        ownedBikes: populatedUser.ownedBikes
      }
    });
  } catch (err) {
    console.error('clerkSync error:', err);
    return res.status(500).json({ success: false, message: 'Server error syncing Clerk user.' });
  }
};

exports.customizeReferralCode = async (req, res) => {
  try {
    const { customCode } = req.body;
    if (!customCode) {
      return res.status(400).json({ success: false, message: 'Custom code is required.' });
    }

    const cleanCode = String(customCode).trim().toUpperCase();
    const regex = /^[A-Z0-9-]{3,15}$/;
    if (!regex.test(cleanCode)) {
      return res.status(400).json({
        success: false,
        message: 'Code must be 3-15 characters long and contain only letters, numbers, or hyphens.'
      });
    }

    // Check if code taken by another user
    const existing = await User.findOne({ referralCode: cleanCode });
    const currentUserId = req.user?._id ? req.user._id.toString() : '';
    if (existing && existing._id && existing._id.toString() !== currentUserId) {
      return res.status(409).json({ success: false, message: 'This referral code is already taken. Try another!' });
    }

    if (!currentUserId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      currentUserId,
      { $set: { referralCode: cleanCode } },
      { new: true }
    );
    if (!updatedUser) return res.status(404).json({ success: false, message: 'User not found.' });

    // Also update in-memory session
    if (req.user) req.user.referralCode = cleanCode;

    return res.json({
      success: true,
      message: 'Referral code customized successfully!',
      referralCode: cleanCode,
      user: {
        id: updatedUser._id,
        email: updatedUser.email,
        referralCode: cleanCode
      }
    });
  } catch (err) {
    console.error('customizeReferralCode error:', err.stack || err);
    return res.status(500).json({ success: false, message: err.message || 'Server error customizing referral code.' });
  }
};

exports.getReferralStats = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const referrals = await User.find({ referredBy: req.user._id })
      .select('email firstName createdAt');

    return res.json({
      success: true,
      referralCode: user.referralCode,
      referralsCount: user.referralsCount || referrals.length,
      referralEarnings: user.referralEarnings || (referrals.length * 100),
      referrals
    });
  } catch (err) {
    console.error('getReferralStats error:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching referrals.' });
  }
};
