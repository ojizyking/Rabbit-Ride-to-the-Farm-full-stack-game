const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/balance', walletController.getBalance);
router.get('/transactions', walletController.getTransactions);
router.post('/subscribe', walletController.subscribe);
router.post('/verify', walletController.verifySubscription);
router.post('/withdraw', walletController.withdraw);

module.exports = router;
