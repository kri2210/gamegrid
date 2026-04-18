const router = require('express').Router();
const Booking = require('../models/Booking');
const Slot = require('../models/Slot');
const Venue = require('../models/Venue');
const { authMiddleware } = require('../middleware/auth');

// POST /api/bookings  — Create bookings (UPI-manual & Cash only)
// Online/card payments are handled via /api/payments routes (Razorpay)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { venueId, sport, slotIds, playerName, playerPhone, playerCount, paymentMethod, upiId } = req.body;

    if (!venueId || !slotIds || slotIds.length === 0)
      return res.status(400).json({ error: 'Venue and slots are required' });

    // Only allow upi and cash through this route; online goes via /api/payments
    if (!['upi', 'cash'].includes(paymentMethod))
      return res.status(400).json({ error: 'Use /api/payments for online payments' });

    const venue = await Venue.findById(venueId);
    if (!venue) return res.status(404).json({ error: 'Venue not found' });

    // ── Date/time validation ──────────────────────────────────────────────────
    const today   = new Date().toISOString().split('T')[0];
    const nowHour = new Date().getHours();

    const selectedSlots = [];
    for (const sid of slotIds) {
      const slot = await Slot.findById(sid);
      if (!slot)          return res.status(404).json({ error: 'Slot not found' });
      if (slot.isBooked)  return res.status(409).json({ error: `Slot ${slot.startTime}–${slot.endTime} is already booked` });
      if (slot.isBlocked) return res.status(409).json({ error: `Slot ${slot.startTime}–${slot.endTime} is blocked` });
      if (slot.date < today) return res.status(400).json({ error: 'Cannot book past dates' });
      if (slot.date === today && parseInt(slot.startTime.split(':')[0]) <= nowHour)
        return res.status(400).json({ error: `Slot ${slot.startTime} has already passed` });
      selectedSlots.push(slot);
    }

    const totalAmount   = selectedSlots.reduce((s, sl) => s + sl.price, 0);
    const totalDuration = selectedSlots.length * 60;

    const booking = await Booking.create({
      userId:        req.user._id,
      venueId:       venue._id,
      venueName:     venue.name,
      sport:         sport || selectedSlots[0].sport,
      slots:         slotIds,
      slotDetails:   selectedSlots.map(s => ({ startTime: s.startTime, endTime: s.endTime, price: s.price, date: s.date })),
      date:          selectedSlots[0].date,
      totalAmount,
      totalDuration,
      playerName:    playerName || req.user.name,
      playerPhone:   playerPhone || req.user.phone || '',
      playerCount:   playerCount || 1,
      paymentMethod: paymentMethod,
      paymentStatus: paymentMethod === 'upi' ? 'Paid' : 'Pending', // UPI = paid; Cash = pending at venue
      upiId:         upiId || '',
      bookingType:   'online',
      status:        'Confirmed',
    });

    // Mark slots booked
    await Slot.updateMany(
      { _id: { $in: slotIds } },
      { isBooked: true, bookedBy: req.user._id, bookingId: booking._id }
    );

    res.status(201).json({ success: true, booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bookings  — My bookings
router.get('/', authMiddleware, async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user._id }).sort('-createdAt').lean();
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/bookings/:id/cancel
router.put('/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (String(booking.userId) !== String(req.user._id) && req.user.role !== 'owner')
      return res.status(403).json({ error: 'Unauthorized' });

    booking.status = 'Cancelled';
    booking.paymentStatus = booking.paymentStatus === 'Paid' ? 'Refunded' : booking.paymentStatus;
    await booking.save();

    // Free slots
    await Slot.updateMany(
      { _id: { $in: booking.slots } },
      { isBooked: false, bookedBy: null, bookingId: null }
    );

    res.json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
