const mongoose = require('mongoose');
const { createModelWrapper } = require('./modelAdapter');

const userSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.Mixed
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
  lastSeenAt: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
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
