require('dotenv').config();
const mongoose = require('mongoose');

// Import your models
const Event = require('./models/Event');
const Booking = require('./models/Booking');
const { User } = require('./models/User'); // Destructured because of how User.js exports it

async function clearDatabase() {
  try {
    console.log('⏳ Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to database!');

    console.log('🗑️  Deleting all events...');
    await Event.deleteMany({});

    console.log('🗑️  Deleting all bookings...');
    await Booking.deleteMany({});

    console.log('🗑️  Deleting all users, admins, and organizations...');
    await User.deleteMany({});

    console.log('✨ Success! Database is completely empty.');
  } catch (error) {
    console.error('❌ Error clearing database:', error);
  } finally {
    // Disconnect so the terminal script finishes and closes gracefully
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.');
    process.exit(0);
  }
}

clearDatabase();