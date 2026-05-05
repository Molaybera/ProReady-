const express = require('express');
const User = require('../models/User');
const Video = require('../models/Video');
const Report = require('../models/Report');
const Plan = require('../models/Plan');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();

// Protect all coach routes
router.use(authMiddleware);
router.use(roleMiddleware(['coach']));

// Get video network feed
router.get('/network', async (req, res) => {
  try {
    const videos = await Video.find()
      .populate('uploader', 'name sport bio achievements')
      .sort({ uploadedAt: -1 });
    res.json(videos);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching video network' });
  }
});

// Get player profile and stats
router.get('/player/:id', async (req, res) => {
  try {
    const playerId = req.params.id;
    
    // Get user details
    const player = await User.findById(playerId).select('-password');
    if (!player || player.role !== 'player') {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Get videos
    const videos = await Video.find({ uploader: playerId }).sort({ uploadedAt: -1 });
    
    // Get reports and plans for performance graph
    const reports = await Report.find({ userId: playerId }).populate('planId').sort({ savedAt: 1 }); // Chronological

    res.json({ player, videos, reports });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching player details' });
  }
});

module.exports = router;
