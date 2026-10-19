const mongoose = require('mongoose');
const { createModelWrapper } = require('./modelAdapter');

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.Mixed,
    ref: 'User',
    required: true
  },
  tier: {
    type: String,
    enum: ['basic', 'growth', 'pro', 'elite'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  paystackRef: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'expired', 'failed'],
    default: 'pending'
  },
  startsAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

let MongooseSub;
try {
  MongooseSub = mongoose.model('Subscription');
} catch {
  MongooseSub = mongoose.model('Subscription', subscriptionSchema);
}

const wrapper = createModelWrapper('subscriptions', MongooseSub);

function SubscriptionModel(data) {
  if (mongoose.connection.readyState === 1) {
    return new MongooseSub(data);
  }
  return wrapper.new(data);
}

Object.assign(SubscriptionModel, wrapper);
SubscriptionModel.schema = subscriptionSchema;

module.exports = SubscriptionModel;
