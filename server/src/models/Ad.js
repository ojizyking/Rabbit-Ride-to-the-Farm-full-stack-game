const mongoose = require('mongoose');

const adSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  subtitle:    { type: String, default: '' },
  tag:         { type: String, default: 'SPONSOR' },
  slogan:      { type: String, default: '' },
  perk:        { type: String, default: '' },
  accentColor: { type: String, default: '#FF7A00' },
  bgColor:     { type: String, default: 'linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)' },
  icon:        { type: String, default: '🌾' },
  imageUrl:    { type: String, default: '' },
  linkUrl:     { type: String, default: '' },
  isActive:    { type: Boolean, default: true },
  order:       { type: Number, default: 0 },
  createdAt:   { type: Date, default: Date.now },
  updatedAt:   { type: Date, default: Date.now }
});

adSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Ad', adSchema);

