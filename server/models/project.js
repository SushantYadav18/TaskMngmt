import mongoose, { Schema } from "mongoose";

const projectSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
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
