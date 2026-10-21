const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const authMiddleware = require('../middleware/auth');

// Public / Webhook routes (no auth required)
router.post('/webhook', walletController.handleWebhook);
router.get('/banks', walletController.getBankList);

// Authenticated wallet routes
router.use(authMiddleware);

router.get('/balance', walletController.getBalance);
router.get('/transactions', walletController.getTransactions);
router.post('/subscribe', walletController.subscribe);
router.post('/verify', walletController.verifySubscription);
router.post('/deposit', walletController.deposit);
router.post('/verify-deposit', walletController.verifyDeposit);
router.post('/buy-coins', walletController.buyCoins);
router.post('/resolve-account', walletController.verifyAccountName);
router.post('/withdraw', walletController.withdraw);

module.exports = router;
