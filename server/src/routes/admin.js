const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// All admin routes require authenticated session with admin role/email whitelist
router.use(authMiddleware);
router.use(adminAuth);

// Mission Control & Live Telemetry
router.get('/overview', adminController.getOverview);
router.get('/telemetry/live', adminController.getLiveTelemetry);

// Users Management
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserById);
router.patch('/users/:id', adminController.updateUser);

// Financials & Withdrawals Queue
router.get('/withdrawals', adminController.getWithdrawals);
router.post('/withdrawals/:id/approve', adminController.approveWithdrawal);
router.post('/withdrawals/:id/reject', adminController.rejectWithdrawal);
router.get('/transactions', adminController.getTransactions);

// Game & Referral Analytics
router.get('/game-stats', adminController.getGameStats);
router.get('/referrals', adminController.getReferrals);

// Runtime System Configuration
router.get('/config', adminController.getSystemConfig);
router.put('/config', adminController.updateSystemConfig);

module.exports = router;
