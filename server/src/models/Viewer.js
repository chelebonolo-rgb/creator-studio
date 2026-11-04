import mongoose from 'mongoose';

const viewerSchema = new mongoose.Schema(
  {
    viewerKey: { type: String, required: true, unique: true, maxlength: 100 },
    displayName: { type: String, trim: true, maxlength: 60, default: '' },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email address is invalid.'],
    },
    passwordHash: { type: String, select: false },
  },
  { timestamps: true }
);

export default mongoose.model('Viewer', viewerSchema);
