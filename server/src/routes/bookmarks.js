import { Router } from 'express';
import mongoose from 'mongoose';
import Bookmark from '../models/Bookmark.js';
import Content from '../models/Content.js';
import { requireViewer } from '../middleware/viewerAuth.js';

const router = Router();
router.use(requireViewer);

router.get('/', async (req, res, next) => {
  try {
    const bookmarks = await Bookmark.find({ viewer: req.viewer._id })
      .populate({
        path: 'content',
        match: { status: 'published', publishedAt: { $lte: new Date() } },
        select: 'title description category contentType thumbnailUrl publishedAt views likesCount',
      })
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ bookmarks: bookmarks.filter((bookmark) => bookmark.content) });
  } catch (error) {
    return next(error);
  }
});

router.post('/:contentId', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.contentId)) {
      return res.status(400).json({ message: 'Content ID is invalid.' });
    }
    const content = await Content.findOne({
      _id: req.params.contentId,
      status: 'published',
      publishedAt: { $lte: new Date() },
    }).select('_id');
    if (!content) return res.status(404).json({ message: 'Published content was not found.' });
    await Bookmark.updateOne(
      { viewer: req.viewer._id, content: content._id },
      { $setOnInsert: { viewer: req.viewer._id, content: content._id } },
      { upsert: true }
    );
    return res.status(201).json({ saved: true });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:contentId', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.contentId)) {
      return res.status(400).json({ message: 'Content ID is invalid.' });
    }
    await Bookmark.deleteOne({ viewer: req.viewer._id, content: req.params.contentId });
    return res.json({ saved: false });
  } catch (error) {
    return next(error);
  }
});

export default router;
