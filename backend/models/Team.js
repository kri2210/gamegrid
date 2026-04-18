const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  eventId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  teamName:      { type: String, required: true, trim: true },
  createdBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },  // null for offline
  playerName:    { type: String, default: '' },
  playerPhone:   { type: String, default: '' },
  numberOfPlayers: { type: Number, required: true },
  members:       [{ type: String }],
  paymentMethod: { type: String, enum: ['online', 'card', 'upi', 'cash'], default: 'online' },
  paymentStatus: { type: String, enum: ['Paid', 'Pending'], default: 'Paid' },
  isOffline:     { type: Boolean, default: false },
}, { timestamps: true });

// Enforce unique team name per event
teamSchema.index({ eventId: 1, teamName: 1 }, { unique: true });

module.exports = mongoose.model('Team', teamSchema);
