import { Router } from 'express';
import mongoose from 'mongoose';
import Content from '../models/Content.js';
import Reaction, { REACTION_TYPES } from '../models/Reaction.js';
import Viewer from '../models/Viewer.js';
import { notifyCreator } from '../services/email.js';

const router = Router();
const validViewerId = (value) => typeof value === 'string' && /^[a-zA-Z0-9_-]{8,100}$/.test(value);

async function findPublishedContent(contentId) {
  if (!mongoose.isValidObjectId(contentId)) return null;
  return Content.findOne({
    _id: contentId,
    status: 'published',
    publishedAt: { $lte: new Date() },
  }).select('_id creator title');
}

async function getReactionCounts(contentId) {
  const counts = await Reaction.aggregate([
    { $match: { content: new mongoose.Types.ObjectId(contentId) } },
    { $group: { _id: '$type', count: { $sum: 1 } } },
  ]);
  return Object.fromEntries(REACTION_TYPES.map((type) => [
    type,
    counts.find((entry) => entry._id === type)?.count || 0,
  ]));
}

router.get('/:contentId', async (req, res, next) => {
  try {
    const content = await findPublishedContent(req.params.contentId);
    if (!content) return res.status(404).json({ message: 'Published content was not found.' });

    let reaction = null;
    if (req.query.viewerId !== undefined) {
      if (!validViewerId(req.query.viewerId)) {
        return res.status(400).json({ message: 'A valid viewer ID is required.' });
      }
      const viewer = await Viewer.findOne({ viewerKey: req.query.viewerId }).select('_id');
      if (viewer) {
        const existing = await Reaction.findOne({ content: content._id, viewer: viewer._id }).select('type');
        reaction = existing?.type || null;
      }
    }

    return res.json({ counts: await getReactionCounts(content._id), reaction });
  } catch (error) {
    return next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { contentId, viewerId, reaction } = req.body;
    if (!mongoose.isValidObjectId(contentId)) {
      return res.status(400).json({ message: 'A valid content ID is required.' });
    }
    if (!validViewerId(viewerId)) {
      return res.status(400).json({ message: 'A valid viewer ID is required.' });
    }
    if (reaction !== null && !REACTION_TYPES.includes(reaction)) {
      return res.status(400).json({ message: 'Choose a valid reaction.' });
    }

    const content = await findPublishedContent(contentId);
    if (!content) return res.status(404).json({ message: 'Published content was not found.' });

    const viewer = await Viewer.findOneAndUpdate(
      { viewerKey: viewerId },
      { $setOnInsert: { displayName: '' } },
      { upsert: true, new: true, runValidators: true }
    );

    let changed = false;
    if (reaction === null) {
      await Reaction.deleteOne({ content: content._id, viewer: viewer._id });
    } else {
      const previous = await Reaction.findOne({ content: content._id, viewer: viewer._id }).select('type');
      await Reaction.findOneAndUpdate(
        { content: content._id, viewer: viewer._id },
        { $set: { type: reaction } },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
      );
      changed = previous?.type !== reaction;
      if (changed) {
        await notifyCreator({
          creatorId: content.creator,
          contentId: content._id,
          type: 'reaction',
          message: `A viewer reacted ${reaction} to "${content.title}".`,
          emailSubject: `New reaction to ${content.title}`,
        });
      }
    }

    return res.json({
      reaction,
      counts: await getReactionCounts(content._id),
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
