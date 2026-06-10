const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Create the Express App
const app = express();

// --- MODIFIED: Middleware (Allows your phone, laptop, and production app to talk to this backend) ---
app.use(cors({
  origin: [
    'http://localhost:5173',                               // Allows your laptop local dev
    'http://192.168.29.84:5173',                           // Allows your phone local dev
    'https://lumina-event-management-b7u5.vercel.app'      // Allows your deployed Vercel frontend
  ],
  credentials: true,
}));
app.use(express.json());

// Import and use the Routes
const eventRoutes = require('./routes/events');
app.use('/api/events', eventRoutes);
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Successfully connected to MongoDB!'))
  .catch((err) => console.log('❌ MongoDB connection error:', err));

// A simple test route
app.get('/', (req, res) => {
  res.send('Event Management Backend is running!');
});

// --- MODIFIED: Start the server (Added '0.0.0.0' to listen to the network) ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📡 Network access enabled for phone on http://192.168.29.84:${PORT}`);
});

const Event = require('./models/Event');