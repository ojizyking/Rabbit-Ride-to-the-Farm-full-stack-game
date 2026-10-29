const mongoose = require('mongoose');

async function seedInitialShop() {
  try {
    const Rabbit = require('../models/Rabbit');
    const Bicycle = require('../models/Bicycle');

    const rabbitCount = await Rabbit.countDocuments();
    if (rabbitCount === 0) {
      console.log('Seeding initial Rabbits into database...');
      await Rabbit.create([
        {
          name: 'Starter White Rabbit',
          priceNaira: 0,
          speed: 10,
          jump: 10,
          stamina: 10,
          grip: 10,
          drift: 10,
          imageUrl: '/assets/rabbits/starter_rabbit.svg',
          description: 'A nimble white bunny ready to ride and earn.'
        },
        {
          name: 'Red Hoodie Rabbit',
          priceNaira: 1000,
          speed: 20,
          jump: 15,
          stamina: 20,
          grip: 15,
          drift: 12,
          imageUrl: '/assets/rabbits/red_hoodie.svg',
          description: 'Street-smart rabbit with speed +10 and jump +5.'
        },
        {
          name: 'Blue Aviator Rabbit',
          priceNaira: 2000,
          speed: 30,
          jump: 20,
          stamina: 25,
          grip: 20,
          drift: 15,
          imageUrl: '/assets/rabbits/blue_aviator.svg',
          description: 'Sky-cruising rabbit with speed +20 and grip +10.'
        },
        {
          name: 'Farmer Hat Rabbit',
          priceNaira: 5000,
          speed: 35,
          jump: 25,
          stamina: 35,
          grip: 25,
          drift: 20,
          imageUrl: '/assets/rabbits/farmer_hat.svg',
          description: 'Veteran agricultural bunny with stamina +25 and carry +15.'
        },
        {
          name: 'Ninja Rabbit',
          priceNaira: 10000,
          speed: 50,
          jump: 35,
          stamina: 45,
          grip: 35,
          drift: 35,
          imageUrl: '/assets/rabbits/ninja_rabbit.svg',
          description: 'Shadow runner master rabbit with speed +40 and drift +25.'
        }
      ]);
      console.log('Rabbits seeded successfully.');
    }

    const bikeCount = await Bicycle.countDocuments();
    if (bikeCount === 0) {
      console.log('Seeding initial Bicycles into database...');
      await Bicycle.create([
        {
          name: 'Classic Yellow Bike',
          priceNaira: 0,
          speed: 10,
          stability: 10,
          boost: 10,
          imageUrl: '/assets/bikes/starter_bike.svg',
          description: 'Reliable yellow farm bicycle with sturdy wheels.'
        },
        {
          name: 'Blue Basket Bike',
          priceNaira: 2000,
          speed: 25,
          stability: 30,
          boost: 20,
          imageUrl: '/assets/bikes/blue_basket.svg',
          description: 'Cruiser bike with flower basket, speed +15 and stability +20.'
        },
        {
          name: 'Green Bloom Bike',
          priceNaira: 5000,
          speed: 45,
          stability: 40,
          boost: 30,
          imageUrl: '/assets/bikes/green_bloom.svg',
          description: 'Eco-charged racing bike, speed +35 and boost +20.'
        },
        {
          name: 'Turbo Golden Farm Bike',
          priceNaira: 10000,
          speed: 60,
          stability: 50,
          boost: 45,
          imageUrl: '/assets/bikes/turbo_gold.svg',
          description: 'High performance farm cruiser with ultra nitro speed.'
        }
      ]);
      console.log('Bicycles seeded successfully.');
    }
  } catch (err) {
    console.error('Error seeding shop data:', err);
  }
}

/**
 * Backfill unique playerId for all existing users that don't have one.
 * Runs once on server startup.
 */
async function backfillPlayerIds() {
  try {
    const User = require('../models/User');
    const { generatePlayerId } = require('../models/modelAdapter');
    const memoryStore = require('./memoryStore');

    // Check if using memory store (no MongoDB)
    if (mongoose.connection.readyState !== 1) {
      const users = memoryStore.data.users || [];
      let backfilled = 0;
      for (const user of users) {
        if (!user.playerId) {
          user.playerId = generatePlayerId();
          backfilled++;
        }
      }
      if (backfilled > 0) {
        memoryStore.save();
        console.log(`✅ Backfilled playerId for ${backfilled} existing user(s).`);
      }
      return;
    }

    // MongoDB mode
    const usersWithout = await User.find({ playerId: { $exists: false } });
    if (usersWithout.length > 0) {
      for (const user of usersWithout) {
        user.playerId = generatePlayerId();
        await user.save();
      }
      console.log(`✅ Backfilled playerId for ${usersWithout.length} existing user(s) in MongoDB.`);
    }
  } catch (err) {
    console.error('Error backfilling playerIds:', err);
  }
}

