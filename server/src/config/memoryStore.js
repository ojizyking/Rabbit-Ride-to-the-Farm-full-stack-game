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
    _id: 'rab_006',
    name: 'Chef Carrot-Flambé',
    priceNaira: 1500,
    speed: 22,
    jump: 18,
    stamina: 25,
    grip: 18,
    drift: 15,
    imageUrl: '/assets/rabbits/chef_rabbit.svg',
    description: 'Bakes golden crispy carrots! Speed +12 and +10% carrot harvest value.'
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
    _id: 'rab_007',
    name: 'Disco Bunny',
    priceNaira: 3500,
    speed: 35,
    jump: 25,
    stamina: 30,
    grip: 20,
    drift: 25,
    imageUrl: '/assets/rabbits/disco_rabbit.svg',
    description: 'Grooves with neon glitter trails! Speed +25 and combo streak timer +2s.'
  },
  {
    _id: 'rab_004',
    name: 'Farmer Hat Rabbit',
    priceNaira: 5000,
    speed: 38,
    jump: 25,
    stamina: 35,
    grip: 25,
    drift: 20,
    imageUrl: '/assets/rabbits/farmer_hat.svg',
    description: 'Veteran agricultural bunny with stamina +25 and carry +15.'
  },
  {
    _id: 'rab_008',
    name: 'Astro-Bunny',
    priceNaira: 7500,
    speed: 45,
    jump: 45,
    stamina: 35,
    grip: 25,
    drift: 30,
    imageUrl: '/assets/rabbits/astro_rabbit.svg',
    description: 'Low-gravity lunar suit! Jump +35 and float glide for effortless stunts.'
  },
  {
    _id: 'rab_005',
    name: 'Ninja Rabbit',
    priceNaira: 10000,
    speed: 55,
    jump: 35,
    stamina: 45,
    grip: 35,
    drift: 35,
    imageUrl: '/assets/rabbits/ninja_rabbit.svg',
    description: 'Shadow runner master rabbit with speed +40 and drift +25.'
  },
  {
    _id: 'rab_009',
    name: 'Cyber Mech Bunny',
    priceNaira: 15000,
    speed: 65,
    jump: 40,
    stamina: 50,
    grip: 40,
    drift: 40,
    imageUrl: '/assets/rabbits/cyber_rabbit.svg',
    description: 'Full carbon-titanium frame with laser carrot sensors and extended turbo boost!'
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
    _id: 'bike_005',
    name: 'Vintage Farm Tractor',
    priceNaira: 3500,
    speed: 35,
    stability: 60,
    boost: 25,
    imageUrl: '/assets/bikes/vintage_tractor.svg',
    description: 'Heavy-duty diesel farm champion! Smashes through hay bales without damage!'
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
    _id: 'bike_006',
    name: 'Carrot Chopper V-Twin',
    priceNaira: 7500,
    speed: 55,
    stability: 40,
    boost: 45,
    imageUrl: '/assets/bikes/carrot_chopper.svg',
    description: 'Loud custom chopper with dual carrot chrome exhausts and flame boost trails!'
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
  },
  {
    _id: 'bike_007',
    name: 'Crop-Circle Hover UFO',
    priceNaira: 20000,
    speed: 70,
    stability: 55,
    boost: 55,
    imageUrl: '/assets/bikes/hover_ufo.svg',
    description: 'Alien crop technology! Levitates silently with frictionless anti-gravity glide.'
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
