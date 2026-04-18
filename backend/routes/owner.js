const router = require('express').Router();
const Venue   = require('../models/Venue');
const Booking = require('../models/Booking');
const Slot    = require('../models/Slot');
const DayOff  = require('../models/DayOff');
const upload  = require('../middleware/upload');
const { ownerMiddleware } = require('../middleware/auth');

// ── Venue Management ──────────────────────────────────────────────────────────

// GET /api/owner/venues
router.get('/venues', ownerMiddleware, async (req, res) => {
  try {
    const venues = await Venue.find({ ownerId: req.user._id }).select('-imageData').lean();
    res.json(venues);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/owner/venues
router.post('/venues', ownerMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { name, address, city, locality, locationUrl, sports, amenities, pricing, activeHoursStart, activeHoursEnd, peakHours, description } = req.body;

    const venueData = {
      ownerId: req.user._id,
      name, address, city,
      locality:        locality || '',
      locationUrl:     locationUrl || '',
      sports:          Array.isArray(sports) ? sports : (sports ? [sports] : []),
      amenities:       Array.isArray(amenities) ? amenities : (amenities ? [amenities] : []),
      pricing:         typeof pricing === 'string' ? JSON.parse(pricing) : (pricing || {}),
      peakHours:       Array.isArray(peakHours) ? peakHours : (peakHours ? peakHours.split(',').map(h => h.trim()) : []),
      activeHoursStart: activeHoursStart || '06:00',
      activeHoursEnd:   activeHoursEnd   || '22:00',
      description:      description || '',
    };

    if (req.file) {
      venueData.imageData        = req.file.buffer.toString('base64');
      venueData.imageContentType = req.file.mimetype;
    }

    const venue = await Venue.create(venueData);
    res.status(201).json({ success: true, venue: { ...venue.toObject(), imageData: undefined } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/owner/venues/:id
router.put('/venues/:id', ownerMiddleware, upload.single('image'), async (req, res) => {
  try {
    const venue = await Venue.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!venue) return res.status(404).json({ error: 'Venue not found' });

    const fields = ['name','address','city','locality','locationUrl','description','activeHoursStart','activeHoursEnd'];
    fields.forEach(f => { if (req.body[f] !== undefined) venue[f] = req.body[f]; });

    if (req.body.sports)    venue.sports    = Array.isArray(req.body.sports) ? req.body.sports : [req.body.sports];
    if (req.body.amenities) venue.amenities = Array.isArray(req.body.amenities) ? req.body.amenities : [req.body.amenities];
    if (req.body.pricing)   venue.pricing   = typeof req.body.pricing === 'string' ? JSON.parse(req.body.pricing) : req.body.pricing;
    if (req.body.peakHours) venue.peakHours = Array.isArray(req.body.peakHours) ? req.body.peakHours : req.body.peakHours.split(',').map(h => h.trim());

    if (req.file) {
      venue.imageData        = req.file.buffer.toString('base64');
      venue.imageContentType = req.file.mimetype;
    }

    await venue.save();
    res.json({ success: true, venue: { ...venue.toObject(), imageData: undefined } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/owner/venues/:id
router.delete('/venues/:id', ownerMiddleware, async (req, res) => {
  try {
    const venue = await Venue.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!venue) return res.status(404).json({ error: 'Venue not found' });
    await venue.deleteOne();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Slot Management ───────────────────────────────────────────────────────────

// GET /api/owner/slots?venueId=&date=&sport=
router.get('/slots', ownerMiddleware, async (req, res) => {
  try {
    const { venueId, date, sport } = req.query;
    if (!venueId || !date || !sport) return res.status(400).json({ error: 'venueId, date, and sport are required' });

    const venue = await Venue.findOne({ _id: venueId, ownerId: req.user._id });
    if (!venue) return res.status(404).json({ error: 'Venue not found' });

    // Ensure slots generated
    const existing = await Slot.find({ venueId: venue._id, sport, date });
    if (existing.length === 0) {
      const startH = parseInt(venue.activeHoursStart.split(':')[0]);
      let   endH   = parseInt(venue.activeHoursEnd.split(':')[0]);
      if (endH === 0) endH = 24;
      const toCreate = [];
      for (let h = startH; h < endH; h++) {
        const startTime = `${String(h).padStart(2,'0')}:00`;
        const endTime   = `${String(h+1).padStart(2,'0')}:00`;
        const isPeak    = venue.peakHours && venue.peakHours.includes(startTime);
        const pEntry    = venue.pricing.get ? venue.pricing.get(sport) : venue.pricing[sport];
        const pricing   = pEntry || { base: 500, peak: 800 };
        toCreate.push({ venueId: venue._id, sport, date, startTime, endTime, duration: 60, price: isPeak ? pricing.peak : pricing.base, isPeak });
      }
      if (toCreate.length) await Slot.insertMany(toCreate, { ordered: false }).catch(() => {});
    }

    let slots = await Slot.find({ venueId: venue._id, sport, date }).sort('startTime').lean();

    const today = new Date().toISOString().split('T')[0];
    if (date === today) {
      const nowH = new Date().getHours();
      slots = slots.filter(s => parseInt(s.startTime.split(':')[0]) > nowH);
    }

    res.json(slots);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/owner/slots/:id/block
router.put('/slots/:id/block', ownerMiddleware, async (req, res) => {
  try {
    const slot = await Slot.findById(req.params.id);
    if (!slot) return res.status(404).json({ error: 'Slot not found' });
    slot.isBlocked = !slot.isBlocked;
    await slot.save();
    res.json({ success: true, slot });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Day-Off Management ───────────────────────────────────────────────────────

// GET /api/owner/venues/:venueId/dayoffs
router.get('/venues/:venueId/dayoffs', ownerMiddleware, async (req, res) => {
  try {
    const venue = await Venue.findOne({ _id: req.params.venueId, ownerId: req.user._id });
    if (!venue) return res.status(404).json({ error: 'Venue not found' });
    const dayoffs = await DayOff.find({ venueId: venue._id }).sort('date').lean();
    res.json(dayoffs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/owner/venues/:venueId/dayoff  — mark a day off for a sport
router.post('/venues/:venueId/dayoff', ownerMiddleware, async (req, res) => {
  try {
    const { sport, date, reason } = req.body;
    if (!sport || !date) return res.status(400).json({ error: 'sport and date are required' });

    const venue = await Venue.findOne({ _id: req.params.venueId, ownerId: req.user._id });
    if (!venue) return res.status(404).json({ error: 'Venue not found' });

    const dayoff = await DayOff.findOneAndUpdate(
      { venueId: venue._id, sport, date },
      { venueId: venue._id, sport, date, reason: reason || '' },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Also block all existing slots for that venue/sport/date so they show as unavailable
    await Slot.updateMany({ venueId: venue._id, sport, date }, { isBlocked: true });

    res.status(201).json({ success: true, dayoff });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/owner/venues/:venueId/dayoff  — remove a day off (re-open)
router.delete('/venues/:venueId/dayoff', ownerMiddleware, async (req, res) => {
  try {
    const { sport, date } = req.body;
    if (!sport || !date) return res.status(400).json({ error: 'sport and date are required' });

    const venue = await Venue.findOne({ _id: req.params.venueId, ownerId: req.user._id });
    if (!venue) return res.status(404).json({ error: 'Venue not found' });

    await DayOff.findOneAndDelete({ venueId: venue._id, sport, date });

    // Unblock slots for that day that weren't individually booked
    await Slot.updateMany(
      { venueId: venue._id, sport, date, isBooked: false },
      { isBlocked: false }
    );

    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Booking Management ────────────────────────────────────────────────────────

// GET /api/owner/bookings
router.get('/bookings', ownerMiddleware, async (req, res) => {
  try {
    const venues   = await Venue.find({ ownerId: req.user._id }).select('_id').lean();
    const venueIds = venues.map(v => v._id);

    const { date, sport, status } = req.query;
    const query = { venueId: { $in: venueIds } };
    if (date)   query.date   = date;
    if (sport)  query.sport  = sport;
    if (status) query.status = status;

    // Auto-complete past bookings
    const today = new Date().toISOString().split('T')[0];
    const nowH  = new Date().getHours();
    await Booking.updateMany(
      {
        venueId: { $in: venueIds },
        status:  'Confirmed',
        $or: [
          { date: { $lt: today } },
          { date: today, 'slotDetails.endTime': { $lte: `${String(nowH).padStart(2,'0')}:00` } }
        ]
      },
      { status: 'Completed' }
    );

    const bookings = await Booking.find(query).sort('-createdAt').lean();
    res.json(bookings);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/owner/bookings/:id/status
router.put('/bookings/:id/status', ownerMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    booking.status = status;
    if (status === 'Cancelled') {
      await Slot.updateMany({ _id: { $in: booking.slots } }, { isBooked: false, bookedBy: null, bookingId: null });
    }
    await booking.save();
    res.json({ success: true, booking });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/owner/bookings/manual — walk-in
router.post('/bookings/manual', ownerMiddleware, async (req, res) => {
  try {
    const { venueId, sport, slotIds, playerName, playerPhone, playerCount } = req.body;
    if (!venueId || !slotIds || slotIds.length === 0)
      return res.status(400).json({ error: 'Venue and slots are required' });

    const venue = await Venue.findOne({ _id: venueId, ownerId: req.user._id });
    if (!venue) return res.status(404).json({ error: 'Venue not found or unauthorized' });

    const selectedSlots = [];
    for (const sid of slotIds) {
      const slot = await Slot.findById(sid);
      if (!slot) return res.status(404).json({ error: 'Slot not found' });
      if (slot.isBooked || slot.isBlocked) return res.status(409).json({ error: `Slot ${slot.startTime}–${slot.endTime} is unavailable` });
      selectedSlots.push(slot);
    }

    const totalAmount = selectedSlots.reduce((s, sl) => s + sl.price, 0);
    const booking = await Booking.create({
      userId: req.user._id, venueId: venue._id, venueName: venue.name,
      sport: sport || selectedSlots[0].sport, slots: slotIds,
      slotDetails: selectedSlots.map(s => ({ startTime: s.startTime, endTime: s.endTime, price: s.price, date: s.date })),
      date: selectedSlots[0].date, totalAmount, totalDuration: selectedSlots.length * 60,
      playerName: playerName || 'Walk-in', playerPhone: playerPhone || '', playerCount: playerCount || 1,
      paymentMethod: 'cash', paymentStatus: 'Pending', bookingType: 'offline', status: 'Confirmed'
    });

    await Slot.updateMany({ _id: { $in: slotIds } }, { isBooked: true, bookedBy: req.user._id, bookingId: booking._id });
    res.status(201).json({ success: true, booking });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Revenue ───────────────────────────────────────────────────────────────────

// GET /api/owner/revenue
router.get('/revenue', ownerMiddleware, async (req, res) => {
  try {
    const venues   = await Venue.find({ ownerId: req.user._id }).select('_id').lean();
    const venueIds = venues.map(v => v._id);
    const bookings = await Booking.find({ venueId: { $in: venueIds }, status: { $ne: 'Cancelled' } }).lean();

    const totalRevenue   = bookings.reduce((s, b) => s + b.totalAmount, 0);
    const paidAmount     = bookings.filter(b => b.paymentStatus === 'Paid').reduce((s, b) => s + b.totalAmount, 0);
    const pendingAmount  = bookings.filter(b => b.paymentStatus === 'Pending').reduce((s, b) => s + b.totalAmount, 0);
    const onlineBookings = bookings.filter(b => b.bookingType === 'online').length;
    const offlineBookings= bookings.filter(b => b.bookingType === 'offline').length;

    const daily = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayB = bookings.filter(b => b.date === dateStr);
      daily.push({ date: dateStr, bookings: dayB.length, revenue: dayB.reduce((s, b) => s + b.totalAmount, 0) });
    }

    res.json({ totalRevenue, totalBookings: bookings.length, paidAmount, pendingAmount, onlineBookings, offlineBookings, daily, venues: venues.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
