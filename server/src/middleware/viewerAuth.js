import jwt from 'jsonwebtoken';
import Viewer from '../models/Viewer.js';

export async function requireViewer(req, res, next) {
  const [scheme, token] = (req.get('authorization') || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Viewer sign-in is required.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.type !== 'viewer') return res.status(401).json({ message: 'Viewer sign-in is required.' });
    const viewer = await Viewer.findById(payload.sub).select('email displayName');
    if (!viewer) return res.status(401).json({ message: 'Viewer account was not found.' });
    req.viewer = viewer;
    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Your viewer session is invalid or has expired.' });
    }
    return next(error);
  }
}
