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
    enum: ['user', 'organization'], // Assuming these are your two main roles
    default: 'user'
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