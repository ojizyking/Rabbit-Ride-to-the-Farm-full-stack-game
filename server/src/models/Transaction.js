const mongoose = require('mongoose');
const { createModelWrapper } = require('./modelAdapter');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.Mixed,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['earn', 'shop', 'subscription', 'withdrawal', 'referral', 'deposit', 'coin_purchase'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  reference: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['completed', 'pending', 'failed'],
    default: 'completed'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

let MongooseTx;
try {
  MongooseTx = mongoose.model('Transaction');
} catch {
  MongooseTx = mongoose.model('Transaction', transactionSchema);
}

const wrapper = createModelWrapper('transactions', MongooseTx);

function TransactionModel(data) {
  if (mongoose.connection.readyState === 1) {
    return new MongooseTx(data);
  }
  return wrapper.new(data);
}

Object.assign(TransactionModel, wrapper);
TransactionModel.schema = transactionSchema;

module.exports = TransactionModel;
