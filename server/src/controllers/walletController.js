const crypto = require('crypto');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Subscription = require('../models/Subscription');
const Withdrawal = require('../models/Withdrawal');
const { initializeTransaction, verifyTransaction, initiateTransfer, getBanks, resolveAccountNumber } = require('../config/paystack');

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

/**
 * Fetch Nigerian banks list
 */
exports.getBankList = async (req, res) => {
  try {
    const banks = await getBanks();
    return res.json({ success: true, banks });
  } catch (err) {
    console.error('getBankList error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch bank list.' });
  }
};

/**
 * Verify destination account number
 */
exports.verifyAccountName = async (req, res) => {
  try {
    const { accountNumber, bankCode } = req.body;
    if (!accountNumber || accountNumber.length !== 10) {
      return res.status(400).json({ success: false, message: 'Valid 10-digit account number required.' });
    }
    if (!bankCode) {
      return res.status(400).json({ success: false, message: 'Please select a bank.' });
    }

    const data = await resolveAccountNumber({ accountNumber, bankCode });
    return res.json({
      success: true,
      accountName: data.accountName,
      accountNumber: data.accountNumber
    });
  } catch (err) {
    console.error('verifyAccountName error:', err);
    return res.status(400).json({ success: false, message: err.message || 'Could not verify account name.' });
  }
};

/**
 * Initialize direct wallet top-up deposit
 */
exports.deposit = async (req, res) => {
  try {
    const { amount } = req.body;
    const depositAmount = Number(amount);

    if (!depositAmount || depositAmount < 200) {
      return res.status(400).json({ success: false, message: 'Minimum deposit amount is ₦200.' });
    }

    const paystackData = await initializeTransaction({
      email: req.user.email,
      amount: depositAmount,
      metadata: {
        userId: req.user._id.toString(),
        purpose: 'wallet_deposit',
        depositAmount
      },
      callback_url: `${req.headers.origin || 'http://localhost:5173'}/wallet?status=deposit_success`
    });

    return res.json({
      success: true,
      amount: depositAmount,
      authorization_url: paystackData.authorization_url,
      reference: paystackData.reference
    });
  } catch (err) {
    console.error('deposit error:', err);
    return res.status(500).json({ success: false, message: 'Failed to initialize deposit.' });
  }
};

/**
 * Verify direct wallet top-up deposit
 */
exports.verifyDeposit = async (req, res) => {
  try {
    const { reference } = req.body;
    if (!reference) {
      return res.status(400).json({ success: false, message: 'Transaction reference is required.' });
    }

    // Check if already credited
    const existingTx = await Transaction.findOne({ reference });
    if (existingTx) {
      const user = await User.findById(req.user._id);
      return res.json({
        success: true,
        message: 'Deposit already processed and credited!',
        newBalance: user.balanceNaira
      });
    }

    const data = await verifyTransaction(reference);
    if (data.status === 'success') {
      const depositAmount = data.amount / 100;
      const user = await User.findById(req.user._id);

      user.balanceNaira = Math.round((user.balanceNaira + depositAmount) * 100) / 100;
      await user.save();

      await Transaction.create({
        userId: user._id,
        type: 'deposit',
        amount: depositAmount,
        reference,
        description: `Direct Wallet Top-Up of ₦${depositAmount.toLocaleString()}`,
        status: 'completed'
      });

      return res.json({
        success: true,
        message: `₦${depositAmount.toLocaleString()} added to your wallet successfully!`,
        newBalance: user.balanceNaira
      });
    }

    return res.status(400).json({ success: false, message: 'Payment verification failed.' });
  } catch (err) {
    console.error('verifyDeposit error:', err);
    return res.status(500).json({ success: false, message: 'Error verifying deposit.' });
  }
};

/**
 * Buy Coin Bundle with direct Paystack or wallet balance
 */
