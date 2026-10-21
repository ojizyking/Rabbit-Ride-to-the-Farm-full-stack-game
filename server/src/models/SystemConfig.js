const mongoose = require('mongoose');
const { createModelWrapper } = require('./modelAdapter');

const systemConfigSchema = new mongoose.Schema({
  key: {
    type: String,
    unique: true,
    required: true,
    index: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  updatedBy: {
    type: String,
    default: 'admin'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

let MongooseConfig;
try {
  MongooseConfig = mongoose.model('SystemConfig');
} catch {
  MongooseConfig = mongoose.model('SystemConfig', systemConfigSchema);
}

const wrapper = createModelWrapper('systemConfigs', MongooseConfig);

function SystemConfigModel(data) {
  if (mongoose.connection.readyState === 1) {
    return new MongooseConfig(data);
  }
  return wrapper.new(data);
}

Object.assign(SystemConfigModel, wrapper);
SystemConfigModel.schema = systemConfigSchema;

module.exports = SystemConfigModel;
