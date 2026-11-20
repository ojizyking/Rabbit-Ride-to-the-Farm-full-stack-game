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
    // Coin expiry info
    let coinExpiresAt = null;
    if (user.coinsLastEarnedAt) {
      const exp = new Date(user.coinsLastEarnedAt);
      exp.setDate(exp.getDate() + 7);
      coinExpiresAt = exp.toISOString();
    }
    return res.json({
      success: true,
      balanceNaira: user.balanceNaira,
      withdrawableNaira: user.withdrawableNaira || 0,
      subscriptionTier: user.subscriptionTier,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
      totalRides: user.totalRides,
      activePacks: (user.activePacks || []).filter(p => p.status === 'active').map(p => ({
        packId: p.packId,
        packName: p.packName,
        boostPct: p.boostPct,
        dailyCapNaira: p.dailyCapNaira,
        lifetimeMaxNaira: p.lifetimeMaxNaira,
        lifetimeEarnedNaira: p.lifetimeEarnedNaira || 0,
        expiresAt: p.expiresAt,
        daysLeft: Math.max(0, Math.ceil((new Date(p.expiresAt) - new Date()) / 86400000))
      })),
      coinExpiresAt,
      lastPackPurchasedAt: user.lastPackPurchasedAt || null
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
      let sub = await Subscription.findOne({
        $or: [{ squadRef: reference }, { paystackRef: reference }]
      });
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
          squadRef: reference,
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
    const { method = 'bank', amount, accountNumber, bankCode, bankName = 'Commercial Bank', phoneNumber } = req.body;
    const withdrawAmount = Number(amount);

    // ── Validate method ────────────────────────────────────────────────────────
    if (!['bank', 'airtime'].includes(method)) {
      return res.status(400).json({ success: false, message: 'Invalid withdrawal method. Use "bank" or "airtime".' });
    }

    // ── Minimum amounts ────────────────────────────────────────────────────────
    if (method === 'airtime') {
      if (!withdrawAmount || withdrawAmount < 100) {
        return res.status(400).json({ success: false, message: 'Minimum airtime withdrawal is ₦100.' });
      }
      if (!phoneNumber || !/^0[7-9][01]\d{8}$/.test(phoneNumber)) {
        return res.status(400).json({ success: false, message: 'A valid Nigerian phone number is required for airtime withdrawal.' });
      }
    } else {
      if (!withdrawAmount || withdrawAmount < 1000) {
        return res.status(400).json({ success: false, message: 'Minimum bank withdrawal is ₦1,000.' });
      }
      if (!accountNumber || accountNumber.length !== 10) {
        return res.status(400).json({ success: false, message: 'A valid 10-digit NUBAN account number is required.' });
      }
      if (!bankCode) {
        return res.status(400).json({ success: false, message: 'Please select your destination bank.' });
      }
    }

    // ── Load user and check 24h pack purchase cooldown ────────────────────────
    const userDoc = await User.findById(req.user._id);
    if (!userDoc) return res.status(404).json({ success: false, message: 'User not found.' });

    if (userDoc.lastPackPurchasedAt) {
      const hoursSincePurchase = (Date.now() - new Date(userDoc.lastPackPurchasedAt).getTime()) / 3600000;
      if (hoursSincePurchase < 24) {
        const hoursLeft = Math.ceil(24 - hoursSincePurchase);
        return res.status(400).json({
          success: false,
          message: `Withdrawals are blocked for 24 hours after buying a pack. Wait ${hoursLeft} more hour(s).`
        });
      }
    }

    // ── Withdraw from withdrawableNaira (real earnings) — not play balance ────
    if (userDoc.withdrawableNaira < withdrawAmount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient withdrawable balance! You can withdraw ₦${(userDoc.withdrawableNaira || 0).toLocaleString()} but requested ₦${withdrawAmount.toLocaleString()}.`
      });
    }

    // $atomic deduct from withdrawableNaira (race-condition safe)
    const withdrawnUser = await User.findOneAndUpdate(
      { _id: req.user._id, withdrawableNaira: { $gte: withdrawAmount } },
      { $inc: { withdrawableNaira: -withdrawAmount } },
      { new: true }
    );
    if (!withdrawnUser) {
      return res.status(400).json({ success: false, message: 'Insufficient withdrawable balance or concurrent request detected. Please try again.' });
    }

    // ── Initiate Squad transfer ───────────────────────────────────────────────
    let transferResult;
    try {
      if (method === 'airtime') {
        // For airtime, use Squad's airtime API or fall back to pending manual processing
        transferResult = { status: 'pending', reference: `airtime_${Date.now()}_${req.user._id}`, transferCode: null };
      } else {
        transferResult = await initiateTransfer({
          amount: withdrawAmount,
          accountNumber,
          bankCode,
          reason: `Rabbit Ride cashout for ${withdrawnUser.email}`
        });
      }
    } catch (transferErr) {
      // Refund on transfer failure
      await User.findByIdAndUpdate(req.user._id, { $inc: { withdrawableNaira: withdrawAmount } });
      console.error('Transfer initiation failed:', transferErr.message);
      return res.status(500).json({ success: false, message: 'Transfer failed. Your balance has been restored. Please try again.' });
    }

    const withdrawal = await Withdrawal.create({
      userId: withdrawnUser._id,
      amount: withdrawAmount,
      method,
      phoneNumber: method === 'airtime' ? phoneNumber : undefined,
      accountNumber: method === 'bank' ? accountNumber : undefined,
      bankCode: method === 'bank' ? bankCode : undefined,
      bankName: method === 'bank' ? bankName : undefined,
      coinsSpent: Math.round(withdrawAmount * 1000), // 1,000 coins = ₦1
      status: transferResult.status === 'paid' ? 'paid' : 'pending',
      squadRef: transferResult.reference,
      paystackRef: transferResult.reference,
      transferCode: transferResult.transferCode || null
    });

    await Transaction.create({
      userId: withdrawnUser._id,
      type: 'withdrawal',
      amount: -withdrawAmount,
      reference: transferResult.reference,
      description: method === 'airtime'
        ? `Airtime withdrawal ₦${withdrawAmount.toLocaleString()} → ${phoneNumber}`
        : `Bank withdrawal ₦${withdrawAmount.toLocaleString()} → ${bankName} (${accountNumber.slice(0, 3)}****${accountNumber.slice(-3)})`,
      status: transferResult.status === 'paid' ? 'completed' : 'pending'
    });

    return res.json({
      success: true,
      message: `Withdrawal of ₦${withdrawAmount.toLocaleString()} submitted successfully! Processing time: 1–24 hours.`,
      withdrawalId: withdrawal._id,
      method,
      amount: withdrawAmount,
      newWithdrawableBalance: withdrawnUser.withdrawableNaira
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
 * Fetch Nigerian banks list for Squad NIP transfers
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
 * Verify destination account number via Squad NIP Account Lookup
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
 * Initialize direct wallet top-up deposit via Squad
 */
exports.deposit = async (req, res) => {
  try {
    const { amount } = req.body;
    const depositAmount = Number(amount);

    if (!depositAmount || depositAmount < 200) {
      return res.status(400).json({ success: false, message: 'Minimum deposit amount is ₦200.' });
    }

    const squadData = await initializeTransaction({
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
      authorization_url: squadData.authorization_url,
      checkout_url: squadData.checkout_url,
      reference: squadData.reference
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
      const depositAmount = data.amount > 1000 && data.amount % 100 === 0 ? data.amount / 100 : (Number(data.amount) || 0);
      // $atomic deposit credit — race-condition safe
      const user = await User.findByIdAndUpdate(
        req.user._id,
        { $inc: { balanceNaira: depositAmount } },
        { new: true }
      );

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
 * Buy Coin Bundle with direct Squad checkout or wallet balance
 */
exports.buyCoins = async (req, res) => {
  try {
    const { bundleId, paymentMethod = 'squad' } = req.body;
    // Coin bundles scaled to 10,000 coins = ₦100 (100 coins = ₦1)
    const BUNDLES = {
      bundle_4k: { coins: 20000, priceNaira: 200, name: 'Small Carrot Bag' },
      bundle_12k: { coins: 55000, priceNaira: 500, name: 'Medium Farm Crate (+10% Bonus)' },
      bundle_26k: { coins: 120000, priceNaira: 1000, name: 'Large Harvest Sack (+20% Bonus)' },
      bundle_60k: { coins: 260000, priceNaira: 2000, name: 'Golden Farm Vault (+30% Bonus)' }
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

    // Otherwise initialize Squad payment
    const squadData = await initializeTransaction({
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
      authorization_url: squadData.authorization_url,
      checkout_url: squadData.checkout_url,
      reference: squadData.reference
    });
  } catch (err) {
    console.error('buyCoins error:', err);
    return res.status(500).json({ success: false, message: 'Error initiating coin purchase.' });
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
