import mongoose from "mongoose";
import dotenv from "dotenv";
import Task from "../models/task.js";
import User from "../models/user.js";
import { ROLES } from "../utils/roles.js";

dotenv.config();

try {
  await mongoose.connect(process.env.MONGODB_URI);

  await User.updateMany(
    { role: { $in: ["Admin", "admin"] } },
    { $set: { role: ROLES.ADMIN, isAdmin: true } },
  );
  await User.updateMany(
    { role: { $in: ["Member", "member"] } },
    { $set: { role: ROLES.ASSOCIATE } },
  );

  const legacyTasks = await Task.find({
    assignee: { $exists: false },
    team: { $exists: true, $ne: [] },
  }).select("team createdBy");
  for (const task of legacyTasks) {
    const assignee = task.team[0];
    await Task.updateOne(
      { _id: task._id },
      {
        $set: { assignee, createdBy: task.createdBy || assignee },
        $unset: { team: 1 },
      },
    );
  }

  console.log(`Migrated ${legacyTasks.length} legacy tasks.`);
} finally {
  await mongoose.disconnect();
}
