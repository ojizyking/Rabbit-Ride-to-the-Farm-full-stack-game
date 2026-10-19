const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');
const authMiddleware = require('../middleware/auth');

// All game endpoints require JWT auth
router.use(authMiddleware);

router.post('/start-ride', gameController.startRide);
router.post('/collect', gameController.collect);
router.post('/end-ride', gameController.endRide);

module.exports = router;
