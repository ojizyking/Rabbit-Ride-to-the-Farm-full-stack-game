const mongoose = require('mongoose');
const { createModelWrapper } = require('./modelAdapter');

const userSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.Mixed,
    default: () => new mongoose.Types.ObjectId()
  },
  playerId: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  clerkId: {
    type: String,
    sparse: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: false
  },
  firstName: {
    type: String,
    default: ''
  },
  avatarUrl: {
    type: String,
    default: ''
  },
  balanceNaira: {
    type: Number,
    default: 0
  },
  totalRides: {
    type: Number,
    default: 0
  },
  currentRabbitId: {
    type: mongoose.Schema.Types.Mixed,
    ref: 'Rabbit',
    default: null
  },
  currentBikeId: {
    type: mongoose.Schema.Types.Mixed,
    ref: 'Bicycle',
    default: null
  },
  ownedRabbits: [{
    type: mongoose.Schema.Types.Mixed,
    ref: 'Rabbit'
  }],
  ownedBikes: [{
    type: mongoose.Schema.Types.Mixed,
    ref: 'Bicycle'
  }],
  ownedGadgets: [{
    type: String
  }],
  hasPurchasedFarmItem: {
    type: Boolean,
    default: false
  },
  subscriptionTier: {
    type: String,
    enum: ['free', 'basic', 'growth', 'pro', 'elite'],
    default: 'free'
  },
  subscriptionExpiresAt: {
    type: Date,
    default: null
  },
  dailyRidesToday: {
    type: Number,
    default: 0
  },
  lastRideDate: {
    type: String,
    default: ''
  },
  referralCode: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    uppercase: true,
    index: true
  },
  referredBy: {
    type: mongoose.Schema.Types.Mixed,
    ref: 'User',
    default: null
  },
  referralsCount: {
    type: Number,
    default: 0
  },
  referralEarnings: {
    type: Number,
    default: 0
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
    index: true
  },
  isBanned: {
    type: Boolean,
    default: false
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date,
    default: null
  },
  lastSyncKey: {
    type: String,
    default: null
  },
  lastSeenAt: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },

  // Daily earning tracker (reset lazily at 00:00 WAT)
  dailyCoinsEarned:    { type: Number, default: 0 },
  dailyAdCoinsEarned:  { type: Number, default: 0 },
  dailyAdsWatched:     { type: Number, default: 0 },
  dailyEarningDate:    { type: String, default: '' },  // 'YYYY-MM-DD' WAT

  // Phone / device binding
  phoneNumber:         { type: String, sparse: true, index: true, default: null },
  deviceFingerprint:   { type: String, sparse: true, index: true, default: null },

  // Active Farm Shop packs (max 3)
  activePacks: [{
    packId:               { type: String },
    packName:             { type: String },
    purchasedAt:          { type: Date },
    expiresAt:            { type: Date },
    dailyCapNaira:        { type: Number },
    lifetimeMaxNaira:     { type: Number },
    lifetimeEarnedNaira:  { type: Number, default: 0 },
    boostPct:             { type: Number },
    playCoinsGranted:     { type: Number },
    squadRef:             { type: String },
    status:               { type: String, enum: ['active','expired'], default: 'active' }
  }],

  // Coin expiry
  coinsLastEarnedAt:    { type: Date, default: null },

  // 24-hour withdrawal cooldown after any pack purchase
  lastPackPurchasedAt:  { type: Date, default: null },

  // Withdrawable real-money balance (separate from play balance)
  withdrawableNaira:    { type: Number, default: 0 },
});

let MongooseUser;
try {
  MongooseUser = mongoose.model('User');
} catch {
  MongooseUser = mongoose.model('User', userSchema);
}

const wrapper = createModelWrapper('users', MongooseUser);

function UserModel(data) {
  if (mongoose.connection.readyState === 1) {
    return new MongooseUser(data);
  }
  return wrapper.new(data);
}

Object.assign(UserModel, wrapper);
UserModel.schema = userSchema;

module.exports = UserModel;
