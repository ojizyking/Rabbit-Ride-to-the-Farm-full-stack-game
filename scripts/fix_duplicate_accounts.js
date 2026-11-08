/**
 * fix_duplicate_accounts.js
 * One-time migration script:
 *   1. Finds duplicate email accounts in MongoDB
 *   2. Merges them safely (keeps highest balance, combined ownedItems)
 *   3. Logs a report of what was merged
 *   4. Ensures unique email index exists
 *
 * Run ONCE on the live database:
 *   node scripts/fix_duplicate_accounts.js
 */

// Load .env from server directory
require('dotenv').config({ path: require('path').join(__dirname, '../server/.env') });
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('❌ MONGO_URI not set in .env — cannot run migration');
  process.exit(1);
}

async function run() {
  console.log('[Migration] Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI, { family: 4, serverSelectionTimeoutMS: 10000 });
  console.log('[Migration] ✅ Connected');

  const db = mongoose.connection.db;
  const users = db.collection('users');

  // ── Step 1: Find all duplicate emails ──────────────────────────────────────
  const pipeline = [
    { $group: { _id: '$email', count: { $sum: 1 }, ids: { $push: '$_id' } } },
    { $match: { count: { $gt: 1 } } }
  ];
  const duplicates = await users.aggregate(pipeline).toArray();

  if (duplicates.length === 0) {
    console.log('[Migration] ✅ No duplicate accounts found — database is clean!');
  } else {
    console.log(`[Migration] ⚠️ Found ${duplicates.length} email(s) with duplicate accounts:`);

    for (const dup of duplicates) {
      const email = dup._id;
      const docs = await users.find({ email }).sort({ createdAt: 1 }).toArray();
      console.log(`\n  📧 ${email} — ${docs.length} accounts:`);
      docs.forEach((d, i) => {
        console.log(`    [${i}] _id=${d._id} balance=₦${d.balanceNaira} rides=${d.totalRides} role=${d.role} clerkId=${d.clerkId || 'none'} createdAt=${d.createdAt}`);
      });

      // Keep the account with the highest balance (or first if tied)
      // If one is an admin, keep that one
      let primary = docs.find(d => d.role === 'admin') || docs.reduce((best, d) =>
        (d.balanceNaira || 0) >= (best.balanceNaira || 0) ? d : best, docs[0]
      );

      const others = docs.filter(d => d._id.toString() !== primary._id.toString());

      // Merge data from duplicates into primary
      let mergeUpdate = { $set: {}, $addToSet: {} };

      for (const other of others) {
        // Take highest balance
        if ((other.balanceNaira || 0) > (primary.balanceNaira || 0)) {
          mergeUpdate.$set.balanceNaira = other.balanceNaira;
          primary.balanceNaira = other.balanceNaira;
        }
        // Sum totalRides
        const combinedRides = (primary.totalRides || 0) + (other.totalRides || 0);
        mergeUpdate.$set.totalRides = combinedRides;

        // Merge clerkId if primary doesn't have one
        if (!primary.clerkId && other.clerkId) {
          mergeUpdate.$set.clerkId = other.clerkId;
          primary.clerkId = other.clerkId;
        }

        // Merge referralCode if primary doesn't have one
        if (!primary.referralCode && other.referralCode) {
          mergeUpdate.$set.referralCode = other.referralCode;
        }

        // Merge ownedRabbits / ownedBikes / ownedGadgets
        const otherRabbits = (other.ownedRabbits || []).map(id => id.toString());
        const otherBikes = (other.ownedBikes || []).map(id => id.toString());
        const otherGadgets = other.ownedGadgets || [];
        if (otherRabbits.length) mergeUpdate.$addToSet.ownedRabbits = { $each: other.ownedRabbits };
        if (otherBikes.length) mergeUpdate.$addToSet.ownedBikes = { $each: other.ownedBikes };
        if (otherGadgets.length) mergeUpdate.$addToSet.ownedGadgets = { $each: otherGadgets };

        // Keep admin role if any account had it
        if (other.role === 'admin') mergeUpdate.$set.role = 'admin';

        // Keep hasPurchasedFarmItem if any account had it
        if (other.hasPurchasedFarmItem) mergeUpdate.$set.hasPurchasedFarmItem = true;
      }

      // Apply merge to primary
      if (Object.keys(mergeUpdate.$set).length === 0) delete mergeUpdate.$set;
      if (Object.keys(mergeUpdate.$addToSet).length === 0) delete mergeUpdate.$addToSet;
      if (Object.keys(mergeUpdate).length > 0) {
        await users.updateOne({ _id: primary._id }, mergeUpdate);
      }

      // Reassign rides and transactions from duplicate _ids to primary _id
      const otherIds = others.map(o => o._id);
      const ridesResult = await db.collection('rides').updateMany(
        { userId: { $in: otherIds } },
        { $set: { userId: primary._id } }
      );
      const txResult = await db.collection('transactions').updateMany(
        { userId: { $in: otherIds } },
        { $set: { userId: primary._id } }
      );

      console.log(`    ➕ Merged ${others.length} duplicate(s) into primary _id=${primary._id}`);
      console.log(`    🏍️  Reassigned ${ridesResult.modifiedCount} rides, ${txResult.modifiedCount} transactions`);

      // Delete the duplicates
      await users.deleteMany({ _id: { $in: otherIds } });
      console.log(`    🗑️  Deleted ${otherIds.length} duplicate account(s)`);
    }
  }

  // ── Step 2: Ensure unique index on email ───────────────────────────────────
  try {
    const indexes = await users.indexes();
    const hasEmailIndex = indexes.some(idx => idx.key && idx.key.email === 1 && idx.unique);
    if (!hasEmailIndex) {
      await users.createIndex({ email: 1 }, { unique: true, background: true });
      console.log('\n[Migration] ✅ Unique email index created on users collection');
    } else {
      console.log('\n[Migration] ✅ Unique email index already exists');
    }
  } catch (err) {
    console.warn('[Migration] ⚠️ Could not create email index (may already exist):', err.message);
  }

  // ── Step 3: Ensure unique index on referralCode ────────────────────────────
  try {
    await users.createIndex({ referralCode: 1 }, { unique: true, sparse: true, background: true });
    console.log('[Migration] ✅ Unique referralCode index confirmed');
  } catch (err) {
    console.warn('[Migration] referralCode index:', err.message);
  }

  // ── Step 4: Ensure unique index on clerkId ─────────────────────────────────
  try {
    await users.createIndex({ clerkId: 1 }, { unique: true, sparse: true, background: true });
    console.log('[Migration] ✅ Unique clerkId index confirmed');
  } catch (err) {
    console.warn('[Migration] clerkId index:', err.message);
  }

  console.log('\n[Migration] 🎉 Done! Database accounts are now isolated and clean.');
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('[Migration] ❌ Fatal error:', err);
  mongoose.disconnect();
  process.exit(1);
});
