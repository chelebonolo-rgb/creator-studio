import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export async function requireCreator(req, res, next) {
  const [scheme, token] = (req.get('authorization') || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Creator authentication is required.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.type === 'viewer') {
      return res.status(401).json({ message: 'Creator authentication is required.' });
    }
    const creator = await User.findById(payload.sub).select('name email');
    if (!creator) return res.status(401).json({ message: 'Creator account was not found.' });
    req.creator = creator;
    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Your session is invalid or has expired.' });
    }
    return next(error);
  }
}
