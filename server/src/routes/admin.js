const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');

// GET /api/admin/withdrawals
router.get('/withdrawals', walletController.getWithdrawals);

module.exports = router;
