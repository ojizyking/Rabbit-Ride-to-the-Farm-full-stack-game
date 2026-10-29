const mongoose = require('mongoose');
const { createModelWrapper } = require('./modelAdapter');

const rideSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.Mixed
  },
  userId: {
    type: mongoose.Schema.Types.Mixed,
    ref: 'User',
    required: true
  },
  coins: {
    type: Number,
    default: 0
  },
  stars: {
    type: Number,
    default: 0
  },
  carrots: {
    type: Number,
    default: 0
  },
  boxes: {
    type: Number,
    default: 0
  },
  adViews: {
    type: Number,
    default: 0
  },
  nairaEarned: {
    type: Number,
    default: 0
  },
  distanceKm: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

let MongooseRide;
try {
  MongooseRide = mongoose.model('Ride');
} catch {
  MongooseRide = mongoose.model('Ride', rideSchema);
}

const wrapper = createModelWrapper('rides', MongooseRide);

function RideModel(data) {
  if (mongoose.connection.readyState === 1) {
    return new MongooseRide(data);
  }
  return wrapper.new(data);
}

Object.assign(RideModel, wrapper);
RideModel.schema = rideSchema;

module.exports = RideModel;
