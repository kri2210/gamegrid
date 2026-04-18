const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  venueId:              { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', required: true },
  ownerId:              { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:                 { type: String, required: true, trim: true },
  description:          { type: String, default: '' },
  prizePool:            { type: String, default: '' },
  entryFee:             { type: Number, default: 0 },
  facilities:           [{ type: String }],
  maxTeams:             { type: Number, required: true },
  registeredTeamsCount: { type: Number, default: 0 },
  startDate:            { type: String, required: true },
  endDate:              { type: String },
  eventTime:            { type: String, default: '09:00' },
  lastRegistrationDate: { type: String, required: true },
  status:               { type: String, enum: ['Open', 'Closed', 'Full', 'Active', 'Cancelled'], default: 'Open' },
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);
