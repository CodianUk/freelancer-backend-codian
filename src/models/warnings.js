import mongoose from "mongoose";

const warningDetailsSchema = new mongoose.Schema(
  {
    warnedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    warnedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reason: { type: String, required: true, required: true },
    status: {
      type: String,
      default: "Request",
      enum: ["Request", "Approved", "Rejected"],
    },
  },
  { timestamps: true }
);

const warningsSchema = new mongoose.Schema(
  {
    startupid: { type: mongoose.Schema.Types.ObjectId, ref: "Startup", required:true },
    warnings: [warningDetailsSchema],
  },
  { timestamps: true }
);

const Warning = mongoose.model("Warning", warningsSchema);

export { Warning };
