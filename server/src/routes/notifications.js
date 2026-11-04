import { Router } from 'express';
import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import { requireCreator } from '../middleware/auth.js';

const router = Router();

router.get('/', requireCreator, async (req, res, next) => {
  try {
    const notifications = await Notification.find({ creator: req.creator._id })
      .populate('content', 'title')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return res.json({ notifications });
  } catch (error) {
    return next(error);
  }
});

router.patch('/:id/read', requireCreator, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Notification ID is invalid.' });
    }
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, creator: req.creator._id },
      { $set: { readAt: new Date() } },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: 'Notification was not found.' });
    return res.json({ notification });
  } catch (error) {
    return next(error);
  }
});

router.post('/read-all', requireCreator, async (req, res, next) => {
  try {
    await Notification.updateMany(
      { creator: req.creator._id, readAt: null },
      { $set: { readAt: new Date() } }
    );
    return res.json({ message: 'All notifications marked as read.' });
  } catch (error) {
    return next(error);
  }
});

export default router;
