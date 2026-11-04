import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';

const { MONGODB_URI, CREATOR_NAME, CREATOR_EMAIL, CREATOR_PASSWORD } = process.env;

if (!MONGODB_URI || !CREATOR_NAME || !CREATOR_EMAIL || !CREATOR_PASSWORD) {
  console.error('Set MONGODB_URI, CREATOR_NAME, CREATOR_EMAIL, and CREATOR_PASSWORD before seeding.');
  process.exitCode = 1;
} else if (CREATOR_PASSWORD.length < 12) {
  console.error('CREATOR_PASSWORD must be at least 12 characters long.');
  process.exitCode = 1;
} else {
  try {
    await mongoose.connect(MONGODB_URI);
    const email = CREATOR_EMAIL.trim().toLowerCase();
    const existing = await User.findOne({ email }).select('_id');
    if (existing) {
      console.log(`Creator ${email} already exists; no changes made.`);
    } else {
      const passwordHash = await bcrypt.hash(CREATOR_PASSWORD, 12);
      await User.create({ name: CREATOR_NAME.trim(), email, passwordHash });
      console.log(`Creator ${email} was created.`);
    }
  } catch (error) {
    console.error('Creator seed failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}
