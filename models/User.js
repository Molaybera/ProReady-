const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
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
