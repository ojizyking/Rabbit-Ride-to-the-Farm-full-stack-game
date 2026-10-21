require('dotenv').config();
const { connectDB } = require('../config/db');
const User = require('../models/User');

async function makeAdmin() {
  const email = process.argv[2];

  if (!email) {
    console.log('====================================================');
    console.log('❌ Error: Please provide an email address.');
    console.log('Usage: node src/scripts/makeAdmin.js <email>');
    console.log('Example: node src/scripts/makeAdmin.js rider@rabbitride.com');
    console.log('====================================================');
    process.exit(1);
  }

  const cleanEmail = email.toLowerCase().trim();

  try {
    await connectDB();

    let user = await User.findOne({ email: cleanEmail });

    if (!user) {
      console.log(`⚠️ User with email "${cleanEmail}" not found in database.`);
      console.log(`Tip: Add ADMIN_EMAILS=${cleanEmail} to your .env or Railway environment variables so this email is granted admin automatically when registered.`);
      process.exit(0);
    }

    user.role = 'admin';
    user.isBanned = false;
    await user.save();

    console.log('====================================================');
    console.log(`✅ Success! Administrator role granted to: ${cleanEmail}`);
    console.log(`Role: ${user.role}`);
    console.log('You can now log in and access:');
    console.log('👉 http://localhost:5173/admin (or your deployed URL /admin)');
    console.log('====================================================');
    process.exit(0);
  } catch (err) {
    console.error('Failed to grant admin role:', err);
    process.exit(1);
  }
}

makeAdmin();
