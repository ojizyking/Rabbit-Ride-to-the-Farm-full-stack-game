const express = require('express');
const router = express.Router();
const Ad = require('../models/Ad');

// Public: get all active ads (used by game client, no auth required)
router.get('/active', async (req, res) => {
  try {
    const ads = await Ad.find({ isActive: true }).sort({ order: 1 });
    return res.json({ success: true, ads });
  } catch (err) {
    console.error('getActiveAds error:', err);
    return res.status(500).json({ success: false, message: 'Error fetching ads.' });
  }
});

module.exports = router;

