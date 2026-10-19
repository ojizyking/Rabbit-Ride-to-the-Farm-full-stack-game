const mongoose = require('mongoose');
const memoryStore = require('../config/memoryStore');

function generateId() {
  return 'id_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
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

      const list = memoryStore.data[collectionName];
      const index = list.findIndex(item => item._id.toString() === this._id.toString());
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
    for (const key of Object.keys(filter)) {
      if (key === '_id') {
        if (item._id?.toString() !== filter._id?.toString()) return false;
      } else if (typeof filter[key] === 'object' && filter[key] !== null) {
        // Simple equality check
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
    }
  };
}

module.exports = { createModelWrapper, generateId };
