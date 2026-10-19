const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Subscription = require('../models/Subscription');
const Withdrawal = require('../models/Withdrawal');
const { initializeTransaction, verifyTransaction, initiateTransfer } = require('../config/paystack');

const TIER_AMOUNTS = {
  1000: 'basic',
  2000: 'growth',
  5000: 'pro',
  10000: 'elite',
  basic: 1000,
  growth: 2000,
  pro: 5000,
  elite: 10000
};

exports.getBalance = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    return res.json({
      success: true,
      balanceNaira: user.balanceNaira,
      subscriptionTier: user.subscriptionTier,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
      totalRides: user.totalRides
    });
  } catch (err) {
    console.error('getBalance error:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching balance.' });
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    return res.json({ success: true, transactions });
  } catch (err) {
    console.error('getTransactions error:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching transactions.' });
  }
};

exports.subscribe = async (req, res) => {
  try {
    const { tier } = req.body;
    let tierName = 'basic';
    let amount = 1000;

    if (tier === 1000 || tier === '1000' || tier === 'basic') {
      tierName = 'basic';
      amount = 1000;
    } else if (tier === 2000 || tier === '2000' || tier === 'growth') {
      tierName = 'growth';
      amount = 2000;
    } else if (tier === 5000 || tier === '5000' || tier === 'pro') {
      tierName = 'pro';
      amount = 5000;
    } else if (tier === 10000 || tier === '10000' || tier === 'elite') {
      tierName = 'elite';
      amount = 10000;
    } else {
      return res.status(400).json({ success: false, message: 'Invalid subscription tier. Choose 1000, 2000, 5000, or 10000.' });
    }

    const paystackData = await initializeTransaction({
      email: req.user.email,
      amount,
      metadata: {
        userId: req.user._id.toString(),
        tierName,
        purpose: 'Rabbit Ride Subscription'
      },
      callback_url: `${req.headers.origin || 'http://localhost:5173'}/wallet`
    });

    // Save pending subscription
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30-day subscription

    await Subscription.create({
      userId: req.user._id,
      tier: tierName,
      amount,
      paystackRef: paystackData.reference,
      status: 'pending',
      expiresAt
    });

    return res.json({
      success: true,
      tier: tierName,
      amount,
      authorization_url: paystackData.authorization_url,
      reference: paystackData.reference
    });
  } catch (err) {
    console.error('subscribe error:', err);
    return res.status(500).json({ success: false, message: 'Server error initializing subscription.' });
  }
};

exports.verifySubscription = async (req, res) => {
  try {
    const { reference } = req.body;
    if (!reference) {
      return res.status(400).json({ success: false, message: 'Transaction reference is required.' });
    }

    const verification = await verifyTransaction(reference);

    if (verification.status === 'success') {
      // Find subscription record or create
      let sub = await Subscription.findOne({ paystackRef: reference });
      let tierName = sub ? sub.tier : 'basic';
      let amount = sub ? sub.amount : 1000;

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      if (sub) {
        sub.status = 'active';
        sub.expiresAt = expiresAt;
        await sub.save();
      } else {
        sub = await Subscription.create({
          userId: req.user._id,
          tier: tierName,
          amount,
          paystackRef: reference,
          status: 'active',
          expiresAt
        });
      }

      // Update user subscription
      const user = await User.findById(req.user._id);
      user.subscriptionTier = tierName;
      user.subscriptionExpiresAt = expiresAt;
      await user.save();

      // Record transaction
      await Transaction.create({
        userId: user._id,
        type: 'subscription',
        amount: -amount,
        reference,
        description: `Upgraded to ${tierName.toUpperCase()} Pack (30 Days)`,
        status: 'completed'
      });

      return res.json({
        success: true,
        message: `Subscription activated! Welcome to ${tierName.toUpperCase()} Tier!`,
        subscriptionTier: user.subscriptionTier,
        subscriptionExpiresAt: user.subscriptionExpiresAt
      });
    }

    return res.status(400).json({ success: false, message: 'Payment verification failed.' });
  } catch (err) {
    console.error('verifySubscription error:', err);
    return res.status(500).json({ success: false, message: 'Server error verifying payment.' });
  }
};

exports.withdraw = async (req, res) => {
  try {
    const { amount, accountNumber, bankCode, bankName = 'Commercial Bank' } = req.body;
    const withdrawAmount = Number(amount);

    if (!withdrawAmount || withdrawAmount < 1000) {
      return res.status(400).json({
        success: false,
        message: 'Minimum withdrawal amount is ₦1,000.'
      });
    }

    if (!accountNumber || accountNumber.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'A valid 10-digit NUBAN account number is required.'
      });
    }

    if (!bankCode) {
      return res.status(400).json({
        success: false,
        message: 'Please select your destination bank.'
      });
    }

    const user = await User.findById(req.user._id);
    if (user.balanceNaira < withdrawAmount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance! You requested ₦${withdrawAmount.toLocaleString()}, but have ₦${user.balanceNaira.toLocaleString()}.`
      });
    }

    // Deduct user balance immediately
    user.balanceNaira = Math.round((user.balanceNaira - withdrawAmount) * 100) / 100;
    await user.save();

    // Call Paystack Transfer
    const transferResult = await initiateTransfer({
      amount: withdrawAmount,
      accountNumber,
      bankCode,
      reason: `Rabbit Ride cashout for ${user.email}`
    });

    const withdrawal = await Withdrawal.create({
      userId: user._id,
      amount: withdrawAmount,
      accountNumber,
      bankCode,
      bankName,
      status: transferResult.status === 'paid' ? 'paid' : 'pending',
      paystackRef: transferResult.reference,
      transferCode: transferResult.transferCode
    });

    await Transaction.create({
      userId: user._id,
      type: 'withdrawal',
      amount: -withdrawAmount,
      reference: transferResult.reference,
      description: `Withdrawal to ${bankName} (${accountNumber.slice(0, 3)}****${accountNumber.slice(-3)})`,
      status: transferResult.status === 'paid' ? 'completed' : 'pending'
    });

    return res.json({
      success: true,
      message: `Withdrawal of ₦${withdrawAmount.toLocaleString()} initiated successfully via Paystack!`,
      withdrawal,
      newBalance: user.balanceNaira
    });
  } catch (err) {
    console.error('withdraw error:', err);
    return res.status(500).json({ success: false, message: 'Server error processing withdrawal.' });
  }
};

exports.getWithdrawals = async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find().sort({ createdAt: -1 }).limit(100);
    return res.json({ success: true, withdrawals });
  } catch (err) {
    console.error('getWithdrawals error:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching withdrawals.' });
  }
};
