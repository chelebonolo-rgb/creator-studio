import { Router } from 'express';
import mongoose from 'mongoose';
import Content, { CATEGORIES, CONTENT_STATUSES, CONTENT_TYPES } from '../models/Content.js';
import Comment from '../models/Comment.js';
import Like from '../models/Like.js';
import Reaction from '../models/Reaction.js';
import { requireCreator } from '../middleware/auth.js';
import Notification from '../models/Notification.js';
import Bookmark from '../models/Bookmark.js';
import { notifyCreator, sendPublishedUpdate } from '../services/email.js';

const router = Router();
const editableFields = [
  'title',
  'description',
  'category',
  'contentType',
  'thumbnailUrl',
  'mediaUrl',
  'articleContent',
  'status',
  'scheduledAt',
];

function validateContentInput(body) {
  const errors = [];
  const requiredText = (key, label, max) => {
    if (typeof body[key] !== 'string' || !body[key].trim()) errors.push(`${label} is required.`);
    else if (body[key].trim().length > max) errors.push(`${label} must be ${max} characters or fewer.`);
  };
  requiredText('title', 'Title', 150);
  requiredText('description', 'Description', 5000);
  if (!CATEGORIES.includes(body.category)) errors.push('Choose a valid category.');
  if (!CONTENT_TYPES.includes(body.contentType)) errors.push('Choose a valid content type.');
  if (body.status !== undefined && !CONTENT_STATUSES.includes(body.status)) {
    errors.push('Choose a valid content status.');
  }
  for (const key of ['thumbnailUrl', 'mediaUrl']) {
    if (body[key] !== undefined && body[key] !== '' && !validHttpUrl(body[key])) {
      errors.push(`${key === 'mediaUrl' ? 'Media URL' : 'Thumbnail URL'} must be an http or https URL.`);
    }
  }
  if (
    ['published', 'scheduled'].includes(body.status) &&
    !(typeof body.mediaUrl === 'string' && body.mediaUrl.trim()) &&
    !(typeof body.articleContent === 'string' && body.articleContent.trim())
  ) {
    errors.push('Published or scheduled content needs a media URL or article text.');
  }
  if (body.status === 'scheduled') {
    const date = new Date(body.scheduledAt);
    if (!body.scheduledAt || Number.isNaN(date.getTime()) || date <= new Date()) {
      errors.push('Scheduled content needs a future publication date and time.');
    }
  }
  if (body.scheduledAt && Number.isNaN(new Date(body.scheduledAt).getTime())) {
    errors.push('Publication date is invalid.');
  }
  return errors;
}

function validHttpUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const parsed = new URL(value);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

async function publishDueContent() {
  const now = new Date();
  const due = await Content.find({ status: 'scheduled', scheduledAt: { $lte: now } })
    .select('_id creator title description scheduledAt');
  if (!due.length) return;
  await Content.updateMany(
    { _id: { $in: due.map((content) => content._id) } },
    [{ $set: { status: 'published', publishedAt: '$scheduledAt' } }]
  );
  for (const content of due) {
    await notifyCreator({
      creatorId: content.creator,
      contentId: content._id,
      type: 'published',
      message: `"${content.title}" was published from the content calendar.`,
      emailSubject: `Your scheduled content is live: ${content.title}`,
    });
    await sendPublishedUpdate(content);
  }
}

function buildContentPayload(body, existing = {}) {
  const payload = {};
  for (const field of editableFields) {
    if (body[field] !== undefined) payload[field] = body[field];
    else if (existing[field] !== undefined) payload[field] = existing[field];
  }
  payload.title = payload.title.trim();
  payload.description = payload.description.trim();
  payload.thumbnailUrl = payload.thumbnailUrl?.trim() || '';
  payload.mediaUrl = payload.mediaUrl?.trim() || '';
  payload.articleContent = payload.articleContent?.trim() || '';
  if (payload.status === 'published') {
    payload.publishedAt = existing.status === 'published' && existing.publishedAt
      ? existing.publishedAt
      : new Date();
    payload.scheduledAt = null;
  } else if (payload.status === 'scheduled') {
    payload.publishedAt = null;
  } else {
    payload.publishedAt = null;
    payload.scheduledAt = null;
  }
  return payload;
}

