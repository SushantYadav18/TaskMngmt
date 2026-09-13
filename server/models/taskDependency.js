import mongoose, { Schema } from "mongoose";

const taskDependencySchema = new Schema(
  {
    predecessorTask: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true,
    },
    successorTask: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true,
    },
    dependencyType: {
      type: String,
      enum: ["FS"],
      default: "FS",
    },
  },
  { timestamps: true },
);

taskDependencySchema.index(
  { predecessorTask: 1, successorTask: 1 },
  { unique: true },
);
taskDependencySchema.index({ predecessorTask: 1 });
taskDependencySchema.index({ successorTask: 1 });

taskDependencySchema.pre("validate", function (next) {
  if (String(this.predecessorTask) === String(this.successorTask)) {
    this.invalidate("successorTask", "A task cannot depend on itself.");
  }
  if (this.dependencyType) {
    this.dependencyType = String(this.dependencyType).toUpperCase();
  }
  next();
});

const TaskDependency = mongoose.model("TaskDependency", taskDependencySchema);

export default TaskDependency;
