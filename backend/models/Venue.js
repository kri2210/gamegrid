const mongoose = require('mongoose');

const pricingSchema = new mongoose.Schema({
  base: { type: Number, default: 500 },
  peak: { type: Number, default: 800 }
}, { _id: false });

const venueSchema = new mongoose.Schema({
  ownerId:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:              { type: String, required: true, trim: true },
  description:       { type: String, default: '' },
  address:           { type: String, required: true },
  city:              { type: String, required: true },
  locality:          { type: String, default: '' },
  locationUrl:       { type: String, default: '' },   // Google Maps URL pasted by owner
  sports:            [{ type: String }],
  amenities:         [{ type: String }],
  pricing:           { type: Map, of: pricingSchema, default: {} },
  peakHours:         [{ type: String }],
  activeHoursStart:  { type: String, default: '06:00' },
  activeHoursEnd:    { type: String, default: '22:00' },
  slotDuration:      { type: Number, default: 60 },
  // Image stored in MongoDB as base64 string
  imageData:         { type: String, default: '' },
  imageContentType:  { type: String, default: '' },
  rating:            { type: Number, default: 0 },
  totalReviews:      { type: Number, default: 0 },
  isActive:          { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Venue', venueSchema);
