const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/clerk-sync', authController.clerkSync);

// Informative GET handlers (prevents 405 on browser navigation or 301/302 redirects)
router.get(['/register', '/register/'], (req, res) => {
  res.json({
    success: true,
    message: 'Rabbit Ride Auth register endpoint active. Submit a POST request with { email, password, referralCode }.'
  });
});

router.get(['/login', '/login/'], (req, res) => {
  res.json({
    success: true,
    message: 'Rabbit Ride Auth login endpoint active. Submit a POST request with { email, password }.'
  });
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
