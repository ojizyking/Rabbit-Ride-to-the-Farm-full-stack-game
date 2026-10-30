/**
 * fix-admin.js
 * One-time script: sets a password on the etizzer@gmail.com admin account
 * and clears the fake test clerkId so real Clerk login can re-link.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ADMIN_EMAIL = 'etizzer@gmail.com';
const NEW_PASSWORD = 'Admin@Rabbit2026!';

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB Atlas');

  const User = require('../models/User');
  const admin = await User.findOne({ email: ADMIN_EMAIL });

  if (!admin) {
    console.error('Admin account not found for:', ADMIN_EMAIL);
    process.exit(1);
  }

  const hash = await bcrypt.hash(NEW_PASSWORD, 10);
  admin.password = hash;
  admin.clerkId = null; // clear fake "user_test_clerk_123" so real Clerk sync re-links
  admin.role = 'admin';
  await admin.save();

  console.log('Admin account fixed!');
  console.log('Email:', admin.email);
  console.log('Role:', admin.role);
  console.log('Password set: Admin@Rabbit2026!');
  console.log('ClerkId cleared (will re-link on next Clerk login)');
  await mongoose.disconnect();
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
