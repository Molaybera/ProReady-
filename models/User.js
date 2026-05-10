const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    // Made optional for Google OAuth users
    required: false
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  googleAccessToken: {
    type: String
  },
  googleRefreshToken: {
    type: String
  },
  role: {
    type: String,
    enum: ['player', 'coach'],
    default: 'player'
  },
  name: {
    type: String,
    required: true
  },
  sport: {
    type: String,
    default: 'football'
  },
  bio: {
    type: String,
    default: ''
  },
  achievements: {
    type: [String],
    default: []
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
