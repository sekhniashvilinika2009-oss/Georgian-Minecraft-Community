const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

       const existing = await User.findOne({ $or: [{ username }, { email: email.toLowerCase() }] });
    if (existing) {
      return res.status(409).json({ error: 'Username or email is already taken' });
    }

    const sameIpAccount = await User.findOne({ registrationIp: req.ip });
    if (sameIpAccount) {
      return res.status(409).json({ error: 'Only one account is allowed per person' });
    }

       const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      email,
      passwordHash,
      registrationIp: req.ip,
    });
    // Logged to stdout, which Render captures in its Logs tab
    console.log(
      `[register] username="${username}" email="${email}" ip="${req.ip}" time="${new Date().toISOString()}"`
    );

    const token = signToken(user._id);
    res.status(201).json({ token, user: user.toPublicProfile() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await User.findOne({
      $or: [{ username }, { email: username.toLowerCase() }],
    });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

        const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    user.lastLoginIp = req.ip;
    await user.save();

    const token = signToken(user._id);
    res.json({ token, user: user.toPublicProfile() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;