/**
 * Automatically synchronizes data between memoryStore (dev_data.json) and MongoDB Atlas.
 * Guarantees that users, rides, transactions, subscriptions, withdrawals, and systemConfigs
 * are preserved and reflected across both stores.
 */
async function syncStores() {
  if (mongoose.connection.readyState !== 1) return;

  try {
    const memoryStore = require('./memoryStore');
    const User = require('../models/User');
    const Rabbit = require('../models/Rabbit');
    const Bicycle = require('../models/Bicycle');
    const Ride = require('../models/Ride');
    const Transaction = require('../models/Transaction');
    const Subscription = require('../models/Subscription');
    const Withdrawal = require('../models/Withdrawal');
    const SystemConfig = require('../models/SystemConfig');

    console.log('[Sync] Starting bidirectional store synchronization...');

    const atlasRabbits = await Rabbit.find({});
    const atlasBikes = await Bicycle.find({});
    const defaultRabbit = atlasRabbits.find(r => r.name && r.name.toLowerCase().includes('starter')) || atlasRabbits[0];
    const defaultBike = atlasBikes.find(b => b.name && (b.name.toLowerCase().includes('classic') || b.name.toLowerCase().includes('starter'))) || atlasBikes[0];

    // 1. Sync Users
    let syncedUsers = 0;
    const memUsers = memoryStore.data.users || [];
    for (const memUser of memUsers) {
      if (!memUser.email) continue;
      const cleanEmail = memUser.email.toLowerCase().trim();
      let mongoUser = await User.findOne({
        $or: [{ email: cleanEmail }, { _id: memUser._id }]
      });

      if (!mongoUser) {
        const userToInsert = { ...memUser, email: cleanEmail };
        if (!userToInsert.currentRabbitId && defaultRabbit) userToInsert.currentRabbitId = defaultRabbit._id;
        if (!userToInsert.currentBikeId && defaultBike) userToInsert.currentBikeId = defaultBike._id;
        if (!userToInsert.ownedRabbits || userToInsert.ownedRabbits.length === 0) {
          userToInsert.ownedRabbits = defaultRabbit ? [defaultRabbit._id] : [];
        }
        if (!userToInsert.ownedBikes || userToInsert.ownedBikes.length === 0) {
          userToInsert.ownedBikes = defaultBike ? [defaultBike._id] : [];
        }
        await User.create(userToInsert);
        syncedUsers++;
      } else {
        let modified = false;
        if ((memUser.balanceNaira || 0) > (mongoUser.balanceNaira || 0)) {
          mongoUser.balanceNaira = memUser.balanceNaira;
          modified = true;
        }
        if ((memUser.totalRides || 0) > (mongoUser.totalRides || 0)) {
          mongoUser.totalRides = memUser.totalRides;
          modified = true;
        }
        if (memUser.role === 'admin' && mongoUser.role !== 'admin') {
          mongoUser.role = 'admin';
          modified = true;
        }
        if (memUser.referralCode && !mongoUser.referralCode) {
          mongoUser.referralCode = memUser.referralCode;
          modified = true;
        }
        if (memUser.playerId && !mongoUser.playerId) {
          mongoUser.playerId = memUser.playerId;
          modified = true;
        }
        if (modified) {
          await mongoUser.save();
        }
      }
    }

    // Mirror any Mongo-only users back into memoryStore
    const allMongoUsers = await User.find({});
    for (const mu of allMongoUsers) {
      const plain = mu.toObject ? mu.toObject() : mu;
      const idx = memUsers.findIndex(u => u.email === plain.email || (u._id && u._id.toString() === plain._id.toString()));
      if (idx < 0) {
        memUsers.push(plain);
      }
    }

    // 2. Sync Rides (Bulk)
    let syncedRides = 0;
    const memRides = memoryStore.data.rides || [];
    if (memRides.length > 0) {
      const existingRides = await Ride.find({}, { _id: 1 });
      const existingRideIds = new Set(existingRides.map(r => r._id ? r._id.toString() : ''));
      const ridesToInsert = memRides.filter(r => r && r._id && !existingRideIds.has(r._id.toString()));
      if (ridesToInsert.length > 0) {
        await Ride.insertMany(ridesToInsert, { ordered: false });
        syncedRides = ridesToInsert.length;
      }
    }

    // 3. Sync Transactions (Bulk)
    let syncedTxs = 0;
    const memTxs = memoryStore.data.transactions || [];
    if (memTxs.length > 0) {
      const existingTxs = await Transaction.find({}, { _id: 1 });
      const existingTxIds = new Set(existingTxs.map(t => t._id ? t._id.toString() : ''));
      const txsToInsert = memTxs.filter(t => t && t._id && !existingTxIds.has(t._id.toString()));
      if (txsToInsert.length > 0) {
        await Transaction.insertMany(txsToInsert, { ordered: false });
        syncedTxs = txsToInsert.length;
      }
    }

    // 4. Sync Subscriptions (Bulk)
    let syncedSubs = 0;
    const memSubs = memoryStore.data.subscriptions || [];
    if (memSubs.length > 0) {
      const existingSubs = await Subscription.find({}, { _id: 1 });
      const existingSubIds = new Set(existingSubs.map(s => s._id ? s._id.toString() : ''));
      const subsToInsert = memSubs.filter(s => s && s._id && !existingSubIds.has(s._id.toString()));
      if (subsToInsert.length > 0) {
        await Subscription.insertMany(subsToInsert, { ordered: false });
        syncedSubs = subsToInsert.length;
      }
    }

    // 5. Sync Withdrawals (Bulk)
    let syncedWithdrawals = 0;
    const memWithdrawals = memoryStore.data.withdrawals || [];
    if (memWithdrawals.length > 0) {
      const existingWs = await Withdrawal.find({}, { _id: 1 });
      const existingWIds = new Set(existingWs.map(w => w._id ? w._id.toString() : ''));
      const wsToInsert = memWithdrawals.filter(w => w && w._id && !existingWIds.has(w._id.toString()));
      if (wsToInsert.length > 0) {
        await Withdrawal.insertMany(wsToInsert, { ordered: false });
        syncedWithdrawals = wsToInsert.length;
      }
    }

    // 6. Sync SystemConfigs (Bulk)
    let syncedConfigs = 0;
    const memConfigs = memoryStore.data.systemConfigs || [];
    if (memConfigs.length > 0) {
      const existingCfgs = await SystemConfig.find({}, { key: 1 });
      const existingCfgKeys = new Set(existingCfgs.map(c => c.key));
      const cfgsToInsert = memConfigs.filter(c => c && c.key && !existingCfgKeys.has(c.key));
      if (cfgsToInsert.length > 0) {
        await SystemConfig.insertMany(cfgsToInsert, { ordered: false });
        syncedConfigs = cfgsToInsert.length;
      }
    }

    memoryStore.save();
    console.log(`[Sync] ✅ Bidirectional sync finished! Synced to MongoDB Atlas: ${syncedUsers} users, ${syncedRides} rides, ${syncedTxs} txs, ${syncedSubs} subs, ${syncedWithdrawals} withdrawals.`);
  } catch (err) {
    console.error('[Sync] ⚠️ Error during store synchronization:', err.message);
  }
}

