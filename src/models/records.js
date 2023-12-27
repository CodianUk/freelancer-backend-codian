import mongoose from "mongoose";

const recordSchema = new mongoose.Schema(
  {
    startup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Startup",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    attachFiles: [String], // You can modify this based on your file attachment requirements
    completionDate: {
      type: Date,
      required: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", // Assuming these are user IDs
        required: true,
      },
    ],
  },
  { timestamps: true }
);

const Record = mongoose.model("Record", recordSchema);

export { Record };
