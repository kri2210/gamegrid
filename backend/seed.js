require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User  = require('./models/User');
const Venue = require('./models/Venue');

const MONGO_URI = process.env.MONGO_URI;

const sampleOwner = {
  name: 'Sports Hub Owner',
  email: 'owner@gamegrid.com',
  password: 'owner123',
  role: 'owner',
  phone: '9999900000'
};

const venues = [
  {
    name: 'SportZone Box Cricket Arena',
    description: 'Premium indoor box cricket facility with astro turf and modern lighting. Perfect for corporate and friendly matches.',
    address: 'Plot 42, Satellite Road',
    city: 'Ahmedabad',
    locality: 'Satellite',
    locationUrl: 'https://maps.google.com/?q=Satellite+Ahmedabad',
    sports: ['Box Cricket'],
    amenities: ['Parking', 'Changing Room', 'Cafeteria', 'Washrooms', 'CCTV', 'Floodlights'],
    pricing: new Map([['Box Cricket', { base: 600, peak: 900 }]]),
    peakHours: ['18:00', '19:00', '20:00'],
    activeHoursStart: '06:00',
    activeHoursEnd: '23:00',
  },
  {
    name: 'AceShuttle Badminton Club',
    description: 'Professional badminton courts with wooden maple flooring and international-grade shuttlecocks available.',
    address: 'B-12, Sindhu Bhavan Road',
    city: 'Ahmedabad',
    locality: 'Bodakdev',
    locationUrl: 'https://maps.google.com/?q=Sindhu+Bhavan+Road+Bodakdev+Ahmedabad',
    sports: ['Badminton'],
    amenities: ['Parking', 'Washrooms', 'First Aid', 'CCTV', 'Changing Room'],
    pricing: new Map([['Badminton', { base: 300, peak: 500 }]]),
    peakHours: ['07:00', '08:00', '18:00', '19:00', '20:00'],
    activeHoursStart: '06:00',
    activeHoursEnd: '22:00',
  },
  {
    name: 'GrandSlam Tennis Academy',
    description: 'Hard and clay courts available. Coaching and equipment rental on request. Serve your way to glory!',
    address: 'Near BRTS, Vastrapur Lake Road',
    city: 'Ahmedabad',
    locality: 'Vastrapur',
    locationUrl: 'https://maps.google.com/?q=Vastrapur+Lake+Ahmedabad',
    sports: ['Tennis'],
    amenities: ['Parking', 'Cafeteria', 'Washrooms', 'Scoreboard', 'First Aid'],
    pricing: new Map([['Tennis', { base: 400, peak: 700 }]]),
    peakHours: ['07:00', '08:00', '17:00', '18:00', '19:00'],
    activeHoursStart: '06:00',
    activeHoursEnd: '22:00',
  },
  {
    name: 'GoalZone Football Turf',
    description: '5-a-side and 7-a-side football turf with FIFA-quality synthetic grass. Flood-lit evening sessions!',
    address: 'Opp. Science City, Sola Road',
    city: 'Ahmedabad',
    locality: 'Sola',
    locationUrl: 'https://maps.google.com/?q=Science+City+Road+Sola+Ahmedabad',
    sports: ['Football'],
    amenities: ['Parking', 'Changing Room', 'Washrooms', 'CCTV', 'Floodlights', 'First Aid'],
    pricing: new Map([['Football', { base: 800, peak: 1200 }]]),
    peakHours: ['17:00', '18:00', '19:00', '20:00'],
    activeHoursStart: '06:00',
    activeHoursEnd: '23:00',
  },
  {
    name: 'GameGrid Multi Sports Center',
    description: 'All-in-one sports facility — cricket, badminton and football under one roof. Best rates in the city!',
    address: 'Nr. Iskcon, S G Highway',
    city: 'Ahmedabad',
    locality: 'Gota',
    locationUrl: 'https://maps.google.com/?q=ISKCON+SG+Highway+Ahmedabad',
    sports: ['Box Cricket', 'Badminton', 'Football'],
    amenities: ['Parking', 'Changing Room', 'Cafeteria', 'Washrooms', 'CCTV', 'Floodlights', 'Scoreboard', 'First Aid'],
    pricing: new Map([
      ['Box Cricket', { base: 700, peak: 1000 }],
      ['Badminton',   { base: 250, peak: 400 }],
      ['Football',    { base: 750, peak: 1100 }],
    ]),
    peakHours: ['07:00', '08:00', '18:00', '19:00', '20:00', '21:00'],
    activeHoursStart: '06:00',
    activeHoursEnd: '23:00',
  },
  {
    name: 'RoyalSmash Sports Club',
    description: 'Premium sports club with top-notch facilities. Dedicated courts for badminton and tennis lovers.',
    address: '45, Prahlad Nagar Garden Road',
    city: 'Ahmedabad',
    locality: 'Prahlad Nagar',
    locationUrl: 'https://maps.google.com/?q=Prahlad+Nagar+Ahmedabad',
    sports: ['Badminton', 'Tennis'],
    amenities: ['Parking', 'Changing Room', 'Cafeteria', 'Washrooms', 'CCTV'],
    pricing: new Map([
      ['Badminton', { base: 350, peak: 550 }],
      ['Tennis',    { base: 450, peak: 750 }],
    ]),
    peakHours: ['07:00', '08:00', '17:00', '18:00', '19:00'],
    activeHoursStart: '06:00',
    activeHoursEnd: '22:00',
  },
];

async function seed() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected!\n');

    // Create or find owner
    let owner = await User.findOne({ email: sampleOwner.email });
    if (!owner) {
      owner = await User.create(sampleOwner);
      console.log('👤 Created owner:', owner.email);
    } else {
      console.log('👤 Owner already exists:', owner.email);
    }

    let created = 0;
    for (const v of venues) {
      const exists = await Venue.findOne({ name: v.name });
      if (exists) {
        console.log(`⏭️  Skipping (exists): ${v.name}`);
        continue;
      }
      await Venue.create({ ...v, ownerId: owner._id, rating: (3.5 + Math.random() * 1.5).toFixed(1), totalReviews: Math.floor(Math.random() * 80) + 10 });
      console.log(`✅ Created venue: ${v.name}`);
      created++;
    }

    console.log(`\n🎉 Seed complete! Created ${created} new venue(s).`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err.message);
    process.exit(1);
  }
}

seed();
