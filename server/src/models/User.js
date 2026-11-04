import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email address is invalid.'],
    },
    passwordHash: { type: String, required: true, select: false },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
