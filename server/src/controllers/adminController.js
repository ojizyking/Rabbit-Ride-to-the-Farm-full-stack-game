const User = require('../models/User');
const Ride = require('../models/Ride');
const Transaction = require('../models/Transaction');
const Withdrawal = require('../models/Withdrawal');
const Subscription = require('../models/Subscription');
const SystemConfig = require('../models/SystemConfig');
const telemetry = require('../services/telemetry');
const { initiateTransfer } = require('../config/paystack');

/**
 * High-level overview statistics for Mission Control
 */
exports.getOverview = async (req, res) => {
  try {
    const online = telemetry.getOnlineStats();

    // User counts
    const allUsers = await User.find();
    const totalUsers = allUsers.length;

    // Financial totals
    const allTransactions = await Transaction.find({ status: 'completed' });
    let totalDepositsNaira = 0;
    let totalSubscriptionsNaira = 0;
    let totalCoinPurchasesNaira = 0;
    let totalReferralPaidNaira = 0;

    for (const tx of allTransactions) {
      if (tx.type === 'deposit') totalDepositsNaira += Math.abs(tx.amount);
      else if (tx.type === 'subscription') totalSubscriptionsNaira += Math.abs(tx.amount);
      else if (tx.type === 'coin_purchase') totalCoinPurchasesNaira += Math.abs(tx.amount);
      else if (tx.type === 'referral') totalReferralPaidNaira += Math.abs(tx.amount);
    }

    const totalRevenueNaira = totalDepositsNaira + totalSubscriptionsNaira + totalCoinPurchasesNaira;

    // Withdrawals metrics
    const allWithdrawals = await Withdrawal.find();
    let pendingWithdrawalsCount = 0;
    let pendingWithdrawalsSum = 0;
    let totalWithdrawalsPaid = 0;

    for (const w of allWithdrawals) {
      if (w.status === 'pending') {
        pendingWithdrawalsCount++;
        pendingWithdrawalsSum += w.amount;
      } else if (w.status === 'paid') {
        totalWithdrawalsPaid += w.amount;
      }
    }

    // Rides stats
    let totalRidesCount = 0;
    for (const u of allUsers) {
      totalRidesCount += (u.totalRides || 0);
    }

    return res.json({
      success: true,
      stats: {
        onlineUsers: online.totalOnline,
        ridersInGame: online.inGameCount,
        authenticatedOnline: online.authenticatedCount,
        guestOnline: online.guestCount,
        hitsToday: telemetry.hitsToday,
        totalHits: telemetry.totalHits,
        requestsPerMin: Math.round((telemetry.hitsToday / Math.max(1, (Date.now() - telemetry.startTime) / 60000)) * 10) / 10,
        totalUsers,
        totalRidesCount,
        totalRevenueNaira,
        totalDepositsNaira,
        totalSubscriptionsNaira,
        totalReferralPaidNaira,
        totalWithdrawalsPaid,
        pendingWithdrawalsCount,
        pendingWithdrawalsSum
      }
    });
  } catch (err) {
    console.error('getOverview error:', err);
    return res.status(500).json({ success: false, message: 'Server error loading admin overview.' });
  }
};

/**
 * Real-time traffic, latency, and online presence telemetry
 */
exports.getLiveTelemetry = async (req, res) => {
  try {
    const data = telemetry.getLiveTelemetry();
    return res.json({ success: true, telemetry: data });
  } catch (err) {
    console.error('getLiveTelemetry error:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching live telemetry.' });
  }
};

/**
 * Searchable, paginated user list
 */
exports.getUsers = async (req, res) => {
  try {
    const { search = '', role = '', tier = '', page = 1, limit = 20 } = req.query;
    let users = await User.find();

    // In-memory or Mongoose filter
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      users = users.filter(u =>
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.firstName && u.firstName.toLowerCase().includes(q)) ||
        (u.referralCode && u.referralCode.toLowerCase().includes(q))
      );
    }

    if (role) {
      users = users.filter(u => u.role === role);
    }

    if (tier) {
      users = users.filter(u => u.subscriptionTier === tier);
    }

    const total = users.length;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const startIndex = (pageNum - 1) * limitNum;
    const paginated = users.slice(startIndex, startIndex + limitNum);

    return res.json({
      success: true,
      users: paginated,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (err) {
    console.error('getUsers error:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching users.' });
  }
};

/**
 * Detailed user profile lookup
 */
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('currentRabbitId')
      .populate('currentBikeId');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const transactions = await Transaction.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(20);

    const withdrawals = await Withdrawal.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(10);

    const rides = await Ride.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(10);

    return res.json({
      success: true,
      user,
      transactions,
      withdrawals,
      rides
    });
  } catch (err) {
    console.error('getUserById error:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching user details.' });
  }
};

/**
 * Modify user account (balance adjustment, role, tier, ban)
 */
