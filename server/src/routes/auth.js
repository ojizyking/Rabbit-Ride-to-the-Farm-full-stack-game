const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/clerk-sync', authController.clerkSync);

// Catch-all for non-POST methods on login/register to provide descriptive 405 error
router.all(['/register', '/login', '/clerk-sync'], (req, res, next) => {
  if (req.method !== 'POST' && req.method !== 'OPTIONS') {
    return res.status(405).json({
      success: false,
      message: `HTTP Method ${req.method} not allowed on this endpoint. Please use POST.`
    });
  }
  next();
});
router.get('/me', authMiddleware, authController.getMe);
// Referral code routes - resilient across POST, PUT, PATCH and trailing slashes
const customizePaths = ['/customize-referral-code', '/customize-referral-code/'];
router.post(customizePaths, authMiddleware, authController.customizeReferralCode);
router.put(customizePaths, authMiddleware, authController.customizeReferralCode);
router.patch(customizePaths, authMiddleware, authController.customizeReferralCode);
router.get(customizePaths, authMiddleware, (req, res) => {
  res.json({
    success: true,
    message: 'Referral code customization endpoint active. Use POST/PUT/PATCH with { customCode }.',
    referralCode: req.user ? req.user.referralCode : null
  });
});

router.get(['/referrals', '/referrals/'], authMiddleware, authController.getReferralStats);

module.exports = router;
