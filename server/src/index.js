import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.js';
import contentRoutes from './routes/contents.js';
import commentRoutes from './routes/comments.js';
import likeRoutes from './routes/likes.js';
import reactionRoutes from './routes/reactions.js';
import dashboardRoutes from './routes/dashboard.js';
import notificationRoutes from './routes/notifications.js';
import calendarRoutes from './routes/calendar.js';
import viewerAuthRoutes from './routes/viewerAuth.js';
import bookmarkRoutes from './routes/bookmarks.js';
import newsletterRoutes from './routes/newsletter.js';
import uploadRoutes from './routes/uploads.js';

const requiredEnvironment = ['MONGODB_URI', 'JWT_SECRET'];
const missingEnvironment = requiredEnvironment.filter((key) => !process.env[key]);
if (missingEnvironment.length) {
  console.error(`Missing required environment variables: ${missingEnvironment.join(', ')}`);
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET must be at least 32 characters long.');
  process.exit(1);
}

const app = express();
const origins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || origins.includes(origin)) return callback(null, true);
    return callback(new Error('This origin is not allowed by the CORS policy.'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '100kb' }));
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
}));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});
app.use('/api/auth', authRoutes);
app.use('/api/contents', contentRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/likes', likeRoutes);
app.use('/api/reactions', reactionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/viewer-auth', viewerAuthRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/uploads', uploadRoutes);
app.use((req, res) => res.status(404).json({ message: 'API route was not found.' }));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.message?.includes('CORS policy')) {
    return res.status(403).json({ message: 'This origin is not allowed.' });
  }
  if (error.name === 'ValidationError') {
    return res.status(400).json({ message: error.message });
  }
  if (error.name === 'CastError') {
    return res.status(400).json({ message: 'A supplied ID or value is invalid.' });
  }
  console.error(error);
  return res.status(500).json({ message: 'An unexpected server error occurred.' });
});

const port = Number(process.env.PORT) || 5000;
try {
  await mongoose.connect(process.env.MONGODB_URI);
  app.listen(port, () => console.log(`Creator Studio API listening on port ${port}`));
} catch (error) {
  console.error('MongoDB connection failed:', error.message);
  process.exit(1);
}