exports.updateUser = async (req, res) => {
  try {
    const { balanceAdjustment, reason, subscriptionTier, role, isBanned, referralCode } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Balance adjustment
    if (balanceAdjustment !== undefined && Number(balanceAdjustment) !== 0) {
      const adjustment = Number(balanceAdjustment);
      user.balanceNaira = Math.max(0, Math.round((user.balanceNaira + adjustment) * 100) / 100);

      await Transaction.create({
        userId: user._id,
        type: adjustment > 0 ? 'deposit' : 'shop',
        amount: adjustment,
        description: `Admin Adjustment: ${reason || (adjustment > 0 ? 'Admin Credit' : 'Admin Debit')}`,
        status: 'completed'
      });
    }

    if (subscriptionTier) {
      user.subscriptionTier = subscriptionTier;
      if (subscriptionTier !== 'free') {
        const exp = new Date();
        exp.setDate(exp.getDate() + 30);
        user.subscriptionExpiresAt = exp;
      }
    }

    if (role) {
      user.role = role;
    }

    if (isBanned !== undefined) {
      user.isBanned = Boolean(isBanned);
    }

    if (referralCode && referralCode.trim()) {
      user.referralCode = referralCode.trim().toUpperCase();
    }

    await user.save();

    return res.json({
      success: true,
      message: 'User updated successfully.',
      user
    });
  } catch (err) {
    console.error('updateUser error:', err);
    return res.status(500).json({ success: false, message: 'Server error updating user.' });
  }
};

/**
 * Withdrawals list for queue management
 */
exports.getWithdrawals = async (req, res) => {
  try {
    const { status = '' } = req.query;
    let withdrawals = await Withdrawal.find().sort({ createdAt: -1 });

    if (status) {
      withdrawals = withdrawals.filter(w => w.status === status);
    }

    // Attach user emails
    const allUsers = await User.find();
    const userMap = new Map(allUsers.map(u => [u._id.toString(), u]));

    const populated = withdrawals.map(w => {
      const u = userMap.get(w.userId?.toString());
      const wObj = w.toObject ? w.toObject() : { ...w };
      return {
        ...wObj,
        userEmail: u ? u.email : 'Unknown Rider',
        userBalance: u ? u.balanceNaira : 0
      };
    });

    return res.json({ success: true, withdrawals: populated });
  } catch (err) {
    console.error('admin getWithdrawals error:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching withdrawals queue.' });
  }
};

/**
 * Approve pending withdrawal (automated via Paystack Transfer or marked manual paid)
 */
exports.approveWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;
    const { method = 'paystack', note = '' } = req.body;

    const withdrawal = await Withdrawal.findById(id);
    if (!withdrawal) {
      return res.status(404).json({ success: false, message: 'Withdrawal not found.' });
    }

    if (withdrawal.status === 'paid') {
      return res.status(400).json({ success: false, message: 'Withdrawal has already been paid.' });
    }

    if (method === 'paystack') {
      // Initiate Paystack Transfer
      const transferRes = await initiateTransfer({
        amount: withdrawal.amount,
        accountNumber: withdrawal.accountNumber,
        bankCode: withdrawal.bankCode,
        reason: `Approved Rabbit Ride withdrawal: ${note || id}`
      });

      withdrawal.status = 'paid';
      withdrawal.transferCode = transferRes.transferCode || 'TRF_APPROVED';
      withdrawal.paystackRef = transferRes.reference || `REF_${Date.now()}`;
      await withdrawal.save();
    } else {
      // Manual payout confirmation
      withdrawal.status = 'paid';
      withdrawal.transferCode = `MANUAL_PAYOUT_${Date.now()}`;
      await withdrawal.save();
    }

    // Update transaction status
    await Transaction.findOneAndUpdate(
      { reference: withdrawal.paystackRef },
      { status: 'completed' }
    );

    return res.json({
      success: true,
      message: `Withdrawal of ₦${withdrawal.amount.toLocaleString()} marked as PAID (${method.toUpperCase()}).`,
      withdrawal
    });
  } catch (err) {
    console.error('approveWithdrawal error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error approving withdrawal.' });
  }
};

/**
 * Reject pending withdrawal and refund user balance
 */
