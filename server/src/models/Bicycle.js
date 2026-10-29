const mongoose = require('mongoose');
const { createModelWrapper } = require('./modelAdapter');

const bicycleSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.Mixed
  },
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
  stability: {
    type: Number,
    default: 10
  },
  boost: {
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

let MongooseBicycle;
try {
  MongooseBicycle = mongoose.model('Bicycle');
} catch {
  MongooseBicycle = mongoose.model('Bicycle', bicycleSchema);
}

const wrapper = createModelWrapper('bicycles', MongooseBicycle);

function BicycleModel(data) {
  if (mongoose.connection.readyState === 1) {
    return new MongooseBicycle(data);
  }
  return wrapper.new(data);
}

Object.assign(BicycleModel, wrapper);
BicycleModel.schema = bicycleSchema;

module.exports = BicycleModel;
