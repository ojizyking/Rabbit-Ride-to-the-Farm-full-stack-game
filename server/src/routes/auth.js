const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/clerk-sync', authController.clerkSync);
router.get('/me', authMiddleware, authController.getMe);
router.post('/customize-referral-code', authMiddleware, authController.customizeReferralCode);
router.put('/customize-referral-code', authMiddleware, authController.customizeReferralCode);
router.get('/referrals', authMiddleware, authController.getReferralStats);

module.exports = router;
