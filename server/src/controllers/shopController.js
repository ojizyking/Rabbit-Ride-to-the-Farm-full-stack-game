const Rabbit = require('../models/Rabbit');
const Bicycle = require('../models/Bicycle');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

const FARM_GADGETS = {
  gadget_magnet: {
    _id: 'gadget_magnet',
    name: 'Super Carrot Magnet 🧲',
    priceNaira: 500,
    imageUrl: '/assets/items/gadget_magnet.svg',
    description: 'Permanent upgrade: +50% suction reach & extends magnet frenzy to 15 seconds!'
  },
  gadget_shield: {
    _id: 'gadget_shield',
    name: 'Golden Energy Shield 🛡️',
    priceNaira: 800,
    imageUrl: '/assets/items/gadget_shield.svg',
    description: 'Permanent upgrade: Start every ride equipped with a protective bubble shield!'
  },
  gadget_heart: {
    _id: 'gadget_heart',
    name: 'Extra Heart Bandage ❤️',
    priceNaira: 1500,
    imageUrl: '/assets/items/gadget_heart.svg',
    description: 'Permanent upgrade: Start every ride with 4 Hearts/Lives instead of 3!'
  },
  gadget_harvester: {
    _id: 'gadget_harvester',
    name: 'Golden Double Harvester 🌾',
    priceNaira: 2500,
    imageUrl: '/assets/items/gadget_harvester.svg',
    description: 'Permanent upgrade: 15% chance for every collected carrot to award 2× Coins!'
  }
};

exports.getGadgets = async (req, res) => {
  return res.json({ success: true, gadgets: Object.values(FARM_GADGETS) });
};

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

      // $atomic rabbit purchase — race-condition safe balance deduction
      const rabbitUpdated = await User.findOneAndUpdate(
        { _id: user._id, balanceNaira: { $gte: rabbit.priceNaira } },
        {
          $inc: { balanceNaira: -rabbit.priceNaira },
          $addToSet: { ownedRabbits: rabbit._id },
          $set: { currentRabbitId: rabbit._id, hasPurchasedFarmItem: true }
        },
        { new: true }
      );
      if (!rabbitUpdated) {
        return res.status(400).json({ success: false, message: 'Insufficient balance or concurrent purchase detected. Please try again.' });
      }
      user.balanceNaira = rabbitUpdated.balanceNaira;
      user.ownedRabbits = rabbitUpdated.ownedRabbits;

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

      // $atomic bicycle purchase — race-condition safe balance deduction
      const bikeUpdated = await User.findOneAndUpdate(
        { _id: user._id, balanceNaira: { $gte: bike.priceNaira } },
        {
          $inc: { balanceNaira: -bike.priceNaira },
          $addToSet: { ownedBikes: bike._id },
          $set: { currentBikeId: bike._id, hasPurchasedFarmItem: true }
        },
        { new: true }
      );
      if (!bikeUpdated) {
        return res.status(400).json({ success: false, message: 'Insufficient balance or concurrent purchase detected. Please try again.' });
      }
      user.balanceNaira = bikeUpdated.balanceNaira;
      user.ownedBikes = bikeUpdated.ownedBikes;

      await Transaction.create({
        userId: user._id,
        type: 'shop',
        amount: -bike.priceNaira,
        description: `Purchased Vehicle: ${bike.name}`,
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

    } else if (itemType === 'gadget') {
      const gadget = FARM_GADGETS[itemId];
      if (!gadget) {
        return res.status(404).json({ success: false, message: 'Farm gadget not found.' });
      }

      if (!Array.isArray(user.ownedGadgets)) user.ownedGadgets = [];
      if (user.ownedGadgets.includes(gadget._id)) {
        return res.json({
          success: true,
          action: 'already_owned',
          message: `You already own ${gadget.name}! It is permanently active on your rides.`,
          balanceNaira: user.balanceNaira,
          ownedGadgets: user.ownedGadgets
        });
      }

      if (user.balanceNaira < gadget.priceNaira) {
        return res.status(400).json({
          success: false,
          message: `Insufficient balance! You need ₦${gadget.priceNaira.toLocaleString()}, but have ₦${user.balanceNaira.toLocaleString()}.`
        });
      }

      // $atomic gadget purchase — race-condition safe balance deduction
      const gadgetUpdated = await User.findOneAndUpdate(
        { _id: user._id, balanceNaira: { $gte: gadget.priceNaira } },
        {
          $inc: { balanceNaira: -gadget.priceNaira },
          $addToSet: { ownedGadgets: gadget._id },
          $set: { hasPurchasedFarmItem: true }
        },
        { new: true }
      );
      if (!gadgetUpdated) {
        return res.status(400).json({ success: false, message: 'Insufficient balance or concurrent purchase detected. Please try again.' });
      }
      user.balanceNaira = gadgetUpdated.balanceNaira;
      user.ownedGadgets = gadgetUpdated.ownedGadgets;

      await Transaction.create({
        userId: user._id,
        type: 'shop',
        amount: -gadget.priceNaira,
        description: `Purchased Gadget: ${gadget.name}`,
        status: 'completed'
      });

      return res.json({
        success: true,
        action: 'purchased',
        message: `Awesome! You permanently unlocked ${gadget.name}!`,
        balanceNaira: user.balanceNaira,
        ownedGadgets: user.ownedGadgets
      });
    }

    return res.status(400).json({ success: false, message: 'Invalid itemType. Must be rabbit, bicycle, or gadget.' });
  } catch (err) {
    console.error('buyOrEquip error:', err);
    return res.status(500).json({ success: false, message: 'Server error processing purchase/equip.' });
  }
};

