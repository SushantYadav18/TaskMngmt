import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/user.js';

dotenv.config();

const targetEmail = 'admin@example.com';

try {
  await mongoose.connect(process.env.MONGODB_URI);

  const existing = await User.findOne({ email: { $in: ['admin@gmail.com', targetEmail] } });

  if (existing) {
    existing.email = targetEmail;
    existing.name = existing.name || 'System Admin';
    existing.title = existing.title || 'Administrator';
    existing.role = existing.role || 'Admin';
    existing.isAdmin = true;
    existing.isActive = true;
    existing.status = 'approved';
    if (!existing.password) existing.password = 'admin123';
    await existing.save();
    console.log(JSON.stringify({ updated: true, email: existing.email, isAdmin: existing.isAdmin, isActive: existing.isActive, status: existing.status }, null, 2));
  } else {
    const created = await User.create({
      name: 'System Admin',
      title: 'Administrator',
      role: 'Admin',
      email: targetEmail,
      password: 'admin123',
      isAdmin: true,
      isActive: true,
      status: 'approved',
    });
    console.log(JSON.stringify({ updated: false, email: created.email, isAdmin: created.isAdmin, isActive: created.isActive, status: created.status }, null, 2));
  }
} catch (error) {
  console.error('Failed to update default admin:', error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
