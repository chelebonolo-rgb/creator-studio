import mongoose from 'mongoose';

export const CATEGORIES = [
  'Education',
  'Technology',
  'Entertainment',
  'Lifestyle',
  'Business',
  'Other',
];
export const CONTENT_TYPES = ['Video', 'Article', 'Image', 'Podcast', 'Other'];
export const CONTENT_STATUSES = ['draft', 'published', 'scheduled'];

const contentSchema = new mongoose.Schema(
  {
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    category: { type: String, required: true, enum: CATEGORIES },
    contentType: { type: String, required: true, enum: CONTENT_TYPES },
    thumbnailUrl: { type: String, trim: true, maxlength: 2048, default: '' },
    mediaUrl: { type: String, trim: true, maxlength: 2048, default: '' },
    articleContent: { type: String, trim: true, maxlength: 50000, default: '' },
    status: { type: String, required: true, enum: CONTENT_STATUSES, default: 'draft' },
    scheduledAt: { type: Date, default: null },
    publishedAt: { type: Date, default: null },
    views: { type: Number, default: 0, min: 0 },
    likesCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

contentSchema.index({ status: 1, publishedAt: -1 });
contentSchema.index({ title: 'text', description: 'text' });

export default mongoose.model('Content', contentSchema);
