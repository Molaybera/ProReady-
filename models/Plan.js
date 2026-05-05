const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sport: String,
  matchDate: Date,
  inputs: {
    sleepHours: Number,
    soreness: String,
    intensity: String,
    scheduleHours: String
  },
  readiness_score: Number,
  sub_scores: Object,
  insights: Array,
  alerts: Array,
  days: Array,
  specialMessage: Object,
  generatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Plan', planSchema);
