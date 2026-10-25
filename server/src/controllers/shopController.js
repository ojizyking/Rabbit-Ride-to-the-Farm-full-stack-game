const Rabbit = require('../models/Rabbit');
const Bicycle = require('../models/Bicycle');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

exports.getRabbits = async (req, res) => {
  try {
    const rabbits = await Rabbit.find().sort({ priceNaira: 1 });
    return res.json({ success: true, rabbits });
  } catch (err) {
    console.error('getRabbits error:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching rabbits.' });
  }
};

exports.getBicycles = async (req, res) => {
  try {
    const bicycles = await Bicycle.find().sort({ priceNaira: 1 });
    return res.json({ success: true, bicycles });
  } catch (err) {
    console.error('getBicycles error:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching bicycles.' });
  }
};

function getItemId(item) {
  if (!item) return '';
  if (typeof item === 'object') {
    return (item._id || item.id || '').toString();
  }
  return item.toString();
}

exports.buyOrEquip = async (req, res) => {
  try {
    const { itemType, itemId } = req.body;
    if (!itemType || !itemId) {
      return res.status(400).json({ success: false, message: 'Item type and itemId are required.' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (!Array.isArray(user.ownedRabbits)) user.ownedRabbits = [];
    if (!Array.isArray(user.ownedBikes)) user.ownedBikes = [];

    const targetId = itemId.toString();

    if (itemType === 'rabbit') {
      const rabbit = await Rabbit.findById(itemId);
      if (!rabbit) {
        return res.status(404).json({ success: false, message: 'Rabbit not found.' });
      }

      const isOwned = user.ownedRabbits.some(id => getItemId(id) === targetId) || rabbit.priceNaira === 0;

      if (isOwned) {
        // Equip
        user.currentRabbitId = rabbit._id;
        if (!user.ownedRabbits.some(id => getItemId(id) === targetId)) {
          user.ownedRabbits.push(rabbit._id);
        }
        await user.save();
        return res.json({
          success: true,
          action: 'equipped',
          message: `${rabbit.name} equipped successfully!`,
          currentRabbit: rabbit,
          balanceNaira: user.balanceNaira,
          ownedRabbits: user.ownedRabbits
        });
      }

      // Purchase
      if (user.balanceNaira < rabbit.priceNaira) {
        return res.status(400).json({
          success: false,
          message: `Insufficient balance! You need ₦${rabbit.priceNaira.toLocaleString()}, but have ₦${user.balanceNaira.toLocaleString()}. Ride and earn or deposit to buy!`
        });
      }

      user.balanceNaira = Math.round((user.balanceNaira - rabbit.priceNaira) * 100) / 100;
      if (!user.ownedRabbits.some(id => getItemId(id) === targetId)) {
        user.ownedRabbits.push(rabbit._id);
      }
      user.currentRabbitId = rabbit._id;
      await user.save();

      await Transaction.create({
        userId: user._id,
        type: 'shop',
        amount: -rabbit.priceNaira,
        description: `Purchased Rabbit: ${rabbit.name}`,
        status: 'completed'
      });

      return res.json({
        success: true,
        action: 'purchased',
        message: `Congratulations! You unlocked and equipped ${rabbit.name}!`,
        currentRabbit: rabbit,
        balanceNaira: user.balanceNaira,
        ownedRabbits: user.ownedRabbits
      });

    } else if (itemType === 'bicycle') {
      const bike = await Bicycle.findById(itemId);
      if (!bike) {
        return res.status(404).json({ success: false, message: 'Bicycle not found.' });
      }

      const isOwned = user.ownedBikes.some(id => getItemId(id) === targetId) || bike.priceNaira === 0;

      if (isOwned) {
        // Equip
        user.currentBikeId = bike._id;
        if (!user.ownedBikes.some(id => getItemId(id) === targetId)) {
          user.ownedBikes.push(bike._id);
        }
        await user.save();
        return res.json({
          success: true,
          action: 'equipped',
          message: `${bike.name} equipped successfully!`,
          currentBike: bike,
          balanceNaira: user.balanceNaira,
          ownedBikes: user.ownedBikes
        });
      }

      // Purchase
      if (user.balanceNaira < bike.priceNaira) {
        return res.status(400).json({
          success: false,
          message: `Insufficient balance! You need ₦${bike.priceNaira.toLocaleString()}, but have ₦${user.balanceNaira.toLocaleString()}. Ride and earn or deposit to buy!`
        });
      }

      user.balanceNaira = Math.round((user.balanceNaira - bike.priceNaira) * 100) / 100;
      if (!user.ownedBikes.some(id => getItemId(id) === targetId)) {
        user.ownedBikes.push(bike._id);
      }
      user.currentBikeId = bike._id;
      await user.save();

      await Transaction.create({
        userId: user._id,
        type: 'shop',
        amount: -bike.priceNaira,
        description: `Purchased Bicycle: ${bike.name}`,
        status: 'completed'
      });

      return res.json({
        success: true,
        action: 'purchased',
        message: `Congratulations! You unlocked and equipped ${bike.name}!`,
        currentBike: bike,
        balanceNaira: user.balanceNaira,
        ownedBikes: user.ownedBikes
      });
    }

    return res.status(400).json({ success: false, message: 'Invalid itemType. Must be rabbit or bicycle.' });
  } catch (err) {
    console.error('buyOrEquip error:', err);
    return res.status(500).json({ success: false, message: 'Server error processing purchase/equip.' });
  }
};
