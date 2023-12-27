import mongoose from "mongoose";

const projectsSchema = new mongoose.Schema(
  {
    startupId: { type: mongoose.Schema.Types.ObjectId, ref: "Startup" },
    freelancerId: { type: mongoose.Schema.Types.ObjectId, ref: "Freelancer" },
    status: {
      type: String,
      required: true,
      enum: ["ongoing", "completed", "cancelled"],
      default: "ongoing",
    },
  },
  { timestamps: true }
);

const Projects = mongoose.model("Projects", projectsSchema);

export { Projects };
