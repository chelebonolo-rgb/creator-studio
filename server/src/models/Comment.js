import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
  {
    content: { type: mongoose.Schema.Types.ObjectId, ref: 'Content', required: true, index: true },
    viewer: { type: mongoose.Schema.Types.ObjectId, ref: 'Viewer', default: null },
    viewerName: { type: String, required: true, trim: true, maxlength: 60 },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    status: { type: String, enum: ['pending', 'approved', 'hidden'], default: 'pending', index: true },
  },
  { timestamps: true }
);

export default mongoose.model('Comment', commentSchema);
