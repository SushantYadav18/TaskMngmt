import mongoose, { Schema } from "mongoose";

const teamSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
      validate: {
        validator(value) {
          return (
            /^[A-Za-z0-9À-ÖØ-öø-ÿ' .-]+$/.test(value.trim()) &&
            /[A-Za-zÀ-ÖØ-öø-ÿ]/.test(value.trim())
          );
        },
        message:
          "Team name must include letters and only use letters, numbers, spaces, hyphens, apostrophes, and periods.",
      },
    },
    leader: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    members: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true },
);

const Team = mongoose.model("Team", teamSchema);

export default Team;
