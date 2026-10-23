const mongoose = require('mongoose');
const memoryStore = require('../config/memoryStore');

function generateId() {
  // Use crypto-safe UUID when available, otherwise high-entropy fallback
  try {
    const crypto = require('crypto');
    return crypto.randomUUID();
  } catch {
    // Fallback: timestamp + 12 random alphanumeric chars for high entropy
    const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
    let rand = '';
    for (let i = 0; i < 12; i++) rand += chars.charAt(Math.floor(Math.random() * chars.length));
    return 'id_' + Date.now().toString(36) + '_' + rand;
  }
}

function generatePlayerId() {
  // Generates a unique player ID in format RR-XXXXXXXX (8 alphanumeric chars)
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let id = '';
  for (let i = 0; i < 8; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
  return 'RR-' + id;
}

function createModelWrapper(collectionName, mongooseModel) {
  class DocumentInstance {
    constructor(data) {
      Object.assign(this, data);
      if (!this._id) {
        this._id = generateId();
      }
      if (!this.createdAt) {
        this.createdAt = new Date();
      }
    }

    async save() {
      if (mongoose.connection.readyState === 1) {
        const doc = new mongooseModel(this);
        const saved = await doc.save();
        Object.assign(this, saved.toObject ? saved.toObject() : saved);
        return this;
      }

      if (!Array.isArray(memoryStore.data[collectionName])) {
        memoryStore.data[collectionName] = [];
      }
      const list = memoryStore.data[collectionName];
      const thisId = this._id ? this._id.toString() : '';
      const index = list.findIndex(item => item && item._id && item._id.toString() === thisId);
      if (index >= 0) {
        list[index] = { ...this };
      } else {
        list.push({ ...this });
      }
      memoryStore.save();
      return this;
    }
  }

  function wrapResult(item) {
    if (!item) return null;
    const inst = new DocumentInstance(item);
    return inst;
  }

  function matchesFilter(item, filter) {
    if (!filter || Object.keys(filter).length === 0) return true;
    if (!item) return false;
    for (const key of Object.keys(filter)) {
      if (key === '_id') {
        if (!item._id || item._id.toString() !== filter._id?.toString()) return false;
      } else if (key === '$or' && Array.isArray(filter.$or)) {
        const matched = filter.$or.some(subFilter => matchesFilter(item, subFilter));
        if (!matched) return false;
      } else if (key === 'referralCode') {
        const target = String(filter.referralCode || '').trim().toUpperCase();
        const val = item.referralCode ? String(item.referralCode).trim().toUpperCase() : '';
        if (val !== target) return false;
      } else if (key === 'email') {
        const target = String(filter.email || '').trim().toLowerCase();
        const val = item.email ? String(item.email).trim().toLowerCase() : '';
        if (val !== target) return false;
      } else if (typeof filter[key] === 'object' && filter[key] !== null) {
        if (item[key]?.toString() !== filter[key]?.toString()) return false;
      } else {
        if (item[key] !== filter[key]) return false;
      }
    }
    return true;
  }

  function populateItem(item, path) {
    if (!item) return;
    if (path === 'currentRabbitId' && item.currentRabbitId) {
      const rab = memoryStore.data.rabbits.find(r => r._id.toString() === (item.currentRabbitId._id || item.currentRabbitId).toString());
      if (rab) item.currentRabbitId = { ...rab };
    }
    if (path === 'currentBikeId' && item.currentBikeId) {
      const bike = memoryStore.data.bicycles.find(b => b._id.toString() === (item.currentBikeId._id || item.currentBikeId).toString());
      if (bike) item.currentBikeId = { ...bike };
    }
    if (path === 'ownedRabbits' && Array.isArray(item.ownedRabbits)) {
      item.ownedRabbits = item.ownedRabbits.map(id => {
        const rab = memoryStore.data.rabbits.find(r => r._id.toString() === (id._id || id).toString());
        return rab ? { ...rab } : id;
      });
    }
    if (path === 'ownedBikes' && Array.isArray(item.ownedBikes)) {
      item.ownedBikes = item.ownedBikes.map(id => {
        const bike = memoryStore.data.bicycles.find(b => b._id.toString() === (id._id || id).toString());
        return bike ? { ...bike } : id;
      });
    }
  }

  class QueryBuilder {
    constructor(promiseFn) {
      this.promiseFn = promiseFn;
      this.populates = [];
      this.sortObj = null;
      this.limitCount = null;
    }

    populate(path) {
      this.populates.push(path);
      return this;
    }

    sort(sortObj) {
      this.sortObj = sortObj;
      return this;
    }

    limit(n) {
      this.limitCount = n;
      return this;
    }

    async exec() {
      let result = await this.promiseFn();

      if (Array.isArray(result)) {
        if (this.sortObj) {
          const [field, dir] = Object.entries(this.sortObj)[0];
          result.sort((a, b) => {
            if (dir === -1) return (b[field] > a[field] ? 1 : -1);
            return (a[field] > b[field] ? 1 : -1);
          });
        }
        if (this.limitCount) {
          result = result.slice(0, this.limitCount);
        }
        result.forEach(item => {
          this.populates.forEach(p => populateItem(item, p));
        });
      } else if (result) {
        this.populates.forEach(p => populateItem(result, p));
      }

      return result;
    }

    then(resolve, reject) {
      return this.exec().then(resolve, reject);
    }

    catch(reject) {
      return this.exec().catch(reject);
    }
  }

  return {
    // Constructor for `new User(...)`
    new: (data) => new DocumentInstance(data),

    find: (filter = {}) => {
      if (mongoose.connection.readyState === 1) {
        return mongooseModel.find(filter);
      }
      return new QueryBuilder(async () => {
        const list = memoryStore.data[collectionName] || [];
        return list.filter(item => matchesFilter(item, filter)).map(wrapResult);
      });
    },

    findById: (id) => {
      if (mongoose.connection.readyState === 1) {
        return mongooseModel.findById(id);
      }
      return new QueryBuilder(async () => {
        const list = memoryStore.data[collectionName] || [];
        const item = list.find(it => it._id.toString() === id?.toString());
        return wrapResult(item);
      });
    },

    findOne: (filter = {}) => {
      if (mongoose.connection.readyState === 1) {
        return mongooseModel.findOne(filter);
      }
      return new QueryBuilder(async () => {
        const list = memoryStore.data[collectionName] || [];
        const item = list.find(it => matchesFilter(it, filter));
        return wrapResult(item);
      });
    },

    create: async (data) => {
      if (mongoose.connection.readyState === 1) {
        return mongooseModel.create(data);
      }
      if (Array.isArray(data)) {
        const docs = data.map(d => new DocumentInstance(d));
        for (const doc of docs) {
          await doc.save();
        }
        return docs;
      }
      const doc = new DocumentInstance(data);
      await doc.save();
      return doc;
    },

    countDocuments: async (filter = {}) => {
      if (mongoose.connection.readyState === 1) {
        return mongooseModel.countDocuments(filter);
      }
      const list = memoryStore.data[collectionName] || [];
      return list.filter(item => matchesFilter(item, filter)).length;
    },

    findOneAndUpdate: async (filter = {}, update = {}, options = {}) => {
      if (mongoose.connection.readyState === 1) {
        return mongooseModel.findOneAndUpdate(filter, update, { new: true, ...options });
      }
      const list = memoryStore.data[collectionName] || [];
      const index = list.findIndex(item => matchesFilter(item, filter));
      if (index < 0) return null;
      const updateFields = update.$set || update;
      Object.assign(list[index], updateFields);
      memoryStore.save();
      return wrapResult(list[index]);
    },

    findByIdAndUpdate: async (id, update = {}, options = {}) => {
      if (mongoose.connection.readyState === 1) {
        return mongooseModel.findByIdAndUpdate(id, update, { new: true, ...options });
      }
      const list = memoryStore.data[collectionName] || [];
      const index = list.findIndex(item => item._id?.toString() === id?.toString());
      if (index < 0) return null;
      const updateFields = update.$set || update;
      Object.assign(list[index], updateFields);
      memoryStore.save();
      return wrapResult(list[index]);
    },

    updateOne: async (filter = {}, update = {}) => {
      if (mongoose.connection.readyState === 1) {
        return mongooseModel.updateOne(filter, update);
      }
      const list = memoryStore.data[collectionName] || [];
      const index = list.findIndex(item => matchesFilter(item, filter));
      if (index < 0) return { matchedCount: 0, modifiedCount: 0 };
      const updateFields = update.$set || update;
      Object.assign(list[index], updateFields);
      memoryStore.save();
      return { matchedCount: 1, modifiedCount: 1 };
    },

    deleteOne: async (filter = {}) => {
      if (mongoose.connection.readyState === 1) {
        return mongooseModel.deleteOne(filter);
      }
      const list = memoryStore.data[collectionName] || [];
      const index = list.findIndex(item => matchesFilter(item, filter));
      if (index < 0) return { deletedCount: 0 };
      list.splice(index, 1);
      memoryStore.save();
      return { deletedCount: 1 };
    },

    deleteMany: async (filter = {}) => {
      if (mongoose.connection.readyState === 1) {
        return mongooseModel.deleteMany(filter);
      }
      const list = memoryStore.data[collectionName] || [];
      const before = list.length;
      memoryStore.data[collectionName] = list.filter(item => !matchesFilter(item, filter));
      const deleted = before - memoryStore.data[collectionName].length;
      memoryStore.save();
      return { deletedCount: deleted };
    }
  };
}

module.exports = { createModelWrapper, generateId, generatePlayerId };
