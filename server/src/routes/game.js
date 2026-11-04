const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');
const authMiddleware = require('../middleware/auth');

// Public live music search (no auth required) - supports both /music-search and /yt-search
router.get('/music-search', gameController.searchYouTube);
router.get('/yt-search', gameController.searchYouTube);

// All other game endpoints require JWT auth
router.use(authMiddleware);

router.post('/start-ride', gameController.startRide);
router.post('/collect', gameController.collect);
router.post('/end-ride', gameController.endRide);
router.post('/sync-offline', gameController.syncOffline);

module.exports = router;