exports.buyCoins = async (req, res) => {
  try {
    const { bundleId, paymentMethod = 'paystack' } = req.body;
    const BUNDLES = {
      bundle_4k: { coins: 4000, priceNaira: 200, name: 'Small Carrot Bag' },
      bundle_12k: { coins: 12000, priceNaira: 500, name: 'Medium Farm Crate' },
      bundle_26k: { coins: 26000, priceNaira: 1000, name: 'Large Harvest Sack' },
      bundle_60k: { coins: 60000, priceNaira: 2000, name: 'Golden Farm Vault' }
    };

    const bundle = BUNDLES[bundleId];
    if (!bundle) {
      return res.status(400).json({ success: false, message: 'Invalid coin bundle selected.' });
    }

    const user = await User.findById(req.user._id);

    // If paying from wallet balance
    if (paymentMethod === 'balance') {
      if (user.balanceNaira < bundle.priceNaira) {
        return res.status(400).json({
          success: false,
          message: `Insufficient balance! You need ₦${bundle.priceNaira}, but have ₦${user.balanceNaira}.`
        });
      }

      user.balanceNaira = Math.round((user.balanceNaira - bundle.priceNaira) * 100) / 100;
      await user.save();

      await Transaction.create({
        userId: user._id,
        type: 'coin_purchase',
        amount: -bundle.priceNaira,
        description: `Purchased ${bundle.name} (+${bundle.coins.toLocaleString()} Coins)`,
        status: 'completed'
      });

      return res.json({
        success: true,
        message: `Successfully purchased ${bundle.name}! +${bundle.coins.toLocaleString()} Coins added.`,
        coinsAwarded: bundle.coins,
        newBalance: user.balanceNaira
      });
    }

    // Otherwise initialize Paystack payment
    const paystackData = await initializeTransaction({
      email: user.email,
      amount: bundle.priceNaira,
      metadata: {
        userId: user._id.toString(),
        bundleId,
        coins: bundle.coins,
        purpose: 'coin_purchase'
      },
      callback_url: `${req.headers.origin || 'http://localhost:5173'}/wallet?status=coins_success`
    });

    return res.json({
      success: true,
      bundle,
      authorization_url: paystackData.authorization_url,
      reference: paystackData.reference
    });
  } catch (err) {
    console.error('buyCoins error:', err);
    return res.status(500).json({ success: false, message: 'Error initiating coin purchase.' });
  }
};

/**
 * Paystack Cryptographic Webhook Handler
 */
exports.handleWebhook = async (req, res) => {
  try {
    const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || 'sk_test_demo_key';
    const signature = req.headers['x-paystack-signature'];

    // Verify HMAC SHA512 signature in production
    if (PAYSTACK_SECRET && !PAYSTACK_SECRET.includes('demo') && signature) {
      const hash = crypto.createHmac('sha512', PAYSTACK_SECRET)
        .update(JSON.stringify(req.body))
        .digest('hex');
      if (hash !== signature) {
        console.warn('Paystack webhook signature mismatch!');
        return res.status(400).send('Invalid signature');
      }
    }

    const event = req.body;
    console.log(`[Paystack Webhook] Event received: ${event.event}`);

    if (event.event === 'charge.success') {
      const data = event.data;
      const metadata = data.metadata || {};
      const reference = data.reference;
      const amountNaira = (data.amount || 0) / 100;

      // Prevent duplicate processing
      const existing = await Transaction.findOne({ reference });
      if (existing) {
        return res.status(200).send('Already processed');
      }

      if (metadata.userId) {
        const user = await User.findById(metadata.userId);
        if (user) {
          if (metadata.purpose === 'wallet_deposit') {
            user.balanceNaira = Math.round((user.balanceNaira + amountNaira) * 100) / 100;
            await user.save();
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
    } else if (event.event === 'transfer.success') {
      const transferCode = event.data?.transfer_code;
      if (transferCode) {
        await Withdrawal.findOneAndUpdate({ transferCode }, { status: 'paid' });
      }
    } else if (event.event === 'transfer.failed') {
      const transferCode = event.data?.transfer_code;
      if (transferCode) {
        const wth = await Withdrawal.findOne({ transferCode });
        if (wth && wth.status !== 'failed') {
          wth.status = 'failed';
          await wth.save();
          // Refund user balance
          const user = await User.findById(wth.userId);
          if (user) {
            user.balanceNaira += wth.amount;
            await user.save();
          }
        }
      }
    }

    return res.status(200).send('Webhook processed');
  } catch (err) {
    console.error('Paystack webhook error:', err);
    return res.status(500).send('Internal server error');
  }
};

