/**
 * One-time migration script:
 * - Drops the old { eventId: 1, teamName: 1 } unique index
 * - Populates teamNameLower for all existing teams
 * - The new { eventId: 1, teamNameLower: 1 } index is created automatically by Mongoose
 *
 * Run once: node migrate-team-index.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const db = mongoose.connection.db;
  const col = db.collection('teams');

  // 1. Drop old index (ignore error if it doesn't exist)
  try {
    await col.dropIndex('eventId_1_teamName_1');
    console.log('✅ Dropped old index: eventId_1_teamName_1');
  } catch (e) {
    console.log('ℹ️  Old index not found (already dropped or never existed):', e.message);
  }

  // 2. Populate teamNameLower for existing documents
  const result = await col.updateMany(
    { teamNameLower: { $exists: false } },
    [{ $set: { teamNameLower: { $toLower: '$teamName' } } }]
  );
  console.log(`✅ Updated ${result.modifiedCount} teams with teamNameLower`);

  await mongoose.disconnect();
  console.log('✅ Migration complete. Restart your server to create the new index.');
}

migrate().catch(err => { console.error('❌ Migration failed:', err); process.exit(1); });
