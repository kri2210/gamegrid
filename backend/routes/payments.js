const router   = require('express').Router();
const Razorpay = require('razorpay');
const crypto   = require('crypto');
const Booking  = require('../models/Booking');
const Slot     = require('../models/Slot');
const Venue    = require('../models/Venue');
const { authMiddleware } = require('../middleware/auth');

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ─── POST /api/payments/create-order ──────────────────────────────────────────
// Creates a Razorpay order for the given slot IDs.
// Does NOT create a booking yet — booking is created only after payment verification.
router.post('/create-order', authMiddleware, async (req, res) => {
  try {
    const { venueId, sport, slotIds, playerName, playerPhone, playerCount } = req.body;

    if (!venueId || !slotIds || slotIds.length === 0)
      return res.status(400).json({ error: 'Venue and slots are required' });

    const venue = await Venue.findById(venueId);
    if (!venue) return res.status(404).json({ error: 'Venue not found' });

    // Validate & price slots (optimistic lock — actual lock on verify)
    const today   = new Date().toISOString().split('T')[0];
    const nowHour = new Date().getHours();
    let totalAmount = 0;

    for (const sid of slotIds) {
      const slot = await Slot.findById(sid);
      if (!slot)          return res.status(404).json({ error: 'Slot not found' });
      if (slot.isBooked)  return res.status(409).json({ error: `Slot ${slot.startTime}–${slot.endTime} is already booked` });
      if (slot.isBlocked) return res.status(409).json({ error: `Slot ${slot.startTime}–${slot.endTime} is blocked` });
      if (slot.date < today) return res.status(400).json({ error: 'Cannot book past dates' });
      if (slot.date === today && parseInt(slot.startTime.split(':')[0]) <= nowHour)
        return res.status(400).json({ error: `Slot ${slot.startTime} has already passed` });
      totalAmount += slot.price;
    }

    // Razorpay amount is in paise
    const order = await razorpay.orders.create({
      amount:   totalAmount * 100,
      currency: 'INR',
      receipt:  `receipt_${Date.now()}`,
      notes: {
        venueId,
        sport,
        slotIds:     JSON.stringify(slotIds),
        playerName:  playerName || req.user.name,
        playerPhone: playerPhone || '',
        playerCount: String(playerCount || 1),
        userId:      String(req.user._id),
      },
    });

    res.json({
      orderId:    order.id,
      amount:     totalAmount,
      currency:   'INR',
      keyId:      process.env.RAZORPAY_KEY_ID,
      prefillName:  req.user.name,
      prefillEmail: req.user.email || '',
      prefillPhone: playerPhone || req.user.phone || '',
    });
  } catch (err) {
    console.error('create-order error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/payments/verify ──────────────────────────────────────────────
// Verifies the Razorpay signature and creates the confirmed booking.
router.post('/verify', authMiddleware, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      // booking info echoed back from frontend
      venueId, sport, slotIds, playerName, playerPhone, playerCount,
    } = req.body;

    // Signature verification
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature)
      return res.status(400).json({ error: 'Payment verification failed — invalid signature' });

    // Now atomically mark slots and create booking
    const venue = await Venue.findById(venueId);
    if (!venue) return res.status(404).json({ error: 'Venue not found' });

    const selectedSlots = [];
    for (const sid of slotIds) {
      const slot = await Slot.findById(sid);
      if (!slot)          return res.status(404).json({ error: 'Slot not found' });
      if (slot.isBooked)  return res.status(409).json({ error: `Slot ${slot.startTime}–${slot.endTime} is already booked` });
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
      paymentMethod: 'online',
      paymentStatus: 'Paid',
      razorpayOrderId:   razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      bookingType:  'online',
      status:       'Confirmed',
    });

    await Slot.updateMany(
      { _id: { $in: slotIds } },
      { isBooked: true, bookedBy: req.user._id, bookingId: booking._id }
    );

    res.status(201).json({ success: true, booking });
  } catch (err) {
    console.error('verify error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
