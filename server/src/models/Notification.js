import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    content: { type: mongoose.Schema.Types.ObjectId, ref: 'Content', default: null },
    type: { type: String, enum: ['comment', 'like', 'reaction', 'published'], required: true },
    message: { type: String, required: true, maxlength: 300 },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

notificationSchema.index({ creator: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
