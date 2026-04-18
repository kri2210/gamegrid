const mongoose = require('mongoose');

const dayOffSchema = new mongoose.Schema({
  venueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', required: true },
  sport:   { type: String, required: true },
  date:    { type: String, required: true },   // 'YYYY-MM-DD'
  reason:  { type: String, default: '' },
}, { timestamps: true });

// One day-off record per venue + sport + date
dayOffSchema.index({ venueId: 1, sport: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DayOff', dayOffSchema);
