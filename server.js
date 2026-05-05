const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file serving
app.use(express.static(path.join(__dirname, 'public')));
// We'll keep this for any existing legacy files, but new ones go to GridFS
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// GridFS Setup
let gfs;
mongoose.connection.once('open', () => {
  gfs = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: 'videos'
  });
  console.log('GridFS Bucket ready');
});

// Video Streaming Route
app.get('/api/video/:id', async (req, res) => {
  try {
    const fileId = new mongoose.Types.ObjectId(req.params.id);
    
    // Check if file exists and get metadata
    const files = await gfs.find({ _id: fileId }).toArray();
    if (!files || files.length === 0) {
      return res.status(404).send('Video not found');
    }

    const file = files[0];
    res.set('Content-Type', file.contentType || 'video/mp4');
    res.set('Content-Length', file.length);

    const downloadStream = gfs.openDownloadStream(fileId);
    downloadStream.pipe(res);

    downloadStream.on('error', (err) => {
      console.error('Streaming error:', err);
      res.sendStatus(404);
    });
  } catch (err) {
    res.status(400).send('Invalid video ID');
  }
});

// Routes
const authRoutes = require('./routes/auth');
const playerRoutes = require('./routes/player');
const coachRoutes = require('./routes/coach');

app.use('/api/auth', authRoutes);
app.use('/api/player', playerRoutes);
app.use('/api/coach', coachRoutes);

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/match_ready')
.then(() => console.log('MongoDB Connected'))
.catch(err => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
