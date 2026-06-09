const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const router = express.Router();
const saltRounds = 10;

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name, role, organizationName, orgRole } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      organizationName: role === 'organization' ? organizationName : '',
      orgRole: role === 'organization' ? (orgRole || 'super-admin') : '',
    });

    const savedUser = await user.save();
    const userResponse = savedUser.toObject();
    delete userResponse.password;

    res.status(201).json(userResponse);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    const userResponse = user.toObject();
    delete userResponse.password;
    res.status(200).json(userResponse);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/auth/organizations
router.get('/organizations', async (req, res) => {
  try {
    const organizations = await User.find({ role: 'organization' });
    res.status(200).json(organizations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;