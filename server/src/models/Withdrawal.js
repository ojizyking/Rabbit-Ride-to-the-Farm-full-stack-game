const mongoose = require('mongoose');
const { createModelWrapper } = require('./modelAdapter');

const withdrawalSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.Mixed
  },
  userId: {
    type: mongoose.Schema.Types.Mixed,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  accountNumber: {
    type: String,
    required: true
  },
  bankCode: {
    type: String,
    required: true
  },
  bankName: {
    type: String,
    default: ''
  },
  accountName: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending'
  },
  paystackRef: {
    type: String,
    default: ''
  },
  transferCode: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

let MongooseWithdrawal;
try {
  MongooseWithdrawal = mongoose.model('Withdrawal');
} catch {
  MongooseWithdrawal = mongoose.model('Withdrawal', withdrawalSchema);
}

const wrapper = createModelWrapper('withdrawals', MongooseWithdrawal);

function WithdrawalModel(data) {
  if (mongoose.connection.readyState === 1) {
    return new MongooseWithdrawal(data);
  }
  return wrapper.new(data);
}

Object.assign(WithdrawalModel, wrapper);
WithdrawalModel.schema = withdrawalSchema;

module.exports = WithdrawalModel;
