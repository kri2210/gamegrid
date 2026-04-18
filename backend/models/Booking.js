const mongoose = require('mongoose');

const slotDetailSchema = new mongoose.Schema({
  startTime: String,
  endTime:   String,
  price:     Number,
  date:      String,
}, { _id: false });

const bookingSchema = new mongoose.Schema({
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  venueId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', required: true },
  venueName:     { type: String },
  sport:         { type: String },
  slots:         [{ type: mongoose.Schema.Types.ObjectId, ref: 'Slot' }],
  slotDetails:   [slotDetailSchema],
  date:          { type: String, required: true },
  totalAmount:   { type: Number, default: 0 },
  totalDuration: { type: Number, default: 60 },
  playerName:    { type: String },
  playerPhone:   { type: String, default: '' },
  playerCount:   { type: Number, default: 1 },
  paymentMethod:     { type: String, enum: ['online', 'upi', 'cash'], default: 'online' },
  paymentStatus:     { type: String, enum: ['Paid', 'Pending', 'Refunded'], default: 'Paid' },
  upiId:             { type: String, default: '' },              // for UPI manual bookings
  razorpayOrderId:   { type: String, default: '' },             // for Razorpay online
  razorpayPaymentId: { type: String, default: '' },             // for Razorpay online
  bookingType:       { type: String, enum: ['online', 'offline'], default: 'online' },
  status:            { type: String, enum: ['Confirmed', 'Cancelled', 'Completed'], default: 'Confirmed' },
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
