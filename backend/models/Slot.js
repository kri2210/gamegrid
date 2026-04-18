const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema({
  venueId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', required: true },
  sport:     { type: String, required: true },
  date:      { type: String, required: true },
  startTime: { type: String, required: true },
  endTime:   { type: String, required: true },
  duration:  { type: Number, default: 60 },
  price:     { type: Number, required: true },
  isPeak:    { type: Boolean, default: false },
  isBooked:  { type: Boolean, default: false },
  isBlocked: { type: Boolean, default: false },
  bookedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
}, { timestamps: true });

// Prevent duplicate slots for same venue+sport+date+time
slotSchema.index({ venueId: 1, sport: 1, date: 1, startTime: 1 }, { unique: true });

module.exports = mongoose.model('Slot', slotSchema);
