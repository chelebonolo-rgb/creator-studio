import { Router } from 'express';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import Comment from '../models/Comment.js';
import Content from '../models/Content.js';
import Viewer from '../models/Viewer.js';
import { requireCreator } from '../middleware/auth.js';
import { notifyCreator } from '../services/email.js';

const router = Router();
const commentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many comments submitted. Please try again later.' },
});

async function resolveViewer(viewerKey, displayName) {
  if (typeof viewerKey !== 'string' || !/^[a-zA-Z0-9_-]{8,100}$/.test(viewerKey)) return null;
  return Viewer.findOneAndUpdate(
    { viewerKey },
    { $set: { displayName } },
    { upsert: true, new: true, runValidators: true }
  );
}

function getCreatorContentIds(creatorId) {
  return Content.distinct('_id', { creator: creatorId });
}

router.post('/', commentLimiter, async (req, res, next) => {
  try {
    const { contentId, viewerId, viewerName, message } = req.body;
    if (!mongoose.isValidObjectId(contentId)) {
      return res.status(400).json({ message: 'A valid content ID is required.' });
    }
    if (typeof viewerName !== 'string' || !viewerName.trim() || viewerName.trim().length > 60) {
      return res.status(400).json({ message: 'Display name must be between 1 and 60 characters.' });
    }
    if (typeof message !== 'string' || !message.trim() || message.trim().length > 1000) {
      return res.status(400).json({ message: 'Comment must be between 1 and 1000 characters.' });
    }
    const content = await Content.findOne({
      _id: contentId,
      status: 'published',
      publishedAt: { $lte: new Date() },
    }).select('_id creator title');
    if (!content) return res.status(404).json({ message: 'Published content was not found.' });

    const viewer = await resolveViewer(viewerId, viewerName.trim());
    const comment = await Comment.create({
      content: content._id,
      viewer: viewer?._id || null,
      viewerName: viewerName.trim(),
      message: message.trim(),
    });
    await notifyCreator({
      creatorId: content.creator,
      contentId: content._id,
      type: 'comment',
      message: `${viewerName.trim()} commented on "${content.title}".`,
      emailSubject: `New comment on ${content.title}`,
    });
    return res.status(201).json({
      message: 'Your comment was submitted and is waiting for creator approval.',
      comment: { id: comment.id, status: comment.status },
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/manage', requireCreator, async (req, res, next) => {
  try {
    const contentIds = await getCreatorContentIds(req.creator._id);
    const comments = await Comment.find({ content: { $in: contentIds } })
      .populate('content', 'title')
      .sort({ createdAt: -1 })
      .limit(300)
      .lean();
    return res.json({ comments });
  } catch (error) {
    return next(error);
  }
});

router.get('/:contentId', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.contentId)) {
      return res.status(400).json({ message: 'Content ID is invalid.' });
    }
    const comments = await Comment.find({
      content: req.params.contentId,
      status: 'approved',
    })
      .select('viewerName message createdAt')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return res.json({ comments });
  } catch (error) {
    return next(error);
  }
});

router.patch('/:id', requireCreator, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Comment ID is invalid.' });
    }
    if (!['approved', 'hidden'].includes(req.body.status)) {
      return res.status(400).json({ message: 'Comment status must be approved or hidden.' });
    }
    const contentIds = await getCreatorContentIds(req.creator._id);
    const comment = await Comment.findOneAndUpdate(
      { _id: req.params.id, content: { $in: contentIds } },
      { status: req.body.status },
      { new: true, runValidators: true }
    );
    if (!comment) return res.status(404).json({ message: 'Comment was not found.' });
    return res.json({ comment });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', requireCreator, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Comment ID is invalid.' });
    }
    const contentIds = await getCreatorContentIds(req.creator._id);
    const comment = await Comment.findOneAndDelete({
      _id: req.params.id,
      content: { $in: contentIds },
    });
    if (!comment) return res.status(404).json({ message: 'Comment was not found.' });
    return res.json({ message: 'Comment deleted.' });
  } catch (error) {
    return next(error);
  }
});

export default router;
