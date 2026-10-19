const mongoose = require('mongoose');
const { createModelWrapper } = require('./modelAdapter');

const rabbitSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  priceNaira: {
    type: Number,
    required: true
  },
  speed: {
    type: Number,
    default: 10
  },
  jump: {
    type: Number,
    default: 10
  },
  stamina: {
    type: Number,
    default: 10
  },
  grip: {
    type: Number,
    default: 10
  },
  drift: {
    type: Number,
    default: 10
  },
  imageUrl: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  }
});

let MongooseRabbit;
try {
  MongooseRabbit = mongoose.model('Rabbit');
} catch {
  MongooseRabbit = mongoose.model('Rabbit', rabbitSchema);
}

const wrapper = createModelWrapper('rabbits', MongooseRabbit);

function RabbitModel(data) {
  if (mongoose.connection.readyState === 1) {
    return new MongooseRabbit(data);
  }
  return wrapper.new(data);
}

Object.assign(RabbitModel, wrapper);
RabbitModel.schema = rabbitSchema;

module.exports = RabbitModel;
