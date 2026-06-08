const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Create the Express App
const app = express();

// Middleware (Allows your frontend to talk to this backend)
app.use(cors());
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

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
const Event = require('./models/Event');
