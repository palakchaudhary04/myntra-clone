const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const router  = express.Router();

// ── POST /user/signup ──────────────────────────────────────────────────────
router.post('/signup', async (req, res) => {
  const { fullName, email, password } = req.body;
  if (!fullName || !email || !password)
    return res.status(400).json({ message: 'fullName, email and password are required' });
  if (password.length < 6)
    return res.status(400).json({ message: 'Password must be at least 6 characters' });

  try {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ message: 'User already exists' });

    const hashedpassword = await bcrypt.hash(password, 10);
    const user = await User.create({ fullName, email: email.toLowerCase(), password: hashedpassword });

    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...userData } = user.toObject();
    res.status(201).json({ user: userData, token });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

// ── POST /user/login ───────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: 'Email and password are required' });

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid password' });

    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...userData } = user.toObject();
    res.status(200).json({ user: userData, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

module.exports = router;