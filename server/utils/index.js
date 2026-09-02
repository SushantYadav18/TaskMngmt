import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/user.js";

export const ensureDefaultAdmin = async () => {
  try {
    const defaultAdmin = {
      name: "System Admin",
      title: "Administrator",
      role: "Admin",
      email: "admin@example.com",
      password: "admin123",
      isAdmin: true,
      isActive: true,
      status: "approved",
    };

    const existing = await User.findOne({ email: defaultAdmin.email });

    if (existing) {
      existing.name = existing.name || defaultAdmin.name;
      existing.title = existing.title || defaultAdmin.title;
      existing.role = existing.role || defaultAdmin.role;
      existing.email = defaultAdmin.email;
      existing.isAdmin = true;
      existing.isActive = true;
      existing.status = "approved";
      existing.password = defaultAdmin.password;
      await existing.save();
      return;
    }

    await User.create(defaultAdmin);
  } catch (error) {
    console.error("Default admin setup failed:", error.message);
  }
};

export const dbConnection = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    await ensureDefaultAdmin();

    console.log("DB connection established");
  } catch (error) {
    console.log("DB Error: " + error);
  }
};

export const createJWT = (res, userId) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 1 * 24 * 60 * 60 * 1000, //1 day
  });
};