exports.rejectWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = 'Rejected by Administrator' } = req.body;

    const withdrawal = await Withdrawal.findById(id);
    if (!withdrawal) {
      return res.status(404).json({ success: false, message: 'Withdrawal not found.' });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Cannot reject withdrawal with status: ${withdrawal.status}` });
    }

    withdrawal.status = 'failed';
    await withdrawal.save();

    // Refund user balance
    const user = await User.findById(withdrawal.userId);
    if (user) {
      user.balanceNaira = Math.round((user.balanceNaira + withdrawal.amount) * 100) / 100;
      await user.save();

      await Transaction.create({
        userId: user._id,
        type: 'deposit',
        amount: withdrawal.amount,
        description: `Refund: Withdrawal rejected (${reason})`,
        status: 'completed'
      });
    }

    return res.json({
      success: true,
      message: `Withdrawal rejected. ₦${withdrawal.amount.toLocaleString()} refunded to user.`,
      withdrawal
    });
  } catch (err) {
    console.error('rejectWithdrawal error:', err);
    return res.status(500).json({ success: false, message: 'Server error rejecting withdrawal.' });
  }
};

/**
 * Platform transactions ledger
 */
exports.getTransactions = async (req, res) => {
  try {
    const { type = '', limit = 50, page = 1 } = req.query;
    let list = await Transaction.find().sort({ createdAt: -1 });

    if (type) {
      list = list.filter(t => t.type === type);
    }

    const allUsers = await User.find();
    const userMap = new Map(allUsers.map(u => [u._id.toString(), u.email]));

    const total = list.length;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const startIndex = (pageNum - 1) * limitNum;
    const paginated = list.slice(startIndex, startIndex + limitNum).map(t => {
      const tObj = t.toObject ? t.toObject() : { ...t };
      return {
        ...tObj,
        userEmail: userMap.get(t.userId?.toString()) || 'Unknown Rider'
      };
    });

    return res.json({
      success: true,
      transactions: paginated,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (err) {
    console.error('admin getTransactions error:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching transaction ledger.' });
  }
};

/**
 * Gameplay statistics and powerups
 */
exports.getGameStats = async (req, res) => {
  try {
    const rides = await Ride.find().sort({ distanceTraveled: -1 });
    let totalCarrots = 0;
    let totalDistance = 0;
    let totalBalloons = 0;
    let totalClovers = 0;
    let totalBarns = 0;

    for (const r of rides) {
      totalCarrots += (r.carrotsCollected || 0);
      totalDistance += (r.distanceTraveled || 0);
    }

    const topRides = rides.slice(0, 10);

    return res.json({
      success: true,
      stats: {
        totalRides: rides.length,
        totalCarrots,
        totalDistanceMeters: Math.round(totalDistance),
        avgDistanceMeters: rides.length > 0 ? Math.round(totalDistance / rides.length) : 0,
        topRides
      }
    });
  } catch (err) {
    console.error('getGameStats error:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching game stats.' });
  }
};

/**
 * Referral program analytics & top referrers
 */
exports.getReferrals = async (req, res) => {
  try {
    const users = await User.find();
    let totalReferralsCount = 0;
    let totalCommissionPaid = 0;

    const referrers = [];
    for (const u of users) {
      if ((u.referralsCount || 0) > 0) {
        totalReferralsCount += u.referralsCount;
        totalCommissionPaid += (u.referralEarnings || 0);
        referrers.push({
          userId: u._id,
          email: u.email,
          referralCode: u.referralCode || 'N/A',
          referralsCount: u.referralsCount,
          referralEarnings: u.referralEarnings || 0
        });
      }
    }

    referrers.sort((a, b) => b.referralsCount - a.referralsCount);

    return res.json({
      success: true,
      totalReferralsCount,
      totalCommissionPaid,
      topReferrers: referrers.slice(0, 15)
    });
  } catch (err) {
    console.error('getReferrals error:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching referral stats.' });
  }
};

/**
 * Dynamic system configuration
 */
exports.getSystemConfig = async (req, res) => {
  try {
    const configs = await SystemConfig.find();
    const configMap = {};
    for (const c of configs) {
      configMap[c.key] = c.value;
    }

    // Default fallbacks
    const defaults = {
      referralRewardNaira: 100,
      coinConversionRate: 0.05, // 1000 coins = ₦50
      freeDailyRides: 3,
      minWithdrawalNaira: 1000,
      maintenanceMode: false
    };

    return res.json({
      success: true,
      config: { ...defaults, ...configMap }
    });
  } catch (err) {
    console.error('getSystemConfig error:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching system config.' });
  }
};

/**
 * Update dynamic system configuration
 */
exports.updateSystemConfig = async (req, res) => {
  try {
    const { key, value, description } = req.body;
    if (!key) {
      return res.status(400).json({ success: false, message: 'Configuration key required.' });
    }

    const adminEmail = req.user?.email || (req.auth?.email) || 'admin';
    let cfg = await SystemConfig.findOne({ key });
    if (cfg) {
      cfg.value = value;
      if (description !== undefined) {
        cfg.description = description;
      }
      cfg.updatedBy = adminEmail;
      cfg.updatedAt = new Date();
      await cfg.save();
    } else {
      cfg = await SystemConfig.create({
        key,
        value,
        description: description || '',
        updatedBy: adminEmail,
        updatedAt: new Date()
      });
    }

    return res.json({
      success: true,
      message: `Configuration ${key} updated successfully.`,
      config: cfg
    });
  } catch (err) {
    console.error('updateSystemConfig error:', err.stack || err);
    return res.status(500).json({
      success: false,
      message: `Failed to update config: ${err.message || 'Server error'}`
    });
  }
};
