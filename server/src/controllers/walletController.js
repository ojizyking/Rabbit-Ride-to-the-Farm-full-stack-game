const crypto = require('crypto');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Subscription = require('../models/Subscription');
const Withdrawal = require('../models/Withdrawal');
const { initializeTransaction, verifyTransaction, initiateTransfer, getBanks, resolveAccountNumber } = require('../config/squad');

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

    const squadData = await initializeTransaction({
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
      squadRef: squadData.reference,
      paystackRef: squadData.reference,
      status: 'pending',
      expiresAt
    });

    return res.json({
      success: true,
      tier: tierName,
      amount,
      authorization_url: squadData.authorization_url,
      checkout_url: squadData.checkout_url,
      reference: squadData.reference
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
      let sub = await Subscription.findOne({ $or: [{ squadRef: reference }, { paystackRef: reference }] });
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
          squadRef: reference, paystackRef: reference,
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

    // $atomic withdraw — deduct only if balance is sufficient (race-condition safe)
    const withdrawnUser = await User.findOneAndUpdate(
      { _id: req.user._id, balanceNaira: { $gte: withdrawAmount } },
      { $inc: { balanceNaira: -withdrawAmount } },
      { new: true }
    );
    if (!withdrawnUser) {
      const current = await User.findById(req.user._id);
      return res.status(400).json({
        success: false,
        message: `Insufficient balance! You requested ₦${withdrawAmount.toLocaleString()}, but have ₦${(current?.balanceNaira || 0).toLocaleString()}.`
      });
    }
    const user = withdrawnUser;

    // Call Squad Transfer
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
      squadRef: transferResult.reference,
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
      message: `Withdrawal of ₦${withdrawAmount.toLocaleString()} initiated successfully via Squad by GTCO!`,
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

/**
 * Squad Cryptographic Webhook Handler
 */
exports.handleWebhook = async (req, res) => {
  try {
    const SQUAD_SECRET = process.env.SQUAD_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY || 'sandbox_sk_demo_key';
    const signature =
      req.headers['x-squad-encrypted-body'] ||
      req.headers['x-squad-signature'] ||
      req.headers['x-paystack-signature'];

    // Verify HMAC SHA512 signature in production if secret is not demo
    if (SQUAD_SECRET && !SQUAD_SECRET.includes('demo') && signature) {
      const hash = crypto.createHmac('sha512', SQUAD_SECRET)
        .update(JSON.stringify(req.body))
        .digest('hex');
      if (hash.toLowerCase() !== signature.toLowerCase()) {
        console.warn('Squad webhook signature mismatch!');
        return res.status(400).send('Invalid signature');
      }
    }

    const payload = req.body || {};
    console.log('[Squad Webhook] Event received:', payload.Event || payload.event || payload);

    const eventType = (payload.Event || payload.event || '').toLowerCase();
    const data = payload.Body || payload.data || payload;
    const metadata = data.metadata || data.meta || {};
    const reference = payload.TransactionRef || data.transaction_ref || data.reference;
    const amountInKobo = data.amount || data.transaction_amount || 0;
    const amountNaira = (amountInKobo > 1000 && amountInKobo % 100 === 0) ? amountInKobo / 100 : amountInKobo;

    if (eventType === 'charge_successful' || eventType === 'charge.success' || data.transaction_status === 'Success') {
      // Prevent duplicate processing
      if (reference) {
        const existing = await Transaction.findOne({ reference });
        if (existing) {
          return res.status(200).send('Already processed');
        }
      }

      if (metadata.userId) {
        const user = await User.findById(metadata.userId);
        if (user) {
          if (metadata.purpose === 'wallet_deposit') {
            await User.findByIdAndUpdate(user._id, { $inc: { balanceNaira: amountNaira } });
            await Transaction.create({
              userId: user._id,
              type: 'deposit',
              amount: amountNaira,
              reference,
              description: `Webhook: Direct Wallet Top-Up of ₦${amountNaira.toLocaleString()}`,
              status: 'completed'
            });
          } else if (metadata.purpose === 'Rabbit Ride Subscription' || metadata.tierName) {
            user.subscriptionTier = metadata.tierName || 'basic';
            const expires = new Date();
            expires.setDate(expires.getDate() + 30);
            user.subscriptionExpiresAt = expires;
            await user.save();
            await Transaction.create({
              userId: user._id,
              type: 'subscription',
              amount: -amountNaira,
              reference,
              description: `Webhook: Upgraded to ${user.subscriptionTier.toUpperCase()} Pack (30 Days)`,
              status: 'completed'
            });
          }
        }
      }
    } else if (eventType === 'transfer_successful' || eventType === 'transfer.success') {
      const transferRef = reference || data.transfer_code;
      if (transferRef) {
        await Withdrawal.findOneAndUpdate(
          { $or: [{ transferCode: transferRef }, { squadRef: transferRef }, { paystackRef: transferRef }] },
          { status: 'paid' }
        );
      }
    } else if (eventType === 'transfer_failed' || eventType === 'transfer.failed') {
      const transferRef = reference || data.transfer_code;
      if (transferRef) {
        const wth = await Withdrawal.findOne({
          $or: [{ transferCode: transferRef }, { squadRef: transferRef }, { paystackRef: transferRef }]
        });
        if (wth && wth.status !== 'failed') {
          wth.status = 'failed';
          await wth.save();
          // Refund user balance
          await User.findByIdAndUpdate(wth.userId, { $inc: { balanceNaira: wth.amount } });
        }
      }
    }

    return res.status(200).send('Webhook processed');
  } catch (err) {
    console.error('Squad webhook error:', err);
    return res.status(500).send('Internal server error');
  }
};

