import mongoose from 'mongoose';

export const REACTION_TYPES = ['love', 'insightful', 'funny', 'inspiring'];

const reactionSchema = new mongoose.Schema(
  {
    content: { type: mongoose.Schema.Types.ObjectId, ref: 'Content', required: true },
    viewer: { type: mongoose.Schema.Types.ObjectId, ref: 'Viewer', required: true },
    type: { type: String, required: true, enum: REACTION_TYPES },
  },
  { timestamps: true }
);

reactionSchema.index({ content: 1, viewer: 1 }, { unique: true });

export default mongoose.model('Reaction', reactionSchema);
