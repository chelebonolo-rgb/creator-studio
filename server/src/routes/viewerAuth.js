import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import Viewer from '../models/Viewer.js';
import { requireViewer } from '../middleware/viewerAuth.js';

const router = Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many account attempts. Please try again later.' },
});

function issueToken(viewer) {
  return jwt.sign({ sub: viewer.id, type: 'viewer' }, process.env.JWT_SECRET, {
    expiresIn: process.env.VIEWER_JWT_EXPIRES_IN || '30d',
  });
}

router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!name || name.length > 60 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return res.status(400).json({ message: 'Enter a valid name and email address.' });
    }
    if (password.length < 12 || password.length > 200) {
      return res.status(400).json({ message: 'Password must be between 12 and 200 characters.' });
    }
    if (await Viewer.exists({ email })) return res.status(409).json({ message: 'An account with that email already exists.' });
    const viewer = await Viewer.create({
      viewerKey: `account_${randomBytes(24).toString('hex')}`,
      displayName: name,
      email,
      passwordHash: await bcrypt.hash(password, 12),
    });
    return res.status(201).json({
      token: issueToken(viewer),
      viewer: { id: viewer.id, name: viewer.displayName, email: viewer.email },
    });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'An account with that email already exists.' });
    return next(error);
  }
});

router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!email || email.length > 254 || !password || password.length > 200) {
      return res.status(400).json({ message: 'Enter a valid email address and password.' });
    }
    const viewer = await Viewer.findOne({ email }).select('+passwordHash');
    if (!viewer || !(await bcrypt.compare(password, viewer.passwordHash))) {
      return res.status(401).json({ message: 'Email or password is incorrect.' });
    }
    return res.json({
      token: issueToken(viewer),
      viewer: { id: viewer.id, name: viewer.displayName, email: viewer.email },
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/me', requireViewer, (req, res) => {
  res.json({ viewer: { id: req.viewer.id, name: req.viewer.displayName, email: req.viewer.email } });
});

export default router;
