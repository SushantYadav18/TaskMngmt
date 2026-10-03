import mongoose, { Schema } from "mongoose";

const projectSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
      validate: {
        validator(value) {
          return (
            /^[A-Za-z0-9À-ÖØ-öø-ÿ' .-]+$/.test(value.trim()) &&
            /[A-Za-zÀ-ÖØ-öø-ÿ]/.test(value.trim())
          );
        },
        message:
          "Project name must include letters and only use letters, numbers, spaces, hyphens, apostrophes, and periods.",
      },
    },
    description: { type: String, default: "", trim: true, maxlength: 2000 },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    projectLeader: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    teams: [{ type: Schema.Types.ObjectId, ref: "Team" }],
    members: [{ type: Schema.Types.ObjectId, ref: "User" }],
    status: {
      type: String,
      enum: ["planning", "active", "completed", "archived"],
      default: "planning",
    },
    plannedStart: { type: Date, default: null },
    plannedDeadline: { type: Date, default: null },
    actualStart: { type: Date, default: null },
    actualCompletion: { type: Date, default: null },
  },
  { timestamps: true },
);

projectSchema.index({ members: 1 });
projectSchema.index({ teams: 1 });

const Project = mongoose.model("Project", projectSchema);

export default Project;
