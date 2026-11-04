import mongoose from 'mongoose';

const bookmarkSchema = new mongoose.Schema(
  {
    viewer: { type: mongoose.Schema.Types.ObjectId, ref: 'Viewer', required: true },
    content: { type: mongoose.Schema.Types.ObjectId, ref: 'Content', required: true },
  },
  { timestamps: true }
);

bookmarkSchema.index({ viewer: 1, content: 1 }, { unique: true });

export default mongoose.model('Bookmark', bookmarkSchema);
