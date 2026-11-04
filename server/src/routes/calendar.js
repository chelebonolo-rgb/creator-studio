import { Router } from 'express';
import Content from '../models/Content.js';
import { requireCreator } from '../middleware/auth.js';

const router = Router();

router.get('/', requireCreator, async (req, res, next) => {
  try {
    const month = typeof req.query.month === 'string' ? req.query.month : '';
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ message: 'Month must use YYYY-MM format.' });
    }
    const [year, monthNumber] = month.split('-').map(Number);
    const start = new Date(Date.UTC(year, monthNumber - 1, 1));
    const end = new Date(Date.UTC(year, monthNumber, 1));
    if (start.getUTCMonth() !== monthNumber - 1) {
      return res.status(400).json({ message: 'Month is invalid.' });
    }
    const items = await Content.find({
      creator: req.creator._id,
      $or: [
        { status: 'scheduled', scheduledAt: { $gte: start, $lt: end } },
        { status: 'published', publishedAt: { $gte: start, $lt: end } },
      ],
    })
      .select('title category contentType status scheduledAt publishedAt')
      .sort({ scheduledAt: 1, publishedAt: 1 })
      .lean();
    return res.json({ items });
  } catch (error) {
    return next(error);
  }
});

export default router;