// Connection event listeners for auto-reconnect tracking
mongoose.connection.on('disconnected', () => {
  console.warn('[DB] ⚠️ MongoDB connection lost. Operating in resilient fallback mode...');
});
mongoose.connection.on('reconnected', () => {
  console.log('[DB] ✅ MongoDB reconnected. Triggering sync...');
  syncStores();
});

async function connectDB() {
  const primaryUri = process.env.MONGO_URI || 'mongodb://localhost:27017/rabbit_farm';
  const isAtlas = primaryUri.includes('mongodb+srv');
  const isRemote = isAtlas || !primaryUri.includes('localhost');

  try {
    console.log(`[DB] Connecting to ${isAtlas ? 'MongoDB Atlas' : 'MongoDB'}...`);
    await mongoose.connect(primaryUri, {
      serverSelectionTimeoutMS: isAtlas ? 15000 : 3000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 15000,
      maxPoolSize: 10,
      family: 4, // Force IPv4 to avoid ECONNRESET on dual-stack environments
      retryWrites: true,
      w: 'majority',
      appName: 'RabbitRideFarm'
    });
    console.log(`[DB] ✅ MongoDB ${isAtlas ? 'Atlas' : 'local'} connected successfully.`);
    await seedInitialShop();
    await backfillPlayerIds();
    await syncStores();
  } catch (err) {
    if (isRemote) {
      console.error('[DB] ❌ MongoDB connection FAILED:', err.message);
      console.error('[DB] ⚠️  Falling back to in-memory JSON store. All data will be retained in dev_data.json!');
      console.error('[DB] 💡 Ensure MONGO_URI is set correctly and IP 0.0.0.0/0 is allowed in Atlas.');
    } else {
      console.log('------------------------------------------------------------');
      console.log('ℹ️  No local MongoDB found — using JSON-backed memory store.');
      console.log('✅ Server is operational. Set MONGO_URI for persistent storage.');
      console.log('------------------------------------------------------------');
    }
    await seedInitialShop();
    await backfillPlayerIds();
  }
}

module.exports = { connectDB, seedInitialShop, syncStores };
