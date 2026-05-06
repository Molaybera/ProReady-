const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const Plan = require('../models/Plan');
const Report = require('../models/Report');
const Video = require('../models/Video');
const User = require('../models/User');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();

const { GridFsStorage } = require('multer-gridfs-storage');

// GridFS storage for video uploads
const storage = new GridFsStorage({
  url: process.env.MONGODB_URI || 'mongodb://localhost:27017/match_ready',
  options: { useUnifiedTopology: true },
  file: (req, file) => {
    return {
      bucketName: 'videos',
      filename: `${Date.now()}-${file.originalname}`
    };
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Protect all player routes
router.use(authMiddleware);
router.use(roleMiddleware(['player']));

// --- Profile ---
router.put('/profile', async (req, res) => {
  try {
    const { name, email, bio } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    if (name) user.name = name;
    if (email) user.email = email;
    if (bio !== undefined) user.bio = bio;
    
    await user.save();
    
    // exclude password
    const userObj = user.toObject();
    delete userObj.password;
    
    res.json(userObj);
  } catch (err) {
    res.status(500).json({ error: 'Error updating profile' });
  }
});

// --- Plans ---
router.post('/plans', async (req, res) => {
  try {
    const plan = new Plan({ ...req.body, userId: req.user.id });
    await plan.save();
    res.status(201).json(plan);
  } catch (err) {
    res.status(500).json({ error: 'Error saving plan' });
  }
});

router.get('/plans', async (req, res) => {
  try {
    const plans = await Plan.find({ userId: req.user.id }).sort({ generatedAt: -1 });
    res.json(plans);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching plans' });
  }
});

// --- Reports ---
router.post('/reports', async (req, res) => {
  try {
    const report = new Report({ ...req.body, userId: req.user.id });
    await report.save();
    res.status(201).json(report);
  } catch (err) {
    res.status(500).json({ error: 'Error saving report' });
  }
});

router.get('/reports', async (req, res) => {
  try {
    const reports = await Report.find({ userId: req.user.id }).populate('planId').sort({ savedAt: -1 });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching reports' });
  }
});

// --- Videos ---
router.post('/videos', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No video file uploaded' });
    
    const { title, description, sport } = req.body;
    
    const video = new Video({
      uploader: req.user.id,
      title,
      description,
      sport,
      fileId: req.file.id
    });

    await video.save();
    res.status(201).json(video);
  } catch (err) {
    res.status(500).json({ error: 'Error uploading video' });
  }
});

router.get('/videos', async (req, res) => {
  try {
    const videos = await Video.find({ uploader: req.user.id }).sort({ uploadedAt: -1 });
    res.json(videos);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching videos' });
  }
});

module.exports = router;
