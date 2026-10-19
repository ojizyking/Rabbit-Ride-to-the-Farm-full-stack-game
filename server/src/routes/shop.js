const express = require('express');
const router = express.Router();
const shopController = require('../controllers/shopController');
const authMiddleware = require('../middleware/auth');

// Public listing
router.get('/rabbits', shopController.getRabbits);
router.get('/bicycles', shopController.getBicycles);

// Protected buy / equip
router.post('/buy', authMiddleware, shopController.buyOrEquip);

module.exports = router;
