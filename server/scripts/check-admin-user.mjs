import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/user.js';

dotenv.config();

try {
  await mongoose.connect(process.env.MONGODB_URI);
  const user = await User.findOne({ email: 'admin@example.com' }).lean();
  console.log('user:', JSON.stringify(user, null, 2));
  if (user) {
    const actual = await User.findOne({ email: 'admin@example.com' });
    console.log('matchPassword:', await actual.matchPassword('admin123'));
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
