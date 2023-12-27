import mongoose from "mongoose";

const skillSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      unique: true,
    },
  },
  { timestamps: true }
);

const Skill = mongoose.model("Skill", skillSchema);

export { Skill };
