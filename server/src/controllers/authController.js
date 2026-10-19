const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Rabbit = require('../models/Rabbit');
const Bicycle = require('../models/Bicycle');

const JWT_SECRET = process.env.JWT_SECRET || 'rabbit_super_secret_jwt_key_2026_farm_ride';

function generateToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

exports.register = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Find default starter rabbit and bike
    const defaultRabbit = await Rabbit.findOne({ priceNaira: 0 });
    const defaultBike = await Bicycle.findOne({ priceNaira: 0 });

    const newUser = new User({
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      balanceNaira: 50, // Welcome bonus!
      totalRides: 0,
      currentRabbitId: defaultRabbit ? defaultRabbit._id : null,
      currentBikeId: defaultBike ? defaultBike._id : null,
      ownedRabbits: defaultRabbit ? [defaultRabbit._id] : [],
      ownedBikes: defaultBike ? [defaultBike._id] : [],
      subscriptionTier: 'free'
    });

    await newUser.save();

    const populatedUser = await User.findById(newUser._id)
      .populate('currentRabbitId')
      .populate('currentBikeId')
      .populate('ownedRabbits')
      .populate('ownedBikes');

    const token = generateToken(newUser);

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully!',
      token,
      user: {
        id: populatedUser._id,
        email: populatedUser.email,
        balanceNaira: populatedUser.balanceNaira,
        totalRides: populatedUser.totalRides,
        subscriptionTier: populatedUser.subscriptionTier,
        subscriptionExpiresAt: populatedUser.subscriptionExpiresAt,
        currentRabbit: populatedUser.currentRabbitId,
        currentBike: populatedUser.currentBikeId,
        ownedRabbits: populatedUser.ownedRabbits,
        ownedBikes: populatedUser.ownedBikes
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const populatedUser = await User.findById(user._id)
      .populate('currentRabbitId')
      .populate('currentBikeId')
      .populate('ownedRabbits')
      .populate('ownedBikes');

    const token = generateToken(user);

    return res.json({
      success: true,
      message: 'Login successful!',
      token,
      user: {
        id: populatedUser._id,
        email: populatedUser.email,
        balanceNaira: populatedUser.balanceNaira,
        totalRides: populatedUser.totalRides,
        subscriptionTier: populatedUser.subscriptionTier,
        subscriptionExpiresAt: populatedUser.subscriptionExpiresAt,
        currentRabbit: populatedUser.currentRabbitId,
        currentBike: populatedUser.currentBikeId,
        ownedRabbits: populatedUser.ownedRabbits,
        ownedBikes: populatedUser.ownedBikes
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Server error during login.' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('currentRabbitId')
      .populate('currentBikeId')
      .populate('ownedRabbits')
      .populate('ownedBikes');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        balanceNaira: user.balanceNaira,
        totalRides: user.totalRides,
        subscriptionTier: user.subscriptionTier,
        subscriptionExpiresAt: user.subscriptionExpiresAt,
        dailyRidesToday: user.dailyRidesToday,
        currentRabbit: user.currentRabbitId,
        currentBike: user.currentBikeId,
        ownedRabbits: user.ownedRabbits,
        ownedBikes: user.ownedBikes
      }
    });
  } catch (err) {
    console.error('getMe error:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching user profile.' });
  }
};
