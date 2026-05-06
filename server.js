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
