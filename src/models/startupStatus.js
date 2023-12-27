import mongoose from "mongoose";

const startupStatusSchema = new mongoose.Schema(
  {
    startupid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Startup",
      required: true,
    },
    status: {
      type: String,
      required: true,
      default: "Unapproved",
      enum: ["Unapproved", "Approved", "Suspended","Rejected"],
    },
  },
  { timestamps: true }
);

const StartupStatus = mongoose.model("StartupStatus", startupStatusSchema);

export { StartupStatus };
