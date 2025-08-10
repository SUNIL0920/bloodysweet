import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, bloodType, role = 'donor', location, lastDonationDate } = req.body;

    if (!location || !Array.isArray(location.coordinates) || location.coordinates.length !== 2) {
      return res.status(400).json({ message: 'Location coordinates [lng, lat] are required' });
    }

    const existing = await User.findOne({ email }).lean();
    if (existing) return res.status(400).json({ message: 'Email already registered' });

    const user = new User({ name, email, password, bloodType, role, location, lastDonationDate });
    await user.save();

    const userSafe = { ...user.toObject(), password: undefined };
    const token = signToken(user);
    res.status(201).json({ token, user: userSafe });
  } catch (err) {
    res.status(500).json({ message: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const match = await user.comparePassword(password);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });

    const token = signToken(user);
    const userSafe = user.toObject();
    delete userSafe.password;
    res.json({ token, user: userSafe });
  } catch (err) {
    res.status(500).json({ message: 'Login failed' });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  res.json({ user: req.user });
});

export default router; 