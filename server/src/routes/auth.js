import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import { sendEmail } from '../services/mailer.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here-change-in-production';

function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
}

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, bloodType, role = 'donor', location, lastDonationDate, age, phone, whatsappOptIn, gender, medicalConditions } = req.body;

    if (!location || !Array.isArray(location.coordinates) || location.coordinates.length !== 2) {
      return res.status(400).json({ message: 'Location coordinates [lng, lat] are required' });
    }
    // Coerce coordinate strings to numbers
    const lng = Number(location.coordinates[0])
    const lat = Number(location.coordinates[1])
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
      return res.status(400).json({ message: 'Location coordinates must be numbers [lng, lat]' })
    }
    const cleanLocation = { type: 'Point', coordinates: [lng, lat] }

    const existing = await User.findOne({ email }).lean();
    if (existing) return res.status(400).json({ message: 'Email already registered' });

    // Sanitize optional fields
    const isHospital = (role === 'hospital')
    const cleanGender = (!isHospital && typeof gender === 'string' && ['male','female','other'].includes(gender.toLowerCase()))
      ? gender.toLowerCase()
      : undefined
    let cleanAge = undefined
    if (!isHospital) {
      if (age !== undefined && age !== null && String(age).trim() !== '') {
        const parsedAge = Number(age)
        cleanAge = Number.isFinite(parsedAge) ? parsedAge : undefined
      }
    }

    const user = new User({
      name,
      email,
      password,
      bloodType,
      role,
      location: cleanLocation,
      lastDonationDate,
      age: cleanAge,
      phone,
      whatsappOptIn: Boolean(whatsappOptIn),
      gender: cleanGender,
      medicalConditions
    });
    await user.save();

    const userSafe = { ...user.toObject(), password: undefined };
    const token = signToken(user);
    res.status(201).json({ token, user: userSafe });
  } catch (err) {
    try { console.error('Register error:', err) } catch {}
    if (err?.name === 'ValidationError') {
      const first = Object.values(err.errors || {})[0]
      return res.status(400).json({ message: first?.message || 'Invalid data' })
    }
    if (err?.name === 'CastError') {
      return res.status(400).json({ message: `Invalid ${err?.path || 'value'}` })
    }
    if (err?.code === 11000) {
      return res.status(400).json({ message: 'Email already registered' })
    }
    res.status(500).json({ message: 'Registration failed', error: err?.message || 'unknown' });
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

// Profile update endpoint
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { name, email, age, phone, bloodType, whatsappOptIn, location, gender, medicalConditions } = req.body;
    
    // Check if email is being changed and if it's already taken
    if (email && email !== req.user.email) {
      const existing = await User.findOne({ email, _id: { $ne: req.user._id } });
      if (existing) {
        return res.status(400).json({ message: 'Email already in use' });
      }
    }

    // Update user fields
    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (email !== undefined) updateFields.email = email;
    if (age !== undefined) updateFields.age = age;
    if (phone !== undefined) updateFields.phone = phone;
    if (bloodType !== undefined) updateFields.bloodType = bloodType;
    if (whatsappOptIn !== undefined) updateFields.whatsappOptIn = Boolean(whatsappOptIn);
    if (gender !== undefined) {
      const g = (typeof gender === 'string') ? gender.trim().toLowerCase() : gender
      if (g === '' || !['male','female','other'].includes(g)) {
        // ignore invalid/empty gender
      } else {
        updateFields.gender = g
      }
    }
    if (medicalConditions !== undefined) updateFields.medicalConditions = medicalConditions;
    if (location !== undefined) updateFields.location = location;

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updateFields,
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userSafe = updatedUser.toObject();
    delete userSafe.password;
    
    res.json({ user: userSafe });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ message: 'Profile update failed' });
  }
});

// Forgot password endpoint
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if email exists or not for security
      return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    // Save reset token to user
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();

    // Build reset URL
    const appUrl = (process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '')
    const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(resetToken)}`

    // Send reset email (uses SMTP if configured, else Ethereal preview in logs)
    try {
      const subject = 'Reset your Blood Alert password'
      const text = `You requested a password reset. Use this link to set a new password: ${resetUrl} (valid for 1 hour). If you did not request this, you can ignore this email.`
      const html = `<div style="font-family:Inter,Arial,Helvetica,sans-serif;padding:16px">
        <h2>Reset your password</h2>
        <p>Click the button below to set a new password. This link is valid for 1 hour.</p>
        <p style="margin:16px 0"><a href="${resetUrl}" style="background:#ef4444;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Reset Password</a></p>
        <p>Or copy and paste this URL into your browser:<br/><a href="${resetUrl}">${resetUrl}</a></p>
      </div>`
      await sendEmail({ to: email, subject, text, html })
    } catch (e) {
      console.log('Failed to send reset email, falling back to log link:', e?.message)
    }

    // Always log in dev for convenience
    if (process.env.NODE_ENV !== 'production') {
      console.log('Password reset link:', resetUrl)
    }
    
    res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: 'Failed to process password reset request' });
  }
});

// Reset password endpoint
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Update password
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password has been reset successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Failed to reset password' });
  }
});

export default router; 