router.get('/', async (req, res, next) => {
  try {
    await publishDueContent();
    const filter = { status: 'published', publishedAt: { $lte: new Date() } };
    if (typeof req.query.category === 'string' && req.query.category && req.query.category !== 'All') {
      if (!CATEGORIES.includes(req.query.category)) {
        return res.status(400).json({ message: 'Choose a valid category filter.' });
      }
      filter.category = req.query.category;
    }
    if (typeof req.query.q === 'string' && req.query.q.trim()) {
      const search = req.query.q.trim().slice(0, 100);
      filter.$or = [
        { title: { $regex: escapeRegex(search), $options: 'i' } },
        { description: { $regex: escapeRegex(search), $options: 'i' } },
        { category: { $regex: escapeRegex(search), $options: 'i' } },
      ];
    }
    const contents = await Content.find(filter)
      .select('-articleContent -creator -submittedBy')
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(100)
      .lean();
    return res.json({ contents });
  } catch (error) {
    return next(error);
  }
});

router.get('/manage', requireCreator, async (req, res, next) => {
  try {
    await publishDueContent();
    const contents = await Content.find({ creator: req.creator.id }).sort({ updatedAt: -1 }).lean();
    return res.json({ contents });
  } catch (error) {
    return next(error);
  }
});

router.post('/', requireCreator, async (req, res, next) => {
  try {
    const errors = validateContentInput(req.body);
    if (errors.length) return res.status(400).json({ message: errors[0], errors });
    const content = await Content.create({
      ...buildContentPayload(req.body, { status: 'draft' }),
      creator: req.creator.id,
    });
    if (content.status === 'published') {
      await notifyCreator({
        creatorId: content.creator,
        contentId: content._id,
        type: 'published',
        message: `"${content.title}" was published.`,
        emailSubject: `Your content is live: ${content.title}`,
      });
      await sendPublishedUpdate(content);
    }
    return res.status(201).json({ content });
  } catch (error) {
    return next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Content ID is invalid.' });
    }
    await publishDueContent();
    const content = await Content.findOneAndUpdate(
      {
        _id: req.params.id,
        status: 'published',
        publishedAt: { $lte: new Date() },
      },
      { $inc: { views: 1 } },
      { new: true }
    ).select('-creator -submittedBy');
    if (!content) return res.status(404).json({ message: 'Published content was not found.' });
    return res.json({ content });
  } catch (error) {
    return next(error);
  }
});

router.put('/:id', requireCreator, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Content ID is invalid.' });
    }
    const existing = await Content.findOne({ _id: req.params.id, creator: req.creator.id }).lean();
    if (!existing) return res.status(404).json({ message: 'Content was not found.' });
    const errors = validateContentInput({ ...existing, ...req.body });
    if (errors.length) return res.status(400).json({ message: errors[0], errors });
    const updated = await Content.findByIdAndUpdate(
      existing._id,
      buildContentPayload(req.body, existing),
      { new: true, runValidators: true }
    );
    if (updated.status === 'published' && existing.status !== 'published') {
      await notifyCreator({
        creatorId: existing.creator,
        contentId: existing._id,
        type: 'published',
        message: `"${updated.title}" was published.`,
        emailSubject: `Your content is live: ${updated.title}`,
      });
      await sendPublishedUpdate(updated);
    }
    return res.json({ content: updated });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', requireCreator, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Content ID is invalid.' });
    }
    const deleted = await Content.findOneAndDelete({ _id: req.params.id, creator: req.creator.id });
    if (!deleted) return res.status(404).json({ message: 'Content was not found.' });
    await Promise.all([
      Comment.deleteMany({ content: deleted._id }),
      Like.deleteMany({ content: deleted._id }),
      Reaction.deleteMany({ content: deleted._id }),
      Notification.deleteMany({ content: deleted._id }),
      Bookmark.deleteMany({ content: deleted._id }),
    ]);
    return res.json({ message: 'Content and its comments, likes, and reactions were deleted.' });
  } catch (error) {
    return next(error);
  }
});

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default router;
