import bcrypt from "bcryptjs";
import mongoose, { Schema } from "mongoose";
import { ROLE_VALUES } from "../utils/roles.js";
import { TECHNICAL_ROLE_VALUES } from "../utils/taskAccess.js";

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
      validate: {
        validator(value) {
          return (
            /^[A-Za-zÀ-ÖØ-öø-ÿ' .-]+$/.test(value.trim()) &&
            /[A-Za-zÀ-ÖØ-öø-ÿ]/.test(value.trim())
          );
        },
        message:
          "Name can only contain letters, spaces, hyphens, apostrophes, and periods.",
      },
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    role: { type: String, required: true, enum: ROLE_VALUES },
    team: { type: Schema.Types.ObjectId, ref: "Team", default: null },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 5,
      maxlength: 254,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    password: { type: String, required: true, minlength: 6 },
    isAdmin: { type: Boolean, required: true, default: false },
    technicalRoles: [
      {
        type: String,
        enum: TECHNICAL_ROLE_VALUES,
        default: [],
      },
    ],
    tasks: [{ type: Schema.Types.ObjectId, ref: "Task" }],
    isActive: { type: Boolean, required: true, default: false },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    googleAuth: { type: Boolean, default: false },
  },
  { timestamps: true },
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;
