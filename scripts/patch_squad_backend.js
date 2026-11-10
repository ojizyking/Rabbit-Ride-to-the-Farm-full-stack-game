const fs = require('fs');
const path = require('path');

// 1. Update walletController.js
const walletPath = path.join(__dirname, '../server/src/controllers/walletController.js');
let walletCode = fs.readFileSync(walletPath, 'utf8');

// Replace import
walletCode = walletCode.replace(
  "require('../config/paystack')",
  "require('../config/squad')"
);

// Replace subscribe method
walletCode = walletCode.replace(
  /const paystackData = await initializeTransaction\(\{[\s\S]*?callback_url: `\$\{req\.headers\.origin \|\| 'http:\/\/localhost:5173'\}\/wallet`\s*\}\);[\s\S]*?return res\.json\(\{[\s\S]*?reference: paystackData\.reference\s*\}\);/,
  `const squadData = await initializeTransaction({
      email: req.user.email,
      amount,
      metadata: {
        userId: req.user._id.toString(),
        tierName,
        purpose: 'Rabbit Ride Subscription'
      },
      callback_url: \`\${req.headers.origin || 'http://localhost:5173'}/wallet\`
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
    });`
);

// Replace verifySubscription lookup
walletCode = walletCode.replace(
  "let sub = await Subscription.findOne({ paystackRef: reference });",
  "let sub = await Subscription.findOne({ $or: [{ squadRef: reference }, { paystackRef: reference }] });"
);

walletCode = walletCode.replace(
  "paystackRef: reference,",
  "squadRef: reference, paystackRef: reference,"
);

// Replace withdraw section
walletCode = walletCode.replace(
  /\/\/ Call Paystack Transfer[\s\S]*?return res\.json\(\{[\s\S]*?newBalance: user\.balanceNaira\s*\}\);/,
  `// Call Squad Transfer
    const transferResult = await initiateTransfer({
      amount: withdrawAmount,
      accountNumber,
      bankCode,
      reason: \`Rabbit Ride cashout for \${user.email}\`
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
      description: \`Withdrawal to \${bankName} (\${accountNumber.slice(0, 3)}****\${accountNumber.slice(-3)})\`,
      status: transferResult.status === 'paid' ? 'completed' : 'pending'
    });

    return res.json({
      success: true,
      message: \`Withdrawal of ₦\${withdrawAmount.toLocaleString()} initiated successfully via Squad by GTCO!\`,
      withdrawal,
      newBalance: user.balanceNaira
    });`
);

// Replace deposit section
walletCode = walletCode.replace(
  /const paystackData = await initializeTransaction\(\{[\s\S]*?callback_url: `\$\{req\.headers\.origin \|\| 'http:\/\/localhost:5173'\}\/wallet\?status=deposit_success`\s*\}\);[\s\S]*?reference: paystackData\.reference\s*\}\);/,
  `const squadData = await initializeTransaction({
      email: req.user.email,
      amount: depositAmount,
      metadata: {
        userId: req.user._id.toString(),
        purpose: 'wallet_deposit',
        depositAmount
      },
      callback_url: \`\${req.headers.origin || 'http://localhost:5173'}/wallet?status=deposit_success\`
    });

    return res.json({
      success: true,
      amount: depositAmount,
      authorization_url: squadData.authorization_url,
      checkout_url: squadData.checkout_url,
      reference: squadData.reference
    });`
);

// Replace buyCoins section
walletCode = walletCode.replace(
  /\/\/ Otherwise initialize Paystack payment[\s\S]*?reference: paystackData\.reference\s*\}\);/,
  `// Otherwise initialize Squad payment
    const squadData = await initializeTransaction({
      email: user.email,
      amount: bundle.priceNaira,
      metadata: {
        userId: user._id.toString(),
        bundleId,
        coins: bundle.coins,
        purpose: 'coin_purchase'
      },
      callback_url: \`\${req.headers.origin || 'http://localhost:5173'}/wallet?status=coins_success\`
    });

    return res.json({
      success: true,
      bundle,
      authorization_url: squadData.authorization_url,
      checkout_url: squadData.checkout_url,
      reference: squadData.reference
    });`
);

// Replace handleWebhook
walletCode = walletCode.replace(
  /\/\*\*[\s\S]*?\* Paystack Cryptographic Webhook Handler[\s\S]*?exports\.handleWebhook = async \(req, res\) => \{[\s\S]*?\n\};/,
  `/**
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
              description: \`Webhook: Direct Wallet Top-Up of ₦\${amountNaira.toLocaleString()}\`,
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
              description: \`Webhook: Upgraded to \${user.subscriptionTier.toUpperCase()} Pack (30 Days)\`,
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
};`
);

fs.writeFileSync(walletPath, walletCode, 'utf8');
console.log('✅ Updated walletController.js to Squad API');

// 2. Update adminController.js
const adminPath = path.join(__dirname, '../server/src/controllers/adminController.js');
let adminCode = fs.readFileSync(adminPath, 'utf8');

adminCode = adminCode.replace(
  "require('../config/paystack')",
  "require('../config/squad')"
);

adminCode = adminCode.replace(
  "const { method = 'paystack', note = '' } = req.body;",
  "const { method = 'squad', note = '' } = req.body;"
);

adminCode = adminCode.replace(
  /if \(method === 'paystack'\) \{[\s\S]*?withdrawal\.status = 'paid';[\s\S]*?withdrawal\.paystackRef = transferRes\.reference \|\| `REF_\$\{Date\.now\(\)\}`;[\s\S]*?await withdrawal\.save\(\);/m,
  `if (method === 'squad' || method === 'paystack') {
      // Initiate Squad Transfer
      const transferRes = await initiateTransfer({
        amount: withdrawal.amount,
        accountNumber: withdrawal.accountNumber,
        bankCode: withdrawal.bankCode,
        reason: \`Approved Rabbit Ride withdrawal: \${note || id}\`
      });

      withdrawal.status = 'paid';
      withdrawal.transferCode = transferRes.transferCode || 'SQ_APPROVED';
      withdrawal.squadRef = transferRes.reference || \`SQ_REF_\${Date.now()}\`;
      withdrawal.paystackRef = withdrawal.squadRef;
      await withdrawal.save();`
);

adminCode = adminCode.replace(
  "{ reference: withdrawal.paystackRef }",
  "{ $or: [{ reference: withdrawal.squadRef }, { reference: withdrawal.paystackRef }] }"
);

fs.writeFileSync(adminPath, adminCode, 'utf8');
console.log('✅ Updated adminController.js to Squad API');

