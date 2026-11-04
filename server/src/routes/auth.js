import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import User from '../models/User.js';
import { requireCreator } from '../middleware/auth.js';

const router = Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please try again later.' },
});

router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!email || !password || email.length > 254 || password.length > 200) {
      return res.status(400).json({ message: 'Enter a valid email address and password.' });
    }

    const creator = await User.findOne({ email }).select('+passwordHash');
    if (!creator || !(await bcrypt.compare(password, creator.passwordHash))) {
      return res.status(401).json({ message: 'Email or password is incorrect.' });
    }

    const token = jwt.sign(
      { sub: creator.id, type: 'creator' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );
    return res.json({
      token,
      creator: { id: creator.id, name: creator.name, email: creator.email },
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/me', requireCreator, (req, res) => {
  res.json({ creator: { id: req.creator.id, name: req.creator.name, email: req.creator.email } });
});

export default router;
