const mongoose = require('mongoose');
const { createModelWrapper } = require('./modelAdapter');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
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
