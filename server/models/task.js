import mongoose, { Schema } from "mongoose";

const taskSchema = new Schema(
  {
    title: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    assignee: { type: Schema.Types.ObjectId, ref: "User", required: true },
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      default: null,
      index: true,
    },
    parentTask: { type: Schema.Types.ObjectId, ref: "Task", default: null },
    date: { type: Date, default: new Date() },
    plannedStartDate: { type: Date, default: null },
    dueDate: { type: Date, default: null },
    estimatedDuration: { type: Number, min: 1, default: null },
    actualStartDate: { type: Date, default: null },
    actualCompletionDate: { type: Date, default: null },
    priority: {
      type: String,
      default: "normal",
      enum: ["high", "medium", "normal", "low"],
    },
    stage: {
      type: String,
      default: "todo",
      enum: ["todo", "in progress", "completed"],
    },
    activities: [
      {
        type: {
          type: String,
          default: "assigned",
          enum: [
            "assigned",
            "started",
            "in progress",
            "bug",
            "completed",
            "commented",
          ],
        },
        activity: String,
        date: { type: Date, default: new Date() },
        by: { type: Schema.Types.ObjectId, ref: "User" },
      },
    ],

    subTasks: [
      {
        title: { type: String, required: true, trim: true, maxlength: 200 },
        completed: { type: Boolean, default: false },
      },
    ],
    assets: [String],
    isTrashed: { type: Boolean, default: false },
  },
  { timestamps: true },
);

taskSchema.pre("validate", function (next) {
  if (
    this.plannedStartDate &&
    this.dueDate &&
    this.plannedStartDate > this.dueDate
  ) {
    this.invalidate(
      "dueDate",
      "Planned start date must be on or before the due date.",
    );
  }
  next();
});

const Task = mongoose.model("Task", taskSchema);

export default Task;
