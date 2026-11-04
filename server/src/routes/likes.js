import { Router } from 'express';
import mongoose from 'mongoose';
import Content from '../models/Content.js';
import Like from '../models/Like.js';
import Viewer from '../models/Viewer.js';
import { notifyCreator } from '../services/email.js';

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const { contentId, viewerId } = req.body;
    if (!mongoose.isValidObjectId(contentId)) {
      return res.status(400).json({ message: 'A valid content ID is required.' });
    }
    if (typeof viewerId !== 'string' || !/^[a-zA-Z0-9_-]{8,100}$/.test(viewerId)) {
      return res.status(400).json({ message: 'A valid viewer ID is required.' });
    }
    const content = await Content.findOne({
      _id: contentId,
      status: 'published',
      publishedAt: { $lte: new Date() },
    }).select('_id creator title');
    if (!content) return res.status(404).json({ message: 'Published content was not found.' });

    const viewer = await Viewer.findOneAndUpdate(
      { viewerKey: viewerId },
      { $setOnInsert: { displayName: '' } },
      { upsert: true, new: true, runValidators: true }
    );
    let liked = true;
    try {
      await Like.create({ content: content._id, viewer: viewer._id });
      await Content.updateOne({ _id: content._id }, { $inc: { likesCount: 1 } });
      await notifyCreator({
        creatorId: content.creator,
        contentId: content._id,
        type: 'like',
        message: `A viewer appreciated "${content.title}".`,
        emailSubject: `New appreciation for ${content.title}`,
      });
    } catch (error) {
      if (error.code !== 11000) throw error;
      liked = false;
    }
    const current = await Content.findById(content._id).select('likesCount');
    return res.status(liked ? 201 : 200).json({ liked, likesCount: current.likesCount });
  } catch (error) {
    return next(error);
  }
});

export default router;
