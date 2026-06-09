const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  role: { 
    type: String, 
    required: true,
    enum: ['user', 'attendee', 'organization'], // Yahan 'attendee' add kar diya
    default: 'attendee' // Default ko bhi 'attendee' kar diya hai
  },
  organizationName: { 
    type: String,
    default: '' 
  },
  orgRole: { 
    type: String,
    default: '' 
  }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);