/**
 * Open interactive Lucky Mystery Box
 * POST /api/shop/mystery-box
 * Body: { boxType: 'wood' | 'gold' }
 */
exports.openMysteryBox = async (req, res) => {
  try {
    const { boxType = 'wood' } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const priceNaira = boxType === 'gold' ? 500 : 100;
    const boxName = boxType === 'gold' ? 'Golden Barn Vault 🏆' : 'Wooden Farm Mystery Box 📦';

    if (user.balanceNaira < priceNaira) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance! You need ₦${priceNaira} to open ${boxName}, but have ₦${user.balanceNaira}.`
      });
    }

    // Deduct entry price (atomic) — $atomic mystery box
    const boxDeducted = await User.findOneAndUpdate(
      { _id: user._id, balanceNaira: { $gte: priceNaira } },
      { $inc: { balanceNaira: -priceNaira } },
      { new: true }
    );
    if (!boxDeducted) {
      return res.status(400).json({ success: false, message: 'Insufficient balance or concurrent request detected. Please try again.' });
    }
    user.balanceNaira = boxDeducted.balanceNaira;

    // Roll random prize (100 coins = ₦1)
    const roll = Math.random();
    let coinsWon = 12000;
    let tier = 'Nice Win!';

    if (boxType === 'gold') {
      // Golden Barn Vault: ₦500 (50k coins equivalent)
      if (roll < 0.05) {
        coinsWon = 500000; // ₦5,000 (10x Diamond Jackpot!)
        tier = '💎 DIAMOND MEGA JACKPOT (10×)!';
      } else if (roll < 0.20) {
        coinsWon = 250000; // ₦2,500 (5x Huge Win!)
        tier = '🌟 GOLDEN ULTRA WIN (5×)!';
      } else if (roll < 0.55) {
        coinsWon = 100000; // ₦1,000 (2x Double Win!)
        tier = '✨ DOUBLE HARVEST (2×)!';
      } else {
        coinsWon = 55000; // ₦550 (+10% Bonus return)
        tier = '🥕 Great Harvest (+10% Bonus)!';
      }
    } else {
      // Wooden Mystery Box: ₦100 (10k coins equivalent)
      if (roll < 0.05) {
        coinsWon = 50000; // ₦500 (5x Jackpot!)
        tier = '🌟 GOLDEN CARROT JACKPOT (5×)!';
      } else if (roll < 0.30) {
        coinsWon = 25000; // ₦250 (2.5x Win!)
        tier = '✨ SUPER HARVEST (2.5×)!';
      } else if (roll < 0.75) {
        coinsWon = 12000; // ₦120 (+20% Bonus return)
        tier = '🥕 Sweet Carrot Bundle (+20%)!';
      } else {
        coinsWon = 5000; // ₦50 (Consolation)
        tier = '🌱 Friendly Bunny Consolation!';
      }
    }

    const nairaWon = Math.round((coinsWon / 100) * 100) / 100;
    // Credit winnings atomically
    const boxCredited = await User.findByIdAndUpdate(
      user._id,
      { $inc: { balanceNaira: nairaWon }, $set: { hasPurchasedFarmItem: true } },
      { new: true }
    );
    if (boxCredited) user.balanceNaira = boxCredited.balanceNaira;

    await Transaction.create({
      userId: user._id,
      type: 'shop',
      amount: Math.round((nairaWon - priceNaira) * 100) / 100,
      description: `Opened ${boxName}: Won ${coinsWon.toLocaleString()} Coins (₦${nairaWon})`,
      status: 'completed'
    });

    return res.json({
      success: true,
      boxType,
      boxName,
      coinsWon,
      nairaWon,
      tier,
      newBalance: user.balanceNaira,
      message: `🎉 ${tier} You unboxed +${coinsWon.toLocaleString()} Carrot Coins (₦${nairaWon.toLocaleString()})!`
    });
  } catch (err) {
    console.error('openMysteryBox error:', err);
    return res.status(500).json({ success: false, message: 'Server error opening mystery box.' });
  }
};
