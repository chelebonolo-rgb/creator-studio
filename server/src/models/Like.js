import mongoose from 'mongoose';

const likeSchema = new mongoose.Schema(
  {
    content: { type: mongoose.Schema.Types.ObjectId, ref: 'Content', required: true },
    viewer: { type: mongoose.Schema.Types.ObjectId, ref: 'Viewer', required: true },
  },
  { timestamps: true }
);

likeSchema.index({ content: 1, viewer: 1 }, { unique: true });

export default mongoose.model('Like', likeSchema);
