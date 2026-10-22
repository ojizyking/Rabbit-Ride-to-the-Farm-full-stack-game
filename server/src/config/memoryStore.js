// Lightweight in-memory fallback store with optional JSON persistence for zero-dependency development
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '../../dev_data.json');

const INITIAL_RABBITS = [
  {
    _id: 'rab_001',
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
    _id: 'rab_002',
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
    _id: 'rab_003',
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
    _id: 'rab_004',
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
    _id: 'rab_005',
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
];

const INITIAL_BIKES = [
  {
    _id: 'bike_001',
    name: 'Classic Yellow Bike',
    priceNaira: 0,
    speed: 10,
    stability: 10,
    boost: 10,
    imageUrl: '/assets/bikes/starter_bike.svg',
    description: 'Reliable yellow farm bicycle with sturdy wheels.'
  },
  {
    _id: 'bike_002',
    name: 'Blue Basket Bike',
    priceNaira: 2000,
    speed: 25,
    stability: 30,
    boost: 20,
    imageUrl: '/assets/bikes/blue_basket.svg',
    description: 'Cruiser bike with flower basket, speed +15 and stability +20.'
  },
  {
    _id: 'bike_003',
    name: 'Green Bloom Bike',
    priceNaira: 5000,
    speed: 45,
    stability: 40,
    boost: 30,
    imageUrl: '/assets/bikes/green_bloom.svg',
    description: 'Eco-charged racing bike, speed +35 and boost +20.'
  },
  {
    _id: 'bike_004',
    name: 'Turbo Golden Farm Bike',
    priceNaira: 10000,
    speed: 60,
    stability: 50,
    boost: 45,
    imageUrl: '/assets/bikes/turbo_gold.svg',
    description: 'High performance farm cruiser with ultra nitro speed.'
  }
];

class MemoryStore {
  constructor() {
    this.data = {
      users: [],
      rabbits: [...INITIAL_RABBITS],
      bicycles: [...INITIAL_BIKES],
      rides: [],
      transactions: [],
      subscriptions: [],
      withdrawals: [],
      systemConfigs: []
    };
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        this.data = { ...this.data, ...parsed };
        if (!this.data.rabbits || this.data.rabbits.length === 0) {
          this.data.rabbits = [...INITIAL_RABBITS];
        }
        if (!this.data.bicycles || this.data.bicycles.length === 0) {
          this.data.bicycles = [...INITIAL_BIKES];
        }
        if (!Array.isArray(this.data.systemConfigs)) {
          this.data.systemConfigs = [];
        }
        if (!Array.isArray(this.data.withdrawals)) {
          this.data.withdrawals = [];
        }
        if (!Array.isArray(this.data.transactions)) {
          this.data.transactions = [];
        }
        if (!Array.isArray(this.data.subscriptions)) {
          this.data.subscriptions = [];
        }
        if (!Array.isArray(this.data.rides)) {
          this.data.rides = [];
        }
        if (!Array.isArray(this.data.users)) {
          this.data.users = [];
        }
      }
    } catch (e) {
      console.warn('Could not read dev_data.json, starting with fresh store:', e.message);
    }
  }

  save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (e) {
      console.warn('Could not save to dev_data.json:', e.message);
    }
  }
}

const memoryStore = new MemoryStore();
module.exports = memoryStore;
