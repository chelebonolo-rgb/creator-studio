import { Router } from 'express';
import Content from '../models/Content.js';
import Comment from '../models/Comment.js';
import { requireCreator } from '../middleware/auth.js';

const router = Router();

router.get('/stats', requireCreator, async (req, res, next) => {
  try {
    const now = new Date();
    const contentIds = await Content.distinct('_id', { creator: req.creator._id });
    const [contentCounts, commentCount, engagement] = await Promise.all([
      Content.aggregate([
        { $match: { creator: req.creator._id } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            published: {
              $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] },
            },
            drafts: { $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] } },
            scheduled: { $sum: { $cond: [{ $eq: ['$status', 'scheduled'] }, 1, 0] } },
            views: { $sum: '$views' },
            likes: { $sum: '$likesCount' },
          },
        },
      ]),
      Comment.countDocuments({ content: { $in: contentIds } }),
      Content.findOne({ creator: req.creator._id, status: 'published' })
        .sort({ views: -1, likesCount: -1 })
        .select('title views likesCount'),
    ]);
    const counts = contentCounts[0] || {
      total: 0,
      published: 0,
      drafts: 0,
      scheduled: 0,
      views: 0,
      likes: 0,
    };
    const scheduledDue = await Content.countDocuments({
      creator: req.creator._id,
      status: 'scheduled',
      scheduledAt: { $lte: now },
    });
    return res.json({
      stats: {
        ...counts,
        published: counts.published + scheduledDue,
        comments: commentCount,
        pendingComments: await Comment.countDocuments({
          content: { $in: contentIds },
          status: 'pending',
        }),
        topContent: engagement,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/analytics', requireCreator, async (req, res, next) => {
  try {
    const contents = await Content.find({ creator: req.creator._id })
      .select('title status views likesCount publishedAt scheduledAt')
      .sort({ views: -1, likesCount: -1 })
      .limit(100)
      .lean();
    const contentIds = contents.map((content) => content._id);
    const commentCounts = await Comment.aggregate([
      { $match: { content: { $in: contentIds } } },
      { $group: { _id: '$content', count: { $sum: 1 } } },
    ]);
    const commentsByContent = new Map(commentCounts.map((entry) => [String(entry._id), entry.count]));
    return res.json({
      items: contents.map((content) => ({
        ...content,
        comments: commentsByContent.get(String(content._id)) || 0,
      })),
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
