const router   = require('express').Router();
const Razorpay  = require('razorpay');
const crypto    = require('crypto');
const Event = require('../models/Event');
const Team  = require('../models/Team');
const Venue = require('../models/Venue');
const { authMiddleware, ownerMiddleware } = require('../middleware/auth');

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function computeStatus(event) {
  const now = new Date();
  const lastReg = new Date(event.lastRegistrationDate + 'T23:59:59');
  const start   = new Date(event.startDate + 'T00:00:00');

  if (event.registeredTeamsCount >= event.maxTeams) return 'Full';
  if (now > lastReg) return 'Closed';
  if (now >= start)  return 'Active';
  return 'Open';
}

async function syncStatus(event) {
  const computed = computeStatus(event);
  if (event.status !== computed && event.status !== 'Cancelled') {
    event.status = computed;
    await event.save();
  }
  return event;
}

// ── Player APIs ───────────────────────────────────────────────────────────────

// GET /api/events
router.get('/', authMiddleware, async (req, res) => {
  try {
    let events = await Event.find({ status: { $ne: 'Cancelled' } }).sort('startDate').lean();
    const venueIds = [...new Set(events.map(e => String(e.venueId)))];
    const venues   = await Venue.find({ _id: { $in: venueIds } }).select('name address').lean();
    const venueMap = Object.fromEntries(venues.map(v => [String(v._id), v]));

    // Sync statuses
    const updated = await Promise.all(events.map(async e => {
      const computed = computeStatus(e);
      if (e.status !== computed && e.status !== 'Cancelled') {
        await Event.findByIdAndUpdate(e._id, { status: computed });
        e.status = computed;
      }
      return { ...e, venueName: venueMap[String(e.venueId)]?.name || 'Unknown', venueAddress: venueMap[String(e.venueId)]?.address || '' };
    }));

    res.json(updated.filter(e => e.status !== 'Cancelled'));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/events/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    await syncStatus(event);

    const venue = await Venue.findById(event.venueId).select('name address').lean();
    const teams = await Team.find({ eventId: event._id, paymentStatus: 'Paid' }).lean();

    res.json({ ...event.toObject(), venueName: venue?.name || '', venueAddress: venue?.address || '', teams });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/events/:id/register — player registers team
router.post('/:id/register', authMiddleware, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    await syncStatus(event);

    if (['Closed', 'Cancelled'].includes(event.status))
      return res.status(400).json({ error: 'Event registration is closed' });
    if (event.status === 'Full')
      return res.status(400).json({ error: 'Event is full' });

    const now = new Date();
    if (now > new Date(event.lastRegistrationDate + 'T23:59:59'))
      return res.status(400).json({ error: 'Registration deadline has passed' });

    const { teamName, numberOfPlayers, members, paymentMethod } = req.body;
    if (!teamName || !numberOfPlayers)
      return res.status(400).json({ error: 'Team name and number of players are required' });

    // One team per user per event
    const existing = await Team.findOne({ eventId: event._id, createdBy: req.user._id, paymentStatus: 'Paid' });
    if (existing)
      return res.status(409).json({ error: 'You have already registered a team for this event' });

    // Case-insensitive unique team name check
    const dupName = await Team.findOne({ eventId: event._id, teamNameLower: teamName.trim().toLowerCase() });
    if (dupName)
      return res.status(409).json({ error: 'Team name already exists. Please choose a different name.' });

    const isOnline = paymentMethod !== 'cash';
    const team = await Team.create({
      eventId: event._id,
      teamName: teamName.trim(),
      createdBy: req.user._id,
      playerName: req.user.name,
      playerPhone: req.user.phone || '',
      numberOfPlayers: parseInt(numberOfPlayers),
      members: Array.isArray(members) ? members : (members ? [members] : []),
      paymentMethod: paymentMethod || 'online',
      paymentStatus: isOnline ? 'Paid' : 'Pending',
      razorpayOrderId:   req.body.razorpayOrderId   || '',
      razorpayPaymentId: req.body.razorpayPaymentId || '',
    });

    if (isOnline) {
      event.registeredTeamsCount += 1;
      if (event.registeredTeamsCount >= event.maxTeams) event.status = 'Full';
      await event.save();
    }

    res.status(201).json({ success: true, team });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Team name already exists. Please choose a different name.' });
    res.status(500).json({ error: err.message });
  }
});

// GET /api/events/my/registrations — player's teams
router.get('/my/registrations', authMiddleware, async (req, res) => {
  try {
    const teams = await Team.find({ createdBy: req.user._id }).sort('-createdAt').lean();
    const eventIds = [...new Set(teams.map(t => String(t.eventId)))];
    const events   = await Event.find({ _id: { $in: eventIds } }).lean();
    const venueIds = [...new Set(events.map(e => String(e.venueId)))];
    const venues   = await Venue.find({ _id: { $in: venueIds } }).select('name').lean();
    const venueMap = Object.fromEntries(venues.map(v => [String(v._id), v]));
    const eventMap = Object.fromEntries(events.map(e => [String(e._id), { ...e, venueName: venueMap[String(e.venueId)]?.name || '' }]));

    res.json(teams.map(t => ({ ...t, event: eventMap[String(t.eventId)] || {} })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/events/:id/cancel-registration
router.delete('/:id/cancel-registration', authMiddleware, async (req, res) => {
  try {
    const team = await Team.findOne({ eventId: req.params.id, createdBy: req.user._id });
    if (!team) return res.status(404).json({ error: 'Registration not found' });

    if (team.paymentStatus === 'Paid') {
      await Event.findByIdAndUpdate(req.params.id, {
        $inc: { registeredTeamsCount: -1 },
      });
      const event = await Event.findById(req.params.id);
      if (event && event.status === 'Full') { event.status = 'Open'; await event.save(); }
    }

    await team.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Owner APIs ────────────────────────────────────────────────────────────────

// GET /api/events/owner/list
router.get('/owner/list', ownerMiddleware, async (req, res) => {
  try {
    const venues = await Venue.find({ ownerId: req.user._id }).select('_id name').lean();
    const venueIds = venues.map(v => v._id);
    const venueMap = Object.fromEntries(venues.map(v => [String(v._id), v.name]));

    const events = await Event.find({ venueId: { $in: venueIds } }).sort('-createdAt').lean();
    res.json(events.map(e => ({ ...e, venueName: venueMap[String(e.venueId)] || '' })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/events/owner/create
router.post('/owner/create', ownerMiddleware, async (req, res) => {
  try {
    const { venueId, name, description, prizePool, facilities, maxTeams, startDate, endDate, eventTime, lastRegistrationDate, entryFee } = req.body;

    const venue = await Venue.findOne({ _id: venueId, ownerId: req.user._id });
    if (!venue) return res.status(403).json({ error: 'Venue not found or unauthorized' });

    if (new Date(lastRegistrationDate) >= new Date(startDate))
      return res.status(400).json({ error: 'Last registration date must be before event start date' });

    const event = await Event.create({
      venueId, ownerId: req.user._id, name, description: description || '',
      prizePool: prizePool || '', entryFee: parseFloat(entryFee) || 0,
      facilities: Array.isArray(facilities) ? facilities : (facilities ? facilities.split(',').map(f => f.trim()) : []),
      maxTeams: parseInt(maxTeams), startDate, endDate: endDate || startDate,
      eventTime: eventTime || '09:00', lastRegistrationDate, status: 'Open'
    });

    res.status(201).json({ success: true, event });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/events/owner/:id
router.put('/owner/:id', ownerMiddleware, async (req, res) => {
  try {
    const event = await Event.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (new Date() >= new Date(event.startDate + 'T00:00:00') && event.status !== 'Cancelled')
      return res.status(400).json({ error: 'Cannot edit an event that has already started' });

    const allowed = ['name','description','prizePool','facilities','maxTeams','startDate','endDate','eventTime','lastRegistrationDate','entryFee'];
    allowed.forEach(f => {
      if (req.body[f] !== undefined) {
        if (f === 'facilities') event[f] = Array.isArray(req.body[f]) ? req.body[f] : req.body[f].split(',').map(x => x.trim());
        else if (f === 'maxTeams') event[f] = parseInt(req.body[f]);
        else if (f === 'entryFee') event[f] = parseFloat(req.body[f]) || 0;
        else event[f] = req.body[f];
      }
    });

    await event.save();
    res.json({ success: true, event });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/events/owner/:id/cancel
router.put('/owner/:id/cancel', ownerMiddleware, async (req, res) => {
  try {
    const event = await Event.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (new Date() >= new Date(event.startDate + 'T00:00:00'))
      return res.status(400).json({ error: 'Cannot cancel an event that has already started' });

    event.status = 'Cancelled';
    await event.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/events/owner/:id/registrations
router.get('/owner/:id/registrations', ownerMiddleware, async (req, res) => {
  try {
    const event = await Event.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!event) return res.status(403).json({ error: 'Unauthorized' });

    const teams = await Team.find({ eventId: event._id }).lean();

    // Populate phone from User for online registrations
    const User = require('../models/User');
    const teamsWithPhone = await Promise.all(teams.map(async t => {
      if (t.createdBy && !t.playerPhone) {
        const u = await User.findById(t.createdBy).select('phone name').lean();
        return { ...t, playerPhone: u?.phone || '', playerName: t.playerName || u?.name || '' };
      }
      return t;
    }));

    res.json({ event, teams: teamsWithPhone });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/events/owner/:id/register-offline
router.post('/owner/:id/register-offline', ownerMiddleware, async (req, res) => {
  try {
    const event = await Event.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!event) return res.status(403).json({ error: 'Unauthorized' });
    if (event.status === 'Cancelled') return res.status(400).json({ error: 'Event is cancelled' });
    if (event.registeredTeamsCount >= event.maxTeams) return res.status(400).json({ error: 'Event is full' });

    const { teamName, numberOfPlayers, members, playerName, playerPhone } = req.body;
    if (!teamName || !numberOfPlayers) return res.status(400).json({ error: 'Team name and number of players are required' });

    // Case-insensitive unique team name check
    const dupName = await Team.findOne({ eventId: event._id, teamNameLower: teamName.trim().toLowerCase() });
    if (dupName) return res.status(409).json({ error: 'Team name already exists. Please choose a different name.' });

    const team = await Team.create({
      eventId: event._id, teamName: teamName.trim(),
      createdBy: null, playerName: playerName || 'Walk-in', playerPhone: playerPhone || '',
      numberOfPlayers: parseInt(numberOfPlayers),
      members: Array.isArray(members) ? members : (members ? [members] : []),
      paymentMethod: 'cash', paymentStatus: 'Paid', isOffline: true
    });

    event.registeredTeamsCount += 1;
    if (event.registeredTeamsCount >= event.maxTeams) event.status = 'Full';
    await event.save();

    res.status(201).json({ success: true, team });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Team name already exists' });
    res.status(500).json({ error: err.message });
  }
});

// ── Razorpay Event Payment ─────────────────────────────────────────────────────

// POST /api/events/:id/event-order — create a Razorpay order for event entry fee
router.post('/:id/event-order', authMiddleware, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (!event.entryFee || event.entryFee <= 0)
      return res.status(400).json({ error: 'This event has no entry fee' });

    const { teamName } = req.body;
    if (!teamName) return res.status(400).json({ error: 'Team name is required' });

    const order = await razorpay.orders.create({
      amount:   Math.round(event.entryFee * 100), // paise
      currency: 'INR',
      receipt:  `event_${event._id}_${Date.now()}`,
      notes: {
        eventId:  String(event._id),
        eventName: event.name,
        teamName,
        userId:   String(req.user._id),
      },
    });

    res.json({
      orderId:      order.id,
      amount:       event.entryFee,
      currency:     'INR',
      keyId:        process.env.RAZORPAY_KEY_ID,
      prefillName:  req.user.name,
      prefillEmail: req.user.email || '',
      prefillPhone: req.user.phone || '',
    });
  } catch (err) {
    console.error('event-order error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/events/:id/event-verify — verify Razorpay signature then register team
router.post('/:id/event-verify', authMiddleware, async (req, res) => {
  try {
    const {
      razorpay_order_id, razorpay_payment_id, razorpay_signature,
      teamName, numberOfPlayers, members, paymentMethod,
    } = req.body;

    // Signature check
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');
    if (expected !== razorpay_signature)
      return res.status(400).json({ error: 'Payment verification failed — invalid signature' });

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (['Closed', 'Cancelled'].includes(event.status))
      return res.status(400).json({ error: 'Event registration is closed' });
    if (event.registeredTeamsCount >= event.maxTeams)
      return res.status(400).json({ error: 'Event is full' });

    // One team per user
    const existing = await Team.findOne({ eventId: event._id, createdBy: req.user._id, paymentStatus: 'Paid' });
    if (existing)
      return res.status(409).json({ error: 'You have already registered a team for this event' });

    // Case-insensitive name check
    const dupName = await Team.findOne({ eventId: event._id, teamNameLower: teamName.trim().toLowerCase() });
    if (dupName)
      return res.status(409).json({ error: 'Team name already exists. Please choose a different name.' });

    const team = await Team.create({
      eventId: event._id,
      teamName: teamName.trim(),
      createdBy: req.user._id,
      playerName: req.user.name,
      playerPhone: req.user.phone || '',
      numberOfPlayers: parseInt(numberOfPlayers),
      members: Array.isArray(members) ? members : (members ? [members] : []),
      paymentMethod: paymentMethod || 'online',
      paymentStatus: 'Paid',
      razorpayOrderId:   razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
    });

    event.registeredTeamsCount += 1;
    if (event.registeredTeamsCount >= event.maxTeams) event.status = 'Full';
    await event.save();

    res.status(201).json({ success: true, team });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Team name already exists. Please choose a different name.' });
    console.error('event-verify error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
