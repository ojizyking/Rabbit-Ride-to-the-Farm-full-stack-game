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

async function connectDB() {
  const primaryUri = process.env.MONGO_URI || 'mongodb://localhost:27017/rabbit_farm';
  const isAtlas = primaryUri.includes('mongodb+srv');
  const isRemote = isAtlas || !primaryUri.includes('localhost');

  try {
    console.log(`[DB] Connecting to ${isAtlas ? 'MongoDB Atlas' : 'MongoDB'}...`);
    await mongoose.connect(primaryUri, {
      serverSelectionTimeoutMS: isAtlas ? 15000 : 2500,
      retryWrites: true,
      w: 'majority',
      appName: 'RabbitRideFarm'
    });
    console.log(`[DB] ✅ MongoDB ${isAtlas ? 'Atlas' : 'local'} connected successfully.`);
    await seedInitialShop();
    await backfillPlayerIds();
  } catch (err) {
    if (isRemote) {
      // Atlas / remote connection failure — this is a real problem, log clearly
      console.error('[DB] ❌ MongoDB connection FAILED:', err.message);
      console.error('[DB] ⚠️  Falling back to in-memory JSON store. All data will be lost on restart!');
      console.error('[DB] 💡 Ensure MONGO_URI is set correctly in Railway environment variables.');
    } else {
      // Local dev fallback — expected when no local MongoDB daemon is running
      console.log('------------------------------------------------------------');
      console.log('ℹ️  No local MongoDB found — using JSON-backed memory store.');
      console.log('✅ Server is operational. Set MONGO_URI for persistent storage.');
      console.log('------------------------------------------------------------');
    }
    await seedInitialShop();
    await backfillPlayerIds();
  }
}

module.exports = { connectDB, seedInitialShop };
