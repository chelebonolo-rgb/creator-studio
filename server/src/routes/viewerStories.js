import { Router } from 'express';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import Bookmark from '../models/Bookmark.js';
import Comment from '../models/Comment.js';
import Content, { CATEGORIES } from '../models/Content.js';
import Like from '../models/Like.js';
import Notification from '../models/Notification.js';
import Reaction from '../models/Reaction.js';
import User from '../models/User.js';
import { requireViewer } from '../middleware/viewerAuth.js';

const router = Router();
const storyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many stories published. Please try again later.' },
});

function validHttpUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

router.use(requireViewer);

router.get('/mine', async (req, res, next) => {
  try {
    const contents = await Content.find({ submittedBy: req.viewer._id })
      .select('-creator -submittedBy')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return res.json({ contents });
  } catch (error) {
    return next(error);
  }
});

router.post('/', storyLimiter, async (req, res, next) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    const articleContent = typeof body.articleContent === 'string' ? body.articleContent.trim() : '';
    const thumbnailUrl = typeof body.thumbnailUrl === 'string' ? body.thumbnailUrl.trim() : '';
    const errors = [];

    if (!title || title.length > 150) errors.push('Title must be between 1 and 150 characters.');
    if (!description || description.length > 5000) errors.push('Description must be between 1 and 5000 characters.');
    if (!CATEGORIES.includes(body.category)) errors.push('Choose a valid category.');
    if (!articleContent || articleContent.length > 50000) {
      errors.push('Story text must be between 1 and 50000 characters.');
    }
    if (thumbnailUrl && !validHttpUrl(thumbnailUrl)) {
      errors.push('Image URL must be an http or https URL.');
    }
    if (errors.length) return res.status(400).json({ message: errors[0], errors });

    const creatorEmail = process.env.CREATOR_EMAIL?.trim().toLowerCase();
    const creator = creatorEmail ? await User.findOne({ email: creatorEmail }).select('_id') : null;
    if (!creator) {
      return res.status(503).json({ message: 'Story publishing is temporarily unavailable.' });
    }

    const content = await Content.create({
      creator: creator._id,
      submittedBy: req.viewer._id,
      authorName: req.viewer.displayName,
      title,
      description,
      category: body.category,
      contentType: 'Article',
      thumbnailUrl,
      articleContent,
      status: 'published',
      publishedAt: new Date(),
    });
    return res.status(201).json({ content });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Content ID is invalid.' });
    }
    const deleted = await Content.findOneAndDelete({
      _id: req.params.id,
      submittedBy: req.viewer._id,
    });
    if (!deleted) return res.status(404).json({ message: 'Your story was not found.' });
    await Promise.all([
      Comment.deleteMany({ content: deleted._id }),
      Like.deleteMany({ content: deleted._id }),
      Reaction.deleteMany({ content: deleted._id }),
      Notification.deleteMany({ content: deleted._id }),
      Bookmark.deleteMany({ content: deleted._id }),
    ]);
    return res.json({ message: 'Your story and its reader activity were deleted.' });
  } catch (error) {
    return next(error);
  }
});

export default router;
