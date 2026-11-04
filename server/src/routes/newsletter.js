import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import Subscriber from '../models/Subscriber.js';
import { isEmailConfigured, sendEmail } from '../services/email.js';

const router = Router();
const subscribeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many subscription attempts. Please try again later.' },
});

router.post('/subscribe', subscribeLimiter, async (req, res, next) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return res.status(400).json({ message: 'Enter a valid email address.' });
    }
    const subscriber = await Subscriber.findOneAndUpdate(
      { email },
      { $set: { active: true } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
    if (isEmailConfigured()) {
      try {
        await sendEmail({
          to: email,
          subject: `You're subscribed to ${process.env.CREATOR_NAME || 'Creator Studio'}`,
          text: `Thanks for subscribing. We'll email you when new content is published.`,
        });
      } catch (error) {
        console.error('Newsletter welcome email failed:', error.message);
        return res.status(502).json({ message: 'Your subscription was saved, but the welcome email could not be sent.' });
      }
    }
    return res.status(201).json({
      message: isEmailConfigured()
        ? 'You are subscribed. Look out for new content in your inbox.'
        : 'Your subscription is saved. Email updates will start once the creator configures email delivery.',
      emailDeliveryEnabled: isEmailConfigured(),
      subscriberId: subscriber.id,
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
