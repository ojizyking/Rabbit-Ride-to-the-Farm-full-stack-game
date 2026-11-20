const mongoose = require('mongoose');
const { createModelWrapper } = require('./modelAdapter');

const farmPackSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.Mixed, default: () => new mongoose.Types.ObjectId() },
  packId:            { type: String, unique: true, required: true },
  name:              { type: String, required: true },
  priceNaira:        { type: Number, required: true },
  playCoinsGranted:  { type: Number, required: true },
  boostPct:          { type: Number, required: true },
  durationDays:      { type: Number, required: true },
  dailyCapNaira:     { type: Number, required: true },
  lifetimeMaxNaira:  { type: Number, required: true },
  isActive:          { type: Boolean, default: true },
  createdAt:         { type: Date, default: Date.now }
});

// SEED DATA — insert once into MongoDB (call this from server startup or a script)
farmPackSchema.statics.seedPacks = async function() {
  const packs = [
    { packId: 'small_feed',    name: 'Small Feed',     priceNaira: 500,   playCoinsGranted: 60000,   boostPct: 10, durationDays: 7,  dailyCapNaira: 5,   lifetimeMaxNaira: 35  },
    { packId: 'rabbit_shoe',   name: 'Rabbit Shoe',    priceNaira: 1000,  playCoinsGranted: 130000,  boostPct: 15, durationDays: 7,  dailyCapNaira: 12,  lifetimeMaxNaira: 84  },
    { packId: 'rabbit_jacket', name: 'Rabbit Jacket',  priceNaira: 2500,  playCoinsGranted: 350000,  boostPct: 20, durationDays: 7,  dailyCapNaira: 30,  lifetimeMaxNaira: 210 },
    { packId: 'golden_carrot', name: 'Golden Carrot',  priceNaira: 5000,  playCoinsGranted: 750000,  boostPct: 25, durationDays: 14, dailyCapNaira: 60,  lifetimeMaxNaira: 420 },
    { packId: 'farm_king',     name: 'Farm King',      priceNaira: 10000, playCoinsGranted: 1600000, boostPct: 30, durationDays: 14, dailyCapNaira: 120, lifetimeMaxNaira: 840 },
  ];
  for (const pack of packs) {
    await this.findOneAndUpdate({ packId: pack.packId }, pack, { upsert: true, new: true });
  }
};

let MongooseFarmPack;
try { MongooseFarmPack = mongoose.model('FarmPack'); }
catch { MongooseFarmPack = mongoose.model('FarmPack', farmPackSchema); }

const wrapper = createModelWrapper('farmpacks', MongooseFarmPack);
function FarmPackModel(data) {
  if (mongoose.connection.readyState === 1) return new MongooseFarmPack(data);
  return wrapper.new(data);
}
Object.assign(FarmPackModel, wrapper);
FarmPackModel.schema = farmPackSchema;
module.exports = FarmPackModel;
