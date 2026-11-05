const express = require('express');
const router = express.Router();
const shopController = require('../controllers/shopController');
const authMiddleware = require('../middleware/auth');

// Public listing
router.get('/rabbits', shopController.getRabbits);
router.get('/bicycles', shopController.getBicycles);
router.get('/gadgets', shopController.getGadgets);

// Protected buy / equip / mystery box
router.post('/buy', authMiddleware, shopController.buyOrEquip);
router.post('/mystery-box', authMiddleware, shopController.openMysteryBox);

module.exports = router;
