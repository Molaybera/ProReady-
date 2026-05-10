const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const Plan = require('../models/Plan');
const Report = require('../models/Report');
const Video = require('../models/Video');
const User = require('../models/User');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const { generatePreparationPlan } = require('../utils/ai');

const router = express.Router();

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'proready_videos',
    resource_type: 'video',
    allowed_formats: ['mp4', 'mov', 'avi']
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
    console.error('Profile Update Error:', err);
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
    console.error('Save Plan Error:', err);
    res.status(500).json({ error: 'Error saving plan' });
  }
});

router.get('/plans', async (req, res) => {
  try {
    const plans = await Plan.find({ userId: req.user.id }).sort({ generatedAt: -1 });
    res.json(plans);
  } catch (err) {
    console.error('Fetch Plans Error:', err);
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
    console.error('Save Report Error:', err);
    res.status(500).json({ error: 'Error saving report' });
  }
});

router.get('/reports', async (req, res) => {
  try {
    const reports = await Report.find({ userId: req.user.id }).populate('planId').sort({ savedAt: -1 });
    res.json(reports);
  } catch (err) {
    console.error('Fetch Reports Error:', err);
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
      videoUrl: req.file.path,
      publicId: req.file.filename
    });

    await video.save();
    res.status(201).json(video);
  } catch (err) {
    console.error('Video Upload Error:', err);
    res.status(500).json({ error: 'Error uploading video' });
  }
});

router.get('/videos', async (req, res) => {
  try {
    const videos = await Video.find({ uploader: req.user.id }).sort({ uploadedAt: -1 });
    res.json(videos);
  } catch (err) {
    console.error('Fetch Videos Error:', err);
    res.status(500).json({ error: 'Error fetching videos' });
  }
});

// --- AI Plan Generation ---
router.post('/generate-plan', async (req, res) => {
  try {
    const { inputs, history } = req.body;
    
    // Call Gemini API
    const aiPlan = await generatePreparationPlan(inputs, history);
    
    // Create Plan model
    const plan = new Plan({
      userId: req.user.id,
      sport: inputs.sport,
      matchDate: new Date(inputs.matchDate),
      inputs,
      readiness_score: aiPlan.readiness_score,
      sub_scores: aiPlan.sub_scores,
      insights: aiPlan.insights,
      alerts: aiPlan.alerts,
      days: aiPlan.days
    });
    
    await plan.save();
    res.status(201).json(plan);
  } catch (err) {
    console.error('Generate Plan Error:', err);
    res.status(500).json({ error: 'Error generating AI plan' });
  }
});

module.exports = router;
